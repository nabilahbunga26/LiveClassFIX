/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemNotification {
  id: string;
  message: string;
  timestamp: string;
  role: string | 'student' | 'teacher' | 'all';
  type: 'quiz' | 'assignment' | 'material' | 'general' | 'system';
}

export interface Participant {
  id: string;
  username: string;
  role: 'student' | 'teacher';
  status: 'online' | 'offline';
  ping: number; // millisecond latency
  joinedAt: string;
  reconnectCount: number;
  accuracy: number; // quiz correct rate %
  speed: number;    // average time to answer in ms
  score: number;    // 0-100 linear grading score
  streak: number;
  meetingScore: number; // score only in the current meeting (Live Class)
  correctAnswersCount?: number;
  totalAnswersCount?: number;
}

export interface Annotation {
  id: string;
  type: 'pen' | 'marker' | 'eraser';
  color: string;
  points: { x: number; y: number }[];
  size: number;
}

export interface Quiz {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'polling' | 'short-answer';
  question: string;
  options: string[];
  correctOptionIndex: number; // for polling, there is no correct answer
  correctAnswerText?: string;
  durationSeconds: number;
  isActive: boolean;
  explanation?: string;
}

export interface ChatMessage {
  id: string;
  timestamp: string;
  senderId: string;
  senderName: string;
  role: 'student' | 'teacher';
  text: string;
  isAnnouncement: boolean;
  recipientName?: string;
  replies?: {
    id: string;
    senderName: string;
    text: string;
    timestamp: string;
  }[];
}

export interface Material {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'ppt' | 'docx' | 'zip';
  uploadedAt: string;
  url: string;
}

export interface NetworkPacket {
  id: string;
  timestamp: string;
  type: 'SYN' | 'ACK' | 'PING' | 'PONG' | 'DATA' | 'ERROR' | 'RST' | 'FIN';
  eventName: string;
  sender: string;
  receiver: string;
  payload: string; // Serialized JSON
  checksum: string;
  sequenceNum: number;
}

export interface Slide {
  id: number;
  title: string;
  content: string;
  imageTheme: 'pink' | 'cyan' | 'neutral';
  bullets: string[];
  backgroundImageUrl?: string; // Optional field for uploaded PDF/Image Slide backgrounds
}

export interface CheatingLog {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  violationType: string;
  details: string;
  warningCount: number;
  meetingId?: string;
}

export interface ProctorStatus {
  studentId: string;
  username: string;
  status: 'normal' | 'warning' | 'suspicious';
  isWebcamOn: boolean;
  isFaceDetected: boolean;
  isOutOfFrame: boolean;
  isGazeDeviation: boolean;
  isMultipleFaces: boolean;
  tabSwitchCount: number;
  unfocusedSecs: number;
  focusScore: number;
  faceDetectionRate: number;
  suspiciousScore: number;
  warningCount: number;
  scoreDeduction: number;
  isFlaggedForReview: boolean;
  isInvalidated: boolean;
}

export interface SessionMeeting {
  id: string;
  number: number;
  topic: string;
  date: string;
  isStarted: boolean;
}

export interface Assignment {
  id: string;
  meetingId: string;
  title: string;
  description: string;
  fileName?: string;
  fileUrl?: string;
  dueDate: string;
  maxScore: number;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentName: string;
  fileName: string;
  fileSize: string;
  submittedAt: string;
  status: 'pending' | 'graded';
  score?: number;
  notes?: string;
  fileUrl?: string;
}

export interface AttendanceRecord {
  id: string;
  meetingId: string;
  studentName: string;
  timestamp: string;
  codeEntered: string;
  cameraVerified: boolean;
  photoUrl?: string;
  status: 'hadir' | 'absen';
}

export interface DailyReport {
  id: string;
  meetingId: string;
  meetingTopic: string;
  studentName: string;
  attendanceStatus: 'Hadir' | 'Absen';
  attendanceTime?: string;
  quizScore: number;
  quizStreak: number;
  proctorScore: number;
  assignmentStatus: 'Belum Mengumpulkan' | 'Sudah Mengumpulkan' | 'Sudah Dinilai';
  assignmentScore?: number;
  notes: string;
  sentAt: string;
}


