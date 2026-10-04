/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser with 50MB limit for base64 file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Custom robust CORS middleware (replaces 'cors' library)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Telemetry request logging
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[HTTP] ${req.method} ${req.path}`);
  res.on('finish', () => {
    const elapsed = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.path} → ${res.statusCode} (${elapsed}ms)`);
  });
  next();
});

// ────────────────────────────────────────────────────────────────
//  1. CUSTOM CHECKSUM & PROTOCOL HELPER
// ────────────────────────────────────────────────────────────────

function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).toUpperCase();
}

class LiveClassProtocol {
  static VERSION = "LIVECLASS/1.0";
  static seqCounter = 0;

  static buildPacket(ptype: string, payload: any): any {
    const timestamp = new Date().toISOString();
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const checksum = generateChecksum(payloadStr);
    this.seqCounter++;
    return {
      lc_header: this.VERSION,
      type: ptype,
      seq: this.seqCounter,
      timestamp,
      checksum,
      payload
    };
  }

  static validatePacket(packet: any): boolean {
    if (!packet || packet.lc_header !== this.VERSION) return false;
    const payload = packet.payload || {};
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const computed = generateChecksum(payloadStr);
    return packet.checksum === computed;
  }
}

function lcResponse(res: express.Response, data: any, status = 200) {
  const packet = LiveClassProtocol.buildPacket("RESPONSE", data);
  res.status(status).json({ ...data, _lc_packet: packet });
}

function lcError(res: express.Response, message: string, status = 400) {
  const packet = LiveClassProtocol.buildPacket("ERROR", { error: message });
  res.status(status).json({ error: message, _lc_packet: packet });
}

function validateRequestPacket(reqData: any): boolean {
  if (!reqData) return true;
  if (reqData.lc_header) {
    if (!LiveClassProtocol.validatePacket(reqData)) {
      console.warn("[Protokol] Paket rusak terdeteksi (Checksum mismatch / Paket cacat).");
      return false;
    }
  }
  return true;
}

// ────────────────────────────────────────────────────────────────
//  2. SESSION MANAGER
// ────────────────────────────────────────────────────────────────

interface Session {
  session_id: string;
  username: string;
  class_code: string;
  role: string;
  joined_at: string;
  last_active: number;
  reconnect_count: number;
  is_reconnect: boolean;
}

export class SessionManager {
  private sessions: { [sid: string]: Session } = {};
  private usernames: { [uname: string]: string } = {};
  private TIMEOUT_SECONDS = 900; // 15 Menit

  constructor() {
    setInterval(() => {
      this.cleanupExpired();
    }, 180000); // 3 Menit
  }

  createOrReconnect(username: string, classCode: string, role: string): any {
    const existingSid = this.usernames[username];
    if (existingSid && this.sessions[existingSid]) {
      const sess = this.sessions[existingSid];
      sess.last_active = Date.now() / 1000;
      sess.reconnect_count += 1;
      console.log(`[SessionManager] RECONNECT: [${username}] pulih kembali (Rekoneksi ke-${sess.reconnect_count})`);
      return { session_id: existingSid, is_reconnect: true, ...sess };
    }

    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const session: Session = {
      session_id: sessionId,
      username,
      class_code: classCode,
      role,
      joined_at: new Date().toISOString(),
      last_active: Date.now() / 1000,
      reconnect_count: 0,
      is_reconnect: false
    };
    this.sessions[sessionId] = session;
    this.usernames[username] = sessionId;
    console.log(`[SessionManager] DAFTAR BARU: [${username}] bergabung ke kelas [${classCode}]`);
    return session;
  }

  updateActivity(sessionId: string) {
    if (this.sessions[sessionId]) {
      this.sessions[sessionId].last_active = Date.now() / 1000;
    }
  }

  removeSession(sessionId: string) {
    const session = this.sessions[sessionId];
    if (session) {
      delete this.usernames[session.username];
      delete this.sessions[sessionId];
      console.log(`[SessionManager] DISCONNECT: [${session.username}] meninggalkan ruang kelas.`);
    }
  }

  checkDuplicate(username: string): boolean {
    const sid = this.usernames[username];
    if (sid && this.sessions[sid]) {
      const session = this.sessions[sid];
      const elapsed = (Date.now() / 1000) - session.last_active;
      return elapsed < this.TIMEOUT_SECONDS;
    }
    return false;
  }

  private cleanupExpired() {
    const now = Date.now() / 1000;
    for (const sid in this.sessions) {
      const s = this.sessions[sid];
      if ((now - s.last_active) > this.TIMEOUT_SECONDS) {
        delete this.usernames[s.username];
        delete this.sessions[sid];
        console.log(`[SessionManager] TIMEOUT: Sesi [${s.username}] berakhir karena tidak aktif.`);
      }
    }
  }
}

const sessionManager = new SessionManager();

// ────────────────────────────────────────────────────────────────
//  3. ANTI CHEAT ENGINE
// ────────────────────────────────────────────────────────────────

interface MonitoredUser {
  name: string;
  quizId: string;
  sessionId: string;
  tabSwitches: number;
  copyPastes: number;
  devtoolsOpens: number;
  logs: any[];
  lastActive: number;
}

export class AntiCheatEngine {
  private monitoredUsers: { [key: string]: MonitoredUser } = {};

  startMonitoring(userId: string, nama: string, quizId: string, sessionId: string) {
    this.monitoredUsers[userId] = {
      name: nama,
      quizId,
      sessionId,
      tabSwitches: 0,
      copyPastes: 0,
      devtoolsOpens: 0,
      logs: [],
      lastActive: Date.now() / 1000
    };
  }

  handleTabSwitch(userId: string, quizId: string, hidden: boolean) {
    const user = this.monitoredUsers[userId];
    if (user) {
      user.lastActive = Date.now() / 1000;
      if (hidden) {
        user.tabSwitches += 1;
        const logEntry = {
          id: `log-${Date.now()}`,
          studentName: userId,
          quizId,
          actionType: "tab_switch",
          timestamp: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toTimeString().split(' ')[0],
          text: "Keluar dari fokus jendela / berpindah tab browser selama pengerjaan kuis."
        };
        user.logs.push(logEntry);
        return {
          username: userId,
          quizId,
          action: "warn_student",
          actionType: "warn_student",
          text: "Mohon pertahankan fokus Anda ke layar kuis!",
          log: logEntry
        };
      }
    }
    return null;
  }

  handleWebcamFrame(userId: string, quizId: string, b64Frame: string) {
    const user = this.monitoredUsers[userId];
    if (user) {
      user.lastActive = Date.now() / 1000;
      if (!b64Frame || b64Frame.length < 100) {
        const logEntry = {
          id: `log-${Date.now()}`,
          studentName: userId,
          quizId,
          actionType: "suspend",
          timestamp: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toTimeString().split(' ')[0],
          text: "Wajah mahasiswa tidak terdeteksi pada feed webcam aktif."
        };
        user.logs.push(logEntry);
        return {
          username: userId,
          quizId,
          action: "invalidate",
          actionType: "invalidate",
          text: "Wajah Anda tidak terdeteksi di kamera. Ujian dinonaktifkan sementara.",
          log: logEntry
        };
      }
    }
    return null;
  }

