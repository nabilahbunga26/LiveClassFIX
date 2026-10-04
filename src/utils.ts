/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Slide, Quiz } from './types';
import JSZip from 'jszip';

export const generateFormattedTimestamp = () => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

// 5 high quality educational slides on Socket Architecture
export const MOCK_SLIDES: Slide[] = [
  {
    id: 1,
    title: "Apa itu Socket Programming?",
    content: "Socket adalah endpoint komunikasi dua arah yang digunakan oleh aplikasi untuk berkirim data melalui jaringan komputer. Socket mengabstraksi protokol transport seperti TCP dan UDP.",
    imageTheme: "pink",
    bullets: [
      "Endpoint diidentifikasi dengan IP Address dan Port Number.",
      "Membuka portal komunikasi antar proses (Inter-process Communication).",
      "Menggunakan protokol TCP untuk transmisi data andal (reliable)."
    ]
  },
  {
    id: 2,
    title: "TCP Lifecycle (Three-Way Handshake)",
    content: "Sebelum data mengalir, client dan server melakukan jabat tangan (handshake) untuk menyelaraskan nomor urut (Sequence Numbers) transmisi data.",
    imageTheme: "cyan",
    bullets: [
      "1. SYN: Client mengirimkan sinyal sinkronisasi.",
      "2. SYN-ACK: Server membalas persetujuan sinkronisasi.",
      "3. ACK: Client mengonfirmasi koneksi terjalin."
    ]
  },
  {
    id: 3,
    title: "Server Socket Control Flow",
    content: "Untuk melayani banyak client (concurrency), Sockets Server beroperasi melalui tahapan fungsi sistem yaitu: socket() -> bind() -> listen() -> accept().",
    imageTheme: "neutral",
    bullets: [
      "socket(): Membuat file descriptor socket.",
      "bind(): Mengaitkan socket dengan IP dan Port address.",
      "listen(): Menyiapkan antrian koneksi masuk.",
      "accept(): Memblokir thread hingga client terhubung, lalu membuat socket baru khusus client tersebut."
    ]
  },
  {
    id: 4,
    title: "Multithreading vs Asynchronous Socket",
    content: "Menangani ratusan client secara bersamaan memerlukan manajemen konkurensi (Concurrency Handling) agar server tidak hang saat memproses socket yang blocking.",
    imageTheme: "pink",
    bullets: [
      "Multithreading: Setiap client dilayani oleh thread terpisah.",
      "I/O Multiplexing (select/poll): Satu thread mengamati banyak socket sekaligus.",
      "Asynchronous / Event-driven: Menggunakan Callback/Event loop seperti Eventlet atau NodeJS Node Engine."
    ]
  },
  {
    id: 5,
    title: "WebSocket & Flask-SocketIO",
    content: "WebSocket menyediakan jalur komunikasi full-duplex (dua arah secara real-time) di atas satu koneksi TCP tunggal, melangkahi overhead protokol HTTP biasa.",
    imageTheme: "cyan",
    bullets: [
      "HTTP: Request-Response searah.",
      "WebSocket: Server dan Client bebas mengirim data kapanpun.",
      "Flask-SocketIO: Library Python yang mengabstraksi WebSocket serta menyederhanakan callback event."
    ]
  }
];

export const MOCK_QUIZZES: Quiz[] = [
  {
    id: "quiz-1",
    type: "multiple-choice",
    question: "Tahapan system call pada Server TCP socket sebelum siap menerima data adalah...",
    options: [
      "socket() -> bind() -> listen() -> accept()",
      "socket() -> connect() -> read() -> write()",
      "socket() -> listen() -> connect() -> accept()",
      "socket() -> accept() -> bind() -> listen()"
    ],
    correctOptionIndex: 0,
    durationSeconds: 20,
    isActive: false
  },
  {
    id: "quiz-2",
    type: "true-false",
    question: "UDP (User Datagram Protocol) memerlukan proses Three-Way Handshake sebelum mengirimkan paket data.",
    options: ["Benar", "Salah"],
    correctOptionIndex: 1,
    durationSeconds: 15,
    isActive: false
  },
  {
    id: "quiz-3",
    type: "polling",
    question: "Manakah teknik manajemen konkurensi socket server yang menurut Anda paling efisien untuk jaringan skala besar?",
    options: [
      "Multithreading (Satu thread per client)",
      "I/O Multiplexing (select() / poll() / epoll())",
      "Asynchronous Event-driven Loop (NodeJS / Eventlet)",
      "Forking Process (Satu process per client)"
    ],
    correctOptionIndex: -1,
    durationSeconds: 30,
    isActive: false
  },
  {
    id: "quiz-4",
    type: "multiple-choice",
    question: "Protokol apa yang digunakan sebagai pondasi (transport layer) dari koneksi WebSocket?",
    options: [
      "UDP",
      "IP Sec",
      "TCP",
      "HTTP 1.1"
    ],
    correctOptionIndex: 2,
    durationSeconds: 20,
    isActive: false
  }
];

