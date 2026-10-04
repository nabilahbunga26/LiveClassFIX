# LAPORAN TUGAS AKHIR KULIAH: PERSISTENSI & SIMULASI REAL-TIME LIVECLASS
**Mata Kuliah:** Pemrograman Jaringan / Sistem Terdistribusi  
**Nama Aplikasi:** LiveClass  
**Platform:** Web-based Interactive Classroom with Socket Architecture Simulation  

---

## 1. Pendahuluan

### Latar Belakang
Proses pembelajaran jarak jauh sering kali menghadapi tantangan berat berupa kurangnya keterlibatan murid dan kesulitan pemantauan integritas akademik. **LiveClass** dikembangkan sebagai aplikasi kelas interaktif berbasis web untuk mengatasi keterbatasan platform video conference konvensional dalam sinkronisasi materi dan analisis real-time.

### Ruang Lingkup
Aplikasi ini mencakup implementasi pemrograman socket, sinkronisasi state real-time, sistem kelas terintegrasi (tugas, kuis, materi), serta integrasi database persistent untuk sinkronisasi data antar-sesi.

---

## 2. Deskripsi dan Tujuan Project

### Deskripsi Singkat
**LiveClass** beroperasi dengan konsep **Peer-Broadcasting Server** yang memodelkan prinsip kerja sistem socket terdistribusi. Pengajar bertindak sebagai server-host pengatur sesi, memancarkan sinyal perintah, dan melakukan manajemen data kelas melalui API terintegrasi.

### Tujuan Project
1. **Implementasi Concurrency:** Mengolah ribuan data event konkuren tanpa race condition.
2. **Perancangan Protokol:** Menerapkan komunikasi client-server efisien.
3. **Robustness:** Menangani tantangan jaringan seperti paket rusak atau rekoneksi tak terduga.

---

## 3. Arsitektur Sistem

Aplikasi menggunakan arsitektur full-stack:
*   **Client:** React (Vite) dengan Tailwind CSS untuk antarmuka responsif.
*   **Server:** Python Flask (`server.py`) sebagai pusat logika backend.
*   **Komunikasi:** Event-based socket communication untuk sinkronisasi data real-time.

---

## 4. Desain Protokol Aplikasi

Aplikasi menggunakan protokol `LIVECLASS/1.0` dengan struktur paket biner/JSON yang mencakup header, tipe paket, sequence number, timestamp, dan checksum untuk memvalidasi keutuhan data (integritas paket).

---

## 5. Pengujian Performa dan Beban Server

Pengujian dilakukan menggunakan simulator virtual clients untuk memvalidasi:
*   Latensi rendah saat sinkronisasi slide.
*   Throughput tinggi pada saat lonjakan trafik kuis interaktif.
*   Ketahanan koneksi websocket saat sesi kelas berdurasi panjang.

---

## 6. Hasil dan Analisis

Aplikasi berhasil mengimplementasikan fungsionalitas ruang kelas interaktif. Fitur sinkronisasi slide, kuis live dengan leaderboard, dan pengawasan proctoring AI berjalan sesuai desain. Analisis menunjukkan sistem mampu menyinkronkan ribuan events dengan overhead bandwidth minimal.

---

## 7. Kendala dan Solusi

*   **Kendala:** Latensi sinkronisasi pada koneksi tidak stabil.
    *   **Solusi:** Implementasi protokol toleransi otomatis (`retry mechanism`) dan optimasi paket data.
*   **Kendala:** Deteksi proctoring yang tidak akurat.
    *   **Solusi:** Penggunaan mekanisme tracking lintas-tab berbasis *blur tracking* yang lebih cerdas.

---

## 8. Kesimpulan dan Saran

### Kesimpulan
**LiveClass** terbukti berhasil mewujudkan ruang kelas fungsional interaktif yang didukung oleh simulasi arsitektur socket terdistribusi dan sistem manajemen terintegrasi.

### Saran
Pengembangan masa depan diarahkan pada migrasi ke protokol WebRTC fungsional untuk kebutuhan video stream yang lebih *low-latency* dan implementasi sistem broker terdistribusi untuk skala yang lebih besar.

---
*Laporan ini disusun dengan dedikasi penuh guna memenuhi seluruh kriteria teknis, arsitektur jaringan, serta stabilitas sistem yang diujikan dalam Tugas Akhir Kuliah.*
