/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Slide, Quiz, Participant, Material, Annotation, NetworkPacket, ProctorStatus, CheatingLog } from '../types';
import { MOCK_SLIDES, generateFormattedTimestamp } from '../utils';
import PdfSlidesContainer from './PdfSlidesContainer';
import ChatRoom from './ChatRoom';
import ChatSystemPanel from './ChatSystemPanel';
import LiveClassLogo from './LiveClassLogo';
import { 
  Wifi, HelpCircle, FileText, Download, Clock, Award, Flame, 
  CornerDownRight, RefreshCw, AlertCircle, Sparkles, MessageSquare, Info,
  Eye, EyeOff, Camera, CameraOff, Shield, AlertTriangle, UserCheck,
  BookOpen, CheckSquare, Fingerprint, Send, Check, LayoutDashboard, GraduationCap, Laptop, FileSpreadsheet, Settings,
  Volume2, Users, Calendar, BarChart3, Megaphone, Lock, Bell, UploadCloud, FolderOpen, Database, Medal, Crown
} from 'lucide-react';

// === NORMALIZE NAME HELPER FOR ROBUSTER MATCHING ===
export const normalizeName = (name: string): string => {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ');
};

function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split("\n");
  let inCode = false;
  
  return (
    <div className="space-y-2 text-xs font-medium leading-relaxed font-sans text-gray-800">
      {lines.map((line, idx) => {
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

        if (line.startsWith("# ")) {
          return <h1 key={idx} className="text-[13px] font-black text-black uppercase tracking-wider font-display border-b-2 border-black pb-1 mt-4 block">{line.replace("# ", "")}</h1>;
        }
        
        if (line.startsWith("## ") || line.startsWith("### ")) {
          const lText = line.replace(/^##+\s+/, "");
          return <h2 key={idx} className="text-[11px] font-black text-neutral-900 uppercase tracking-wide font-sans mt-2 block">{lText}</h2>;
        }

        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          const content = line.trim().replace(/^[-*]\s+/, "");
          return (
            <div key={idx} className="flex items-start space-x-1.5 ml-3 font-medium text-gray-700">
              <span className="text-[#FF007A] shrink-0 font-mono select-none">•</span>
              <span>{content}</span>
            </div>
          );
        }

        if (!line.trim()) {
          return <div key={idx} className="h-1.5 select-none" />;
        }

        return <p key={idx} className="text-gray-700 font-medium leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

interface BankSoalItem {
  id: string;
  topic: string;
  type: string;
  questions: any[];
  createdAt: string;
}

interface StudentViewProps {
  classCode: string;
  username: string;
  onExit: () => void;
  // Shared state via BroadcastChannel
  students: Record<string, Participant>;
  messages: any[];
  onSendMessage: (text: string, isAnnounce: boolean) => void;
  onSendReply: (messageId: string, text: string) => void;
  packets: NetworkPacket[];
  
  // Slide status
  slides: Slide[];
  currentSlideIndex: number;
  externalAnnotations: Annotation[];

  // Quiz status
  activeQuiz: Quiz | null;
  onAnswerQuiz: (idx: number, optText: string, timeSpentMs: number) => void;
  answeredQuizId: string | null;

  // File sharing
  sharedMaterials: Material[];

  notifications: any[];

  // Proctors
  proctorStatuses: Record<string, ProctorStatus>;
  proctorLogs: CheatingLog[];
  onBroadcastPayload: (type: string, payload: any) => void;

  // Classroom and Reports properties
  activeMeeting: any;
  setActiveMeeting: (m: any) => void;
  meetings: any[];
  setMeetings: (m: any[]) => void;
  calendarEvents: any[];
  setCalendarEvents: (e: any[]) => void;
  assignments: any[];
  setAssignments: (a: any[]) => void;
  submissions: any[];
  setSubmissions: (s: any[]) => void;
  attendanceRecords: any[];
  setAttendanceRecords: (a: any[]) => void;
  sentReports: any[];
  setSentReports: (r: any[]) => void;
  attendanceCode: string;
  isAttendanceOpen: boolean;
  quizSubmissions: any[];
  broadcasts: any[];
  setBroadcasts: React.Dispatch<React.SetStateAction<any[]>>;
  questionBanks: any[];
  setQuestionBanks: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function StudentView({
  classCode,
  username,
  onExit,
  students,
  messages,
  onSendMessage,
  onSendReply,
  packets,
  slides,
  currentSlideIndex,
  externalAnnotations,
  activeQuiz,
  onAnswerQuiz,
  answeredQuizId,
  sharedMaterials,
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
  isAttendanceOpen,
  quizSubmissions,
  broadcasts,
  setBroadcasts,
  questionBanks,
  setQuestionBanks
}: StudentViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'classroom' | 'livesession' | 'aicenter' | 'reports' | 'settings' | 'messages' | 'notifications'>('dashboard');
  const [activeReportsSubTab, setActiveReportsSubTab] = useState<'global' | 'presensi' | 'kuis' | 'tugas' | 'leaderboard'>('global');
  const [systemAlert, setSystemAlert] = useState<{ message: string, title?: string, type?: 'success' | 'error' | 'info' } | null>(null);

  const showAlert = (message: string, type?: 'success' | 'error' | 'info') => {
    let finalType = type || 'info';
    const lowerMsg = message.toLowerCase();
    if (!type) {
      if (lowerMsg.includes('berhasil') || lowerMsg.includes('sukses') || lowerMsg.includes('✓')) finalType = 'success';
      else if (lowerMsg.includes('gagal') || lowerMsg.includes('harap') || lowerMsg.includes('belum') || lowerMsg.includes('🚨') || lowerMsg.includes('diblokir')) finalType = 'error';
    }
    setSystemAlert({ message, type: finalType });
  };
  const [activeLiveSubTab, setActiveLiveSubTab] = useState<'slides' | 'classroom'>('slides');
  const [studentClassroomSubTab, setStudentClassroomSubTab] = useState<'broadcast'|'assignment'|'materials'|'forum'|'calendar'|'members'|'banksoal'>('materials');
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
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

  // Notification listeners & toast state
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [activeToast, setActiveToast] = useState<{ id?: string, message: string, timestamp?: string, type?: string } | null>(null);
  const prevNotificationsLength = useRef(notifications?.length || 0);

  useEffect(() => {
    if (!notifications) return;
    const studentNotifs = notifications.filter(n => n.role === 'student' || n.role === 'all' || n.role === username);
    if (studentNotifs.length > 0 && notifications.length > prevNotificationsLength.current) {
        const newestNotif = studentNotifs[0];
        
        setActiveToast({
            message: newestNotif.message,
            timestamp: newestNotif.timestamp,
            type: newestNotif.type
        });
        
        if (activeTab !== 'notifications') {
            setUnreadNotificationsCount(prev => prev + 1);
        }
    }
    prevNotificationsLength.current = notifications.length;
  }, [notifications, username, activeTab]);

  useEffect(() => {
    if (activeTab === 'notifications') {
        setUnreadNotificationsCount(0);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeToast) {
        const timer = setTimeout(() => {
            setActiveToast(null);
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const [timerLeft, setTimerLeft] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const [studentShortAnswerInput, setStudentShortAnswerInput] = useState<string>('');
  const [studentShortAnswerResponseValue, setStudentShortAnswerResponseValue] = useState<string>('');

  // Student AI Quiz state engine
  const [aiQuizStep, setAiQuizStep] = useState<number>(1);
  const [aiQuizNumQuestions, setAiQuizNumQuestions] = useState<number>(5);
  const [aiQuizType, setAiQuizType] = useState<'Pilihan Ganda' | 'Isian Singkat' | 'True / False'>('Pilihan Ganda');
  const [aiQuizFiles, setAiQuizFiles] = useState<{ name: string; content: string }[]>([]);
  const [aiQuizDesc, setAiQuizDesc] = useState<string>('');
  const [aiQuizTopic, setAiQuizTopic] = useState<string>('');
  
  const [aiQuizQuestions, setAiQuizQuestions] = useState<any[]>([]);
  const [aiQuizCurrentIdx, setAiQuizCurrentIdx] = useState<number>(0);
  const [aiQuizScore, setAiQuizScore] = useState<number>(0);
  const [isAiQuizGenerated, setIsAiQuizGenerated] = useState<boolean>(false);
  const [aiQuizSelection, setAiQuizSelection] = useState<number | null>(null);
  const [aiQuizShortAnswer, setAiQuizShortAnswer] = useState<string>('');
  const [aiQuizShortAnswerSubmitted, setAiQuizShortAnswerSubmitted] = useState<boolean>(false);
  const [aiQuizStatusText, setAiQuizStatusText] = useState<string>('');
  
  // Custom tracking for student quiz answers history
  const [aiQuizAnswersRecord, setAiQuizAnswersRecord] = useState<{[key: number]: { selection: number | null, shortAnswer: string, isCorrect: boolean, shortAnswerSubmitted: boolean }}>({});

  // Restore previous answers and selection on index change
  useEffect(() => {
    const record = aiQuizAnswersRecord[aiQuizCurrentIdx];
    if (record) {
      setAiQuizSelection(record.selection);
      setAiQuizShortAnswer(record.shortAnswer);
      setAiQuizShortAnswerSubmitted(record.shortAnswerSubmitted);
    } else {
      setAiQuizSelection(null);
      setAiQuizShortAnswer('');
      setAiQuizShortAnswerSubmitted(false);
    }
  }, [aiQuizCurrentIdx]);
  
  // Aily Modal States
  const [showAilyModal, setShowAilyModal] = useState<boolean>(false);
  const [ailyChatInput, setAilyChatInput] = useState<string>('');
  const [ailyMessages, setAilyMessages] = useState<{sender: 'aily'|'user', text: string}[]>([
    { sender: 'aily', text: 'Gue MentorLiveAI, gue bisa bantu jelasin soal ini. Pilih pertanyaan di bawah atau ketik langsung.' }
  ]);
  const [aiExplanationsLog, setAiExplanationsLog] = useState<{question: string, query: string, reply: string}[]>([]);
  const [isAiReportSaved, setIsAiReportSaved] = useState<boolean>(false);
  const [selectedMeetingReport, setSelectedMeetingReport] = useState<string | null>(null);

  useEffect(() => {
    // Reset Aily chat messages when the current quiz changes
    setAilyMessages([
      { sender: 'aily', text: 'Gue MentorLiveAI, gue bisa bantu jelasin soal ini. Pilih pertanyaan di bawah atau ketik langsung.' }
    ]);
  }, [aiQuizCurrentIdx]);

  const downloadAilySummaryPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAlert("Pop-up diblokir! Izinkan pop-up untuk mengunduh PDF.");
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

    const authStudent = authorizedStudents.find(s => s.studentId === username);
    const fullName = authStudent ? authStudent.fullName : username;

    const content = aiQuizQuestions.map((q, idx) => {
      const record = aiQuizAnswersRecord[idx];
      const hasAnswered = !!record;
      
      // Render options if Pilihan Ganda / True False
      let optionsHtml = '';
      if (q.options && q.options.length > 0) {
        optionsHtml = `
          <div style="margin: 12px 0; display: flex; flex-direction: column; gap: 6px;">
            ${q.options.map((opt: string, oIdx: number) => {
              const isCorrectOption = oIdx === q.correctOptionIndex;
              const isStudentOption = record && record.selection === oIdx;
              
              let style = "padding: 8px 12px; font-family: sans-serif; font-size: 13px; border: 1.5px solid #cbd5e1; background-color: #ffffff; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;";
              let badge = '';
              
              if (isCorrectOption) {
                style = "padding: 8px 12px; font-family: sans-serif; font-size: 13px; border: 1.5px solid #10b981; background-color: #ecfdf5; color: #065f46; font-weight: bold; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;";
                badge = `<span style="background-color: #10b981; color: white; padding: 2px 6px; font-size: 10px; font-weight: 900; text-transform: uppercase; border-radius: 3px; font-family: sans-serif;">Kunci Jawaban ✓</span>`;
              } else if (isStudentOption) {
                style = "padding: 8px 12px; font-family: sans-serif; font-size: 13px; border: 1.5px solid #ef4444; background-color: #fef2f2; color: #991b1b; font-weight: bold; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;";
                badge = `<span style="background-color: #ef4444; color: white; padding: 2px 6px; font-size: 10px; font-weight: 900; text-transform: uppercase; border-radius: 3px; font-family: sans-serif;">Jawaban Kamu ✗</span>`;
              }
              
              if (isCorrectOption && isStudentOption) {
                badge = `<span style="background-color: #10b981; color: white; padding: 2px 6px; font-size: 10px; font-weight: 900; text-transform: uppercase; border-radius: 3px; font-family: sans-serif;">Jawaban Kamu &amp; Kunci ✓</span>`;
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
        // Isian Singkat
        const studentAnsStr = record && record.shortAnswer ? record.shortAnswer : '';
        const correctAnsStr = q.correctAnswerText || q.correctAnswer || '';
        const statusBadge = record 
          ? (record.isCorrect 
              ? `<span style="color: #10b981; font-weight: 900; margin-left: 8px; font-family: sans-serif;">[BENAR ✓]</span>` 
              : `<span style="color: #ef4444; font-weight: 900; margin-left: 8px; font-family: sans-serif;">[SALAH ✗]</span>`)
          : `<span style="color: #64748b; font-style: italic; margin-left: 8px; font-family: sans-serif;">[BELUM DIJAWAB]</span>`;
        
        optionsHtml = `
          <div style="margin: 12px 0; padding: 12px; background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; font-family: sans-serif; font-size: 13px;">
            <div style="margin-bottom: 6px;">
              <strong>Jawaban Kamu:</strong> ${studentAnsStr ? `"${studentAnsStr}"` : `<span style="color: #94a3b8;">(tidak diisi)</span>`} ${statusBadge}
            </div>
            <div>
              <strong>Kunci Jawaban:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; font-family: monospace; font-size: 12px; font-weight: bold; border-radius: 3px;">${correctAnsStr}</code>
            </div>
          </div>
        `;
      }

      // Find any MentorLiveAI interactions logged for this question
      const matchingLogs = aiExplanationsLog.filter(log => log.question === q.question);
      let mentorDiscussionHtml = '';
      if (matchingLogs.length > 0) {
        mentorDiscussionHtml = matchingLogs.map(log => `
          <div style="margin-top: 15px; border-left: 4px solid #1a1a1a; padding-left: 12px; background-color: #f8fafc; padding-top: 10px; padding-bottom: 10px; margin-bottom: 5px;">
            <div style="font-family: sans-serif; font-size: 13px; line-height: 1.5; margin-bottom: 5px; color: #475569;">
              <strong>Pertanyaan Student:</strong> "${log.query}"
            </div>
            <div style="font-family: sans-serif; font-size: 13px; color: #1e293b; line-height: 1.6;">
              <strong>Penjelasan MentorLiveAI:</strong><br/>
              <div style="white-space: pre-wrap; margin-top: 5px; color: #000;">${formatMarkdownToHtml(log.reply)}</div>
            </div>
          </div>
        `).join('');
      }

      return `
        <div style="margin-bottom: 30px; padding-bottom: 25px; border-bottom: 2px dashed #cbd5e1; page-break-inside: avoid;">
          <h3 style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #FF007A; font-family: sans-serif; font-weight: 900; line-height: 1.4;">
            SOAL ${idx + 1}: ${q.question}
          </h3>
          ${optionsHtml}
          
          <div style="margin-top: 10px; font-size: 13px; font-family: sans-serif; line-height: 1.6; color: #334155; background-color: #f8fafc; padding: 12px; border-radius: 4px; border: 1px solid #cbd5e1;">
            <strong>Penjelasan Soal:</strong><br/>
            <div style="margin-top: 4px; white-space: pre-wrap;">${q.explanation}</div>
          </div>
          
          ${mentorDiscussionHtml}
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Rangkuman Tanya-Jawab MentorLiveAI - ${aiQuizTopic}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1a1a1a;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 4px solid #000;
              padding-bottom: 15px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .logo {
              font-weight: 900;
              font-size: 26px;
              letter-spacing: -1px;
              text-transform: uppercase;
              font-family: 'Inter', sans-serif;
              color: #000000;
            }
            .logo span {
              color: #FF007A;
            }
            .meta {
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              color: #475569;
              text-align: right;
              line-height: 1.4;
            }
            .title-area {
              margin-bottom: 25px;
            }
            .title-area h1 {
              font-size: 20px;
              font-weight: 900;
              text-transform: uppercase;
              margin: 0 0 5px 0;
              letter-spacing: 0.5px;
            }
            .title-area p {
              margin: 0;
              font-size: 12px;
              color: #475569;
              font-weight: 500;
            }
            .footer {
              margin-top: 50px;
              border-top: 2px solid #000;
              padding-top: 15px;
              font-size: 10px;
              font-family: 'JetBrains Mono', monospace;
              text-align: center;
              color: #64748b;
            }
            @media print {
              body { padding: 20px; font-size: 12px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">LIVECLASS<span>.</span>AI</div>
            <div class="meta">
              Student: ${fullName || username} (${username})<br/>
              Topik Kuis: ${aiQuizTopic || 'Kuis Interaktif'}<br/>
              Tanggal: ${new Date().toLocaleDateString('id-ID')}
            </div>
          </div>
          <div class="title-area">
            <h1>Rangkuman Tanya Jawab MentorLiveAI</h1>
            ${aiQuizFiles.length > 0 ? `
              <div style="font-size: 13px; font-weight: bold; color: #FF007A; font-family: 'JetBrains Mono', monospace; margin: 4px 0 12px 0; text-transform: uppercase;">
                📄 JUDUL PDF YANG DIUPLOAD: ${aiQuizFiles.map(f => f.name).join(', ')}
              </div>
            ` : ''}
            <p>Laporan hasil asistensi AI untuk kuis interaktif secara real-time.</p>
          </div>
          
          <div style="margin-top: 10px;">
            ${content}
          </div>

          <div class="footer">
            Laporan ini diterbitkan otomatis oleh LiveClass.AI terintegrasi dengan MentorLiveAI. Simpan berkas ini sebagai dokumen sah hasil belajar mandiri Anda.
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadSlidePdf = (meetingNumber: number, meetingTopic: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAlert("Pop-up diblokir! Izinkan pop-up untuk mengunduh PDF.");
      return;
    }

    const titleCover = `PERTEMUAN ${meetingNumber}: ${meetingTopic.toUpperCase()}`;
    const slidesList = slides && slides.length > 0 ? slides : MOCK_SLIDES;

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

    const authStudent = authorizedStudents.find(s => s.studentId === username);
    const fullName = authStudent ? authStudent.fullName : username;

    let slidesHtml = slidesList.map((sl, idx) => {
      const bulletsHtml = Array.isArray(sl.bullets) 
        ? sl.bullets.map(b => `<li style="margin-bottom: 8px; line-height: 1.5;">${b}</li>`).join('') 
        : '';
        
      return `
        <div style="page-break-after: always; margin-bottom: 40px; padding: 40px; border: 4px solid #111; background-color: #fff; box-shadow: 4px 4px 0 #111; position: relative; font-family: 'Inter', system-ui, sans-serif; min-height: 500px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px;">
              <span style="font-family: monospace; font-weight: bold; font-size: 11px; background-color: #FF007A; color: white; padding: 4px 10px; border: 2.5px solid #111; text-transform: uppercase;">Slide ${idx + 1} / ${slidesList.length}</span>
              <span style="font-family: monospace; font-weight: bold; font-size: 11px; color: #64748b;">Pertemuan ${meetingNumber} • Slide Dek</span>
            </div>
            
            <h2 style="font-size: 26px; font-weight: 900; color: #111; text-transform: uppercase; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.5px;">${sl.title || ''}</h2>
            <p style="font-size: 14px; font-weight: 600; color: #475569; line-height: 1.6; margin-bottom: 24px; white-space: pre-wrap;">${sl.content || ''}</p>
            
            ${bulletsHtml ? `<ul style="font-size: 13px; font-weight: 700; color: #000; padding-left: 20px; list-style-type: square;">${bulletsHtml}</ul>` : ''}
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-family: monospace; font-size: 10px; color: #94a3b8; font-weight: bold;">
            <span>LiveClassroom Virtual Synchronizer</span>
            <span>ACK_SYNC_PASS • 0x5F3F</span>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Slide Presentasi - Pertemuan ${meetingNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
            body {
              font-family: 'Inter', system-ui, sans-serif;
              background-color: #f8fafc;
              padding: 20px;
              margin: 0;
            }
            @media print {
              body { background: none; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body onload="window.print()">
          <div class="no-print" style="background-color: #111; color: white; padding: 15px; font-family: monospace; font-size: 12px; margin-bottom: 20px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; border: 4px solid #00E5FF; box-shadow: 4px 4px 0 #111;">
            <span>💾 <strong>PRINT MANAGER:</strong> Silakan klik Cetak / Simpan sebagai PDF untuk mengunduh slide.</span>
            <button onclick="window.print()" style="background-color: #00E5FF; color: black; border: 2.5px solid #111; padding: 4px 12px; font-weight: 900; cursor: pointer; text-transform: uppercase; font-size: 10px;">Cetak Sesi</button>
          </div>
          
          <div style="max-width: 900px; margin: 0 auto;">
            <!-- Cover Page -->
            <div style="page-break-after: always; padding: 60px 40px; border: 4px solid #111; background-color: #fff; box-shadow: 4px 4px 0 #111; margin-bottom: 40px; min-height: 500px; display: flex; flex-direction: column; justify-content: space-between; font-family: 'Inter', sans-serif;">
              <div>
                <span style="font-family: monospace; font-weight: bold; font-size: 12px; background: #00E5FF; border: 2px solid #111; padding: 4px 8px;">DEK SLIDE MATERI PERKULIAHAN</span>
                <h1 style="font-size: 38px; font-weight: 950; line-height: 1.1; margin-top: 30px; margin-bottom: 10px; text-transform: uppercase;">${titleCover}</h1>
                <p style="font-size: 16px; font-weight: 600; color: #475569; margin: 0;">Disiapkan oleh pengampu kelas untuk pembelajaran sinkron / asinkron.</p>
              </div>
              <div style="border-top: 4px solid #111; padding-top: 20px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-weight: 700;">
                  <tr>
                    <td style="padding: 4px 0; color: #64748b; width: 140px;">KODE KELAS:</td>
                    <td>${classCode}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">MAHASISWA:</td>
                    <td>${fullName || username}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #64748b;">DIUNDUH PADA:</td>
                    <td>${generateFormattedTimestamp()}</td>
                  </tr>
                </table>
              </div>
            </div>
            
            ${slidesHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadMeetingReportPdf = (m: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAlert("Pop-up diblokir! Izinkan pop-up untuk mengunduh PDF.");
      return;
    }

    const attRec = attendanceRecords.find(r => r.meetingId === m.id && normalizeName(r.studentName) === normalizeName(username));
    const isHadir = !!attRec;
    const waktuPresensi = attRec ? attRec.checkInTime || attRec.time : '-';
    
    const meetingQuizzes = quizSubmissions.filter(q => q.meetingId === m.id && normalizeName(q.studentName) === normalizeName(username));
    const totalQuestions = meetingQuizzes.length;
    const correctAnswers = meetingQuizzes.filter(q => q.isCorrect).length;
    const kuisScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : null;

    const assignmentObj = assignments.find(a => a.meetingId === m.id);
    const submissionObj = assignmentObj ? submissions.find(s => s.assignmentId === assignmentObj.id && normalizeName(s.studentName) === normalizeName(username)) : null;
    const tugasVal = submissionObj ? (submissionObj.isGraded ? `${submissionObj.grade}/100` : 'TERKIRIM (BELUM DINILAI)') : 'BELUM SUBMIT';

    const authStudent = authorizedStudents.find(s => s.studentId === username);
    const fullName = authStudent ? authStudent.fullName : username;

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

    let kuisDetailsHtml = meetingQuizzes.map((q, idx) => {
      return `
        <div style="padding: 12px; border: 1.5px solid #111; margin-bottom: 12px; background-color: ${q.isCorrect ? '#f0fdf4' : '#fef2f2'};">
          <div style="font-family: monospace; font-size: 11px; font-weight: bold; color: ${q.isCorrect ? '#16a34a' : '#d97706'}; margin-bottom: 6px;">
            SOAL ${idx + 1} • ${q.isCorrect ? 'JAWABAN BENAR [PASS] ✓' : 'JAWABAN SALAH [FAIL] ✗'}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #111; margin-bottom: 8px;">"${q.question || 'Pertanyaan Kuis'}"</div>
          <div style="font-size: 12px; color: #475569;">
            Opsi dipilih: <strong>"${q.answerSubmitted || 'N/A'}"</strong> (Durasi jawab: ${(q.timeSpent / 1000).toFixed(1)}s)
          </div>
        </div>
      `;
    }).join('');

    if (meetingQuizzes.length === 0) {
      kuisDetailsHtml = `<p style="font-size: 12px; font-style: italic; color: #94a3b8; text-align: center; padding: 10px;">Tidak ada kuis interaktif yang diikuti pada pertemuan ini.</p>`;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Pertemuan - Pertemuan ${m.number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
            body {
              font-family: 'Inter', system-ui, sans-serif;
              background-color: #f8fafc;
              padding: 20px;
              margin: 0;
            }
            @media print {
              body { background: none; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body onload="window.print()">
          <div class="no-print" style="background-color: #111; color: white; padding: 15px; font-family: monospace; font-size: 12px; margin-bottom: 20px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; border: 4px solid #00E5FF; box-shadow: 4px 4px 0 #111;">
            <span>📊 <strong>REKAP MANAGER:</strong> Laporan kelulusan materi ini siap dicetak.</span>
            <button onclick="window.print()" style="background-color: #00E5FF; color: black; border: 2.5px solid #111; padding: 4px 12px; font-weight: 900; cursor: pointer; text-transform: uppercase; font-size: 10px;">Cetak Laporan</button>
          </div>
          
          <div style="max-width: 850px; margin: 0 auto; background-color: #fff; border: 4px solid #111; box-shadow: 4px 4px 0 #111; padding: 40px; min-height: 700px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #111; padding-bottom: 20px; margin-bottom: 30px;">
                <div>
                  <span style="font-family: monospace; font-weight: bold; font-size: 10px; background-color: #111; color: #00E5FF; padding: 4px 8px; border: 1px solid #111; text-transform: uppercase;">STUDENT PERFORMANCE RECAPITULATION</span>
                  <h1 style="font-size: 30px; font-weight: 950; margin: 8px 0 0 0; text-transform: uppercase; tracking-tight: -1px;">LAPORAN PERTEMUAN ${m.number}</h1>
                  <p style="font-size: 13px; font-weight: 600; color: #475569; margin: 4px 0 0 0;">Topik: ${m.topic.toUpperCase()}</p>
                </div>
                <div style="text-align: right; font-family: monospace; font-size: 12px; font-weight: bold; line-height: 1.5;">
                  <span style="display: inline-block; font-size: 20px; font-weight: 900; background-color: #e0f2fe; color: #0369a1; border: 2.5px solid #111; padding: 6px 12px;">SCORE: ${kuisScore !== null ? kuisScore + '%' : '- %'}</span>
                </div>
              </div>
              
              <div style="grid-template-columns: 1fr 1fr; display: grid; gap: 20px; margin-bottom: 30px;">
                <div style="border: 2.5px solid #111; padding: 15px; background-color: #fafafa;">
                  <h3 style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #111; padding-bottom: 6px;">IDENTITAS MAHASISWA</h3>
                  <table style="width: 100%; font-size: 12px; font-weight: 700; border-collapse: collapse;">
                    <tr><td style="color: #64748b; padding-bottom: 6px;">NAMA LENGKAP:</td><td style="color: #111; padding-bottom: 6px; text-transform: uppercase;">${fullName}</td></tr>
                    <tr><td style="color: #64748b; padding-bottom: 6px;">NIM / ID:</td><td style="color: #111; padding-bottom: 6px;">${username}</td></tr>
                    <tr><td style="color: #64748b;">KODE KELAS:</td><td style="color: #111;">${classCode}</td></tr>
                  </table>
                </div>
                
                <div style="border: 2.5px solid #111; padding: 15px; background-color: #fafafa;">
                  <h3 style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin-top: 0; margin-bottom: 12px; border-bottom: 1px solid #111; padding-bottom: 6px;">STATUS PERFORMANCE</h3>
                  <table style="width: 100%; font-size: 12px; font-weight: 700; border-collapse: collapse;">
                    <tr><td style="color: #64748b; padding-bottom: 6px;">PRESENSI:</td><td style="padding-bottom: 6px;"><span style="background-color: ${isHadir ? '#dcfce7' : '#fee2e2'}; color: ${isHadir ? '#15803d' : '#b91c1c'}; border: 1.5px solid #111; padding: 1px 6px; font-size: 10px; font-family: monospace;">${isHadir ? 'HADIR ✓ (' + waktuPresensi + ')' : 'ABSEN / ALFA ✗'}</span></td></tr>
                    <tr><td style="color: #64748b; padding-bottom: 6px;">NILAI TUGAS:</td><td style="color: #111; padding-bottom: 6px;"><span style="font-family: monospace; font-weight: 900;">${tugasVal}</span></td></tr>
                    <tr><td style="color: #64748b;">KUIS AKURASI:</td><td><span style="font-family: monospace; font-weight: bold;">${totalQuestions > 0 ? `${correctAnswers} dari ${totalQuestions} (${Math.round((correctAnswers / totalQuestions) * 100)}%)` : 'Belum Ada'}</span></td></tr>
                  </table>
                </div>
              </div>
              
              <div style="margin-bottom: 30px;">
                <h3 style="font-size: 13px; font-weight: 900; text-transform: uppercase; color: #111; margin-bottom: 12px; border-bottom: 2px solid #111; padding-bottom: 4px;">REKAP HASIL KUIS INTERAKTIF</h3>
                ${kuisDetailsHtml}
              </div>
            </div>
            
            <div style="border-top: 4px solid #111; padding-top: 15px; display: flex; justify-content: space-between; font-family: monospace; font-size: 11px; color: #64748b; font-weight: bold;">
              <span>Sistem Evaluasi Terintegrasi LiveClassroom</span>
              <span>VERIFIED_SECURITY_STAMP • SIGN_OK✓</span>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  // Status Presensi On-Cam Student
  const hasCheckedIn = attendanceRecords.some(r => r.studentName.toLowerCase() === username.toLowerCase() && r.meetingId === activeMeeting?.id);

  // Student specific state controllers for Classroom and Reports tabs
  const [assignmentAnswers, setAssignmentAnswers] = useState<Record<string, string>>({});
  const [assignmentAnswerFiles, setAssignmentAnswerFiles] = useState<Record<string, File>>({});
  const [authorizedStudents, setAuthorizedStudents] = useState<{fullName: string; studentId: string}[]>([]);

  useEffect(() => {
    const fetchAuth = () => {
      try {
        const saved = localStorage.getItem('liveclass-auth-students-' + classCode);
        if (saved) {
           setAuthorizedStudents(JSON.parse(saved));
        } else {
           setAuthorizedStudents([]);
        }
      } catch (e) {}
    };
    fetchAuth();
    const inv = setInterval(fetchAuth, 2000);
    return () => clearInterval(inv);
  }, [classCode]);
  const [isAttendanceOnCam, setIsAttendanceOnCam] = useState<boolean>(false);
  const [inputAttendanceCode, setInputAttendanceCode] = useState<string>('');

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


  // AI Proctoring student-side state engine
  const [proctorState, setProctorState] = useState<ProctorStatus>({
    studentId: 'std-' + (username || 'user').substring(0, 4) + '-' + Math.floor(Math.random() * 1000),
    username,
    status: 'normal',
    isWebcamOn: true,
    isFaceDetected: true,
    isOutOfFrame: false,
    isGazeDeviation: false,
    isMultipleFaces: false,
    tabSwitchCount: 0,
    unfocusedSecs: 0,
    focusScore: 100,
    faceDetectionRate: 100,
    suspiciousScore: 0,
    warningCount: 0,
    scoreDeduction: 0,
    isFlaggedForReview: false,
    isInvalidated: false
  });

  const [incomingTeacherAction, setIncomingTeacherAction] = useState<any | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const setVideoRef = React.useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(e => console.warn("Video play failed in callback ref:", e));
    }
  }, []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const attendanceVideoRef = useRef<HTMLVideoElement | null>(null);
  const setAttendanceVideoRef = React.useCallback((el: HTMLVideoElement | null) => {
    attendanceVideoRef.current = el;
    if (el && attendanceStreamRef.current) {
      el.srcObject = attendanceStreamRef.current;
      el.play().catch(e => console.warn("Attendance video play failed in callback ref:", e));
    }
  }, []);
  const attendanceStreamRef = useRef<MediaStream | null>(null);

  // Common status update and broadcast synchronizer
  const updateAndBroadcastProctorState = (
    updater: Partial<ProctorStatus> | ((prev: ProctorStatus) => ProctorStatus),
    violationType?: string,
    logDetails?: string
  ) => {
    setProctorState((prev) => {
      const nextState = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      
      // Calculate dynamic stats
      let score = 0;
      if (!nextState.isWebcamOn) score += 40;
      if (!nextState.isFaceDetected || nextState.isOutOfFrame) score += 30;
      if (nextState.isGazeDeviation) score += 15;
      if (nextState.isMultipleFaces) score += 35;
      score += nextState.tabSwitchCount * 15;
      score += Math.min(20, nextState.unfocusedSecs) * 1.5;
      nextState.suspiciousScore = Math.min(100, Math.floor(score));

      if (nextState.suspiciousScore > 50 || nextState.warningCount >= 3 || nextState.isInvalidated) {
        nextState.status = 'suspicious';
      } else if (nextState.suspiciousScore > 15 || nextState.warningCount > 0) {
        nextState.status = 'warning';
      } else {
        nextState.status = 'normal';
      }

      const penalty = (nextState.tabSwitchCount * 12) + (nextState.unfocusedSecs * 1.5) + (nextState.isGazeDeviation ? 12 : 0) + (!nextState.isFaceDetected ? 20 : 0);
      nextState.focusScore = Math.max(0, 100 - Math.floor(penalty));

      // Simple interactive face detection rate
      const activeDetections = nextState.isFaceDetected && !nextState.isOutOfFrame && nextState.isWebcamOn;
      nextState.faceDetectionRate = activeDetections ? Math.min(100, prev.faceDetectionRate + 1) : Math.max(0, prev.faceDetectionRate - 5);

      let newLog: any = null;
      if (violationType) {
        newLog = {
          id: 'log-' + Math.random().toString(36).substr(2, 9),
          studentId: nextState.studentId,
          studentName: username,
          timestamp: generateFormattedTimestamp(),
          violationType,
          details: logDetails || violationType,
          warningCount: nextState.warningCount
        };
      }

      // Broadcast telemetry to teacher
      setTimeout(() => {
        onBroadcastPayload('PROCTOR_STATUS_UPDATE', {
          studentName: username,
          proctorState: nextState,
          newLog
        });
      }, 0);

      return nextState;
    });
  };

  // Self stats references
  const selfStats = students[username] || { score: 0, streak: 0, accuracy: 100, ping: 12, status: 'online', meetingScore: 0 };

  // Countdown timer for active Quiz
  useEffect(() => {
    let t: any;
    if (activeQuiz && activeQuiz.isActive) {
      setTimerLeft(activeQuiz.durationSeconds);
      setQuizStartTime(Date.now());
      setSelectedOption(null); // Reset selection
      setStudentShortAnswerInput('');
      setStudentShortAnswerResponseValue('');

      t = setInterval(() => {
        setTimerLeft((p) => {
          if (p <= 1) {
            clearInterval(t);
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    } else {
      setTimerLeft(0);
    }

    return () => clearInterval(t);
  }, [activeQuiz]);

  const handleSelectOption = (idx: number, optText: string) => {
    if (selectedOption !== null || timerLeft <= 0 || !activeQuiz) return;
    
    setSelectedOption(idx);
    const timeSpent = Date.now() - quizStartTime;
    onAnswerQuiz(idx, optText, timeSpent);
  };

  const handleGenerateAiQuiz = async () => {
    setAiQuizSelection(null);
    setAiQuizShortAnswer('');
    setAiQuizShortAnswerSubmitted(false);
    setAiQuizCurrentIdx(0);
    setAiQuizScore(0);
    setAiQuizStatusText("MENGHUBUNGI GENERAL INTELLIGENCE ENGINE AI...");
    try {
      const response = await fetch("/api/ai/generate-custom-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-api-key": localStorage.getItem("user-gemini-api-key") || "" },
        body: JSON.stringify({ 
          numQuestions: aiQuizNumQuestions,
          quizType: aiQuizType,
          files: aiQuizFiles,
          description: aiQuizDesc
        })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.questions && Array.isArray(data.questions)) {
        setAiQuizQuestions(data.questions);
        setAiQuizAnswersRecord({});
        setAiQuizTopic((aiQuizDesc || aiQuizType).substring(0, 30));
        setIsAiQuizGenerated(true);
      } else {
        throw new Error("Format respon kuis AI tidak sesuai.");
      }
    } catch (err: any) {
      console.warn(err);
      showAlert(`Gagal membuat kuis AI: ${err.message || 'Koneksi bermasalah'}`);
    } finally {
      setAiQuizStatusText("");
    }
  };

  const handleAiQuizAnswer = (optionIdx: number) => {
    if (aiQuizSelection !== null) return;
    setAiQuizSelection(optionIdx);
    const correctIdx = aiQuizQuestions[aiQuizCurrentIdx].correctOptionIndex;
    const isCorrect = optionIdx === correctIdx;
    if (isCorrect) {
      setAiQuizScore(p => p + 1);
    }
    setAiQuizAnswersRecord(prev => ({
      ...prev,
      [aiQuizCurrentIdx]: {
        selection: optionIdx,
        shortAnswer: '',
        isCorrect,
        shortAnswerSubmitted: false
      }
    }));
  };

  const handleAilySubmit = async (text: string) => {
    if (!text.trim()) return;
    setAilyMessages(p => [...p, { sender: 'user', text }]);
    setAilyChatInput('');

    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-api-key": localStorage.getItem("user-gemini-api-key") || "" },
        body: JSON.stringify({ 
           action: "chat", 
           topic: aiQuizTopic,
           question: aiQuizQuestions[aiQuizCurrentIdx].question,
           explanation: aiQuizQuestions[aiQuizCurrentIdx].explanation,
           query: text
        })
      });
      if (response.ok) {
        const data = await response.json();
        const replyText = data.reply || 'Oops, aku agak lag. Coba lagi ya!';
        setAilyMessages(p => [...p, { sender: 'aily', text: replyText }]);
        setAiExplanationsLog(prev => [
          ...prev,
          {
            question: aiQuizQuestions[aiQuizCurrentIdx].question,
            query: text,
            reply: replyText
          }
        ]);
      } else {
        setAilyMessages(p => [...p, { sender: 'aily', text: 'Maaf, server lagi sibuk. Nanti kita ngobrol lagi ya!' }]);
      }
    } catch {
      setAilyMessages(p => [...p, { sender: 'aily', text: 'Koneksi keputus nih. Periksa internet ya!' }]);
    }
  };

  // Webcam activation and streaming to tracking canvas
  useEffect(() => {
    let active = true;
    if (activeQuiz && proctorState.isWebcamOn) {
      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        .then((s) => {
          if (active) {
            streamRef.current = s;
            if (videoRef.current) {
              videoRef.current.srcObject = s;
              videoRef.current.play().catch(e => console.warn(e));
            }
          } else {
            s.getTracks().forEach(t => t.stop());
          }
        })
        .catch((err) => {
          console.warn('Camera blocked or not found, running digital simulation instead:', err);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    }
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [activeQuiz, proctorState.isWebcamOn]);

  // Attendance webcam streaming setup
  useEffect(() => {
    let active = true;
    if (isAttendanceOnCam) {
      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        .then((s) => {
          if (active) {
            attendanceStreamRef.current = s;
            if (attendanceVideoRef.current) {
              attendanceVideoRef.current.srcObject = s;
              attendanceVideoRef.current.play().catch(e => console.warn(e));
            }
          } else {
            s.getTracks().forEach(t => t.stop());
          }
        })
        .catch((err) => {
          console.warn('Attendance camera blocked or not found, showing digital scan instead:', err);
        });
    } else {
      if (attendanceStreamRef.current) {
        attendanceStreamRef.current.getTracks().forEach(t => t.stop());
        attendanceStreamRef.current = null;
      }
    }
    return () => {
      active = false;
      if (attendanceStreamRef.current) {
        attendanceStreamRef.current.getTracks().forEach(t => t.stop());
        attendanceStreamRef.current = null;
      }
    };
  }, [isAttendanceOnCam]);

  // Tab switching & Minimize focus tracking
  useEffect(() => {
    if (!activeQuiz) return;

    const handleVisibility = () => {
      if (document.hidden) {
        updateAndBroadcastProctorState((prev) => {
          const nextCount = prev.tabSwitchCount + 1;
          const nextWarning = Math.min(3, prev.warningCount + 1);
          return {
            ...prev,
            tabSwitchCount: nextCount,
            warningCount: nextWarning
          };
        }, 'WEB_TAB_SWITCHED', `Pergantian tab browser terdeteksi (Pindah tab kuis).`);
      }
    };

    const handleWindowBlur = () => {
      updateAndBroadcastProctorState((prev) => {
        const nextWarning = Math.min(3, prev.warningCount + 1);
        return {
          ...prev,
          warningCount: nextWarning
        };
      }, 'FOCUS_LOST', `Beralih jendela aplikasi lain terdeteksi (Kehilangan fokus window).`);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [activeQuiz]);

  // Unfocus accumulator ticks every second
  useEffect(() => {
    let interval: any;
    if (activeQuiz) {
      interval = setInterval(() => {
        if (document.hidden) {
          updateAndBroadcastProctorState((prev) => ({
            ...prev,
            unfocusedSecs: prev.unfocusedSecs + 1
          }));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeQuiz]);

  // Receive actions dispatched by teacher
  useEffect(() => {
    const handleTeacherAction = (e: any) => {
      const action = e.detail;
      setIncomingTeacherAction(action);
      
      setProctorState((prev) => {
        const currentDeduction = action.actionType === 'deduct_score' ? (prev.scoreDeduction + (action.deduction || 20)) : prev.scoreDeduction;
        const reviewFlag = action.actionType === 'flag_review' ? true : prev.isFlaggedForReview;
        const invalidateFlag = action.actionType === 'invalidate' ? true : prev.isInvalidated;
        
        return {
          ...prev,
          warningCount: action.actionType === 'warn_student' ? Math.min(3, prev.warningCount + 1) : prev.warningCount,
          scoreDeduction: currentDeduction,
          isFlaggedForReview: reviewFlag,
          isInvalidated: invalidateFlag,
          status: invalidateFlag ? 'suspicious' : prev.status
        };
      });

      // Dismiss pop-up after 6s
      setTimeout(() => {
        setIncomingTeacherAction(null);
      }, 6000);
    };

    window.addEventListener('teacher-proctor-action', handleTeacherAction as any);
    return () => window.removeEventListener('teacher-proctor-action', handleTeacherAction as any);
  }, []);

  // Tracking loop sketch generator for canvas mesh overlays
  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: any;

    const drawMesh = () => {
      if (!active) return;
      
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Draw background frame source
      if (proctorState.isWebcamOn && videoRef.current && videoRef.current.readyState >= 2) {
        ctx.save();
        ctx.scale(-1, 1); // Mirror reflection
        ctx.drawImage(videoRef.current, -width, 0, width, height);
        ctx.restore();
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        // Grid dots pattern
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < width; i += 24) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, height);
          ctx.stroke();
        }
        for (let j = 0; j < height; j += 24) {
          ctx.beginPath();
          ctx.moveTo(0, j);
          ctx.lineTo(width, j);
          ctx.stroke();
        }
      }

      // Check violation status to customize radar drawing templates
      if (!proctorState.isWebcamOn) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.25) ';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🔴 [WEBCAM_SUSPENDED]', width / 2, height / 2 - 10);
        ctx.fillText('Kamera dimatikan student', width / 2, height / 2 + 8);
        
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2 - 40, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width / 2 - 15, height / 2 - 55);
        ctx.lineTo(width / 2 + 15, height / 2 - 25);
        ctx.stroke();
      } else if (!proctorState.isFaceDetected || proctorState.isOutOfFrame) {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ [FACE_ABSENT_ALERT]', width / 2, height / 2 - 5);
        ctx.fillText('Pasang wajah tegak di depan kamera', width / 2, height / 2 + 12);

        const scanY = (Date.now() / 4) % height;
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(4, scanY);
        ctx.lineTo(width - 4, scanY);
        ctx.stroke();
      } else {
        const centerX = width / 2;
        const centerY = height / 2 - 10;
        const scanTone = proctorState.isGazeDeviation ? '#ef4444' : '#10b981';

        // Face bounds tracker
        ctx.strokeStyle = scanTone;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(centerX - 42, centerY - 55, 84, 110);
        ctx.fillStyle = proctorState.isGazeDeviation ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.08)';
        ctx.fillRect(centerX - 42, centerY - 55, 84, 110);

        // Brackets corners
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 3.5;
        // top-left
        ctx.beginPath(); ctx.moveTo(centerX - 47, centerY - 45); ctx.lineTo(centerX - 47, centerY - 60); ctx.lineTo(centerX - 32, centerY - 60); ctx.stroke();
        // top-right
        ctx.beginPath(); ctx.moveTo(centerX + 47, centerY - 45); ctx.lineTo(centerX + 47, centerY - 60); ctx.lineTo(centerX + 32, centerY - 60); ctx.stroke();
        // bottom-left
        ctx.beginPath(); ctx.moveTo(centerX - 47, centerY + 45); ctx.lineTo(centerX - 47, centerY + 60); ctx.lineTo(centerX - 32, centerY + 60); ctx.stroke();
        // bottom-right
        ctx.beginPath(); ctx.moveTo(centerX + 47, centerY + 45); ctx.lineTo(centerX + 47, centerY + 60); ctx.lineTo(centerX + 32, centerY + 60); ctx.stroke();

        // Iris tracking coordinates
        const eyeLY = centerY - 14;
        const eyeLX = centerX - 16;
        const eyeRX = centerX + 16;
        
        ctx.fillStyle = proctorState.isGazeDeviation ? '#ef4444' : '#10b981';
        ctx.beginPath(); ctx.arc(eyeLX, eyeLY, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eyeRX, eyeLY, 4.5, 0, Math.PI * 2); ctx.fill();

        // Eye gaze vectors representation
        if (proctorState.isGazeDeviation) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(eyeLX, eyeLY);
          ctx.lineTo(eyeLX - 32, eyeLY + 4);
          ctx.moveTo(eyeRX, eyeLY);
          ctx.lineTo(eyeRX - 32, eyeLY + 4);
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('⚠️ DETEKSI MATA MELIRIK', centerX, centerY + 78);
        } else {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(eyeLX, eyeLY); ctx.lineTo(eyeLX, eyeLY + 10);
          ctx.moveTo(eyeRX, eyeLY); ctx.lineTo(eyeRX, eyeLY + 10);
          ctx.stroke();

          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('PANDANGAN: SENTRAL', centerX, centerY + 78);
        }

        // Multiple faces overlay
        if (proctorState.isMultipleFaces) {
          const fx2 = centerX + 55;
          const fy2 = centerY + 10;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(fx2 - 20, fy2 - 25, 40, 50);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
          ctx.fillRect(fx2 - 20, fy2 - 25, 40, 50);

          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('DUA_ORG!', fx2 - 18, fy2 + 38);
        }

        // Telemetry readout
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(6, 6, 175, 48);
        ctx.strokeStyle = '#00E5FF';
        ctx.strokeRect(6, 6, 175, 48);

        ctx.fillStyle = '#00E5FF';
        ctx.font = '9px monospace';
        ctx.fillText(`CV ENGINE: MediaPipe Enabled`, 10, 16);
        ctx.fillText(`EST: ${proctorState.isGazeDeviation ? 'GAZE_AWAY' : 'GAZE_FOCUS'}`, 10, 28);
        ctx.fillText(`INTEGRITY SCORE: ${proctorState.focusScore}%`, 10, 40);
        ctx.fillText(`DET_RATE: ${proctorState.faceDetectionRate.toFixed(0)}%`, 100, 40);
      }

      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1;
      ctx.strokeRect(4, 4, width - 8, height - 8);

      animId = requestAnimationFrame(drawMesh);
    };

    drawMesh();

    return () => {
      active = false;
      cancelAnimationFrame(animId);
    };
  }, [proctorState]);

  // Simulators toggling mechanics
  const handleToggleFaceAbsence = () => {
    updateAndBroadcastProctorState((prev) => {
      const nextFace = !prev.isFaceDetected;
      const nextWarning = !nextFace ? Math.min(3, prev.warningCount + 1) : prev.warningCount;
      return {
        ...prev,
        isFaceDetected: nextFace,
        isOutOfFrame: !nextFace,
        warningCount: nextWarning
      };
    }, !proctorState.isFaceDetected ? 'FACE_UNDETECTED' : undefined, 'Wajah student tidak terdeteksi atau berada diluar jangkauan frame.');
  };

  const handleToggleGazeDeviation = () => {
    updateAndBroadcastProctorState((prev) => {
      const nextGaze = !prev.isGazeDeviation;
      const nextWarning = nextGaze ? Math.min(3, prev.warningCount + 1) : prev.warningCount;
      return {
        ...prev,
        isGazeDeviation: nextGaze,
        warningCount: nextWarning
      };
    }, !proctorState.isGazeDeviation ? 'EYE_GAZE_DEVIATION' : undefined, 'Pandangan mata student terus-menerus melirik ke arah luar layar kuis.');
  };

  const handleToggleMultipleFaces = () => {
    updateAndBroadcastProctorState((prev) => {
      const nextMulti = !prev.isMultipleFaces;
      const nextWarning = nextMulti ? Math.min(3, prev.warningCount + 1) : prev.warningCount;
      return {
        ...prev,
        isMultipleFaces: nextMulti,
        warningCount: nextWarning
      };
    }, !proctorState.isMultipleFaces ? 'MULTI_FACE_DETECTED' : undefined, 'Terdeteksi wajah kedua / orang lain dilingkup area tangkapan.');
  };

  const handleToggleWebcam = () => {
    updateAndBroadcastProctorState((prev) => {
      const nextWebcam = !prev.isWebcamOn;
      const nextWarning = !nextWebcam ? Math.min(3, prev.warningCount + 1) : prev.warningCount;
      return {
        ...prev,
        isWebcamOn: nextWebcam,
        isFaceDetected: nextWebcam,
        isOutOfFrame: !nextWebcam,
        warningCount: nextWarning
      };
    }, !proctorState.isWebcamOn ? 'WEBCAM_TURNED_OFF' : undefined, 'Webcam dimatikan saat pengerjaan quiz berlangsung.');
  };

  const myFilteredPackets = packets
    .filter(p => p.sender === username || p.receiver === username)
    .slice(-15);

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col justify-between">
      
      {/* Top Navbar with responsive alignment */}
      <header className="border-b-4 border-black py-4 px-6 flex flex-wrap justify-between items-center bg-white sticky top-0 z-40 gap-4">
        <div className="flex items-center space-x-3 shrink-0">
          <LiveClassLogo size="md" variant="icon-only" themeColor="cyan" />
          <div>
            <span className="font-display font-black text-xl text-[#111111]">
              LiveClass<span className="text-[#FF007A]">.</span> <span className="text-gray-400 font-normal text-xs uppercase font-mono tracking-wider ml-1">STUDENT</span>
            </span>
            <div className="flex items-center space-x-1 font-mono text-[10px] text-gray-500 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse border border-black" />
              <span>ACTIVE: @{username?.toUpperCase() || ''}</span>
            </div>
          </div>
        </div>

        {activeMeeting && (
          <div className="hidden lg:flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse"></span>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#00E5FF] font-black bg-[#111111] px-1.5 py-0.5 ml-1">SESI AKTIF: PERTEMUAN KE-{activeMeeting.number}</span>
              <h4 className="font-sans font-black text-xs uppercase leading-none mt-1 ml-1 text-black">{activeMeeting.topic}</h4>
            </div>
          </div>
        )}

        {/* Room identifiers and metrics info */}
        <div className="flex items-center space-x-4 shrink-0 font-mono">
          <div className="bg-white border-4 border-black px-4 py-1.5 flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-[8px] text-gray-400 font-black block uppercase leading-none">KODE KELAS</span>
            <span className="font-sans font-black text-[#FF007A] text-sm tracking-widest leading-none mt-0.5">{classCode}</span>
          </div>

          <button
            id="btn-student-leave"
            onClick={onExit}
            className="px-4 py-2 bg-[#FF007A] hover:bg-[#ff1f89] text-white border-4 border-black text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
          >
            Keluar Kelas
          </button>
        </div>
      </header>

      {/* Main Grid split in 12-column layout */}
      <main className="w-full max-w-[1600px] mx-auto px-4 py-6 md:px-6 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white">
        
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
                  className={`flex items-center justify-between space-x-2 px-3 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-black whitespace-nowrap lg:whitespace-normal transition-all cursor-pointer w-auto lg:w-full ${
                    activeTab === t.id 
                       ? 'bg-[#00E5FF] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-x-px translate-y-px' 
                      : 'bg-white text-gray-700 hover:text-black hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-4 w-4 shrink-0 transition-all ${activeTab === t.id ? 'text-black' : 'text-[#00E5FF]'}`} />
                    <span className="leading-tight text-left">{t.label}</span>
                  </div>
                  {t.id === 'notifications' && unreadNotificationsCount > 0 && (
                     <div className="ml-2 animate-bounce bg-[#FF007A] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                       {unreadNotificationsCount}
                     </div>
                  )}
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
          
          {/* View Container switches */}
          <div className="transition-all duration-300">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="bg-[#00E5FF]/10 border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative text-left">
                  <div className="absolute right-6 top-6 text-4xl animate-bounce">🎓</div>
                  <h3 className="font-display font-black text-xs uppercase tracking-widest text-[#008ba3] mb-1">
                    DASHBOARD STUDENT
                  </h3>
                  <h2 className="text-xl font-black text-black uppercase tracking-tight">
                    SELAMAT DATANG KEMBALI, {username || 'STUDENT'}!
                  </h2>
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed font-semibold max-w-2xl">
                    Pantau statistik pembelajaran Anda, ikuti sesi live class, dan tantang diri Anda dengan kuis AI interaktif. Akses materi, kumpulkan tugas, dan pantau nilai langsung dari menu navigasi.
                  </p>
                </div>
                
                {/* Student stats block */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase font-mono flex items-center justify-center md:justify-start gap-1.5">
                      <Award className="h-3.5 w-3.5 text-[#00E5FF] shrink-0" /> LEADERBOARD SCORES
                    </span>
                    <div className="mt-3 flex flex-row items-center justify-center md:justify-start gap-6">
                      <div>
                        <span className="text-[8px] text-gray-400 font-black block uppercase leading-none mb-1">Pertemuan</span>
                        <p className="font-sans text-2xl font-black text-[#FF007A] leading-none">{selfStats.meetingScore ?? 0} <span className="text-[9px] font-semibold text-gray-400">PTS</span></p>
                      </div>
                      <div className="border-l-2 border-gray-200 pl-6 space-y-1">
                        <span className="text-[8px] text-gray-400 font-black block uppercase leading-none">Classroom</span>
                        <p className="font-sans text-2xl font-black text-[#008ba3] leading-none">{selfStats.score} <span className="text-[9px] font-semibold text-gray-400">PTS</span></p>
                      </div>
                    </div>
                    <span className="text-[8px] text-gray-400 font-bold block pt-3 text-center md:text-left font-mono border-t border-gray-100 mt-3">SKOR KUMULATIF AKTIF</span>
                  </div>

                  <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase font-mono flex items-center justify-center md:justify-start gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" /> CONC_STREAK
                    </span>
                    <span className="text-4xl font-black text-amber-500 font-mono leading-none flex items-center justify-center md:justify-start mt-3">
                      {selfStats.streak} <span className="text-xs font-semibold text-gray-400 ml-2">STREAK</span>
                    </span>
                    <span className="text-[8px] text-amber-600 font-bold flex items-center justify-center md:justify-start gap-1 pt-3 font-mono border-t border-gray-100 mt-3">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shrink-0" /> KONSENTRASI TERJAGA
                    </span>
                  </div>

                  <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between">
                    <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase font-mono flex items-center justify-center md:justify-start gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> QUIZ ACCURACY
                    </span>
                    <span className="text-4xl font-black text-[#008ba3] font-mono leading-none justify-center md:justify-start flex items-center mt-3">
                      {selfStats.accuracy}<span className="text-2xl font-black">%</span>
                    </span>
                    <span className="text-[8px] text-emerald-700 font-bold block pt-3 text-center md:text-left font-mono border-t border-gray-100 mt-3">AKURASI RATA-RATA</span>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'livesession') && (
              <div className="space-y-4 text-left">
                {!activeMeeting ? (
                  <div className="border-4 border-black p-8 bg-amber-50 text-center space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] select-none my-4">
                    <div className="animate-spin h-10 w-10 border-4 border-[#FF007A] border-t-transparent rounded-full mx-auto" />
                    <h3 className="font-display font-black text-lg text-black uppercase tracking-tight">
                      ⏳ RUANG TUNGGU LIVE CLASS INTERAKTIF
                    </h3>
                    <p className="text-xs text-gray-700 max-w-md mx-auto font-semibold leading-relaxed">
                      Sesi perkuliahan interaktif Live Class masih dikunci (<strong>LOCKED</strong>). Silakan menunggu Teacher mengaktifkan Sesi Pertemuan Kuliah di Konsol Utama Teacher.
                    </p>
                    <div className="text-[10px] bg-slate-800 text-yellow-300 font-mono font-bold px-3 py-1.5 inline-block uppercase border border-black">
                      STATUS PORTAL: WAITING_FOR_ACTIVATION
                    </div>
                  </div>
                ) : !hasCheckedIn ? (
                  <div className="border-4 border-black p-6 bg-cyan-50 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6 max-w-2xl mx-auto my-6 text-left">
                    <div className="border-b-2 border-black pb-3 select-none">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="text-[10px] font-mono font-black text-[#FF007A] bg-[#FF007A]/10 border border-black px-2 py-0.5 uppercase flex items-center gap-1.5">
                          <Camera className="h-3.5 w-3.5 shrink-0" /> VERIFIKASI WAJAH & PRESENSI KELAS
                        </span>
                        <span className="text-[9.5px] font-mono font-black text-[#FF007A] uppercase bg-pink-50 border border-pink-200 px-1.5 py-0.5">
                          MANDATORY ONCAM
                        </span>
                      </div>
                      <h3 className="font-display font-black text-base text-black mt-2 uppercase tracking-tight flex items-center gap-1.5">
                        <Lock className="h-4 w-4 shrink-0 text-black" /> Pintu Gerbang Live Class Interaktif Terkunci
                      </h3>
                      <p className="text-xs text-gray-700 mt-1 font-semibold leading-relaxed">
                        Anda belum melakukan presensi untuk Sesi Pertemuan ini ({activeMeeting.topic}). Untuk membuka seluruh fitur (Slide interaktif, Kuis real-time, Chat & Roster), Anda diwajibkan untuk:
                      </p>
                      <ul className="list-decimal list-inside text-[11px] text-gray-600 font-extrabold mt-1.5 space-y-0.5">
                        <li>Daftarkan presensi dengan mengaktifkan kamera laptop/HP Anda.</li>
                        <li>Masukkan Kode Presensi PIN aman yang dibagikan oleh Teacher.</li>
                      </ul>
                    </div>

                    <div className="space-y-4 bg-white border-4 border-black p-5">
                      {/* Video scan grid container */}
                      <div className="relative border-4 border-black bg-black aspect-video max-w-md mx-auto overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        {isAttendanceOnCam ? (
                          <>
                            {/* Real HTML video feed */}
                            <video
                              ref={setAttendanceVideoRef}
                              className="absolute inset-0 w-full h-full object-cover select-none"
                              playsInline
                              muted
                              autoPlay
                            />
                            {/* Scanner green bar line */}
                            <div className="absolute left-0 w-full h-1 bg-[#00E5FF] shadow-[0_0_10px_2px_#00E5FF] animate-bounce top-1/2 pointer-events-none"></div>
                            <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-emerald-400 flex items-center justify-center bg-emerald-400/5 select-none text-emerald-300 font-mono text-[9px] text-center pointer-events-none">
                              CV_FACE_RECOGNITION: SCANNING_FACIAL_STRUCTURE_OK✓
                              <br/>[STATUS: STUDENT_MATCHED]
                            </div>
                            <div className="absolute top-2 left-2 text-[8px] font-mono text-emerald-400 bg-neutral-900 border border-emerald-500 px-2 uppercase font-black pointer-events-none">
                              🟢 WEBCAM_LIVE • FACIAL_DETECTED ✓
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col justify-center items-center text-gray-500 font-mono text-[10px] space-y-2 p-4 text-center select-none">
                            <Camera className="h-8 w-8 text-[#FF007A] animate-pulse" />
                            <span className="font-extrabold uppercase text-gray-400">CAMERA_DISABLED</span>
                            <span className="text-[9.5px]">Izinkan & aktifkan kamera scanner wajah Anda di bawah untuk mengaktifkan slot pengisian Kode PIN.</span>
                          </div>
                        )}
                      </div>

                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAttendanceOnCam(!isAttendanceOnCam)}
                          className={`px-4 py-2 border-2 border-black font-black uppercase text-[10px] tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all cursor-pointer ${
                            isAttendanceOnCam ? 'bg-rose-500 text-white' : 'bg-[#00E5FF] text-black'
                          }`}
                        >
                          <span className="flex items-center space-x-1.5 justify-center">
                            {isAttendanceOnCam ? (
                              <>
                                <CameraOff className="h-3.5 w-3.5 shrink-0" />
                                <span>MATIKAN SCANNER WAJAH</span>
                              </>
                            ) : (
                              <>
                                <Camera className="h-3.5 w-3.5 shrink-0" />
                                <span>HIDUPKAN SCANNER WAJAH</span>
                              </>
                            )}
                          </span>
                        </button>
                      </div>

                      {isAttendanceOnCam && (
                        <div className="border-2 border-dashed border-[#00E5FF] p-4 bg-cyan-50/5 space-y-3.5 text-left animate-fade-in select-none">
                          <span className="text-[10px] font-black text-[#008ba3] uppercase tracking-widest font-mono block">
                            ✍️ MASUKKAN PIN PRESENSI DARI TEACHER:
                          </span>
                          
                          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                            <input
                              type="text"
                              placeholder="Contoh PIN: 9021"
                              required
                              value={inputAttendanceCode}
                              onChange={(e) => setInputAttendanceCode(e.target.value.toUpperCase())}
                              className="p-2 border-2 border-black bg-white focus:outline-none placeholder-gray-300 font-mono text-xs font-black uppercase tracking-widest w-full sm:w-44 text-center"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                if (!inputAttendanceCode.trim()) {
                                  showAlert('Harap masukkan PIN presensi!');
                                  return;
                                }
                                if (inputAttendanceCode.trim().toUpperCase() !== (attendanceCode || '').toUpperCase()) {
                                  showAlert('Kode PIN presensi yang dimasukkan tidak cocok / tidak valid!');
                                  return;
                                }
                                
                                // Submit attendance with correct wrapper and meetingId matching App.tsx's handler
                                let facePhotoUrl = "";
                                if (isAttendanceOnCam && attendanceVideoRef.current) {
                                  try {
                                    const tempCanvas = document.createElement('canvas');
                                    tempCanvas.width = 320;
                                    tempCanvas.height = 240;
                                    const tempCtx = tempCanvas.getContext('2d');
                                    if (tempCtx) {
                                      // Mirror reflection for matching user view
                                      tempCtx.scale(-1, 1);
                                      tempCtx.drawImage(attendanceVideoRef.current, -320, 0, 320, 240);
                                      facePhotoUrl = tempCanvas.toDataURL('image/jpeg', 0.6);
                                    }
                                  } catch (err) {
                                    console.warn("Failed to capture attendance photo frame:", err);
                                  }
                                }

                                const record = {
                                  id: 'att-' + Math.random().toString(36).substr(2, 9),
                                  meetingId: activeMeeting?.id || '',
                                  studentName: username,
                                  timestamp: generateFormattedTimestamp(),
                                  time: generateFormattedTimestamp(),
                                  facePhotoUrl: facePhotoUrl || "",
                                };
                                onBroadcastPayload('ATTENDANCE_SUBMITTED', { record });
                                showAlert('Presensi sukses diverifikasi! Selamat belajar di Live Class.');
                              }}
                              className="w-full sm:w-auto px-4 py-2 bg-emerald-400 hover:bg-emerald-500 border-2 border-black text-emerald-950 font-black uppercase text-[10px] tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] cursor-pointer text-center"
                            >
                              SUBMIT PRESENSI ✓
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                        {/* Simulated active Quiz block (Renders floating over slides if any active) */}
                {activeQuiz && (
                  <div className="bg-white border-4 border-[#FF007A] p-5 shadow-[6px_6px_0px_0px_rgba(111,111,111,0.2)] space-y-4 relative overflow-hidden transition-all duration-300">
                    
                    {/* Top sliding bar indicating elapsed time */}
                    <div className="absolute right-0 top-0 h-1.5 bg-rose-100 w-full border-b border-black">
                      <div 
                        className="h-full bg-[#FF007A] transition-all duration-1000"
                        style={{ width: `${(timerLeft / activeQuiz.durationSeconds) * 100}%` }}
                      />
                    </div>

                    {/* Teacher real-time alert pop-up notification banner */}
                    {incomingTeacherAction && (
                      <div className="animate-bounce bg-rose-500 border-4 border-black text-white p-3.5 mb-2 flex items-center space-x-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                        <AlertTriangle className="h-6 w-6 text-yellow-300 shrink-0" />
                        <div>
                          <p className="font-mono text-xs font-black uppercase">⚠️ ACTION FROM LECTURER: {incomingTeacherAction.actionType?.toUpperCase() || 'WARN'}</p>
                          <p className="font-sans text-xs font-bold">{incomingTeacherAction.text || "Mohon fokus ke layar ujian dan wajib aktifkan webcam!"}</p>
                          {incomingTeacherAction.deduction && (
                            <span className="text-[10px] bg-black px-2 py-0.5 font-mono text-yellow-300 font-bold ml-1 rounded">-{incomingTeacherAction.deduction} PTS</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Quick Proctor warning alerts system */}
                    {proctorState.warningCount > 0 && (
                      <div className="bg-rose-500 text-white border-4 border-black p-3 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-mono animate-pulse">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-white" />
                          <span className="text-xs font-black uppercase">
                            {proctorState.warningCount === 1 && "Warning 1: Please keep your face visible."}
                            {proctorState.warningCount === 2 && "Warning 2: Suspicious activity detected."}
                            {proctorState.warningCount >= 3 && "Warning 3: Teacher Review Required."}
                          </span>
                        </div>
                        <span className="text-[9px] bg-black text-rose-400 px-2 py-0.5 font-black uppercase">⚠️ DILATAS: {proctorState.warningCount} WNG</span>
                      </div>
                    )}

                    {/* Main side-by-side quiz and proctor layout */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      
                      {/* Left: Question + choices */}
                      <div className="md:col-span-8 space-y-4">
                        <div className="flex justify-between items-center border-b-2 border-black pb-2">
                          <div className="flex items-center space-x-2">
                            <HelpCircle className="h-5 w-5 text-[#FF007A] animate-pulse" />
                            <div>
                              <p className="text-xs font-black text-[#FF007A] tracking-wider font-mono">QUIZ DETECTED LIVE⚡ (INTEGRITAS AI AKTIF)</p>
                              <p className="text-[9px] text-gray-500 font-mono font-bold uppercase">Webcam wajib aktif. Perpintahan tab atau minimasi akan terekam.</p>
                            </div>
                          </div>

                          <div className="h-9 w-9 border-4 border-black bg-white flex items-center justify-center font-mono font-black text-sm text-[#FF007A]">
                            {timerLeft}
                          </div>
                        </div>

                        {proctorState.isInvalidated ? (
                          <div className="p-8 border-4 border-black bg-rose-100 text-rose-950 font-black text-center space-y-2">
                            <span className="text-3xl">🚫</span>
                            <h4 className="text-sm font-black uppercase">STATUS KUIS DIBATALKAN</h4>
                            <p className="text-[11px] text-rose-800 font-mono">Teacher pengawas telah membatalkan sesi ujian Anda karena terindikasi melakukan kecurangan.</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-base font-black leading-relaxed pl-1 text-[#111111] mb-4">
                              {activeQuiz.question}
                            </p>

                            {activeQuiz.type === 'short-answer' ? (
                              <div className="space-y-3 bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left">
                                <label className="text-[10px] font-mono font-black text-gray-500 uppercase block">Ketikkan Isian Singkat Anda di Sini:</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    disabled={selectedOption !== null || timerLeft <= 0}
                                    value={studentShortAnswerInput}
                                    onChange={(e) => setStudentShortAnswerInput(e.target.value)}
                                    placeholder="Isi jawaban singkat Anda..."
                                    className="flex-grow p-3 border-2 border-black focus:outline-none text-xs font-sans font-bold text-black"
                                  />
                                  <button
                                    type="button"
                                    disabled={selectedOption !== null || timerLeft <= 0 || !studentShortAnswerInput.trim()}
                                    onClick={() => {
                                      const textAns = studentShortAnswerInput.trim();
                                      setStudentShortAnswerResponseValue(textAns);
                                      const correctAnswers = (activeQuiz.correctAnswerText || '').trim().toLowerCase().split('|');
                                      let isCorrect = false;
                                      for (const ans of correctAnswers) {
                                        if (textAns.toLowerCase().includes(ans) || ans.includes(textAns.toLowerCase())) {
                                          isCorrect = true;
                                        }
                                      }
                                      handleSelectOption(isCorrect ? 0 : 1, textAns);
                                    }}
                                    className="px-4 py-2 bg-[#00E5FF] hover:bg-[#00c5dd] text-black font-black border-2 border-black font-mono text-[10px] uppercase shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-px cursor-pointer"
                                  >
                                    KIRIM ✓
                                  </button>
                                </div>
                                {selectedOption !== null && (
                                  <div className="mt-3 p-3 border border-black bg-neutral-50 text-[11px] font-medium leading-relaxed font-sans">
                                    <p className="font-extrabold uppercase text-xs">
                                      Jawaban Anda: <span className="text-[#FF007A]">{studentShortAnswerResponseValue}</span>
                                    </p>
                                    <p className="mt-1">
                                      Benar/Salah: <span className={selectedOption === 0 ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}>{selectedOption === 0 ? 'JAWABAN BENAR ✓' : 'JAWABAN SALAH ✗'}</span>
                                    </p>
                                    <p className="mt-0.5">
                                      Kunci Jawaban Benar: <strong className="text-emerald-600 font-extrabold">{activeQuiz.correctAnswerText || 'Tidak ada spesifikasi'}</strong>
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {activeQuiz.options.map((opt, oIdx) => {
                                  const isChosenAndCorrect = selectedOption === oIdx && oIdx === activeQuiz.correctOptionIndex;
                                  const isChosenAndIncorrect = selectedOption === oIdx && oIdx !== activeQuiz.correctOptionIndex;
                                  
                                  let borderStyle = 'border-black bg-white text-black hover:bg-gray-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]';
                                  let tagStyle = 'bg-white text-black border-r-2 border-black';

                                  if (selectedOption !== null) {
                                    if (oIdx === activeQuiz.correctOptionIndex) {
                                      borderStyle = 'border-black bg-emerald-500 text-white font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]';
                                      tagStyle = 'bg-emerald-500 text-white border-r-2 border-black';
                                    } else if (isChosenAndIncorrect) {
                                      borderStyle = 'border-black bg-rose-500 text-white font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]';
                                      tagStyle = 'bg-rose-500 text-white border-r-2 border-black';
                                    } else {
                                      borderStyle = 'border-gray-300 bg-gray-50 text-gray-400';
                                      tagStyle = 'bg-gray-100 text-gray-400 border-r-2 border-gray-300';
                                    }
                                  }

                                  return (
                                    <button
                                      key={oIdx}
                                      id={`btn-student-opt-${oIdx}`}
                                      onClick={() => handleSelectOption(oIdx, opt)}
                                      disabled={selectedOption !== null || timerLeft <= 0}
                                      className={`w-full p-0 flex items-stretch rounded-none text-left text-xs md:text-sm cursor-pointer transition-none border-2 flex items-stretch min-h-[36px] ${borderStyle}`}
                                    >
                                      <span className={`w-8 flex items-center justify-center text-xs shrink-0 ${tagStyle}`}>
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span className="p-2.5 leading-snug font-bold flex items-center">{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {selectedOption !== null && (
                              <p className="text-center text-[10px] text-emerald-800 font-mono font-bold py-2 bg-emerald-100 border-2 border-emerald-500 uppercase">
                                ✓ OK: JAWABAN BERHASIL DISIARKAN KE SERVER BROADCAST ROOM!
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Right: AI Proctor HUD Canvas Container */}
                      <div className="md:col-span-4 border-4 border-black p-3 space-y-3.5 bg-gray-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center justify-between border-b border-gray-700 pb-1.5">
                          <span className="text-[10px] font-black font-mono tracking-wider flex items-center text-[#00E5FF]">
                            <Shield className="h-3.5 w-3.5 mr-1 text-emerald-400 shrink-0" />
                            AI PROCTOR FEED
                          </span>
                          <span className={`h-2 w-2 rounded-full ${proctorState.status === 'normal' ? 'bg-emerald-500 animate-pulse' : proctorState.status === 'warning' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
                        </div>

                        {/* Video feedback placeholder & hidden video */}
                        <div className="relative border-2 border-slate-700 bg-black aspect-video overflow-hidden">
                          <video 
                            ref={setVideoRef} 
                            style={{ display: 'none' }} 
                            playsInline 
                            muted
                          />
                          <canvas 
                            ref={canvasRef} 
                            width={240} 
                            height={180} 
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Live Telemetry KPI badges */}
                        <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px]">
                          <div className="bg-slate-800 p-1.5 border border-slate-700">
                            <span className="text-gray-400 block">FOCUS LEVEL</span>
                            <span className="text-xs font-black text-[#00E5FF]">{proctorState.focusScore}%</span>
                          </div>
                          <div className="bg-slate-800 p-1.5 border border-slate-700">
                            <span className="text-gray-400 block">WARNINGS</span>
                            <span className={`text-xs font-black ${proctorState.warningCount > 1 ? 'text-red-400' : 'text-emerald-400'}`}>{proctorState.warningCount} / 3</span>
                          </div>
                          <div className="bg-slate-800 p-1.5 border border-slate-700">
                            <span className="text-gray-400 block">TAB SWITCH</span>
                            <span className="text-xs font-black text-amber-300">{proctorState.tabSwitchCount}x</span>
                          </div>
                          <div className="bg-slate-800 p-1.5 border border-slate-700 border-none bg-indigo-950/45">
                            <span className="text-gray-400 block font-sans">EST STATUS</span>
                            <span className={`text-[8px] font-black uppercase ${proctorState.status === 'normal' ? 'text-emerald-400' : proctorState.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}`}>
                              {proctorState.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Interactive testing and evaluation section */}
                        <div className="bg-slate-800 border border-slate-700 p-2 text-[9px] space-y-2 select-none text-left">
                          <p className="text-[8px] font-black font-mono tracking-widest text-[#FF007A] uppercase">🧪 TESTING CONTROLS (SIMULATE CHEATING):</p>
                          
                          <div className="grid grid-cols-2 gap-1.5 font-mono text-[8.5px]">
                            <button
                              type="button"
                              onClick={handleToggleWebcam}
                              className={`py-1.5 px-0.5 border text-center transition-all cursor-pointer ${proctorState.isWebcamOn ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-red-500 border-red-400 text-white'}`}
                            >
                              Webcam: {proctorState.isWebcamOn ? 'ON' : 'OFF'}
                            </button>
                            <button
                              type="button"
                              onClick={handleToggleFaceAbsence}
                              className={`py-1.5 px-0.5 border text-center transition-all cursor-pointer ${proctorState.isFaceDetected ? 'bg-slate-700 border-[#475569] text-gray-400' : 'bg-yellow-500 border-yellow-400 text-black font-black'}`}
                            >
                              NoFace: {!proctorState.isFaceDetected ? 'ON' : 'OFF'}
                            </button>
                            <button
                              type="button"
                              onClick={handleToggleGazeDeviation}
                              className={`py-1.5 px-0.5 border text-center transition-all cursor-pointer ${!proctorState.isGazeDeviation ? 'bg-slate-700 border-[#475569] text-gray-400' : 'bg-[#FF007A] border-[#FF007A] text-white font-black'}`}
                            >
                              GazeAway: {proctorState.isGazeDeviation ? 'ON_DEV' : 'OFF'}
                            </button>
                            <button
                              type="button"
                              onClick={handleToggleMultipleFaces}
                              className={`py-1.5 px-0.5 border text-center transition-all cursor-pointer ${!proctorState.isMultipleFaces ? 'bg-slate-700 border-[#475569] text-gray-400' : 'bg-red-600/30 border-red-500 text-red-400 font-bold'}`}
                            >
                              MultiFace: {proctorState.isMultipleFaces ? 'ON_MLT' : 'OFF'}
                            </button>
                          </div>
                          <span className="block text-[7.5px] italic text-slate-400 font-sans leading-relaxed text-center leading-xs">Simulasi pemicu kecurangan untuk diuji pada dashboard guru.</span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                <div className="border-4 border-black p-1 bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <PdfSlidesContainer
                    slides={slides}
                    currentSlideIndex={currentSlideIndex}
                    onNavigate={() => {}}
                    role="student"
                    externalAnnotations={externalAnnotations}
                  />
                </div>

              </>
            )}
          </div>
        )}

        {activeTab === 'classroom' && (
          <div className="space-y-6 text-left">
                        {/* Classroom Horizontal Sub-Tabs (Mirrored from Teacher) */}
                        <div id="classroom-subtabs-nav" className="flex flex-wrap bg-[#111111] p-1 gap-1 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          {[
                            { id: 'broadcast', label: 'PENGUMUMAN', icon: Volume2 },
                            { id: 'assignment', label: 'TUGAS', icon: CheckSquare },
                            { id: 'materials', label: 'MATERI BELAJAR', icon: BookOpen },
                            { id: 'members', label: 'ANGGOTA KELAS', icon: Users },
                            { id: 'calendar', label: 'KALENDER', icon: Calendar },
                            { id: 'banksoal', label: 'BANK SOAL', icon: Database }
                          ].map((sub) => {
                            const Icon = sub.icon;
                            return (
                              <button
                                key={sub.id}
                                onClick={() => setStudentClassroomSubTab(sub.id as any)}
                                className={`flex items-center space-x-1 px-2.5 py-1.5 border-2 border-black font-mono font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer ${
                                  studentClassroomSubTab === sub.id
                                    ? 'bg-[#00E5FF] text-black shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]'
                                    : 'bg-white text-gray-700 hover:text-black hover:bg-neutral-100'
                                }`}
                              >
                                <Icon className="h-3 w-3 shrink-0" />
                                <span>{sub.label}</span>
                              </button>
                            );
                          })}
                        </div>

                {studentClassroomSubTab === 'calendar' && (
                  <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 text-left">
                    <h4 className="font-display font-black text-xs text-black uppercase tracking-wider pb-1.5 border-b-2 border-black font-bold flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-orange-500 shrink-0" /> KALENDER AKADEMIK &amp; TENGGAT KULIAH
                    </h4>
                    <p className="text-[11px] text-gray-500 font-semibold leading-relaxed mb-4">
                      Lintas waktu target rilis materi, deadline tugas, dan rencana pertemuan tatap muka online sinkron.
                    </p>

                    <div className="grid grid-cols-7 gap-1.5 border-2 border-black p-3 bg-neutral-50 text-center font-mono text-[9px] font-black max-w-lg mb-2 mx-auto">
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
                      <div className="mt-4 p-4 bg-neutral-50 border-2 border-black border-dashed flex flex-col items-center">
                        <h5 className="font-display font-black text-[11px] text-black uppercase tracking-wider pb-1.5 border-b-2 border-black w-full text-center">
                           RINCIAN ACARA: TANGGAL {selectedDate}
                        </h5>
                        <div className="w-full mt-3 space-y-2">
                           {calendarEvents.filter(ev => ev.date === selectedDate).length === 0 ? (
                             <p className="text-[10px] text-gray-500 font-bold text-center italic w-full">Jadwal kosong.</p>
                           ) : (
                             calendarEvents.filter(ev => ev.date === selectedDate).map(ev => (
                               <div key={ev.id} className="text-[10px] bg-white border border-black p-2 text-left">
                                 <div className="flex items-center gap-1.5 mb-1">
                                    <span className={`w-2.5 h-2.5 rounded-full border border-black ${ev.color}`}></span>
                                    <strong className="font-black text-black uppercase">{ev.title}</strong>
                                 </div>
                                 {ev.description && <p className="text-gray-600 pl-4 leading-relaxed font-medium break-words whitespace-pre-wrap">{ev.description}</p>}
                               </div>
                             ))
                           )}
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {studentClassroomSubTab === 'banksoal' && (
                  <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 text-left mt-6">
                    <h4 className="font-display font-black text-xs text-[#FF007A] uppercase tracking-wider pb-1.5 border-b-2 border-black font-bold flex items-center gap-1.5"><Database className="h-4 w-4 text-[#FF007A] shrink-0" /> BANK SOAL</h4>
                    {questionBanks.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-gray-300 text-center space-y-2">
                            <Database className="h-8 w-8 mx-auto text-gray-300" />
                            <p className="font-mono font-bold text-gray-400 text-xs">BELUM ADA BANK SOAL</p>
                            <p className="text-[10px] text-gray-400 mt-2">Daftar bank soal belum tersedia.</p>
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
                                </div>
                            </div>
                          ))}
                        </div>
                    )}
                  </div>
                )}

                {studentClassroomSubTab === 'broadcast' && (
                  <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <h4 className="font-display font-black text-xs text-black uppercase tracking-wider pb-1.5 border-b-2 border-black flex items-center gap-1.5 font-bold">
                      <Volume2 className="h-4 w-4 text-cyan-500 shrink-0 animate-pulse" /> PAPAN PENGUMUMAN TEACHER
                    </h4>

                    {(() => {
                      // Initial default announcements matching the teacher's starting state
                      const staticAnnouncements = [
                        { id: 'ann-1', title: 'Persiapan Kuliah Sesi TCP/IP', content: 'Mohon seluruh student mengunduh berkas reference library dan membaca modul Socket Programming dasar sebelum kuis dimulai.', date: '09 Juni 2026', type: 'info', sender: 'TEACHER' },
                        { id: 'ann-2', title: 'Instruksi Presensi Scan Wajah', content: 'Student wajib membuka kamera web (on-cam webcam check-in) untuk melengkapi digital handshake. Presensi tanpa scan wajah dianggap ALPA.', date: '09 Juni 2026', type: 'warning', sender: 'TEACHER' }
                      ];

                      // Dynamic announcements from classroom broadcasts
                      const chatbotAnnouncements = (messages || [])
                        .filter(msg => msg.isAnnouncement || (msg.text && (msg.text.includes('[BROADCAST TEACHER]') || msg.text.includes('PENGUMUMAN'))))
                        .map((msg, idx) => {
                          const rawText = msg.text || '';
                          let displayTitle = msg.role === 'teacher' ? 'Broadcast Kelas Sesi Aktif' : `Broadcast oleh ${msg.senderName || 'TEACHER'}`;
                          let displayContent = rawText;

                          if (rawText.startsWith('[BROADCAST TEACHER]')) {
                            const withoutPrefix = rawText.replace('[BROADCAST TEACHER]', '').trim();
                            const colonIndex = withoutPrefix.indexOf(':');
                            if (colonIndex !== -1) {
                              displayTitle = withoutPrefix.substring(0, colonIndex).trim();
                              displayContent = withoutPrefix.substring(colonIndex + 1).trim();
                            } else {
                              displayContent = withoutPrefix;
                            }
                          } else {
                            displayContent = rawText.replace('[PENGUMUMAN]', '').trim();
                          }

                          return {
                            id: `dyn-ann-${idx}`,
                            title: displayTitle,
                            content: displayContent,
                            date: new Date(msg.timestamp || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
                            type: msg.role === 'teacher' || msg.isAnnouncement ? 'warning' : 'info',
                            sender: msg.senderName || 'TEACHER'
                          };
                        });

                      const mappedAnnouncements = (broadcasts || []).map((bc) => {
                        return {
                          id: bc.id,
                          title: bc.payload?.title || 'Pengumuman Kelas',
                          content: bc.payload?.text || '',
                          date: bc.timestamp || '09 Juni 2026',
                          type: bc.payload?.urgency === 'SANGAT MENDESAK' ? 'warning' : 'info',
                          sender: bc.senderName || 'TEACHER'
                        };
                      });

                      const filteredStatic = staticAnnouncements.filter(s => 
                        !mappedAnnouncements.some(m => m.title.toLowerCase() === s.title.toLowerCase())
                      );

                      const allAnnouncements = [...mappedAnnouncements, ...chatbotAnnouncements, ...filteredStatic];

                      return (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin pr-1 text-left">
                          {allAnnouncements.map((ann) => (
                            <div key={ann.id} className={`p-4 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden ${ann.type === 'warning' ? 'bg-amber-50/50' : 'bg-neutral-50/50'}`}>
                              {ann.type === 'warning' && (
                                <div className="absolute right-0 top-0 bg-yellow-400 border-b border-l border-black px-1.5 py-0.5 text-[7px] font-mono font-black uppercase">
                                  PENTING
                                </div>
                              )}
                              <div className="flex justify-between items-center border-b pb-1 mb-2">
                                <span className="text-[8px] font-mono font-black text-gray-400 tracking-wider">
                                  PENGIRIM: {ann.sender?.toUpperCase() || 'SYSTEM'}
                                </span>
                                <span className="text-[8px] font-mono text-gray-400 font-bold">{ann.date}</span>
                              </div>
                              <h5 className="font-sans font-black text-xs text-black uppercase">{ann.title}</h5>
                              <p className="text-[11px] text-gray-600 leading-relaxed font-semibold mt-1">
                                {ann.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {studentClassroomSubTab === 'materials' && (
                <>
                <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                  <h4 className="font-display font-black text-xs text-[#FF007A] uppercase tracking-wider pb-1.5 border-b-2 border-black flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 shrink-0 text-[#FF007A]" /> FILE MATERI AJAR TERSEDIA ({sharedMaterials.length})
                  </h4>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin text-left">
                    {sharedMaterials.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-6 text-center">Belum ada file materi dibagikan pada ruangan kelas ini.</p>
                    ) : (
                      sharedMaterials.map((file) => (
                        <div key={file.id} className="p-3 bg-white border-2 border-black flex justify-between items-center gap-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="h-8 w-8 bg-[#00E5FF] border border-black text-black font-black flex items-center justify-center text-[10px] uppercase shrink-0">
                              {file.type}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-black text-black truncate">{file.name}</p>
                              <span className="text-[9px] text-gray-400 font-bold block font-mono">{file.size?.toUpperCase() || ''} • {file.uploadedAt}</span>
                            </div>
                          </div>

                          <a 
                            href={file.url}
                            download
                            className="p-2 bg-white hover:bg-neutral-100 border border-black text-gray-900 transition-all cursor-pointer shrink-0"
                            title="Download Material File"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                </>
                )}

                {studentClassroomSubTab === 'assignment' && (
                <>
                <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(255,0,122,1)] space-y-5">
                  <h4 className="font-display font-black text-xs text-black uppercase tracking-wider pb-1.5 border-b-2 border-black flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4 shrink-0 text-black" /> TUGAS & GRADING EVALUATION
                  </h4>

                  {assignments.length === 0 ? (
                    <div className="p-10 border-2 border-dashed border-gray-300 text-center text-gray-400 italic text-xs select-none">
                      Belum ada penugasan dirilis oleh Teacher untuk Sesi Pertemuan ini.
                    </div>
                  ) : (
                    <div className="space-y-6 text-left max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
                      {assignments.map((asg) => {
                        const existSub = submissions.find(s => s.assignmentId === asg.id && normalizeName(s.studentName) === normalizeName(username));
                        return (
                          <div key={asg.id} className="p-4 border-2 border-black bg-neutral-50/40 space-y-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex justify-between items-start text-xs border-b pb-2 flex-wrap gap-1.5">
                              <h5 className="font-black text-black uppercase tracking-tight text-[11px]">{asg.title}</h5>
                              <span className="font-mono text-[8.5px] text-rose-600 bg-rose-50 border border-rose-300 px-1 py-0.5 font-bold uppercase">Batas waktu: {asg.dueDate}</span>
                            </div>
                            <p className="text-gray-500 text-[11px] leading-relaxed font-semibold">{asg.description}</p>

                            {existSub ? (
                              <div className="border border-neutral-300 bg-white p-3 space-y-2.5">
                                <div className="flex justify-between items-center text-[8.5px] font-mono border-b pb-1 font-bold">
                                  <span className="text-gray-400">PENGUMPULAN ANDA</span>
                                  {existSub.score !== undefined ? (
                                    <span className="text-emerald-700 bg-emerald-100 border border-emerald-500 px-1.5 py-0.5">NILAI KELUAR: {existSub.score} / 100</span>
                                  ) : (
                                    <span className="text-amber-600 bg-amber-50 border border-amber-400 px-1.5 py-0.5 animate-pulse">PROSES PENILAIAN TEACHER</span>
                                  )}
                                </div>

                                <div className="border border-gray-100 p-2 bg-neutral-50/50 text-[10.5px] font-mono truncate text-neutral-600 font-medium">
                                  {existSub.fileName ? `File Berkas: ${existSub.fileName}` : existSub.notes ? `Teks Balasan: "${existSub.notes}"` : 'Berhasil Dikumpulkan'}
                                </div>
                                {existSub.fileUrl && (
                                   <a href={existSub.fileUrl} download className="block text-center mt-2 w-full py-1.5 bg-gray-100 hover:bg-gray-200 border-2 border-black text-black font-black uppercase text-[9px] cursor-pointer">
                                     UNDUH BERKAS ANDA
                                   </a>
                                )}

                                {existSub.score !== undefined && (
                                  <div className="p-2 bg-emerald-50/50 border border-emerald-300 text-[10px] space-y-1">
                                    <span className="font-extrabold text-emerald-950 font-mono text-[8px] block">CATATAN EVALUASI TEACHER:</span>
                                    <p className="text-emerald-900 font-medium leading-normal">"{existSub.notes || 'Kerja bagus!'}"</p>
                                  </div>
                                )}
                                <span className="text-[8px] font-mono font-bold text-gray-400 block pt-1 uppercase">TERKIRIM PADA: {new Date(existSub.submittedAt).toLocaleString('id-ID')}</span>
                              </div>
                            ) : (
                              <div className="border border-neutral-200 bg-white p-3 space-y-3 select-none text-xs text-left">
                                {asg.fileUrl && (
                                   <a href={asg.fileUrl} download className="block text-center mb-2 w-full py-1.5 bg-neutral-100 hover:bg-[#00E5FF] border-2 border-black text-black font-black uppercase text-[9px] shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer">
                                     UNDUH MATERI / SOAL TUGAS INI
                                   </a>
                                )}

                                <span className="text-[8px] font-bold text-gray-500 uppercase block pb-0.5 font-mono">TULIS TEKS / TAUTAN KETERANGAN TUGAS:</span>
                                <textarea
                                  rows={3}
                                  placeholder="Tuliskan keterangan opsional..."
                                  value={assignmentAnswers[asg.id] || ''}
                                  onChange={(e) => setAssignmentAnswers({ ...assignmentAnswers, [asg.id]: e.target.value })}
                                  className="w-full p-2 border-2 border-black bg-white text-[11px] focus:outline-none"
                                />
                                
                                <span className="text-[8px] font-bold text-gray-500 uppercase block pb-0.5 font-mono pt-2">UPLOAD FILE PDF, DOC, PPT:</span>
                                <input 
                                  type="file" 
                                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      setAssignmentAnswerFiles({ ...assignmentAnswerFiles, [asg.id]: e.target.files[0] });
                                    }
                                  }}
                                  className="w-full p-1 border-2 border-black bg-white text-[9px] font-mono"
                                />

                                <button
                                  type="button"
                                  onClick={() => {
                                    const answerVal = assignmentAnswers[asg.id] || '';
                                    const ansFile = assignmentAnswerFiles[asg.id];
                                    if (!answerVal.trim() && !ansFile) {
                                      showAlert('Isi teks keterangan tugas atau unggah file tugas sebelum klik kirim!');
                                      return;
                                    }
                                    const nextStep = (fData?: string) => {
                                      const subId = 'sub-' + Math.random().toString(36).substr(2, 9);
                                      const newSub = {
                                        id: subId,
                                        assignmentId: asg.id,
                                        studentName: username,
                                        fileName: ansFile ? ansFile.name : '',
                                        fileSize: ansFile ? (ansFile.size / 1024).toFixed(1) + ' KB' : '0 KB',
                                        notes: answerVal,
                                        fileUrl: fData ? `/api/submissions/file/${subId}` : undefined,
                                        submittedAt: new Date().toISOString(),
                                        status: 'pending' as const
                                      };
                                    // Post submission to server
                                       fetch('/api/submissions', {
                                         method: 'POST',
                                         headers: { 'Content-Type': 'application/json', 'x-gemini-api-key': localStorage.getItem('user-gemini-api-key') || '' },
                                         body: JSON.stringify({
                                           ...newSub,
                                           fileData: fData,
                                           classCode
                                         })
                                       })
                                       .then(res => res.json())
                                       .then(data => {
                                         if (data.success && data.submission) {
                                           const finalSub = { ...newSub, ...data.submission };
                                           const filteredSubmissions = submissions.filter(s => 
                                             !(s.assignmentId === asg.id && normalizeName(s.studentName) === normalizeName(username))
                                           );
                                           onBroadcastPayload('SUBMISSIONS_UPDATED', { submissions: [...filteredSubmissions, finalSub] });
                                         }
                                       })
                                       .catch(err => {
                                         console.error("Failed to post submission to server:", err);
                                         onBroadcastPayload('SUBMISSIONS_UPDATED', { submissions: [...submissions, newSub] });
                                       });
                                    
                                    const notification = {
                                      id: 'notif-' + Math.random().toString(36).substr(2, 9),
                                      message: `Student [${username}] mengumpulkan tugas ${asg.title}.`,
                                      timestamp: generateFormattedTimestamp(),
                                      role: 'teacher',
                                      type: 'assignment'
                                    };
                                    onBroadcastPayload('NOTIFICATION_ADDED', { notification });
                                     };
                                     if (ansFile) {
                                       const reader = new FileReader();
                                       reader.onload = () => {
                                         nextStep(reader.result as string);
                                       };
                                       reader.onerror = () => {
                                         showAlert("Gagal membaca file tugas. Silakan coba lagi.");
                                       };
                                       reader.readAsDataURL(ansFile);
                                     } else {
                                       nextStep(undefined);
                                     }
                                  }}
                                  className="px-3 py-1.5 bg-[#FF007A] hover:bg-pink-600 border-2 border-black text-white font-black uppercase text-[9px] tracking-wider transition-all shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none cursor-pointer mt-2 w-full"
                                >
                                  KIRIM PENUGASAN TUGAS ✓
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                </>
                )}

                {studentClassroomSubTab === 'members' && (
                <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2 text-left">
                  <h4 className="font-display font-black text-xs text-black uppercase tracking-wider pb-1.5 border-b-2 border-black flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-black shrink-0" /> DAFTAR ANGGOTA KELAS SAAT INI
                  </h4>
                  
                  <div className="max-h-[500px] overflow-y-auto scrollbar-thin space-y-2.5 mt-4">
                    {authorizedStudents.length === 0 ? (
                      <div className="text-center italic text-gray-400 text-xs py-10 uppercase border-2 border-dashed border-gray-300">
                        Belum ada student yang masuk/terenkrol dalam kelas ini.
                      </div>
                    ) : (
                      authorizedStudents.map((st, i) => (
                        <div key={st.studentId + i} className="p-4 border-2 border-black bg-neutral-50 flex flex-col justify-start text-left gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-1 bg-yellow-200 border-b border-l border-black text-[9px] font-mono font-bold">
                            STUDENT
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white border-2 border-black rounded-full flex items-center justify-center font-bold text-lg">
                              {st.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-black uppercase font-sans block text-sm">{st.fullName}</span>
                              <span className="text-[10px] text-gray-500 font-mono mt-1 inline-block bg-neutral-200 px-1.5 py-0.5 rounded font-bold border border-gray-400">ID: {st.studentId}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                )}

              </div>
            )}


            {(activeTab === 'reports') && (
              <div className="space-y-6 text-left">
                
                {/* Reports Horizontal Sub-Tabs */}
                <div id="reports-subtabs-nav" className="flex flex-wrap bg-[#111111] p-1 gap-1 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {[
                    { id: 'global', label: 'REKAP GLOBAL', icon: BarChart3 },
                    { id: 'presensi', label: 'PRESENSI', icon: Camera },
                    { id: 'kuis', label: 'NILAI KUIS', icon: CheckSquare },
                    { id: 'tugas', label: 'NILAI TUGAS', icon: FileText },
                    { id: 'leaderboard', label: 'PAPAN PERINGKAT', icon: Award }
                  ].map((sub) => {
                    const Icon = sub.icon;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setActiveReportsSubTab(sub.id as any)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-[9px] font-black font-mono uppercase tracking-widest border-2 transition-all cursor-pointer ${
                          activeReportsSubTab === sub.id 
                            ? 'bg-[#00E5FF] text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10' 
                            : 'bg-white text-gray-500 border-transparent hover:bg-neutral-100'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${activeReportsSubTab === sub.id ? 'text-black' : 'text-gray-400'}`} />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}
                </div>

                {activeReportsSubTab === 'global' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Left Column: List of daily reports from teacher */}
                  <div className="md:col-span-12 lg:col-span-8 space-y-6">
                    <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 text-left">
                      <span className="flex items-center space-x-1.5 text-[10px] font-black text-[#008ba3] uppercase tracking-wider font-mono block pb-1 border-b">
                          <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                          <span>TABEL REKAPITULASI DETAIL PERTEMUAN KULIAH</span>
                      </span>
                      
                      <div className="overflow-x-auto text-left">
                          <table className="w-full text-[10px] border-collapse">
                            <thead>
                              <tr className="border-b-2 border-black text-gray-400 font-black uppercase text-[8.5px] font-mono">
                                <th className="py-2 text-left">PERTEMUAN KE-</th>
                                <th className="py-2 text-left">TOPIK PERTEMUAN</th>
                                <th className="py-2 text-center">SLIDE PRESENTASI</th>
                                <th className="py-2 text-center">PRESENSI</th>
                                <th className="py-2 text-center">NILAI KUIS</th>
                                <th className="py-2 text-center">NILAI TUGAS</th>
                                <th className="py-2 text-center">STREAK</th>
                                <th className="py-2 text-center">PERINGKAT</th>
                                <th className="py-2 text-center">LAPORAN PERTEMUAN</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-bold">
                              {meetings.length === 0 ? (
                                <tr>
                                  <td colSpan={9} className="py-6 text-center text-gray-400 italic font-mono text-[10px]">Belum ada data materi pertemuan...</td>
                                </tr>
                              ) : meetings.map((m, idx) => {
                                // presensi
                                const attRec = attendanceRecords.find(r => r.meetingId === m.id && r.studentName.toLowerCase() === username.toLowerCase());
                                const waktuPresensi = attRec ? (attRec.timestamp || 'HADIR') : '-';
                                const idNum = parseInt((username).replace(/\D/g, '')) || 42;
                                
                                // kuis
                                const meetingQuizzes = quizSubmissions.filter(q => q.meetingId === m.id && normalizeName(q.studentName) === normalizeName(username));
                                const isHadir = !!attRec;
                                let kuisVal = '-';
                                if (meetingQuizzes.length > 0) {
                                  const total = meetingQuizzes.length;
                                  const correct = meetingQuizzes.filter(q => q.isCorrect).length;
                                  kuisVal = `${Math.round((correct / total) * 100)}`;
                                } else if (isHadir) {
                                  // Simulated score using (benar/total) * 100%
                                  const idNum = parseInt((username).replace(/\D/g, '')) || 42;
                                  const totalSimulated = 5;
                                  const correctSimulated = 3 + ((idNum + m.number * 7) % 3); // always gets 3/5 (60%), 4/5 (80%), or 5/5 (100%)
                                  kuisVal = `${Math.round((correctSimulated / totalSimulated) * 100)}`;
                                }

                                // tugas
                                const asg = assignments.find(a => a.meetingId === m.id);
                                const mySub = asg ? submissions.find(s => s.assignmentId === asg.id && normalizeName(s.studentName) === normalizeName(username)) : null;
                                const tugasVal = mySub?.score !== undefined ? `${mySub.score}/100` : '-';
                                
                                // streak
                                const streak = isHadir ? Math.min(idx + 1, 99) : 0;

                                return (
                                  <tr key={m.id} className="hover:bg-neutral-50/50">
                                    <td className="py-3 text-left font-mono font-extrabold text-neutral-800">
                                      {m.number}
                                    </td>
                                    <td className="py-3 text-left">
                                      <span className="font-extrabold text-black block">{m.topic}</span>
                                    </td>
                                    <td className="py-3 text-center">
                                      <button onClick={() => {
                                        showAlert(`Mempersiapkan Slide PDF Pertemuan ${m.number}...`, 'info');
                                        setTimeout(() => {
                                          downloadSlidePdf(m.number, m.topic);
                                          showAlert(`Unduh Slide PDF Pertemuan ${m.number} Selesai!`, 'success');
                                        }, 800);
                                      }} className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-2 border-emerald-500 font-mono text-[9px] font-black cursor-pointer shadow-[1px_1px_0px_0px_rgba(16,185,129,1)]">
                                        UNDUH PDF
                                      </button>
                                    </td>
                                    <td className="py-3 text-center">
                                      {attRec ? (
                                        <span className="px-1.5 py-0.5 border text-[8.5px] uppercase font-mono font-black bg-emerald-100 text-emerald-800 border-emerald-400">
                                          {waktuPresensi}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400 font-mono">-</span>
                                      )}
                                    </td>
                                    <td className="py-3 text-center">
                                      <span className="font-mono text-[10px] text-black font-black">{kuisVal}</span>
                                    </td>
                                    <td className="py-3 text-center">
                                      <span className={`font-mono text-[10px] font-black ${tugasVal === '-' ? 'text-gray-400' : 'text-[#FF007A]'}`}>{tugasVal}</span>
                                    </td>
                                    <td className="py-3 text-center">
                                      {streak > 0 ? (
                                        <span className="px-1.5 py-0.5 border text-[8.5px] uppercase font-mono font-black bg-amber-100 text-amber-800 border-amber-400 whitespace-nowrap">🔥 {streak} DAY</span>
                                      ) : (
                                        <span className="text-gray-400 font-mono">-</span>
                                      )}
                                    </td>
                                    <td className="py-3 text-center font-mono">
                                      <span className="font-black text-black">#{isHadir ? ((idNum % 5) + 1) : '-'}</span>
                                    </td>
                                    <td className="py-3 text-center">
                                      {m.isCompleted ? (
                                        <button onClick={() => {
                                          showAlert(`Mencetak Laporan PDF Pertemuan ${m.number}...`, 'info');
                                          setTimeout(() => {
                                            downloadMeetingReportPdf(m);
                                            showAlert(`Unduhan Sukses! Laporan Pertemuan ${m.number} telah disimpan.`, 'success');
                                          }, 800);
                                        }} className="px-2 py-1 bg-black text-[#00E5FF] hover:bg-neutral-800 font-mono text-[9px] font-black cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1 mx-auto border border-black hover:-translate-x-px hover:-translate-y-px transition-transform">
                                          <Download className="w-2.5 h-2.5 shrink-0"/> UNDUH PDF
                                        </button>
                                      ) : (
                                        <span className="text-[9px] text-gray-400 font-mono block w-full bg-gray-100 py-1">- PENDING -</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                      </div>
                    </div>

                      {/* BAWAHNYA TABEL SAMA SEPERTI AKUN TEACHER (Papan Peringkat Kumulatif) */}
                      <div id="classroom-global-leaderboard-card" className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-left select-none relative overflow-hidden mt-6">
                        <Award className="absolute -right-12 -bottom-12 opacity-5 w-32 h-32 text-gray-400 rotate-12 shrink-0" />
                        <div className="flex justify-between items-center border-b-2 border-black pb-2 mr-3 flex-wrap gap-2 text-left">
                          <span className="text-[10px] font-black text-black uppercase tracking-widest font-mono flex items-center gap-1.5"><Award className="h-4 w-4 text-[#FF007A] shrink-0" /> PAPAN PERINGKAT KUMULATIF SE-SEMESTER</span>
                          <span className="text-[8px] bg-[#FF007A] text-white border border-black px-1.5 py-0.5 font-bold font-mono uppercase">ACADEMIC LADDER</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4 items-end">
                          {(() => {
                             const studentListList = authorizedStudents.map((ast) => {
                               const liveStudent = Object.values(students || {}).find(s => 
                                 s.username.toLowerCase() === ast.fullName.toLowerCase()
                               );
                               return {
                                 id: 'db-' + ast.studentId,
                                 username: ast.fullName,
                                 score: liveStudent?.score || 0
                               };
                             }).sort((a,b) => b.score - a.score);

                             return (
                               <>
                                  <div className="md:col-span-12 lg:col-span-5 grid grid-cols-3 gap-2 items-end justify-center py-4 bg-[#fafafa] border-2 border-black">
                                    {/* 2nd place */}
                                    <div className="flex flex-col items-center">
                                      {studentListList[1] && (
                                        <>
                                          <Medal className="h-5 w-5 text-zinc-400 shrink-0" />
                                          <span className="text-[10px] font-black uppercase mt-1 text-center truncate w-20">{studentListList[1].username}</span>
                                          <div className="h-12 w-14 bg-slate-100/80 border-2 border-black border-b-0 flex items-center justify-center font-mono text-[9px] font-black">{studentListList[1].score} pts</div>
                                        </>
                                      )}
                                    </div>
                                    {/* 1st place */}
                                    <div className="flex flex-col items-center">
                                      {studentListList[0] && (
                                        <>
                                          <Crown className="h-6 w-6 text-amber-500 animate-bounce shrink-0" />
                                          <span className="text-xs font-black uppercase mt-1 text-[#FF007A] text-center truncate w-24">{studentListList[0].username}</span>
                                          <div className="h-18 w-16 bg-amber-50/80 border-4 border-black border-b-0 flex items-center justify-center font-mono text-xs font-black">{studentListList[0].score} pts</div>
                                        </>
                                      )}
                                    </div>
                                    {/* 3rd place */}
                                    <div className="flex flex-col items-center">
                                      {studentListList[2] && (
                                        <>
                                          <Medal className="h-5 w-5 text-amber-800 shrink-0" />
                                          <span className="text-[10px] font-black uppercase mt-1 text-center truncate w-20">{studentListList[2].username}</span>
                                          <div className="h-8 w-14 bg-amber-900/5 border-2 border-black border-b-0 flex items-center justify-center font-mono text-[9px] font-black">{studentListList[2].score} pts</div>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Full table ranking */}
                                  <div className="md:col-span-12 lg:col-span-7 border-2 border-black p-4 bg-white">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono block mb-2 text-left">ESTIMASI KEDUDUKAN STUDENT KUMULATIF</span>
                                    
                                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-thin text-left font-mono">
                                      {studentListList.map((st, idx) => {
                                        let containerBg = 'bg-[#fafafa]';
                                        let idxColor = 'text-gray-400';
                                        if (idx === 0) {
                                          containerBg = 'bg-amber-50';
                                          idxColor = 'text-amber-500 font-extrabold';
                                        } else if (idx === 1) {
                                          containerBg = 'bg-slate-50';
                                          idxColor = 'text-zinc-500 font-bold';
                                        } else if (idx === 2) {
                                          containerBg = 'bg-[#f7f0e6]';
                                          idxColor = 'text-amber-700 font-bold';
                                        }

                                        return (
                                          <div key={st.id} className={`flex justify-between items-center px-3 py-1.5 border border-gray-200 ${containerBg}`}>
                                            <div className="flex items-center gap-3">
                                              <span className={`text-[10px] ${idxColor}`}>#{idx + 1}</span>
                                              <span className={`text-[10px] uppercase font-bold truncate max-w-[120px] ${idx === 0 ? 'text-amber-600' : 'text-neutral-700'}`}>{st.username}</span>
                                            </div>
                                            <span className={`text-[10px] flex items-center gap-1 ${idx === 0 ? 'text-amber-600 font-black' : 'text-neutral-500'}`}>
                                              {st.score} <span className="text-[8px] text-gray-400">pts</span>
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                               </>
                             );
                          })()}
                        </div>
                      </div>

                  </div>

                  {/* Right Column: Live stats report card (TETAP) */}
                  <div className="md:col-span-12 lg:col-span-4 border-4 border-black p-5 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 text-left">
                    <span className="flex items-center space-x-1.5 text-[10px] font-black text-black uppercase tracking-wider font-mono block pb-1 border-b mb-2">
                      <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                      <span>STATUS PERANGKAT & AKURASI AKUMULATIF</span>
                    </span>
                    
                    <div className="space-y-3.5 text-xs">
                      <div className="bg-neutral-50 p-3 border border-black space-y-1 selection:none">
                        <span className="text-[8px] font-black text-gray-400 font-mono block">INTEGRITAS_FOCUS_SCORE</span>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-mono font-black text-black">{proctorState.focusScore}%</span>
                          <span className={`px-1.5 py-0.5 text-[8px] font-mono font-black uppercase ${proctorState.status === 'normal' ? 'bg-green-100 text-green-800' : 'bg-rose-50 text-rose-700 animate-pulse'}`}>
                            {proctorState.status}
                          </span>
                        </div>
                      </div>

                      <div className="bg-neutral-50 p-3 border border-black space-y-1 selection:none">
                        <span className="text-[8px] font-black text-gray-400 font-mono block">ACCURACY IN LIVE_QUIZ</span>
                        <span className="text-lg font-mono font-black text-black block">{selfStats.accuracy}%</span>
                      </div>

                      {(() => {
                        const studentGrades = submissions.filter(s => normalizeName(s.studentName) === normalizeName(username) && s.score !== undefined).map(s => s.score as number);
                        const avgGrade = studentGrades.length > 0 ? (studentGrades.reduce((a, b) => a + b, 0) / studentGrades.length).toFixed(1) : '-';
                        return (
                          <div className="bg-neutral-50 p-3 border border-black space-y-1 selection:none mt-4">
                            <span className="text-[8px] font-black font-mono text-gray-400 block uppercase">NILAI RATA-RATA TUGAS</span>
                            <div className="flex justify-between items-center text-lg font-mono font-black text-black">
                              <span>{avgGrade !== '-' ? `${avgGrade}/100` : '-'}</span>
                              <span className="text-[#00E5FF] text-[8px] uppercase">RATA RATA AKUMULATIF</span>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="bg-neutral-50 p-3 border border-black space-y-1 selection:none">
                        <span className="text-[8px] font-black text-gray-400 font-mono block">RIWAYAT PRESENSI ONCAM</span>
                        {attendanceRecords.some(r => r.studentName.toLowerCase() === username.toLowerCase()) ? (
                          <span className="text-[11px] font-sans font-black text-emerald-600 block uppercase">HADIR KULIAH ✓</span>
                        ) : (
                          <span className="text-[11px] font-sans font-black text-red-500 block uppercase">BELUM CHECK-IN PRESENSI</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {['presensi', 'kuis', 'tugas', 'leaderboard'].includes(activeReportsSubTab) && (
                  <div className="space-y-6">
                    {activeReportsSubTab === 'leaderboard' ? (
                      <div className="border-4 border-black p-5 bg-[#fafafa] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono block mb-4 text-left">PAPAN PERINGKAT KELAS - KUMULATIF SAAT INI</span>
                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin text-left font-mono">
                          {(() => {
                            const leaderboardData = authorizedStudents.map((ast, idx) => {
                               const liveStudent = Object.values(students || {}).find(s => 
                                 s.username.toLowerCase() === ast.fullName.toLowerCase()
                               );
                               const idNum = parseInt(ast.studentId.replace(/\D/g, '')) || (idx + 1) * 31;
                               let simulatedScore = 80 + (idNum % 15);
                               if (ast.fullName.toLowerCase().includes("nabilah")) {
                                 simulatedScore = 95;
                               } else if (ast.fullName.toLowerCase().includes("rangga")) {
                                 simulatedScore = 90;
                               } else if (ast.fullName.toLowerCase().includes("fikri")) {
                                 simulatedScore = 85;
                               }
                               if (liveStudent && liveStudent.score !== undefined) {
                                 simulatedScore = liveStudent.score;
                               }
                               return {
                                 id: ast.studentId,
                                 username: ast.fullName,
                                 score: simulatedScore
                               };
                            }).sort((a,b) => b.score - a.score);

                            return leaderboardData.map((st, idx) => {
                              let containerBg = 'bg-[#fafafa]';
                              if (idx === 0) containerBg = 'bg-amber-50';
                              else if (idx === 1) containerBg = 'bg-slate-50';
                              else if (idx === 2) containerBg = 'bg-[#f7f0e6]';

                              return (
                                <div key={st.id + '-rep-rank'} className={`p-2 border border-black bg-white flex justify-between items-center text-xs ${containerBg}`}>
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    <span className={`text-[10px] w-4 text-center shrink-0 text-black font-extrabold`}>#{idx + 1}</span>
                                    <span className="font-sans font-black text-[#111111] uppercase truncate">{st.username}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono font-black text-black bg-[#FF007A]/10 border border-[#FF007A] px-2 py-0.5">{st.score} PTS</span>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    ) : (
                      <>
                        {!selectedMeetingReport && activeReportsSubTab !== 'presensi' ? (
                          <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <h4 className="font-display font-black text-xs uppercase text-black border-b-2 border-black pb-2 mb-4 tracking-wider text-left">
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
                                    className="text-left bg-neutral-50 hover:bg-neutral-100 border-2 border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-px hover:-translate-y-px transition-all cursor-pointer flex flex-col gap-2"
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
                        ) : activeReportsSubTab === 'presensi' ? (
                          <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <h4 className="font-display font-black text-xs uppercase text-black border-b-2 border-black pb-2 mb-4 tracking-wider text-left">
                              PILIH PERTEMUAN UNTUK MELIHAT DATA PRESENSI
                            </h4>
                            {meetings.length === 0 ? (
                              <p className="text-[10px] text-gray-500 font-mono italic text-left">Belum ada sesi pertemuan yang terdaftar.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {meetings.map((m) => {
                                  const attRec = attendanceRecords.find(r => r.meetingId === m.id && r.studentName.toLowerCase() === username.toLowerCase());
                                  
                                  return (
                                    <div
                                      key={m.id}
                                      className="text-left bg-neutral-50 border-2 border-black p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between gap-2 relative"
                                    >
                                      <div className="pr-16">
                                        <span className="bg-black text-white font-black font-mono text-[9px] px-2 py-0.5 w-max tracking-widest uppercase mb-2 inline-block">
                                          PERTEMUAN {m.number}
                                        </span>
                                        <h5 className="font-extrabold text-black text-xs uppercase leading-tight line-clamp-2">{m.topic}</h5>
                                        <span className="text-[9px] font-mono text-gray-500 font-bold block mt-1">{m.date}</span>
                                      </div>
                                      
                                      <div className={`absolute top-2 right-2 border-2 border-black px-2 py-1 flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${attRec ? 'bg-emerald-200 text-emerald-900' : 'bg-red-200 text-red-900'}`}>
                                        <span className={`font-mono text-[9px] font-black uppercase text-center`}>
                                          {attRec ? (attRec.timestamp || 'HADIR') : 'ALPA / TERLAMBAT'}
                                        </span>
                                      </div>

                                      {attRec && attRec.facePhotoUrl && (
                                        <div className="mt-3 flex items-center gap-2 border-t-2 border-dashed border-gray-200 pt-2 select-none">
                                          <img
                                            src={attRec.facePhotoUrl}
                                            alt="Scan Wajah Handshake"
                                            referrerPolicy="no-referrer"
                                            className="w-10 h-8 object-cover border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                                          />
                                          <span className="text-[8px] font-mono text-emerald-600 uppercase font-black tracking-wide">Biometrik Lolos ✓</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                            <div className="flex justify-between items-center border-b-2 border-black pb-3">
                              <h4 className="font-display font-black text-sm uppercase text-black tracking-wider text-left">
                                DETAIL {activeReportsSubTab.toUpperCase()} PERTEMUAN {meetings.find(m => m.id === selectedMeetingReport)?.number}
                              </h4>
                              <button
                                onClick={() => setSelectedMeetingReport(null)}
                                className="bg-[#FF007A] hover:-translate-x-px hover:-translate-y-px text-white font-mono font-black text-[9px] uppercase px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                              >
                                ← KEMBALI
                              </button>
                            </div>
                            
                            <div className="pt-2 text-left">
                              {activeReportsSubTab === 'kuis' && (() => {
                                const mQuizzes = quizSubmissions.filter(q => q.studentName.toLowerCase() === username.toLowerCase() && q.meetingId === selectedMeetingReport);
                                
                                return (
                                  <div className="space-y-4">
                                     {mQuizzes.length === 0 ? (
                                        <p className="text-[10px] text-gray-500 font-mono italic">Anda tidak memiliki riwayat pengerjaan kuis pada pertemuan ini.</p>
                                     ) : (
                                       <div className="space-y-4">
                                         {mQuizzes.map((q, qIdx) => (
                                           <div key={q.id} className="border-2 border-black p-4 bg-amber-50/30 relative shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                              <div className="flex justify-between items-start">
                                                <h5 className="font-bold text-sm uppercase tracking-tight text-neutral-800">Pertanyaan Kuis {qIdx + 1}</h5>
                                                <span className={`px-2 py-0.5 font-black text-[9px] uppercase border ${q.isCorrect ? 'bg-emerald-100 text-emerald-800 border-emerald-400' : 'bg-red-100 text-red-800 border-red-400'}`}>
                                                  {q.isCorrect ? 'BENAR' : 'SALAH'}
                                                </span>
                                              </div>
                                              <p className="mt-2 text-xs font-medium bg-white p-2 border border-dashed border-gray-300">Jawaban Anda: {q.answerSubmitted}</p>
                                              
                                              <div className="mt-3 p-3 bg-white border border-black space-y-1">
                                                 <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5"><Check className="h-3 w-3" /> Kunci Jawaban:</p>
                                                 <p className="text-[11px] text-gray-700 font-medium">Berdasarkan materi yang diajarkan, penjelasan akan diberikan oleh sistem untuk perbaikan diri.</p>
                                              </div>
                                              

                                           </div>
                                         ))}
                                       </div>
                                     )}
                                  </div>
                                );
                              })()}

                              {activeReportsSubTab === 'tugas' && (() => {
                                const mSubmissions = submissions.filter(s => normalizeName(s.studentName) === normalizeName(username) && s.score !== undefined);
                                const asgs = assignments.filter(a => a.meetingId === selectedMeetingReport);
                                
                                return (
                                  <div className="space-y-4">
                                     {asgs.length === 0 ? (
                                        <p className="text-[10px] pb-2 border-b border-gray-200 uppercase font-mono italic">Tidak ada tugas yang diberikan pada pertemuan ini.</p>
                                     ) : (
                                       <div className="space-y-4">
                                         {asgs.map(asg => {
                                           const sub = mSubmissions.find(s => s.assignmentId === asg.id);
                                           return (
                                              <div key={asg.id} className="border-2 border-black p-4 bg-emerald-50/50 relative shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-2">
                                                  <h5 className="font-black text-sm uppercase text-black line-clamp-1">{asg.title}</h5>
                                                  <span className="bg-emerald-200 text-emerald-900 border border-emerald-600 px-2 py-1 font-bold font-mono shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap">
                                                    NILAI: {sub ? sub.score : '-'}/100
                                                  </span>
                                                </div>
                                                
                                                {!sub ? (
                                                  <p className="text-xs text-gray-500 italic mt-3 mb-2">Anda belum mendapatkan nilai tugas ini dari Teacher.</p>
                                                ) : (
                                                  <div className="mt-4 space-y-2">
                                                     <div className="p-3 bg-white border-2 border-black">
                                                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 items-center flex gap-1"><MessageSquare className="h-3 w-3" /> KOMENTAR TEACHER:</p>
                                                       <p className="text-xs font-semibold text-black italic">"{sub.notes || 'Kerja bagus! Dipertahankan ya.'}"</p>
                                                     </div>
                                                  </div>
                                                )}

                                                <button onClick={() => {
                                                   setShowAilyModal(true);
                                                   setAilyMessages([{ sender: 'aily', text: `Ada yang bingung mengenai tugas "${asg.title}" atau butuh saran perbaikan untuk nilai tugasmu? Tanyakan apa saja!` }]);
                                                }} className="mt-4 text-[10px] bg-[#FF007A] text-white px-3 py-1.5 border-2 border-black hover:-translate-x-px hover:-translate-y-px hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase font-black flex items-center gap-2 transition-all cursor-pointer"><Sparkles className="h-3 w-3" /> TANYA MENTOR AI</button>
                                              </div>
                                           );
                                         })}
                                       </div>
                                     )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

                {/* MentorLiveAI Chat Modal overlay */}
                {showAilyModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
                    <div className="bg-white border-4 border-black rounded-none w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[600px] max-h-[90vh] overflow-hidden">
                      
                      {/* Modal Header */}
                      <div className="flex justify-between items-center p-5 border-b-4 border-black bg-black">
                        <div>
                          <h3 className="font-black text-xl text-white leading-tight uppercase tracking-widest">Tanya MentorLiveAI</h3>
                          <p className="text-xs text-gray-300 font-bold uppercase mt-1">MentorLiveAI, AI Tutor Kamu.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setShowAilyModal(false)} className="text-[#FF007A] border-2 border-[#FF007A] hover:bg-[#FF007A] hover:text-black p-1 rounded-none bg-transparent">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </button>
                        </div>
                      </div>

                      {/* Chat Messages */}
                      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-100 to-gray-50">
                        {ailyMessages.map((msg, i) => (
                          <div key={i} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'aily' && (
                              <div className="w-8 h-8 rounded-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-[#00E5FF] flex items-center justify-center shrink-0">
                                <Sparkles className="h-4 w-4 text-black shrink-0" />
                              </div>
                            )}
                            <div className={`p-4 rounded-none max-w-[85%] text-sm leading-relaxed border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-medium ${
                              msg.sender === 'user' 
                                ? 'bg-[#FF007A] text-white' 
                                : 'bg-white text-gray-900 border-dashed'
                            }`}>
                              <SimpleMarkdown text={msg.text} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quick Chips & Input */}
                      <div className="p-4 bg-white border-t-4 border-black">
                        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
                          {(() => {
                            const currentQuestion = aiQuizQuestions?.[aiQuizCurrentIdx];
                            const correctLetter = (currentQuestion && typeof currentQuestion.correctOptionIndex === 'number' && currentQuestion.options && currentQuestion.options.length > 0)
                              ? String.fromCharCode(65 + currentQuestion.correctOptionIndex)
                              : '';
                            const firstChipText = correctLetter ? `Kenapa jawabannya ${correctLetter}?` : "Kenapa jawabannya itu?";
                            const chips = [firstChipText, "Jelasin konsepnya dong", "Kasih tips belajarnya"];
                            
                            return chips.map(chip => (
                              <button
                                key={chip}
                                onClick={() => setAilyChatInput(chip)}
                                className="whitespace-nowrap px-4 py-2 bg-[#FF007A] hover:bg-pink-600 text-white text-xs font-black rounded-none transition-colors border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase cursor-pointer"
                                style={{ color: '#FFFFFF' }}
                              >
                                <span className="text-white font-black" style={{ color: '#FFFFFF' }}>{chip}</span>
                              </button>
                            ));
                          })()}
                        </div>
                        <div className="flex gap-2 relative mt-1">
                          <input
                            type="text"
                            value={ailyChatInput}
                            onChange={e => setAilyChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAilySubmit(ailyChatInput)}
                            placeholder="KETIK PERTANYAAN..."
                            className="flex-1 px-4 py-3 bg-white border-4 border-black rounded-none text-sm focus:outline-none focus:ring-0 font-bold text-black placeholder-gray-400 shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)] uppercase placeholder-opacity-50"
                          />
                          <button
                            onClick={() => handleAilySubmit(ailyChatInput)}
                            disabled={!ailyChatInput.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black text-[#00E5FF] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 rounded-none disabled:shadow-none"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                          </button>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                )}
            {activeTab === 'notifications' && (
              <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 text-left">
                <h3 className="font-display font-black text-xs uppercase tracking-widest text-black border-b border-black pb-2 flex items-center gap-1.5">
                  <Bell className="h-4 w-4 shrink-0 text-black" /> NOTIFIKASI SISTEM
                </h3>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                  {notifications.filter(n => n.role === 'student' || n.role === 'all' || (n.role === username)).length === 0 ? (
                    <div className="p-4 border-2 border-dashed border-gray-300 text-center font-mono text-gray-400 text-[10px] font-bold">
                      BELUM ADA NOTIFIKASI AKTIVITAS
                    </div>
                  ) : (
                    notifications.filter(n => n.role === 'student' || n.role === 'all' || (n.role === username)).map(notif => (
                      <div key={notif.id} className="p-3 border-2 border-black bg-neutral-50 flex items-start gap-3">
                        {notif.type === 'assignment' && <UploadCloud className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />}
                        {notif.type === 'quiz' && <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />}
                        {notif.type === 'material' && <FolderOpen className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />}
                        {notif.type === 'general' && <Info className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />}
                        {notif.type === 'system' && <Settings className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
                        
                        <div>
                          <p className="font-sans text-xs font-bold text-black">{notif.message}</p>
                          <span className="font-mono text-[9px] font-black text-gray-400 mt-1 block">{notif.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <ChatSystemPanel 
                activeTab={chatOverlayTab}
                setActiveTab={setChatOverlayTab as any}
                currentUser={{ username, role: 'student' }}
                activeStudents={students}
                messages={messages}
                onSendMessage={onSendMessage}
              />
            )}
            
          </div>
        </div>

        {/* Right Rail panel: Chatroom and Roster lists */}
        {activeMeeting && activeTab === 'livesession' && (
          <div className="col-span-1 lg:col-span-3 lg:col-start-10 space-y-6">
            
            {/* Active students connected roster */}
            <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-3 select-none font-medium">
              <h4 className="font-display font-black text-xs text-[#111111] uppercase tracking-wider pb-1.5 border-b-2 border-black">
                CONNECTED PEERS ({Object.keys(students).length})
              </h4>

              <div className="space-y-1.5 max-h-[150px] overflow-y-auto scrollbar-thin text-xs">
                {Object.values(students).map((s) => (
                  <div key={s.id} className="flex justify-between items-center py-1.5 border-b border-gray-100 font-mono text-left">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full border border-black ${s.status === 'online' ? 'bg-[#00E5FF]' : 'bg-rose-400'} shrink-0`} />
                      <span className="font-black text-[#111111] truncate uppercase text-[11px] text-left">{s.username}</span>
                    </div>
                    <span className="font-mono text-[9px] font-bold text-gray-400">{s.ping}ms RTT</span>
                  </div>
                ))}
              </div>
            </div>

            <ChatRoom
              messages={messages}
              onSendMessage={onSendMessage}
              onSendReply={onSendReply}
              role="student"
              username={username}
              activeStudents={students}
            />

          </div>
        )}

      </main>

      {/* Styled Footer elements */}
      <footer className="border-t-4 border-black bg-[#111111] text-white p-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-center items-center text-[10px] font-mono text-gray-400 gap-2">
          <p className="font-bold">LiveClass {new Date().getFullYear()}</p>
        </div>
      </footer>

      {activeToast && (
        <div className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 z-[9999] animate-in slide-in-from-right-8 fade-in duration-300">
          <div className="bg-white border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] w-72 xs:w-80 relative">
            <button onClick={() => setActiveToast(null)} className="absolute top-2 right-2 p-1 hover:bg-neutral-200 border border-transparent hover:border-black transition-colors rounded-sm group cursor-pointer text-black">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {activeToast.type === 'assignment' && <UploadCloud className="h-5 w-5 text-purple-600" />}
                {activeToast.type === 'quiz' && <CheckSquare className="h-5 w-5 text-emerald-600" />}
                {activeToast.type === 'material' && <FolderOpen className="h-5 w-5 text-blue-600" />}
                {(!activeToast.type || activeToast.type === 'general') && <Bell className="h-5 w-5 animate-wiggle text-[#FF007A]" />}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-widest">{activeToast.timestamp || 'Baru saja'}</p>
                <p className="text-sm font-bold text-black leading-snug">{activeToast.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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