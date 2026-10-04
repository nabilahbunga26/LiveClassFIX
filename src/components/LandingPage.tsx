/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogIn, Laptop, Layers, Users, Key, Wifi, Cpu, Trash2, Plus, FileText, Shield, Zap, BookOpen, Award, Presentation, Tv, Clock, Play, School, GraduationCap, PlusCircle, Database } from 'lucide-react';
import LiveClassLogo from './LiveClassLogo';

interface LandingPageProps {
  onJoin: (code: string, username: string, role: 'student' | 'teacher') => void;
  onSimulateSplitScreen: () => void;
}

interface RegisteredUser {
  username: string;
  email?: string;
  password?: string;
  role: 'student' | 'teacher';
  fullName?: string;
  idNumber?: string;
}

interface TeacherClass {
  code: string;
  name: string;
  createdAt: string;
}

export default function LandingPage({ onJoin, onSimulateSplitScreen }: LandingPageProps) {
  const [classCode, setClassCode] = useState('');
  const [joinStudentId, setJoinStudentId] = useState('');
  const [username, setUsername] = useState('');
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Teacher simulated persistent database of classes
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>(() => {
    try {
      const saved = localStorage.getItem('liveclass-teacher-classes');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    const defaultClasses: TeacherClass[] = [];
    try {
      localStorage.setItem('liveclass-teacher-classes', JSON.stringify(defaultClasses));
    } catch {
      // ignore
    }
    return defaultClasses;
  });

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    title: string;
    onConfirm: () => void;
  } | null>(null);

  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [showAddClass, setShowAddClass] = useState(false);

  // Synchronize existing local storage class codes with the global server-side unique registry
  React.useEffect(() => {
    if (teacherClasses.length > 0) {
      const codes = teacherClasses.map(c => c.code);
      fetch('/api/classes/register-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes })
      }).catch(err => console.warn('Gagal sinkronisasi data kelas dengan server:', err));
    }
  }, [teacherClasses]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newClassName.trim();
    let code = newClassCode.trim().toUpperCase();

    if (!name) {
      setErrorText('Nama kelas wajib diisi!');
      return;
    }

    if (!code) {
      code = 'NET' + Math.floor(1000 + Math.random() * 9000);
    }

    // Check client-side list first (fast check)
    if (teacherClasses.some(c => c.code === code)) {
      setErrorText(`Kode Kelas "${code}" sudah terdaftar di database Anda!`);
      return;
    }

    // Server-side check for global uniqueness across all users/tabs/devices
    try {
      const checkRes = await fetch(`/api/classes/check-unique?code=${encodeURIComponent(code)}`);
      const checkData = await checkRes.json();
      if (!checkData.unique) {
        setErrorText(checkData.error || `Kode Kelas "${code}" sudah digunakan oleh teacher/user lain! Mohon gunakan kode kelas yang berbeda.`);
        return;
      }

      // Try to register the code on the server-side memory
      const regRes = await fetch('/api/classes/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const regData = await regRes.json();
      if (!regData.success) {
        setErrorText(regData.error || `Kode Kelas "${code}" gagal didaftarkan karena sudah diambil oleh teacher lain!`);
        return;
      }
    } catch (err) {
      console.warn('Gagal memvalidasi kode kelas secara online:', err);
      // Fallback: let creation proceed if server is offline/unreachable
    }

    const nClass: TeacherClass = {
      code,
      name,
      createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    };

    const updated = [...teacherClasses, nClass];
    setTeacherClasses(updated);
    try {
      localStorage.setItem('liveclass-teacher-classes', JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }

    setNewClassName('');
    setNewClassCode('');
    setShowAddClass(false);
    setErrorText(null);

    // Automatically join the newly created class
    onJoin(code, currentUser?.username || 'TEACHER_1', 'teacher');
  };

  const handleDeleteClass = (code: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const updated = teacherClasses.filter(c => c.code !== code);
    setTeacherClasses(updated);
    try {
      localStorage.setItem('liveclass-teacher-classes', JSON.stringify(updated));
    } catch (err) {
      console.warn(err);
    }
  };

  // Authenticated user state
  const [currentUser, setCurrentUser] = useState<RegisteredUser | null>(() => {
    try {
      const saved = localStorage.getItem('liveclass-current-user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Registered accounts state
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>(() => {
    try {
      const saved = localStorage.getItem('liveclass-registered-users');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    const defaultUsers: RegisteredUser[] = [];
    try {
      localStorage.setItem('liveclass-registered-users', JSON.stringify(defaultUsers));
    } catch {
      // ignore
    }
    return defaultUsers;
  });

  // Tabbed Sign-In & Sign-Up states
  const [activeModalTab, setActiveModalTab] = useState<'masuk' | 'daftar'>('masuk');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'student' | 'teacher'>('student');
  
  // Custom exact image matching states
  const [loginRole, setLoginRole] = useState<'student' | 'teacher'>('teacher');
  const [loginId, setLoginId] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [modalSuccessMessage, setModalSuccessMessage] = useState<string | null>(null);
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);

  const handleJoinSession = (e?: React.FormEvent, directCode?: string) => {
    if (e) e.preventDefault();
    const targetedCode = directCode || classCode;
    
    if (!currentUser) {
      setErrorText('Mohon Masuk (Sign In) atau Daftar terlebih dahulu di tombol kanan atas!');
      setShowSignInModal(true);
      return;
    }
    if (!targetedCode.trim()) {
      setErrorText('Class Code wajib diisi!');
      return;
    }

    const code = targetedCode.trim().toUpperCase();

    // Student Database validation
    if (currentUser.role === 'student') {
      let authStudents: { fullName: string; studentId: string }[] = [];
      try {
        const saved = localStorage.getItem('liveclass-auth-students-' + code);
        if (saved) {
          authStudents = JSON.parse(saved);
        }
      } catch (err) {}

      // Attempt to auto-match if clicked from list
      let inferredStudentId = joinStudentId.trim();
      if (!inferredStudentId || directCode) {
        // Try to check if we can skip input because they are already enrolled under their name
        // Or if they previously verified. We can match by fullName or username.
        const matchedByName = authStudents.find(s => 
          s.fullName.toLowerCase() === currentUser.fullName?.toLowerCase() || 
          s.fullName.toLowerCase() === currentUser.username.toLowerCase()
        );
        
        // Also check localStorage if they joined before.
        const previouslyJoined = localStorage.getItem(`liveclass-last-id-${currentUser.username}-${code}`);

        if (previouslyJoined && authStudents.some(s => s.studentId.toLowerCase() === previouslyJoined.toLowerCase())) {
          inferredStudentId = previouslyJoined;
        } else if (matchedByName) {
          inferredStudentId = matchedByName.studentId;
        }
      }

      if (!inferredStudentId) {
        setErrorText('Student ID wajib diisi untuk gabung kelas ini!');
        return;
      }

      const userIdNum = inferredStudentId.toLowerCase();

      const isFound = authStudents.some(s => {
        const idMatch = s.studentId && s.studentId.trim().toLowerCase() === userIdNum;
        return idMatch;
      });

      if (!isFound) {
        setErrorText(`DITOLAK: Student ID Anda (${inferredStudentId.toUpperCase()}) tidak terdaftar di Database Kelas "${code}". Pastikan Student ID sesuai.`);
        return;
      }
      
      // Save for future auto-join skips
      localStorage.setItem(`liveclass-last-id-${currentUser.username}-${code}`, inferredStudentId);
    }

    setErrorText(null);
    onJoin(code, currentUser.username, currentUser.role);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setModalErrorMessage(null);
    setModalSuccessMessage(null);

    const fName = regFullName.trim();
    const uName = regUsername.trim().toUpperCase();
    const uEmail = regEmail.trim().toLowerCase();
    const pWord = regPassword;

    if (!fName || !uName || !pWord || !uEmail) {
      setModalErrorMessage('Semua field wajib diisi (Nama, Username, Email, Password)!');
      return;
    }

    if (uName.length < 3) {
      setModalErrorMessage('Username minimal 3 karakter!');
      return;
    }

    // Check duplicate user or email
    const exists = registeredUsers.some(
      u => u.username?.toUpperCase() === uName.toUpperCase() || 
           (u.email && u.email.toLowerCase() === uEmail)
    );
    if (exists) {
      setModalErrorMessage(`Username atau Email ini sudah terdaftar di sistem!`);
      return;
    }

    const newUser: RegisteredUser = {
      username: uName,
      email: uEmail,
      fullName: fName,
      password: pWord,
      role: regRole
    };

    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);
    try {
      localStorage.setItem('liveclass-registered-users', JSON.stringify(updatedUsers));
    } catch (err) {
      console.warn(err);
    }

    setModalSuccessMessage(`✓ Akun "${fName}" (${regRole === 'teacher' ? 'Teacher' : 'Student'}) berhasil didaftarkan! Mengalihkan...`);
    
    // Autofill these values for seamless instant login!
    setLoginRole(regRole);
    setLoginUsername(uName);
    
    // Clear registration controls
    setRegUsername('');
    setRegEmail('');
    setRegFullName('');
    setRegPassword('');
    
    setTimeout(() => {
      setActiveModalTab('masuk');
      setModalSuccessMessage(null);
    }, 1500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setModalErrorMessage(null);
    setModalSuccessMessage(null);

    const lUsername = loginUsername.trim();
    const pWord = loginPassword;

    if (!lUsername || !pWord) {
      setModalErrorMessage('Username/Email dan Password Keamanan wajib diisi!');
      return;
    }

    // Matching logic (supports either username or email case-insensitive)
    const matchedUser = registeredUsers.find(
      u => (u.username?.toUpperCase() === lUsername.toUpperCase() || 
            (u.email && u.email.toLowerCase() === lUsername.toLowerCase())) && 
           u.password === pWord
    );

    if (!matchedUser) {
      setModalErrorMessage('Username/Email atau Password keamanan salah!');
      return;
    }

    // Success login
    setCurrentUser(matchedUser);
    try {
      localStorage.setItem('liveclass-current-user', JSON.stringify(matchedUser));
    } catch (err) {
      console.warn(err);
    }

    setUsername(matchedUser.username);

    setModalSuccessMessage(`✓ Berhasil Masuk sebagai ${matchedUser.fullName || matchedUser.username}!`);
    setTimeout(() => {
      setShowSignInModal(false);
      setModalSuccessMessage(null);
      setLoginId('');
      setLoginPassword('');
    }, 1200);
  };

  const handleLogOut = () => {
    setCurrentUser(null);
    setUsername('');
    try {
      localStorage.removeItem('liveclass-current-user');
    } catch (err) {
      console.warn(err);
    }
  };

  const handleRoleJoin = (role: 'student' | 'teacher') => {
    // Legacy support: auto login as mock preset user
    const defaultUsername = role === 'teacher' ? 'TEACHER_ADMIN' : 'STUDENT_1';
    const matchedUser = registeredUsers.find(u => u.username === defaultUsername) || {
      username: defaultUsername,
      role
    };

    setCurrentUser(matchedUser);
    try {
      localStorage.setItem('liveclass-current-user', JSON.stringify(matchedUser));
    } catch (err) {
      console.warn(err);
    }

    const code = classCode.trim() || 'INIT5000';
    onJoin(code, defaultUsername, role);
    setShowSignInModal(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-white text-[#111111] font-sans flex flex-col select-none">
      
      {/* Custom Delete Confirmation Modal */}
      {deleteDialog && deleteDialog.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(255,0,122,1)] max-w-sm w-full space-y-4">
            <h3 className="font-display font-black text-lg text-black uppercase tracking-tight border-b-2 border-black pb-2">
              ⚠️ Yakin menghapus {deleteDialog.title}?
            </h3>
            <p className="text-gray-700 font-bold text-sm leading-relaxed">
              Maka data akan hilang dari database dan tidak dapat dikembalikan.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDialog(null)}
                className="px-4 py-2 border-2 border-black bg-rose-600 hover:bg-rose-700 font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none transition-all uppercase text-xs cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="button"
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

      {/* Navigation Header */}
      <nav id="landing-navbar" className="h-[7vh] min-h-[50px] max-h-[64px] px-6 sm:px-10 flex items-center justify-between border-b-4 border-[#111111] bg-white shrink-0 z-20">
        <LiveClassLogo size="sm" variant="full" themeColor="pink" />
      </nav>

      <main className="h-[88vh] flex-grow flex flex-col lg:flex-row overflow-hidden min-h-0 shrink-0">
        {currentUser ? (
          /* WORKSPACE VIEW: When successfully logged in, they are not directed to split screen landing. */
          <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
            {/* Left Sidebar: Profile Summary & Quick Access */}
            <div className="w-full md:w-80 border-b-4 md:border-b-0 md:border-r-4 border-[#111111] bg-white p-6 overflow-y-auto shrink-0 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="border-4 border-black p-4 bg-[#00E5FF]/10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden rounded-lg">
                  <div className="absolute right-2 top-2 bg-black text-[#00E5FF] font-mono text-[8px] px-1.5 py-0.5 font-bold uppercase border border-black rounded">
                    TERKONEKSI
                  </div>
                  <span className="block text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest pl-0.5">
                    AKUN OTENTIKASI
                  </span>
                  <div className="flex items-center gap-3 mt-2">
                    <div className={`h-10 w-10 border-2 border-black rounded flex items-center justify-center font-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] ${currentUser.role === 'teacher' ? 'bg-[#FF007A] text-white' : 'bg-[#00E5FF] text-black'}`}>
                      {currentUser.role === 'teacher' ? <Presentation className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-sans font-black text-sm text-[#111111] tracking-tight truncate uppercase leading-none">{currentUser.fullName || currentUser.username}</p>
                      <span className="text-[8px] font-mono font-bold uppercase text-gray-400 block tracking-wider mt-1.5 leading-none">
                        {currentUser.role === 'teacher' ? 'TEACHER' : 'STUDENT'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-4 border-black p-4 bg-yellow-300/10 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-1.5 rounded-lg">
                  <h4 className="text-[10px] font-black uppercase text-black flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-[#FF007A]" />
                    <span>Integritas Terjamin</span>
                  </h4>
                  <p className="text-[9px] text-gray-550 font-bold leading-normal">
                    Workspace dilindungi enkripsi MD5 checksum integritas dan sistem anti-cheating pengawasan proctoring.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 hidden md:block">
                <button
                  type="button"
                  onClick={handleLogOut}
                  className="w-full py-2 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border-2 border-black font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all text-center cursor-pointer"
                >
                  LOGOUT AKUN
                </button>
              </div>
            </div>

            {/* Right Main Panel: Course Selection Grid */}
            <div className="flex-grow p-6 sm:p-8 overflow-y-auto flex flex-col space-y-6">
              {/* Title Header */}
              <div>
                <span className="text-[9px] font-mono font-black text-[#FF007A] uppercase tracking-widest bg-[#FF007A]/10 px-2 py-0.5 border border-[#FF007A]/20 rounded">
                  LOBBY UTAMA LIVECLASS
                </span>
                <h2 className="text-2xl font-black italic text-black font-display uppercase tracking-tight mt-1.5 leading-none">
                  WORKSPACE KELAS {currentUser.role === 'teacher' ? 'TEACHER' : 'STUDENT'}
                </h2>
                <p className="text-[11px] text-gray-500 font-bold mt-1">
                  {currentUser.role === 'teacher' 
                    ? 'Buat, hapus, atau kelola ruang kuliah interaktif Anda dari panel kontrol di bawah.'
                    : 'Masuk ke ruang kuliah interaktif aktif Teacher Anda dengan memasukan kode unik, atau pilih langsung dari list.'
                  }
                </p>
              </div>

              {currentUser.role === 'teacher' ? (
                /* TEACHER INTERACTION WORKSPACE with 3 COLUMNS GRID */
                <div className="space-y-6">
                  {/* Grid Layout: 3 Cards per Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* First Card: Always render a beautiful Neobrutalist Create Class Card */}
                    <div className="border-4 border-black p-5 bg-[#00E5FF]/5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative flex flex-col justify-between h-[210px] rounded-lg">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-mono font-black text-gray-400 uppercase tracking-widest">
                            FORM KELAS BARU
                          </span>
                          <PlusCircle className="h-4 w-4 text-[#FF007A]" />
                        </div>
                        <h3 className="text-xs font-black uppercase text-black leading-none mt-1">Buat Ruang Baru</h3>
                        
                        {/* Inline inputs */}
                        <div className="space-y-1.5 pt-1.5">
                          <input
                            type="text"
                            placeholder="NAMA KELAS (MISAL: SISTEM OPERASI)"
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            className="w-full px-2 py-1 border-2 border-black text-[9px] font-bold uppercase placeholder-gray-400 bg-white"
                          />
                          <input
                            type="text"
                            placeholder="KODE UNIK KELAS (MISAL: SISOP2026)"
                            value={newClassCode}
                            onChange={(e) => setNewClassCode(e.target.value.toUpperCase())}
                            maxLength={10}
                            className="w-full px-2 py-1 border-2 border-black text-[9px] font-mono font-bold uppercase placeholder-gray-400 bg-white"
                          />
                        </div>
                      </div>

                      {errorText && (
                        <p className="text-[8px] font-mono font-black text-[#FF007A] leading-tight truncate">
                          {errorText}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleCreateClass}
                        className="w-full py-1.5 bg-[#FF007A] text-white border-2 border-black font-black text-[10px] uppercase tracking-wide hover:bg-[#ff1f89] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-transform flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Simpan Sesi Kelas</span>
                      </button>
                    </div>

                    {/* Class List cards */}
                    {teacherClasses.map((cl) => (
                      <div
                        key={cl.code}
                        onClick={() => onJoin(cl.code, currentUser.username, 'teacher')}
                        className="border-4 border-black p-5 bg-white hover:bg-zinc-50 transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] relative flex flex-col justify-between h-[210px] group rounded-lg"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="bg-black text-[#00E5FF] font-mono font-black text-[9px] px-2 py-0.5 border border-black uppercase tracking-wider">
                              KODE: {cl.code}
                            </span>
                            <School className="h-4 w-4 text-[#00E5FF]" />
                          </div>
                          <h3 className="font-sans font-black text-md text-black uppercase leading-tight line-clamp-2 tracking-tight group-hover:text-[#FF007A] transition-colors">
                            {cl.name}
                          </h3>
                        </div>

                        <div className="border-t border-dashed border-gray-200 pt-2.5 flex justify-between items-center">
                          <div className="text-left font-mono text-[8px] text-gray-400 capitalize">
                            <span>Dibuat: {cl.createdAt}</span>
                            <span className="block mt-0.5 text-[#00E5FF] font-black uppercase">LIVECLASS INFRA OK</span>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialog({
                                  isOpen: true,
                                  title: `Kelas ${cl.name}`,
                                  onConfirm: () => handleDeleteClass(cl.code, null as any)
                                });
                              }}
                              className="h-9 w-9 rounded-lg border-2 border-black bg-white hover:bg-rose-50 text-rose-500 font-black flex items-center justify-center shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all text-center cursor-pointer"
                              title="Hapus Kelas"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onJoin(cl.code, currentUser.username, 'teacher')}
                              className="h-9 w-9 rounded-lg border-2 border-black bg-[#00E5FF] text-black hover:bg-[#FF007A] hover:text-white font-mono font-black flex items-center justify-center shadow-[2.5px_2.5px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all text-center cursor-pointer text-lg"
                              title="Buka Kelas Sekarang"
                            >
                              &gt;
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* If Classes are 0, explicitly show an indicator message */}
                  {teacherClasses.length === 0 && (
                    <div className="border-4 border-black border-dashed p-8 bg-zinc-50 border-gray-300 text-center space-y-2 rounded-xl">
                      <div className="flex justify-center pt-1 mb-1">
                        <School className="h-10 w-10 text-neutral-300" />
                      </div>
                      <p className="text-xs font-mono text-gray-500 uppercase tracking-wider font-bold">
                        BELUM ADA RUANG KELAS AKTIF (0 KELAS TERDAFTAR)
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold max-w-xs mx-auto leading-normal">
                        Mulai dengan mengisi formulir kelas di "Buat Ruang Baru" pada pojok grid di atas untuk membuat sesi instant.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* STUDENT INTERACTION WORKSPACE with simple Code Joiner and Available grid list */
                <div className="space-y-6">
                  {/* Enter Code Join Box */}
                  <form onSubmit={handleJoinSession} className="border-4 border-black p-5 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-md space-y-3 rounded-lg">
                    <div>
                      <label className="block text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest pl-0.5 mb-1">
                        STUDENT ID ANDA (NPM/NIP)
                      </label>
                      <input
                        type="text"
                        value={joinStudentId}
                        onChange={(e) => setJoinStudentId(e.target.value.toUpperCase())}
                        placeholder="CONTOH: STD001"
                        className="w-full h-11 px-3 text-sm font-black font-mono tracking-widest border-4 border-[#111111] focus:outline-none focus:ring-1 ring-[#FF007A] uppercase bg-white text-black leading-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest pl-0.5 mb-1">
                        KODE RUANG KELAS (MASUKKAN KODE KELAS TEACHER)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={10}
                          value={classCode}
                          onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                          placeholder="CONTOH: NET5000"
                          className="flex-grow h-11 px-3 text-sm font-black font-mono tracking-widest border-4 border-[#111111] focus:outline-none focus:ring-1 ring-[#FF007A] uppercase bg-white text-black text-center leading-none"
                        />
                        <button
                          type="submit"
                          className="px-4 bg-[#FF007A] text-white border-4 border-[#111111] hover:bg-[#ff1f89] transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 font-sans font-black text-xs uppercase cursor-pointer"
                        >
                          GABUNG KELAS
                        </button>
                      </div>
                    </div>
                    {errorText && (
                      <p className="border-2 border-[#FF007A] bg-rose-50 text-[#FF007A] font-mono text-[9px] font-bold uppercase p-2 text-center rounded">
                        ERROR: {errorText}
                      </p>
                    )}
                  </form>

                  {/* List of Available classes in DB for one-click entry */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-mono font-black text-gray-450 uppercase tracking-widest pb-1 pl-0.5 border-b border-gray-200">
                      KELAS YANG TERSEDIA DI SISTEM ({teacherClasses.length})
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {teacherClasses.map((cl) => (
                        <div
                          key={cl.code}
                          onClick={() => {
                            setClassCode(cl.code);
                            // Validate with handleJoinSession to ensure check
                            setTimeout(() => handleJoinSession(undefined, cl.code), 50);
                          }}
                          className="border-4 border-black p-5 bg-white hover:bg-[#00E5FF]/5 transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] flex flex-col justify-between h-[150px] group rounded-lg"
                        >
                          <div>
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="bg-black text-[#00E5FF] font-mono font-black text-[9px] px-1.5 py-0.5 border border-black uppercase">
                                KODE: {cl.code}
                              </span>
                              <School className="h-4 w-4 text-[#00E5FF]" />
                            </div>
                            <h3 className="font-sans font-black text-sm text-black uppercase leading-tight line-clamp-2 tracking-tight group-hover:text-[#FF007A] transition-colors">
                              {cl.name}
                            </h3>
                          </div>

                          <div className="border-t border-dashed border-gray-100 pt-2.5 flex justify-between items-center">
                            <span className="font-mono text-[8px] text-gray-400">Klik &gt; untuk gabung langsung</span>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-lg border-2 border-black bg-[#FF007A] text-white hover:bg-black hover:text-[#00E5FF] font-mono font-black flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] text-lg"
                            >
                              &gt;
                            </button>
                          </div>
                        </div>
                      ))}

                      {teacherClasses.length === 0 && (
                        <p className="text-[11px] text-gray-500 italic py-2 font-mono col-span-3">
                          Belum ada kelas yang didaftarkan di sistem oleh Teacher. Hubungi teacher pengampu Anda untuk kode kelas.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STANDARD LANDING COMPONENT VIEW IN TWO COLUMNS (When guest/not logged in yet) */
          <>
            {/* Left Section: Main Interaction Form */}
            <div className="w-full lg:w-[50%] flex flex-col items-center justify-center p-4 xl:p-8 border-b-4 lg:border-b-0 lg:border-r-4 border-[#111111] relative bg-white overflow-y-auto lg:overflow-hidden h-full shrink-0">
              
              <div className="z-10 w-full max-w-sm space-y-4 my-auto">
                {/* Title Block - Highly Compact */}
                <div className="text-left space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-black italic tracking-tighter leading-none text-[#111111] font-display uppercase">
                    JOIN <span className="text-[#FF007A]">LIVECLASS NOW!</span>
                  </h1>
                  <p className="text-[11px] font-bold text-gray-500 max-w-xs leading-normal">
                    Siap belajar lebih interaktif? Gabung ke ruang kelas virtual dan nikmati pembelajaran seru secara real-time.
                  </p>
                </div>

                {/* Unauthenticated Form Component */}
                <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative rounded-xl w-full max-w-[360px] mx-auto select-none mt-2">
                  {/* TOP OVERLAPPING PILL BADGE */}
                  <div className="absolute -top-[12px] right-6 px-3 py-0.5 bg-[#00E5FF] text-black font-mono text-[9px] font-extrabold uppercase border-2 border-black rounded-lg tracking-wider shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    INTEGRITY GUARDED
                  </div>

                  {/* ROLE CHOOSER TAB AT THE TOP */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeModalTab === 'masuk') {
                          setLoginRole('teacher');
                        } else {
                          setRegRole('teacher');
                        }
                        setModalErrorMessage(null);
                        setModalSuccessMessage(null);
                      }}
                      className={`py-2 px-1.5 border-2 border-black rounded-lg text-[9px] font-extrabold uppercase transition-all flex flex-col items-center justify-center cursor-pointer ${
                        (activeModalTab === 'masuk' ? loginRole === 'teacher' : regRole === 'teacher')
                          ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-black'
                          : 'bg-white text-gray-800 hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      <Presentation className="h-4 w-4 text-amber-400" />
                      <span className="text-[10px] font-sans block text-center leading-none mt-1 font-bold">TEACHER</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeModalTab === 'masuk') {
                          setLoginRole('student');
                        } else {
                          setRegRole('student');
                        }
                        setModalErrorMessage(null);
                        setModalSuccessMessage(null);
                      }}
                      className={`py-2 px-1.5 border-2 border-black rounded-lg text-[9px] font-extrabold uppercase transition-all flex flex-col items-center justify-center cursor-pointer ${
                        (activeModalTab === 'masuk' ? loginRole === 'student' : regRole === 'student')
                          ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-black'
                          : 'bg-white text-gray-800 hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      <GraduationCap className="h-4 w-4 text-[#00E5FF]" />
                      <span className="text-[10px] font-sans block text-center leading-none mt-1 font-bold">STUDENT</span>
                    </button>
                  </div>

                  {/* DOTTED LINE */}
                  <div className="border-t-2 border-dashed border-gray-300 my-2" />

                  {/* Message alerts */}
                  {modalSuccessMessage && (
                    <div className="p-2 mb-2 bg-emerald-50 text-emerald-800 border-2 border-emerald-300 font-mono text-[9px] font-bold uppercase text-center rounded">
                      {modalSuccessMessage}
                    </div>
                  )}
                  {modalErrorMessage && (
                    <div className="p-2 mb-2 bg-rose-50 text-red-650 border border-rose-300 font-mono text-[9px] font-bold uppercase text-center rounded">
                      {modalErrorMessage}
                    </div>
                  )}

                  {activeModalTab === 'masuk' ? (
                    /* MASUK / SIGN-IN FORM COMPONENT */
                    <form onSubmit={handleLogin} className="space-y-2.5">
                      <h2 className="text-center font-sans font-black text-[15px] tracking-tight text-black uppercase">
                        MASUK KE LIVECLASS
                      </h2>

                      <div className="space-y-2 select-none text-left font-mono">
                        <div>
                          <label className="block text-[8px] font-mono font-bold text-gray-405 uppercase tracking-widest mb-0.5">
                            USERNAME / EMAIL
                          </label>
                          <input
                            type="text"
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            placeholder={loginRole === 'teacher' ? 'Contoh: TEACHER_ADMIN atau teacher@email.com' : 'Contoh: RANGGA atau rangga@email.com'}
                            className="w-full px-3 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-[#FF007A] text-[#111111]"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[8px] font-mono font-bold text-gray-550 uppercase tracking-widest mb-0.5">
                            PASSWORD KEAMANAN
                          </label>
                          <input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••"
                            className="w-full px-3 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-[#FF007A] text-[#111111]"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#FF007A] text-white font-black uppercase tracking-wider text-xs border-2 border-black rounded-lg hover:bg-[#ff1f89] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 mt-2 transition-transform cursor-pointer"
                      >
                        LOGIN KELAS INTERAKTIF
                      </button>

                      {/* DOTTED LINE */}
                      <div className="border-t-2 border-dashed border-gray-300 my-2" />

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModalTab('daftar');
                            setModalErrorMessage(null);
                            setModalSuccessMessage(null);
                            setRegRole(loginRole);
                          }}
                          className="text-[9px] font-extrabold text-[#111111] hover:text-[#FF007A] font-sans uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          BELUM TERDAFTAR? HUBUNGKAN AKUN BARU
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* DAFTAR / SIGN-UP FORM COMPONENT */
                    <form onSubmit={handleRegister} className="space-y-1.5 animate-fade-in">
                      <h2 className="text-center font-sans font-black text-[13px] tracking-tight text-black uppercase">
                        DAFTAR USER BARU: {(regRole || 'student').toUpperCase()}
                      </h2>

                      <div className="space-y-1.5 select-none text-left">
                        <div>
                          <label className="block text-[7.5px] font-mono font-bold text-gray-550 uppercase tracking-widest mb-0.5 pl-1">
                            NAMA LENGKAP
                          </label>
                          <input
                            type="text"
                            value={regFullName}
                            onChange={(e) => setRegFullName(e.target.value)}
                            placeholder="CONTOH: BUDI UTOMO"
                            className="w-full px-2 py-1 bg-white border-2 border-black rounded-lg text-[11px] font-sans uppercase font-bold outline-none focus:ring-1 focus:ring-[#FF007A] text-[#111111]"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 font-mono">
                          <div>
                            <label className="block text-[7.5px] font-mono font-bold text-gray-550 uppercase tracking-widest mb-0.5 pl-1">
                              USERNAME
                            </label>
                            <input
                              type="text"
                              value={regUsername}
                              onChange={(e) => setRegUsername(e.target.value)}
                              placeholder="BUDI"
                              className="w-full px-2 py-1 bg-white border-2 border-black rounded-lg text-[11px] font-mono font-bold outline-none focus:ring-1 focus:ring-[#FF007A] text-[#111111]"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[7.5px] font-mono font-bold text-gray-550 uppercase tracking-widest mb-0.5 pl-1">
                              EMAIL
                            </label>
                            <input
                              type="email"
                              value={regEmail}
                              onChange={(e) => setRegEmail(e.target.value)}
                              placeholder="budi@email.com"
                              className="w-full px-2 py-1 bg-white border-2 border-black rounded-lg text-[11px] font-mono font-bold outline-none focus:ring-1 focus:ring-[#FF007A] text-[#111111]"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[7.5px] font-mono font-bold text-gray-550 uppercase tracking-widest mb-0.5 pl-1">
                            PASSWORD KEAMANAN
                          </label>
                          <input
                            type="password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="••••••"
                            className="w-full px-2 py-1 bg-white border-2 border-black rounded-lg text-[11px] font-sans font-bold outline-none focus:ring-1 focus:ring-[#FF007A] text-[#111111]"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-[#FF007A] text-white font-black uppercase tracking-wider text-[11px] border-2 border-black rounded-lg hover:bg-[#ff1f89] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 mt-2 transition-transform cursor-pointer"
                      >
                        DAFTAR KELAS INTERAKTIF
                      </button>

                      {/* DOTTED LINE */}
                      <div className="border-t-2 border-dashed border-gray-300 my-1.5" />

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModalTab('masuk');
                            setModalErrorMessage(null);
                            setModalSuccessMessage(null);
                          }}
                          className="text-[9px] font-extrabold text-[#111111] hover:text-[#00E5FF] font-sans uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          SUDAH TERDAFTAR? MASUK KE LIVECLASS
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section: Core Pillars / Clean Bullet Listing of Features */}
            <div className="w-full lg:w-[50%] bg-[#fafafa] flex flex-col p-4 xl:p-8 border-t-4 lg:border-t-0 border-[#111111] overflow-y-auto h-full shrink-0">
              <div className="text-right w-full mb-auto pb-4">
                <h2 className="font-display font-black text-xl lg:text-3xl tracking-tight leading-tight pt-2 pr-2">
                  <span className="text-black">Interaktif</span>{' '}
                  <span className="text-[#00E5FF]">Selalu,</span>{' '}
                  <span className="text-[#FF007A]">Belajar</span>{' '}
                  <span className="text-black">Jadi</span>{' '}
                  <span className="text-[#00E5FF]">Lebih</span>{' '}
                  <span className="text-[#FF007A]">Seru!</span>
                </h2>
              </div>

              <div className="space-y-3 select-none my-auto">
                <div className="flex items-center gap-2 border-b-2 border-black pb-1 mb-2">
                  <Laptop className="h-4 w-4 text-[#FF007A]" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#FF007A]">
                    SISTEM KELAS TERINTEGRASI
                  </h3>
                </div>
                
                {/* Direct dense listings designed to prevent scrolling overflow on normal templates */}
                                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-white border-2 border-black p-2 flex gap-3 items-start shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                    <div className="bg-[#00E5FF] border border-black p-1 shrink-0 text-black">
                      <Presentation className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-black leading-none mb-0.5">Interactive Whiteboard &amp; PDF Sync</h4>
                      <p className="text-[9px] text-gray-500 font-bold leading-normal">
                        Teacher mengunggah materi slide PDF dan menggambar coretan whiteboard secara real-time yang langsung terproyeksi sinkron untuk seluruh student.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-black p-2 flex gap-3 items-start shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                    <div className="bg-[#FF007A] border border-black p-1 shrink-0 text-white">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-black leading-none mb-0.5">Kuis Live &amp; Papan Peringkat (Leaderboard)</h4>
                      <p className="text-[9px] text-gray-500 font-bold leading-normal">
                        Kuis on-the-fly interaktif dengan sistem skor otomatis, streak keaktifan, dan papan peringkat semester kumulatif student.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-black p-2 flex gap-3 items-start shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                    <div className="bg-yellow-400 border border-black p-1 shrink-0 text-black">
                      <Shield className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-black leading-none mb-0.5">Sistem Pengawasan Proctoring AI (Anti-Cheat)</h4>
                      <p className="text-[9px] text-gray-500 font-bold leading-normal">
                        Pengawasan webcam cerdas dan pelacakan interaksi luar tab (blur tracker) secara otomatis mencatat riwayat pelanggaran student.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-black p-2 flex gap-3 items-start shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                    <div className="bg-emerald-400 border border-black p-1 shrink-0 text-black">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-black leading-none mb-0.5">Sistem Kelas Terintegrasi</h4>
                      <p className="text-[9px] text-gray-500 font-bold leading-normal">
                        Upload pengumuman, tugas, materi belajar, kelola anggota kelas, kalender akademik, dan bank soal terintegrasi.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-black p-2 flex gap-3 items-start shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                    <div className="bg-[#00E5FF] border border-black p-1 shrink-0 text-black">
                      <Award className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-black leading-none mb-0.5">Daily Progress &amp; Catatan Perkembangan Teacher</h4>
                      <p className="text-[9px] text-gray-500 font-bold leading-normal">
                        Teacher mengirimkan laporan perkembangan serta feedback spesifik per sesi langsung ke penel historis masing-masing student secara privat.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="h-[5vh] min-h-[30px] max-h-[48px] bg-[#111111] text-white px-6 sm:px-10 flex items-center justify-between text-[9px] font-mono shrink-0">
        <div>
          <span className="opacity-75">LIVECLASS PORTAL PEMBELAJARAN INTERAKTIF</span>
        </div>
        <div className="flex gap-4">
          <span className="opacity-50 hidden md:inline">COPYRIGHT &copy; 2026 LIVECLASS</span>
        </div>
      </footer>

      {/* Profile Modal - Specifically for already authenticated users */}
      {showSignInModal && currentUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border-4 border-[#111111] p-5 max-w-sm w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative rounded-xl">
            {/* Header with Close */}
            <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-3">
              <h3 className="font-sans font-black text-sm text-[#111111] uppercase tracking-wide">
                INFORMASI PROFILE USER
              </h3>
              <button 
                type="button"
                onClick={() => setShowSignInModal(false)}
                className="font-mono font-black text-sm text-rose-500 hover:text-rose-600 px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 border-2 border-black bg-[#00E5FF]/5 space-y-1.5 rounded-lg text-left">
                <p className="text-[9px] font-mono font-black uppercase text-gray-500">DETAIL AKUN SINKRON</p>
                <div className="text-xs font-mono space-y-1">
                  <div className="flex justify-between border-b border-black/10 pb-1">
                    <span className="font-bold">NAMA:</span>
                    <span className="font-black text-right uppercase">{currentUser.fullName || currentUser.username}</span>
                  </div>
                  <div className="flex justify-between border-b border-black/10 pb-1">
                    <span className="font-bold">ROLE:</span>
                    <span className="font-black text-right text-[#FF007A] uppercase">{currentUser.role === 'teacher' ? 'TEACHER' : 'STUDENT'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleLogOut();
                    setShowSignInModal(false);
                  }}
                  className="flex-1 py-1.5 bg-[#FF007A] hover:bg-[#ff1f89] text-white font-black text-xs uppercase tracking-wide border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  Log Out
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignInModal(false)}
                  className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-black font-black text-xs uppercase border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
