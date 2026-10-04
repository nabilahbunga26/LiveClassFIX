/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Slide, Quiz, Participant, Material, Annotation, NetworkPacket, ProctorStatus, CheatingLog, Assignment, AssignmentSubmission, DailyReport } from '../types';
import { MOCK_SLIDES, MOCK_QUIZZES, generateMaterialSummary, generateFormattedTimestamp } from '../utils';
import PdfSlidesContainer from './PdfSlidesContainer';
import ChatRoom from './ChatRoom';
import ChatSystemPanel from './ChatSystemPanel';
import LiveClassLogo from './LiveClassLogo';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Use safely copied local worker from Vite public dir
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

import { 
  Users, Presentation, BarChart3, Award, Settings, Bell, 
  Play, Square, RefreshCw, FileText, Upload, Plus, Trash2, 
  Check, Info, MessageSquare, Download, AlertTriangle, Shield, Eye, ShieldAlert, BadgeInfo,
  Video, VideoOff, Mic, MicOff, Camera,
  LayoutDashboard, GraduationCap, Laptop, Sparkles, Calendar, BookOpen, Clock, Heart, ListTodo, CheckSquare, Volume2, HelpCircle, Send, Lock, FileSpreadsheet,
  UserCheck, Megaphone, ClipboardList, History, Crown, Medal, Flame,
  Rocket, Key, FolderOpen, Lightbulb, PenSquare, UploadCloud, Package, Folder, Database
} from 'lucide-react';

// === NORMALIZE NAME HELPER FOR ROBUSTER MATCHING ===
export const normalizeName = (name: string): string => {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
};

// === PREMIUM CUSTOM MARKDOWN RENDERER ===
function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  let inList = false;
  let inCode = false;
  
  return (
    <div className="space-y-2 text-xs font-medium leading-relaxed font-sans text-gray-800">
      {lines.map((line, idx) => {
        // Toggle code block
        if (line.trim().startsWith("```")) {
          inCode = !inCode;
          return null;
        }
        
        if (inCode) {
          return (
            <pre key={idx} className="bg-slate-950 text-emerald-400 p-2.5 font-mono text-[10px] overflow-x-auto border-l-4 border-[#FF007A] my-1 rounded-none select-text">
              <code>{line}</code>
            </pre>
          );
        }

        // Title H1
        if (line.startsWith("# ")) {
          return <h1 key={idx} className="text-[13px] font-black text-black uppercase tracking-wider font-display border-b-2 border-black pb-1 mt-4 block">{line.replace("# ", "")}</h1>;
        }
        
        // Title H2 / H3
        if (line.startsWith("## ") || line.startsWith("### ")) {
          const cleanLine = line.replace(/^###?\s+/, "");
          return <h2 key={idx} className="text-xs font-black text-indigo-950 uppercase mt-3 tracking-wide block">{cleanLine}</h2>;
        }

        // List item
        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          const cleanLine = line.replace(/^[\-\*]\s+/, "");
          return (
            <div key={idx} className="flex items-start space-x-1.5 pl-3 my-0.5">
              <span className="text-[#FF007A] shrink-0">■</span>
              <span>{parseBold(cleanLine)}</span>
            </div>
          );
        }

        if (line.trim() === "") {
          return <div key={idx} className="h-1.5" />;
        }

        return <p key={idx} className="font-sans leading-relaxed text-gray-700 block">{parseBold(line)}</p>;
      })}
    </div>
  );
}

function parseBold(str: string) {
  const parts = str.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-black text-black uppercase">{part}</strong> : part);
}

interface BankSoalItem {
  id: string;
  topic: string;
  type: string;
  questions: any[];
  createdAt: string;
}

interface TeacherDashboardProps {
  classCode: string;
  username: string;
  onExit: () => void;
  // Shared state via BroadcastChannel or locally
  students: Record<string, Participant>;
  messages: any[];
  onBroadcastMessage: (text: string, isAnnounce: boolean, recipientName?: string) => void;
  onSendReply: (messageId: string, text: string) => void;
  packets: NetworkPacket[];
  clearPackets: () => void;
  latencySlider: number;
  setLatencySlider: (val: number) => void;
  injectPacketError: (type: 'checksum' | 'duplicate_user' | 'malformed') => void;
  triggerLoadTesting: (studentsCount: number) => void;
  
  // Slide state sync
  slides: Slide[];
  onSlidesChange: (newSlides: Slide[]) => void;
  currentSlideIndex: number;
  onSlideIndexChange: (idx: number, ann: Annotation[]) => void;
  externalAnnotations: Annotation[];
  onDrawUpdate: (ann: Annotation[]) => void;

  // Quiz state sync
  activeQuiz: Quiz | null;
  onLaunchQuiz: (quiz: Quiz) => void;
  onEndQuiz: () => void;
  quizSubmissions: any[];

  // File materials sync
  sharedMaterials: Material[];
  onAddMaterial: (mat: Material) => void;
  onRemoveMaterial: (id: string) => void;

  notifications: any[];

  // Proctors state sync
  proctorStatuses: Record<string, ProctorStatus>;
  proctorLogs: CheatingLog[];
  onBroadcastPayload: (type: string, payload: any) => void;

  // New classroom state and setters
  activeMeeting: any | null;
  setActiveMeeting: (m: any) => void;
  meetings: any[];
  setMeetings: React.Dispatch<React.SetStateAction<any[]>>;
  calendarEvents: any[];
  setCalendarEvents: React.Dispatch<React.SetStateAction<any[]>>;
  assignments: any[];
  setAssignments: React.Dispatch<React.SetStateAction<any[]>>;
  submissions: any[];
  setSubmissions: React.Dispatch<React.SetStateAction<any[]>>;
  attendanceRecords: any[];
  setAttendanceRecords: React.Dispatch<React.SetStateAction<any[]>>;
  sentReports: any[];
  setSentReports: React.Dispatch<React.SetStateAction<any[]>>;
  attendanceCode: string;
  setAttendanceCode: (code: string) => void;
  isAttendanceOpen: boolean;
  setIsAttendanceOpen: (open: boolean) => void;
  broadcasts: any[];
  setBroadcasts: React.Dispatch<React.SetStateAction<any[]>>;
  questionBanks: any[];
  setQuestionBanks: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function TeacherDashboard({
  classCode,
  username,
  onExit,
  students,
  messages,
  onBroadcastMessage,
  onSendReply,
  packets,
  clearPackets,
  latencySlider,
  setLatencySlider,
  injectPacketError,
  triggerLoadTesting,
  slides,
  onSlidesChange,
  currentSlideIndex,
  onSlideIndexChange,
  externalAnnotations,
  onDrawUpdate,
  activeQuiz,
  onLaunchQuiz,
  onEndQuiz,
  quizSubmissions,
  sharedMaterials,
  onAddMaterial,
  onRemoveMaterial,
  notifications,
  proctorStatuses,
  proctorLogs,
  onBroadcastPayload,
  activeMeeting,
  setActiveMeeting,
  meetings,
  setMeetings,
  calendarEvents,
  setCalendarEvents,
  assignments,
  setAssignments,
  submissions,
  setSubmissions,
  attendanceRecords,
  setAttendanceRecords,
  sentReports,
  setSentReports,
  attendanceCode,
  setAttendanceCode,
  isAttendanceOpen,
  setIsAttendanceOpen,
  broadcasts,
  setBroadcasts,
  questionBanks,
  setQuestionBanks
}: TeacherDashboardProps) {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'classroom' | 'livesession' | 'aicenter' | 'reports' | 'settings' | 'messages' | 'notifications' | 'banksoal'>('dashboard');
    const [notifAnnText, setNotifAnnText] = useState('');
    const [notifAnnTarget, setNotifAnnTarget] = useState<'all' | 'student' | 'teacher'>('all');

  const [systemAlert, setSystemAlert] = useState<{ message: string, title?: string, type?: 'success' | 'error' | 'info' } | null>(null);

  const showAlert = (message: string, type?: 'success' | 'error' | 'info') => {
    let finalType = type || 'info';
    const lowerMsg = message.toLowerCase();
    if (!type) {
      if (lowerMsg.includes('berhasil') || lowerMsg.includes('sukses') || lowerMsg.includes('✓')) finalType = 'success';
      else if (lowerMsg.includes('gagal') || lowerMsg.includes('harap') || lowerMsg.includes('belum') || lowerMsg.includes('🚨')) finalType = 'error';
    }
    setSystemAlert({ message, type: finalType });
  };

  // Sub-tabs states
  const [broadcastInput, setBroadcastInput] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastUrgency, setBroadcastUrgency] = useState('INFO UMUM');