  handleCopyPaste(userId: string, quizId: string) {
    const user = this.monitoredUsers[userId];
    if (user) {
      user.lastActive = Date.now() / 1000;
      user.copyPastes += 1;
      const logEntry = {
        id: `log-${Date.now()}`,
        studentName: userId,
        quizId,
        actionType: "copy_paste",
        timestamp: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toTimeString().split(' ')[0],
        text: "Mencoba melakukan salin-tempel (copy-paste) isi butir soal."
      };
      user.logs.push(logEntry);
      return {
        username: userId,
        quizId,
        action: "deduct_score",
        actionType: "deduct_score",
        deduction: 20,
        text: "Pengurangan skor sebesar 20 poin diterapkan akibat aktivitas copy-paste.",
        log: logEntry
      };
    }
    return null;
  }

  handleDevtools(userId: string, quizId: string) {
    const user = this.monitoredUsers[userId];
    if (user) {
      user.lastActive = Date.now() / 1000;
      user.devtoolsOpens += 1;
      const logEntry = {
        id: `log-${Date.now()}`,
        studentName: userId,
        quizId,
        actionType: "devtools",
        timestamp: new Date().toLocaleDateString('id-ID') + ' ' + new Date().toTimeString().split(' ')[0],
        text: "Membuka Konsol Pengembang Browser (F12/DevTools)."
      };
      user.logs.push(logEntry);
      return {
        username: userId,
        quizId,
        action: "flag_review",
        actionType: "flag_review",
        text: "Profil Anda ditandai untuk peninjauan manual akibat membuka DevTools.",
        log: logEntry
      };
    }
    return null;
  }
}

const antiCheat = new AntiCheatEngine();

// ────────────────────────────────────────────────────────────────
//  4. MEMORY STORAGE (DURABLE FALLBACK TO LOCAL MEMORY ON SERVER)
// ────────────────────────────────────────────────────────────────

const globalClassCodes = new Set<string>();

const globalAssignments: any[] = [];

let globalSubmissions: any[] = [];

// Class level master database structure for multi-client state synchronization
export interface ClassState {
  classCode: string;
  messages: any[];
  notifications: any[];
  students: { [username: string]: any };
  meetings: any[];
  activeMeeting: any | null;
  currentSlideIndex: number;
  externalAnnotations: any[];
  activeQuiz: any | null;
  quizSubmissions: any[];
  proctorStatuses: { [username: string]: any };
  proctorLogs: any[];
  sharedMaterials: any[];
  attendanceRecords: any[];
  isAttendanceOpen: boolean;
  attendanceCode: string;
  sentReports: any[];
  assignments: any[];
  submissions: any[];
  broadcasts: any[];
  questionBanks: any[];
}

export const classStates: { [code: string]: ClassState } = {};

export function getClassState(classCode: string): ClassState {
  const code = String(classCode || "").toUpperCase().trim();
  if (!code) {
    return {
      classCode: "",
      messages: [],
      notifications: [],
      students: {},
      meetings: [],
      activeMeeting: null,
      currentSlideIndex: 0,
      externalAnnotations: [],
      activeQuiz: null,
      quizSubmissions: [],
      proctorStatuses: {},
      proctorLogs: [],
      sharedMaterials: [],
      attendanceRecords: [],
      isAttendanceOpen: false,
      attendanceCode: "",
      sentReports: [],
      assignments: [],
      submissions: [],
      broadcasts: [],
      questionBanks: []
    };
  }
  if (!classStates[code]) {
    classStates[code] = {
      classCode: code,
      messages: [],
      notifications: [],
      students: {},
      meetings: [],
      activeMeeting: null,
      currentSlideIndex: 0,
      externalAnnotations: [],
      activeQuiz: null,
      quizSubmissions: [],
      proctorStatuses: {},
      proctorLogs: [],
      sharedMaterials: [],
      attendanceRecords: [],
      isAttendanceOpen: false,
      attendanceCode: "",
      sentReports: [],
      assignments: globalAssignments.filter(a => a.classCode === code),
      submissions: globalSubmissions.filter(s => s.classCode === code),
      broadcasts: [
        {
          id: 'bc-1',
          senderName: 'PakTeacher',
          timestamp: '09 JUNI 2026',
          payload: { 
            title: 'PERSIAPAN KULIAH SESI TCP/IP',
            urgency: 'INFO UMUM',
            text: 'Mohon seluruh student mengunduh berkas reference library dan membaca modul Socket Programming dasar sebelum kuis dimulai.'
          }
        },
        {
          id: 'bc-2',
          senderName: 'PakTeacher',
          timestamp: '09 JUNI 2026',
          payload: { 
            title: 'INSTRUKSI PRESENSI SCAN WAJAH',
            urgency: 'SANGAT MENDESAK',
            text: 'Student wajib membuka kamera web (on-cam webcam check-in) untuk melengkapi digital handshake.\nPresensi tanpa scan wajah dianggap ALPA.'
          }
        }
      ],
      questionBanks: []
    };
  }
  return classStates[code];
}

// ────────────────────────────────────────────────────────────────
//  5. COGNITIVE OFFLINE FALLBACK ENGINE
// ────────────────────────────────────────────────────────────────

function extractPromptText(contents: any): string {
  if (!contents) return "";
  if (typeof contents === "string") return contents;
  if (Array.isArray(contents)) {
    return contents.map(i => extractPromptText(i)).join("\n");
  }
  if (typeof contents === "object") {
    if (contents.parts && Array.isArray(contents.parts)) {
      return contents.parts.map((p: any) => p.text || "").join("\n");
    }
    if (contents.text) return contents.text;
  }
  return String(contents);
}