// Helper to generate checksum for packet integrity simulation
export function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).toUpperCase();
}

export function generateMaterialSummary(topic: string): string {
  const norm = (topic || '').toLowerCase();
  if (norm.includes("uji") || norm.includes("hipotesis") || norm.includes("populasi") || norm.includes("parameter")) {
    return `### Pokok Bahasan: Uji Hipotesis Parameter Dua Populasi
- **Konsep Utama**: Membandingkan karakteristik (seperti rata-rata atau proporsi) dari dua populasi yang independen atau berpasangan untuk mendeteksi deviasi/perbedaan statistik signifikan.
- **Teori & Formula**:
  - Menggunakan **Z-Test** (uji Z) jika ukuran sampel besar (n1, n2 > 30) atau standar deviasi populasi diketahui.
  - Menggunakan **t-Test** (uji t) jika salah satu sampel berukuran kecil atau standar deviasi populasi tidak diketahui.
- **Asumsi Pengujian**: Sampel diambil secara acak, data terdistribusi normal, dan pengamatan saling independen.`;
  } else if (norm.includes("socket") || norm.includes("tcp") || norm.includes("jaringan")) {
    return `### Pokok Bahasan: Arsitektur Pemrograman Socket TCP/IP
- **Siklus Hidup Socket Server**: Tahapan dimulai dari pembuatan socket descriptor \`socket()\`, mengikat ke IP/Port tertentu \`bind()\`, menanti koneksi \`listen()\`, serta menerima jabat tangan client \`accept()\`.
- **WebSocket Kontra HTTP**: HTTP bersifat satu-arah (polling), sedangkan WebSocket menyediakan saluran full-duplex dua-arah berkecepatan tinggi di atas koneksi TCP tunggal.
- **Konkurensi**: Memanfaatkan model I/O Multiplexing (\`select()\`, \`epoll()\` atau Event Loop) jauh lebih hemat resource dibandingkan model forking proses atau multi-threading konvensional.`;
  } else {
    return `### Pokok Bahasan: Rangkuman Pembelajaran Sesi Kelas
- **Deskripsi Sesi**: Sesi perkuliahan interaktif membahas topik utama secara mendalam melalui asisten AI LiveClass dan coretan slide instan.
- **Aktivitas Utama**: Kolaborasi real-time, pengiriman file referensi pendukung, dan asisten AI pengerjaan kuis real-time.
- **Resolusi**: Seluruh student berhasil merampungkan kuis indikator performa pertemuan untuk penilaian sistem otomatis.`;
  }
}

/**
 * Creates and downloads the complete Python Flask-SocketIO + React offline package
 */