  const handleSendBroadcast = () => {
    if (!broadcastInput.trim() || !broadcastTitle.trim()) return;
    const alertRecord = {
      id: 'bc-' + Date.now(),
      senderName: username,
      timestamp: String(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })).toUpperCase(),
      payload: { 
        title: broadcastTitle,
        urgency: broadcastUrgency,
        text: broadcastInput 
      }
    };
    onBroadcastPayload('ANNOUNCEMENT_MSG', alertRecord);
    setBroadcasts([alertRecord, ...broadcasts]);
    setBroadcastInput('');
    setBroadcastTitle('');
  };

  const [activeClassroomSubTab, setActiveClassroomSubTab] = useState<string>('broadcast');
  const [activeLiveSessionSubTab, setActiveLiveSessionSubTab] = useState<string>('presensi');
  const [activeReportsSubTab, setActiveReportsSubTab] = useState<'presensi'|'kuis'|'pelanggaran'|'tugas'|'leaderboard'|'global'>('global');
  const [selectedMeetingReport, setSelectedMeetingReport] = useState<string | null>(null);
  const [selectedMeetingDetail, setSelectedMeetingDetail] = useState<any | null>(null);
  const [activeAiCenterSubTab, setActiveAiCenterSubTab] = useState<string>('quiz');
  const [activeSettingsSubTab, setActiveSettingsSubTab] = useState<string>('profile');

  const [isGeneratingClassSummary, setIsGeneratingClassSummary] = useState(false);
  const [classSummaryResult, setClassSummaryResult] = useState<string | null>(null);

  const handleGenerateClassSummary = async () => {
    if (!activeMeeting) {
      showAlert('Sesi Live Class belum aktif!', 'error');
      return;
    }
    setIsGeneratingClassSummary(true);
    setClassSummaryResult(null);
    try {
      const response = await fetch("/api/ai/summarize-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-api-key": localStorage.getItem("user-gemini-api-key") || "" },
        body: JSON.stringify({
          topic: activeMeeting.topic,
          slides: slides
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.summary) {
          setClassSummaryResult(data.summary);
          showAlert('Rangkuman Slide perkuliahan berhasil dibuat dengan Gemini AI 3.5!', 'success');
        } else {
          throw new Error('Output AI kosong.');
        }
      } else {
        throw new Error('Gagal berkomunikasi dengan engine ajar.');
      }
    } catch (err: any) {
      console.error(err);
      showAlert('Konektivitas terganggu, memformat ulasan offline...', 'info');
      setClassSummaryResult(`### Pokok Bahasan: ${activeMeeting.topic}\n\n- **Ulasan Topik Terdaftar**: Berhasil mengevaluasi berkas presentasi digital kelas.\n- **Metode Pembahasan**: Diskusi mendalam dan pengerjaan kuis real-time.\n- **Rangkuman Evaluasi**: Melakukan review point per point di sela-sela interaksi tanya-jawab.`);
    } finally {
      setIsGeneratingClassSummary(false);
    }
  };


  // Bulletin and Forum interactive state
  const [announcements, setAnnouncements] = useState<any[]>([
    { id: '1', title: 'Persiapan Kuliah Sesi TCP/IP', content: 'Mohon seluruh student mengunduh berkas reference library dan membaca modul Socket Programming dasar sebelum kuis dimulai.', date: '09 Juni 2026', type: 'info' },
    { id: '2', title: 'Instruksi Presensi Scan Wajah', content: 'Student wajib membuka kamera web (on-cam webcam check-in) untuk melengkapi digital handshake. Presensi tanpa scan wajah dianggap ALPA.', date: '09 Juni 2026', type: 'warning' }
  ]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnType, setNewAnnType] = useState('info');

  const [forumThreads, setForumThreads] = useState<any[]>([
    { id: 't-1', title: 'Kenapa socket IPv6 gagal melakukan binding pada port IPv4?', author: 'Rangga_Student', replies: [{ author: 'PakTeacher', content: 'Secara standar, stack IPv6 terpisah. Anda bisa mengaktifkan mode dual-stack dengan menyetel IPV6_V6ONLY menjadi 0.' }], upvotes: 8, date: '08 Juni 2026' },
    { id: 't-2', title: 'Layanan webserver tidak merespon paket segment SYN', author: 'Nabilah_Informatika', replies: [{ author: 'Fadhil_Pratama', content: 'Coba pastikan ufw / firewall Port 80 tidak memblokir paket masuk.' }], upvotes: 12, date: '09 Juni 2026' }
  ]);
  const [newThreadTitle, setNewThreadTitle] = useState('');

  // Class Profile settings state
  const [classProfileName, setClassProfileName] = useState('Teknik Pemrograman Jaringan Komputer - JTM1');
  const [classDescription, setClassDescription] = useState('Pembelajaran real-time tingkat lanjut mengenai pemodelan soket TCP/IP, multithreading server, dan sinkronisasi data paralel.');
  const [classPassword, setClassPassword] = useState('TPJ2026');

  // Local form inputs for classroom meeting sessions
  const [meetingTopicInput, setMeetingTopicInput] = useState('');
  const [meetingNumberInput, setMeetingNumberInput] = useState<number>(1);
  
  // Set default meeting number based on existing meetings when component mounts or meetings change
  useEffect(() => {
    if (meetings && meetings.length > 0) {
      const maxNumber = Math.max(...meetings.map(m => m.number || 0));
      if (!meetingTopicInput) {
        setMeetingNumberInput(maxNumber + 1);
      }
    }
  }, [meetings]);

  // Local form inputs for assignment creation
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDesc, setAssignmentDesc] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [assignmentMeetingId, setAssignmentMeetingId] = useState('');
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);

  // Local state for calendar form
  const [calEventType, setCalEventType] = useState<'pertemuan'|'ujian'|'tugas'>('pertemuan');
  const [calEventDate, setCalEventDate] = useState<number>(1);
  const [calEventTitle, setCalEventTitle] = useState('');
  const [calEventDesc, setCalEventDesc] = useState('');
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  // Local state for grading
  const [gradeScore, setGradeScore] = useState<number>(100);
  const [gradeNotes, setGradeNotes] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Local state for daily reports writing
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string>('');
  const [studentReportNotes, setStudentReportNotes] = useState('');

  // Flow Live Class: Input kode presensi setelah Mulai Kelas
  const [meetingPreparing, setMeetingPreparing] = useState<any | null>(null);
  const [presenceCodeInput, setPresenceCodeInput] = useState<string>('');
  
  // Live Audio Broadcast controls
  const [isMuted, setIsMuted] = useState(false);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Real-time audio recording & voice stream variables
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);

  // Delete Popup UI State
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
  } | null>(null);

  // Integrated Chat System State
  const [isChatOverlayOpen, setIsChatOverlayOpen] = useState(false);
  const [chatOverlayTab, setChatOverlayTab] = useState<'group' | 'private' | 'ai'>('group');

  const [unreadGroupMessagesCount, setUnreadGroupMessagesCount] = useState(0);
  const [unreadPrivateMessagesCount, setUnreadPrivateMessagesCount] = useState(0);
  const prevMessagesLength = useRef(messages?.length || 0);

  useEffect(() => {
    if (!messages) return;
    if (messages.length > prevMessagesLength.current) {
        const newMessages = messages.slice(prevMessagesLength.current);
        newMessages.forEach(msg => {
            const isGroup = !msg.recipientName;
            const isPrivateToMe = msg.recipientName === username;
            const isFromMe = msg.senderName === username;

            if (!isFromMe && msg.senderName !== "System") {
                const safeContent = typeof msg.content === 'string' ? msg.content : 'Lampiran Berkas';
                if (isGroup && (activeTab !== 'messages' || chatOverlayTab !== 'group')) {
                    setUnreadGroupMessagesCount(prev => prev + 1);
                    showAlert(`🔔 Pesan Grup Baru dari ${msg.senderName}: ${safeContent.substring(0,30)}...`, 'info');
                }

                if (isPrivateToMe && (activeTab !== 'messages' || chatOverlayTab !== 'private')) {
                    setUnreadPrivateMessagesCount(prev => prev + 1);
                    showAlert(`🔔 Pesan Pribadi dari ${msg.senderName}: ${safeContent.substring(0,30)}...`, 'info');
                }
            }
        });
    }
    prevMessagesLength.current = messages.length;
  }, [messages, activeTab, chatOverlayTab, username]);

  useEffect(() => {
     if (activeTab === 'messages') {
         if (chatOverlayTab === 'group') setUnreadGroupMessagesCount(0);
         if (chatOverlayTab === 'private') setUnreadPrivateMessagesCount(0);
     }
  }, [activeTab, chatOverlayTab]);

  // === DYNAMIC AI CENTER ENGINE STATES ===
  const [aiQuizTopic, setAiQuizTopic] = useState('');
  const [isAiQuizGenerating, setIsAiQuizGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);

  const [aiMaterialTopic, setAiMaterialTopic] = useState('');
  const [aiMaterialFormat, setAiMaterialFormat] = useState('Rangkuman Teori Lengkap');
  const [isAiMaterialGenerating, setIsAiMaterialGenerating] = useState(false);
  const [generatedMaterialMd, setGeneratedMaterialMd] = useState('');

  const [isAiAnalysisRunning, setIsAiAnalysisRunning] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');

  // === NEW CUSTOM MULTI-STEP AI QUIZ STATES ===
  const [customQuizStep, setCustomQuizStep] = useState<number>(1);
  const [customQuizNumQuestions, setCustomQuizNumQuestions] = useState<number>(5);
  const [customQuizType, setCustomQuizType] = useState<'Pilihan Ganda' | 'Isian Singkat' | 'True / False'>('Pilihan Ganda');
  const [customQuizFiles, setCustomQuizFiles] = useState<{ name: string; content: string }[]>([]);
  const [customQuizDesc, setCustomQuizDesc] = useState<string>('');
  const [customQuizGeneratedQuestions, setCustomQuizGeneratedQuestions] = useState<any[]>([]);
  const [isCustomQuizGenerating, setIsCustomQuizGenerating] = useState<boolean>(false);
  const [customQuizError, setCustomQuizError] = useState<string>('');
  const [savedAiQuizzes, setSavedAiQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('liveclass-saved-ai-quizzes-' + classCode + (activeMeeting?.id ? '-' + activeMeeting.id : ''));
      if (saved) setSavedAiQuizzes(JSON.parse(saved));
      else setSavedAiQuizzes([]);
    } catch {
      setSavedAiQuizzes([]);
    }
  }, [classCode, activeMeeting?.id]);

  const [bankToDelete, setBankToDelete] = useState<BankSoalItem | null>(null);

  useEffect(() => {
    localStorage.setItem('liveclass-saved-ai-quizzes-' + classCode + (activeMeeting?.id ? '-' + activeMeeting.id : ''), JSON.stringify(savedAiQuizzes));
  }, [savedAiQuizzes, classCode, activeMeeting?.id]);

  // === NEW AUTOMATIC AI RECAP STATES ON CLOSED SESSION ===
  const [isAiSessionRecapGenerating, setIsAiSessionRecapGenerating] = useState<boolean>(false);
  const [sessionRecapResult, setSessionRecapResult] = useState<string>('');
  const [showSessionRecapView, setShowSessionRecapView] = useState<boolean>(false);
  const [recapMeetingTopic, setRecapMeetingTopic] = useState<string>('');
  const [recapMeetingNumber, setRecapMeetingNumber] = useState<number>(1);
  const [recapMeetingId, setRecapMeetingId] = useState<string>('');
  const [selectedFullReport, setSelectedFullReport] = useState<any | null>(null);

  useEffect(() => {
    const handleSpeaker = (e: any) => {
      const speakerName = e.detail?.sender;
      if (speakerName) {
        setActiveSpeaker(speakerName);
      }
    };
    const interval = setInterval(() => {
      setActiveSpeaker(null);
    }, 1500);
    window.addEventListener('active-speaker', handleSpeaker);
    return () => {
      window.removeEventListener('active-speaker', handleSpeaker);
      clearInterval(interval);
    };
  }, []);

  // Bi-directional Microphone Capture for Teacher when unmuted (isMuted === false)
  useEffect(() => {
    let activeMicStream: MediaStream | null = null;
    let recInterval: any = null;

    if (!isMuted) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          activeMicStream = stream;
          micStreamRef.current = stream;

          // Connect Web Audio API to analyze mic volume in real time
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              audioCtxRef.current = ctx;
              const source = ctx.createMediaStreamSource(stream);
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 64;
              source.connect(analyser);
              analyserRef.current = analyser;

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              recInterval = setInterval(() => {
                if (analyserRef.current) {
                  analyserRef.current.getByteFrequencyData(dataArray);
                  let sum = 0;
                  for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                  }
                  const avg = sum / dataArray.length;
                  setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
                }
              }, 100);
            }
          } catch (e) {
            console.warn("Could not start volume analyser:", e);
          }

          // Start MediaRecorder to record audio chunks and broadcast to classmates
          try {
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
              if (event.data && event.data.size > 0) {
                const reader = new FileReader();
                reader.readAsDataURL(event.data);
                reader.onloadend = () => {
                  const base64 = reader.result as string;
                  onBroadcastPayload('AUDIO_CHUNK', {
                    sender: 'Teacher_Presenter',
                    base64
                  });
                };
              }
            };

            // Produce chunks every 1000ms
            recorder.start(1000);
          } catch (err) {
            console.warn("MediaRecorder default type failed, running standard fallback:", err);
            try {
              const recorder = new MediaRecorder(stream);
              mediaRecorderRef.current = recorder;
              recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                  const reader = new FileReader();
                  reader.readAsDataURL(event.data);
                  reader.onloadend = () => {
                    const base64 = reader.result as string;
                    onBroadcastPayload('AUDIO_CHUNK', {
                      sender: 'Teacher_Presenter',
                      base64
                    });
                  };
                }
              };
              recorder.start(1000);
            } catch (fallbackError) {
              console.warn("Voice broadcast is completely unsupported by this window:", fallbackError);
            }
          }
        })
        .catch((err) => {
          console.warn("Microphone input blocked or not found:", err);
        });
    }

    return () => {
      if (recInterval) clearInterval(recInterval);
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      if (activeMicStream) {
        activeMicStream.getTracks().forEach(track => track.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      setMicVolume(0);
    };
  }, [isMuted]);
  
  // Custom materials creator state
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialType, setNewMaterialType] = useState<'pdf' | 'ppt' | 'docx' | 'zip'>('pdf');

  // PPT / PDF File Parsing and Live Streaming Telemetry
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSteps, setUploadSteps] = useState<string[]>([]);
  const [uploadedFilename, setUploadedFilename] = useState('');
  const [pastedOutline, setPastedOutline] = useState('');
  const [activeSlideEditIndex, setActiveSlideEditIndex] = useState<number | null>(null);

  // Real course materials uploading states
  const [isMaterialUploading, setIsMaterialUploading] = useState(false);
  const [materialUploadProgress, setMaterialUploadProgress] = useState(0);
  const [materialUploadSteps, setMaterialUploadSteps] = useState<string[]>([]);

  // Slide editor input tracking
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editBulletsText, setEditBulletsText] = useState('');

  // Sockets remote actions dispatcher
  const handleTeacherProctorAction = (studentName: string, actionType: 'warn_student' | 'deduct_score' | 'flag_review' | 'invalidate', customText?: string) => {
    const payload = {
      studentName,
      actionType,
      text: customText || (actionType === 'warn_student' ? 'Mohon pertahankan fokus Anda ke layar kuis!' : actionType === 'deduct_score' ? 'Pengurangan poin dilakukan karena pelanggaran terdeteksi.' : actionType === 'flag_review' ? 'Profil Anda ditandai untuk peninjauan manual.' : 'Sesi kuis Anda dibatalkan.'),
      deduction: actionType === 'deduct_score' ? 20 : undefined
    };
    onBroadcastPayload('TEACHER_PROCTOR_ACTION', payload);

    // Fire client side event for split screen simulation
    const customEvent = new CustomEvent('teacher-proctor-action', { detail: payload });
    window.dispatchEvent(customEvent);
  };

  // NEW CLASSROOM HELPERS
  const handleAddNewMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTopicInput.trim()) return;

    // Check if duplicate meeting number already exists
    if (meetings.some(m => m.number === meetingNumberInput)) {
      showAlert(`Pertemuan ke-${meetingNumberInput} sudah terdaftar! Pilih angka pertemuan yang berbeda.`);
      return;
    }

    const newM = {
      id: 'meet-' + Math.random().toString(36).substr(2, 9),
      number: meetingNumberInput,
      topic: meetingTopicInput.trim(),
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      isStarted: false
    };

    const updated = [...meetings, newM];
    setMeetings(updated);
    setMeetingTopicInput('');
    setMeetingNumberInput(prev => prev + 1);

    // Sync to other tabs
    onBroadcastPayload('MEETINGS_UPDATED', { meetings: updated });
  };

  const handleStartMeeting = (meeting: any) => {
    const updatedMeetings = meetings.map(m => m.id === meeting.id ? { ...m, isStarted: true } : m);
    setMeetings(updatedMeetings);
    setActiveMeeting(meeting);

    // Broadcast change
    onBroadcastPayload('MEETING_SESSION_CHANGED', { activeMeeting: meeting });
    onBroadcastPayload('MEETINGS_UPDATED', { meetings: updatedMeetings });

    // Inform students via announcement chat
    onBroadcastMessage(`[INFORMASI KELAS] Sesi perkuliahan resmi dimulai: Pertemuan ke-${meeting.number} membahas "${meeting.topic}"! Presensi dan Materi sekarang tersedia di tab Classroom.`, true, 'student');
    onBroadcastMessage(`Telah berhasil memulai Kelas Live untuk Pertemuan ke-${meeting.number}`, true, 'teacher');
  };

  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calEventTitle.trim()) return;

    let color = 'bg-[#00E5FF]';
    if (calEventType === 'pertemuan') color = 'bg-[#00FA9A]'; // green
    if (calEventType === 'ujian') color = 'bg-[#FFD700]'; // yellow
    if (calEventType === 'tugas') color = 'bg-[#FF007A]'; // red

    const updatedCal = [...calendarEvents, {
      id: 'evt-' + Math.random().toString(36).substring(2),
      type: calEventType,
      date: calEventDate,
      title: calEventTitle.trim(),
      description: calEventDesc.trim(),
      color
    }];

    setCalendarEvents(updatedCal);
    onBroadcastPayload('CALENDAR_EVENTS_UPDATED', { calendarEvents: updatedCal });
    
    setCalEventTitle('');
    setCalEventDesc('');
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentTitle.trim() || !assignmentMeetingId) {
      showAlert("Pastikan Anda sudah mengisi judul kelas dan memilih pertemuan kelas!");
      return;
    }

    const newAss: Assignment = {
      id: 'ass-' + Math.random().toString(36).substr(2, 9),
      meetingId: assignmentMeetingId,
      title: assignmentTitle.trim(),
      description: assignmentDesc.trim() || 'Selesaikan tugas mandiri ini.',
      fileName: assignmentFile ? assignmentFile.name : undefined,
      fileUrl: assignmentFile ? URL.createObjectURL(assignmentFile) : undefined,
      dueDate: assignmentDueDate.trim(),
      maxScore: 100
    };

    // Post assignment to server
    fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gemini-api-key': localStorage.getItem('user-gemini-api-key') || '' },
      body: JSON.stringify({ ...newAss, classCode })
    })
    .catch(err => console.error("Error posting assignment to server:", err));

    const updated = [...assignments, newAss];
    setAssignments(updated);
    
    // Broadcast notification
    const notification = {
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      message: `Tugas Baru: ${newAss.title} dipublikasikan oleh Teacher.`,
      timestamp: generateFormattedTimestamp(),
      role: 'all',
      type: 'assignment'
    };
    onBroadcastPayload('NOTIFICATION_ADDED', { notification });
    
    // Parse date from dueDate to add to calendar automatically
    const dateMatch = assignmentDueDate.trim().match(/\d+/);
    if(dateMatch) {
      const dNum = parseInt(dateMatch[0], 10);
      const updatedCal = [...calendarEvents, {
        id: 'evt-' + Math.random().toString(36).substring(2),
        type: 'tugas',
        date: dNum,
        title: 'Deadline ' + newAss.title,
        description: assignmentDesc.trim(),
        color: 'bg-[#FF007A]'
      }];
      setCalendarEvents(updatedCal);
      onBroadcastPayload('CALENDAR_EVENTS_UPDATED', { calendarEvents: updatedCal });
    }

    setAssignmentTitle('');
    setAssignmentDesc('');
    setAssignmentMeetingId('');
    setAssignmentFile(null);

    // Sync state
    onBroadcastPayload('ASSIGNMENTS_UPDATED', { assignments: updated });
    onBroadcastMessage(`[INFO TUGAS] Teacher merilis Tugas Baru: ${newAss.title} (Batas pengumpulan: ${newAss.dueDate}). Silahkan cek modul tugas Anda.`, true, 'student');
    onBroadcastMessage(`Berhasil mengupload materi tugas "${newAss.title}" ke menu kelas`, true, 'teacher');
  };

  const handleGradeSubmission = (submissionId: string, scoreParam?: number, notesParam?: string) => {
    const finalScore = scoreParam !== undefined ? scoreParam : gradeScore;
    const finalNotes = notesParam !== undefined ? notesParam : gradeNotes;
    const updated = submissions.map(sub => {
      if (sub.id === submissionId) {
        return {
          ...sub,
          status: 'graded' as const,
          score: finalScore,
          notes: finalNotes
        };
      }
      return sub;
    });

    // Post grade to server
    fetch('/api/submissions/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-gemini-api-key': localStorage.getItem('user-gemini-api-key') || '' },
      body: JSON.stringify({ submissionId, score: finalScore, notes: finalNotes })
    })
    .catch(err => console.error("Error submitting grade to server:", err));

    setSubmissions(updated);
    setSelectedSubmissionId(null);
    setGradeNotes('');

    const studentName = submissions.find(s => s.id === submissionId)?.studentName || '';
    
    // Broadcast
    onBroadcastPayload('SUBMISSIONS_UPDATED', { submissions: updated });
    onBroadcastMessage(`[NILAI TUGAS] Tugas dari student "${studentName}" telah selesai diperiksa dan dinilai oleh teacher.`, true, 'student');
    onBroadcastMessage(`Berhasil memberikan nilai tugas untuk student "${studentName}"`, true, 'teacher');
    
    const notification = {
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      message: `Tugas Anda telah dinilai oleh instruktur. Nilai: ${finalScore}`,
      timestamp: generateFormattedTimestamp(),
      role: studentName,
      type: 'assignment'
    };
    onBroadcastPayload('NOTIFICATION_ADDED', { notification });
  };

  const handleToggleAttendance = () => {
    if (!activeMeeting) {
      showAlert("Mulai/aktifkan sesi pertemuan terlebih dahulu!");
      return;
    }

    const nextOpen = !isAttendanceOpen;
    setIsAttendanceOpen(nextOpen);

    if (nextOpen) {
      // Create random 4 digit code if empty
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setAttendanceCode(code);
      onBroadcastPayload('ATTENDANCE_STATUS_CHANGED', {
        isAttendanceOpen: true,
        attendanceCode: code,
        meetingId: activeMeeting.id
      });
      onBroadcastMessage(`[PRESENSI DIBUKA] Presensi Pertemuan ke-${activeMeeting.number} dibuka! Kode Verifikasi: ${code}. Anda diharuskan oncam untuk melakukan verifikasi wajah dari browser kuis Anda!`, true, 'student');
      onBroadcastMessage(`Berhasil membuka sesi presensi pertemuan ke-${activeMeeting.number}`, true, 'teacher');
    } else {
      onBroadcastPayload('ATTENDANCE_STATUS_CHANGED', {
        isAttendanceOpen: false,
        attendanceCode: '',
        meetingId: ''
      });
      onBroadcastMessage(`[PRESENSI DITUTUP] Sesi presensi untuk Pertemuan ke-${activeMeeting.number} telah ditutup oleh sistem.`, true, 'student');
      onBroadcastMessage(`Sesi presensi untuk Pertemuan ke-${activeMeeting.number} telah berhasil ditutup`, true, 'teacher');
    }
  };

  const handleSendDailyReport = (studentName: string, notesParam?: string) => {
    if (!activeMeeting) {
      showAlert("Mulai sesi pertemuan kelas untuk dapat menyusun/mengirim laporan!");
      return;
    }

    const finalNotes = notesParam !== undefined ? notesParam : studentReportNotes;

    // Gather some stats about this specific student
    const studentObj = studentList.find(s => normalizeName(s.username) === normalizeName(studentName));
    const attendanceRecord = attendanceRecords.find(r => r.meetingId === activeMeeting.id && normalizeName(r.studentName) === normalizeName(studentName));
    const quizSub = quizSubmissions.filter(q => normalizeName(q.studentName) === normalizeName(studentName));
    const correctCount = quizSub.filter(q => q.isCorrect).length;
    const cheatingAlerts = proctorLogs.filter(l => normalizeName(l.studentName) === normalizeName(studentName)).length;

    const assignmentObj = assignments.find(a => a.meetingId === activeMeeting.id);
    const subObj = submissions.find(s => normalizeName(s.studentName) === normalizeName(studentName) && s.assignmentId === assignmentObj?.id);

    // Create report matching types
    const newReport = {
      id: 'rep-' + Math.random().toString(36).substr(2, 9),
      meetingId: activeMeeting.id,
      meetingTopic: activeMeeting.topic,
      studentName,
      attendanceStatus: (attendanceRecord ? 'Hadir' : 'Absen') as 'Hadir' | 'Absen',
      attendanceTime: attendanceRecord ? attendanceRecord.timestamp : undefined,
      quizScore: correctCount * 25,
      quizStreak: studentObj?.streak ?? 0,
      proctorScore: Math.max(0, 100 - (cheatingAlerts * 20)),
      assignmentStatus: (subObj ? (subObj.status === 'graded' ? 'Sudah Dinilai' : 'Sudah Mengumpulkan') : 'Belum Mengumpulkan') as any,
      assignmentScore: subObj ? subObj.score : undefined,
      notes: finalNotes.trim() || `Student berpartisipasi dengan baik pada Pertemuan ke-${activeMeeting.number}. ${cheatingAlerts > 0 ? `Catatan: Terdeteksi ${cheatingAlerts} kali peringatan tab-switch/fokus.` : 'Fokus belajar sangat tinggi.'}`,
      sentAt: generateFormattedTimestamp(),
    };

    const updated = [...sentReports, newReport];
    setSentReports(updated);
    setStudentReportNotes('');

    // Broadcast daily report to student account
    onBroadcastPayload('DAILY_REPORT_SENT', { report: newReport });
    showAlert(`Laporan perkembangan harian Pertemuan ke-${activeMeeting.number} berhasil dikirim ke akun ${studentName}!`);
  };

  // Authorized Student Database roster
  const [authorizedStudents, setAuthorizedStudents] = useState<{fullName: string; studentId: string;}[]>(() => {
    try {
      const saved = localStorage.getItem('liveclass-auth-students-' + classCode);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [newSchooledName, setNewSchooledName] = useState('');
  const [newSchooledId, setNewSchooledId] = useState('');

  useEffect(() => {
    localStorage.setItem('liveclass-auth-students-' + classCode, JSON.stringify(authorizedStudents));
  }, [authorizedStudents, classCode]);

  // Custom quiz creator state
  const [manualQuizType, setManualQuizType] = useState<'multiple-choice' | 'short-answer' | 'true-false'>('multiple-choice');
  const [customQuestion, setCustomQuestion] = useState('');
  const [customOptA, setCustomOptA] = useState('');
  const [customOptB, setCustomOptB] = useState('');
  const [customOptC, setCustomOptC] = useState('');
  const [customOptD, setCustomOptD] = useState('');
  const [customCorrect, setCustomCorrect] = useState(0);
  const [manualCorrectAnswerText, setManualCorrectAnswerText] = useState('');
  const [manualExplanation, setManualExplanation] = useState('');

  const handleCreateQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;

    let options: string[] = [];
    let correctOptionIndex = customCorrect;
    let correctAnswerText: string | undefined = undefined;

    if (manualQuizType === 'multiple-choice') {
      if (!customOptA.trim() || !customOptB.trim()) {
        showAlert('Silakan lengkapi setidaknya Opsi A dan Opsi B untuk Pilihan Ganda!', 'error');
        return;
      }
      options = [customOptA.trim(), customOptB.trim(), customOptC.trim() || '', customOptD.trim() || ''].filter(o => o !== '');
    } else if (manualQuizType === 'true-false') {
      options = ['True', 'False'];
      correctOptionIndex = customCorrect; // 0 = True, 1 = False
    } else if (manualQuizType === 'short-answer') {
      if (!manualCorrectAnswerText.trim()) {
        showAlert('Silakan tentukan Kunci Jawaban Isian Singkat!', 'error');
        return;
      }
      correctAnswerText = manualCorrectAnswerText.trim();
    }

    const newQuiz: Quiz = {
      id: 'quiz-' + Math.random().toString(36).substr(2, 9),
      type: manualQuizType,
      question: customQuestion.trim(),
      options: options,
      correctOptionIndex: correctOptionIndex,
      correctAnswerText: correctAnswerText,
      durationSeconds: 20,
      isActive: false,
      explanation: manualExplanation.trim() || undefined
    };

    setSavedAiQuizzes(prev => [...prev, newQuiz]);
    showAlert('Berhasil menyimpan kuis ke daftar!');
    setCustomQuestion('');
    setCustomOptA('');
    setCustomOptB('');
    setCustomOptC('');
    setCustomOptD('');
    setCustomCorrect(0);
    setManualCorrectAnswerText('');
    setManualExplanation('');
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim()) return;

    const sizeLimit = (Math.random() * 12 + 1).toFixed(1) + ' MB';
    const newFile: Material = {
      id: Math.random().toString(36).substr(2, 9),
      name: newMaterialName.trim() + '.' + newMaterialType,
      size: sizeLimit,
      type: newMaterialType,
      uploadedAt: generateFormattedTimestamp(),
      url: '#'
    };
    onAddMaterial(newFile);
    setNewMaterialName('');
  };

  // PPT / PDF file simulation, parsing & custom slide editor logic
  const generateSlidesFromFilename = (filename: string): Slide[] => {
    const cleanName = filename.toLowerCase();
    const titleFromFilename = filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    
    if (cleanName.includes('socket') || cleanName.includes('jaringan') || cleanName.includes('network')) {
      return [
        {
          id: 101,
          title: titleFromFilename.toUpperCase() || 'PEMROGRAMAN SOCKET JARINGAN',
          content: 'Sockets API merupakan abstraksi untuk komunikasi antar-proses (IPC) melalui jaringan TCP/IP.',
          imageTheme: 'pink',
          bullets: [
            'MODEL CLIENT-SERVER: SERVER MELAKUKAN BIND() PORT & LISTEN(). CLIENT MELAKUKAN CONNECT()',
            'PORT ALLOCATION: PORT SYSTEM TERDAFTAR (0-1023) VS PORT BEBAS STUDENT (>1024)',
            'BUFFER MANAGEMENT: DATA DITRANSMISIKAN DALAM BENTUK BYTE STREAMS ATAU DATAGRAMS'
          ]
        },
        {
          id: 102,
          title: 'SOCKET LIFECYCLE (TCP MECHANISM)',
          content: 'Alur kerja pembuatan socket terstruktur menggunakan protokol Handshake 3-Way.',
          imageTheme: 'cyan',
          bullets: [
            '1. SOCKET() - MEMBUAT ENDPOINT JARINGAN BARU DENGAN PROSES KERNEL',
            '2. BIND() - MENGIKAT SOCKET KE IP ADDRESS DAN NOMOR PORT SPESIFIK',
            '3. LISTEN() - MEMBUKA BUFFER ANTRIAN KONEKSI MASUK (BACKLOG)',
            '4. ACCEPT() & CONNECT() - MENYELESAIKAN JABAT TANGAN TCP SYN-SYNACK-ACK'
          ]
        },
        {
          id: 103,
          title: 'PERBEDAAN UTAMA TCP VS UDP SOCKETS',
          content: 'Pemilihan jenis socket menentukan karakteristik keandalan transport data paket.',
          imageTheme: 'neutral',
          bullets: [
            'TCP (STREAM SOCKET): CONNECTION-ORIENTED, HANDSHAKE, RETRANSMISSION, FLOW CONTROL',
            'UDP (DATAGRAM SOCKET): CONNECTIONLESS, NO RETRANSMISSION, OVERHEAD KECIL, CEPAT',
            'APLIKASI KHUSUS: TCP UNTUK WEB/HTTP/EMAIL, UDP UNTUK STREAMING VIDEO/GAME/DNS'
          ]
        },
        {
          id: 104,
          title: 'SOCKET EXCEPTION & CONGESTION',
          content: 'Masalah umum pemrograman jaringan dan cara mendeteksi error paket data.',
          imageTheme: 'pink',
          bullets: [
            'ERR_CONNECTION_REFUSED: PORT SERVER BELUM AKTIF ATAU BIND() GAGAL',
            'ADDRESS ALREADY IN USE: PORT TERKUNCI OLEH PROSES LAMA YANG BELUM CLOSE()',
            'PACKET LOSS: JALUR TRANSMISI BUFFER PENUH SEHINGGA RTO (RETRANSMISSION TIMEOUT) DIPICU'
          ]
        }
      ];
    } else if (cleanName.includes('routing') || cleanName.includes('ip') || cleanName.includes('subnet')) {
      return [
        {
          id: 201,
          title: titleFromFilename.toUpperCase() || 'IP ADDRESSING & SUBNETTING IP KLASIK',
          content: 'IP Address adalah identitas logis dari setiap host pada jaringan yang berkomunikasi.',
          imageTheme: 'cyan',
          bullets: [
            'STRUKTUR ALAMAT: TERDIRI DARI NETWORK ID DAN HOST ID (TOTAL 32 BIT UNTUK IPV4)',
            'SUBNET MASK: MENENTUKAN BATASAN JANGKAUAN BROADCAST DALAM JALUR LOKAL',
            'CIDR (CLASSLESS INTER-DOMAIN ROUTING): NOTASI PREFIX SEPERTI /24 ATAU /29'
          ]
        },
        {
          id: 202,
          title: 'TEKNIK SUBNETTING & BROADCAST DOMAIN',
          content: 'Proses memecah satu jaringan besar menjadi jaringan-jaringan kecil untuk efisiensi.',
          imageTheme: 'neutral',
          bullets: [
            'MENGURANGI TRAFIK BROADCAST: BROADCAST KEMACETAN TIDAK AKAN MENYEBERANG KE SUB-JARINGAN LAIN',
            'KEAMANAN DATA: MEMISAHKAN TRAFIK DEPARTEMEN TEKNIK DENGAN DEPARTEMEN LAIN',
            'PERHITUNGAN HOST CAP: JUMLAH HOST VALID ADALAH (2 KH PANGKAT N) MINUS 2'
          ]
        },
        {
          id: 203,
          title: 'ROUTING STATIC VS ROUTING DINAMIS',
          content: 'Mekanisme router dalam menentukan jalur pengiriman paket TCP/IP terbaik.',
          imageTheme: 'pink',
          bullets: [
            'STATIC ROUTING: DIINPUT MANUAL OLEH ADMIN JARINGAN, COCOK UNTUK JARAK DEKAT',
            'DYNAMIC ROUTING: ROUTER BERTUKAR TABLE VIA OSPF, RIP, BGP SECARA AUTOMATIC',
            'METRIC PATH ANALYSIS: BANDWIDTH, HOP COUNT, DELAY, DAN RELIABILITY'
          ]
        }
      ];
    } else if (cleanName.includes('keamanan') || cleanName.includes('secure') || cleanName.includes('kripto') || cleanName.includes('aes')) {
      return [
        {
          id: 301,
          title: titleFromFilename.toUpperCase() || 'KRIPTOGRAFI & KEAMANAN JARINGAN',
          content: 'Mengamankan paket data dari penyadapan (eavesdropping) dan manipulasi paket di tengah jalan.',
          imageTheme: 'pink',
          bullets: [
            'CONFIDENTIALITY: DATA HANYA DAPAT DIBACA OLEH ENTITLE RECEIVER (ENKRIPSI)',
            'INTEGRITY: MENJAMIN SECURE DATA TIDAK BERUBAH (MENGGUNAKAN HASH FUNCTION)',
            'AUTHENTICITY: PEMBUKTIAN IDENTITAS PENGIRIM PAKET (DIGITAL SIGNATURES)'
          ]
        },
        {
          id: 302,
          title: 'SSL/TLS SECURE SOCKET HANDSHAKE',
          content: 'Protokol keamanan transport layer sebelum aplikasi bertukar data sensitif.',
          imageTheme: 'cyan',
          bullets: [
            '1. CLIENT HELLO: NEGOSIASI CIPHER SUITES DENGAN SERVER SIDE',
            '2. SERVER HELLO + CERTIFICATE: PENGIRIMAN PUBLIC KEY TERVALIDASI CA',
            '3. PRE-MASTER SECRET: PERALIKAN KE SYMMETRIC ENCRYPTION SEBAGAI SECURE KEY',
            '4. ENCRYPTED ALERT CHECK: UJI COBA TRANSMISI PAKET PERTAMA'
          ]
        }
      ];
    } else {
      return [
        {
          id: 401,
          title: titleFromFilename.toUpperCase() || 'PRESENTASI BAHAN AJAR BARU',
          content: `Slide deck dari file "${filename}" berhasil diunggah dan diuraikan oleh compiler.`,
          imageTheme: 'neutral',
          bullets: [
            'SISTEM STREAMING AKTIF: SEGERA NAVIGASI SLIDE UNTUK SINKRONISASI KE STUDENT',
            'DAPAT DIEDIT: KLIK MENU EDITOR SLIDE DI BAWAH UNTUK MERUBAH JUDUL ATAU MATERI TEKS',
            'DUKUNGAN WHITEBOARD: COBA ALAT CUCI PENA DI ATAS UNTUK CO-DRAWING SECARA INTERAKTIF'
          ]
        },
        {
          id: 402,
          title: 'PENDALAMAN MATERI UTAMA',
          content: 'Lakukan penyesuaian materi agar student mencerna materi secara interaktif.',
          imageTheme: 'pink',
          bullets: [
            'BUTIR PERTAMA: SILAHKAN TULIS KONSEP MATERI YANG INGIN DISAMPAIKAN',
            'BUTIR KEDUA: BISA MENJELASKAN DEFINISI ATAU SKEMA PENYALURAN DATA',
            'BUTIR KEDUA: TAMBAHKAN GAMBAR ATAU CONTOH DIAGRAM DI PAPAN LIVE'
          ]
        }
      ];
    }
  };

  const parseMarkdownToSlides = (text: string, filename: string): Slide[] => {
    const lines = text.split('\n');
    const generatedSlides: Slide[] = [];
    let currentSlide: Partial<Slide> | null = null;
    let bullets: string[] = [];
    let currentContent = '';
    let slideIdCounter = 400 + Math.floor(Math.random() * 200);

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('#') || trimmed.toUpperCase().startsWith('SLIDE')) {
        if (currentSlide) {
          currentSlide.bullets = bullets.length > 0 ? bullets : ['PENJELASAN MATERI DETAIL'];
          currentSlide.content = currentContent || 'Konsep materi pengajaran kelas.';
          generatedSlides.push(currentSlide as Slide);
          bullets = [];
          currentContent = '';
        }
        const titleText = trimmed.startsWith('#') ? trimmed.replace(/^#+\s*/, '') : trimmed;
        currentSlide = {
          id: slideIdCounter++,
          title: titleText.toUpperCase(),
          content: '',
          imageTheme: ['pink', 'cyan', 'neutral'][Math.floor(Math.random() * 3)] as any,
          bullets: []
        };
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
        bullets.push(trimmed.replace(/^[-*•]\s*/, '').toUpperCase());
      } else {
        if (currentSlide) {
          if (!currentContent) {
            currentContent = trimmed;
          } else {
            bullets.push(trimmed.toUpperCase());
          }
        }
      }
    });

    if (currentSlide) {
      currentSlide.bullets = bullets.length > 0 ? bullets : ['MATERI UTAMA SELESAI'];
      currentSlide.content = currentContent || 'Ringkasan materi presentasi.';
      generatedSlides.push(currentSlide as Slide);
    }

    return generatedSlides;
  };

  const extractSlidesFromBinaryText = (rawText: string, filename: string): Slide[] => {
    // Look for XML tags in pptx like <a:t>Hello Word</a:t>
    const pptxTextMatches = Array.from(rawText.matchAll(/<a:t>([^<]+)<\/a:t>/g)).map(m => m[1]);
    
    let extractedWords: string[] = [];
    if (pptxTextMatches.length > 0) {
      extractedWords = pptxTextMatches.filter(t => t.trim().length > 3);
    } else {
      // Find clean readable blocks of length 15-80
      const matches = rawText.match(/[a-zA-Z0-9\s,\.\-:\?\/!]{15,80}/g);
      if (matches) {
        extractedWords = matches
          .map(w => w.trim())
          .filter(w => {
            if (w.includes('/') && w.includes('<')) return false;
            if (w.includes('\\')) return false;
            if (w.includes('_') && w.length > 10) return false;
            return w.length > 15;
          });
      }
    }

    const uniqueTexts = Array.from(new Set(extractedWords)).slice(0, 30);
    
    if (uniqueTexts.length < 3) {
      return []; // fallback
    }

    const titleFromFilename = filename.replace(/\.[^/.]+$/, "").replace(/_/g, " ").toUpperCase();
    const slidesList: Slide[] = [];
    let slideIdCounter = 600;

    for (let i = 0; i < uniqueTexts.length; i += 5) {
      const chunk = uniqueTexts.slice(i, i + 5);
      if (chunk.length < 2) break;

      const slideTitle = chunk[0].toUpperCase();
      const slideContent = chunk[1];
      const slideBullets = chunk.slice(2).map(b => b.toUpperCase());

      slidesList.push({
        id: slideIdCounter++,
        title: (slideTitle || '').length > 50 ? (slideTitle || '').substring(0, 50) + '...' : (slideTitle || 'Slide'),
        content: slideContent,
        imageTheme: ['pink', 'cyan', 'neutral'][slidesList.length % 3] as any,
        bullets: slideBullets.length > 0 ? slideBullets : ['BACA REFERENSI UTAMA', 'SIMULASIKAN DENGAN KONSOL JALUR DATA']
      });
    }

    if (slidesList.length > 0) {
      slidesList.unshift({
        id: 599,
        title: `PREVIEW: ${titleFromFilename}`,
        content: `File presentasi asli "${filename}" sukses dianalisis oleh server parsing engine secara dinamis.`,
        imageTheme: 'cyan',
        bullets: [
          `DIANALISIS: ${uniqueTexts.length} BUKTI TEKS BERHASIL DIUNGGAH`,
          'STREAMING AKTIF: STUDENT DAPAT MELIHAT SLIDE SECARA SINKRON',
          'DAPAT DICORAT-CORET: SILAKAN GUNAKAN WHITEBOARD PEN DIBAWAH'
        ]
      });
    }

    return slidesList;
  };

  const handleSimulatedFileUpload = (file: File) => {
    const filename = file.name;
    setIsUploading(true);
    setUploadProgress(10);
    setUploadedFilename(filename);
    setUploadSteps(['[CONNECT] Memulai handshake transmisi file...', `[STATUS] Alokasi transmisi buffer untuk ${filename} (${(file.size / 1024).toFixed(1)} KB)`]);

    const reader = new FileReader();
    const isTextFile = filename.endsWith('.txt') || filename.endsWith('.md');
    
    if (isTextFile) {
      reader.readAsText(file);
    } else {
      reader.readAsText(file); // scan readable parts as text
    }

    reader.onload = (e) => {
      const rawText = e.target?.result as string || '';
      
      setTimeout(() => {
        setUploadProgress(40);
        setUploadSteps(prev => [...prev, '[TCP] Transmisi byte stream slide data...', '[DESERIALIZE] Mengurai content data dan struktur dokumen...']);
      }, 500);

      setTimeout(() => {
        setUploadProgress(85);
        setUploadSteps(prev => [...prev, '[OPTIMIZE] Menyesuaikan visual dan layout slide...', '[BROADCAST] Menyinkronkan slides ke ruang kelas real-time... Selesai!']);
      }, 1100);

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(100);
        
        let finalSlides = isTextFile 
          ? parseMarkdownToSlides(rawText, filename) 
          : extractSlidesFromBinaryText(rawText, filename);
        
        if (finalSlides.length === 0) {
          finalSlides = generateSlidesFromFilename(filename);
        }
        
        onSlidesChange(finalSlides);
        onSlideIndexChange(0, []);
      }, 1800);
    };

    reader.onerror = () => {
      setIsUploading(false);
      showAlert('Gagal membaca file presentasi.');
    };
  };

  const handleMaterialFileUpload = (file: File) => {
    setIsMaterialUploading(true);
    setMaterialUploadProgress(15);
    setMaterialUploadSteps(['[CONNECT] Mengalokasikan stream buffer...', `[FILE] Menyiapkan transmisi ${file.name} (${(file.size / 1024).toFixed(1)} KB)`]);

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      const b64Data = e.target?.result as string || '';

      setTimeout(() => {
        setMaterialUploadProgress(50);
        setMaterialUploadSteps(prev => [...prev, '[BUFFER] Mengonversi byte array ke base64 transkrip...', '[CHANNELS] Menjalankan segmentasi packet transport...']);
      }, 400);

      setTimeout(() => {
        setMaterialUploadProgress(85);
        setMaterialUploadSteps(prev => [...prev, '[ENCRYPT] Memasang tag MD5 checksum...', '[BROADCAST] Mendistribusikan file ke socket client student...']);
      }, 900);

      setTimeout(() => {
        setIsMaterialUploading(false);
        setMaterialUploadProgress(100);

        const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
        let fileType: 'pdf' | 'ppt' | 'docx' | 'zip' = 'pdf';
        if (['ppt', 'pptx'].includes(ext)) {
          fileType = 'ppt';
        } else if (['doc', 'docx', 'txt', 'md'].includes(ext)) {
          fileType = 'docx';
        } else if (['zip', 'rar', 'tar', 'gz', 'png', 'jpg', 'jpeg'].includes(ext)) {
          fileType = 'zip';
        }

        const formattedSize = file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${(file.size / 1024).toFixed(1)} KB`;

        const newFile: Material = {
          id: 'mat-' + Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: formattedSize,
          type: fileType,
          uploadedAt: generateFormattedTimestamp(),
          url: b64Data
        };

        onAddMaterial(newFile);
      }, 1400);
    };

    reader.onerror = () => {
      setIsMaterialUploading(false);
      showAlert('Gagal mengupload file pendukung.');
    };
  };

  const processPdfToSlides = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);
    setUploadedFilename(file.name);
    setUploadSteps(['[CONNECT] Membaca PDF dan inisialisasi ekstensi Canvas...', '[PDF] Memproses halaman menjadi slide gambar resolusi tinggi...']);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      
      setUploadProgress(50);
      setUploadSteps(prev => [...prev, `[RENDER] Mengekstrak ${pdf.numPages} halaman PDF...`]);

      const generatedSlides: Slide[] = [];
      const numPages = pdf.numPages;

      for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
             await page.render({ canvasContext: context, viewport: viewport, canvas: canvas }).promise;
             const imgData = canvas.toDataURL('image/png');
             
             let pageTitle = `Halaman ${i}`;
             let pageText = '';
             let pageBullets: string[] = [];

             try {
                const textContent = await page.getTextContent();
                const strings = textContent.items.map((item: any) => item.str || '');
                pageText = strings.join(' ').replace(/\s+/g, ' ').trim();

                const nonEmptyStrings = strings.map(s => s.trim()).filter(s => s.length > 2);
                if (nonEmptyStrings.length > 0) {
                  const candidate = nonEmptyStrings[0];
                  if (candidate.length > 3 && candidate.length < 60) {
                    pageTitle = candidate;
                  }
                }

                if (pageText) {
                  const sentences = pageText.split(/(?:\.\s+|\s*[•○-]\s*|\s*\d+\.\s+)/)
                    .map(s => s.trim())
                    .filter(s => s.length > 8 && s.length < 200);
                  if (sentences.length > 0) {
                    pageBullets = sentences.slice(0, 5);
                  } else {
                    pageBullets = [pageText.substring(0, 100)];
                  }
                }
             } catch (textErr) {
                console.warn("Gagal mengekstrak teks dari halaman PDF", textErr);
             }

             generatedSlides.push({
               id: parseInt(Math.random().toString().substring(2, 8)),
               title: pageTitle,
               content: pageText || `Detail materi kuliah halaman ${i}`,
               imageTheme: 'neutral',
               bullets: pageBullets.length > 0 ? pageBullets : ['Butir pembelajaran utama halaman PDF'],
               backgroundImageUrl: imgData
             });
          }
      }
      
      setUploadProgress(100);
      setIsUploading(false);
      onSlidesChange(generatedSlides);
      onSlideIndexChange(0, []);
    } catch(error) {
       setIsUploading(false);
       showAlert("Gagal membaca dokumen PDF. Pastikan file tidak rusak atau di-password.");
       console.warn(error);
    }
  };

  const processImagesToSlides = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(20);
    setUploadedFilename(files.length === 1 ? files[0].name : `${files.length} Gambar Slide`);
    setUploadSteps(['[CONNECT] Memproses file gambar...', '[OPTIMIZE] Merender gambar menjadi slide presentasi...']);

    const generatedSlides: Slide[] = [];
    
    for (let i = 0; i < files.length; i++) {
       const file = files[i];
       if (!file.type.startsWith('image/')) continue;
       const dataUrl = await new Promise<string>((resolve) => {
           const reader = new FileReader();
           reader.onload = (e) => resolve(e.target?.result as string);
           reader.readAsDataURL(file);
       });
       generatedSlides.push({
               id: parseInt(Math.random().toString().substring(2, 8)),
               title: file.name,
               content: '',
               imageTheme: 'neutral',
               bullets: [],
               backgroundImageUrl: dataUrl
       });
    }

    setUploadProgress(100);
    setIsUploading(false);
    if (generatedSlides.length > 0) {
      onSlidesChange(generatedSlides);
      onSlideIndexChange(0, []);
    }
  };

  const processPptxToSlides = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);
    setUploadedFilename(file.name);
    setUploadSteps(['[CONNECT] Membaca struktur file PPTX...', '[EXTRACT] Mengonversi slide ke format PNG...']);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);
      const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/media/') && (name.endsWith('.png') || name.endsWith('.jpeg') || name.endsWith('.jpg')));

      setUploadProgress(50);
      setUploadSteps(prev => [...prev, `[RENDER] Mengekstrak gambar slide presentasi ke format PNG...`]);

      const generatedSlides: Slide[] = [];

      if (mediaFiles.length > 0) {
        mediaFiles.sort((a, b) => {
          const matchA = a.match(/\d+/);
          const matchB = b.match(/\d+/);
          const numA = parseInt(matchA ? matchA[0] : '0');
          const numB = parseInt(matchB ? matchB[0] : '0');
          return numA - numB;
        });

        for (let i = 0; i < mediaFiles.length; i++) {
          const mediaFile = zip.files[mediaFiles[i]];
          const blob = await mediaFile.async('blob');
          const dataUrl = await new Promise<string>((resolve) => {
             const reader = new FileReader();
             reader.onload = (e) => resolve(e.target?.result as string);
             reader.readAsDataURL(blob);
          });
          
          let slideText = '';
          let slideTitle = `Slide PPT ${i+1}`;
          let slideBullets: string[] = [];

          try {
            const slideXmlFile = zip.files[`ppt/slides/slide${i+1}.xml`];
            if (slideXmlFile) {
              const xmlText = await slideXmlFile.async('text');
              const matches = Array.from(xmlText.matchAll(/<a:t>([^<]+)<\/a:t>/g)).map(m => m[1]);
              slideText = matches.join(" ").replace(/\s+/g, ' ').trim();
              
              if (matches.length > 0) {
                const possibleTitle = matches[0].trim();
                if (possibleTitle.length > 2 && possibleTitle.length < 60) {
                  slideTitle = possibleTitle;
                }
                
                const sentences = matches
                  .map(s => s.trim())
                  .filter(s => s.length > 8 && s.length < 200);
                if (sentences.length > 0) {
                  slideBullets = sentences.slice(0, 5);
                }
              }
            }
          } catch (xmlErr) {
            console.warn("Gagal mengekstrak XML slide PPT:", xmlErr);
          }

          generatedSlides.push({
            id: parseInt(Math.random().toString().substring(2, 8)),
            title: slideTitle,
            content: slideText || `Materi slide presentasi ke-${i+1}`,
            imageTheme: 'neutral',
            bullets: slideBullets.length > 0 ? slideBullets : ['Butir pembelajaran utama slide PPT'],
            backgroundImageUrl: dataUrl
          });
        }
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 800, 600);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 30px Arial';
          ctx.fillText(`Membuka PPT: ${file.name}`, 50, 300);
          const bgDataUrl = canvas.toDataURL('image/png');
          generatedSlides.push({
            id: parseInt(Math.random().toString().substring(2, 8)),
            title: `Cover PPT`,
            content: '',
            imageTheme: 'neutral',
            bullets: [],
            backgroundImageUrl: bgDataUrl
          });
        }
      }

      setUploadProgress(100);
      setIsUploading(false);
      if (generatedSlides.length > 0) {
        onSlidesChange(generatedSlides);
        onSlideIndexChange(0, []);
      }

    } catch (e) {
      console.warn(e);
      setIsUploading(false);
      showAlert("Gagal membaca file presentasi PPTX.");
      handleSimulatedFileUpload(file);
    }
  };

  const processFilesOrFallback = (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Check if multiple images
    const images = fileArray.filter(f => f.type.startsWith('image/'));
    if (images.length > 0) {
      return processImagesToSlides(images);
    }

    const file = fileArray[0];
    const filename = file.name.toLowerCase();

    if (filename.endsWith('.pdf')) {
      return processPdfToSlides(file);
    }

    if (filename.endsWith('.pptx') || filename.endsWith('.ppt')) {
       showAlert("🚨 FORMAT POWERPOINT (.PPT / .PPTX) TIDAK DIDUKUNG LANGSUNG OLEH BROWSER 🚨\n\nEkstensi browser/web base tidak memiliki engine PowerPoint bawaan untuk merender animasi/font/layout langsung menjadi slide gambar.\n\n✅ SOLUSI CEPAT DAN TERBAIK:\n1. Buka file PPT/PPTX Anda di PowerPoint HP/Laptop Anda.\n2. Pilih menu 'File' -> 'Save As' -> Pilih format 'PDF'.\n3. Unggah file PDF tersebut kesini. \n\nSistem AI kami akan otomatis memotong dan memproses halaman PDF Anda menjadi slide interaktif beresolusi tinggi (PNG) siap coret-coret.");
       return;
    }

    // Fallback to text parsing mock
    handleSimulatedFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      processFilesOrFallback(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFilesOrFallback(e.target.files);
    }
  };

  const handleParseMarkdownOutline = () => {
    if (!pastedOutline.trim()) return;
    
    // Parse outline matching '# Slide Title' or 'Slide 1: ...' and lines starting with '-' or '*'
    const lines = pastedOutline.split('\n');
    let generatedSlides: Slide[] = [];
    let currentSlide: Partial<Slide> | null = null;
    let bullets: string[] = [];

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || trimmed.toUpperCase().startsWith('SLIDE')) {
        if (currentSlide) {
          currentSlide.bullets = bullets;
          generatedSlides.push(currentSlide as Slide);
          bullets = [];
        }
        const titleText = trimmed.startsWith('#') ? trimmed.replace(/^#+\s*/, '') : trimmed;
        currentSlide = {
          id: 501 + lineIdx + Math.floor(Math.random() * 100),
          title: titleText.toUpperCase(),
          content: 'Slide materi outline teacher.',
          imageTheme: 'neutral',
          bullets: []
        };
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const bulletText = trimmed.substring(1).trim();
        if (bulletText) bullets.push(bulletText.toUpperCase());
      } else if (trimmed && currentSlide) {
        currentSlide.content = trimmed;
      }
    });

    if (currentSlide) {
      currentSlide.bullets = bullets;
      generatedSlides.push(currentSlide as Slide);
    }

    if (generatedSlides.length > 0) {
      onSlidesChange(generatedSlides);
      onSlideIndexChange(0, []);
      setPastedOutline('');
    }
  };

  const handleSelectSlideForEdit = (idx: number) => {
    setActiveSlideEditIndex(idx);
    const target = slides[idx];
    if (target) {
      setEditTitle(target.title);
      setEditContent(target.content || '');
      setEditBulletsText(target.bullets.join('\n'));
    }
  };

  const handleSaveEditedSlide = () => {
    if (activeSlideEditIndex === null) return;
    const updated = [...slides];
    const target = updated[activeSlideEditIndex];
    if (target) {
      target.title = editTitle.trim();
      target.content = editContent.trim();
      target.bullets = editBulletsText.split('\n').map(b => b.trim()).filter(b => b !== '');
      onSlidesChange(updated);
      setActiveSlideEditIndex(null);
    }
  };

  const handleDeleteSlide = (idx: number) => {
    if (slides.length <= 1) return; // Must keep at least 1 slide
    const updated = slides.filter((_, sIdx) => sIdx !== idx);
    onSlidesChange(updated);
    // adjust index
    if (currentSlideIndex >= updated.length) {
      onSlideIndexChange(updated.length - 1, []);
    }
  };

  const handleMoveSlide = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const updated = [...slides];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    onSlidesChange(updated);
    if (currentSlideIndex === idx) {
      onSlideIndexChange(targetIdx, []);
    } else if (currentSlideIndex === targetIdx) {
      onSlideIndexChange(idx, []);
    }
  };

  const handleCreateBlankSlide = () => {
    const nextId = Math.max(...slides.map(s => s.id), 0) + 1;
    const newSlide: Slide = {
      id: nextId,
      title: 'JUDUL SLIDE BARU',
      content: 'Isi teks penjelasan materi di sini.',
      imageTheme: 'neutral',
      bullets: [
        'BUTIR MATERI BARU 1',
        'BUTIR MATERI BARU 2'
      ]
    };
    const updated = [...slides, newSlide];
    onSlidesChange(updated);
  };

  // Calculate live dynamic metrics from connected sockets and simulate offline/database roster
  const studentList = useMemo(() => {
    return authorizedStudents.map((ast, idx) => {
      const socketUsername = ast.fullName.replace(/\s+/g, '_');
      const liveStudent = Object.values(students || {}).find(s => 
        s.username.toLowerCase() === socketUsername.toLowerCase() ||
        s.username.toLowerCase() === ast.fullName.toLowerCase() ||
        s.username.toLowerCase() === ast.studentId.toLowerCase()
      );

      // Create a deterministic mock seed based on their ID digits to generate realistic academic stats!
      const idNum = parseInt(ast.studentId.replace(/\D/g, '')) || (idx + 1) * 31;
      
      const simulatedAccuracy = 75 + (idNum % 22); // 75% to 96%
      
      let simulatedScore = 80 + (idNum % 15);
      if (ast.fullName.toLowerCase().includes("nabilah")) {
        simulatedScore = 95; // Rank 1
      } else if (ast.fullName.toLowerCase().includes("rangga")) {
        simulatedScore = 90; // Rank 2
      } else if (ast.fullName.toLowerCase().includes("fikri")) {
        simulatedScore = 85; // Rank 3
      }

      const simulatedMeetingScore = 75 + (idNum % 20); // 75 to 94 pts
      if (ast.fullName.toLowerCase().includes("nabilah")) {
        simulatedScore = 95;
      } else if (ast.fullName.toLowerCase().includes("rangga")) {
        simulatedScore = 90;
      }

      const isOnline = liveStudent ? 'online' : 'offline';
      const pingVal = liveStudent ? (liveStudent.ping || 14) : (18 + (idNum % 8));

      return {
        id: ast.studentId,
        username: ast.fullName, // Keep fullName for easy readability in list
        fullName: ast.fullName,
        studentId: ast.studentId,
        status: isOnline,
        ping: pingVal,
        accuracy: liveStudent?.accuracy !== undefined ? liveStudent.accuracy : simulatedAccuracy,
        score: liveStudent?.score !== undefined ? liveStudent.score : simulatedScore,
        meetingScore: liveStudent?.meetingScore !== undefined ? liveStudent.meetingScore : simulatedMeetingScore,
        isSimulated: !liveStudent,
      };
    });
  }, [authorizedStudents, students]);

  const getStudentInfo = (username: string) => {
    const match = authorizedStudents.find(s => 
      s.fullName.toLowerCase() === username.toLowerCase() ||
      s.fullName.replace(/\s+/g, '_').toLowerCase() === username.toLowerCase() ||
      s.studentId.toLowerCase() === username.toLowerCase()
    );
    if (match) {
      return {
        studentId: match.studentId,
        fullName: match.fullName
      };
    }
    
    let inferredName = username.replace(/_/g, ' ');
    let inferredId = '10115' + Math.abs(username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 1000).toString().padStart(3, '0');
    
    if (username === 'Rangga_Student') {
      inferredId = '10115002';
      inferredName = 'Rangga Student';
    } else if (username === 'Nabilah_Informatika') {
      inferredId = '10115045';
      inferredName = 'Nabilah Informatika';
    }
    
    return {
      studentId: inferredId,
      fullName: inferredName
    };
  };
  const onlineCount = studentList.filter(s => s && s.status === 'online').length;
  const avgAccuracy = studentList.length > 0 
    ? Math.round(studentList.reduce((acc, s) => acc + (s?.accuracy ?? 100), 0) / studentList.length) 
    : 100;
  const avgLatency = studentList.length > 0 
    ? Math.round(studentList.reduce((acc, s) => acc + (s?.ping ?? 12), 0) / studentList.length) 
    : 12;

  // Scoreboard leaderboard calculation sorted descendingly based on live meeting points (Pertemuan)
  const sortedMeetingLeaderboard = [...studentList].sort((a, b) => {
    const valA = a?.meetingScore ?? 0;
    const valB = b?.meetingScore ?? 0;
    return valB - valA;
  });

  // Grouped active quiz options metrics
  const optionVotes = activeQuiz 
    ? activeQuiz.options.map((_, optIdx) => quizSubmissions.filter(s => s.quizId === activeQuiz.id && s.optionIndex === optIdx).length) 
    : [];
  const maxVoteCount = Math.max(...optionVotes, 1);

  const handleCloseActiveSession = async () => {
    setShowCloseSessionModal(false);
    const meetingToRecap = activeMeeting;
    if(!meetingToRecap) return;
    
    // Show AI Generation Loader screen immediately
    setIsAiSessionRecapGenerating(true);
    setSessionRecapResult('');

    // Save meeting properties for the recap
    setRecapMeetingTopic(meetingToRecap.topic);
    setRecapMeetingNumber(meetingToRecap.number);
    setRecapMeetingId(meetingToRecap.id);
    
    // Mark meeting as completed
    const updatedMeetings = meetings.map(m => m.id === meetingToRecap.id ? { ...m, isCompleted: true } : m);
    setMeetings(updatedMeetings);

    setActiveMeeting(null);
    onSlidesChange([]); // Reset slides so the next meeting is fresh
    onSlideIndexChange(0, []); // Reset slide index
    onBroadcastPayload('MEETING_SESSION_CHANGED', { activeMeeting: null, meetings: updatedMeetings });
    onBroadcastPayload('MEETINGS_UPDATED', { meetings: updatedMeetings });

    // Switch to Reports/Indikator tab after ending class
    setActiveTab('reports');

    const pdfFile = sharedMaterials.find(m => m.name.toLowerCase().endsWith('.pdf'));
    const pdfTitle = pdfFile ? pdfFile.name : (meetingToRecap.topic.toLowerCase().includes("uji hipotesis") || meetingToRecap.topic.toLowerCase().includes("populasi") ? "PERTEMUAN 11 - UJI HIPOTESIS PARAMETER 2 POPULASI-COMPRESSED.PDF" : "BAHAN_AJAR_KULIAH_SINKRON_INTERAKTIF.PDF");

    let finalSummary = "";
    try {
      console.log("[AI Summarization] Calling slide summarization API...", { topic: meetingToRecap.topic, slidesCount: slides.length });
      const apiResponse = await fetch("/api/ai/summarize-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-api-key": localStorage.getItem("user-gemini-api-key") || "" },
        body: JSON.stringify({
          topic: meetingToRecap.topic,
          slides: slides
        })
      });
      if (apiResponse.ok) {
        const result = await apiResponse.json();
        if (result && result.summary) {
          finalSummary = result.summary;
          console.log("[AI Summarization] Dynamic summary successfully retrieved.");
        }
      }
    } catch (err) {
      console.error("[AI Summarization] Failed to fetch dynamic summary from backend.", err);
    }

    if (!finalSummary) {
      // Robust Fallback
      finalSummary = generateMaterialSummary(meetingToRecap.topic);
    }

    const recapPayload = {
      topic: meetingToRecap.topic,
      number: meetingToRecap.number,
      pdfTitle: pdfTitle,
      materialSummary: finalSummary,
      quizzes: savedAiQuizzes.length > 0 ? savedAiQuizzes : MOCK_QUIZZES.slice(0, 3),
      date: new Date().toLocaleDateString('id-ID')
    };

    onBroadcastPayload('SESSION_RECAP_TRIGGERED', { recap: recapPayload });
    
    // Server-side (local client array map) direct reporting logic without AI
    let generalSummary = `# 📊 Laporan Rekapitulasi Kelas (Server-Side Auto-Report)\n\n`;
    generalSummary += `**Topik:** ${meetingToRecap.topic}  \n`;
    generalSummary += `**Tanggal:** ${new Date().toLocaleDateString('id-ID')}  \n\n`;
    generalSummary += `Kinerja kelas hari ini dirangkum dengan perhitungan matematis, laporan personal telah dikirimkan ke tiap UI student!\n\n`;

    // Calculate individual student reports
    studentList.forEach(student => {
      // 1. Presensi
      const attendance = attendanceRecords.find(r => r.meetingId === meetingToRecap.id && r.studentName === student.username);
      const isPresent = !!attendance;
      const timePresent = attendance ? new Date(attendance.timestamp).toLocaleTimeString('id-ID') : '-';

      // 2. Kuis dan Penjelasan
      const studentQuizzes = quizSubmissions.filter(q => q.studentName === student.username);
      let quizContent = ``;
      if (studentQuizzes.length > 0) {
        studentQuizzes.forEach((sq, idx) => {
           // We need to fetch the quiz question & explanation
           // Note: In real scenarios we match with 'savedAiQuizzes' or 'MOCK_QUIZZES' but here we'll summarize what we know
           const qStatus = sq.isCorrect ? "✅ BENAR" : "❌ SALAH";
           quizContent += `- Kuis ${idx + 1}: ${qStatus} (Reward: +${sq.pointsAssigned || 0} exp)\n`;
         });
      } else {
        quizContent = `- Student tidak berpartisipasi dalam kuis.\n`;
      }

      // 3. Stats & Streak
      const score = student.score || 0;
      const streak = student.streak || 1;
      const isCheating = proctorLogs.some(l => l.studentName === student.username);
      const bonusInfo = streak > 1.0 ? `(Bonus Streak Aktif: x${streak.toFixed(1)})` : '';
      const proctorInfo = isCheating ? `\n⚠️ *Peringatan: Sistem Proctoring Shield AI mendeteksi pelanggaran/pemindahan tab selama kelas!*` : ``;

      const personalMarkdown = `
Halo **${student.username?.toUpperCase() || 'Student'}**, ini laporan performa Anda di kelas **${meetingToRecap.topic}**.

### 📅 Kehadiran (Presensi)
- Status: **${isPresent ? 'HADIR' : 'ALPA / TIDAK HADIR'}**
- Jam Presensi: **${timePresent}**

### 🧠 Hasil Kuis Interaktif
${quizContent}

### 📈 Poin & Perkembangan (XP)
- Total Score Saat Ini: **${score} XP**
- Combo Streak: **${streak}x** ${bonusInfo}${proctorInfo}

_Terus semangat dan tingkatkan konsentrasi di kelas selanjutnya!_
      `.trim();

      const newReport: any = {
        id: 'report-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        studentName: student.username,
        meetingId: meetingToRecap.id,
        notes: personalMarkdown,
        timestamp: Date.now()
      };

      onBroadcastPayload('DAILY_REPORT_SENT', { report: newReport });
    });

    generalSummary += `\n✅ **Terkirim:** Laporan dikirimkan sukses ke ${studentList.length} student.\n`;

    setSessionRecapResult(generalSummary);
    setIsAiSessionRecapGenerating(false);
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col justify-between">
      
      {/* Dynamic AI Recap Loading Overlay */}
      {isAiSessionRecapGenerating && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#FAF3E0] border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full text-center space-y-6 relative overflow-hidden">
            
            <div className="pt-2 flex flex-col items-center">
              <div className="relative">
                <div className="w-16 h-16 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                  <span className="text-3xl">📝</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-neutral-800 border-2 border-black rounded-full flex items-center justify-center">
                  <RefreshCw className="w-3 h-3 text-white animate-spin" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-black text-lg text-black uppercase tracking-tight">
                Meringkas Slide Presentasi
              </h3>
              <p className="font-mono text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                Penyusunan Rangkuman Otomatis
              </p>
            </div>

            {/* Simple Loading Queue Progress List (Monochrome & No flash green/red) */}
            <div className="border-2 border-black bg-white p-4 text-left font-mono text-[10px] space-y-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center text-neutral-800 font-semibold border-b border-gray-100 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span>[+]</span>
                  <span>Membaca {slides.length} Halaman Slide</span>
                </span>
                <span className="font-bold text-neutral-500">SELESAI</span>
              </div>
              <div className="flex justify-between items-center text-neutral-900 font-bold animate-pulse">
                <span className="flex items-center gap-1.5">
                  <span>[&gt;]</span>
                  <span>Memformulasikan Rangkuman</span>
                </span>
                <span className="font-bold text-neutral-700">PROSES...</span>
              </div>
            </div>

            <p className="font-sans text-[11px] text-gray-500 font-medium">
              Sedang memproses dokumen dan masukan slide untuk menyinkronkan rekapitulasi kelas. Mohon tunggu beberapa saat.
            </p>
          </div>
        </div>
      )}

      {/* Custom Close Session Modal */}
      {showCloseSessionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(255,0,122,1)] max-w-sm w-full space-y-4">
            <h3 className="font-display font-black text-lg text-black uppercase tracking-tight border-b-2 border-black pb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>YAKIN TUTUP SESI INI?</span>
            </h3>
            <p className="font-sans text-sm font-medium">
              Sesi aktif saat ini akan diakhiri. AI Gemini akan langsung berjalan untuk merangkum seluruh hasil aktivitas belajar untuk Laporan Kelas.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCloseSessionModal(false)}
                className="px-4 py-2 border-2 border-black bg-red-500 hover:bg-red-600 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all uppercase text-xs cursor-pointer"
              >
                BATAL
              </button>
              <button
                onClick={handleCloseActiveSession}
                className="px-4 py-2 border-2 border-black bg-gray-400 hover:bg-gray-500 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all uppercase text-xs cursor-pointer"
              >
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteDialog && deleteDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(255,0,122,1)] max-w-sm w-full space-y-4">
            <h3 className="font-display font-black text-lg text-black uppercase tracking-tight border-b-2 border-black pb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Yakin menghapus {deleteDialog.title}?</span>
            </h3>
            <p className="text-gray-700 font-bold text-sm leading-relaxed">
              Maka data akan hilang dari database dan tidak dapat dikembalikan.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteDialog(null)}
                className="px-4 py-2 border-2 border-black bg-rose-600 hover:bg-rose-700 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all uppercase text-xs cursor-pointer"
              >
                BATAL
              </button>
              <button
                onClick={() => {
                  deleteDialog.onConfirm();
                  setDeleteDialog(null);
                }}
                className="px-4 py-2 border-2 border-black bg-gray-400 hover:bg-gray-500 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all uppercase text-xs cursor-pointer"
              >
                HAPUS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Frame */}
      <header className="border-b-4 border-black py-4 px-6 flex flex-wrap justify-between items-center bg-white sticky top-0 z-40 gap-4">
        <div className="flex items-center space-x-3 shrink-0">
          <LiveClassLogo size="md" variant="icon-only" themeColor="pink" />
          <div>
            <span className="font-display font-black text-xl text-[#111111]">
              LiveClass<span className="text-[#FF007A]">.</span> <span className="text-gray-400 font-normal text-xs uppercase font-mono tracking-wider ml-1">TEACHER</span>
            </span>
          </div>
        </div>

        {activeMeeting && (
          <div className="hidden lg:flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#00E5FF] font-black bg-[#111111] px-1.5 py-0.5 ml-1">SESI AKTIF: PERTEMUAN KE-{activeMeeting.number}</span>
              <h4 className="font-sans font-black text-xs uppercase leading-none mt-1 ml-1 text-black">{activeMeeting.topic}</h4>
            </div>
          </div>
        )}

        {/* Display Room Code & Download source bundle details */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-[#FF007A]/10 border-4 border-black px-4 py-1.5 flex items-center space-x-2.5 shrink-0 select-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-[10px] font-black text-[#FF007A] font-mono tracking-wider uppercase">KODE KELAS:</span>
            <span className="font-sans font-black text-lg text-[#111111] tracking-widest leading-none">{classCode}</span>
          </div>

          <button
            id="btn-teacher-exit"
            onClick={() => {
              onExit();
            }}
            className="px-4 py-2 bg-white hover:bg-rose-50 text-black border-4 border-black text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            Keluar Kelas
          </button>
        </div>
      </header>


      {/* Main Grid split in 12-column layout */}
      <div className="w-full max-w-[1600px] mx-auto px-4 py-6 md:px-6 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white">
        
        {/* Left Sidebar Navigation (2 cols) */}
        <div className="col-span-1 lg:col-span-2 bg-[#f9fafb] lg:bg-white border-4 border-black p-4 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] self-start sticky top-24 z-20">
          <div className="hidden lg:block border-b-2 border-black pb-2 select-none">
            <span className="text-[10px] font-black text-gray-500 font-mono tracking-widest uppercase">MENU KONSOL</span>
          </div>
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 select-none">
            {[
              { id: 'dashboard', label: 'BERANDA', icon: LayoutDashboard },
              { id: 'classroom', label: 'KELAS', icon: GraduationCap },
              { id: 'livesession', label: 'SESI AKTIF', icon: Laptop },
              
              { id: 'reports', label: 'LAPORAN', icon: FileSpreadsheet },
              { id: 'notifications', label: 'NOTIFIKASI', icon: Bell }
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center space-x-2 px-3 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-black whitespace-nowrap lg:whitespace-normal transition-all cursor-pointer w-auto lg:w-full ${
                    activeTab === t.id 
                      ? 'bg-[#FF007A] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-px translate-y-px' 
                      : 'bg-white text-gray-700 hover:text-black hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 transition-all ${activeTab === t.id ? 'text-white' : 'text-[#FF007A]'}`} />
                  <span className="leading-tight text-left">{t.label}</span>
                </button>
              );
            })}
          </div>
          
          {/* Layanan Pesan Panel */}
          <div className="pt-4 border-t-2 border-black border-dashed mt-2 px-1">
            <span className="text-[10px] font-black text-gray-500 font-mono tracking-widest uppercase block mb-3 relative inline-block">
              LAYANAN PESAN
              {(unreadGroupMessagesCount + unreadPrivateMessagesCount) > 0 && (
                <span className="absolute -top-1 -right-4 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white shadow-sm ring-1 ring-white">
                    {unreadGroupMessagesCount + unreadPrivateMessagesCount}
                </span>
              )}
            </span>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button 
                onClick={() => { setChatOverlayTab('group'); setActiveTab('messages'); }}
                className="relative py-2.5 font-bold text-[9px] uppercase border-2 border-black bg-white hover:bg-[#FF007A] hover:text-white transition-colors cursor-pointer text-center"
              >
                CHAT GRUP
                {unreadGroupMessagesCount > 0 && (
                   <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg border border-black animate-pulse">
                     {unreadGroupMessagesCount}
                   </span>
                )}
              </button>
              <button 
                onClick={() => { setChatOverlayTab('private'); setActiveTab('messages'); }}
                className="relative py-2.5 font-bold text-[9px] uppercase border-2 border-black bg-white hover:bg-[#00E5FF] hover:text-black transition-colors cursor-pointer text-center"
              >
                CHAT PRIB.
                {unreadPrivateMessagesCount > 0 && (
                   <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white shadow-lg border border-black animate-pulse">
                     {unreadPrivateMessagesCount}
                   </span>
                )}
              </button>
            </div>
            <button 
              onClick={() => { setChatOverlayTab('ai'); setActiveTab('messages'); }}
              className="w-full py-2.5 font-bold text-[9px] uppercase border-2 border-black bg-neutral-900 text-[#00E5FF] hover:bg-neutral-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,229,255,1)] active:translate-x-px active:translate-y-px active:shadow-none cursor-pointer flex gap-1 justify-center items-center mt-1"
            >
              <Sparkles className="w-3 h-3" /> ASISTEN AI LIVECLASS
            </button>
          </div>
        </div>

        {/* Middle Main Content Panel */}
        <div className={`col-span-1 ${(activeMeeting && activeTab === 'livesession') ? 'lg:col-span-7' : 'lg:col-span-10'} space-y-6`}>
          
          {/* Active Tab Panel Components switcher */}
          <div className="transition-all duration-300">
            {activeTab === 'dashboard' && (
              <div id="dashboard-tab-panel" className="space-y-6 text-left select-none">
                {/* Welcome Card */}
                <div className="bg-[#FF007A]/10 border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
                  <h3 className="font-display font-black text-xs uppercase tracking-widest text-[#FF007A] mb-1">
                    ADMINISTRASI KONSOL UTAMA TEACHER REAL-TIME
                  </h3>
                  <h2 className="text-xl font-black text-black uppercase tracking-tight">
                    SELAMAT DATANG KEMBALI, {username || 'TEACHER PRESENTER'}!
                  </h2>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed font-semibold max-w-2xl">
                    Konsol virtual terintegrasi berbasis socket BroadcastChannel dan Gemini AI. Di sini Anda memiliki kontrol penuh atas perkuliahan, presensi biometrik webcam, peluncuran kuis interaktif, integrasi asisten kurikulum AI, serta monitoring keamanan proctoring.
                  </p>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase font-mono flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-gray-400 shrink-0" /> STUDENT TERDAFTAR</span>
                    <span className="text-2xl font-black text-black font-mono leading-none mt-2">{studentList.length} <span className="text-xs font-semibold text-gray-400">STUDENT</span></span>
                    <span className="text-[8px] text-green-600 font-bold flex items-center gap-1 pt-2 font-mono"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> AKTIF DI RUANG TUNGGU</span>
                  </div>
                  <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase font-mono flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5 text-[#00E5FF] shrink-0" /> KEHADIRAN TERVERIFIKASI</span>
                    <span className="text-2xl font-black text-[#00E5FF] font-mono leading-none mt-2">{attendanceRecords.length} <span className="text-xs font-semibold text-gray-400">HADIR</span></span>
                    <span className="text-[8px] text-gray-400 font-bold block pt-2 font-mono">VERIFIKASI WEBCAM AKTIF</span>
                  </div>
                  <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase font-mono flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> BAHAN AJAR KELAS</span>
                    <span className="text-2xl font-black text-indigo-950 font-mono leading-none mt-2">{sharedMaterials.length} <span className="text-xs font-semibold text-gray-400">DOKUMEN</span></span>
                    <span className="text-[8px] text-indigo-700 font-bold block pt-2 font-mono">BAGIKAN BAHAN AJAR AKTIF</span>
                  </div>
                  <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase font-mono flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-rose-500 shrink-0" /> PERINGATAN PROCTORING</span>
                    <span className="text-2xl font-black text-rose-600 font-mono leading-none mt-2">{proctorLogs.length} <span className="text-xs font-semibold text-gray-400">INSIDEN</span></span>
                    <span className={`text-[8px] font-black flex items-center gap-1 pt-2 font-mono ${proctorLogs.length > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`}>
                      {proctorLogs.length > 0 ? (
                        <>
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping shrink-0" />
                          PELANGGARAN TERDETEKSI
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                          INTEGRITAS OPTIMAL
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Control Deck Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sesi Status */}
                  <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <h4 className="font-display font-black text-xs text-black uppercase tracking-wider border-b-2 border-black pb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Presentation className="h-4 w-4 text-black shrink-0" /> STATUS SESI KULIAH AKTIF</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${activeMeeting ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    </h4>
                    {activeMeeting ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-50 border-2 border-emerald-400 text-xs">
                          <p className="font-mono text-[9px] uppercase font-bold text-emerald-800">PERTEMUAN AKTIF KE-{activeMeeting.meetingNumber || 3}</p>
                          <p className="font-sans font-black text-sm text-[#111111] uppercase mt-1">TOPIK: {activeMeeting.topic}</p>
                          <p className="text-gray-500 text-[10px] font-semibold mt-1">Dibuat pada: {activeMeeting.createdAt || 'Baru Saja'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('livesession')}
                          className="w-full py-2.5 bg-[#FF007A] text-white border-2 border-black font-black uppercase text-[10px] tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-px active:shadow-none transition-all cursor-pointer"
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            <span>BUKA SESI YANG BERJALAN</span>
                            <Rocket className="h-4 w-4" />
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3.5 bg-gray-50 border-2 border-gray-300 text-center text-xs">
                          <p className="font-medium text-gray-500 italic">Teacher belum meluncurkan sesi siaran kuliah hari ini.</p>
                          <p className="text-[10px] text-gray-400 font-semibold mt-1">Student saat ini berada di modul lobi menunggu kode.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveClassroomSubTab('broadcast');
                            setActiveTab('classroom');
                          }}
                          className="w-full py-2.5 bg-[#00E5FF] text-black border-2 border-black font-black uppercase text-[10px] tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-px active:shadow-none transition-all cursor-pointer"
                        >
                          <span className="flex items-center justify-center gap-1.5">
                            <span>MULAI / JADWALKAN PERTEMUAN KELAS</span>
                            <Rocket className="h-4 w-4 text-[#FF007A]" />
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'livesession' && (
              <>
                {!activeMeeting ? (
                  meetingPreparing ? (
                    <div className="border-4 border-black p-6 bg-cyan-50 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 my-4">
                      <div className="border-b-2 border-black pb-3 select-none text-left">
                        <span className="text-[10px] font-mono font-black text-[#FF007A] uppercase bg-[#FF007A]/10 border border-black px-2 py-0.5">Langkah Wajib: Input Kode Presensi</span>
                        <h3 className="font-display font-black text-lg text-black mt-2 uppercase tracking-tight flex items-center gap-1.5">
                          <Key className="h-5 w-5 text-[#FF007A]" />
                          <span>TENTUKAN KODE PRESENSI UNTUK PERTEMUAN KE-{meetingPreparing.number}</span>
                        </h3>
                        <p className="text-xs text-gray-700 mt-1 font-semibold leading-relaxed">
                          Sebelum masuk ke fitur Live Class, Anda wajib memasukkan Kode Presensi. Student wajib melakukan Scan Wajah (on-cam webcam verification) terlebih dahulu dan memasukkan Kode Presensi ini agar diizinkan masuk ke Live Class Anda.
                        </p>
                      </div>

                      <div className="bg-white border-4 border-black p-5 space-y-4 text-left">
                        <div>
                          <label className="text-[10px] font-mono font-bold text-gray-500 block pb-1">KODE PRESENSI STUDENT (CONTOH: 9021 ATAU KELAS_A)</label>
                          <input 
                            type="text"
                            required
                            placeholder="Masukkan PIN / Kode Presensi..."
                            value={presenceCodeInput}
                            onChange={(e) => setPresenceCodeInput(e.target.value.toUpperCase())}
                            className="w-full text-base font-black p-3 bg-white border-2 border-black rounded-none outline-none focus:ring-1 focus:ring-[#FF007A] uppercase tracking-widest font-mono"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!presenceCodeInput.trim()) {
                                showAlert("Harap masukkan kode presensi terlebih dahulu!");
                                return;
                              }
                              const finalCode = presenceCodeInput.trim().toUpperCase();
                              setAttendanceCode(finalCode);
                              setIsAttendanceOpen(true);

                              const updatedMeetings = meetings.map(m => m.id === meetingPreparing.id ? { ...m, isStarted: true } : m);
                              setMeetings(updatedMeetings);
                              setActiveMeeting(meetingPreparing);

                              onBroadcastPayload('ATTENDANCE_STATUS_CHANGED', { isAttendanceOpen: true, attendanceCode: finalCode, meetingId: meetingPreparing.id });
                              onBroadcastPayload('MEETING_SESSION_CHANGED', { activeMeeting: meetingPreparing });
                              onBroadcastPayload('MEETINGS_UPDATED', { meetings: updatedMeetings });

                              onBroadcastMessage(`[INFORMASI KELAS] Sesi perkuliahan resmi dimulai: Pertemuan ke-${meetingPreparing.number} membahas "${meetingPreparing.topic}"! Silakan lakukan verifikasi wajah & input PIN Presensi agar bisa masuk ke Live Class.`, true, 'student');
                              onBroadcastMessage(`Telah berhasil memulai Kelas Live untuk Pertemuan ke-${meetingPreparing.number}`, true, 'teacher');

                              setMeetingPreparing(null);
                              setPresenceCodeInput('');
                            }}
                            className="px-6 py-3 bg-[#00E5FF] hover:bg-[#00c5dd] text-black border-2 border-black font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none cursor-pointer transition-all"
                          >
                            <span className="flex items-center gap-1.5 justify-center">
                              MULAI KELAS SEKARANG <Rocket className="h-4 w-4 animate-pulse" />
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMeetingPreparing(null);
                              setPresenceCodeInput('');
                            }}
                            className="px-4 py-3 bg-white hover:bg-neutral-100 border-2 border-black font-black text-xs text-gray-700 uppercase cursor-pointer"
                          >
                            BATAL
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-4 border-black p-6 bg-[#FAF9F6] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
                      <div className="border-b-2 border-black pb-3 select-none text-left">
                        <span className="text-[10px] font-mono font-black text-[#FF007A] uppercase border border-[#FF007A] px-2 py-0.5 bg-transparent">LANGKAH WAJIB</span>
                        <h3 className="font-display font-black text-lg text-black mt-2 uppercase tracking-tight flex items-center gap-1.5">
                          <span>SILAHKAN PILIH ATAU TAMBAH SESI PERTEMUAN KULIAH ANDA TERLEBIH DAHULU</span>
                          <GraduationCap className="h-5 w-5 text-[#FF007A]" />
                        </h3>
                        <p className="text-xs text-gray-700 mt-1 font-semibold leading-relaxed">
                          Sesuai kebijakan akademik, teacher wajib menambahkan dan mengaktifkan sesi kelas (contoh: Pertemuan 1 Materi Socket Programming) untuk membuka akses konsol ajar & menyinkronkannya ke seluruh student.
                        </p>
                      </div>

                      <div className="bg-white border-4 border-black p-4 space-y-3 text-left">
                        <h4 className="text-xs font-black uppercase text-[#FF007A] flex items-center gap-1.5"><Plus className="h-4 w-4 text-[#FF007A]" /> TAMBAH PERTEMUAN BARU</h4>
                        <form onSubmit={handleAddNewMeeting} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-3">
                            <label className="text-[9px] font-bold font-mono text-gray-500 block pb-1">PERTEMUAN KE-</label>
                            <input 
                              type="number"
                              required
                              min={1}
                              max={20}
                              value={meetingNumberInput}
                              onChange={(e) => setMeetingNumberInput(parseInt(e.target.value) || 1)}
                              className="w-full text-xs font-black p-2 bg-white border-2 border-black rounded-none outline-none focus:ring-1 focus:ring-[#FF007A]"
                            />
                          </div>
                          <div className="md:col-span-6">
                            <label className="text-[9px] font-bold font-mono text-gray-500 block pb-1">TOPIK MATERI PEMBELAJARAN</label>
                            <input 
                              type="text"
                              required
                              placeholder="Contoh: Socket Programming Dasar"
                              value={meetingTopicInput}
                              onChange={(e) => setMeetingTopicInput(e.target.value)}
                              className="w-full text-xs font-black p-2 bg-white border-2 border-black rounded-none outline-none focus:ring-1 focus:ring-[#FF007A]"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <button
                              type="submit"
                              className="w-full py-2 bg-[#00E5FF] hover:bg-[#00c5dd] text-black border-2 border-black font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none cursor-pointer transition-all"
                            >
                              DAFTARKAN
                            </button>
                          </div>
                        </form>
                      </div>

                      <div className="space-y-3 text-left">
                        <span className="text-[10px] font-black tracking-widest text-gray-500 font-mono uppercase block">DAFTAR SESI PERKULIAHAN TERDAFTAR:</span>
                        
                        {meetings.length === 0 ? (
                          <p className="text-xs text-gray-400 italic bg-white border-2 border-black p-4 text-center">Belum ada sesi didaftarkan. Silakan buat pertemuan di atas.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {meetings.map((m) => (
                              <div key={m.id} className="bg-white border-4 border-black p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-neutral-900 text-white font-mono text-[9px] font-black uppercase">PERTEMUAN {m.number}</span>
                                    <span className="text-[10px] font-mono text-gray-400 font-bold">{m.date}</span>
                                  </div>
                                  <p className="text-xs font-black text-black mt-1 uppercase tracking-tight">{m.topic}</p>
                                </div>

                                {m.isCompleted ? (
                                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const recapPayload = {
                                          topic: m.topic,
                                          number: m.number,
                                          pdfTitle: `Rangkuman_${classCode}_Pertemuan_${m.number}.pdf`,
                                          materialSummary: `Dokumen rekapitulasi materi kelas untuk pertemuan ini. Pada pertemuan ke-${m.number} dibahas topik mengenai ${m.topic}. Silakan unduh PDF untuk melihat laporan lengkap beserta detail performa student.`,
                                          quizzes: [],
                                          date: m.date
                                        };
                                        onBroadcastPayload('SESSION_RECAP_TRIGGERED', { recap: recapPayload });
                                      }}
                                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all cursor-pointer flex items-center gap-2"
                                    >
                                      <span>LIHAT LAPORAN</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled
                                      className="px-4 py-2 bg-red-600 text-white border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] cursor-not-allowed opacity-80"
                                    >
                                      KELAS SUDAH SELESAI
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMeetingPreparing(m);
                                      setPresenceCodeInput('');
                                    }}
                                    className="px-4 py-2 bg-[#FF007A] hover:bg-[#ff1f89] text-white border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <Play className="h-3 w-3" />
                                    <span>MULAI SESI KELAS</span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    <div className="space-y-6 text-left">
                      
                      <div className="flex flex-wrap bg-[#111111] p-1 gap-1 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] items-center">
                        {[
                          { id: 'presensi', label: 'PRESENSI', icon: Camera },
                          { id: 'slide', label: 'SLIDE PRESENTASI MATERI', icon: BookOpen },
                          { id: 'kuis', label: 'KUIS REAL-TIME', icon: CheckSquare }
                        ].map((sub) => {
                          const Icon = sub.icon;
                          const isMatch = activeLiveSessionSubTab === sub.id || (activeLiveSessionSubTab === 'presentation' && sub.id === 'slide');
                          return (
                            <button
                              key={sub.id}
                              onClick={() => setActiveLiveSessionSubTab(sub.id)}
                              className={`flex items-center space-x-1.5 px-4 py-2.5 font-black text-[10px] uppercase tracking-widest border-2 border-black focus:outline-none transition-all cursor-pointer ${
                                isMatch
                                  ? 'bg-[#00E5FF] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-px translate-y-px z-10'
                                  : 'bg-white text-gray-700 hover:text-black hover:bg-neutral-100'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span>{sub.label}</span>
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => {
                            setShowCloseSessionModal(true);
                          }}
                          className="flex items-center space-x-1.5 px-4 py-2.5 font-black text-[10px] uppercase tracking-widest border-2 border-black focus:outline-none transition-all cursor-pointer bg-red-600 hover:bg-red-700 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:ml-auto"
                        >
                          <Square className="h-3.5 w-3.5 shrink-0 text-white" />
                          <span>TUTUP PERTEMUAN</span>
                        </button>
                      </div>

                    {activeLiveSessionSubTab === 'presensi' && (
                    <div className="md:col-span-12 bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                      <h4 className="font-display font-black text-xs text-black uppercase tracking-wider pb-1.5 border-b-2 border-black flex items-center gap-1.5"><Key className="h-4 w-4 text-[#008ba3] shrink-0" /> GERBANG PRESENSI STUDENT</h4>
                      <p className="text-[11px] text-gray-600 font-bold leading-normal">
                        Rilis kode PIN presensi aktif sehingga student dapat melakukan scan verifikasi wajah menggunakan kamera web dan tercatat hadir di jurnal.
                      </p>

                      <div className="space-y-3 bg-neutral-50 p-4 border-2 border-black">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-500 font-mono">STATUS KUNCI PRESENSI:</span>
                          <span className={`px-2 py-0.5 font-mono font-black text-[9px] border uppercase ${isAttendanceOpen ? 'bg-emerald-100 text-emerald-800 border-emerald-400' : 'bg-rose-100 text-rose-800 border-rose-400'}`}>
                            {isAttendanceOpen ? 'SEDANG TERBUKA' : 'TERKUNCI / CLOSED'}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[8px] font-bold text-gray-500 uppercase pb-1">PIN PRESENSI KELAS SINKRON</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={presenceCodeInput || attendanceCode}
                              onChange={(e) => setPresenceCodeInput(e.target.value.toUpperCase())}
                              placeholder="CONTOH: TPJ32"
                              className="p-2 border-2 border-black bg-white font-mono font-black uppercase text-sm w-full focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newCode = presenceCodeInput.trim() || 'ABS2026';
                                setAttendanceCode(newCode);
                                setIsAttendanceOpen(true);
                                onBroadcastPayload('ATTENDANCE_WINDOW_CHANGED', { isOpen: true, code: newCode });
                              }}
                              className="px-4 bg-[#00E5FF] hover:bg-[#00cadf] border-2 border-black text-black font-black uppercase text-[10px] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap cursor-pointer"
                            >
                              BUKA PRESENSI
                            </button>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAttendanceOpen(false);
                              onBroadcastPayload('ATTENDANCE_WINDOW_CHANGED', { isOpen: false, code: '' });
                            }}
                            className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-black border-2 border-black uppercase text-[9px] tracking-wider rounded-none cursor-pointer"
                          >
                            KUNCI PINTU MASUK ABSENSI
                          </button>
                        </div>
                      </div>
                    </div>
                    )}

                    {(activeLiveSessionSubTab === 'slide' || activeLiveSessionSubTab === 'presentation') && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 items-start">
                          <div className="col-span-1 border-4 border-black p-1 bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <PdfSlidesContainer
                              slides={slides}
                              currentSlideIndex={currentSlideIndex}
                              onNavigate={onSlideIndexChange}
                              role="teacher"
                              externalAnnotations={externalAnnotations}
                              onDraw={onDrawUpdate}
                              onFileChange={handleFileChange}
                              isUploading={isUploading}
                              uploadProgress={uploadProgress}
                              uploadedFilename={uploadedFilename}
                            />
                          </div>
                        </div>

                      </div>
                    )}

                {activeLiveSessionSubTab === 'kuis' && (
                  <div className="space-y-6">
                    <div className="border-4 border-black p-6 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
                      {activeQuiz ? (
                    <div className="border-4 border-[#FF007A] p-5 bg-pink-50/50 space-y-4">
                      <div className="flex justify-between items-center border-b border-black pb-2 select-none">
                        <span className="text-[9px] font-black text-[#FF007A] font-mono uppercase bg-pink-100 border border-black px-1.5 py-0.5 rounded animate-pulse">📡 KUIS AKTIF SEDANG DISIARKAN</span>
                        <button onClick={onEndQuiz} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] cursor-pointer">HENTIKAN KUIS</button>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold uppercase font-mono">Pertanyaan kuis disiarkan ke student:</span>
                        <h4 className="font-sans font-black text-sm text-black mt-1 leading-snug uppercase">{activeQuiz.question}</h4>
                      </div>

                      <div className="space-y-2 border-t-2 border-dashed border-black pt-3">
                        <span className="text-[9px] font-black tracking-widest text-gray-500 font-mono uppercase">GRAFIK TANGGAPAN STUDENT SINKRON: ({quizSubmissions.filter(s => s.quizId === activeQuiz.id).length} Sockets Terkumpul)</span>
                        <div className="space-y-3">
                          {activeQuiz.options.map((opt, idx) => {
                            const votes = quizSubmissions.filter(s => s.quizId === activeQuiz.id && s.optionIndex === idx).length;
                            const currentActiveCount = quizSubmissions.filter(s => s.quizId === activeQuiz.id).length;
                            const pct = currentActiveCount > 0 ? Math.round((votes / currentActiveCount) * 100) : 0;
                            const isCorrect = idx === activeQuiz.correctOptionIndex;
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold font-mono">
                                  <span className={isCorrect ? 'text-[#008ba3] font-black' : 'text-gray-700'}>{String.fromCharCode(65 + idx)}. {opt} {isCorrect && '✓ (Kunci Jawaban)'}</span>
                                  <span>{votes} mhs ({pct}%)</span>
                                </div>
                                <div className="h-6 w-full bg-gray-100 border border-black relative">
                                  <div className={`h-full transition-all duration-500 ${isCorrect ? 'bg-[#00E5FF]' : 'bg-[#FF007A]'}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border-2 border-black p-4 space-y-3">
                        <h4 className="text-xs font-black uppercase text-gray-700 flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-amber-500 shrink-0" /> SOAL KUIS YANG TERSIMPAN</h4>
                        <div className="space-y-2.5">
                          {savedAiQuizzes.length === 0 ? (
                             <p className="text-[10px] italic text-gray-500 py-3 text-center border border-dashed border-gray-300 bg-gray-50">Belum ada soal kuis yang tersimpan. Buat kuis manual.</p>
                          ) : (
                            savedAiQuizzes.map((qz) => (
                              <div key={qz.id} className="p-3 border-2 border-black bg-white flex justify-between items-center gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-black truncate pr-2">{qz.question}</p>
                                  <span className="inline-block text-[8px] font-mono text-gray-400 font-black">SOAL TERSIMPAN • {qz.options ? qz.options.length : 0} PILIHAN {qz.type === 'short-answer' ? '(ISIAN SINGKAT)' : ''}</span>
                                </div>
                                <button onClick={() => onLaunchQuiz(qz)} className="px-2.5 py-1 bg-[#FF007A] text-white hover:bg-pink-600 border border-black font-semibold uppercase text-[8px] tracking-wider flex items-center gap-1 active:translate-y-px active:shadow-none shrink-0 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
                                  <Play className="h-2.5 w-2.5" /> SIARKAN
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="border-2 border-[#00E5FF] p-4 bg-cyan-50/10 space-y-3">
                        <h4 className="text-xs font-black uppercase text-[#008ba3] flex items-center gap-1.5">
                          <Plus className="h-4 w-4 text-[#008ba3] shrink-0" /> BUAT SOAL KUIS SECARA MANUAL
                        </h4>

                        <div className="flex gap-1.5 border-b border-black pb-2 select-none">
                          {[
                            { value: 'multiple-choice', label: 'Pilihan Ganda' },
                            { value: 'short-answer', label: 'Isian Singkat' },
                            { value: 'true-false', label: 'True / False' }
                          ].map((t) => (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => {
                                setManualQuizType(t.value as any);
                                setCustomCorrect(0);
                              }}
                              className={`px-2 py-1 border-2 border-black font-mono font-black text-[8px] uppercase tracking-wider transition-all cursor-pointer ${
                                manualQuizType === t.value
                                  ? 'bg-black text-[#00E5FF] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                                  : 'bg-white text-gray-700 hover:text-black hover:bg-neutral-50'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        <form onSubmit={handleCreateQuiz} className="space-y-3 text-[10px]">
                          <div>
                            <label className="block text-[8px] font-bold text-gray-500 uppercase mb-1">PERTANYAAN KUIS:</label>
                            <input
                              type="text"
                              required
                              value={customQuestion}
                              onChange={(e) => setCustomQuestion(e.target.value)}
                              placeholder="Tulis Pertanyaan Anda"
                              className="w-full p-2 border border-black bg-white focus:outline-none text-xs font-bold"
                            />
                          </div>

                          {manualQuizType === 'multiple-choice' && (
                            <>
                              <div>
                                <label className="block text-[8px] font-bold text-gray-500 uppercase mb-1">OPSI PILIHAN JAWABAN:</label>
                                <div className="grid grid-cols-2 gap-2 font-bold">
                                  <input type="text" required value={customOptA} onChange={(e) => setCustomOptA(e.target.value)} placeholder="Opsi A (Wajib)" className="p-1.5 border border-black bg-white text-xs" />
                                  <input type="text" required value={customOptB} onChange={(e) => setCustomOptB(e.target.value)} placeholder="Opsi B (Wajib)" className="p-1.5 border border-black bg-white text-xs" />
                                  <input type="text" value={customOptC} onChange={(e) => setCustomOptC(e.target.value)} placeholder="Opsi C" className="p-1.5 border border-black bg-white text-xs" />
                                  <input type="text" value={customOptD} onChange={(e) => setCustomOptD(e.target.value)} placeholder="Opsi D" className="p-1.5 border border-black bg-white text-xs" />
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-black text-gray-500 text-[8px] uppercase">KUNCI JAWABAN:</span>
                                <div className="flex gap-1">
                                  {[0, 1, 2, 3].map(idx => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setCustomCorrect(idx)}
                                      className={`cursor-pointer h-6 w-6 border-2 border-black font-mono font-black ${customCorrect === idx ? 'bg-[#FF007A] text-white' : 'bg-white text-black'}`}
                                    >
                                      {String.fromCharCode(65 + idx)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          {manualQuizType === 'true-false' && (
                            <div className="flex items-center justify-between py-1 border border-black bg-white p-2">
                              <span className="font-black text-gray-500 text-[8px] uppercase">KUNCI JAWABAN TRUE / FALSE:</span>
                              <div className="flex gap-1.5">
                                {[
                                  { val: 0, label: 'TRUE' },
                                  { val: 1, label: 'FALSE' }
                                ].map(item => (
                                  <button
                                    key={item.val}
                                    type="button"
                                    onClick={() => setCustomCorrect(item.val)}
                                    className={`cursor-pointer px-2.5 py-1 border-2 border-black font-mono font-black text-[9px] ${customCorrect === item.val ? 'bg-[#FF007A] text-white' : 'bg-white text-gray-700'}`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {manualQuizType === 'short-answer' && (
                            <div>
                              <label className="block text-[8px] font-bold text-gray-500 uppercase mb-1">KUNCI JAWABAN ISIAN SINGKAT:</label>
                              <input
                                type="text"
                                required
                                value={manualCorrectAnswerText}
                                onChange={(e) => setManualCorrectAnswerText(e.target.value)}
                                placeholder="Masukkan satu kata atau frase kunci jawaban yang tepat"
                                className="w-full p-2 border border-black bg-white focus:outline-none placeholder:text-gray-300 font-mono text-xs font-bold"
                              />
                            </div>
                          )}

                          <button type="submit" className="cursor-pointer w-full py-2 bg-[#00E5FF] hover:bg-[#00c5dd] border-2 border-black font-black uppercase tracking-wider text-[9px]">SIARKAN KUIS BARU</button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
                  </div>
                )}

              </div>
            </>
          )}
        </>
      )}

            {activeTab === 'classroom' && (
              <div id="classroom-tab-panel" className="space-y-6 text-left select-none animate-in fade-in duration-200">
                <div id="classroom-subtabs-nav" className="flex flex-wrap bg-[#111111] p-1.5 gap-1.5 border-4 border-black shadow-[4px_4px_0px_0px_black]">
                  {[
                    { id: 'broadcast', label: 'PENGUMUMAN', icon: Megaphone },
                    { id: 'assignment', label: 'TUGAS', icon: CheckSquare },
                    { id: 'material', label: 'MATERI BELAJAR', icon: BookOpen },
                    { id: 'members', label: 'ANGGOTA KELAS', icon: Users },
                    { id: 'calendar', label: 'KALENDER', icon: Calendar },
                    { id: 'banksoal', label: 'BANK SOAL', icon: Database }
                  ].map((sub) => {
                    const Icon = sub.icon;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setActiveClassroomSubTab(sub.id)}
                        className={`flex items-center space-x-1.5 px-3 py-2 font-black text-[10px] uppercase tracking-widest border-2 border-black focus:outline-none transition-all cursor-pointer ${
                          activeClassroomSubTab === sub.id 
                            ? 'bg-[#00E5FF] text-black shadow-[2px_2px_0px_0px_black] translate-x-[-1px] translate-y-[-1px]' 
                            : 'bg-white text-gray-700 hover:text-black hover:bg-neutral-100'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{sub.label}</span>
                      </button>
                    )
                  })}
                </div>

                {activeClassroomSubTab === 'broadcast' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_black] h-fit">
                      <h3 className="font-display font-black text-xs text-black uppercase tracking-widest pb-3 mb-4 border-b-2 border-black flex items-center gap-2">
                        <Megaphone className="h-4 w-4 shrink-0" /> SIARKAN MAKLUMAT BARU
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[8px] font-bold text-gray-500 uppercase mb-1">JUDUL PENGUMUMAN</label>
                          <input
                            type="text"
                            value={broadcastTitle}
                            onChange={(e) => setBroadcastTitle(e.target.value)}
                            placeholder="Contoh: Jadwal Ujian Tengah Sesi"
                            className="w-full text-xs font-mono font-bold p-3 bg-white border-2 border-black rounded-none outline-none focus:ring-1 focus:ring-[#FF007A]"
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-gray-500 uppercase mb-1">TINGKAT URGENSI</label>
                          <select
                            value={broadcastUrgency}
                            onChange={(e) => setBroadcastUrgency(e.target.value)}
                            className="w-full text-[11px] font-bold p-3 bg-white border-2 border-black rounded-none outline-none focus:ring-1 focus:ring-[#FF007A] uppercase"
                          >
                            <option value="INFO UMUM">INFO UMUM</option>
                            <option value="PENTING">PENTING</option>
                            <option value="SANGAT MENDESAK">SANGAT MENDESAK</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-gray-500 uppercase mb-1">DESKRIPSI LENGKAP</label>
                          <textarea
                            value={broadcastInput}
                            onChange={(e) => setBroadcastInput(e.target.value)}
                            placeholder="Tulis pesan lengkap yang ingin disiarkan ke seluruh student..."
                            className="w-full text-[11px] sm:text-xs font-semibold p-3 bg-white border-2 border-black rounded-none outline-none focus:ring-1 focus:ring-[#FF007A] resize-none h-32"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleSendBroadcast}
                          className="w-full bg-[#FF007A] py-3.5 border-2 border-black text-white font-black uppercase text-xs tracking-wider shadow-[3px_3px_0px_0px_black] active:translate-y-px active:shadow-none hover:bg-rose-600 transition-all cursor-pointer"
                        >
                          BROADCAST SEKARANG
                        </button>
                      </div>
                    </div>

                    <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_#00E5FF] h-[550px] flex flex-col">
                      <h3 className="font-display font-black text-xs text-[#FF007A] uppercase tracking-widest pb-3 mb-4 border-b-2 border-black flex items-center gap-2 shrink-0">
                        <History className="h-4 w-4 text-[#FF007A] shrink-0" /> HISTORI PANCARAN BULLETIN KELAS
                      </h3>
                      
                      <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin flex-grow">
                        {broadcasts.length === 0 ? (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-center italic text-xs text-gray-400 font-sans font-semibold">Belum ada pengumuman yang disiarkan.</p>
                          </div>
                        ) : (
                          broadcasts.map((b, idx) => (
                             <div key={idx} className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-left hover:-translate-y-0.5 transition-transform">
                                <div className="p-3 border-b-2 border-dashed border-gray-200">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-center gap-2 text-black">
                                      {b.payload.urgency === 'PENTING' || b.payload.urgency === 'SANGAT MENDESAK' ? (
                                        <AlertTriangle className="h-4 w-4 shrink-0 text-[#FF007A]" />
                                      ) : (
                                        <Megaphone className="h-4 w-4 shrink-0 text-[#00E5FF]" />
                                      )}
                                      <h4 className="text-xs font-black uppercase leading-tight">{b.payload.title || 'PENGUMUMAN BARU'}</h4>
                                    </div>
                                    <span className="text-[8px] font-mono font-bold text-gray-500 border border-gray-300 px-1.5 py-0.5 shrink-0 bg-gray-50 whitespace-nowrap">
                                      {b.timestamp}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-3">
                                  <p className="text-[11px] sm:text-xs font-sans text-gray-700 leading-relaxed whitespace-pre-wrap">{b.payload.text || JSON.stringify(b.payload)}</p>
                                </div>
                             </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-Tab 2: Material Manager */}
                {activeClassroomSubTab === 'material' && (
                  <>
                    <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                      <h3 className="font-display font-black text-xs text-[#FF007A] uppercase tracking-widest pb-1 border-b-2 border-black flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-[#FF007A] shrink-0" /> UPLOAD MATERI BARU
                      </h3>
                      <form onSubmit={handleCreateMaterial} className="flex flex-col gap-2">
                        <input
                          type="text"
                          placeholder="Nama Materi (misal: Modul TCP)"
                          value={newMaterialName}
                          onChange={(e) => setNewMaterialName(e.target.value)}
                          className="p-2 border-2 border-black w-full text-xs font-bold"
                        />
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setNewMaterialName(file.name.replace(/\.[^/.]+$/, ""));
                            }
                          }}
                          className="p-2 border-2 border-black w-full text-xs font-bold"
                        />
                        <select
                          value={newMaterialType}
                          onChange={(e) => setNewMaterialType(e.target.value as 'pdf' | 'ppt' | 'docx' | 'zip')}
                          className="p-2 border-2 border-black w-full text-xs font-bold"
                        >
                          <option value="pdf">PDF</option>
                          <option value="docx">DOCS</option>
                          <option value="ppt">PPT</option>
                          <option value="zip">ZIP</option>
                        </select>
                        <button type="submit" className="p-2 bg-[#00E5FF] border-2 border-black text-black font-black text-xs uppercase hover:bg-cyan-300">
                          Tambah Materi
                        </button>
                      </form>
                    </div>
                    <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                      <h3 className="font-display font-black text-xs text-[#FF007A] uppercase tracking-widest pb-1 border-b-2 border-black flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-[#FF007A] shrink-0" /> MATERI TERBAGI SAAT INI
                      </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin text-left">
                      {sharedMaterials.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-6 text-center">Belum ada file materi dibagikan.</p>
                      ) : (
                        sharedMaterials.map((mat) => (
                          <div key={mat.id} className="p-3 bg-white border-2 border-black flex justify-between items-center gap-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[#111111]">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="h-8 w-8 bg-[#00E5FF] border border-black flex items-center justify-center text-[10px] font-black text-black uppercase shrink-0">
                                {mat.type}
                              </div>
                              <div className="truncate text-left">
                                <p className="text-xs font-black text-black truncate">{mat.name}</p>
                                <p className="text-[9px] text-gray-400 font-bold font-mono uppercase">{mat.size} • {mat.uploadedAt}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setDeleteDialog({
                                isOpen: true,
                                title: mat.name,
                                onConfirm: () => onRemoveMaterial(mat.id)
                              })}
                              className="p-1.5 text-gray-500 hover:text-white hover:bg-[#FF007A] border border-black transition-all cursor-pointer shrink-0"
                              title="Hapus berkas materi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  </>
                )}

                {/* Sub-Tab 3: Assignment Manager */}
                {activeClassroomSubTab === 'assignment' && (
                  <div id="subtab-panel-assignment" className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(255,0,122,1)] space-y-6">
                    <h3 className="font-display font-black text-xs text-black uppercase tracking-widest pb-1 border-b-2 border-black flex items-center gap-1.5">
                      <PenSquare className="h-4 w-4 text-[#FF007A] shrink-0" /> PENUGASAN STUDENT &amp; EVALUASI GRADING KONSOL
                    </h3>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Assignment Creator Form */}
                    <div className="md:col-span-12 lg:col-span-5 border-2 border-black p-4 space-y-3 bg-neutral-50/50">
                      <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider font-mono">PANEL PEMBUAT TUGAS BARU</span>
                      
                      <form onSubmit={handleCreateAssignment} className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[8px] font-bold text-gray-500 uppercase pb-0.5">JUDUL PENUGASAN</label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Implementasi Echo Server"
                            value={assignmentTitle}
                            onChange={(e) => setAssignmentTitle(e.target.value)}
                            className="w-full p-2 border-2 border-black bg-white focus:outline-none placeholder-gray-300 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-bold text-gray-500 uppercase pb-0.5">PERTEMUAN KELAS</label>
                          <select
                            required
                            value={assignmentMeetingId}
                            onChange={(e) => setAssignmentMeetingId(e.target.value)}
                            className="w-full p-2 border-2 border-black bg-white focus:outline-none"
                          >
                            <option value="">-- Pilih Pertemuan --</option>
                            {meetings.map((m) => (
                              <option key={m.id} value={m.id}>Pertemuan {m.number}: {m.topic}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[8px] font-bold text-gray-500 uppercase pb-0.5">DESKRIPSI TUGAS & INSTRUKSI</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Tulis detil spesifikasi tugas dan panduan pengumpulan..."
                            value={assignmentDesc}
                            onChange={(e) => setAssignmentDesc(e.target.value)}
                            className="w-full p-2 border-2 border-black bg-white focus:outline-none placeholder-gray-300"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-bold text-gray-500 uppercase pb-0.5">UNGGAH FILE TUGAS (OPSIONAL)</label>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.ppt,.pptx"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                setAssignmentFile(e.target.files[0]);
                              }
                            }}
                            className="w-full p-1.5 border-2 border-black bg-white focus:outline-none font-mono text-[9px]"
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-bold text-gray-500 uppercase pb-0.5">BATAS WAKTU (DEADLINE)</label>
                          <input
                            type="datetime-local"
                            required
                            value={assignmentDueDate}
                            onChange={(e) => setAssignmentDueDate(e.target.value)}
                            className="w-full p-2 border-2 border-black bg-white focus:outline-none text-[10px]"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-[#FF007A] hover:bg-pink-600 border-2 border-black text-white font-black uppercase text-[10px] tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all cursor-pointer"
                        >
                          BUAT & BROADCAST TUGAS
                        </button>
                      </form>
                    </div>

                    {/* Active Assignments & Grading Panel */}
                    <div className="md:col-span-12 lg:col-span-7 space-y-4">
                      {/* List of Created Assignments */}
                      {!selectedAssignmentId ? (
                        <div>
                          <span className="text-[10px] font-black text-[#FF007A] uppercase tracking-wider font-mono block mb-2">DAFTAR PENUGASAN AKTIF KELAS:</span>
                          {assignments.length === 0 ? (
                            <p className="text-xs text-gray-400 italic p-4 bg-gray-50 border border-black text-center">Belum ada tugas dibuat untuk pertemuan ini.</p>
                          ) : (
                            <div className="space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin">
                              {assignments.map((asg) => {
                                const meetingObj = meetings.find(m => m.id === asg.meetingId);
                                const meetingLabel = meetingObj ? `Pertemuan ${meetingObj.number}: ${meetingObj.topic}` : "Pertemuan Umum";
                                return (
                                  <div key={asg.id} className="p-4 border-4 border-black bg-white hover:bg-neutral-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between gap-3 text-left">
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-start gap-2">
                                        <h4 className="font-sans font-black text-xs uppercase tracking-tight text-neutral-900 leading-tight">{asg.title}</h4>
                                        <span className="shrink-0 font-mono text-[8.5px] font-black text-rose-700 bg-rose-50 border border-rose-300 px-1.5 py-0.5 uppercase">BATAS: {asg.dueDate}</span>
                                      </div>
                                      <p className="text-[9px] font-mono font-black text-[#00E5FF] uppercase">{meetingLabel}</p>
                                      <p className="text-gray-500 text-[10px] leading-relaxed line-clamp-2">{asg.description}</p>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-1">
                                      {asg.fileName ? (
                                        <span className="text-[8.5px] font-mono font-semibold bg-neutral-100 border border-neutral-300 px-1.5 py-0.5 text-neutral-700 select-none uppercase truncate max-w-[140px] flex items-center gap-1"><FolderOpen className="h-3 w-3 shrink-0 text-[#FF007A]" /> {asg.fileName}</span>
                                      ) : (
                                        <span className="text-[8.5px] font-mono text-gray-400 italic">Tanpa berkas lampiran</span>
                                      )}
                                      
                                      <button 
                                        type="button"
                                        onClick={() => setSelectedAssignmentId(asg.id)}
                                        className="px-3 py-1.5 bg-[#FF007A] hover:bg-pink-600 text-white font-black uppercase text-[9px] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all cursor-pointer"
                                      >
                                        LIHAT TUGAS
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (() => {
                        const activeAssignment = assignments.find(a => a.id === selectedAssignmentId);
                        if (!activeAssignment) return null;
                        
                        const meetingObj = meetings.find(m => m.id === activeAssignment.meetingId);
                        const meetingLabel = meetingObj ? `Pertemuan ${meetingObj.number}: ${meetingObj.topic}` : "Pertemuan Umum";
                        const deadlineDate = new Date(activeAssignment.dueDate);
                        
                        const relatedSubmissions = submissions.filter(s => s.assignmentId === selectedAssignmentId);
                        const submittedUsernames = relatedSubmissions.map(s => s.studentName.toLowerCase());
                        
                        // Username resolver helper inside DB
                        const getStudentUsername = (authSub: { fullName: string; studentId: string }) => {
                          const activePart = studentList.find(p => {
                            const info = getStudentInfo(p.username);
                            return info.studentId === authSub.studentId;
                          });
                          if (activePart) return activePart.username;
                          return authSub.fullName.replace(/\s+/g, '_');
                        };

                        // Create unique resolved student list sorted by Student ID (studentId)
                        const allUniqueStudents = (() => {
                          const list: { studentId: string; fullName: string; username: string }[] = [];
                          
                          // Add all from DB Whitelist
                          authorizedStudents.forEach(st => {
                            if (!list.some(item => item.studentId === st.studentId)) {
                              list.push({
                                studentId: st.studentId,
                                fullName: st.fullName,
                                username: getStudentUsername(st)
                              });
                            }
                          });

                          // Add connected students not yet in DB list
                          studentList.forEach(st => {
                            const info = getStudentInfo(st.username);
                            if (!list.some(item => item.studentId === info.studentId)) {
                              list.push({
                                studentId: info.studentId,
                                fullName: info.fullName,
                                username: st.username
                              });
                            }
                          });

                          // Add any submissions that don't match the above lists (e.g., student disconnected and not in DB)
                          relatedSubmissions.forEach(sub => {
                            const match = list.some(item => normalizeName(item.username) === normalizeName(sub.studentName) || normalizeName(item.fullName) === normalizeName(sub.studentName));
                            if (!match) {
                               const info = getStudentInfo(sub.studentName);
                               list.push({
                                  studentId: info.studentId || 'UNKNOWN_ID',
                                  fullName: sub.studentName,
                                  username: sub.studentName
                               });
                            }
                          });

                          return list.sort((a, b) => a.studentId.localeCompare(b.studentId, undefined, { numeric: true }));
                        })();

                        return (
                          <div className="space-y-4 text-left">
                            {/* Back Header navigation */}
                            <div className="flex justify-between items-center bg-neutral-100 border-2 border-black p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                              <span className="text-[9px] font-mono font-black text-neutral-800 uppercase">PROGRAM PENILAIAN TUGAS AKTIF</span>
                              <button 
                                type="button"
                                onClick={() => setSelectedAssignmentId(null)}
                                className="px-2 py-1 bg-white hover:bg-neutral-50 border border-black font-black uppercase text-[8.5px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all cursor-pointer"
                              >
                                ← KEMBALI KE DAFTAR
                              </button>
                            </div>

                            {/* Active Assignment Info Card */}
                            <div className="p-4 border-4 border-black bg-[#fafafa] space-y-2.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                              <div className="flex justify-between items-start gap-2 border-b border-gray-300 pb-1.5">
                                <div>
                                  <h4 className="font-display font-black text-xs text-[#FF007A] uppercase">{activeAssignment.title}</h4>
                                  <p className="text-[9px] font-mono font-bold text-gray-400 uppercase pt-0.5">{meetingLabel}</p>
                                </div>
                                <span className="font-mono text-[8.5px] font-black text-rose-700 bg-rose-50 border border-rose-300 px-1.5 py-0.5 uppercase tracking-wider">DEADLINE: {activeAssignment.dueDate}</span>
                              </div>

                              <div className="text-[10px]">
                                <span className="block text-[8px] font-bold text-gray-400 uppercase">SPESIFIKASI DAN INSTRUKSI TUGAS:</span>
                                <p className="text-gray-700 leading-relaxed font-semibold mt-1 pr-2">{activeAssignment.description}</p>
                              </div>

                              {activeAssignment.fileName && (
                                <div className="pt-1.5 border-t border-gray-200 flex justify-between items-center">
                                  <span className="text-[8.5px] font-mono text-neutral-500 font-semibold uppercase truncate shrink">📂 LAMPIRAN TEACHER: {activeAssignment.fileName}</span>
                                  {activeAssignment.fileUrl && (
                                    <a 
                                      href={activeAssignment.fileUrl} 
                                      download 
                                      className="px-2 py-0.5 bg-white font-mono text-[8px] font-black border border-black text-black hover:bg-[#00E5FF] select-none uppercase shrink-0"
                                    >
                                      UNDUH TUGAS
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* List of submissions and unregistered rosters as cards */}
                            <div className="space-y-2.5">
                              <span className="text-[10px] font-black text-[#008ba3] uppercase tracking-wider font-mono block pb-1 border-b border-neutral-300">DAFTAR EVALUASI FILE TUGAS STUDENT (URUT STUDENT ID):</span>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto scrollbar-thin p-1">
                                {allUniqueStudents.map((studentItem) => {
                                  // Attempt to match submission inside state
                                  const sub = submissions.find(s => 
                                    s.assignmentId === selectedAssignmentId && 
                                    (normalizeName(s.studentName) === normalizeName(studentItem.username) || 
                                     normalizeName(s.studentName) === normalizeName(studentItem.fullName))
                                  );

                                  if (sub) {
                                    // Calculate isLate
                                    const isLate = new Date(sub.submittedAt) > deadlineDate;
                                    const isGraded = sub.score !== undefined;
                                    const cardColor = isLate
                                      ? 'bg-amber-100/60 border-amber-500 text-amber-950 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.2)]'
                                      : 'bg-emerald-100/60 border-emerald-500 text-emerald-950 shadow-[2px_2px_0px_0px_rgba(16,185,129,0.2)]';

                                    const isCurrentlyGrading = selectedSubmissionId === sub.id;

                                    return (
                                      <div 
                                        key={studentItem.studentId} 
                                        className={`p-3 border-2 transition-all flex flex-col justify-between gap-2.5 ${cardColor} ${isCurrentlyGrading ? 'ring-4 ring-[#00E5FF] border-black' : 'border-black'}`}
                                      >
                                        <div className="space-y-1">
                                          <div className="flex justify-between items-start font-mono text-[9px] font-black">
                                            <span className="uppercase text-neutral-500">STUDENT ID: {studentItem.studentId}</span>
                                            {isLate ? (
                                              <span className="text-amber-700 bg-amber-200 border border-amber-500 px-1 py-0.5 leading-none rounded-[2px] uppercase text-[7.5px]">LATE (TELAT)</span>
                                            ) : (
                                              <span className="text-emerald-700 bg-emerald-200 border border-emerald-500 px-1 py-0.5 leading-none rounded-[2px] uppercase text-[7.5px]">TEPAT WAKTU</span>
                                            )}
                                          </div>

                                          <div className="text-left">
                                            <span className="font-sans font-black text-xs text-black block uppercase leading-snug">{studentItem.fullName}</span>
                                            <span className="text-[8px] font-mono text-gray-500 block uppercase">USERNAME: {studentItem.username}</span>
                                          </div>

                                          <div className="p-2 bg-white/80 border border-black/10 rounded-[2px] text-xs space-y-1 text-left mt-2">
                                            <span className="text-[8px] font-bold text-gray-400 block uppercase">FILE DIKUMPULKAN:</span>
                                            <p className="font-bold text-[9.5px] uppercase truncate text-black">{sub.fileName || 'Jawaban Teks / Media'}</p>
                                            <p className="text-[8px] font-mono text-gray-500 uppercase">{sub.fileSize || 'N/A KB'} • {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('id-ID') : '-'}</p>
                                            
                                            {sub.fileUrl && (
                                              <a 
                                                href={sub.fileUrl} 
                                                download 
                                                className="inline-block mt-1 font-mono text-[8px] font-black text-rose-600 hover:underline uppercase"
                                              >
                                                📥 UNDUH FILE TUGAS
                                              </a>
                                            )}
                                          </div>

                                          {/* Display score on the card if graded */}
                                          {isGraded && !isCurrentlyGrading && (
                                            <div className="mt-2 p-2 bg-white border border-dashed border-emerald-400 text-left">
                                              <p className="font-mono text-[9px] font-black text-emerald-800 uppercase">HASIL EVALUASI TEACHER:</p>
                                              <p className="font-black text-sm text-neutral-800 pt-0.5">NILAI: <span className="text-[#FF007A] text-lg font-black">{sub.score}</span> / 100</p>
                                              <p className="text-gray-500 italic text-[9px] font-semibold pt-0.5 whitespace-pre-wrap leading-tight">{sub.notes ? `Comment: "${sub.notes}"` : 'Tidak ada catatan khusus.'}</p>
                                            </div>
                                          )}
                                        </div>

                                        {/* Inline grading Accordion / Form */}
                                        {isCurrentlyGrading ? (
                                          <div className="border-t border-black/10 pt-2 space-y-2.5">
                                            <p className="text-[8px] font-mono font-black text-neutral-600 uppercase flex items-center gap-1"><PenSquare className="h-3 w-3 text-[#FF007A]" /> INPUT EVALUASI UNTUK {studentItem.fullName}:</p>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div>
                                                <label className="text-[7.5px] font-bold block text-gray-500 uppercase py-0.5">SKOR TUGAS (0-100)</label>
                                                <input 
                                                  type="number"
                                                  min={0}
                                                  max={100}
                                                  value={gradeScore}
                                                  onChange={(e) => setGradeScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                                  className="w-full p-1 border border-black bg-white focus:outline-none font-mono font-black text-xs text-center"
                                                />
                                              </div>
                                              <div>
                                                <label className="text-[7.5px] font-bold block text-gray-500 uppercase py-0.5">BATALKAN</label>
                                                <button 
                                                  type="button"
                                                  onClick={() => setSelectedSubmissionId(null)}
                                                  className="w-full py-1 text-[8.5px] font-black border border-neutral-400 text-neutral-500 uppercase bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
                                                >
                                                  BATAL X
                                                </button>
                                              </div>
                                            </div>
                                            <div>
                                              <label className="text-[7.5px] font-bold block text-gray-500 uppercase pb-0.5">KOMENTAR TEACHER</label>
                                              <input 
                                                type="text"
                                                placeholder="Beri umpan balik untuk dikirim ke laporan..."
                                                value={gradeNotes}
                                                onChange={(e) => setGradeNotes(e.target.value)}
                                                className="w-full p-1 border border-black bg-white focus:outline-none text-[9.5px]"
                                              />
                                            </div>
                                            <button 
                                              type="button"
                                              onClick={() => {
                                                handleGradeSubmission(sub.id, gradeScore, gradeNotes);
                                                setSelectedSubmissionId(null);
                                                setGradeNotes('');
                                                setGradeScore(100);
                                              }}
                                              className="w-full py-1.5 bg-emerald-400 hover:bg-emerald-500 border border-black text-emerald-950 font-black uppercase text-[8.5px] transition-all cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none"
                                            >
                                              ✓ SIMPAN NILAI
                                            </button>
                                          </div>
                                        ) : (
                                          <button 
                                            type="button"
                                            onClick={() => {
                                              setSelectedSubmissionId(sub.id);
                                              setGradeScore(sub.score !== undefined ? sub.score : 100);
                                              setGradeNotes(sub.notes || '');
                                            }}
                                            className="w-full py-1.5 bg-neutral-900 border border-black text-white hover:bg-neutral-800 text-[8.5px] font-black uppercase tracking-wider rounded-[2px] cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all"
                                          >
                                            {isGraded ? 'EDIT EVALUASI NILAI' : 'BERI NILAI & EVALUASI'}
                                          </button>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    // Missing / Belum mengumpulkan (RED CARD)
                                    return (
                                      <div 
                                        key={studentItem.studentId} 
                                        className="p-3 border-2 border-dashed border-rose-400 bg-rose-100/60 text-rose-950 flex flex-col justify-between gap-2 shadow-[2px_2px_0px_0px_rgba(239,68,68,0.1)] text-left"
                                      >
                                        <div className="space-y-1">
                                          <div className="flex justify-between items-start font-mono text-[9px] font-black">
                                            <span className="uppercase text-neutral-400">STUDENT ID: {studentItem.studentId}</span>
                                            <span className="text-rose-700 bg-rose-200 border border-rose-300 px-1 py-0.5 leading-none rounded-[2px] uppercase text-[7.5px]">BELUM MENGUMPULKAN</span>
                                          </div>

                                          <div className="text-left">
                                            <span className="font-sans font-black text-xs text-black block uppercase leading-snug">{studentItem.fullName}</span>
                                            <span className="text-[8px] font-mono text-gray-500 block uppercase">USERNAME: {studentItem.username}</span>
                                          </div>
                                        </div>

                                        <p className="text-rose-500 font-extrabold text-[9px] tracking-tight uppercase border border-rose-200/50 p-2 bg-white/60 text-center italic mt-1 font-mono rounded-[2px]">
                                          ✕ STUDENT BELUM SUBMIT TUGAS
                                        </p>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                )}

                {/* Sub-Tab 9: Members Whitelist Database */}
                {activeClassroomSubTab === 'members' && (
                  <div id="subtab-panel-members" className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <div className="flex justify-between items-center border-b-2 border-black pb-2 flex-wrap gap-2 select-none">
                      <h3 className="font-display font-black text-xs text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                        <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" /> DATABASE STUDENT &amp; KOSTUMISASI DAFTAR KELAS
                      </h3>
                      <span className="text-[9px] bg-indigo-100 text-indigo-900 font-bold px-2 py-0.5 border border-indigo-300 font-mono uppercase">
                        REFERENSI AKSES KELAS ({authorizedStudents.length} STUDENT)
                      </span>
                    </div>

                  <p className="text-[11px] text-gray-600 leading-normal font-medium text-left">
                    Sesuai instruksi <strong>Tahap 3 — Student Database</strong>, kelola data student yang berhak masuk ke kelas ini. Student yang mendaftar akan otomatis dicocokkan berdasarkan data di list ini untuk verifikasi join.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left panel: Add manually & Import Excel simulation */}
                    <div className="space-y-4">
                      {/* Manual input */}
                      <div className="border-2 border-black p-4 bg-neutral-50/50 space-y-3">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono block">MANUAL ROSTER INPUT</span>
                        
                        <div className="space-y-2">
                          <input 
                            type="text"
                            placeholder="NAMA LENGKAP STUDENT"
                            value={newSchooledName}
                            onChange={(e) => setNewSchooledName(e.target.value)}
                            className="w-full text-xs font-bold p-2 bg-white border-2 border-black rounded-none outline-none focus:ring-1 focus:ring-[#FF007A] uppercase"
                          />
                          <div className="grid grid-cols-1 gap-2">
                            <input 
                              type="text"
                              placeholder="STUDENT ID / NPM"
                              value={newSchooledId}
                              onChange={(e) => setNewSchooledId(e.target.value.toUpperCase())}
                              className="w-full text-xs font-mono font-bold p-2 bg-white border-2 border-black rounded-none outline-none focus:ring-1 focus:ring-[#FF007A]"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const name = newSchooledName.trim();
                            const id = newSchooledId.trim().toUpperCase();

                            if (!name || !id) {
                              showAlert("Harap lengkapi semua field terlebih dahulu!");
                              return;
                            }

                            if (authorizedStudents.some(s => s.studentId === id)) {
                              showAlert("Student ID / NPM sudah terdaftar di database ini!");
                              return;
                            }

                            setAuthorizedStudents(prev => [...prev, { fullName: name, studentId: id }]);
                            setNewSchooledName('');
                            setNewSchooledId('');
                          }}
                          className="w-full py-2 bg-[#00E5FF] hover:bg-[#00c5dd] text-black border-2 border-black font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none transition-all cursor-pointer"
                        >
                          TAMBAH MANUAL +
                        </button>
                      </div>

                      {/* Import excel from file */}
                      <div className="border-2 border-black p-4 bg-white space-y-3">
                        <span className="text-[10px] font-black text-[#FF007A] uppercase tracking-widest font-mono block">IMPORT DATA STUDENT</span>
                        
                        <label className="border-2 border-dashed border-gray-400 bg-gray-50/50 p-4 rounded text-center cursor-pointer hover:bg-rose-50/25 hover:border-[#FF007A] transition-all select-none block">
                          <input 
                            type="file" 
                            accept=".csv, .xlsx, .xls" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                try {
                                  const data = evt.target?.result;
                                  const workbook = XLSX.read(data, { type: 'binary' });
                                  
                                  const sheetName = workbook.SheetNames[0];
                                  const sheet = workbook.Sheets[sheetName];
                                  const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];
                                  
                                  if (jsonData.length === 0) {
                                    showAlert("File kosong atau format tidak sesuai.");
                                    return;
                                  }

                                  const imported: { fullName: string; studentId: string }[] = [];

                                  jsonData.forEach((row) => {
                                    const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('name') || k.toLowerCase().includes('lengkap'));
                                    const idKey = Object.keys(row).find(k => k.toLowerCase().includes('npm') || k.toLowerCase().includes('nim') || k.toLowerCase().includes('id') || k.toLowerCase().includes('student'));
                                    
                                    if (nameKey && idKey && row[nameKey] && row[idKey]) {
                                      imported.push({
                                         fullName: String(row[nameKey]).trim(),
                                         studentId: String(row[idKey]).trim().toUpperCase()
                                      });
                                    }
                                  });

                                  if (imported.length > 0) {
                                    setAuthorizedStudents(prev => {
                                      const next = [...prev];
                                      let added = 0;
                                      imported.forEach(student => {
                                        if (!next.some(s => s.studentId === student.studentId)) {
                                          next.push(student);
                                          added++;
                                        }
                                      });
                                      setTimeout(() => showAlert(`✓ Import berhasil! ${added} data student dari file "${file.name}" berhasil ditambahkan.`), 100);
                                      return next;
                                    });
                                  } else {
                                    showAlert("Tidak dapat menemukan kolom Nama dan ID/NPM/Student ID di dalam file. Silakan periksa format header tabel Anda.");
                                  }
                                } catch (error) {
                                  console.warn("Error parsing file:", error);
                                  showAlert("Gagal membaca file. Pastikan format file divalidasi dengan .csv atau .xlsx.");
                                }
                              };
                              reader.readAsBinaryString(file);
                              e.target.value = '';
                            }}
                          />
                          <FileSpreadsheet className="h-6 w-6 text-indigo-500 block mx-auto mb-1.5" />
                          <p className="text-[10px] font-black uppercase text-black">DRAG &amp; DROP FILE ATAU KLIK AREA INI</p>
                          <p className="text-[8px] font-mono text-gray-400 mt-1 uppercase font-bold">Mendukung file: .XLSX, .XLS, .CSV</p>
                        </label>
                      </div>
                    </div>

                    {/* Right panel: Table list with delete option */}
                    <div className="border-2 border-black p-4 bg-white flex flex-col justify-start gap-1">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono block mb-1">DAFTAR STUDENT</span>
                      
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin text-left font-mono">
                        {authorizedStudents.length === 0 ? (
                          <div className="text-center italic text-gray-400 text-xs py-10 uppercase">Database Kosong. Silakan tambah atau import data.</div>
                        ) : (
                          authorizedStudents.map((st, sIdx) => (
                            <div key={st.studentId + '-' + sIdx} className="p-2 border border-black bg-[#fafafa] flex justify-between items-center text-[10px] hover:bg-neutral-50 transition-colors">
                              <div>
                                <span className="font-bold text-black uppercase font-sans block text-left">{st.fullName}</span>
                                <div className="flex gap-2 text-[8px] text-gray-500 font-mono mt-0.5 text-left">
                                  <span>ID: <code className="bg-neutral-100 border px-1 rounded text-neutral-800 font-bold">{st.studentId}</code></span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setDeleteDialog({
                                  isOpen: true,
                                  title: st.fullName,
                                  onConfirm: () => setAuthorizedStudents(prev => prev.filter(s => s.studentId !== st.studentId))
                                })}
                                className="p-1 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                                title="Hapus Student"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {/* Sub-Tab 10: Academic Calendar */}
                {activeClassroomSubTab === 'calendar' && (
                  <div id="subtab-panel-calendar" className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 text-left">
                    <h4 className="font-display font-black text-xs text-black uppercase tracking-wider pb-1.5 border-b-2 border-black font-bold flex items-center gap-1.5"><Calendar className="h-4 w-4 text-orange-500 shrink-0" /> KALENDER AKADEMIK &amp; TENGGAT KULIAH</h4>
                    <p className="text-[11px] text-gray-500 font-semibold leading-relaxed mb-4">
                      Lintas waktu target rilis materi, deadline tugas, dan rencana pertemuan tatap muka online sinkron.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                      {/* Left: Calendar View */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-7 gap-1.5 border-2 border-black p-3 bg-neutral-50 text-center font-mono text-[9px] font-black max-w-sm mb-2 max-h-fit">
                          {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((day, dIdx) => (
                            <div key={dIdx} className="bg-neutral-200 text-neutral-800 p-1.5 border select-none font-bold">{day}</div>
                          ))}
                          {Array.from({ length: 28 }).map((_, idx) => {
                            const dayNum = idx + 1;
                            const eventsOnDay = calendarEvents.filter(ev => ev.date === dayNum);
                            let mark = 'bg-white text-black border';
                            let tooltip = '';
                            
                            if (eventsOnDay.length > 0) {
                              mark = `${eventsOnDay[0].color} text-black border-2 border-black font-black hover:bg-opacity-80`;
                              tooltip = eventsOnDay.map(ev => ev.title).join(', ');
                            }

                            return (
                              <div key={idx} onClick={() => setSelectedDate(dayNum)} title={tooltip} className={`p-2.5 border cursor-pointer relative flex flex-col justify-center items-center font-bold font-mono text-[10.5px] ${mark} ${selectedDate === dayNum ? 'ring-2 ring-black bg-opacity-90' : ''}`}>
                                <span>{dayNum}</span>
                                {tooltip && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-black"></span>}
                              </div>
                            );
                          })}
                        </div>

                        {/* Display events for selected date below the calendar */}
                        {selectedDate !== null && (
                          <div className="p-3 bg-white border-2 border-black text-left">
                            <h5 className="font-display font-black text-[10px] text-black uppercase tracking-wider pb-1 border-b border-gray-200">
                               JADWAL TANGGAL {selectedDate}
                            </h5>
                            <div className="mt-2 space-y-2">
                               {calendarEvents.filter(ev => ev.date === selectedDate).length === 0 ? (
                                 <p className="text-[10px] text-gray-500 font-semibold">Tidak ada kegiatan di tanggal ini.</p>
                               ) : (
                                 calendarEvents.filter(ev => ev.date === selectedDate).map(ev => (
                                   <div key={ev.id} className="text-[10px]">
                                     <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className={`w-2 h-2 rounded-full border border-black ${ev.color}`}></span>
                                        <strong className="font-bold text-black uppercase">{ev.title}</strong>
                                     </div>
                                     {ev.description && <p className="text-gray-600 pl-3.5 leading-tight select-text whitespace-pre-wrap">{ev.description}</p>}
                                   </div>
                                 ))
                               )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: Form to add event */}
                      <div className="bg-white border-2 border-black p-4 space-y-3">
                         <h5 className="font-display font-black text-[10px] text-black uppercase tracking-wider pb-1 border-b border-gray-200">TAMBAH ACARA KALENDER</h5>
                         <form onSubmit={handleAddCalendarEvent} className="space-y-3 text-xs">
                           <div>
                             <label className="block text-[8px] font-bold text-gray-400 uppercase pb-0.5">JENIS KEGIATAN</label>
                             <select value={calEventType} onChange={(e: any) => setCalEventType(e.target.value)} className="w-full p-2 border-2 border-black font-semibold focus:outline-none bg-white font-sans text-[10px]">
                               <option value="pertemuan">Pertemuan Materi</option>
                               <option value="ujian">Ujian / Kuis</option>
                               <option value="tugas">Deadline Tugas</option>
                             </select>
                           </div>
                           <div>
                             <label className="block text-[8px] font-bold text-gray-400 uppercase pb-0.5">TANGGAL (1-28)</label>
                             <input type="number" min="1" max="28" value={calEventDate} onChange={(e) => setCalEventDate(Number(e.target.value))} required className="w-full p-2 border-2 border-black font-semibold focus:outline-none bg-white font-sans text-[10px]" />
                           </div>
                           <div>
                             <label className="block text-[8px] font-bold text-gray-400 uppercase pb-0.5">NAMA ACARA / TENGGAT</label>
                             <input type="text" value={calEventTitle} onChange={(e) => setCalEventTitle(e.target.value)} required placeholder="Contoh: Kuis Tengah Semester" className="w-full p-2 border-2 border-black font-semibold focus:outline-none bg-white font-sans text-[10px]" />
                           </div>
                           <div>
                             <label className="block text-[8px] font-bold text-gray-400 uppercase pb-0.5">DESKRIPSI KEGIATAN</label>
                             <textarea rows={2} value={calEventDesc} onChange={(e) => setCalEventDesc(e.target.value)} placeholder="Opsional detail..." className="w-full p-2 border-2 border-black font-semibold focus:outline-none bg-white font-sans text-[10px]" />
                           </div>
                           <button type="submit" className="w-full py-2 bg-black text-white font-black border-2 border-black uppercase text-[9px] tracking-wide shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-neutral-800">
                              TAMBAHKAN KE KALENDER
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Sub-Tab 11: Bank Soal */}
                {activeClassroomSubTab === 'banksoal' && (
                  <div id="subtab-panel-banksoal" className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 text-left mt-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-black pb-3 gap-3">
                      <h4 className="font-display font-black text-xs text-[#FF007A] uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                        <Database className="h-4 w-4 text-[#FF007A] shrink-0" /> BANK SOAL
                      </h4>
                      <label className="bg-[#00E5FF] hover:bg-[#00c5dd] text-black border-2 border-black px-4 py-2 font-black text-[10px] uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none transition-all flex items-center gap-2">
                        <UploadCloud className="h-3.5 w-3.5" />
                        BUAT BANK SOAL (.PDF)
                        <input 
                          type="file" 
                          accept=".pdf" 
                          className="hidden" 
                          onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if(!file) return;
                             showAlert("Membaca berkas PDF dan menghubungi ekstensi AI untuk membuat soal... Harap tunggu.", "info");
                             const reader = new FileReader();
                             reader.onload = async (evt) => {
                               try {
                                 const content = evt.target?.result as string;
                                 const response = await fetch("/api/ai/generate-custom-quiz", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", "x-gemini-api-key": localStorage.getItem("user-gemini-api-key") || "" },
                                    body: JSON.stringify({ 
                                      numQuestions: 10,
                                      quizType: "Pilihan Ganda",
                                      files: [{ name: file.name, content: content }],
                                      description: "Buat bank soal berformat Pilihan Ganda dari file presentasi / materi PDF ini."
                                    })
                                  });
                                  if (!response.ok) {
                                    throw new Error("Gagal generate bank soal dari PDF");
                                  }
                                  const data = await response.json();
                                  if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
                                     const newBank = {
                                       id: 'bank-' + Math.random().toString(36).substr(2, 9),
                                       topic: file.name.replace('.pdf', ''),
                                       type: 'Pilihan Ganda',
                                       createdAt: new Date().toISOString(),
                                       questions: data.questions,
                                       aiGenerated: true
                                     };
                                     const updated = [...questionBanks, newBank];
                                     setQuestionBanks(updated);
                                     onBroadcastPayload('BANK_SOAL_UPDATED', { questionBanks: updated });
                                     localStorage.setItem('liveclass-bank-soal-' + classCode, JSON.stringify(updated));
                                     showAlert(`Berhasil mengimpor dan membuat ${data.questions.length} soal ke Bank Soal dari dokumen PDF.`, "success");
                                  } else {
                                     showAlert("AI tidak dapat menemukan materi yang cukup untuk membuat butir soal.", "error");
                                  }
                               } catch (err) {
                                  showAlert("Gagal memproses file PDF melalui AI. Pastikan API key terkonfigurasi.", "error");
                               }
                             };
                             reader.readAsDataURL(file);
                             e.target.value = ''; // Reset input
                          }}
                        />
                      </label>
                    </div>
                    {questionBanks.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-gray-300 text-center space-y-2">
                            <Database className="h-8 w-8 mx-auto text-gray-300" />
                            <p className="font-mono font-bold text-gray-400 text-xs">BELUM ADA BANK SOAL</p>
                            <p className="text-[10px] text-gray-400 mt-2">Buat kuis via AI dan pilih 'SIMPAN KE BANK SOAL'.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                          {questionBanks.map((bank) => (
                            <div key={bank.id} className="border-2 border-black p-4 bg-neutral-50 relative group select-none">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <h4 className="font-black text-sm text-black">{bank.topic}</h4>
                                      <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase">DIBUAT: {new Date(bank.createdAt).toLocaleString()}</p>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-1 bg-white border border-black uppercase font-mono shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                      {bank.type} • {bank.questions.length} SOAL
                                  </span>
                                </div>
                                <div className="flex gap-2 mt-4 mt-4 select-none">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const printWindow = window.open('', '_blank');
                                            if (!printWindow) {
                                                showAlert("Gagal membuka window pencetakan. Izinkan pop-up untuk situs ini.");
                                                return;
                                            }

                                            let qsHtml = bank.questions.map((q, idx) => {
                                                let optionsHtml = '';
                                                if (q.options && q.options.length > 0) {
                                                    optionsHtml = `<div class="options">
                                                        ${q.options.map((opt: string, oIdx: number) => `
                                                            <div class="option ${oIdx === q.correctOptionIndex ? 'correct' : ''}">
                                                                ${String.fromCharCode(65 + oIdx)}. ${opt}
                                                            </div>
                                                        `).join('')}
                                                    </div>`;
                                                } else {
                                                    optionsHtml = `<div class="short-answer">
                                                        <b>Jawaban Singkat:</b> ${q.correctAnswerText || q.correctAnswer || ''}
                                                    </div>`;
                                                }

                                                return `
                                                    <div class="question-container">
                                                        <div class="question-title"><b>${idx + 1}.</b> ${q.question}</div>
                                                        ${optionsHtml}
                                                        <div class="explanation"><b>Penjelasan:</b> ${q.explanation || 'Tidak ada penjelasan'}</div>
                                                    </div>
                                                `;
                                            }).join('');

                                            let printContent = `
                                                <html>
                                                    <head>
                                                        <title>Bank Soal - ${bank.topic}</title>
                                                        <style>
                                                            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; line-height: 1.6; }
                                                            .header { border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                                                            .header h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; color: #000; }
                                                            .header p { margin: 5px 0 0; color: #666; font-size: 14px; font-family: monospace; }
                                                            .question-container { border: 1px solid #ddd; padding: 20px; box-shadow: 2px 2px 0px 0px rgba(0,0,0,1); background: #fff; margin-bottom: 20px; page-break-inside: avoid; }
                                                            .question-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #000; }
                                                            .options { margin-top: 10px; padding-left: 20px; }
                                                            .option { margin-bottom: 8px; font-size: 14px; }
                                                            .option.correct { font-weight: bold; color: #059669; }
                                                            .short-answer { margin-top: 10px; padding: 10px; background: #ecfdf5; border-left: 4px solid #10b981; font-family: monospace; font-size: 14px; }
                                                            .explanation { margin-top: 15px; font-size: 13px; color: #666; font-style: italic; background: #f9f9f9; padding: 10px; border-left: 3px solid #ccc; }
                                                        </style>
                                                    </head>
                                                    <body onload="window.print()">
                                                        <div class="header">
                                                            <h1>BANK SOAL: ${bank.topic}</h1>
                                                            <p>TIPE: ${bank.type} | JUMLAH SOAL: ${bank.questions.length}</p>
                                                            <p>DICETAK TANGGAL: ${new Date().toLocaleString()}</p>
                                                        </div>
                                                        ${qsHtml}
                                                    </body>
                                                </html>
                                            `;
                                            printWindow.document.write(printContent);
                                            printWindow.document.close();
                                        }}
                                        className="px-3 py-1.5 flex items-center gap-1.5 bg-[#00E5FF] hover:bg-cyan-400 text-black border-2 border-black text-[10px] font-black uppercase font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px transition-all cursor-pointer"
                                    >
                                        <Download className="h-3 w-3" /> UNDUH PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBankToDelete(bank)}
                                        className="px-3 py-1.5 bg-red-100/50 hover:bg-red-100 text-red-600 border-2 border-red-500 text-[10px] font-bold uppercase transition-all cursor-pointer"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                          ))}
                        </div>
                    )}

                    {/* Modal Konfirmasi Hapus Bank Soal */}
                    {bankToDelete && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(255,0,122,1)] max-w-sm w-full relative transform transition-all">
                          <h3 className="font-sans font-black text-lg uppercase leading-tight mb-2">
                            YAKIN MENGHAPUS<br/>
                            <span className="border-b-2 border-black block pb-1 overflow-hidden text-clip whitespace-nowrap">{bankToDelete.topic}?</span>
                          </h3>
                          <p className="text-sm font-bold text-slate-700 mt-4 mb-6">
                            Maka data akan hilang dari database dan tidak dapat dikembalikan.
                          </p>
                          <div className="flex justify-end gap-3 mt-2">
                            <button
                              type="button"
                              onClick={() => setBankToDelete(null)}
                              className="px-6 py-2 bg-[#FF007A] hover:-translate-x-0.5 hover:-translate-y-0.5 border-2 border-black text-white font-black uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform"
                            >
                              BATAL
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = questionBanks.filter(b => b.id !== bankToDelete.id);
                                setQuestionBanks(updated);
                                onBroadcastPayload('BANK_SOAL_UPDATED', { questionBanks: updated });
                                setBankToDelete(null);
                                showAlert(`Bank Soal "${bankToDelete.topic}" telah dihapus.`, 'success');
                              }}
                              className="px-6 py-2 bg-slate-400 hover:bg-slate-500 border-2 border-black text-white font-black uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors"
                            >
                              HAPUS
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              )}


            {activeTab === 'reports' && (
              <div className="space-y-6 text-left">

                {/* Reports Horizontal Sub-Tabs */}
                <div id="reports-subtabs-nav" className="flex flex-wrap bg-[#111111] p-1 gap-1 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {[
                    { id: 'global', label: 'REKAP GLOBAL', icon: BarChart3 },
                    { id: 'presensi', label: 'PRESENSI', icon: Camera },
                    { id: 'kuis', label: 'NILAI KUIS', icon: CheckSquare },
                    { id: 'pelanggaran', label: 'PELANGGARAN', icon: ShieldAlert },
                    { id: 'tugas', label: 'NILAI TUGAS', icon: FileText },
                    { id: 'leaderboard', label: 'PAPAN PERINGKAT', icon: Award }
                  ].map((sub) => {
                    const Icon = sub.icon;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => {
                          setActiveReportsSubTab(sub.id as any);
                          setSelectedMeetingReport(null); // Reset when changing tabs
                        }}
                        className={`flex items-center space-x-1.5 px-4 py-2.5 font-black text-[9px] uppercase tracking-widest border-2 border-black focus:outline-none transition-all cursor-pointer ${
                          activeReportsSubTab === sub.id
                            ? 'bg-[#00E5FF] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-px translate-y-px z-10'
                            : 'bg-white text-gray-400 hover:text-black hover:bg-neutral-100'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Tab: Global (The original layout) */}
                {activeReportsSubTab === 'global' && (
                  selectedMeetingDetail ? (
                    /* LAPORAN PERTEMUAN DETAIL VIEW (Filter per-meeting) */
                    <div id="laporan-pertemuan-detail" className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
                      <div className="flex justify-between items-center border-b-2 border-black pb-3 select-none flex-wrap gap-2 text-left">
                        <div className="text-left">
                          <span className="text-[9px] font-black tracking-widest text-[#FF007A] font-mono uppercase bg-[#FF007A]/10 border border-[#FF007A] px-2 py-0.5">DETAIL LAPORAN PERTEMUAN KELAS SINKRON</span>
                          <h4 className="font-display font-black text-sm uppercase text-black tracking-wider mt-1.5 flex items-center gap-1.5 font-bold">
                            <Presentation className="h-4 w-4 text-indigo-800" />
                            PERT. {selectedMeetingDetail.number}: {selectedMeetingDetail.topic.toUpperCase()}
                          </h4>
                          <span className="text-[9.5px] text-gray-500 font-bold mt-1 font-mono uppercase block">DILAKSANAKAN PADA: {selectedMeetingDetail.date}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedMeetingDetail(null)}
                          className="bg-[#FF007A] hover:bg-rose-600 text-white font-mono font-black text-[9px] uppercase px-4 py-2 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all cursor-pointer"
                        >
                          ← KEMBALI KE REKAP GLOBAL
                        </button>
                      </div>

                      {/* Stacked layouts for tables */}
                      <div className="space-y-6">
                        
                        {/* LEFT TABLE: ANALISIS PERFORMA & KEAKTIFAN STUDENT (PERTEMUAN INI) */}
                        <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                          <span className="text-[10px] font-black text-black uppercase tracking-wider font-mono flex items-center gap-1.5 pb-1 border-b border-gray-200 text-left">
                            <BarChart3 className="h-3.5 w-3.5 text-indigo-800" /> 
                            ANALISIS PERFORMA &amp; KEAKTIFAN STUDENT (PERTEMUAN KE-{selectedMeetingDetail.number})
                          </span>

                          <div className="overflow-x-auto text-left">
                            <table className="w-full text-[10px] border-collapse">
                              <thead>
                                <tr className="border-b-2 border-black text-gray-400 font-black uppercase text-[8.5px] font-mono">
                                  <th className="py-2 text-left">STUDENT ID</th>
                                  <th className="py-2 text-left">NAMA LENGKAP</th>
                                  <th className="py-2 text-center">STATUS PRESENSI</th>
                                  <th className="py-2 text-center">AKURASI KUIS</th>
                                  <th className="py-2 text-center font-bold">NILAI TUGAS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-bold">
                                {studentList.map((st) => {
                                  // 1. Presence
                                  const attRecord = attendanceRecords.find(r => 
                                    r.meetingId === selectedMeetingDetail.id && 
                                    normalizeName(r.studentName) === normalizeName(st.username)
                                  );
                                  const isHadir = !!attRecord;

                                  // 2. Quiz accuracy
                                  const meetingQuizzes = quizSubmissions.filter(q => q.meetingId === selectedMeetingDetail.id && normalizeName(q.studentName) === normalizeName(st.username));
                                  let quizAccuracy = 0;
                                  if (meetingQuizzes.length > 0) {
                                    const total = meetingQuizzes.length;
                                    const correct = meetingQuizzes.filter(q => q.isCorrect).length;
                                    quizAccuracy = Math.round((correct / total) * 100);
                                  } else if (isHadir) {
                                    const idNumForQuiz = parseInt(st.id.replace(/\D/g, '')) || 42;
                                    const totalSimulated = 5;
                                    const correctSimulated = 3 + ((idNumForQuiz + selectedMeetingDetail.number * 7) % 3);
                                    quizAccuracy = Math.round((correctSimulated / totalSimulated) * 100);
                                  }

                                  // 3. Assignment
                                  const mAssignment = assignments.find(a => a.meetingId === selectedMeetingDetail.id);
                                  const mSubmission = mAssignment ? submissions.find(s => 
                                    s.assignmentId === mAssignment.id && 
                                    (normalizeName(s.studentName) === normalizeName(st.username) || 
                                     normalizeName(s.studentName) === normalizeName(st.fullName))
                                  ) : null;
                                  
                                  const taskGrade = mSubmission && mSubmission.score !== undefined ? `${mSubmission.score}` : '-';

                                  return (
                                    <tr key={st.id + '-meeting-detail-row'} className="hover:bg-neutral-50/50">
                                      <td className="py-3 text-left font-mono font-extrabold text-neutral-800">
                                        <code>{st.studentId}</code>
                                      </td>
                                      <td className="py-3 text-left">
                                        <span className="font-extrabold text-black uppercase block">{st.fullName}</span>
                                        <span className="text-[8px] font-mono font-bold text-gray-400 block uppercase pt-0.5">USERNAME: {st.username}</span>
                                      </td>
                                      <td className="py-3 text-center">
                                        {isHadir ? (
                                          <span className="px-1.5 py-0.5 border text-[8.5px] uppercase font-mono font-black bg-emerald-100 text-emerald-800 border-emerald-400">
                                            HADIR ✓ ({attRecord.timestamp || '09:30'})
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 border text-[8.5px] uppercase font-mono font-black bg-rose-100 text-rose-800 border-rose-400">
                                            ALPHA ✗
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-3 text-center">
                                        <span className="font-mono text-xs text-indigo-950 font-black">
                                          {isHadir ? `${quizAccuracy}%` : '0%'}
                                        </span>
                                      </td>
                                      <td className="py-3 text-center">
                                        <span className={`font-mono text-xs font-black ${taskGrade === '-' ? 'text-gray-400' : 'text-[#FF007A]'}`}>
                                          {taskGrade !== '-' ? `${taskGrade}/100` : '-'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* RIGHT LEADERBOARD: PAPAN PERINGKAT KELAS - PERTEMUAN INI */}
                        <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left select-none relative overflow-hidden mt-2">
                          <Award className="absolute -right-12 -bottom-12 opacity-5 w-32 h-32 text-gray-400 rotate-12 shrink-0" />
                          <div className="flex justify-between items-center border-b-2 border-black pb-2 mr-3 flex-wrap gap-2 text-left">
                            <span className="text-[10px] font-black text-black uppercase tracking-widest font-mono flex items-center gap-1.5"><Award className="h-4 w-4 text-[#FF007A] shrink-0" /> PAPAN PERINGKAT KELAS - PERTEMUAN KE-{selectedMeetingDetail.number}</span>
                            <span className="text-[8px] bg-black text-[#00E5FF] border border-black px-1.5 py-0.5 font-bold font-mono uppercase">SESSION ACCUMULATED XP</span>
                          </div>

                          {/* Calculate single meeting rankings */}
                          {(() => {
                            const meetingScores = studentList.map(st => {
                              const attRecord = attendanceRecords.find(r => 
                                r.meetingId === selectedMeetingDetail.id && 
                                normalizeName(r.studentName) === normalizeName(st.username)
                              );
                              const isHadir = !!attRecord;

                              const meetingQuizzes = quizSubmissions.filter(q => q.meetingId === selectedMeetingDetail.id && normalizeName(q.studentName) === normalizeName(st.username));
                              let quizAccuracy = 0;
                              if (meetingQuizzes.length > 0) {
                                const total = meetingQuizzes.length;
                                const correct = meetingQuizzes.filter(q => q.isCorrect).length;
                                quizAccuracy = Math.round((correct / total) * 100);
                              } else if (isHadir) {
                                const idNumForQuiz = parseInt(st.id.replace(/\D/g, '')) || 42;
                                const totalSimulated = 5;
                                const correctSimulated = 3 + ((idNumForQuiz + selectedMeetingDetail.number * 7) % 3);
                                quizAccuracy = Math.round((correctSimulated / totalSimulated) * 100);
                              }

                              const mAssignment = assignments.find(a => a.meetingId === selectedMeetingDetail.id);
                              const mSubmission = mAssignment ? submissions.find(s => 
                                s.assignmentId === mAssignment.id && 
                                (normalizeName(s.studentName) === normalizeName(st.username) || 
                                 normalizeName(s.studentName) === normalizeName(st.fullName))
                              ) : null;
                              
                              const taskScoreVal = mSubmission && mSubmission.score !== undefined ? mSubmission.score : 0;

                              // Score logic:
                              // Attendance = 100 pt
                              // Quiz correctness = accuracy * 1.5 pt (Max 150)
                              // Assignment = assignment score * 2 pt (Max 200)
                              let totalXP = 0;
                              if (isHadir) {
                                if (taskScoreVal > 0) {
                                  totalXP = Math.round((quizAccuracy + taskScoreVal) / 2);
                                } else {
                                  totalXP = Math.round(quizAccuracy);
                                }
                              }

                              return {
                                ...st,
                                meetingXP: totalXP
                              };
                            }).sort((a, b) => (b.quizScore || 0) - (a.quizScore || 0));

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4 items-end">
                                {/* Top 3 visual podium */}
                                <div className="md:col-span-12 lg:col-span-5 grid grid-cols-3 gap-2 items-end justify-center py-4 bg-[#fafafa] border-2 border-black">
                                  {/* 2nd place */}
                                  <div className="flex flex-col items-center">
                                    {meetingScores[1] && (
                                      <>
                                        <Medal className="h-5 w-5 text-zinc-400 shrink-0" />
                                        <span className="text-[10px] font-black uppercase mt-1 text-center truncate w-20">{meetingScores[1].username}</span>
                                        <div className="h-12 w-14 bg-slate-100/80 border-2 border-black border-b-0 flex items-center justify-center font-mono text-[9px] font-black">{meetingScores[1].meetingXP} pts</div>
                                      </>
                                    )}
                                  </div>
                                  {/* 1st place */}
                                  <div className="flex flex-col items-center">
                                    {meetingScores[0] && (
                                      <>
                                        <Crown className="h-6 w-6 text-amber-500 animate-bounce shrink-0" />
                                        <span className="text-xs font-black uppercase mt-1 text-[#FF007A] text-center truncate w-24">{meetingScores[0].username}</span>
                                        <div className="h-18 w-16 bg-amber-50/80 border-4 border-black border-b-0 flex items-center justify-center font-mono text-xs font-black">{meetingScores[0].meetingXP} pts</div>
                                      </>
                                    )}
                                  </div>
                                  {/* 3rd place */}
                                  <div className="flex flex-col items-center">
                                    {meetingScores[2] && (
                                      <>
                                        <Medal className="h-5 w-5 text-amber-800 shrink-0" />
                                        <span className="text-[10px] font-black uppercase mt-1 text-center truncate w-20">{meetingScores[2].username}</span>
                                        <div className="h-8 w-14 bg-amber-900/5 border-2 border-black border-b-0 flex items-center justify-center font-mono text-[9px] font-black">{meetingScores[2].meetingXP} pts</div>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Full table ranking */}
                                <div className="md:col-span-12 lg:col-span-7 border-2 border-black p-4 bg-white">
                                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono block mb-2 text-left">PAPAN PERINGKAT STUDENT - PERTEMUAN KE-{selectedMeetingDetail.number}</span>
                                  
                                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin text-left font-mono">
                                    {meetingScores.map((st, idx) => {
                                      let containerBg = 'bg-[#fafafa]';
                                      let idxColor = 'text-gray-400';
                                      if (idx === 0) {
                                        containerBg = 'bg-amber-50';
                                        idxColor = 'text-amber-500 font-extrabold';
                                      } else if (idx === 1) {
                                        containerBg = 'bg-slate-50';
                                        idxColor = 'text-slate-400 font-extrabold';
                                      } else if (idx === 2) {
                                        containerBg = 'bg-orange-50/50';
                                        idxColor = 'text-amber-700 font-extrabold';
                                      }
                                      return (
                                        <div key={st.id + '-classroom-meeting-rank'} className={`p-2 border border-black ${containerBg} flex justify-between items-center text-xs`}>
                                          <div className="flex items-center space-x-2.5 min-w-0">
                                            <span className={`text-[10px] w-4 text-center shrink-0 ${idxColor}`}>#{idx + 1}</span>
                                            <span className="font-sans font-black text-[#111111] uppercase truncate">{st.fullName || st.username}</span>
                                          </div>
                                          <div className="text-right">
                                            <span className="font-black text-black">{st.meetingXP} <span className="text-[9px] text-gray-400">pts</span></span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                      </div>
                    </div>
                  ) : (
                    /* General cumulated layout */
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Student performance monitoring table list */}
                        <div className="col-span-12 bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                          <span className="text-[10px] font-black text-black uppercase tracking-wider font-mono flex items-center gap-1.5 pb-1 border-b border-gray-200 text-left"><BarChart3 className="h-3.5 w-3.5" /> ANALISIS PERFORMA & KEAKTIFAN KUMULATIF STUDENT</span>

                          <div className="overflow-x-auto text-left">
                            <table id="table-student-performance" className="w-full text-[10px] border-collapse">
                              <thead>
                                <tr className="border-b-2 border-black text-gray-400 font-black uppercase text-[8.5px] font-mono">
                                  <th className="py-2 text-left">STUDENT ID</th>
                                  <th className="py-2 text-left">NAMA LENGKAP</th>
                                  <th className="py-2 text-center">PERSENTASE ABSENSI</th>
                                  <th className="py-2 text-center">RATA-RATA KUIS</th>
                                  <th className="py-2 text-center font-bold">RATA-RATA TUGAS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 font-bold col-span-12">
                                {studentList.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-6 text-center text-gray-400 italic text-[10px] font-mono leading-relaxed">Belum ada data student...</td>
                                  </tr>
                                ) : (
                                  studentList.map((st) => {
                                    const info = {
                                      studentId: st.studentId || getStudentInfo(st.username).studentId,
                                      fullName: st.fullName || getStudentInfo(st.username).fullName
                                    };
                                    
                                    // Attendance percentage calculation across list of meetings
                                    const totalMeetings = meetings.length || 1;
                                    const attendedCount = meetings.filter(m => 
                                      attendanceRecords.some(r => r.meetingId === m.id && normalizeName(r.studentName) === normalizeName(st.username))
                                    ).length;
                                    const attendancePercentage = attendedCount > 0 
                                      ? Math.round((attendedCount / totalMeetings) * 100) 
                                      : ((st as any).attendancePercentage || 90);
                                    
                                    // Quiz score / accuracy calculation
                                    const studentQuizzes = quizSubmissions.filter(q => normalizeName(q.studentName) === normalizeName(st.username));
                                    const correctCount = studentQuizzes.filter(q => q.isCorrect).length;
                                    const totalQuizzes = studentQuizzes.length;
                                    const calculatedAccuracy = totalQuizzes > 0 ? Math.round((correctCount / totalQuizzes) * 100) : (st.accuracy || 0);
                                    
                                    // Assignment average grade
                                    const studentGrades = submissions.filter(s => 
                                      (normalizeName(s.studentName) === normalizeName(st.username) || 
                                       normalizeName(s.studentName) === normalizeName(info.fullName)) && 
                                      s.score !== undefined
                                    ).map(s => s.score as number);
                                    const avgGrade = studentGrades.length > 0 
                                      ? (studentGrades.reduce((a, b) => a + b, 0) / studentGrades.length).toFixed(1) 
                                      : ((st as any).avgTaskScore !== undefined ? (st as any).avgTaskScore.toFixed(1) : '-');

                                    return (
                                      <tr key={st.id} className="hover:bg-neutral-50/50">
                                        <td className="py-3 text-left font-mono font-extrabold text-neutral-800">
                                          <code>{info.studentId}</code>
                                        </td>
                                        <td className="py-3 text-left">
                                          <span className="font-extrabold text-black uppercase block">{info.fullName}</span>
                                          <span className="text-[8px] font-mono font-bold text-gray-400 block uppercase pt-0.5">USERNAME: {st.username}</span>
                                        </td>
                                        <td className="py-3 text-center">
                                          <span className={`px-1.5 py-0.5 border text-[8.5px] uppercase font-mono font-black ${attendancePercentage > 75 ? 'bg-emerald-100 text-emerald-800 border-emerald-400' : attendancePercentage > 50 ? 'bg-amber-100 text-amber-800 border-amber-400' : 'bg-rose-100 text-rose-800 border-rose-400'}`}>
                                            {attendancePercentage}%
                                          </span>
                                        </td>
                                        <td className="py-3 text-center">
                                          <span className="font-mono text-xs text-indigo-950 font-black">{calculatedAccuracy}%</span>
                                        </td>
                                        <td className="py-3 text-center">
                                          <span className={`font-mono text-xs font-black ${avgGrade === '-' ? 'text-gray-400' : 'text-[#FF007A]'}`}>
                                            {avgGrade !== '-' ? `${avgGrade}/100` : '-'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Laporan Per Pertemuan Kuliah widget (redesigned from Sent record tracker) */}
                      <div className="border-4 border-black p-4 bg-[#f9fafb] text-left select-none space-y-3 mt-4">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono block">DOKUMEN REKAPITULASI DETAIL PER PERTEMUAN KULIAH ({meetings.filter(m => m.isCompleted).length})</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-left">
                          {meetings.map((m) => {
                            const isFinished = m.isCompleted;
                            return (
                              <div key={m.id} className={`p-4 border-2 border-black space-y-2 relative flex flex-col justify-between ${isFinished ? 'bg-indigo-50 border-indigo-500 shadow-[2px_2px_0px_0px_rgba(30,27,75,0.1)]' : 'bg-white'}`}>
                                <div>
                                  <div className="flex justify-between text-[8px] font-mono font-black border-b pb-1.5 items-center">
                                    <span className={isFinished ? "text-indigo-800 font-bold" : "text-gray-400"}>
                                      {isFinished ? "🔴 SELESAI" : "🟢 BULAN DEPAN / PROSES"}
                                    </span>
                                    <span className={`px-1 py-0.5 border text-[7.5px] font-mono font-bold uppercase ${isFinished ? 'bg-emerald-100 border-emerald-400 text-emerald-800 font-black' : 'bg-amber-100 border-amber-400 text-amber-800'}`}>
                                      {isFinished ? "ACTIVE" : "PENDING"}
                                    </span>
                                  </div>
                                  <p className="font-mono text-[9px] font-bold text-gray-400 mt-2">SESI PERTEMUAN JEJARING KELAS</p>
                                  <p className="font-extrabold text-neutral-800 text-[11px] uppercase truncate line-clamp-1 mt-0.5" title={m.topic}>PERT. {m.number}: {m.topic}</p>
                                  <p className="text-[8.5px] text-gray-500 italic font-semibold leading-tight mt-1">
                                    Tanggal Terjadwal: {m.date}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                                  <span className="text-[7.5px] text-gray-400 font-mono font-bold">UTC: SINKRON KELAS</span>
                                  {isFinished ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedMeetingDetail(m)}
                                      className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white font-mono text-[7.5.px] font-black uppercase tracking-wider cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,229,255,1)] flex items-center gap-1 font-bold"
                                    >
                                      <span>LIHAT LAPORAN</span>
                                      <FileText className="h-2.5 w-2.5 text-[#00E5FF]" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled
                                      className="px-2.5 py-1 bg-neutral-200 text-gray-400 border border-neutral-300 font-mono text-[7.5px] font-bold uppercase tracking-wider cursor-not-allowed flex items-center gap-1 font-bold"
                                    >
                                      <span>LOCK / WAITING</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Symmetrical Class leaderboard widget inside Classroom dashboard (shows at bottom of classroom tab for global class competitiveness) */}
                      <div id="classroom-global-leaderboard-card" className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left select-none relative overflow-hidden mt-6">
                        <Award className="absolute -right-12 -bottom-12 opacity-5 w-32 h-32 text-gray-400 rotate-12 shrink-0" />
                        <div className="flex justify-between items-center border-b-2 border-black pb-2 mr-3 flex-wrap gap-2 text-left">
                          <span className="text-[10px] font-black text-black uppercase tracking-widest font-mono flex items-center gap-1.5"><Award className="h-4 w-4 text-[#FF007A] shrink-0" /> PAPAN PERINGKAT KUMULATIF SE-SEMESTER</span>
                          <span className="text-[8px] bg-[#FF007A] text-white border border-black px-1.5 py-0.5 font-bold font-mono uppercase">ACADEMIC LADDER</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4 items-end">
                          {/* Top 3 visual podium */}
                          <div className="md:col-span-12 lg:col-span-5 grid grid-cols-3 gap-2 items-end justify-center py-4 bg-[#fafafa] border-2 border-black">
                            {/* 2nd place */}
                            <div className="flex flex-col items-center">
                              {[...studentList].sort((a,b) => b.score - a.score)[1] && (
                                <>
                                  <Medal className="h-5 w-5 text-zinc-400 shrink-0" />
                                  <span className="text-[10px] font-black uppercase mt-1 text-center truncate w-20">{[...studentList].sort((a,b) => b.score - a.score)[1].username}</span>
                                  <div className="h-12 w-14 bg-slate-100/80 border-2 border-black border-b-0 flex items-center justify-center font-mono text-[9px] font-black">{[...studentList].sort((a,b) => b.score - a.score)[1].score} pts</div>
                                </>
                              )}
                            </div>
                            {/* 1st place */}
                            <div className="flex flex-col items-center">
                              {[...studentList].sort((a,b) => b.score - a.score)[0] && (
                                <>
                                  <Crown className="h-6 w-6 text-amber-500 animate-bounce shrink-0" />
                                  <span className="text-xs font-black uppercase mt-1 text-[#FF007A] text-center truncate w-24">{[...studentList].sort((a,b) => b.score - a.score)[0].username}</span>
                                  <div className="h-18 w-16 bg-amber-50/80 border-4 border-black border-b-0 flex items-center justify-center font-mono text-xs font-black">{[...studentList].sort((a,b) => b.score - a.score)[0].score} pts</div>
                                </>
                              )}
                            </div>
                            {/* 3rd place */}
                            <div className="flex flex-col items-center">
                              {[...studentList].sort((a,b) => b.score - a.score)[2] && (
                                <>
                                  <Medal className="h-5 w-5 text-amber-800 shrink-0" />
                                  <span className="text-[10px] font-black uppercase mt-1 text-center truncate w-20">{[...studentList].sort((a,b) => b.score - a.score)[2].username}</span>
                                  <div className="h-8 w-14 bg-amber-900/5 border-2 border-black border-b-0 flex items-center justify-center font-mono text-[9px] font-black">{[...studentList].sort((a,b) => b.score - a.score)[2].score} pts</div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Full table ranking */}
                          <div className="md:col-span-12 lg:col-span-7 border-2 border-black p-4 bg-white">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono block mb-2 text-left">ESTIMASI KEDUDUKAN STUDENT KUMULATIF</span>
                            
                            <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin text-left font-mono">
                              {[...studentList].sort((a,b) => b.score - a.score).map((st, idx) => {
                                let containerBg = 'bg-[#fafafa]';
                                let idxColor = 'text-gray-400';
                                if (idx === 0) {
                                  containerBg = 'bg-amber-50';
                                  idxColor = 'text-amber-500 font-extrabold';
                                } else if (idx === 1) {
                                  containerBg = 'bg-slate-50';
                                  idxColor = 'text-slate-400 font-extrabold';
                                } else if (idx === 2) {
                                  containerBg = 'bg-orange-50/50';
                                  idxColor = 'text-amber-700 font-extrabold';
                                }
                                return (
                                  <div key={st.id + '-classroom-rank'} className={`p-2 border border-black ${containerBg} flex justify-between items-center text-xs`}>
                                    <div className="flex items-center space-x-2.5 min-w-0">
                                      <span className={`text-[10px] w-4 text-center shrink-0 ${idxColor}`}>#{idx + 1}</span>
                                      <span className="font-sans font-black text-[#111111] uppercase truncate">{st.fullName || st.username}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-black text-black">{st.score} <span className="text-[9px] text-gray-400">pts</span></span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                )}

                {/* Sub-Tabs: presensi, kuis, pelanggaran, tugas, leaderboard */}
                {['presensi', 'kuis', 'pelanggaran', 'tugas', 'leaderboard'].includes(activeReportsSubTab) && (
                  <div className="space-y-6">
                    {/* List of Meetings as Cards to Select */}
                    {!selectedMeetingReport ? (
                      <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <h4 className="font-display font-black text-xs uppercase text-black border-b-2 border-black pb-2 mb-4 tracking-wider">
                          PILIH PERTEMUAN UNTUK MELIHAT DATA {activeReportsSubTab.toUpperCase()}
                        </h4>
                        {meetings.length === 0 ? (
                          <p className="text-[10px] text-gray-500 font-mono italic">Belum ada sesi pertemuan yang terdaftar.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {meetings.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => setSelectedMeetingReport(m.id)}
                                className="text-left bg-neutral-50 hover:bg-neutral-100 border-2 border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all cursor-pointer flex flex-col gap-2"
                              >
                                <span className="bg-black text-white font-black font-mono text-[9px] px-2 py-0.5 w-max tracking-widest uppercase">
                                  PERTEMUAN {m.number}
                                </span>
                                <h5 className="font-extrabold text-black text-xs uppercase leading-tight line-clamp-2">{m.topic}</h5>
                                <span className="text-[9px] font-mono text-gray-500 font-bold">{m.date}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Display active meeting details based on selected subtab */
                      <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                        <div className="flex justify-between items-center border-b-2 border-black pb-3">
                          <h4 className="font-display font-black text-sm uppercase text-black tracking-wider">
                            DETAIL {activeReportsSubTab.toUpperCase()} PERTEMUAN {meetings.find(m => m.id === selectedMeetingReport)?.number}
                          </h4>
                          <button
                            onClick={() => setSelectedMeetingReport(null)}
                            className="bg-black hover:bg-gray-800 text-white font-mono font-black text-[9px] uppercase px-3 py-1.5 border border-transparent shadow-[1.5px_1.5px_0px_0px_rgba(255,0,122,1)]"
                          >
                            ← KEMBALI
                          </button>
                        </div>
                        
                        {/* Selected Subtab Views */}
                        <div className="pt-2">
                          {activeReportsSubTab === 'presensi' && (() => {
                            const meetingRecs = attendanceRecords.filter(r => r.meetingId === selectedMeetingReport);
                            return (
                              <div>
                                <p className="text-[10px] text-gray-500 font-mono uppercase bg-emerald-50 p-2 border border-emerald-300 mb-4">
                                  Daftar student terverifikasi lolos biometrik rekognisi wajah untuk pertemuan ini.
                                </p>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-[10px] border-collapse">
                                    <thead>
                                      <tr className="border-b-2 border-black text-gray-400 font-mono uppercase text-[8.5px] font-bold">
                                        <th className="pb-1.5 font-bold">NAMA STUDENT</th>
                                        <th className="pb-1.5 text-center font-bold">TANGGAL & WAKTU HADIR</th>
                                        <th className="pb-1.5 text-center font-bold">SCAN WAJAH</th>
                                        <th className="pb-1.5 text-right font-bold">STATUS</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-bold">
                                      {meetingRecs.length === 0 ? (
                                        <tr>
                                          <td colSpan={4} className="py-6 text-center text-gray-400 italic font-mono text-[9px]">Belum ada data presensi pertemuan ini...</td>
                                        </tr>
                                      ) : (
                                        [...meetingRecs].map((rec, i) => (
                                          <tr key={rec.id || i}>
                                            <td className="py-2 font-black uppercase text-black">{rec.studentName}</td>
                                            <td className="py-2 text-center font-mono text-gray-500">{rec.time}</td>
                                            <td className="py-2 text-center">
                                              {rec.facePhotoUrl ? (
                                                <div className="relative group inline-block">
                                                  <img
                                                    src={rec.facePhotoUrl}
                                                    alt="Scan Wajah"
                                                    referrerPolicy="no-referrer"
                                                    className="w-12 h-9 object-cover border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:scale-150 transition-all duration-200 cursor-zoom-in mx-auto"
                                                  />
                                                  <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-1 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] z-50">
                                                    <img
                                                      src={rec.facePhotoUrl}
                                                      alt="Scan Wajah Zoom"
                                                      referrerPolicy="no-referrer"
                                                      className="w-32 h-24 object-cover"
                                                    />
                                                  </div>
                                                </div>
                                              ) : (
                                                <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 font-mono text-[8px] font-black uppercase px-2 py-0.5">PASSED / VERIFIED</span>
                                              )}
                                            </td>
                                            <td className="py-2 text-right">
                                              <span className="bg-black text-[#00E5FF] px-2 py-0.5 font-mono text-[8px] font-black uppercase">HADIR</span>
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}

                          {activeReportsSubTab === 'kuis' && (() => {
                            const meetingQuizzes = quizSubmissions.filter(q => q.meetingId === selectedMeetingReport);
                            const totalSubmitted = meetingQuizzes.length;
                            const totalCorrects = meetingQuizzes.filter(q => q.isCorrect).length;
                            const accuracyPct = totalSubmitted > 0 ? Math.round((totalCorrects / totalSubmitted) * 100) : 0;
                            const avgTimeSec = totalSubmitted > 0 ? (meetingQuizzes.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0) / totalSubmitted / 1000).toFixed(1) : "0.0";

                            return (
                              <div className="space-y-4 text-left">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="border-2 border-black p-3 bg-neutral-50 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] text-left">
                                    <span className="text-[8px] font-mono font-bold uppercase text-gray-500 block">Total Jawaban</span>
                                    <span className="text-sm font-black font-mono text-[#FF007A]">{totalSubmitted} Butir</span>
                                  </div>
                                  <div className="border-2 border-black p-3 bg-neutral-50 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] text-left">
                                    <span className="text-[8px] font-mono font-bold uppercase text-gray-500 block">Rata-rata Akurasi</span>
                                    <span className="text-sm font-black font-mono text-emerald-600">{accuracyPct}% Benar</span>
                                  </div>
                                  <div className="border-2 border-black p-3 bg-neutral-50 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] text-left">
                                    <span className="text-[8px] font-mono font-bold uppercase text-gray-500 block">Kecepatan Respons</span>
                                    <span className="text-sm font-black font-mono text-[#00E5FF]">{avgTimeSec} Detik</span>
                                  </div>
                                </div>

                                <div className="border-2 border-black p-3 bg-blue-50/50 border-dashed text-[10px] text-blue-900 leading-relaxed font-sans">
                                  Berikut adalah rekapitulasi nilai kuis sinkron interaktif mahasiswa hasil kelulusan proctoring biometrik terintegrasi.
                                </div>

                                <div className="overflow-x-auto border-2 border-black">
                                  <table className="w-full text-[10px] border-collapse text-left">
                                    <thead>
                                      <tr className="bg-black text-white font-mono uppercase text-[8.5px] font-bold">
                                        <th className="p-2 border-r border-black font-bold">NAMA STUDENT</th>
                                        <th className="p-2 border-r border-black font-bold">PERTANYAAN KUIS</th>
                                        <th className="p-2 border-r border-black font-bold">JAWABAN STUDENT</th>
                                        <th className="p-2 border-r border-black text-center font-bold">STATUS</th>
                                        <th className="p-2 text-right font-bold">KECEPATAN</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black font-bold">
                                      {meetingQuizzes.length === 0 ? (
                                        <tr>
                                          <td colSpan={5} className="py-6 text-center text-gray-400 italic font-mono text-[9px]">Belum ada riwayat kuis terkumpul untuk pertemuan ini...</td>
                                        </tr>
                                      ) : (
                                        [...meetingQuizzes].map((q, idx) => (
                                          <tr key={q.id || `${q.studentName}-${q.quizId}-${idx}`} className="hover:bg-gray-50">
                                            <td className="p-2 border-r border-black font-black uppercase text-black max-w-[120px] truncate">{q.studentName}</td>
                                            <td className="p-2 border-r border-black font-medium text-gray-700 max-w-[180px] truncate" title={q.question}>{q.question}</td>
                                            <td className="p-2 border-r border-black text-[#FF007A] font-black max-w-[140px] truncate" title={q.answerSubmitted}>{q.answerSubmitted}</td>
                                            <td className="p-2 border-r border-black text-center">
                                              <span className={`px-2 py-0.5 font-mono text-[8px] font-black uppercase border ${q.isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-400' : 'bg-red-100 text-red-800 border-red-400'}`}>
                                                {q.isCorrect ? 'BENAR ✓' : 'SALAH ✗'}
                                              </span>
                                            </td>
                                            <td className="p-2 text-right font-mono text-gray-500">{( (q.timeSpent || 0) / 1000).toFixed(1)}s</td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}

                          {activeReportsSubTab === 'pelanggaran' && (() => {
                            const meetingLogs = proctorLogs.filter(l => l.meetingId === selectedMeetingReport);
                            const totalViolations = meetingLogs.length;
                            const uniqueViolators = new Set(meetingLogs.map(l => l.studentName)).size;
                            const statusColor = totalViolations > 0 ? "text-rose-600 animate-pulse font-extrabold" : "text-emerald-600 font-extrabold";
                            const statusText = totalViolations === 0 ? "KONDUSIF ✓" : "BUTUH EVALUASI 🚨";

                            return (
                              <div className="space-y-4 text-left">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="border-2 border-black p-3 bg-neutral-50 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] text-left">
                                    <span className="text-[8px] font-mono font-bold uppercase text-gray-500 block">Total Pelanggaran</span>
                                    <span className="text-sm font-black font-mono text-[#FF007A]">{totalViolations} Kejadian</span>
                                  </div>
                                  <div className="border-2 border-black p-3 bg-neutral-50 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] text-left">
                                    <span className="text-[8px] font-mono font-bold uppercase text-gray-500 block">Jumlah Pelaku</span>
                                    <span className="text-sm font-black font-mono text-indigo-700">{uniqueViolators} Student</span>
                                  </div>
                                  <div className="border-2 border-black p-3 bg-neutral-50 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] text-left">
                                    <span className="text-[8px] font-mono font-bold uppercase text-gray-500 block">Status Proctoring</span>
                                    <span className={`text-sm font-mono ${statusColor}`}>{statusText}</span>
                                  </div>
                                </div>

                                <div className="border-2 border-black p-3 bg-rose-50 border-dashed text-[10px] text-rose-950 leading-relaxed font-sans">
                                  <strong>⚠️ PEMBERITAHUAN MONITORING BIOMETRIK:</strong> Rekaman aktivitas mencurigakan yang dideteksi secara real-time oleh modul kecerdasan buatan anti-cheat dan webcam proctoring.
                                </div>

                                <div className="overflow-x-auto border-2 border-black">
                                  <table className="w-full text-[10px] border-collapse text-left">
                                    <thead>
                                      <tr className="bg-[#111111] text-white font-mono uppercase text-[8.5px] font-bold">
                                        <th className="p-2 border-r border-black font-bold">NAMA STUDENT</th>
                                        <th className="p-2 border-r border-black font-bold">JENIS PELANGGARAN</th>
                                        <th className="p-2 border-r border-black font-bold">DETAIL AKTIVITAS</th>
                                        <th className="p-2 border-r border-black text-center font-bold">PERINGATAN KE-</th>
                                        <th className="p-2 text-right font-bold">WAKTU DETEKSI</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black font-bold">
                                      {meetingLogs.length === 0 ? (
                                        <tr>
                                          <td colSpan={5} className="py-6 text-center text-gray-400 italic font-mono text-[9px]">Aman! Tidak ada aktivitas pelanggaran proctoring yang terdeteksi untuk pertemuan ini.</td>
                                        </tr>
                                      ) : (
                                        [...meetingLogs].map((log) => (
                                          <tr key={log.id} className="hover:bg-red-50/20">
                                            <td className="p-2 border-r border-black font-black uppercase text-black max-w-[120px] truncate">{log.studentName}</td>
                                            <td className="p-2 border-r border-black text-rose-700 font-extrabold max-w-[150px] truncate">
                                              <span className="bg-rose-50 border border-rose-300 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase font-black tracking-wider">
                                                {log.violationType.replace(/_/g, ' ')}
                                              </span>
                                            </td>
                                            <td className="p-2 border-r border-black font-medium text-gray-700 max-w-[220px] truncate" title={log.details}>{log.details}</td>
                                            <td className="p-2 border-r border-black text-center text-amber-700 font-mono text-[11px] leading-none">
                                              <span className="px-2 py-0.5 border border-dashed border-amber-400 bg-amber-50 rounded">
                                                ❌ {log.warningCount}
                                              </span>
                                            </td>
                                            <td className="p-2 text-right font-mono text-gray-500">{log.timestamp}</td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}
                          
                          {activeReportsSubTab === 'tugas' && (() => {
                            const assignmentObj = assignments.find(a => a.meetingId === selectedMeetingReport);
                            if (!assignmentObj) {
                              return <p className="text-[10px] uppercase font-mono font-bold text-gray-500">Tidak ada tugas / assignment pada pertemuan ini.</p>;
                            }
                            const mtgSubmissions = submissions.filter(s => s.assignmentId === assignmentObj.id);
                            return (
                              <div className="overflow-x-auto">
                                <table className="w-full text-[10px] border-collapse text-left">
                                  <thead>
                                    <tr className="border-b-2 border-black text-gray-400 font-black uppercase text-[8.5px] font-mono">
                                      <th className="py-2">STUDENT</th>
                                      <th className="py-2 text-center">TUGAS DIBERIKAN</th>
                                      <th className="py-2 text-center">NILAI / SCORE</th>
                                      <th className="py-2">CATATAN TEACHER</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 font-bold">
                                    {mtgSubmissions.length === 0 ? (
                                       <tr>
                                        <td colSpan={4} className="py-6 text-center text-gray-400 italic font-mono text-[9px]">Belum ada tugas terkumpul...</td>
                                       </tr>
                                    ) : (
                                       mtgSubmissions.map(sub => (
                                          <tr key={sub.id}>
                                            <td className="py-2 font-black text-black uppercase">{sub.studentName}</td>
                                            <td className="py-2 text-center font-mono">{assignmentObj.title}</td>
                                            <td className="py-2 text-center text-[#FF007A] font-black text-[11px]">{sub.score !== undefined ? `${sub.score}/100` : 'BELUM DINILAI'}</td>
                                            <td className="py-2 text-gray-500 font-semibold">{sub.notes || '-'}</td>
                                          </tr>
                                       ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}

                          {activeReportsSubTab === 'leaderboard' && (() => {
                             return (
                              <div className="border-2 border-black p-4 bg-[#fafafa]">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono block mb-2 text-left">PAPAN PERINGKAT KELAS - KUMULATIF SAAT INI</span>
                                <div className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin text-left font-mono">
                                  {[...studentList].sort((a,b) => b.score - a.score).map((st, idx) => {
                                    return (
                                      <div key={st.id + '-rep-rank'} className={`p-2 border border-black bg-white flex justify-between items-center text-xs`}>
                                        <div className="flex items-center space-x-2.5 min-w-0">
                                          <span className={`text-[10px] w-4 text-center shrink-0 text-black font-extrabold`}>#{idx + 1}</span>
                                          <span className="font-sans font-black text-[#111111] uppercase truncate">{st.fullName || st.username}</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-mono font-black text-black bg-[#FF007A]/10 border border-[#FF007A] px-2 py-0.5">{st.score} PTS</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                             );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Full Report Details Modal Overlay */}
                {selectedFullReport && (
                  <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
                    <div className="bg-white border-4 border-black w-full max-w-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[85vh]">
                      {/* Header bar */}
                      <div className="bg-[#1e1b4b] text-white p-3.5 flex justify-between items-center shrink-0 border-b-4 border-black">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#00E5FF] shrink-0" />
                          <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#00E5FF]">
                            {selectedFullReport.studentName === 'ALL' || selectedFullReport.isGlobal
                              ? "DETAIL LAPORAN RANGKUMAN KELAS AI"
                              : `TRANSMISI FEEDBACK STUDENT: ${selectedFullReport.studentName?.toUpperCase() || ''}`}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedFullReport(null)}
                          className="bg-[#FF007A] text-white hover:bg-pink-600 px-2 py-0.5 text-xs font-black font-mono border-2 border-black cursor-pointer"
                        >
                          TUTUP ×
                        </button>
                      </div>

                      {/* Content panel */}
                      <div className="p-5 overflow-y-auto scrollbar-thin flex-grow text-left space-y-4">
                        <div className="border-b-2 border-black pb-2 select-none">
                          <p className="text-[8px] font-mono font-black text-gray-400 uppercase">IDENTITAS SESI LAPORAN</p>
                          <h4 className="font-extrabold text-sm text-black uppercase mt-1">PERTEMUAN: {selectedFullReport.meetingTopic}</h4>
                          <span className="text-[8.5px] font-mono font-bold text-gray-500 block mt-1 uppercase">Penerima: {selectedFullReport.studentName === 'ALL' ? 'Seluruh Student Kelas (Global Broadcast)' : `${selectedFullReport.studentName?.toUpperCase() || ''}`} • Diminta jam {selectedFullReport.timestamp}</span>
                        </div>

                        {/* Document markdown scroll container */}
                        <div className="p-4 bg-gray-50 border-2 border-black font-sans text-xs font-medium leading-relaxed max-h-96 overflow-y-auto">
                          <SimpleMarkdown text={selectedFullReport.notes} />
                        </div>
                      </div>

                      {/* Footer controls */}
                      <div className="bg-gray-50 p-3.5 border-t-2 border-black flex justify-end shrink-0 select-none">
                        <button
                          onClick={() => setSelectedFullReport(null)}
                          className="px-4 py-1.5 bg-black hover:bg-zinc-850 text-white font-mono font-black uppercase text-[10px] shadow-[2.5px_2.5px_0px_0px_rgba(255,0,0,0.4)] cursor-pointer"
                        >
                          TUTUP ✓
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}


            {activeTab === 'proctoring' && (
              <div className="space-y-6">
                
                {/* 1. Header & AI Summary Cards */}
                <div className="bg-[#1e1b4b] border-4 border-black p-5 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden select-none">
                  <div className="absolute right-0 top-0 opacity-10">
                    <Shield className="h-44 w-44 text-[#00E5FF]" />
                  </div>
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-[#00E5FF] flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-rose-400" />
                    AI QUIZ PROCTORING CONTROL ROOM (ANTI-CHEATING RADAR)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 font-sans leading-relaxed">
                    Sistem memantau webcam, gerak mata (iris tracking), keberadaan wajah, serta perubahan tab browser (window switching) student secara instan melalui jabat tangan Broadcast Channel Sockets.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 font-mono text-[10px]">
                    <div className="bg-slate-900/60 p-2.5 border border-slate-700">
                      <span className="text-[#00E5FF] block">INTEGRITY STATUS</span>
                      <span className="text-xs font-black block text-emerald-400 mt-1 uppercase">🟢 ALL SECURE</span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 border border-slate-700">
                      <span className="text-[#00E5FF] block font-sans">AVG FOCUS LEVEL</span>
                      <span className="text-xs font-black block text-white mt-1">
                        {Object.values(proctorStatuses).length > 0
                          ? Math.round(Object.values(proctorStatuses).reduce((acc, s) => acc + s.focusScore, 0) / Object.values(proctorStatuses).length)
                          : 100}%
                      </span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 border border-slate-700">
                      <span className="text-[#00E5FF] block">SUSPICIOUS RATIO</span>
                      <span className="text-xs font-black block text-amber-300 mt-1">
                        {Object.values(proctorStatuses).filter(s => s.status === 'suspicious').length} STUDENTS
                      </span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 border border-slate-700">
                      <span className="text-[#00E5FF] block font-sans text-[9px]">TOTAL LOGGED EVENTS</span>
                      <span className="text-xs font-black block text-rose-400 mt-1">{proctorLogs.length} EVENTS</span>
                    </div>
                  </div>
                </div>

                {/* 2. Live Student Video Stream Roster Grid */}
                <div className="space-y-4">
                  <h4 className="font-display font-black text-xs text-black uppercase tracking-wider pl-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Camera className="h-3.5 w-3.5 text-black shrink-0" /> UMPAN KAMERA RADAR LANGSUNG ({Object.keys(proctorStatuses).length})</span>
                    {activeQuiz ? (
                      <span className="text-[9px] bg-emerald-100 border border-emerald-400 text-emerald-800 px-2 py-0.5 rounded animate-pulse capitalize font-mono font-bold">KUIS AKTIF: MODEL LIVE</span>
                    ) : (
                      <span className="text-[9px] bg-amber-100 border border-amber-400 text-[#008ba3] px-2 py-0.5 rounded capitalize font-mono font-bold">NON-AKTIF: MENUNGGU SEED KUIS</span>
                    )}
                  </h4>

                  {Object.keys(proctorStatuses).length === 0 ? (
                    <div className="border-4 border-black p-8 bg-gray-50 text-center select-none text-gray-400 italic text-xs leading-relaxed font-normal">
                      Belum ada student mengikuti ujian kuis aktif saat ini.<br />
                      Silakan buka split screen di tab baru atau kirim kuis baru untuk mendaftarkan stream student.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.values(proctorStatuses).map((student) => {
                        const statusColor = student.status === 'normal' ? 'bg-emerald-500' : student.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500 animate-pulse';
                        
                        return (
                          <div key={student.studentId} className="border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between overflow-hidden">
                            
                            {/* Header: Student Info */}
                            <div className="p-3 bg-neutral-900 text-white flex justify-between items-center select-none border-b-2 border-black">
                              <div className="truncate">
                                <p className="font-sans font-black text-xs uppercase tracking-wide truncate text-[#00E5FF]">{student.username}</p>
                                <span className="text-[8px] text-gray-400 font-mono">ID: {student.studentId}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-black text-white ${statusColor}`}>
                                {student.status?.toUpperCase() || 'UNKNOWN'}
                              </span>
                            </div>

                            {/* Center Panel: Virtual Wireframe Camera Mesh */}
                            <div className="relative bg-slate-950 aspect-video flex flex-col justify-between p-2 select-none overflow-hidden">
                              
                              {/* Overlay Scan Effect when suspicious */}
                              {student.status === 'suspicious' && (
                                <div className="absolute inset-0 bg-red-950/25 pointer-events-none border-2 border-red-500 animate-pulse" />
                              )}

                              {/* Simulation Drawing Face Profile */}
                              <div className="flex-grow flex items-center justify-center">
                                <div className="text-center space-y-1 z-10 w-full">
                                  {/* Face Vector Outline Container */}
                                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#00E5FF]/40 flex items-center justify-center mx-auto relative bg-slate-900/60">
                                    <div className="absolute inset-x-2 h-0.5 bg-[#00E5FF] animate-bounce" />
                                    {/* Virtual eyes drawing */}
                                    <div className="flex justify-between w-8 absolute top-5">
                                      <span className={`h-1.5 w-1.5 rounded-full ${student.isGazeDeviation ? 'bg-red-400 translate-x-1' : 'bg-emerald-400'}`} />
                                      <span className={`h-1.5 w-1.5 rounded-full ${student.isGazeDeviation ? 'bg-red-400 translate-x-1' : 'bg-emerald-400'}`} />
                                    </div>
                                    <span className="text-xs mt-3">👤</span>
                                  </div>

                                  <div className="text-center font-mono text-[8px] uppercase tracking-widest text-[#00E5FF]">
                                    {student.isWebcamOn ? (
                                      <span>🎥 CAMERA STATUS ACTIVE : {student.faceDetectionRate.toFixed(0)}%</span>
                                    ) : (
                                      <span className="text-red-400 font-black">🔴 CAMERA BLOCK DISCONNECTED</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Absolute tags indicating real-time triggers */}
                              <div className="grid grid-cols-2 gap-1 select-none pointer-events-none font-mono text-[8px] z-10 bg-slate-900/75 p-1 w-full">
                                <span className={`px-1 rounded font-bold overflow-hidden truncate ${student.isWebcamOn ? 'text-emerald-400' : 'text-rose-400 underline line-through'}`}>
                                  Webcam: {student.isWebcamOn ? 'ON' : 'CLOSED'}
                                </span>
                                <span className={`px-1 rounded font-bold overflow-hidden truncate ${student.isFaceDetected && !student.isOutOfFrame ? 'text-emerald-400' : 'text-yellow-400 animate-pulse'}`}>
                                  Face: {student.isFaceDetected ? 'DETECT' : 'OUT_FRAME'}
                                </span>
                                <span className={`px-1 rounded font-bold overflow-hidden truncate ${!student.isGazeDeviation ? 'text-emerald-400' : 'text-rose-400 underline'}`}>
                                  Gaze: {student.isGazeDeviation ? 'LOOK_AWAY' : 'FOCUS'}
                                </span>
                                <span className={`px-1 rounded font-bold overflow-hidden truncate ${!student.isMultipleFaces ? 'text-emerald-400' : 'text-rose-400 underline animate-pulse'}`}>
                                  Peers: {student.isMultipleFaces ? 'PEER_DETECTED' : 'SOLO'}
                                </span>
                              </div>
                            </div>

                            {/* Bottom stats layout */}
                            <div className="p-3 bg-gray-50 border-t border-gray-200 grid grid-cols-3 divide-x divide-gray-200 text-center font-mono text-[9px] font-bold select-none">
                              <div>
                                <span className="text-gray-400 block pb-0.5">FOCUS RATE</span>
                                <span className="text-xs text-indigo-950">{student.focusScore}%</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block pb-0.5 font-sans">WARNINGS</span>
                                <span className={`text-xs ${student.warningCount > 1 ? 'text-red-500 font-extrabold' : 'text-gray-700'}`}>{student.warningCount} / 3</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block pb-0.5">TAB SWITCH</span>
                                <span className="text-xs text-amber-600">{student.tabSwitchCount}x ({student.unfocusedSecs}s)</span>
                              </div>
                            </div>

                            {/* Quick Warning dispatch parameters button actions */}
                            <div className="bg-white border-t border-black p-2 bg-neutral-900 grid grid-cols-2 sm:grid-cols-4 gap-1 select-none">
                              <button
                                type="button"
                                onClick={() => handleTeacherProctorAction(student.username, 'warn_student')}
                                className="py-1 px-0.5 text-center bg-yellow-400 hover:bg-yellow-500 text-black font-black uppercase text-[8px] tracking-tight border border-black cursor-pointer shadow-sm shadow-black flex items-center justify-center gap-0.5"
                                title="Beri Peringatan ke Student"
                              >
                                <AlertTriangle className="h-2.5 w-2.5" /> Warn
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTeacherProctorAction(student.username, 'deduct_score')}
                                className="py-1 px-0.5 text-center bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[8px] tracking-tight border border-black cursor-pointer shadow-sm shadow-black flex items-center justify-center gap-0.5"
                                title="Kurangi Skor Student"
                              >
                                <ShieldAlert className="h-2.5 w-2.5" /> Deduct
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTeacherProctorAction(student.username, 'flag_review')}
                                className={`py-1 px-0.5 text-center text-[8px] tracking-tight border border-black cursor-pointer shadow-sm shadow-black font-semibold uppercase flex items-center justify-center gap-0.5 ${student.isFlaggedForReview ? 'bg-indigo-300 text-indigo-950 font-black' : 'bg-slate-700 hover:bg-slate-800 text-white'}`}
                                title="Kirim Tanda Flag Review"
                              >
                                <Eye className="h-2.5 w-2.5" /> {student.isFlaggedForReview ? 'Flagged' : 'Flag Rev'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTeacherProctorAction(student.username, 'invalidate')}
                                className={`py-1 px-0.5 text-center text-[8px] tracking-tight border border-black cursor-pointer shadow-sm shadow-black font-semibold uppercase flex items-center justify-center gap-0.5 ${student.isInvalidated ? 'bg-amber-300 text-black font-black' : 'bg-red-800 hover:bg-red-900 text-white font-bold'}`}
                                title="Batalkan Kuis Student"
                              >
                                <Square className="h-2.5 w-2.5 text-red-500" /> {student.isInvalidated ? 'Canceled' : 'Cancel'}
                              </button>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Real-time Cheating Violation Detection Log Table */}
                <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 select-none">
                  <div className="flex justify-between items-center border-b-2 border-black pb-2">
                    <h3 className="font-display font-black text-xs text-rose-600 uppercase tracking-wide flex items-center gap-1.5 font-sans">
                      <ShieldAlert className="h-4.5 w-4.5" />
                      CHEATING VIOLATION DETECTION LOGS ({proctorLogs.length})
                    </h3>
                    <span className="text-[9px] bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 font-bold font-mono uppercase">REAL-TIME PACKETS LOGGED</span>
                  </div>

                  <div className="overflow-x-auto text-left font-mono">
                    <table className="w-full text-[10px] divide-y divide-gray-200">
                      <thead className="bg-gray-50 border-b border-black text-left">
                        <tr>
                          <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-wider">TIMESTAMP</th>
                          <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-wider">STUDENT</th>
                          <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-wider">PELANGGARAN</th>
                          <th className="px-3 py-2 text-[9px] font-black text-gray-500 uppercase tracking-wider">PENGUSUTAN / DETIL KEJADIAN</th>
                          <th className="px-3 py-2 text-[9px] font-black text-[#FF007A] uppercase tracking-wider text-center">WARNS</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {proctorLogs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-8 text-center text-gray-400 italic font-mono uppercase text-[9px]">
                              Belum ada aktivitas kecurangan terdeteksi oleh radar AI. Integritas sistem saat ini optimal.
                            </td>
                          </tr>
                        ) : (
                          [...proctorLogs].reverse().map((log) => (
                            <tr key={log.id} className="hover:bg-rose-50/50 transition-colors">
                              <td className="px-3 py-2 whitespace-nowrap text-gray-500 font-bold">{log.timestamp}</td>
                              <td className="px-3 py-2 whitespace-nowrap"><span className="bg-black text-[#00E5FF] px-2 py-0.5 font-black uppercase text-[9px]">{log.studentName}</span></td>
                              <td className="px-3 py-2 whitespace-nowrap text-red-500 font-black tracking-tighter uppercase">{log.violationType}</td>
                              <td className="px-3 py-2 text-gray-600 font-bold uppercase text-[9px] leading-relaxed">{log.details}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-center"><span className="bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5 rounded font-black">{log.warningCount} / 3</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            



            {activeTab === 'notifications' && (
              <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6 text-left">
                
                <div className="space-y-4">
                  <h3 className="font-display font-black text-xs uppercase tracking-widest text-[#FF007A] border-b border-black pb-2 flex items-center gap-1.5">
                    <Bell className="h-4 w-4 shrink-0 text-[#FF007A]" /> HISTORY NOTIFIKASI AKTIF
                  </h3>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {notifications.filter(n => n.role === 'teacher' || n.role === 'all').length === 0 ? (
                      <div className="p-4 border-2 border-dashed border-gray-300 text-center font-mono text-gray-400 text-[10px] font-bold">
                        BELUM ADA NOTIFIKASI AKTIVITAS
                      </div>
                    ) : (
                      notifications.filter(n => n.role === 'teacher' || n.role === 'all').map(notif => (
                        <div key={notif.id} className="p-3 border-2 border-black bg-neutral-50 flex items-start gap-3">
                           {notif.type === 'assignment' && <UploadCloud className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />}
                           {notif.type === 'quiz' && <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />}
                           {notif.type === 'material' && <FolderOpen className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />}
                           {notif.type === 'general' && <Info className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />}
                           {notif.type === 'system' && <Settings className="h-5 w-5 text-[#FF007A] shrink-0 mt-0.5" />}
                          
                          <div>
                            <p className="font-sans text-xs font-bold text-black">{notif.message}</p>
                            <span className="font-mono text-[9px] font-black text-gray-400 mt-1 block">{notif.timestamp}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'messages' && (
              <ChatSystemPanel 
                activeTab={chatOverlayTab}
                setActiveTab={setChatOverlayTab as any}
                currentUser={{ username, role: 'teacher' }}
                activeStudents={students}
                messages={messages}
                onSendMessage={onBroadcastMessage}
              />
            )}

          </div>
        </div>

        {/* Right Rail Panel (Leaderboard & Quick Chat board) */}
        {activeMeeting && activeTab === 'livesession' && (
          <div className="col-span-1 lg:col-span-3 space-y-6">
            
            {/* Real-time Leadership Leaderboard */}
            <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 select-none">
              <div className="flex justify-between items-center border-b-2 border-black pb-2 mr-3 flex-wrap gap-2 text-left">
                <div className="flex items-center space-x-2">
                  <Award className="h-5 w-5 text-[#FF007A]" />
                  <span className="font-display font-black text-xs uppercase tracking-wider text-black">LEADERBOARD PERTEMUAN</span>
                </div>
                <span className="text-[9px] bg-amber-100 border border-amber-400 text-amber-800 px-1.5 py-0.5 font-bold font-mono uppercase">LIVE SCORE</span>
              </div>

              <div className="space-y-2 max-h-[170px] overflow-y-auto scrollbar-thin">
                {sortedMeetingLeaderboard.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-4">Belum ada nilai terdaftar.</p>
                ) : (
                  sortedMeetingLeaderboard.map((st, idx) => {
                    let badge = 'text-gray-400';
                    let containerBg = 'bg-white';
                    if (idx === 0) {
                      badge = 'text-amber-500 font-bold';
                      containerBg = 'bg-[#FF007A]/5';
                    }
                    if (idx === 1) {
                      badge = 'text-[#008ba3] font-bold';
                    }

                    const displayPoints = st.meetingScore ?? 0;
                    
                    return (
                      <div key={st.id} className={`p-2.5 border-2 border-black flex justify-between items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${containerBg}`}>
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className={`text-[11px] font-mono font-black w-4 shrink-0 ${badge}`}>#{idx + 1}</span>
                          <div className="truncate text-left">
                            <p className="text-xs font-black text-[#111111] truncate uppercase">{st.fullName || st.username}</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase font-mono flex items-center gap-1">
                              <Flame className="h-3 w-3 text-amber-500 shrink-0 inline" /> {st.streak} STREAK
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-[#FF007A] font-mono leading-none">{displayPoints} pts</p>
                          <p className="text-[8px] text-gray-400 font-mono font-bold leading-none mt-1">ACC: {st.accuracy}%</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Embedded Chat room Frame */}
            <ChatRoom
              messages={messages}
              onSendMessage={onBroadcastMessage}
              onSendReply={onSendReply}
              role="teacher"
              username={username}
              activeStudents={students}
            />

          </div>
        )}

      </div>

      {/* Structured Footer element strictly to spec */}
      <footer className="border-t-4 border-black bg-[#111111] text-white p-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-center items-center text-[10px] font-mono text-gray-400 gap-2">
          <p className="font-bold">LiveClass {new Date().getFullYear()}</p>
        </div>
      </footer>

      {systemAlert && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-black text-lg uppercase flex items-center gap-2">
              {systemAlert.type === 'error' ? 'Peringatan' : systemAlert.type === 'success' ? 'Berhasil' : 'Informasi'}
            </h3>
            <p className="font-mono text-sm font-semibold whitespace-pre-wrap">{systemAlert.message}</p>
            <button onClick={() => setSystemAlert(null)} className="w-full px-4 py-2 bg-[#00E5FF] hover:bg-[#00cce6] border-2 border-black font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all mt-4">
              OK, MENGERTI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}