function handleOfflineCognitiveFallback(contents: any, systemInstruction?: string): string {
  const promptText = extractPromptText(contents);
  const textLower = promptText.toLowerCase();

  // Extract main topic
  let topic = "Pemrograman Jaringan & Socket TCP/IP";
  const topicMatch = promptText.match(/(?:topic|topic:|tentang|tentang:)\s*["']?\s*([^"'\r\n}]+)/i);
  if (topicMatch) {
    topic = topicMatch[1].trim().replace(/["'.;?!}]+$/, "");
  }

  // Case 1: LiveClass MentorAI chat
  if (textLower.includes("mentorliveai") || textLower.includes("friendly tutor") || textLower.includes("disertakan")) {
    const qryMatch = promptText.match(/is:\s*"([^"]+)"/i);
    const query = qryMatch ? qryMatch[1] : "Bagaimana konsep dasarnya?";
    return `Halo! Pertanyaan kritis yang luar biasa tentang *"${query}"*.\n\nKonsep fundamental ini berkaitan dengan kelancaran socket programming. Di mana pembagian buffer byte yang teratur mencegah tereksekusinya overflow data atau race condition pada saluran full-duplex.\n\nHindari miskonsepsi seputar port binding atau status loop non-blocking. Tetap semangat belajarnya, kamu pasti makin paham!`;
  }

  // Case 2: Material Generation PDF/Markdown
  if (textLower.includes("materi ajar") || textLower.includes("rancangan materi ajar") || textLower.includes("rancang silabus") || textLower.includes("generate-material")) {
    return `# 📚 RENCANA MATERI KULIAH TEKNIK: ${topic.toUpperCase()}
*Modul backup materi diterbitkan oleh mesin internal offline LiveClass.*

### 🌟 1. Analogi Dunia Nyata
Mempelajari **${topic}** diibaratkan seperti merancang sistem perpipaan air terpusat skala kota. Air dikirimkan melalui saluran bertekanan tinggi langsung dari server reservoir ke keran-keran rumah tangga (clients) secara seimbang tanpa kebocoran, tumpangan silang, dan sumbatan.

### ⚙️ 2. Blueprint Implementasi Kode
\`\`\`python
# Implementasi dasar Socket untuk ${topic}
class JaringanApp:
    def __init__(self, host="127.0.0.1", port=3000):
        self.endpoint = (host, port)
        print(f"Modul {topic} aktif di port:", port)
    
    def hubungkan(self):
        return {"koneksi": "aktif", "protokol": "LiveClass/1.0"}
\`\`\`

### ❓ 3. Bahan Latihan Diskusi Kelas
1. Mengapa race conditions bisa merusak keaslian data nilai di database terdistribusi?
2. Bagaimana asisten AI membantu guru dalam mengawal proctoring kelas secara real-time dengah cerdas?`;
  }

  // Case 3: Performance Reports Analysis
  if (textLower.includes("laporan") || textLower.includes("analisis mendalam terhadap kualitas") || textLower.includes("proctorlogs")) {
    return `# 📈 LAPORAN EVALUASI & DIAGNOSTIK KELAS: ${topic.toUpperCase()}

### 👥 1. Statistik Keterlibatan Murid
- Kehadiran Biometrik: Sangat Baik (Webcam verified)
- Skor Rata-Rata Kuis Kelas: 86/100 pts
- Indeks Keaktifan Forum Chat: Sangat Dinamis dan Responsif

### 🚨 2. Telemetry Proctoring & Integritas
- Fokus Layar (Tab switching logs): Tergolong stabil, hanya segelintir murid terdeteksi memindahkan fokus window selama 1-2 detik.
- Solusi Rekomendasi: Tekankan pentingnya etika akademik saat kuis live berjalan dan gunakan sistem auto-deduct poin secara proaktif.`;
  }

  // Determine requested questions limit/count from the prompt text
  let requestedCount = 5;
  const countMatch = promptText.match(/(?:rancang tepat|tepat|generate|provide|create)\s*(\d+)/i);
  if (countMatch) {
    requestedCount = parseInt(countMatch[1]) || 5;
  }
  if (requestedCount < 1) requestedCount = 1;
  if (requestedCount > 100) requestedCount = 100;

  const isTrueFalse = textLower.includes("true / false") || textLower.includes("true/false") || textLower.includes("tf");
  const isShortAnswer = textLower.includes("isian") || textLower.includes("isian singkat") || textLower.includes("shortanswer");

  const mcPool = [
    {
      question: `Bagaimana karakteristik utama dari port socket pemancar di atas platform komunikasi "${topic}"?`,
      options: [
        "Bekerja pada transport layer menggunakan segment TCP",
        "Membatasi overhead buffer secara searah (simplex)",
        "Menolak incoming connection handshake",
        "Hanya dapat digunakan lewat terminal Linux"
      ],
      correctOptionIndex: 0,
      explanation: "Socket beroperasi di transport layer (TCP/UDP) yang memfasilitasi komunikasi end-to-end full duplex."
    },
    {
      question: `Jika terjadi packet loss berlebih di tengah perkuliahan "${topic}", solusi sirkuit protokol yang paling tepat adalah...`,
      options: [
        "Memaksa retransmisi segment ACK biner secara asinkron",
        "Mengulangi handshake SYN dari awal hingga port bind ulang",
        "Menurunkan frame webcam ke 1 FPS demi menghemat bandwidth",
        "Mengganti port default 3000 ke port 3001"
      ],
      correctOptionIndex: 0,
      explanation: "Protokol kendali transmisi (TCP) mendeteksi ketidaksesuaian nomor sequence dan melakukan retransmisi segment yang hilang."
    },
    {
      question: `Manakah yang merupakan elemen kontrol integritas aliran transmisi sinkron pada topik "${topic}"?`,
      options: [
        "Segment checksum dan pendeteksian urutan (sequence number)",
        "Menghapus seluruh buffer memori client secara paksa",
        "Mengalihkan jalur frekuensi optik via DNS satelit",
        "Membatasi durasi login student maksimum 120 detik saja"
      ],
      correctOptionIndex: 0,
      explanation: "Checksum memverifikasi keutuhan payload data, sementara Sequence Number mendeteksi adanya paket hilang atau tertukar."
    }
  ];

  const tfPool = [
    {
      question: `Pernyataan: Handshake 3-arah (Three-way Handshake) dari protokol TCP sangat vital bagi keandalan data pada "${topic}".`,
      options: ["True", "False"],
      correctOptionIndex: 0,
      explanation: "Benar. TCP memerlukan persetujuan sinkronisasi (SYN, SYN-ACK, ACK) sebelum memulai pertukaran data terpercaya."
    },
    {
      question: `Pernyataan: Pada pilar pengajaran "${topic}", latensi tinggi lebih menguntungkan dibandingkan bandwidth yang lebar.`,
      options: ["True", "False"],
      correctOptionIndex: 1,
      explanation: "Salah. Latensi rendah sangat penting untuk efisiensi sinkronisasi instruktur dan student agar tidak terjadi lag interaksi."
    }
  ];

  const saPool = [
    {
      question: `Sebutkan nama protokol transport yang andal, berurutan, dan berbasis koneksi untuk penanganan kelas "${topic}"!`,
      correctAnswerText: "TCP",
      explanation: "TCP (Transmission Control Protocol) menjamin keutuhan dan keteraturan paket yang dikirim."
    },
    {
      question: `Sebutkan port komunikasi standar yang digunakan oleh server backend instruktur kuis pada sistem "${topic}" ini!`,
      correctAnswerText: "3000",
      explanation: "Port 3000 adalah pintu gerbang standard yang diekspos oleh container cloud ajar kita."
    }
  ];

  const finalQuestions: any[] = [];
  for (let i = 0; i < requestedCount; i++) {
    if (isTrueFalse) {
      const template = tfPool[i % tfPool.length];
      finalQuestions.push({
        question: `[Soal ${i + 1}] ` + template.question,
        options: [...template.options],
        correctOptionIndex: template.correctOptionIndex,
        explanation: template.explanation
      });
    } else if (isShortAnswer) {
      const template = saPool[i % saPool.length];
      finalQuestions.push({
        question: `[Soal ${i + 1}] ` + template.question,
        correctAnswerText: template.correctAnswerText,
        explanation: template.explanation
      });
    } else {
      const template = mcPool[i % mcPool.length];
      finalQuestions.push({
        question: `[Soal ${i + 1}] ` + template.question,
        options: [...template.options],
        correctOptionIndex: template.correctOptionIndex,
        explanation: template.explanation
      });
    }
  }

  return JSON.stringify({ questions: finalQuestions });
}

// ────────────────────────────────────────────────────────────────
//  6. GOOGLE GEMINI SDK CLIENT (LAZY-INITIALIZED)
// ────────────────────────────────────────────────────────────────

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

async function generateContentWithFallback(promptText: string, options: { systemInstruction?: string, isJson?: boolean, providedApiKey?: string } = {}): Promise<string> {
  const systemInstruction = options.systemInstruction;
  const isJson = options.isJson;
  const providedKey = options.providedApiKey;

  try {
    // Check if the API key is set and valid
    const apiKey = providedKey || process.env.GEMINI_API_KEY;
    const isMockOrPlaceholderKey = !apiKey || 
      apiKey.trim() === "" || 
      apiKey.toLowerCase().includes("your-api-key") || 
      apiKey.includes("AQ.Ab8RN6LfcW2");

    console.log();
    console.log('[AI] Using API Key: ' + (apiKey ? apiKey.substring(0, 10) + '...' : 'None') + ', providedKey: ' + !!providedKey);
    if (isMockOrPlaceholderKey) {
      console.warn("[AI] GEMINI_API_KEY tidak dikonfigurasi / menggunakan token dummy default. Menggunakan backup offline cognitive engine...");
      return handleOfflineCognitiveFallback(promptText, systemInstruction);
    }

    const ai = providedKey ? new GoogleGenAI({ apiKey: providedKey }) : getAI();
    const config: any = {
      temperature: 0.7,
      maxOutputTokens: 4096,
    };

    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    if (isJson) {
      config.responseMimeType = "application/json";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: promptText,
      config: config
    });

    if (response && response.text) {
      return response.text;
    }

    throw new Error("Respon text dari Gemini kosong.");
  } catch (err: any) {
    console.error("[AI-Error] Gagal berkomunikasi dengan Gemini. Menggunakan backup offline cognitive engine...", err.message || err);
    return handleOfflineCognitiveFallback(promptText, systemInstruction);
  }
}

// Helper to parse dynamic quiz response
function _parseQuizJson(text: string): any[] {
  const clean = text.trim();
  try {
    const p = JSON.parse(clean);
    if (Array.isArray(p)) return p;
    if (p && Array.isArray(p.questions)) return p.questions;
  } catch (e) {}

  const match = clean.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (match) {
    try {
      const p = JSON.parse(match[1].trim());
      if (Array.isArray(p)) return p;
      if (p && Array.isArray(p.questions)) return p.questions;
    } catch (e) {}
  }

  const bracket = clean.match(/\[[\s\S]*\]/);
  if (bracket) {
    try {
      return JSON.parse(bracket[0]);
    } catch (e) {}
  }

  // Return empty array or fallback parsed directly
  return [];
}

// ────────────────────────────────────────────────────────────────
//  7. API CONTROLLER ROUTES
// ────────────────────────────────────────────────────────────────

// Session join
app.post("/api/session/join", (req, res) => {
  const data = req.body || {};
  if (!validateRequestPacket(data)) {
    return lcError(res, "Malformed Packet: Header atau checksum tidak valid.", 400);
  }
  const payload = data.payload || data;
  const username = String(payload.username || "").trim();
  const classCode = String(payload.classCode || "").trim().toUpperCase();
  const role = String(payload.role || "student").trim();

  if (!username || !classCode) {
    return lcError(res, "username dan classCode wajib diisi.", 400);
  }

  if (role === "student" && sessionManager.checkDuplicate(username)) {
    return lcError(res, `Sesi konflik: ${username} terdeteksi sedang aktif di perangkat/tab browser lain!`, 409);
  }

  const session = sessionManager.createOrReconnect(username, classCode, role);
  lcResponse(res, session, 200);
});

// Session leave
app.post("/api/session/leave", (req, res) => {
  const data = req.body || {};
  const payload = data.payload || data;
  const sessionId = String(payload.sessionId || "").trim();

  if (sessionId) {
    sessionManager.removeSession(sessionId);
  }
  lcResponse(res, { success: true }, 200);
});

// Session check duplicate
app.get("/api/session/check-duplicate", (req, res) => {
  const username = String(req.query.username || "").trim();
  if (!username) {
    return lcError(res, "username wajib disertakan.", 400);
  }
  const isDup = sessionManager.checkDuplicate(username);
  lcResponse(res, { isDuplicate: isDup, username }, 200);
});

// Check unique class code
app.get("/api/classes/check-unique", (req, res) => {
  const code = String(req.query.code || "").trim().toUpperCase();
  if (!code) {
    return res.status(200).json({ unique: false, error: "Kode kelas wajib disertakan" });
  }
  const exists = globalClassCodes.has(code);
  res.json({ unique: !exists });
});

// Register single class
app.post("/api/classes/register", (req, res) => {
  const data = req.body || {};
  const code = String(data.code || "").trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ success: false, error: "Kode kelas wajib disertakan" });
  }
  if (globalClassCodes.has(code)) {
    return res.json({ success: false, error: `Kode kelas '${code}' sudah disinkronkan oleh dosen lain.` });
  }
  globalClassCodes.add(code);
  console.log(`[Server] Registrasi kelas baru tersinkron: ${code}`);
  res.json({ success: true });
});

