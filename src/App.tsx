/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Participant, ChatMessage, Material, Annotation, NetworkPacket, Quiz, Slide, ProctorStatus, CheatingLog, SystemNotification } from './types';
import { generateChecksum, MOCK_QUIZZES, MOCK_SLIDES, generateMaterialSummary, generateFormattedTimestamp } from './utils';

// Import our custom views
import LandingPage from './components/LandingPage';
import TeacherDashboard from './components/TeacherDashboard';
import StudentView from './components/StudentView';
import SplashScreen from './components/SplashScreen';
import SessionRecapPopup from './components/SessionRecapPopup';

import { Play, Laptop, ArrowRightLeft, Cpu, Download, Info } from 'lucide-react';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  const [username, setUsername] = useState('');
  const [classCode, setClassCode] = useState('');
  const [splitScreenMode, setSplitScreenMode] = useState<boolean>(false);
  const [activeMeeting, setActiveMeeting] = useState<any | null>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [classRecap, setClassRecap] = useState<any | null>(null);

  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

  const [assignments, setAssignments] = useState<any[]>([]);

  const [submissions, setSubmissions] = useState<any[]>([]);

  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [questionBanks, setQuestionBanks] = useState<any[]>([]);

  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  const [sentReports, setSentReports] = useState<any[]>([]);
  const [attendanceCode, setAttendanceCode] = useState<string>('SOCK2026');
  const [isAttendanceOpen, setIsAttendanceOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Default Course files shared
  const [sharedMaterials, setSharedMaterials] = useState<Material[]>([]);

  // Synchronize state with localStorage based on classCode (our durable database)
  useEffect(() => {
    if (classCode) {
      // 1. Meetings (with fallback default if empty)
      const savedMeetings = localStorage.getItem('liveclass-meetings-' + classCode);
      if (savedMeetings) {
        try {
          setMeetings(JSON.parse(savedMeetings));
        } catch (e) {
          console.error('Failed to parse saved meetings:', e);
        }
      } else {
        setMeetings([]);
      }

      // 2. Active Meeting
      const savedActiveMeeting = localStorage.getItem('liveclass-active-meeting-' + classCode);
      if (savedActiveMeeting) {
        try {
          setActiveMeeting(JSON.parse(savedActiveMeeting));
        } catch (e) {
          console.error('Failed to parse saved active meeting:', e);
        }
      } else {
        setActiveMeeting(null);
      }

      // 3. Calendar Events
      const savedCalendarEvents = localStorage.getItem('liveclass-calendar-' + classCode);
      if (savedCalendarEvents) {
        try {
          setCalendarEvents(JSON.parse(savedCalendarEvents));
        } catch (e) {
          console.error('Failed to parse saved calendar events', e);
        }
      } else {
        setCalendarEvents([]);
      }

      // 4. Assignments
      const savedAssignments = localStorage.getItem('liveclass-assignments-' + classCode);
      if (savedAssignments) {
        try {
          setAssignments(JSON.parse(savedAssignments));
        } catch (e) {
          console.error('Failed to parse saved assignments:', e);
        }
      } else {
        setAssignments([]);
      }

      // 5. Attendance Records
      const savedAttendance = localStorage.getItem('liveclass-attendance-' + classCode);
      if (savedAttendance) {
        try {
          setAttendanceRecords(JSON.parse(savedAttendance));
        } catch (e) {
          console.error('Failed to parse saved attendance:', e);
        }
      } else {
        setAttendanceRecords([]);
      }

      // 6. Submissions
      const savedSubmissions = localStorage.getItem('liveclass-submissions-' + classCode);
      if (savedSubmissions) {
        try {
          setSubmissions(JSON.parse(savedSubmissions));
        } catch (e) {
          console.error('Failed to parse saved submissions:', e);
        }
      } else {
        setSubmissions([]);
      }

      // 7. Sent Reports
      const savedReports = localStorage.getItem('liveclass-reports-' + classCode);
      if (savedReports) {
        try {
          setSentReports(JSON.parse(savedReports));
        } catch (e) {
          console.error('Failed to parse saved reports:', e);
        }
      } else {
        setSentReports([]);
      }

      // 8. Shared Materials
      const savedMaterials = localStorage.getItem('liveclass-materials-' + classCode);
      if (savedMaterials) {
        try {
          setSharedMaterials(JSON.parse(savedMaterials));
        } catch (e) {
          console.error('Failed to parse saved materials:', e);
        }
      } else {
        setSharedMaterials([]);
      }

      // 9. Bank Soal
      const savedBankSoal = localStorage.getItem('liveclass-bank-soal-' + classCode);
      if (savedBankSoal) {
        try {
          setQuestionBanks(JSON.parse(savedBankSoal));
        } catch (e) {
          console.error('Failed to parse saved banksoal:', e);
        }
      } else {
        setQuestionBanks([]);
      }
    }
  }, [classCode]);

  // Persist variations when state changes
  useEffect(() => {
    if (classCode) {
      localStorage.setItem('liveclass-meetings-' + classCode, JSON.stringify(meetings));
    }
  }, [meetings, classCode]);

  useEffect(() => {
    if (classCode) {
      if (activeMeeting) {
        localStorage.setItem('liveclass-active-meeting-' + classCode, JSON.stringify(activeMeeting));
      } else {
        localStorage.removeItem('liveclass-active-meeting-' + classCode);
      }
    }
  }, [activeMeeting, classCode]);

  useEffect(() => {
    if (classCode) {
      localStorage.setItem('liveclass-calendar-' + classCode, JSON.stringify(calendarEvents));
    }
  }, [calendarEvents, classCode]);

  useEffect(() => {
    if (classCode) {
      localStorage.setItem('liveclass-assignments-' + classCode, JSON.stringify(assignments));
    }
  }, [assignments, classCode]);

  useEffect(() => {
    if (classCode) {
      localStorage.setItem('liveclass-submissions-' + classCode, JSON.stringify(submissions));
    }
  }, [submissions, classCode]);

  // Load/synchronize assignments, submissions, and all real-time states with the Express server
  useEffect(() => {
    if (!classCode) return;

    let isSubscribed = true;

    const loadFromServer = async () => {
      try {
        const syncRes = await fetch(`/api/sync-state?classCode=${encodeURIComponent(classCode)}`);
        if (!syncRes.ok) return;
        const state = await syncRes.json();
        
        if (isSubscribed && state) {
          if (Array.isArray(state.assignments)) {
            setAssignments(state.assignments);
          }
          if (Array.isArray(state.submissions)) {
            setSubmissions(state.submissions);
          }
          if (Array.isArray(state.broadcasts)) {
            setBroadcasts(state.broadcasts);
          }
          if (Array.isArray(state.questionBanks)) {
            setQuestionBanks(state.questionBanks);
          }
          if (Array.isArray(state.messages)) {
            setMessages(state.messages);
          }
          if (Array.isArray(state.notifications)) {
            setNotifications(state.notifications);
          }
          if (state.meetings) {
            setMeetings(state.meetings);
          }
          if (state.activeMeeting !== undefined) {
            setActiveMeeting(state.activeMeeting);
          }
          if (state.currentSlideIndex !== undefined && userRole === 'student') {
            setCurrentSlideIndex(state.currentSlideIndex);
          }
          if (state.externalAnnotations !== undefined && userRole === 'student') {
            setExternalAnnotations(state.externalAnnotations);
          }
          if (state.activeQuiz !== undefined && userRole === 'student') {
            setActiveQuiz(state.activeQuiz);
          }
          if (Array.isArray(state.quizSubmissions)) {
            setQuizSubmissions(state.quizSubmissions);
          }
          if (state.proctorStatuses) {
            setProctorStatuses(state.proctorStatuses);
          }
          if (Array.isArray(state.proctorLogs)) {
            setProctorLogs(state.proctorLogs);
          }
          if (Array.isArray(state.sharedMaterials)) {
            setSharedMaterials(state.sharedMaterials);
          }
          if (Array.isArray(state.attendanceRecords)) {
            setAttendanceRecords(state.attendanceRecords);
          }
          if (state.isAttendanceOpen !== undefined && userRole === 'student') {
            setIsAttendanceOpen(state.isAttendanceOpen);
          }
          if (state.attendanceCode !== undefined && userRole === 'student') {
            setAttendanceCode(state.attendanceCode);
          }
          if (Array.isArray(state.sentReports)) {
            setSentReports(state.sentReports);
          }
          if (state.students) {
            setStudents(prev => ({ ...prev, ...state.students }));
          }
        }
      } catch (err: any) {
        if (!String(err).includes('Failed to fetch') && err.message !== 'Failed to fetch') {
          console.error("Failed to sync entire state from server:", err);
        }
      }
    };

    loadFromServer();
    const interval = setInterval(loadFromServer, 2500);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [classCode, userRole]);

  useEffect(() => {
    if (classCode) {
      localStorage.setItem('liveclass-attendance-' + classCode, JSON.stringify(attendanceRecords));
    }
  }, [attendanceRecords, classCode]);

  useEffect(() => {
    if (classCode) {
      localStorage.setItem('liveclass-reports-' + classCode, JSON.stringify(sentReports));
    }
  }, [sentReports, classCode]);

  useEffect(() => {
    if (classCode) {
      localStorage.setItem('liveclass-materials-' + classCode, JSON.stringify(sharedMaterials));
    }
  }, [sharedMaterials, classCode]);

  
  const [packets, setPackets] = useState<NetworkPacket[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [externalAnnotations, setExternalAnnotations] = useState<Annotation[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answeredQuizId, setAnsweredQuizId] = useState<string | null>(null);
  const [quizSubmissions, setQuizSubmissions] = useState<any[]>([]);
  const [latencySlider, setLatencySlider] = useState<number>(35); // Simulated network lag in ms

  // Proctoring telemetry storage
  const [proctorStatuses, setProctorStatuses] = useState<Record<string, ProctorStatus>>({});
  const [proctorLogs, setProctorLogs] = useState<CheatingLog[]>([]);

  // Real-time states
  const [students, setStudents] = useState<Record<string, Participant>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  useEffect(() => {
    if (classCode) {
      const savedMessages = localStorage.getItem('liveclass-messages-' + classCode);
      if (savedMessages) {
        try {
          setMessages(JSON.parse(savedMessages));
        } catch (e) {
          console.error('Failed to parse saved messages:', e);
        }
      } else {
        setMessages([]);
      }

      const savedNotifications = localStorage.getItem('liveclass-notifications-' + classCode);
      if (savedNotifications) {
        try {
          setNotifications(JSON.parse(savedNotifications));
        } catch (e) {
          console.error('Failed to parse saved notifications:', e);
        }
      } else {
        setNotifications([]);
      }

      // 9. Extra Data (Quiz, Proctor, Students)
      const savedQuizSubs = localStorage.getItem('liveclass-quizsubs-' + classCode);
      if (savedQuizSubs) {
        try { setQuizSubmissions(JSON.parse(savedQuizSubs)); } catch(e) {}
      } else setQuizSubmissions([]);

      const savedProctorLogs = localStorage.getItem('liveclass-proctorlogs-' + classCode);
      if (savedProctorLogs) {
        try { setProctorLogs(JSON.parse(savedProctorLogs)); } catch(e) {}
      } else setProctorLogs([]);

      const savedProctorStatus = localStorage.getItem('liveclass-proctorstatus-' + classCode);
      if (savedProctorStatus) {
        try { setProctorStatuses(JSON.parse(savedProctorStatus)); } catch(e) {}
      } else setProctorStatuses({});

      const savedStudents = localStorage.getItem('liveclass-students-' + classCode);
      if (savedStudents) {
        try { setStudents(JSON.parse(savedStudents)); } catch(e) {}
      } else setStudents({});

    }
  }, [classCode]);

  useEffect(() => {
    if (classCode) {
      localStorage.setItem('liveclass-messages-' + classCode, JSON.stringify(messages));
    }
  }, [messages, classCode]);

  useEffect(() => {
    if (classCode) {
      localStorage.setItem('liveclass-bank-soal-' + classCode, JSON.stringify(questionBanks));
    }
  }, [questionBanks, classCode]);

  useEffect(() => {
    if (classCode) {
      localStorage.setItem('liveclass-notifications-' + classCode, JSON.stringify(notifications));
    }
  }, [notifications, classCode]);

  useEffect(() => {
    if (classCode) {
      localStorage.setItem('liveclass-quizsubs-' + classCode, JSON.stringify(quizSubmissions));
      localStorage.setItem('liveclass-proctorlogs-' + classCode, JSON.stringify(proctorLogs));
      localStorage.setItem('liveclass-proctorstatus-' + classCode, JSON.stringify(proctorStatuses));
      localStorage.setItem('liveclass-students-' + classCode, JSON.stringify(students));
    }
  }, [quizSubmissions, proctorLogs, proctorStatuses, students, classCode]);

  // Broadcast channel pointer context
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Setup BroadcastChannel for multi-tab synchronization
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('liveclass-channel-mesh');
        channelRef.current = channel;

        channel.onmessage = (event) => {
          const { type, payload } = event.data;
          handleReceivedBroadcast(type, payload);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported or access is denied in this context:', e);
      channelRef.current = null;
    }

    return () => {
      if (channel) {
        try {
          channel.close();
        } catch (e) {
          console.warn('Failed to close BroadcastChannel:', e);
        }
      }
    };
  }, [students, messages, packets, currentSlideIndex, activeQuiz, quizSubmissions, sharedMaterials, slides, activeMeeting, meetings, assignments, submissions, attendanceRecords, sentReports, attendanceCode, isAttendanceOpen]);

  // Utility to push local activities both to network packets and cross-tab broadcasts
  const createAndBroadcastPayload = (type: string, payload: any) => {
    // 1. Packet layer logging simulation
    const seq = Math.floor(Math.random() * 10000);
    const payloadStrRaw = JSON.stringify(payload);
    const checksum = generateChecksum(payloadStrRaw);
    
    // Truncate payload string for logs visualization so it doesn't freeze the DOM for massive slide payloads
    const payloadStrVisual = payloadStrRaw.length > 500 ? payloadStrRaw.substring(0, 500) + '... [TRUNCATED_FOR_LOGS]' : payloadStrRaw;
    
    const newPacket: NetworkPacket = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: generateFormattedTimestamp(),
      type: type === 'ERROR_ALERT' ? 'ERROR' : 'DATA',
      eventName: type,
      sender: userRole === 'teacher' ? 'Teacher_Socket' : (username || 'Student_Socket'),
      receiver: userRole === 'teacher' ? 'Broadcast_Room' : 'Server_Socket',
      payload: payloadStrVisual,
      checksum,
      sequenceNum: seq
    };

    setPackets((prev) => [...prev, newPacket].slice(-50)); // cap logs limit to 50 items

    if (type === 'SESSION_RECAP_TRIGGERED') {
      setClassRecap(payload.recap);
    }

    // 2. Broadcast Channel triggers (transmit the real full payload)
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({ type, payload: { ...payload, __packet: newPacket } });
      } catch (e) {
        console.warn('Failed to postMessage to BroadcastChannel:', e);
      }
    }

    // 2.5. Server-side unified state action synchronization
    if (classCode) {
      fetch('/api/sync-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          classCode,
          type,
          payload
        })
      }).catch(e => {
        // Safe ignore on offline modes and initial connectivity warnings
      });
    }

    // 3. Local tab state synchronization for same-tab triggers
    const skipLocalExecution = [
      'CHAT_MESSAGE',
      'MATERIAL_ADDED',
      'MATERIAL_REMOVED',
      'STUDENT_JOINED',
      'STUDENT_STATUS_UPDATE',
      'QUIZ_LAUNCHED',
      'QUIZ_ENDED',
      'SLIDE_NAVIGATE',
      'SLIDES_UPDATED',
      'ANNOTATIONS_DRAWN',
      'FORUM_REPLY_ADDED'
    ];

    if (!skipLocalExecution.includes(type)) {
      handleReceivedBroadcast(type, { ...payload, __packet: newPacket });
    }
  };

  // Broadcast router
  const handleReceivedBroadcast = (type: string, payload: any) => {
    // Capture the diagnostic packets
    if (payload.__packet) {
      setPackets((prev) => [...prev, payload.__packet].slice(-50));
    }

    switch (type) {
      case 'SESSION_CREATED':
        // If teacher created code, announce or log
        break;

      case 'STUDENT_JOINED':
        {
          const joinedStudent = payload.student as Participant;
          setStudents((prev) => ({
            ...prev,
            [joinedStudent.username]: joinedStudent
          }));
          // reply with slide sync if we are teacher
          if (userRole === 'teacher') {
            createAndBroadcastPayload('SLIDE_SYNC_FORCE', { 
              index: currentSlideIndex, 
              annotations: externalAnnotations,
              slides: slides,
              activeMeeting: activeMeeting,
              meetings: meetings,
              assignments: assignments,
              submissions: submissions,
              attendanceRecords: attendanceRecords,
              isAttendanceOpen: isAttendanceOpen,
              attendanceCode: attendanceCode,
              sentReports: sentReports,
              students: students,
              notifications: notifications
            });
          }
        }
        break;

      case 'STUDENT_STATUS_UPDATE':
        {
          const updatedStudent = payload.student as Participant;
          setStudents((prev) => ({
            ...prev,
            [updatedStudent.username]: updatedStudent
          }));
        }
        break;

      case 'SLIDE_NAVIGATE':
        setCurrentSlideIndex(payload.index);
        setExternalAnnotations(payload.annotations || []);
        break;

      case 'SLIDES_UPDATED':
        if (payload.slides) {
          setSlides(payload.slides);
        }
        setCurrentSlideIndex(0);
        setExternalAnnotations([]);
        break;

      case 'SLIDE_SYNC_FORCE':
        if (userRole === 'student') {
          setCurrentSlideIndex(payload.index);
          setExternalAnnotations(payload.annotations || []);
          if (payload.slides) {
            setSlides(payload.slides);
          }
          if (payload.activeMeeting !== undefined) setActiveMeeting(payload.activeMeeting);
          if (payload.meetings !== undefined) setMeetings(payload.meetings);
          if (payload.assignments !== undefined) setAssignments(payload.assignments);
          if (payload.submissions !== undefined) setSubmissions(payload.submissions);
          if (payload.attendanceRecords !== undefined) setAttendanceRecords(payload.attendanceRecords);
          if (payload.isAttendanceOpen !== undefined) setIsAttendanceOpen(payload.isAttendanceOpen);
          if (payload.attendanceCode !== undefined) setAttendanceCode(payload.attendanceCode);
          if (payload.sentReports !== undefined) setSentReports(payload.sentReports);
          if (payload.calendarEvents !== undefined) setCalendarEvents(payload.calendarEvents);
          if (payload.students !== undefined) setStudents(prev => ({...prev, ...payload.students}));
          if (payload.notifications !== undefined) setNotifications(payload.notifications);
        }
        break;

      case 'ANNOTATIONS_DRAWN':
        setExternalAnnotations(payload.annotations || []);
        break;

      case 'BANK_SOAL_UPDATED':
        if (payload.questionBanks) {
          setQuestionBanks(payload.questionBanks);
        }
        break;

      case 'QUIZ_LAUNCHED':
        setActiveQuiz(payload.quiz);
        setAnsweredQuizId(null);
        break;

      case 'QUIZ_ENDED':
        setActiveQuiz(null);
        break;

      case 'QUIZ_SUBMITTED':
        const {
          username: studentName,
          isCorrect,
          scoreAddition,
          optionIndex,
          timeSpent,
          quizId,
          question,
          answerSubmitted,
          meetingId
        } = payload;
        
        // Register local score additions in teacher list representation
        setStudents((prev) => {
          const sObj = { ...prev };
          if (sObj[studentName]) {
            const currentObj = { ...sObj[studentName] };
            
            const oldCorrect = currentObj.correctAnswersCount || 0;
            const oldTotal = currentObj.totalAnswersCount || 0;
            
            const nextCorrect = oldCorrect + (isCorrect ? 1 : 0);
            const nextTotal = oldTotal + 1;
            
            currentObj.correctAnswersCount = nextCorrect;
            currentObj.totalAnswersCount = nextTotal;
            
            // Linear grading score out of 100 (e.g., 8 correct of 10 matches 80/100)
            const gradingScore = Math.round((nextCorrect / nextTotal) * 100);
            
            currentObj.score = gradingScore;
            currentObj.meetingScore = gradingScore;
            
            // Only update streak if it's not the current user, as they did optimistic update
            if (studentName !== username) {
                currentObj.streak = isCorrect ? (currentObj.streak || 0) + 1 : 0;
            }
            
            currentObj.accuracy = gradingScore;
            
            sObj[studentName] = currentObj;
          }
          return sObj;
        });

        setQuizSubmissions((prev) => {
          // Prevent exact duplicate submissions for the same student on the same quiz to keep reports clean
          const cleaned = prev.filter(q => !(q.studentName.toLowerCase() === studentName.toLowerCase() && q.quizId === (quizId || activeQuiz?.id)));
          return [
            ...cleaned,
            {
              id: payload.id || 'qsub-' + Math.random().toString(36).substr(2, 9),
              studentName,
              isCorrect,
              optionIndex,
              timeSpent,
              quizId: quizId || activeQuiz?.id || 'quiz-live',
              meetingId: meetingId || activeMeeting?.id || '',
              question: question || activeQuiz?.question || 'Pertanyaan Kuis Jaringan',
              answerSubmitted: answerSubmitted || (activeQuiz?.options ? activeQuiz.options[optionIndex] : (optionIndex === 0 ? 'True' : 'False'))
            }
          ];
        });
        break;

      case 'CHAT_MESSAGE':
        setMessages((prev) => [...prev, payload.message].slice(-50));
        break;

      case 'FORUM_REPLY_ADDED':
        setMessages((prev) => prev.map(msg => {
          if (msg.id === payload.messageId) {
            return {
              ...msg,
              replies: [...(msg.replies || []), payload.reply]
            };
          }
          return msg;
        }));
        break;

      case 'AUDIO_CHUNK':
        {
          const localSender = userRole === 'teacher' ? 'Teacher_Presenter' : username;
          if (payload.sender !== localSender) {
            try {
              const audio = new Audio(payload.base64);
              audio.volume = 1.0;
              audio.play().catch((e) => {
                console.warn("Autoplay block prevented background slide voice stream. Click somewhere to hear live audio:", e);
              });

              // Fire local event to show active speaker visual indicators
              const customEv = new CustomEvent('active-speaker', { detail: { sender: payload.sender } });
              window.dispatchEvent(customEv);
            } catch (err) {
              console.warn("Failed to process incoming audio chunk packet:", err);
            }
          }
        }
        break;

      case 'MATERIAL_ADDED':
        setSharedMaterials((prev) => [...prev, payload.material]);
        break;

      case 'MATERIAL_REMOVED':
        setSharedMaterials((prev) => prev.filter(m => m.id !== payload.id));
        break;

      case 'NOTIFICATION_ADDED':
        setNotifications((prev) => {
          if (prev.some(n => n.id === payload.notification.id)) return prev;
          return [payload.notification, ...prev];
        });
        break;

       case 'PROCTOR_STATUS_UPDATE':
        {
          const { studentName, proctorState, newLog } = payload;
          setProctorStatuses((prev) => ({
            ...prev,
            [studentName]: proctorState
          }));
          if (newLog) {
            const logWithMtg = {
              ...newLog,
              meetingId: newLog.meetingId || activeMeeting?.id || ""
            };
            setProctorLogs((prev) => {
              if (prev.some(log => log.id === logWithMtg.id)) return prev;
              return [logWithMtg, ...prev].slice(0, 50);
            });
          }
        }
        break;

      case 'TEACHER_PROCTOR_ACTION':
        {
          const { studentName: targetUsername, actionType, text, deduction, reviewFlag, invalidateFlag } = payload;
          if (userRole === 'student' && username === targetUsername) {
            window.dispatchEvent(new CustomEvent('teacher-proctor-action', { detail: payload }));
          }
          setProctorStatuses((prev) => {
            const current = prev[targetUsername];
            if (!current) return prev;
            return {
              ...prev,
              [targetUsername]: {
                ...current,
                warningCount: actionType === 'warn_student' ? current.warningCount + 1 : current.warningCount,
                scoreDeduction: actionType === 'deduct_score' ? (current.scoreDeduction + (deduction || 0)) : current.scoreDeduction,
                isFlaggedForReview: actionType === 'flag_review' ? reviewFlag : current.isFlaggedForReview,
                isInvalidated: actionType === 'invalidate' ? invalidateFlag : current.isInvalidated,
                status: actionType === 'invalidate' ? 'suspicious' : current.status
              }
            };
          });
          
          if (actionType === 'deduct_score' && deduction) {
            setStudents((prev) => {
              const sObj = { ...prev };
              if (sObj[targetUsername]) {
                const currentObj = { ...sObj[targetUsername] };
                currentObj.score = Math.max(0, currentObj.score - deduction);
                currentObj.meetingScore = Math.max(0, currentObj.meetingScore - deduction);
                sObj[targetUsername] = currentObj;
              }
              return sObj;
            });
          }

          if (payload.log) {
            const logWithMtg = {
              ...payload.log,
              meetingId: payload.log.meetingId || activeMeeting?.id || ""
            };
            setProctorLogs((prev) => [logWithMtg, ...prev].slice(0, 50));
          }
        }
        break;

      case 'MEETING_SESSION_CHANGED':
        {
          const targetMeeting = payload.activeMeeting !== undefined ? payload.activeMeeting : payload.meeting;
          setActiveMeeting(targetMeeting);
          if (payload.meetings) setMeetings(payload.meetings);
        }
        break;

      case 'SESSION_RECAP_TRIGGERED':
        setClassRecap(payload.recap);
        break;

      case 'MEETINGS_UPDATED':
        setMeetings(payload.meetings);
        break;

      case 'ASSIGNMENTS_UPDATED':
        setAssignments(payload.assignments);
        break;

      case 'CALENDAR_EVENTS_UPDATED':
        setCalendarEvents(payload.calendarEvents);
        break;

      case 'SUBMISSIONS_UPDATED':
        setSubmissions(payload.submissions);
        break;

      case 'NOTIFICATIONS_UPDATED':
        setNotifications(payload.notifications);
        break;

      case 'ATTENDANCE_STATUS_CHANGED':
        setIsAttendanceOpen(payload.isAttendanceOpen);
        setAttendanceCode(payload.attendanceCode);
        break;

      case 'ATTENDANCE_SUBMITTED':
        setAttendanceRecords((prev) => {
          const index = prev.findIndex(r => r.studentName === payload.record.studentName && r.meetingId === payload.record.meetingId);
          if (index !== -1) {
            const next = [...prev];
            next[index] = payload.record;
            return next;
          }
          return [...prev, payload.record];
        });
        break;

      case 'DAILY_REPORT_SENT':
        setSentReports((prev) => {
          if (prev.some(r => r.id === payload.report.id)) {
            return prev.map(r => r.id === payload.report.id ? payload.report : r);
          }
          return [...prev, payload.report];
        });
        break;

      case 'QUIZ_BONUS_SCORE':
        {
          const { studentUsername, topic, score } = payload;
          setStudents((prev) => {
            const sObj = { ...prev };
            if (sObj[studentUsername]) {
              sObj[studentUsername] = {
                ...sObj[studentUsername],
                score: sObj[studentUsername].score + score,
                meetingScore: (sObj[studentUsername].meetingScore || 0) + score
              };
            }
            return sObj;
          });
        }
        break;

      default:
        break;
    }
  };

  // Heartbeat simulated PING/PONG sequences run every 5s
  useEffect(() => {
    const pingPongInterval = setInterval(() => {
      // If student is connected, simulate ping packet to the server and update ping latency stats
      if (userRole === 'student' && username) {
        const pingTime = Date.now();
        const randPing = Math.round(Math.random() * 8 + latencySlider); // user slider + jitter

        const payloadUpdate = {
          username,
          ping: randPing,
          status: 'online'
        };

        // Self log ping pong socket logs
        const seq = Math.floor(Math.random() * 5000);
        const checksum = generateChecksum(JSON.stringify(payloadUpdate));
        
        const pingPkt: NetworkPacket = {
          id: 'ping-' + Math.random().toString(36).substr(2, 9),
          timestamp: generateFormattedTimestamp(),
          type: 'PING',
          eventName: 'PING_REQUEST',
          sender: username,
          receiver: 'Server_Socket',
          payload: `{"timestamp": ${pingTime}, "seq_num": ${seq}}`,
          checksum,
          sequenceNum: seq
        };

        setPackets((prev) => [...prev, pingPkt].slice(-50));

        setTimeout(() => {
          const pongPkt: NetworkPacket = {
            id: 'pong-' + Math.random().toString(36).substr(2, 9),
            timestamp: generateFormattedTimestamp(),
            type: 'PONG',
            eventName: 'PONG_REPLY',
            sender: 'Server_Socket',
            receiver: username,
            payload: `{"rtt": ${randPing}, "seq_num": ${seq}}`,
            checksum,
            sequenceNum: seq
          };
          setPackets((prev) => [...prev, pongPkt].slice(-50));

          // Update socket lists
          setStudents((prev) => {
            const nextStudents = { ...prev };
            const currentStudent = nextStudents[username];
            const updatedStudent: Participant = currentStudent ? {
              ...currentStudent,
              ping: randPing,
              status: 'online' as const
            } : {
              id: 'std-' + Math.random().toString(36).substr(2, 9),
              username,
              role: 'student' as const,
              status: 'online' as const,
              ping: randPing,
              joinedAt: 'Now',
              reconnectCount: 0,
              accuracy: 100,
              speed: 1200,
              score: 0,
              streak: 0,
              meetingScore: 0
            };
            
            nextStudents[username] = updatedStudent;

            // Schedule the sync side-effect outside the synchronous state assignment
            setTimeout(() => {
              createAndBroadcastPayload('STUDENT_STATUS_UPDATE', { student: updatedStudent });
            }, 0);

            return nextStudents;
          });

        }, randPing);
      }
    }, 6000);

    return () => clearInterval(pingPongInterval);
  }, [userRole, username, latencySlider]);

  const handleJoinSession = (code: string, userIn: string, roleSelected: 'student' | 'teacher') => {
    setClassCode(code);
    setUsername(userIn);
    setUserRole(roleSelected);

    if (roleSelected === 'student') {
      // 1. Create client self registration packet
      const newParticipation: Participant = {
        id: 'std-' + Math.random().toString(36).substr(2, 9),
        username: userIn,
        role: 'student',
        status: 'online',
        ping: 15,
        joinedAt: generateFormattedTimestamp(),
        reconnectCount: 0,
        accuracy: 100,
        speed: 1000,
        score: 0,
        streak: 0,
        meetingScore: 0
      };

      setStudents((prev) => ({
        ...prev,
        [userIn]: newParticipation
      }));

      // Broadcast joining context to other tabs
      createAndBroadcastPayload('STUDENT_JOINED', { student: newParticipation });
      
      const notification = {
        id: 'notif-' + Math.random().toString(36).substr(2, 9),
        message: `Student [${userIn}] bergabung ke kelas.`,
        timestamp: generateFormattedTimestamp(),
        role: 'teacher',
        type: 'system'
      };
      createAndBroadcastPayload('NOTIFICATION_ADDED', { notification });
    } else {
      // If teacher joins
      const teacherParticipation: Participant = {
        id: 'teacher-' + Math.random().toString(36).substr(2, 9),
        username: userIn,
        role: 'teacher',
        status: 'online',
        ping: 15,
        joinedAt: new Date().toISOString(),
        reconnectCount: 0,
        accuracy: 100,
        speed: 1000,
        score: 0,
        streak: 0,
        meetingScore: 0
      };
      setStudents((prev) => ({
        ...prev,
        [userIn]: teacherParticipation
      }));
      createAndBroadcastPayload('STUDENT_JOINED', { student: teacherParticipation });
      createAndBroadcastPayload('SESSION_CREATED', { code });
    }
  };

  const handleLaunchQuiz = (quiz: Quiz) => {
    const freshQuiz = { ...quiz, isActive: true };
    setActiveQuiz(freshQuiz);
    // Do not clear quiz submissions history anymore, to persist previous quiz session results
    createAndBroadcastPayload('QUIZ_LAUNCHED', { quiz: freshQuiz });
    
    const notification = {
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      message: `Teacher memulai sesi Kuis Live: ${quiz.question}`,
      timestamp: generateFormattedTimestamp(),
      role: 'all',
      type: 'quiz'
    };
    createAndBroadcastPayload('NOTIFICATION_ADDED', { notification });
  };

  const handleEndQuiz = () => {
    setActiveQuiz(null);
    createAndBroadcastPayload('QUIZ_ENDED', {});
    
    const notification = {
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      message: `Teacher mengakhiri sesi Kuis Live.`,
      timestamp: generateFormattedTimestamp(),
      role: 'all',
      type: 'quiz'
    };
    createAndBroadcastPayload('NOTIFICATION_ADDED', { notification });
  };

  const handleAnswerQuiz = (optionIdx: number, optionValue: string, timeSpentMs: number) => {
    if (!activeQuiz) return;
    
    setAnsweredQuizId(activeQuiz.id);
    const isCorrect = optionIdx === activeQuiz.correctOptionIndex;
    
    // Optimistic streak update: calc BEFORE we update state
    const currentStudent = students[username];
    const currentStreak = currentStudent?.streak || 0;
    const nextStreak = isCorrect ? currentStreak + 1 : 0;
    
    setStudents(prev => ({
        ...prev,
        [username]: {
            ...prev[username],
            streak: nextStreak
        }
    }));
    
    // Kahoot Style scoring formula + Streak bonus
    const basePts = 1000;
    const timePenalty = Math.round((timeSpentMs / 1000) * 15);
    let calculatedAddition = isCorrect ? Math.max(200, basePts - timePenalty) : 0;
    
    // Apply streak multiplier, using the PREVIOUS streak
    if (isCorrect && currentStreak >= 1) {
      // 10% bonus for every consecutive correct answer above 1 (max 50%)
      const streakMultiplier = 1 + Math.min(0.5, currentStreak * 0.1);
      calculatedAddition = Math.round(calculatedAddition * streakMultiplier);
    }

    createAndBroadcastPayload('QUIZ_SUBMITTED', {
      username,
      isCorrect,
      scoreAddition: calculatedAddition,
      optionIndex: optionIdx,
      timeSpent: timeSpentMs,
      quizId: activeQuiz.id,
      question: activeQuiz.question,
      answerSubmitted: optionValue,
      meetingId: activeMeeting?.id || ""
    });
    
    const notification = {
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      message: `Student [${username}] telah menyelesaikan kuis interaktif.`,
      timestamp: generateFormattedTimestamp(),
      role: 'teacher',
      type: 'quiz'
    };
    createAndBroadcastPayload('NOTIFICATION_ADDED', { notification });
  };

  const handleSendMessage = (text: string, isAnnouncement: boolean, recipientName?: string) => {
    if (isAnnouncement) {
      const roleTarget = recipientName || 'all';
      const notification = {
        id: 'notif-' + Math.random().toString(36).substr(2, 9),
        message: text,
        timestamp: generateFormattedTimestamp(),
        role: roleTarget,
        type: 'system'
      };
      setNotifications((prev) => {
        if (prev.some(n => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
      createAndBroadcastPayload('NOTIFICATION_ADDED', { notification });
    }

    const formattedMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: generateFormattedTimestamp(),
      senderId: username || 'Teacher',
      senderName: username || 'Teacher_Socket',
      role: userRole || 'teacher',
      text,
      isAnnouncement,
      recipientName
    };

    setMessages((prev) => [...prev, formattedMessage]);
    createAndBroadcastPayload('CHAT_MESSAGE', { message: formattedMessage });
  };

  const handleSendReply = (messageId: string, text: string) => {
    const reply = {
      id: Math.random().toString(36).substr(2, 9),
      senderName: username || 'User_Guest',
      text,
      timestamp: generateFormattedTimestamp(),
    };

    setMessages((prev) => prev.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          replies: [...(msg.replies || []), reply]
        };
      }
      return msg;
    }));

    createAndBroadcastPayload('FORUM_REPLY_ADDED', { messageId, reply });
  };

  const handleSlideIndexChange = (index: number, updatedAnnotations: Annotation[]) => {
    setCurrentSlideIndex(index);
    setExternalAnnotations([]); // reset drawings for the new page
    createAndBroadcastPayload('SLIDE_NAVIGATE', { index, annotations: [] });
  };

  const handleSlidesChange = (newSlides: Slide[]) => {
    setSlides(newSlides);
    setCurrentSlideIndex(0);
    setExternalAnnotations([]);
    createAndBroadcastPayload('SLIDES_UPDATED', { slides: newSlides });
  };

  const handleDrawUpdate = (annotations: Annotation[]) => {
    setExternalAnnotations(annotations);
    createAndBroadcastPayload('ANNOTATIONS_DRAWN', { annotations });
  };

  const handleAddMaterial = (mat: Material) => {
    setSharedMaterials((prev) => [...prev, mat]);
    createAndBroadcastPayload('MATERIAL_ADDED', { material: mat });
    
    const notification = {
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      message: `Teacher membagikan file materi baru: ${mat.name}`,
      timestamp: generateFormattedTimestamp(),
      role: 'all',
      type: 'material'
    };
    createAndBroadcastPayload('NOTIFICATION_ADDED', { notification });
  };

  const handleRemoveMaterial = (id: string) => {
    setSharedMaterials((prev) => prev.filter(m => m.id !== id));
    createAndBroadcastPayload('MATERIAL_REMOVED', { id });
  };

  // Chaos Packet Injector simulator
  const injectPacketError = (type: 'checksum' | 'duplicate_user' | 'malformed') => {
    let errType = 'ERROR_ALERT';
    let packetDesc = {};

    if (type === 'checksum') {
      packetDesc = { type: 'Connection Mismatch', message: 'Invalid MD5 Integrity Checksum on segment 502' };
    } else if (type === 'duplicate_user') {
      packetDesc = { type: 'Duplicate Login Filtered', message: `Username yang dimasukkan sedang aktif!` };
    } else {
      packetDesc = { type: 'Malformed Packet Format', message: `Invalid Packet Format: Missing segment protocol header` };
    }

    createAndBroadcastPayload(errType, packetDesc);
  };

  // Stress tests simulator (Spawns concurrent virtual student records)
  const triggerLoadTesting = (countCount: number) => {
    setPackets((prev) => [
      ...prev,
      {
        id: 'stst-' + Math.random(),
        timestamp: generateFormattedTimestamp(),
        type: 'SYN',
        eventName: 'STRESS_TEST_START',
        sender: 'LoadTest_Executor',
        receiver: 'Server_Socket',
        payload: `{"action": "spawning_concurrent_clients", "quantity": ${countCount}}`,
        checksum: '6FF52',
        sequenceNum: 10405
      }
    ]);

    // Populate fake student records to roster in sequence with staggered latencies simulating multithreading queue
    for (let i = 1; i <= countCount; i++) {
      setTimeout(() => {
        const vName = `MHS_Virtual_${i}`;
        const randomPoints = Math.round(Math.random() * 20 + 85); // 85 to 105 (cap at 100)
        const academicScore = Math.min(100, randomPoints);

        setStudents((prev) => ({
          ...prev,
          [vName]: {
            id: `vClient-${i}`,
            username: vName,
            role: 'student',
            status: 'online',
            ping: Math.round(Math.random() * 45 + 10),
            joinedAt: 'StressTest',
            reconnectCount: 0,
            accuracy: academicScore,
            speed: Math.round(Math.random() * 1500 + 400),
            score: academicScore,
            streak: Math.round(Math.random() * 4),
            meetingScore: academicScore
          }
        }));

        setPackets((prev) => [
          ...prev,
          {
            id: `vClient-con-${i}`,
            timestamp: generateFormattedTimestamp(),
            type: 'ACK',
            eventName: 'CLIENT_ESTABLISHED',
            sender: vName,
            receiver: 'Server_Socket',
            payload: `{"concurrency_index": ${i}, "multithread_safe": "Eventlet_Thread_Async"}`,
            checksum: 'CHECKSUM_AUTO',
            sequenceNum: 1000 + i
          }
        ]);
      }, i * (2000 / countCount)); // stagger generation over 2 seconds
    }
  };

  const handleSimulateSplitScreenFlow = () => {
    setClassCode('NET5000');
    setUsername('Rangga_Student');
    setUserRole('teacher'); // App default roles context
    setSplitScreenMode(true);

    // Bootstrap simulated students roster instantly for amazing playability!
    setStudents({
      'Rangga_Student': {
        id: 'mock-std-1',
        username: 'Rangga_Student',
        role: 'student',
        status: 'online',
        ping: 28,
        joinedAt: '09:30',
        reconnectCount: 0,
        accuracy: 90,
        speed: 1200,
        score: 90,
        streak: 2,
        meetingScore: 90
      },
      'Nabilah_Informatika': {
        id: 'mock-std-2',
        username: 'Nabilah_Informatika',
        role: 'student',
        status: 'online',
        ping: 45,
        joinedAt: '09:32',
        reconnectCount: 0,
        accuracy: 95,
        speed: 910,
        score: 95,
        streak: 3,
        meetingScore: 95
      },
      'Fadhil_Pratama': {
        id: 'mock-std-3',
        username: 'Fadhil_Pratama',
        role: 'student',
        status: 'online',
        ping: 15,
        joinedAt: '09:33',
        reconnectCount: 2,
        accuracy: 75,
        speed: 1800,
        score: 80,
        streak: 1,
        meetingScore: 80
      }
    });

    setProctorStatuses({
      'Rangga_Student': {
        studentId: 'mock-std-1',
        username: 'Rangga_Student',
        status: 'normal',
        isWebcamOn: true,
        isFaceDetected: true,
        isOutOfFrame: false,
        isGazeDeviation: false,
        isMultipleFaces: false,
        tabSwitchCount: 0,
        unfocusedSecs: 0,
        focusScore: 98,
        faceDetectionRate: 100,
        suspiciousScore: 5,
        warningCount: 0,
        scoreDeduction: 0,
        isFlaggedForReview: false,
        isInvalidated: false
      },
      'Nabilah_Informatika': {
        studentId: 'mock-std-2',
        username: 'Nabilah_Informatika',
        status: 'warning',
        isWebcamOn: true,
        isFaceDetected: true,
        isOutOfFrame: false,
        isGazeDeviation: true,
        isMultipleFaces: false,
        tabSwitchCount: 1,
        unfocusedSecs: 6,
        focusScore: 82,
        faceDetectionRate: 92,
        suspiciousScore: 32,
        warningCount: 1,
        scoreDeduction: 0,
        isFlaggedForReview: false,
        isInvalidated: false
      },
      'Fadhil_Pratama': {
        studentId: 'mock-std-3',
        username: 'Fadhil_Pratama',
        status: 'suspicious',
        isWebcamOn: false,
        isFaceDetected: false,
        isOutOfFrame: true,
        isGazeDeviation: false,
        isMultipleFaces: false,
        tabSwitchCount: 4,
        unfocusedSecs: 38,
        focusScore: 34,
        faceDetectionRate: 45,
        suspiciousScore: 84,
        warningCount: 2,
        scoreDeduction: 20,
        isFlaggedForReview: true,
        isInvalidated: false
      }
    });

    setProctorLogs([
      {
        id: 'log-1',
        studentId: 'mock-std-3',
        studentName: 'Fadhil_Pratama',
        timestamp: '09:40:15',
        violationType: 'WEB_TAB_SWITCHED',
        details: 'Pergantian tab browser terdeteksi (Pindah ke tab lain 4 kali).',
        warningCount: 1,
        meetingId: 'meet-net5000-1'
      },
      {
        id: 'log-2',
        studentId: 'mock-std-2',
        studentName: 'Nabilah_Informatika',
        timestamp: '09:41:22',
        violationType: 'EYE_GAZE_DEVIATION',
        details: 'Mata melihat di luar frame layar ujian terus menerus.',
        warningCount: 1,
        meetingId: 'meet-net5000-1'
      },
      {
        id: 'log-3',
        studentId: 'mock-std-3',
        studentName: 'Fadhil_Pratama',
        timestamp: '09:43:08',
        violationType: 'WEBCAM_TURNED_OFF',
        details: 'Aliran webcam dimatikan terdeteksi selama kuis berlangsung.',
        warningCount: 2,
        meetingId: 'meet-net5000-1'
      }
    ]);

    setMessages([
      {
        id: 'msg-init-1',
        timestamp: '09:35:10',
        senderId: 'Teacher',
        senderName: 'PakTeacher',
        role: 'teacher',
        text: 'Selamat pagi rekan-rekan Student Teknik Informatika! Hari ini kita praktikum Pemrograman Socket TCP.',
        isAnnouncement: true
      },
      {
        id: 'msg-init-2',
        timestamp: '09:36:12',
        senderId: 'mock-std-2',
        senderName: 'Nabilah_Informatika',
        role: 'student',
        text: 'Siap Pak! Kami sudah siap mempraktikkan PING/PONG pada terminal.',
        isAnnouncement: false
      }
    ]);
  };

  const handleExitToLobby = () => {
    setUserRole(null);
    setUsername('');
    setClassCode('');
    setStudents({});
    setMessages([]);
    setPackets([]);
    setActiveQuiz(null);
    setActiveMeeting(null);
  };

  // RENDERING DECISIONS: Landing page, Student View, or Teacher Dashboard
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Multi-tab single role flows
  if (userRole === 'teacher') {
    return (
      <>
        <TeacherDashboard
          classCode={classCode}
          username={username || 'PakTeacher'}
          onExit={handleExitToLobby}
          students={students}
          messages={messages}
          onBroadcastMessage={handleSendMessage}
          onSendReply={handleSendReply}
          packets={packets}
          clearPackets={() => setPackets([])}
          latencySlider={latencySlider}
          setLatencySlider={setLatencySlider}
          injectPacketError={injectPacketError}
          triggerLoadTesting={triggerLoadTesting}
          slides={slides}
          onSlidesChange={handleSlidesChange}
          currentSlideIndex={currentSlideIndex}
          onSlideIndexChange={handleSlideIndexChange}
          externalAnnotations={externalAnnotations}
          onDrawUpdate={handleDrawUpdate}
          activeQuiz={activeQuiz}
          onLaunchQuiz={handleLaunchQuiz}
          onEndQuiz={handleEndQuiz}
          quizSubmissions={quizSubmissions}
          sharedMaterials={sharedMaterials}
          onAddMaterial={handleAddMaterial}
          onRemoveMaterial={handleRemoveMaterial}
          notifications={notifications}
          proctorStatuses={proctorStatuses}
          proctorLogs={proctorLogs}
          onBroadcastPayload={createAndBroadcastPayload}
          activeMeeting={activeMeeting}
          setActiveMeeting={setActiveMeeting}
          meetings={meetings}
          setMeetings={setMeetings}
          calendarEvents={calendarEvents}
          setCalendarEvents={setCalendarEvents}
          assignments={assignments}
          setAssignments={setAssignments}
          submissions={submissions}
          setSubmissions={setSubmissions}
          attendanceRecords={attendanceRecords}
          setAttendanceRecords={setAttendanceRecords}
          sentReports={sentReports}
          setSentReports={setSentReports}
          attendanceCode={attendanceCode}
          setAttendanceCode={setAttendanceCode}
          isAttendanceOpen={isAttendanceOpen}
          setIsAttendanceOpen={setIsAttendanceOpen}
          broadcasts={broadcasts}
          setBroadcasts={setBroadcasts}
          questionBanks={questionBanks}
          setQuestionBanks={setQuestionBanks}
        />
        {classRecap && (
          <SessionRecapPopup
            recap={classRecap}
            onClose={() => setClassRecap(null)}
            userRole="teacher"
            username={username || 'PakTeacher'}
            quizSubmissions={quizSubmissions}
          />
        )}
      </>
    );
  }

  if (userRole === 'student') {
    return (
      <>
        <StudentView
          classCode={classCode}
          username={username}
          onExit={handleExitToLobby}
          students={students}
          messages={messages}
          onSendMessage={handleSendMessage}
          onSendReply={handleSendReply}
          packets={packets}
          slides={slides}
          currentSlideIndex={currentSlideIndex}
          externalAnnotations={externalAnnotations}
          activeQuiz={activeQuiz}
          onAnswerQuiz={handleAnswerQuiz}
          answeredQuizId={answeredQuizId}
          sharedMaterials={sharedMaterials}
          notifications={notifications}
          proctorStatuses={proctorStatuses}
          proctorLogs={proctorLogs}
          onBroadcastPayload={createAndBroadcastPayload}
          activeMeeting={activeMeeting}
          setActiveMeeting={setActiveMeeting}
          meetings={meetings}
          setMeetings={setMeetings}
          calendarEvents={calendarEvents}
          setCalendarEvents={setCalendarEvents}
          assignments={assignments}
          setAssignments={setAssignments}
          submissions={submissions}
          setSubmissions={setSubmissions}
          attendanceRecords={attendanceRecords}
          setAttendanceRecords={setAttendanceRecords}
          sentReports={sentReports}
          setSentReports={setSentReports}
          attendanceCode={attendanceCode}
          isAttendanceOpen={isAttendanceOpen}
          quizSubmissions={quizSubmissions}
          broadcasts={broadcasts}
          setBroadcasts={setBroadcasts}
          questionBanks={questionBanks}
          setQuestionBanks={setQuestionBanks}
        />
        {classRecap && (
          <SessionRecapPopup
            recap={classRecap}
            onClose={() => setClassRecap(null)}
            userRole="student"
            username={username}
            quizSubmissions={quizSubmissions}
          />
        )}
      </>
    );
  }

  // Default is Lobby Landing Area
  return (
    <LandingPage
      onJoin={handleJoinSession}
      onSimulateSplitScreen={handleSimulateSplitScreenFlow}
    />
  );
}
