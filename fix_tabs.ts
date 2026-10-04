import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard.tsx', 'utf8');

// Find end of dashboard
const dbEndIndex = content.indexOf("            {activeTab === 'classroom' && (");

const liveSessionContent = `
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

                              onBroadcastMessage(\`[INFORMASI KELAS] Sesi perkuliahan resmi dimulai: Pertemuan ke-\${meetingPreparing.number} membahas "\${meetingPreparing.topic}"! Silakan lakukan verifikasi wajah & input PIN Presensi agar bisa masuk ke Live Class.\`, true, 'student');
                              onBroadcastMessage(\`Telah berhasil memulai Kelas Live untuk Pertemuan ke-\${meetingPreparing.number}\`, true, 'teacher');

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
                                          pdfTitle: \`Rangkuman_\${classCode}_Pertemuan_\${m.number}.pdf\`,
                                          materialSummary: \`Dokumen rekapitulasi materi kelas untuk pertemuan ini. Pada pertemuan ke-\${m.number} dibahas topik mengenai \${m.topic}. Silakan unduh PDF untuk melihat laporan lengkap beserta detail performa student.\`,
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
                              className={\`flex items-center space-x-1.5 px-4 py-2.5 font-black text-[10px] uppercase tracking-widest border-2 border-black focus:outline-none transition-all cursor-pointer \${
                                isMatch
                                  ? 'bg-[#00E5FF] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-px translate-y-px z-10'
                                  : 'bg-white text-gray-700 hover:text-black hover:bg-neutral-100'
                              }\`}
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
                          <span className={\`px-2 py-0.5 font-mono font-black text-[9px] border uppercase \${isAttendanceOpen ? 'bg-emerald-100 text-emerald-800 border-emerald-400' : 'bg-rose-100 text-rose-800 border-rose-400'}\`}>
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
                                  <div className={\`h-full transition-all duration-500 \${isCorrect ? 'bg-[#00E5FF]' : 'bg-[#FF007A]'}\`} style={{ width: \`\${pct}%\` }} />
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
                              className={\`px-2 py-1 border-2 border-black font-mono font-black text-[8px] uppercase tracking-wider transition-all cursor-pointer \${
                                manualQuizType === t.value
                                  ? 'bg-black text-[#00E5FF] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                                  : 'bg-white text-gray-700 hover:text-black hover:bg-neutral-50'
                              }\`}
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
                                      className={\`cursor-pointer h-6 w-6 border-2 border-black font-mono font-black \${customCorrect === idx ? 'bg-[#FF007A] text-white' : 'bg-white text-black'}\`}
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
                                    className={\`cursor-pointer px-2.5 py-1 border-2 border-black font-mono font-black text-[9px] \${customCorrect === item.val ? 'bg-[#FF007A] text-white' : 'bg-white text-gray-700'}\`}
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
`;


const part2 = content.substring(dbEndIndex);
const newContent = content.substring(0, dbEndIndex) + liveSessionContent + "\\n" + part2;

fs.writeFileSync('src/components/TeacherDashboard_fixed.tsx', newContent);
console.log("File fixed successfully!");