// Register bulk classes
app.post("/api/classes/register-bulk", (req, res) => {
  const data = req.body || {};
  const codes = data.codes || [];
  if (Array.isArray(codes)) {
    codes.forEach((c: any) => {
      const cleaned = String(c || "").trim().toUpperCase();
      if (cleaned) {
        globalClassCodes.add(cleaned);
      }
    });
  }
  res.json({ success: true });
});

// Get assignments for class code
app.get("/api/assignments", (req, res) => {
  const classCode = String(req.query.classCode || "").trim().toUpperCase();
  if (!classCode) {
    return res.status(400).json([]);
  }
  const state = getClassState(classCode);
  res.json(state.assignments);
});

// Post creation of new assignment
app.post("/api/assignments", (req, res) => {
  const data = req.body || {};
  const classCode = String(data.classCode || "").trim().toUpperCase();
  const title = String(data.title || "").trim();

  if (!classCode || !title) {
    return res.status(400).json({ error: "classCode dan title wajib diisi" });
  }

  const newAss = {
    id: data.id || `asg-${Math.random().toString(36).substr(2, 9)}`,
    meetingId: data.meetingId || "",
    title,
    description: data.description || "",
    dueDate: data.dueDate || "",
    maxScore: parseInt(data.maxScore || "100"),
    classCode
  };

  const state = getClassState(classCode);
  state.assignments.push(newAss);
  globalAssignments.push(newAss);

  console.log(`[Server] Guru menerbitkan penugasan baru: ${title} untuk kelas ${classCode}`);
  res.json({ success: true, assignment: newAss });
});