export async function generateZIPProject(): Promise<Blob> {
  const zip = new JSZip();

  // 1. Root files
  zip.file("requirements.txt", 
`Flask==3.0.3
Flask-SocketIO==5.3.6
eventlet==0.35.2
Flask-Cors==4.0.1
`
  );

  zip.file("README.md", 
`# LiveClass: Real-Time Network Simulation & Classroom Platform

Aplikasi LiveClass ini dikembangkan khusus sebagai bahan ajar Mata Kuliah Pemrograman Jaringan berbasis Python Flask-SocketIO dan SQLite. Aplikasi ini melayani komunikasi real-time dua arah secara andal menggunakan mekanisme multithreading & concurrency handler.

## Fitur Jaringan & Backend
- **TCP Socket Communication** via WebSocket protocol.
- **Heartbeat engine** (PING/PONG) otomatis mengukur latensi client-server.
- **Auto-reconnect handler** pada client-side.
- **SQLite Database** untuk persistensi akun dan riwayat aktivitas kuis.
- **Multithreading / Concurrency** didukung oleh mesin Eventlet yang asinkron.
- **Filter Malformed Packet Validation** untuk keamanan sirkuit data socket.
- **Session Timeout** & deteksi otomatis login ganda (Duplicate login detection).

## Cara Menjalankan Project

### Langkah 1: Persiapan Environment Python
Pastikan Python 3.8+ sudah terinstal di komputer Anda. Buka terminal atau command prompt pada folder project ini lalu jalankan:
\`\`\`bash
# Membuat Virtual Environment (opsional tapi disarankan)
python -m venv venv

# Mengaktifkan Virtual Environment
# Windows:
venv\\Scripts\\activate
# Mac/Linux:
source venv/bin/activate
\`\`\`

### Langkah 2: Install Dependensi Backend
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### Langkah 3: Jalankan Server Flask
Jalankan file backend utama:
\`\`\`bash
python app.py
\`\`\`
Server akan aktif di alamat: **http://127.0.0.1:5000**

### Langkah 4: Akses Aplikasi
Gunakan browser Anda untuk membuka **http://127.0.0.1:5000**.
Anda dapat membuka beberapa tab browser sekaligus (misalnya, satu tab sebagai **Teacher** dan tab lainnya sebagai **Student**) untuk mensimulasikan jabat tangan TCP, PING/PONG, dan penyaji kuis real-time Kahoot-style secara lokal!
`
  );

  // 2. Python app.py
  zip.file("app.py", 
`import sys
import time
import uuid
import sqlite3
import hashlib
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__)
# Kunci rahasia internal untuk hashing dan kuis session
app.config['SECRET_KEY'] = 'liveclass_super_secret_network_key'
CORS(app)

# Inisialisasi SocketIO dengan engine Eventlet untuk concurrency tinggi (Multithreaded Server)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# DATABASE SETUP (SQLite)
def get_db_connection():
    conn = sqlite3.connect('liveclass_database.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    # Tabel Pengguna (Teacher / Student)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL
        )
    ''')
    # Tabel Riwayat Kuis / Jawaban Student
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_history (
            id TEXT PRIMARY KEY,
            session_code TEXT NOT NULL,
            username TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            is_correct INTEGER NOT NULL,
            time_taken_ms INTEGER NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Isi database default
    try:
        cursor.execute("INSERT OR IGNORE INTO users (id, username, role) VALUES ('1', 'PakDosen', 'teacher')")
        conn.commit()
    except Exception as e:
        print("db populate error:", e)
    conn.close()

# SIMULASI STATE MEMORI (Concurrency Safe)
active_sessions = {} # format: { session_code: { "teacher_id": "...", "students": {}, "slides_index": 0, "quiz_active": None } }
client_connections = {} # format: { socket_id: { "username": "...", "room": "...", "joined_at": 170000000 } }

def validate_packet(packet):
    """
    Sirkuit Validasi Integritas Packet Jaringan.
    Setiap payload yang dikirim harus memiliki format yang valid, checksum dan sender terverifikasi.
    """
    if not isinstance(packet, dict):
        return False, "Malformed Packet: Not a JSON object"
    if 'checksum' not in packet or 'sender' not in packet:
        return False, "Malformed Packet: Header missing checksum/sender"
    return True, "Valid"

def calculate_checksum(data_str):
    return hashlib.md5(data_str.encode('utf-8')).hexdigest()[:8].upper()

# ROUTE FLASK WEB PAGE
@app.route('/')
def index_route():
    return render_template('index.html')

# HTTP API: Mengambil riwayat kuis
@app.route('/api/quiz-history', methods=['GET'])
def get_quiz_history():
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM quiz_history ORDER BY timestamp DESC LIMIT 50').fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

# EVENT SOCKET.IO (SOCKET PROGRAMMING FLOW)

@socketio.on('connect')
def handle_connect():
    sid = request.sid
    print(f"[NET] TCP socket connection established with client: {sid}")
    emit('server_response', {
        'status': 'ACK',
        'message': f'Socket connected successfully. Session ID: {sid}'
    })

@socketio.on('join_session')
def handle_join_session(packet):
    # 1. Validasi struktur paket
    is_valid, err_msg = validate_packet(packet)
    if not is_valid:
        emit('error_alert', {'type': 'Malformed Packet', 'message': err_msg})
        return

    sid = request.sid
    username = packet.get('sender', 'Anonymous')
    payload = packet.get('payload', {})
    class_code = payload.get('class_code', '').strip()
    role = payload.get('role', 'student')

    if not class_code:
        emit('error_alert', {'type': 'Validation Error', 'message': 'Class Code cannot be empty!'})
        return

    # Deteksi Login Ganda (Duplicate Login Detection)
    if class_code in active_sessions:
        students = active_sessions[class_code]['students']
        if username in students and students[username]['status'] == 'online':
            emit('error_alert', {
                'type': 'Duplicate Login',
                'message': f'Username "{username}" sedang aktif di kelas ini. Pilih username lain.'
            })
            return

    # Inisialisasi Kelas jika belum ada (Bila Teacher yang join)
    if class_code not in active_sessions:
        if role == 'teacher':
            active_sessions[class_code] = {
                'teacher_id': sid,
                'students': {},
                'slides_index': 0,
                'quiz': None
            }
        else:
            # Bila student join kelas yang belum dibuat oleh teacher
            active_sessions[class_code] = {
                'teacher_id': 'MOCK_TEACHER',
                'students': {},
                'slides_index': 0,
                'quiz': None
            }

    join_room(class_code)
    
    # Registrasi client
    if role == 'student':
        active_sessions[class_code]['students'][username] = {
            'sid': sid,
            'status': 'online',
            'ping': 5,
            'points': 0,
            'streak': 0,
            'accuracy': 100
        }
    
    client_connections[sid] = {
        'username': username,
        'room': class_code,
        'role': role
    }

    # SQLite persistence logging
    try:
        conn = get_db_connection()
        conn.execute('INSERT OR IGNORE INTO users (id, username, role) VALUES (?, ?, ?)', 
                     (str(uuid.uuid4()), username, role))
        conn.commit()
        conn.close()
    except Exception as e:
        print("[DB Error] Gagal menyimpan user:", e)

    # Kirim konfirmasi jabat tangan balik (Socket ACK)
    print(f"[NET] User '{username}' joined room '{class_code}' [Role: {role}]")
    emit('session_joined', {
        'class_code': class_code,
        'role': role,
        'active_students': active_sessions[class_code]['students']
    }, room=class_code)

@socketio.on('ping_packet')
def handle_ping(packet):
    """
    Heartbeat PING-PONG Mechanism untuk mengukur latency client-server secara concurrency.
    """
    sid = request.sid
    # Kirim balik respons PONG secepat mungkin
    emit('pong_packet', {
        'seq_number': packet.get('sequenceNum', 0),
        'timestamp': packet.get('timestamp', time.time())
    })

@socketio.on('slide_navigation')
def handle_slide_navigation(packet):
    is_valid, err_msg = validate_packet(packet)
    if not is_valid:
        emit('error_alert', {'type': 'Malformed Packet', 'message': err_msg})
        return

    sid = request.sid
    conn_info = client_connections.get(sid)
    if not conn_info or conn_info['role'] != 'teacher':
        emit('error_alert', {'type': 'Permission Denied', 'message': 'Only teachers can navigate slides.'})
        return

    payload = packet.get('payload', {})
    class_code = conn_info['room']
    slide_index = payload.get('slide_index', 0)
    annotations = payload.get('annotations', [])

    if class_code in active_sessions:
        active_sessions[class_code]['slides_index'] = slide_index
        # Broadcast slide ter-update ke seluruh room student
        emit('slide_updated', {
            'slide_index': slide_index,
            'annotations': annotations
        }, room=class_code)

@socketio.on('broadcast_chat')
def handle_broadcast_chat(packet):
    is_valid, err_msg = validate_packet(packet)
    if not is_valid:
        return

    sid = request.sid
    conn_info = client_connections.get(sid)
    if not conn_info:
        return

    payload = packet.get('payload', {})
    class_code = conn_info['room']
    text = payload.get('text', '')
    is_announcement = payload.get('is_announcement', False)

    message = {
        'id': str(uuid.uuid4()),
        'timestamp': time.strftime("%H:%M:%S"),
        'senderId': sid,
        'senderName': conn_info['username'],
        'role': conn_info['role'],
        'text': text,
        'isAnnouncement': is_announcement
    }

    emit('chat_received', message, room=class_code)

@socketio.on('quiz_control')
def handle_quiz_control(packet):
    sid = request.sid
    conn_info = client_connections.get(sid)
    if not conn_info or conn_info['role'] != 'teacher':
        return

    room = conn_info['room']
    payload = packet.get('payload', {})
    action = payload.get('action') # 'launch' atau 'end'
    quiz_data = payload.get('quiz')

    if room in active_sessions:
        if action == 'launch':
            active_sessions[room]['quiz'] = quiz_data
            emit('quiz_launched', {'quiz': quiz_data}, room=room)
        else:
            active_sessions[room]['quiz'] = None
            emit('quiz_ended', {}, room=room)

@socketio.on('quiz_submit')
def handle_quiz_submit(packet):
    sid = request.sid
    conn_info = client_connections.get(sid)
    if not conn_info:
        return

    room = conn_info['room']
    username = conn_info['username']
    payload = packet.get('payload', {})
    
    quiz_id = payload.get('quiz_id')
    question = payload.get('question', '')
    option_index = payload.get('option_index', -1)
    is_correct = payload.get('is_correct', False)
    time_taken = payload.get('time_taken', 0)

    # Update skor kuis (Kahoot style calculation)
    # Skor dasar 1000 dikurangi pinalti waktu, ditambah 500 bonus streak
    score_addition = 0
    if is_correct:
        base_points = 1000
        time_penalty = int((time_taken / 1000) * 20) # 20 points penalty per second
        score_addition = max(200, base_points - time_penalty)
        
        # update streak
        if room in active_sessions and username in active_sessions[room]['students']:
            student_stats = active_sessions[room]['students'][username]
            student_stats['streak'] += 1
            score_addition += (student_stats['streak'] * 100)
            student_stats['points'] += score_addition
    else:
        if room in active_sessions and username in active_sessions[room]['students']:
            active_sessions[room]['students'][username]['streak'] = 0

    # sqlite persistence
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO quiz_history (id, session_code, username, question, answer, is_correct, time_taken_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), room, username, question, str(option_index), 1 if is_correct else 0, time_taken))
        conn.commit()
        conn.close()
    except Exception as e:
        print("[DB Error] Save quiz history failed:", e)

    # Beritahu seluruh isi kelas untuk memperbarui papan leaderboard secara adaptif
    if room in active_sessions:
        students = active_sessions[room]['students']
        emit('scoreboard_updated', {
            'active_students': students,
            'last_submit': {
                'username': username,
                'is_correct': is_correct,
                'score_addition': score_addition
            }
        }, room=room)

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    conn_info = client_connections.get(sid)
    if conn_info:
        room = conn_info['room']
        username = conn_info['username']
        role = conn_info['role']

        print(f"[NET] Connection lost: Client {username} ({sid}) disconnected.")

        # Hapus pencatatan koneksi socket aktif
        if sid in client_connections:
            del client_connections[sid]

        if room in active_sessions:
            if role == 'teacher':
                # Teacher disconnected, broadcast alert
                emit('error_alert', {
                    'type': 'Connection Lost',
                    'message': 'Koneksi dengan Teacher terputus. Menunggu sesi tersambung kembali...'
                }, room=room)
            else:
                # Student status set to offline
                if username in active_sessions[room]['students']:
                    active_sessions[room]['students'][username]['status'] = 'offline'
                    emit('student_status_changed', {
                        'username': username,
                        'status': 'offline',
                        'active_students': active_sessions[room]['students']
                    }, room=room)

if __name__ == '__main__':
    # Memulai inisialisasi Database SQLite
    init_db()
    print("[INIT] SQLite database status: OK")
    print("[INIT] Sockets Server starting on http://0.0.0.0:5000 (Eventlet engine)")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
`
  );

  // 3. Front-end Templates (index.html)
  zip.file("templates/index.html", 
`<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LiveClass Client - Jaringan Kuliah</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- SocketIO Client library -->
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: #FFFFFF;
        }
        .accent-pink-text { color: #FF007A; }
        .accent-pink-bg { background-color: #FF007A; }
        .accent-cyan-bg { background-color: #00E5FF; }
        .font-space { font-family: 'Space Grotesk', sans-serif; }
        .font-mono-net { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body class="bg-white text-gray-900 min-h-screen flex flex-col justify-between">

    <!-- HEADER BAR -->
    <header class="border-b border-gray-100 py-4 px-6 flex justify-between items-center bg-white sticky top-0 z-50">
        <div class="flex items-center space-x-3">
            <div class="h-8 w-8 rounded-full accent-pink-bg flex items-center justify-center text-white font-bold font-space text-lg">L</div>
            <span class="font-space text-xl font-bold tracking-tight">Live<span class="accent-pink-text">Class</span></span>
        </div>
        <div class="flex items-center space-x-4">
            <span id="network-badge" class="px-3 py-1 rounded-full text-xs font-mono-net bg-red-100 text-red-600 flex items-center space-x-1">
                <span class="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-1"></span>
                DISCONNECTED
            </span>
            <span id="latency-badge" class="font-mono-net text-xs text-gray-400">--- ms</span>
        </div>
    </header>

    <!-- MAIN BODY CONTAINER -->
    <main class="max-w-4xl w-full mx-auto p-4 md:p-8 flex-grow flex flex-col justify-center">
        
        <!-- LANDING SCREEN (Enter Session Code) -->
        <section id="login-section" class="w-full max-w-md mx-auto text-center space-y-8 py-12 transition-all duration-300">
            <div class="space-y-3">
                <h1 class="font-space text-4xl font-bold tracking-tight text-gray-900">Join a Live Session</h1>
                <p class="text-sm text-gray-500">Mata Kuliah Pemrograman Jaringan Komputer</p>
            </div>

            <!-- CARD INPUT -->
            <div class="bg-white border-2 border-gray-100 p-6 rounded-2xl shadow-xl space-y-4">
                <div>
                    <label class="block text-left text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Username Baru</label>
                    <input type="text" id="username-input" placeholder="Masukkan Username Anda" 
                           class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF007A] text-center font-bold">
                </div>
                <div>
                    <label class="block text-left text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Class Code</label>
                    <input type="text" id="class-code-input" placeholder="Enter Class Code (e.g. 12345)" 
                           class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00E5FF] text-center font-space font-bold text-xl tracking-widest text-[#FF007A]">
                </div>
                <button onclick="attemptConnect()" class="w-full py-4 rounded-xl accent-pink-bg text-white font-space font-bold hover:opacity-90 transition-transform active:scale-95 shadow-md">
                    Join Session
                </button>
            </div>
        </section>

        <!-- WAITING ROOM / ACTIVE CLASSROOM -->
        <section id="classroom-section" class="hidden w-full space-y-6 transition-all duration-300">
            
            <!-- HEADER KELAS -->
            <div class="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 class="text-2xl font-space font-bold tracking-tight">Waiting Room Kelas</h2>
                    <p class="text-sm text-gray-500 font-mono-net mt-1">Class Code: <span id="classroom-code" class="text-[#FF007A] font-bold"></span> | Active Students: <span id="student-count" class="font-bold">0</span></p>
                </div>
                <div class="bg-white border border-gray-200 rounded-xl p-3 flex space-x-4">
                    <div class="text-center">
                        <p class="text-[10px] text-gray-400 font-semibold uppercase">Poin Anda</p>
                        <p id="student-points" class="font-space font-bold text-lg text-[#FF007A]">0</p>
                    </div>
                    <div class="h-8 w-px bg-gray-100"></div>
                    <div class="text-center">
                        <p class="text-[10px] text-gray-400 font-semibold uppercase">Streak 🔥</p>
                        <p id="student-streak" class="font-space font-bold text-lg text-amber-500">0</p>
                    </div>
                </div>
            </div>

            <!-- TWO COLUMN WORKSPACE -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <!-- SLIDE PRESENTATION LISTENER -->
                <div class="md:col-span-2 space-y-4">
                    <div class="border-2 border-gray-100 bg-white rounded-2xl shadow-sm overflow-hidden min-h-[300px] flex flex-col justify-between">
                        <div class="p-6 bg-[#00E5FF]/5 border-b border-[#00E5FF]/10 flex justify-between items-center">
                            <span class="text-xs font-bold uppercase tracking-wider text-gray-400">Live Slide</span>
                            <span id="slide-number-indicator" class="font-mono-net text-xs accent-pink-text font-bold">Slide: 1/5</span>
                        </div>
                        
                        <div id="slide-body" class="p-8 space-y-4 flex-grow flex flex-col justify-center">
                            <h3 id="slide-title" class="font-space text-2xl font-bold">Menunggu Teacher Memulai Presentasi...</h3>
                            <p id="slide-text" class="text-sm text-gray-600 leading-relaxed">Materi slide akan ditampilkan secara real-time di sini saat kuliah dimulai oleh teacher.</p>
                            <ul id="slide-bullets" class="list-disc pl-5 text-sm text-gray-500 space-y-2"></ul>
                        </div>
                    </div>

                    <!-- ACTIVE QUIZ CARD CONTAINER -->
                    <div id="quiz-container" class="hidden border-2 border-[#FF007A] bg-white rounded-2xl shadow-lg p-6 space-y-4 transition-all duration-300">
                        <div class="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h4 class="font-space text-lg font-bold text-[#FF007A]">Kuis Real-time Aktif! ⚡</h4>
                            <div class="h-8 w-8 rounded-full border-2 border-[#FF007A] flex items-center justify-center font-bold font-mono-net text-sm text-[#FF007A]" id="quiz-timer">20</div>
                        </div>
                        <p id="quiz-question-text" class="font-semibold text-gray-800">Menunggu muatan soal...</p>
                        
                        <div id="quiz-options-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <!-- Tombol pilihan dimuat secara dinamis -->
                        </div>
                    </div>
                </div>

                <!-- RIGHT RAIL: CHAT & CLIENTS STATUS -->
                <div class="space-y-6">
                    <div class="border-2 border-gray-100 rounded-2xl p-4 bg-white space-y-4 flex flex-col h-[350px]">
                        <h4 class="font-space font-bold text-sm tracking-wider text-gray-500 uppercase">Chat Ruang Jaringan</h4>
                        
                        <!-- CHAT ROOM LISTENT -->
                        <div id="chat-messages" class="flex-grow space-y-2 overflow-y-auto pr-1 text-xs">
                            <p class="text-gray-400 italic text-center py-4">Belum ada obrolan masuk...</p>
                        </div>
                        
                        <!-- CHAT INPUT -->
                        <div class="flex space-x-2">
                            <input type="text" id="chat-composer" placeholder="Kirim pesan obrolan..." 
                                   class="flex-grow text-xs px-3 py-2 border rounded-xl outline-none focus:ring-1 focus:ring-[#FF007A]">
                            <button onclick="sendChatMessage()" class="text-xs px-3 py-2 accent-pink-bg text-white rounded-xl hover:opacity-95 font-bold">Kirim</button>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    </main>

    <!-- FOOTER SYSTEM LOG -->
    <footer class="border-t border-gray-100 bg-gray-50 p-4">
        <div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-4 text-xs">
            <p class="text-gray-400 font-mono-net">Project Jaringan Sockets - Teknik Informatika © 2026</p>
            <div class="flex items-center space-x-2 font-mono-net text-[10px] text-[#FF007A]">
                <span class="animate-pulse">●</span>
                <span>Active Channel Socket Listener: app.py (Multithreaded Session)</span>
            </div>
        </div>
    </footer>

    <!-- CLIENT SCRIPT JALUR NETWORK -->
    <script>
        let socket = null;
        let username = "";
        let classCode = "";
        let currentQuiz = null;
        let quizStartTime = null;
        let pingInterval = null;

        const MOCK_SLIDES_DB = [
          {
            title: "Apa itu Socket Programming?",
            content: "Socket adalah endpoint komunikasi dua arah yang digunakan oleh aplikasi untuk berkirim data melalui jaringan komputer.",
            bullets: [
              "Endpoint diidentifikasi dengan IP Address dan Port Number.",
              "Membuka portal komunikasi antar proses.",
              "Menggunakan protokol TCP untuk transmisi data andal."
            ]
          },
          {
            title: "TCP Lifecycle (Three-Way Handshake)",
            content: "Sebelum data mengalir, client dan server melakukan jabat tangan (handshake) untuk menyelaraskan nomor urut.",
            bullets: [
              "1. SYN: Client mengirimkan sinyal sinkronisasi.",
              "2. SYN-ACK: Server membalas persetujuan sinkronisasi.",
              "3. ACK: Client mengonfirmasi koneksi terjalin."
            ]
          },
          {
            title: "Server Socket Control Flow",
            content: "Untuk melayani banyak client (concurrency), Sockets Server beroperasi melalui tahapan socket() -> bind() -> listen() -> accept().",
            bullets: [
              "socket(): Membuat file descriptor socket.",
              "bind(): Mengaitkan socket dengan IP dan Port address.",
              "listen(): Menyiapkan antrian koneksi masuk.",
              "accept(): Memblokir thread hingga client terhubung."
            ]
          },
          {
            title: "Multithreading vs Asynchronous Socket",
            content: "Menangani ratusan client secara bersamaan memerlukan manajemen konkurensi agar server tidak hang.",
            bullets: [
              "Multithreading: Setiap client dilayani oleh thread terpisah.",
              "I/O Multiplexing (select/poll): Satu thread mengamati banyak socket sekaligus.",
              "Asynchronous / Event-driven: Menggunakan Event loop seperti Eventlet."
            ]
          },
          {
            title: "WebSocket & Flask-SocketIO",
            content: "WebSocket menyediakan jalur komunikasi full-duplex di atas satu koneksi TCP tunggal secara real-time.",
            bullets: [
              "HTTP: Request-Response searah.",
              "WebSocket: Server dan Client bebas mengirim data.",
              "Flask-SocketIO: Library Python yang mengabstraksi WebSocket."
            ]
          }
        ];

        function attemptConnect() {
            username = document.getElementById("username-input").value.trim();
            classCode = document.getElementById("class-code-input").value.trim();

            if (!username || !classCode) {
                alert("Harap isi username dan Class Code!");
                return;
            }

            // Hubungkan diri ke server Flask lokal
            socket = io("http://localhost:5000");

            socket.on('connect', () => {
                updateNetworkBadge(true);
                
                // Kirim paket pendaftaran join session
                const packet = createPacket('join_session', {
                    class_code: classCode,
                    role: 'student'
                });
                socket.emit('join_session', packet);
                
                // Mulai Heartbeat Latency Tracker
                startLatencyTracker();
            });

            socket.on('disconnect', () => {
                updateNetworkBadge(false);
                clearInterval(pingInterval);
            });

            socket.on('session_joined', (data) => {
                document.getElementById("login-section").classList.add("hidden");
                document.getElementById("classroom-section").classList.remove("hidden");
                document.getElementById("classroom-code").innerText = classCode;
                updateStudentCount(data.active_students);
            });

            socket.on('student_status_changed', (data) => {
                updateStudentCount(data.active_students);
            });

            socket.on('error_alert', (data) => {
                alert("[" + data.type + "] " + data.message);
                if (data.type === 'Duplicate Login') {
                    socket.disconnect();
                }
            });

            // Sinkronisasi perpindahan Slide PPT dari server
            socket.on('slide_updated', (data) => {
                const index = data.slide_index;
                const slide = MOCK_SLIDES_DB[index];
                if (slide) {
                    document.getElementById("slide-number-indicator").innerText = "Slide: " + (index + 1) + "/5";
                    document.getElementById("slide-title").innerText = slide.title;
                    document.getElementById("slide-text").innerText = slide.content;
                    
                    const listHtml = slide.bullets.map(b => "<li>" + b + "</li>").join('');
                    document.getElementById("slide-bullets").innerHTML = listHtml;
                }
            });

            // Kuis diluncurkan oleh teacher
            socket.on('quiz_launched', (data) => {
                currentQuiz = data.quiz;
                quizStartTime = Date.now();
                
                document.getElementById("quiz-container").classList.remove("hidden");
                document.getElementById("quiz-question-text").innerText = currentQuiz.question;
                
                // Sizing options
                const container = document.getElementById("quiz-options-grid");
                container.innerHTML = "";
                
                currentQuiz.options.forEach((opt, idx) => {
                    const btn = document.createElement("button");
                    btn.className = "p-3 rounded-xl border border-gray-200 text-left font-semibold text-xs hover:border-[#FF007A] transition-colors";
                    btn.innerText = opt;
                    btn.onclick = () => selectOption(idx, btn);
                    container.appendChild(btn);
                });

                startQuizTimer(currentQuiz.durationSeconds);
            });

            socket.on('quiz_ended', () => {
                document.getElementById("quiz-container").classList.add("hidden");
                currentQuiz = null;
            });

            socket.on('scoreboard_updated', (data) => {
                // Update skor peserta jika nama kita berubah
                if (data.active_students && data.active_students[username]) {
                    const stats = data.active_students[username];
                    document.getElementById("student-points").innerText = stats.points;
                    document.getElementById("student-streak").innerText = stats.streak;
                }
            });

            socket.on('chat_received', (msg) => {
                const box = document.getElementById("chat-messages");
                const p = document.createElement("p");
                p.className = msg.isAnnouncement ? "bg-red-50 p-2 rounded text-red-600 font-bold" : "py-1 text-gray-700";
                
                const roleLabel = msg.role === 'teacher' ? '[TEACHER] ' : '';
                p.innerHTML = "<strong>" + roleLabel + msg.senderName + ":</strong> " + msg.text;
                
                box.appendChild(p);
                box.scrollTop = box.scrollHeight;
            });
        }

        function updateNetworkBadge(isConnected) {
            const b = document.getElementById("network-badge");
            if (isConnected) {
                b.className = "px-3 py-1 rounded-full text-xs font-mono-net bg-emerald-100 text-emerald-600 flex items-center";
                b.innerHTML = '<span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-1"></span>CONNECTED';
            } else {
                b.className = "px-3 py-1 rounded-full text-xs font-mono-net bg-red-100 text-red-600 flex items-center";
                b.innerHTML = '<span class="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-1"></span>DISCONNECTED';
            }
        }

        function updateStudentCount(students) {
            let count = 0;
            for (let s in students) {
                if (students[s].status === 'online') count++;
            }
            document.getElementById("student-count").innerText = count;
        }

        function createPacket(eventName, payload) {
            const dataStr = JSON.stringify(payload);
            const checksum = generateSimpleHash(dataStr);
            return {
                timestamp: Date.now() / 1000,
                sender: username || 'Client_Socket',
                receiver: 'Server_Socket',
                eventName: eventName,
                payload: payload,
                checksum: checksum,
                sequenceNum: Math.floor(Math.random() * 10000)
            };
        }

        function generateSimpleHash(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = (hash << 5) - hash + str.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash).toString(16).toUpperCase();
        }

        // Heartbeat Latency Tracker
        function startLatencyTracker() {
            pingInterval = setInterval(() => {
                if (socket && socket.connected) {
                    const start = Date.now();
                    socket.emit('ping_packet', { timestamp: start, sequenceNum: 99 });
                    
                    // One-shot timer intercept
                    socket.once('pong_packet', (data) => {
                        const latency = Date.now() - start;
                        document.getElementById("latency-badge").innerText = latency + " ms";
                    });
                }
            }, 3000);
        }

        function selectOption(idx, btnElement) {
            if (!currentQuiz) return;
            
            const elapsed = Date.now() - quizStartTime;
            const isCorrect = (idx === currentQuiz.correctOptionIndex);
            
            // disable buttons
            const btns = document.querySelectorAll("#quiz-options-grid button");
            btns.forEach(b => b.disabled = true);
            
            if (isCorrect) {
                btnElement.classList.add("bg-emerald-100", "text-emerald-800", "border-emerald-500");
            } else {
                btnElement.classList.add("bg-red-100", "text-red-800", "border-red-500");
            }

            // Kirim paket hasil submit kuis
            const packet = createPacket('quiz_submit', {
                quiz_id: currentQuiz.id,
                question: currentQuiz.question,
                option_index: idx,
                is_correct: isCorrect,
                time_taken: elapsed
            });
            socket.emit('quiz_submit', packet);
        }

        let qTimerInterval = null;
        function startQuizTimer(dur) {
            clearInterval(qTimerInterval);
            let left = dur;
            const elem = document.getElementById("quiz-timer");
            elem.innerText = left;
            
            qTimerInterval = setInterval(() => {
                left--;
                elem.innerText = left;
                if (left <= 0) {
                    clearInterval(qTimerInterval);
                    // disable all
                    const btns = document.querySelectorAll("#quiz-options-grid button");
                    btns.forEach(b => b.disabled = true);
                }
            }, 1000);
        }

        function sendChatMessage() {
            const inp = document.getElementById("chat-composer");
            const text = inp.value.trim();
            if (!text || !socket) return;
            
            const packet = createPacket('broadcast_chat', {
                text: text,
                is_announcement: false
            });
            socket.emit('broadcast_chat', packet);
            inp.value = "";
        }
    </script>
</body>
</html>
`
  );

  // Generasi file zip blob
  const content = await zip.generateAsync({ type: 'blob' });
  return content;
}
