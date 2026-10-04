import time
from datetime import datetime, timezone

class AntiCheatEngine:
    """
    AntiCheatEngine - Python Implementation
    
    Tracks student proctoring logs, window switching, devtools openings, and fake webcam validations
    to enforce academic integrity during LiveClass active sessions.
    """
    def __init__(self):
        # Memetakan data pemantauan per user
        self.monitored_users = {}

    def start_monitoring(self, user_id: str, nama: str, quiz_id: str, session_id: str):
        """Mulai sesi pemantauan baru untuk mahasiswa tertentu"""
        self.monitored_users[user_id] = {
            "name": nama,
            "quiz_id": quiz_id,
            "session_id": session_id,
            "tab_switches": 0,
            "copy_pastes": 0,
            "devtools_opens": 0,
            "logs": [],
            "last_active": time.time()
        }

    def handle_tab_switch(self, user_id: str, quiz_id: str, hidden: bool) -> dict:
        """Mencatat log ketika siswa berpindah tab browser"""
        if user_id in self.monitored_users:
            user = self.monitored_users[user_id]
            user["last_active"] = time.time()
            if hidden:
                user["tab_switches"] += 1
                log_entry = {
                    "id": f"log-{int(time.time() * 1000)}",
                    "studentName": user_id,
                    "quizId": quiz_id,
                    "actionType": "tab_switch",
                    "timestamp": datetime.now(timezone.utc).strftime("%d-%m-%Y %H:%M:%S"),
                    "text": "Keluar dari fokus jendela / berpindah tab browser selama pengerjaan kuis."
                }
                user["logs"].append(log_entry)
                return {
                    "username": user_id,
                    "quizId": quiz_id,
                    "action": "warn_student",
                    "actionType": "warn_student",
                    "text": "Mohon pertahankan fokus Anda ke layar kuis!",
                    "log": log_entry
                }
        return None

    def handle_webcam_frame(self, user_id: str, quiz_id: str, b64_frame: str) -> dict:
        """
        Menyimulasikan verifikasi kehadiran bio-rekognisi wajah mahasiswa.
        Pada implementasi production, frame b64 dapat dimasukkan ke model deteksi wajah.
        """
        if user_id in self.monitored_users:
            user = self.monitored_users[user_id]
            user["last_active"] = time.time()
            # Simulasi deteksi anomali (misalnya jika tidak ada frame atau resolusi di bawah batas)
            if not b64_frame or len(b64_frame) < 100:
                log_entry = {
                    "id": f"log-{int(time.time() * 1000)}",
                    "studentName": user_id,
                    "quizId": quiz_id,
                    "actionType": "suspend",
                    "timestamp": datetime.now(timezone.utc).strftime("%d-%m-%Y %H:%M:%S"),
                    "text": "Wajah mahasiswa tidak terdeteksi pada feed webcam aktif."
                }
                user["logs"].append(log_entry)
                return {
                    "username": user_id,
                    "quizId": quiz_id,
                    "action": "invalidate",
                    "actionType": "invalidate",
                    "text": "Wajah Anda tidak terdeteksi di kamera. Ujian dinonaktifkan sementara.",
                    "log": log_entry
                }
        return None

    def handle_copy_paste(self, user_id: str, quiz_id: str) -> dict:
        """Mencatat aktivitas copy-paste teks kuis"""
        if user_id in self.monitored_users:
            user = self.monitored_users[user_id]
            user["last_active"] = time.time()
            user["copy_pastes"] += 1
            log_entry = {
                "id": f"log-{int(time.time() * 1000)}",
                "studentName": user_id,
                "quizId": quiz_id,
                "actionType": "copy_paste",
                "timestamp": datetime.now(timezone.utc).strftime("%d-%m-%Y %H:%M:%S"),
                "text": "Mencoba melakukan salin-tempel (copy-paste) isi butir soal."
            }
            user["logs"].append(log_entry)
            return {
                "username": user_id,
                "quizId": quiz_id,
                "action": "deduct_score",
                "actionType": "deduct_score",
                "deduction": 20,
                "text": "Pengurangan skor sebesar 20 poin diterapkan akibat aktivitas copy-paste.",
                "log": log_entry
            }
        return None

    def handle_devtools(self, user_id: str, quiz_id: str) -> dict:
        """Mencatat log ketika siswa membuka DevTools untuk melihat jawaban kuis"""
        if user_id in self.monitored_users:
            user = self.monitored_users[user_id]
            user["last_active"] = time.time()
            user["devtools_opens"] += 1
            log_entry = {
                "id": f"log-{int(time.time() * 1000)}",
                "studentName": user_id,
                "quizId": quiz_id,
                "actionType": "devtools",
                "timestamp": datetime.now(timezone.utc).strftime("%d-%m-%Y %H:%M:%S"),
                "text": "Membuka Konsol Pengembang Browser (F12/DevTools)."
            }
            user["logs"].append(log_entry)
            return {
                "username": user_id,
                "quizId": quiz_id,
                "action": "flag_review",
                "actionType": "flag_review",
                "text": "Profil Anda ditandai untuk peninjauan manual akibat membuka DevTools.",
                "log": log_entry
            }
        return None