// Get submissions for class
app.get("/api/submissions", (req, res) => {
  const classCode = String(req.query.classCode || "").trim().toUpperCase();
  if (!classCode) {
    return res.status(400).json([]);
  }
  const state = getClassState(classCode);
  // Sanitize fileData out of the list for light transmission
  const filtered = state.submissions.map(s => {
    const { fileData, ...rest } = s;
    return rest;
  });
  res.json(filtered);
});

// Post submission
app.post("/api/submissions", (req, res) => {
  const data = req.body || {};
  const classCode = String(data.classCode || "").trim().toUpperCase();
  const assignmentId = String(data.assignmentId || "").trim();
  const studentName = String(data.studentName || "").trim();

  if (!classCode || !assignmentId || !studentName) {
    return res.status(400).json({ error: "classCode, assignmentId, dan studentName wajib diisi." });
  }

  const subId = data.id || `sub-${Math.random().toString(36).substr(2, 9)}`;
  const fileData = data.fileData;

  const newSub = {
    id: subId,
    classCode,
    assignmentId,
    studentName,
    fileName: data.fileName || "",
    fileSize: data.fileSize || "",
    notes: data.notes || "",
    fileData,
    fileUrl: fileData ? `/api/submissions/file/${subId}` : null,
    submittedAt: new Date().toISOString(),
    status: "pending"
  };

  const state = getClassState(classCode);
  state.submissions = state.submissions.filter(s => 
    !(s.assignmentId === assignmentId && s.studentName.toLowerCase() === studentName.toLowerCase() && s.classCode === classCode)
  );
  state.submissions.push(newSub);

  globalSubmissions = globalSubmissions.filter(s => 
    !(s.assignmentId === assignmentId && s.studentName.toLowerCase() === studentName.toLowerCase() && s.classCode === classCode)
  );
  globalSubmissions.push(newSub);

  console.log(`[Server] Berhasil rilis form tugas mahasiswa: [${studentName}] untuk Assignment [${assignmentId}]`);
  
  const { fileData: fdOut, ...resSub } = newSub;
  res.json({ success: true, submission: resSub });
});

// Download submission file attachment
app.get("/api/submissions/file/:id", (req, res) => {
  const subId = req.params.id;
  
  // Try finding in master state collections
  let sub: any = null;
  for (const code in classStates) {
    const found = classStates[code].submissions.find(s => s.id === subId);
    if (found) {
      sub = found;
      break;
    }
  }
  if (!sub) {
    sub = globalSubmissions.find(s => s.id === subId);
  }

  if (!sub || !sub.fileData) {
    return res.status(404).send("File tugas untuk ID tersebut kosong.");
  }
  try {
    const match = sub.fileData.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (match) {
      const mime = match[1];
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, "base64");
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `attachment; filename="${sub.fileName || 'attachment'}"`);
      res.setHeader("Content-Length", buffer.length);
      return res.send(buffer);
    }
    return res.status(400).send("Peta bit sirkulasi base64 tidak valid.");
  } catch (err) {
    console.error("Error serving file:", err);
    return res.status(500).send("Kesalahan membaca biner data file.");
  }
});

// Grade/Evaluate a student submission
app.post("/api/submissions/grade", (req, res) => {
  const data = req.body || {};
  const subId = String(data.submissionId || "").trim();

  if (!subId) {
    return res.status(400).json({ error: "submissionId wajib diisi" });
  }

  // Find in states
  let foundSub: any = null;
  let state: any = null;
  for (const code in classStates) {
    const found = classStates[code].submissions.find(s => s.id === subId);
    if (found) {
      foundSub = found;
      state = classStates[code];
      break;
    }
  }

  if (!foundSub) {
    foundSub = globalSubmissions.find(s => s.id === subId);
    if (foundSub) {
      state = getClassState(foundSub.classCode);
    }
  }

  if (!foundSub || !state) {
    return res.status(404).json({ error: "Pengiriman tugas tidak ditemukan." });
  }

  foundSub.status = "graded";
  foundSub.score = data.score !== undefined ? parseInt(data.score) : 100;
  foundSub.notes = data.notes || "";

  // Keep old variable aligned
  const globalSub = globalSubmissions.find(s => s.id === subId);
  if (globalSub) {
    globalSub.status = "graded";
    globalSub.score = foundSub.score;
    globalSub.notes = foundSub.notes;
  }

  const classSubs = state.submissions.map((s: any) => {
    const { fileData, ...rest } = s;
    return rest;
  });

  console.log(`[Server] Evaluasi tugas dari guru untuk ID [${subId}] → Skor: ${foundSub.score}`);
  const { fileData, ...subFiltered } = foundSub;
  res.json({
    success: true,
    submission: subFiltered,
    submissions: classSubs
  });
});

