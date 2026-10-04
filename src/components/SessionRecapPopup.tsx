import React from 'react';
import { motion } from 'motion/react';
import { X, Download, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Quiz } from '../types';

interface SessionRecapPopupProps {
  recap: {
    topic: string;
    number: number;
    pdfTitle: string;
    materialSummary: string;
    quizzes: Quiz[];
    date: string;
  };
  onClose: () => void;
  userRole: 'student' | 'teacher';
  username: string;
  quizSubmissions?: any[];
}

export default function SessionRecapPopup({
  recap,
  onClose,
  userRole,
  username,
  quizSubmissions = [],
}: SessionRecapPopupProps) {
  const [systemAlert, setSystemAlert] = React.useState<{ message: string, type: 'error' | 'success' | 'info' } | null>(null);
  
  const handleDownloadPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setSystemAlert({ message: "Pop-up diblokir! Izinkan pop-up browser Anda untuk mengunduh laporan PDF.", type: "error" });
      return;
    }

    const formatMarkdownToHtml = (text: string): string => {
      if (!text) return "";
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, "<code style='background-color: #f1f5f9; padding: 2px 4px; font-family: monospace; border-radius: 3px;'>$1</code>")
        .replace(/###\s*(.*)/g, "<h3>$1</h3>")
        .replace(/##\s*(.*)/g, "<h2>$1</h2>")
        .replace(/#\s*(.*)/g, "<h1>$1</h1>");
    };

    const studentHeadline = userRole === 'student' ? `${username?.toUpperCase() || ''} (${username?.toUpperCase() || ''})` : "TEACHER PENGAMPU";

    const contentHtml = recap.quizzes.map((q, idx) => {
      // Check if student has a submission
      const userSubmission = quizSubmissions.find(s => s.quizId === q.id && s.studentName === username);
      const studentSelectedIdx = userSubmission ? userSubmission.optionIndex : null;

      let optionsHtml = '';
      if (q.options && q.options.length > 0) {
        optionsHtml = `
          <div style="margin: 12px 0; display: flex; flex-direction: column; gap: 8px;">
            ${q.options.map((opt: string, oIdx: number) => {
              const isCorrectOption = oIdx === q.correctOptionIndex;
              const isStudentOption = studentSelectedIdx === oIdx;
              
              let style = "padding: 10px 14px; font-family: sans-serif; font-size: 13px; border: 2px solid #cbd5e1; background-color: #ffffff; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; color: #1e293b;";
              let badge = '';
              
              if (isCorrectOption) {
                style = "padding: 10px 14px; font-family: sans-serif; font-size: 13px; border: 2.5px solid #10b981; background-color: #ecfdf5; color: #065f46; font-weight: bold; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;";
                badge = `<span style="background-color: #10b981; color: white; padding: 3px 8px; font-size: 11px; font-weight: 950; text-transform: uppercase; border-radius: 3px; font-family: sans-serif; letter-spacing: 0.5px;">KUNCI JAWABAN ✓</span>`;
              } else if (isStudentOption) {
                style = "padding: 10px 14px; font-family: sans-serif; font-size: 13px; border: 2.5px solid #ef4444; background-color: #fef2f2; color: #991b1b; font-weight: bold; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;";
                badge = `<span style="background-color: #ef4444; color: white; padding: 3px 8px; font-size: 11px; font-weight: 950; text-transform: uppercase; border-radius: 3px; font-family: sans-serif; letter-spacing: 0.5px;">JAWABAN KAMU ✗</span>`;
              }
              
              if (isCorrectOption && isStudentOption) {
                badge = `<span style="background-color: #10b981; color: white; padding: 3px 8px; font-size: 11px; font-weight: 950; text-transform: uppercase; border-radius: 3px; font-family: sans-serif; letter-spacing: 0.5px;">JAWABAN KAMU &amp; KUNCI ✓</span>`;
              }
              
              return `
                <div style="${style}">
                  <span><strong>${String.fromCharCode(65 + oIdx)}.</strong> ${opt}</span>
                  ${badge}
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else {
        const studentAns = userSubmission ? userSubmission.shortAnswer || '' : '';
        const correctAnsStr = q.correctAnswerText || '';
        optionsHtml = `
          <div style="margin: 12px 0; padding: 12px; background-color: #f8fafc; border: 2px solid #cbd5e1; border-radius: 6px; font-family: sans-serif; font-size: 13px;">
            <div style="margin-bottom: 6px;">
              <strong>Jawaban Kamu:</strong> ${studentAns ? `"${studentAns}"` : `<span style="color: #94a3b8;">(tidak diisi)</span>`}
            </div>
            <div>
              <strong>Kunci Jawaban:</strong> <code style="background-color: #e2e8f0; padding: 4px 8px; font-family: monospace; font-size: 13px; font-weight: bold; border-radius: 3px;">${correctAnsStr}</code>
            </div>
          </div>
        `;
      }

      return `
        <div style="margin-bottom: 35px; padding-bottom: 25px; border-bottom: 2px dashed #cbd5e1; page-break-inside: avoid;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; color: #FF007A; font-family: sans-serif; font-weight: 900; line-height: 1.4;">
            SOAL ${idx + 1}: ${q.question}
          </h3>
          ${optionsHtml}
          
          <div style="margin-top: 12px; font-size: 13px; font-family: sans-serif; line-height: 1.6; color: #334155; background-color: #f8fafc; padding: 14px; border-radius: 4px; border: 1.5px solid #cbd5e1;">
            <strong>Penjelasan Soal:</strong><br/>
            <div style="margin-top: 6px; white-space: pre-wrap; font-weight: 500; font-size: 12.5px; color: #475569;">${q.explanation || 'Pembahasan materi interaktif sesuai kurikulum kompetensi.'}</div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Rangkuman Kelas - ${recap.topic}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono&display=swap');
            @page {
              size: portrait;
              margin: 20mm;
            }
            body {
              font-family: 'Inter', sans-serif;
              color: #111111;
              padding: 0;
              margin: 0;
              line-height: 1.5;
            }
            .header {
              border-bottom: 4px solid #000;
              padding-bottom: 12px;
              margin-bottom: 25px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .logo {
              font-size: 26px;
              font-weight: 900;
              letter-spacing: -1px;
            }
            .logo-dot {
              color: #FF007A;
            }
            .meta {
              text-align: right;
              font-size: 10px;
              font-weight: 700;
              color: #555555;
              line-height: 1.4;
            }
            .title-section {
              margin-bottom: 25px;
            }
            h1 {
              font-size: 18px;
              font-weight: 900;
              text-transform: uppercase;
              margin: 0 0 10px 0;
              letter-spacing: -0.5px;
            }
            .pdf-box {
              background-color: #FFF0F6;
              border: 3px solid #FF007A;
              color: #99004C;
              padding: 10px 14px;
              font-weight: 900;
              font-size: 12px;
              text-transform: uppercase;
              font-family: monospace;
              letter-spacing: 0.5px;
              margin-bottom: 15px;
            }
            .summary-desc {
              font-size: 12px;
              color: #4b5563;
              margin-bottom: 25px;
              line-height: 1.6;
            }
            .section-divider {
              border-top: 4px solid #111111;
              margin: 30px 0 20px 0;
            }
            .section-title {
              font-size: 14px;
              font-weight: 900;
              text-transform: uppercase;
              color: #000;
              margin-bottom: 15px;
              letter-spacing: 0.5px;
            }
            .summary-box {
              background-color: #f8fafc;
              border: 2.5px solid #111111;
              padding: 20px;
              margin-bottom: 30px;
              border-radius: 4px;
            }
            .summary-box h3 {
              margin: 0 0 10px 0;
              font-size: 14px;
              font-weight: 900;
              text-transform: uppercase;
              border-bottom: 1.5px solid #e2e8f0;
              padding-bottom: 6px;
            }
            .summary-box ul {
              margin: 0;
              padding-left: 20px;
              font-size: 13px;
              color: #334155;
            }
            .summary-box li {
              margin-bottom: 8px;
              line-height: 1.6;
            }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="logo">LIVECLASS<span class="logo-dot">.</span>AI</div>
            <div class="meta">
              Student: ${studentHeadline}<br/>
              Kuis: ${recap.topic}<br/>
              Tanggal: ${recap.date}
            </div>
          </div>
          
          <div class="title-section">
            <h1>RANGKUMAN TANYA JAWAB MENTORLIVEAI</h1>
            <div class="pdf-box">
              📝 JUDUL PDF YANG DIUPLOAD: ${recap.pdfTitle}
            </div>
            <p class="summary-desc font-sans">Laporan hasil asistensi AI untuk kuis interaktif secara real-time.</p>
          </div>

          <div class="section-title">🎯 REVIEW KUIS REAL-TIME ACTIVE SESSION</div>
          
          ${contentHtml}
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 180 }}
        className="max-w-2xl w-full bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-black text-white p-4 flex justify-between items-center select-none">
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="font-display font-black uppercase text-xs tracking-wider">
              Rangkuman Sesi Kelas (AI Auto-Recap)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1 flex items-center gap-2 border-2 border-white hover:bg-neutral-800 transition-colors uppercase font-mono font-black text-[9px] cursor-pointer"
            >
              <Download className="w-3 h-3" /> UNDUH PDF
            </button>
            <button
              onClick={onClose}
              className="p-1 border-2 border-transparent hover:border-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin text-left">
          
          {/* Top Banner Alert */}
          <div className="bg-pink-50 border-2 border-pink-500 p-4 shadow-[2px_2px_0px_0px_rgba(244,63,94,1)] flex gap-3 items-start">
            <BookOpen className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-black uppercase text-pink-600 block">Judul PDF Materi</span>
              <p className="font-mono text-xs font-bold text-pink-900 break-all select-all">
                📄 {recap.pdfTitle}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-4 border-black p-4 bg-neutral-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div>
              <span className="text-[9px] font-mono font-black uppercase text-gray-400 block">Mata Kuliah / Sesi</span>
              <span className="text-xs font-black text-black">Pertemuan {recap.number}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono font-black uppercase text-gray-400 block">Topik Perkuliahan</span>
              <span className="text-xs font-black text-black break-words">{recap.topic}</span>
            </div>
          </div>

          {/* Realtime Quizzes */}
          <div className="space-y-3">
            <h3 className="font-display font-black text-[11px] text-black uppercase tracking-wider border-b-2 border-dashed border-black pb-1">
              🎯 Review Kuis Real-Time Active Session
            </h3>

            <div className="space-y-6">
              {recap.quizzes.map((q, idx) => {
                const userSubmission = quizSubmissions.find(s => s.quizId === q.id && s.studentName === username);
                const studentSelectedIdx = userSubmission ? userSubmission.optionIndex : null;

                return (
                  <div key={q.id} className="border-2 border-black p-4 space-y-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2">
                      <span className="text-xs font-mono font-black text-pink-500 uppercase tracking-widest">
                        SOAL {idx + 1}
                      </span>
                      {userSubmission && (
                        <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 border ${
                          userSubmission.isCorrect 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                            : 'bg-rose-50 border-rose-300 text-rose-800'
                        }`}>
                          {userSubmission.isCorrect ? 'BENAR ✓' : 'SALAH ✗'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-black text-black leading-snug">
                      {q.question}
                    </p>

                    {/* Options rendering */}
                    {q.options && q.options.length > 0 && (
                      <div className="space-y-2 pl-1 pt-1">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = oIdx === q.correctOptionIndex;
                          const isSelectedByStudent = studentSelectedIdx === oIdx;

                          let bgClass = 'bg-white border-neutral-200 text-neutral-800';
                          let pillText = '';

                          if (isCorrect) {
                            bgClass = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                            pillText = 'Kunci Jawaban ✓';
                          } else if (isSelectedByStudent) {
                            bgClass = 'bg-rose-50 border-rose-500 text-rose-900 font-bold';
                            pillText = 'Jawaban Kamu ✗';
                          }

                          if (isCorrect && isSelectedByStudent) {
                            pillText = 'Jawaban Kamu & Kunci ✓';
                          }

                          return (
                            <div
                              key={oIdx}
                              className={`p-3 border-2 text-[11px] flex justify-between items-center transition-all ${bgClass}`}
                            >
                              <span>
                                <strong className="mr-1">{String.fromCharCode(65 + oIdx)}.</strong> {opt}
                              </span>
                              {pillText && (
                                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 text-white ${
                                  isCorrect ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}>
                                  {pillText}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="bg-neutral-50 p-3 border border-gray-200 mt-2 text-[10.5px] leading-relaxed text-gray-500 font-medium">
                      <strong className="text-gray-700 block mb-1">💡 Penjelasan Soal:</strong>
                      {q.explanation || 'Pembahasan materi sesi perkuliahan sesuai kurikulum kompetensi.'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="border-t-4 border-black p-4 bg-neutral-100 flex gap-4 shrink-0">
          <button
            onClick={handleDownloadPdf}
            className="flex-1 flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-mono font-black text-xs uppercase px-4 py-3 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Unduh PDF
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-black font-mono font-black text-xs uppercase px-4 py-3 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </motion.div>

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