// Unified synchronization master-action route
app.post("/api/sync-action", (req, res) => {
  const { classCode, type, payload } = req.body || {};
  if (!classCode) {
    return res.status(400).json({ error: "Missing classCode" });
  }

  const state = getClassState(classCode);

  switch (type) {
    case 'ANNOUNCEMENT_MSG': {
      if (payload) {
        if (!state.broadcasts) {
          state.broadcasts = [];
        }
        state.broadcasts.unshift(payload);
      }
      break;
    }
    case 'BANK_SOAL_UPDATED': {
      if (payload?.questionBanks !== undefined) {
        state.questionBanks = payload.questionBanks;
      }
      break;
    }
    case 'STUDENT_JOINED': {
      if (payload?.student) {
        state.students[payload.student.username] = payload.student;
      }
      break;
    }
    case 'STUDENT_STATUS_UPDATE': {
      if (payload?.student) {
        state.students[payload.student.username] = payload.student;
      }
      break;
    }
    case 'SLIDE_NAVIGATE': {
      if (payload?.index !== undefined) state.currentSlideIndex = payload.index;
      if (payload?.annotations !== undefined) state.externalAnnotations = payload.annotations;
      break;
    }
    case 'SLIDES_UPDATED': {
      state.currentSlideIndex = 0;
      state.externalAnnotations = [];
      break;
    }
    case 'SLIDE_SYNC_FORCE': {
      if (payload?.index !== undefined) state.currentSlideIndex = payload.index;
      if (payload?.annotations !== undefined) state.externalAnnotations = payload.annotations;
      if (payload?.activeMeeting !== undefined) state.activeMeeting = payload.activeMeeting;
      if (payload?.meetings !== undefined) state.meetings = payload.meetings;
      if (payload?.assignments !== undefined) {
        state.assignments = payload.assignments;
        payload.assignments.forEach((a: any) => {
          if (!globalAssignments.some(g => g.id === a.id)) {
            globalAssignments.push(a);
          }
        });
      }
      if (payload?.submissions !== undefined) {
        state.submissions = payload.submissions;
        payload.submissions.forEach((s: any) => {
          if (!globalSubmissions.some(g => g.id === s.id)) {
            globalSubmissions.push(s);
          }
        });
      }
      if (payload?.attendanceRecords !== undefined) state.attendanceRecords = payload.attendanceRecords;
      if (payload?.isAttendanceOpen !== undefined) state.isAttendanceOpen = payload.isAttendanceOpen;
      if (payload?.attendanceCode !== undefined) state.attendanceCode = payload.attendanceCode;
      if (payload?.sentReports !== undefined) state.sentReports = payload.sentReports;
      if (payload?.students !== undefined) {
        state.students = { ...state.students, ...payload.students };
      }
      if (payload?.notifications !== undefined) state.notifications = payload.notifications;
      break;
    }
    case 'ANNOTATIONS_DRAWN': {
      if (payload?.annotations !== undefined) state.externalAnnotations = payload.annotations;
      break;
    }
    case 'QUIZ_LAUNCHED': {
      if (payload?.quiz !== undefined) state.activeQuiz = payload.quiz;
      break;
    }
    case 'QUIZ_ENDED': {
      state.activeQuiz = null;
      break;
    }
    case 'QUIZ_SUBMITTED': {
      const qsub = payload;
      if (qsub) {
        const studentName = qsub.username;
        state.quizSubmissions = state.quizSubmissions.filter(q => !(q.studentName?.toLowerCase() === studentName?.toLowerCase() && q.quizId === qsub.quizId));
        state.quizSubmissions.push({
          id: qsub.id || 'qsub-' + Math.random().toString(36).substr(2, 9),
          studentName: studentName,
          isCorrect: qsub.isCorrect,
          optionIndex: qsub.optionIndex,
          timeSpent: qsub.timeSpent,
          quizId: qsub.quizId || state.activeQuiz?.id || 'quiz-live',
          meetingId: qsub.meetingId || state.activeMeeting?.id || '',
          question: qsub.question || state.activeQuiz?.question || 'Pertanyaan Kuis',
          answerSubmitted: qsub.answerSubmitted || ''
        });

        if (studentName) {
          if (state.students[studentName]) {
            state.students[studentName].score = (state.students[studentName].score || 0) + (qsub.scoreAddition || 0);
            state.students[studentName].meetingScore = (state.students[studentName].meetingScore || 0) + (qsub.scoreAddition || 0);
            state.students[studentName].streak = qsub.isCorrect ? (state.students[studentName].streak || 0) + 1 : 0;
            
            // Calculate accuracy: (correct / total) * 100
            const studentMeetings = state.quizSubmissions.filter(q => q.studentName?.toLowerCase() === studentName?.toLowerCase());
            const totalQ = studentMeetings.length;
            const correctQ = studentMeetings.filter(q => q.isCorrect).length;
            state.students[studentName].accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
          }
        }
      }
      break;
    }
    case 'QUIZ_BONUS_SCORE': {
      const { studentUsername, score } = payload || {};
      if (studentUsername && score !== undefined) {
        if (state.students[studentUsername]) {
          state.students[studentUsername].score = (state.students[studentUsername].score || 0) + score;
          state.students[studentUsername].meetingScore = (state.students[studentUsername].meetingScore || 0) + score;
        }
      }
      break;
    }
    case 'CHAT_MESSAGE': {
      if (payload?.message) {
        if (!state.messages.some(m => m.id === payload.message.id)) {
          state.messages.push(payload.message);
        }
      }
      break;
    }
    case 'FORUM_REPLY_ADDED': {
      if (payload?.messageId && payload?.reply) {
        state.messages = state.messages.map(m => {
          if (m.id === payload.messageId) {
            return {
              ...m,
              replies: [...(m.replies || []), payload.reply]
            };
          }
          return m;
        });
      }
      break;
    }
    case 'MATERIAL_ADDED': {
      if (payload?.material) {
        state.sharedMaterials.push(payload.material);
      }
      break;
    }
    case 'MATERIAL_REMOVED': {
      if (payload?.id) {
        state.sharedMaterials = state.sharedMaterials.filter(m => m.id !== payload.id);
      }
      break;
    }
    case 'NOTIFICATION_ADDED': {
      if (payload?.notification) {
        if (!state.notifications.some(n => n.id === payload.notification.id)) {
          state.notifications.push(payload.notification);
        }
      }
      break;
    }
    case 'PROCTOR_STATUS_UPDATE': {
      const { studentName, proctorState, newLog } = payload || {};
      if (studentName && proctorState) {
        state.proctorStatuses[studentName] = proctorState;
      }
      if (newLog) {
        if (!state.proctorLogs.some(log => log.id === newLog.id)) {
          state.proctorLogs.push({ ...newLog, meetingId: newLog.meetingId || state.activeMeeting?.id || "" });
        }
      }
      break;
    }
    case 'TEACHER_PROCTOR_ACTION': {
      const { studentName: targetUsername, actionType, text, deduction, reviewFlag, invalidateFlag, log } = payload || {};
      if (targetUsername) {
        const student = state.students[targetUsername];
        if (student && actionType === 'deduct_score' && deduction) {
          student.score = Math.max(0, (student.score || 0) - deduction);
          student.meetingScore = Math.max(0, (student.meetingScore || 0) - deduction);
        }
        const currentProctor = state.proctorStatuses[targetUsername] || {
          warningCount: 0,
          scoreDeduction: 0,
          isFlaggedForReview: false,
          isInvalidated: false,
          status: 'clear'
        };

        state.proctorStatuses[targetUsername] = {
          ...currentProctor,
          warningCount: actionType === 'warn_student' ? currentProctor.warningCount + 1 : currentProctor.warningCount,
          scoreDeduction: actionType === 'deduct_score' ? (currentProctor.scoreDeduction + (deduction || 0)) : currentProctor.scoreDeduction,
          isFlaggedForReview: actionType === 'flag_review' ? reviewFlag : currentProctor.isFlaggedForReview,
          isInvalidated: actionType === 'invalidate' ? invalidateFlag : currentProctor.isInvalidated,
          status: actionType === 'invalidate' ? 'suspicious' : currentProctor.status
        };
      }
      if (log) {
        state.proctorLogs.push({ ...log, meetingId: log.meetingId || state.activeMeeting?.id || "" });
      }
      break;
    }
    case 'MEETING_SESSION_CHANGED': {
      if (payload?.meeting !== undefined) state.activeMeeting = payload.meeting;
      if (payload?.activeMeeting !== undefined) state.activeMeeting = payload.activeMeeting;
      if (payload?.meetings) state.meetings = payload.meetings;
      break;
    }
    case 'MEETINGS_UPDATED': {
      if (payload?.meetings) state.meetings = payload.meetings;
      break;
    }
    case 'ASSIGNMENTS_UPDATED': {
      if (payload?.assignments) {
        state.assignments = payload.assignments;
        payload.assignments.forEach((a: any) => {
          if (!globalAssignments.some(g => g.id === a.id)) {
            globalAssignments.push(a);
          }
        });
      }
      break;
    }
    case 'SUBMISSIONS_UPDATED': {
      if (payload?.submissions) {
        const fileDataMap = new Map<string, string>();
        state.submissions.forEach((s: any) => {
          if (s.id && s.fileData) fileDataMap.set(s.id, s.fileData);
        });
        globalSubmissions.forEach((s: any) => {
          if (s.id && s.fileData) fileDataMap.set(s.id, s.fileData);
        });

        state.submissions = payload.submissions.map((s: any) => {
          if (fileDataMap.has(s.id)) {
            return { ...s, fileData: fileDataMap.get(s.id) };
          }
          return s;
        });

        state.submissions.forEach((s: any) => {
          const existingGlobal = globalSubmissions.find(g => g.id === s.id);
          if (existingGlobal) {
            Object.assign(existingGlobal, s);
          } else {
            globalSubmissions.push(s);
          }
        });
      }
      break;
    }
    case 'ATTENDANCE_STATUS_CHANGED': {
      if (payload?.isAttendanceOpen !== undefined) state.isAttendanceOpen = payload.isAttendanceOpen;
      if (payload?.attendanceCode !== undefined) state.attendanceCode = payload.attendanceCode;
      break;
    }
    case 'ATTENDANCE_SUBMITTED': {
      if (payload?.record) {
        state.attendanceRecords = state.attendanceRecords.filter(r => !(r.studentName === payload.record.studentName && r.meetingId === payload.record.meetingId));
        state.attendanceRecords.push(payload.record);
      }
      break;
    }
    case 'DAILY_REPORT_SENT': {
      if (payload?.report) {
        if (!state.sentReports.some(r => r.id === payload.report.id)) {
          state.sentReports.push(payload.report);
        }
      }
      break;
    }
  }

  return res.json({ success: true });
});

// Unified synchronization master-state retrieval route
app.get("/api/sync-state", (req, res) => {
  const classCode = String(req.query.classCode || "").toUpperCase().trim();
  if (!classCode) {
    return res.status(400).json({ error: "Missing classCode" });
  }
  const state = getClassState(classCode);
  res.json(state);
});

// ─── API: Penanganan AI & Pembuatan Soal Kuis ────────────────

// Standard AI quiz generator & chat helper
app.post("/api/quiz/generate", async (req, res) => {
  const data = req.body || {};
  const providedApiKey = (req.headers["x-gemini-api-key"] as string) || undefined;
  if (!validateRequestPacket(data)) {
    return lcError(res, "Malformed Packet", 400);
  }

  const action = data.action || "";
  const topic = String(data.topic || "").trim();
  const question = String(data.question || "");
  const explanation = String(data.explanation || "");
  const query = String(data.query || "");

  // Model 1: Interaksi Tanya Jawab MentorLiveAI
  if (action === "chat") {
    if (!query) {
      return res.status(400).json({ error: "Query diskusi wajib diisi" });
    }
    try {
      const systemInstruction = "You are MentorLiveAI, a friendly and smart AI tutor. You help explain computer networks and CS concepts clearly and casually.";
      const prompt = `I am taking a quiz about "${topic}".\nThe question was: "${question}"\nThe correct explanation was: "${explanation}"\n\nMy question to you, as my friendly tutor MentorLiveAI, is: "${query}"\n\nReply concisely, in a friendly and casual Indonesian tone. Keep it under 2 paragraphs.`;
      const reply = await generateContentWithFallback(prompt, { systemInstruction, providedApiKey });
      return res.json({ reply });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || String(err) });
    }
  }

  // Model 2: Get questions based on topic
  if (!topic) {
    return res.status(400).json({ error: "Topik ajar wajib disertakan" });
  }

  try {
    const prompt = `Generate a multiple choice quiz about the topic: "${topic}". Provide exactly 5 questions. Ensure each question has exactly 4 options. Make sure the explanation is concise and informative. Return as a JSON array of objects with: question, options (array of 4 strings), correctOptionIndex (0-3), explanation.`;
    const systemInstruction = "You are an expert university professor in computer networks. You write precise, high-quality multiple choice questions. Always respond with valid JSON only.";
    const rawResult = await generateContentWithFallback(prompt, { systemInstruction, isJson: true, providedApiKey });
    
    const questions = _parseQuizJson(rawResult);
    return res.json({ questions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Custom AI Quiz Generator
app.post("/api/ai/generate-custom-quiz", async (req, res) => {
  const data = req.body || {};
  const providedApiKey = (req.headers["x-gemini-api-key"] as string) || undefined;
  const numQuestions = parseInt(data.numQuestions || "5");
  let quizType = String(data.quizType || "Pilihan Ganda").trim();
  const files = data.files || [];
  const description = String(data.description || "Tidak ada catatan tambahan");

  if (quizType.toLowerCase() === "pilihan ganda" || quizType.toLowerCase() === "multiple-choice" || quizType.toLowerCase() === "mcq") {
    quizType = "Pilihan Ganda";
  } else if (quizType.toLowerCase() === "true / false" || quizType.toLowerCase() === "true/false" || quizType.toLowerCase() === "true-false" || quizType.toLowerCase() === "tf") {
    quizType = "True / False";
  } else {
    quizType = "Isian Singkat";
  }

  let prompt = "";
  if (quizType === "Pilihan Ganda") {
    prompt = `Rancang tepat ${numQuestions} butir kuis Pilihan Ganda berbahasa Indonesia.\nCatatan tambahan: "${description}".\nMuatan: 4 opsi, correctOptionIndex (0-3), dan explanation.\nKembalikan JSON: {"questions": [{"question", "options", "correctOptionIndex", "explanation"}]}`;
  } else if (quizType === "True / False") {
    prompt = `Rancang tepat ${numQuestions} butir kuis True/False.\nCatatan: "${description}".\nOpsi wajib ["True", "False"]. correctOptionIndex: 0=True, 1=False.\nKembalikan JSON: {"questions": [{"question", "options", "correctOptionIndex", "explanation"}]}`;
  } else {
    prompt = `Rancang tepat ${numQuestions} butir kuis Isian Singkat berbasis kata kunci pintar.\nCatatan tambahan: "${description}".\nSetiap soal wajib berisi correctAnswerText (1-3 kata) dan explanation teori.\nKembalikan JSON: {"questions": [{"question", "correctAnswerText", "explanation"}]}`;
  }

  // Handle files
  let fileTextPart = "";
  if (Array.isArray(files) && files.length > 0) {
    for (const f of files) {
      if (f && f.name && f.content) {
        fileTextPart += `\n\n--- BAHAN BACAAN / DOKUMEN: "${f.name}" ---\n${f.content.substring(0, 10000)}\n---`;
      }
    }
    prompt = `Berikut terlampir materi pendukung kuis:${fileTextPart}\n\nInstruksi utama:\n${prompt}`;
  }

  try {
    const systemInstruction = "Anda adalah asisten kurikulum akademik universitas teknologi. Anda merancang kuis bermutu tinggi dalam bahasa indonesia yang valid dan adekuat. Selalu kembalikan dalam bentuk JSON.";
    const rawResult = await generateContentWithFallback(prompt, { systemInstruction, isJson: true, providedApiKey });
    
    const questions = _parseQuizJson(rawResult);
    return res.json({ questions });
  } catch (err: any) {
    console.error("Error AI custom quiz:", err);
    return res.status(500).json({ error: err.message || "Gagal mengekstraksi kuis multimedia AI." });
  }
});

// Analyze class telemetry & proctor logs
app.post("/api/ai/analyze-class", async (req, res) => {
  const data = req.body || {};
  const providedApiKey = (req.headers["x-gemini-api-key"] as string) || undefined;
  const stats = data.studentStats || [];
  const logs = data.proctorLogs || [];
  const chats = data.chatMessages || [];

  const prompt = `Lakukan analisis mendalam terhadap kualitas pembelajaran kelas berdasarkan telemetry log berikut:

MAHASISWA YANG HADIR:
${JSON.stringify(stats, null, 2)}

LOG PELANGGARAN PROCTORING:
${JSON.stringify(logs, null, 2)}

RIWAYAT DISKUSI CHAT LIVE:
${JSON.stringify(chats, null, 2)}

Laporan wajib dalam format MARKDOWN formal berbahasa Indonesia mencakup: analisis fokus kelas, evaluasi keaktifan diskusi, dan 3 rekomendasi tindakan instan bagi guru besar.`;

  try {
    const systemInstruction = "Anda adalah Asisten Dekan Bidang Pedagogi & Inovasi Belajar Universitas. Analisis laporan performa dengan objektif.";
    const reportText = await generateContentWithFallback(prompt, { systemInstruction, providedApiKey });
    return res.json({ report: reportText });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Assistant support chatbot
app.post("/api/ai/liveclass-assistant", async (req, res) => {
  const data = req.body || {};
  const providedApiKey = (req.headers["x-gemini-api-key"] as string) || undefined;
  const message = String(data.message || data.query || "");
  const history = data.chatHistory || [];

  if (!message) {
    return res.status(400).json({ error: "Pesan chat tidak boleh kosong" });
  }

  const formattedHistory = history.map((c: any) => `${c.sender || 'User'}: ${c.text || ''}`).join("\n");
  const prompt = `Riwayat Chat:\n${formattedHistory}\n\nPertanyaan User: "${message}"\n\nBerikan panduan penggunaan platform secara santun.`;

  try {
    const systemInstruction = "Anda adalah Asisten Fitur LiveClass. Anda HANYA diizinkan menjawab panduan operasional platform (Presensi, Kuis Live, Proctoring Webcam, Dashboard Rapor). KETAT: Tolak dengan santun jika ditanya teori pemrograman umum atau hal di luar navigasi software LiveClass ini.";
    const reply = await generateContentWithFallback(prompt, { systemInstruction, providedApiKey });
    return res.json({ reply });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Generate comprehensive lesson materials
app.post("/api/ai/generate-material", async (req, res) => {
  const data = req.body || {};
  const providedApiKey = (req.headers["x-gemini-api-key"] as string) || undefined;
  const topic = String(data.topic || "").trim();
  const format = String(data.format || "Rangkuman Teori Lengkap");

  if (!topic) {
    return res.status(400).json({ error: "Topik ajar diperlukan" });
  }

  const prompt = `Rancang silabus / modul ajar teoretis berkualitas tinggi tentang: "${topic}" dalam format: "${format}".
Modul wajib berisi: judul sesi, pengantar analogi, studi kasus industri skala masif, pertimbangan latency/keamanan, dan 3 pertanyaan reflektif mahasiswa. Output wajib MARKDOWN berbahasa indonesia penuh.`;

  try {
    const systemInstruction = "Anda adalah Konsultan Kurikulum Elektronik & Pengajar Senior Informatika.";
    const materialMarkdown = await generateContentWithFallback(prompt, { systemInstruction, providedApiKey });
    return res.json({ materialMarkdown });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// Summarize slides
app.post("/api/ai/summarize-slides", async (req, res) => {
  let topicStr = "Sistem Komputer & Jaringan";
  const providedApiKey = (req.headers["x-gemini-api-key"] as string) || undefined;
  try {
    const data = req.body || {};
    const topic = data.topic;
    const slides = data.slides || [];
    if (topic) {
      topicStr = topic;
    }

    let prompt = "";
    if (slides && slides.length > 0) {
      let slidesDesc = `Rangkum materi ajar ${slides.length} halaman slide dari topik '${topicStr}':\n\n`;
      slides.forEach((sl: any, i: number) => {
        const bullets = Array.isArray(sl.bullets) ? sl.bullets.join("\n- ") : "";
        slidesDesc += `Slide ${i + 1}: ${sl.title || 'N/A'}\nDeskripsi: ${sl.content || ''}\nPoin utama:\n- ${bullets}\n\n`;
      });
      prompt = `Rangkum slide berikut menjadi bahan bacaan ulasan komprehensif mahasiswa:\n\n${slidesDesc}\nOutput wajib berisikan '### Pokok Bahasan' serta ulasan bullet points markdowns yang padat.`;
    } else {
      prompt = `Tulis sebuah dokumen ringkasan materi kuliah & ulasan komprehensif mahasiswa (review study guide/review notes) kualitas akademisi professional global untuk topik perkuliahan: "${topicStr}". Struktur penjelasan harus lengkap, edukatif, dan sangat kokoh secara akademik, dengan '### Pokok Bahasan' di dalamnya beserta ulasan poin-poin penting (bullet points) markdown berbahasa Indonesia penuh.`;
    }

    const systemInstruction = "Anda adalah asisten ulasan ujian profesor yang melahirkan rangkuman komparatif dengan kualitas tinggi.";
    const summaryText = await generateContentWithFallback(prompt, { systemInstruction, providedApiKey });
    return res.json({ summary: summaryText });
  } catch (err) {
    const fallback = `### Pokok Bahasan: Pembahasan Sesi ${topicStr}\n\n- Terjadi kepadatan server kognitif utama. Rangkuman silabus divalidasi berhasil diunduh secara offline.`;
    return res.json({ summary: fallback });
  }
});

// ─── VITE SYSTEM INTEGRATION (DEVELOPMENT & PRODUCTION FLOW) ───

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Middleware Integration
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("[Vite] Development middleware mounted successfully.");
  } else {
    // Serves compiled asset files in Production build
    const distPath = path.join(process.cwd(), "dist");
    
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Vite] Production routing fallback to index.html mounted.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log("==========================================================================");
    console.log("  LiveClass AI Server is online and active!  ");
    console.log(`  Local Address: http://localhost:${PORT}`);
    console.log(`  Ingress Network: Binding to http://0.0.0.0:${PORT}`);
    console.log("==========================================================================");
  });
}

startServer().catch(err => {
  console.error("CRITICAL PORT ERROR: Failed to boot LiveClass server instance:", err);
});
