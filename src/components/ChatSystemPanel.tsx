import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, User, Bot, Users, Smile, ShieldAlert, Image as ImageIcon, Trash2, MessageSquare } from "lucide-react";
import { ChatMessage, Participant } from "../types";

interface ChatSystemPanelProps {
  activeTab: "group" | "private" | "ai";
  setActiveTab: (val: "group" | "private" | "ai") => void;
  currentUser: { username: string; role: "student" | "teacher" };
  activeStudents: Record<string, Participant>;
  messages: ChatMessage[];
  onSendMessage: (text: string, isAnnouncement: boolean, recipientName?: string) => void;
}

export default function ChatSystemPanel({
  activeTab,
  setActiveTab,
  currentUser,
  activeStudents,
  messages,
  onSendMessage,
}: ChatSystemPanelProps) {
  const [systemAlert, setSystemAlert] = useState<{ message: string, type: 'error' | 'success' | 'info' } | null>(null);
  const [groupInput, setGroupInput] = useState("");
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  // Group handling
  const groupMessages = messages.filter((m) => {
    if (m.recipientName) return false;
    const isAnn = m.isAnnouncement || (m.text && (
      m.text.includes('[BROADCAST') ||
      m.text.includes('[INFORMASI') ||
      m.text.includes('[INFO TUGAS]') ||
      m.text.includes('[NILAI TUGAS]') ||
      m.text.includes('[PRESENSI') ||
      m.text.includes('[PENGUMUMAN]') ||
      m.text.startsWith('PENGUMUMAN')
    ));
    return !isAnn;
  });
  const handleSendGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupInput.trim()) return;
    onSendMessage(groupInput.trim(), isAnnouncement);
    setGroupInput("");
    setIsAnnouncement(false);
  };

  // Private handling
  const [privateInput, setPrivateInput] = useState("");
  
  const teacherUsername = Object.values(activeStudents).find(p => p.role === 'teacher')?.username || "Teacher";
  const [selectedRecipient, setSelectedRecipient] = useState<string>(teacherUsername);
  
  const privateMessages = messages.filter(
    (m) =>
      !m.isAnnouncement &&
      m.recipientName !== 'all' &&
      m.recipientName !== 'student' &&
      m.recipientName !== 'teacher' &&
      m.recipientName !== 'all_members' &&
      m.recipientName !== 'ALL' &&
      m.recipientName !== 'STUDENT' &&
      m.recipientName !== 'TEACHER' &&
      !m.text.includes('[BROADCAST') &&
      !m.text.includes('[INFORMASI') &&
      !m.text.includes('[INFO TUGAS]') &&
      !m.text.includes('[NILAI TUGAS]') &&
      !m.text.includes('[PRESENSI') &&
      !m.text.includes('[PENGUMUMAN]') &&
      !m.text.startsWith('PENGUMUMAN') &&
      (m.recipientName === currentUser.username ||
       m.senderName === currentUser.username)
  ).filter(m => m.recipientName);

  const contactList = Array.from(
    new Set([
      teacherUsername,
      ...Object.keys(activeStudents).filter((s) => s !== currentUser.username),
      ...privateMessages.map((m) => m.senderName),
      ...privateMessages.map((m) => m.recipientName!),
    ])
  ).filter((n) => 
    n !== currentUser.username && 
    n !== "Teacher_Presenter" && 
    n !== "Teacher_Socket" && 
    n !== "Teacher" &&
    n !== "teacher" &&
    n !== "student" &&
    n !== "all" &&
    n !== "all_members" &&
    n !== "ALL" &&
    n !== "STUDENT" &&
    n !== "TEACHER"
  );

  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const filteredContactList = contactList.filter(c => c.toLowerCase().includes(contactSearchQuery.toLowerCase()));

  const currentPrivateMessages = privateMessages.filter(
    (m) =>
      (m.senderName === currentUser.username && m.recipientName === selectedRecipient) ||
      (m.senderName === selectedRecipient && m.recipientName === currentUser.username)
  );

  const handleSendPrivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateInput.trim() || !selectedRecipient) return;
    onSendMessage(privateInput.trim(), false, selectedRecipient);
    setPrivateInput("");
  };

  // AI chat handling
  const [aiInput, setAiInput] = useState("");
  const [aiImageBase64, setAiImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiChatHistory, setAiChatHistory] = useState<{ sender: string; text: string, image?: string }[]>([
    { sender: "AI Assistant", text: "Halo! Saya Asisten LiveClass. Berikan pertanyaan Anda mengenai cara menggunakan fitur, chat, dashboard, kuis, atau presensi di aplikasi ini. Anda juga bisa menempelkan (Paste) screenshot layar dari Clipboard." }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Handle Paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeTab !== "ai") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf("image") === 0) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => setAiImageBase64(reader.result as string);
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeTab]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setSystemAlert({ message: "Harap unggah berkas gambar yang valid.", type: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setAiImageBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSendAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!aiInput.trim() && !aiImageBase64) || isAiLoading) return;
    
    const userMsg = aiInput.trim();
    const attachedImage = aiImageBase64;

    setAiInput("");
    setAiImageBase64(null);
    if(fileInputRef.current) fileInputRef.current.value = "";

    setAiChatHistory((prev) => [...prev, { sender: "Anda", text: userMsg, image: attachedImage || undefined }]);
    setIsAiLoading(true);

    try {
      const res = await fetch("/api/ai/liveclass-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-gemini-api-key": localStorage.getItem("user-gemini-api-key") || "" },
        body: JSON.stringify({ message: userMsg, chatHistory: aiChatHistory, imageBase64: attachedImage }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setAiChatHistory((prev) => [...prev, { sender: "AI Assistant", text: data.reply }]);
      } else {
        setAiChatHistory((prev) => [...prev, { sender: "AI Assistant", text: "Maaf, fitur AI sedang tidak tersedia (Error)." }]);
      }
    } catch {
      setAiChatHistory((prev) => [...prev, { sender: "AI Assistant", text: "Maaf, gagal menghubungi server AI." }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const groupScrollRef = useRef<HTMLDivElement>(null);
  const privateScrollRef = useRef<HTMLDivElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "group" && groupScrollRef.current) {
      groupScrollRef.current.scrollTop = groupScrollRef.current.scrollHeight;
    }
  }, [groupMessages.length, activeTab]);

  useEffect(() => {
    if (activeTab === "private" && privateScrollRef.current) {
      privateScrollRef.current.scrollTop = privateScrollRef.current.scrollHeight;
    }
  }, [currentPrivateMessages.length, activeTab, selectedRecipient]);

  useEffect(() => {
    if (activeTab === "ai" && aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiChatHistory.length, isAiLoading, activeTab]);

  return (
    <div className="bg-white border-4 border-black w-full h-[85vh] lg:h-full flex flex-col md:flex-row shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[#111111]">
      
      {/* Dynamic Main Content */}
      <div className="flex-1 flex flex-col min-h-0 h-full bg-white">
        {activeTab === "group" && (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b-2 border-black bg-white flex justify-between items-center shadow-sm shrink-0">
              <span className="font-display font-black text-xs uppercase tracking-widest text-[#FF007A] flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-[#FF007A]" /> GLOBAL_CLASSROOM
              </span>
            </div>
            <div ref={groupScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
              {groupMessages.length === 0 ? (
                 <p className="text-center text-xs font-mono font-bold text-gray-400 mt-10 uppercase">Belum ada percakapan grup.</p>
              ) : (
                groupMessages.map((msg) => {
                  const isMe = msg.senderName === currentUser.username;
                  const isSystemAnnoun = msg.isAnnouncement;
                  return (
                    <div key={msg.id} className={`p-3 text-xs max-w-[85%] relative border-2 border-black ${isSystemAnnoun ? 'bg-rose-100 w-full mx-auto text-center' : (isMe ? 'bg-white ml-auto shadow-[2px_2px_0px_0px_rgba(0,229,255,1)]' : 'bg-white mr-auto shadow-[2px_2px_0px_0px_rgba(255,0,122,1)]')}`}>
                      {isSystemAnnoun && <div className="text-[9px] font-black text-[#FF007A] uppercase mb-1 flex items-center justify-center gap-1"><ShieldAlert className="w-3 h-3"/>Announcement</div>}
                      <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 font-bold mb-1 uppercase">
                        <span>{msg.senderName} {isMe && '(Anda)'}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p className="font-medium mt-0.5 whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-3 bg-gray-50 border-t-4 border-black shrink-0">
              <form onSubmit={handleSendGroup} className="flex flex-col gap-2">
                {currentUser.role === 'teacher' && (
                   <label className="flex items-center text-[9px] font-black text-[#FF007A] uppercase cursor-pointer w-fit">
                     <input type="checkbox" checked={isAnnouncement} onChange={e=>setIsAnnouncement(e.target.checked)} className="mr-1.5 border-black border-2 cursor-pointer accent-[#FF007A] w-3 h-3"/>
                     Kirim sebagai Pengumuman
                   </label>
                )}
                <div className="flex gap-2">
                  <input autoFocus value={groupInput} onChange={e=>setGroupInput(e.target.value)} type="text" placeholder="Ketik pesan untuk semua orang..." className="flex-1 border-2 border-black p-2 text-xs font-bold outline-none focus:bg-yellow-50" />
                  <button type="submit" className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-gray-800 font-bold shadow-[2px_2px_0px_0px_rgba(0,229,255,1)] active:translate-x-px active:translate-y-px active:shadow-none"><Send className="w-4 h-4"/></button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "private" && (
          <div className="flex bg-white h-full overflow-hidden">
             {/* Contact List Sidebar (Sub-navigation) */}
             <div className="w-[120px] sm:w-[150px] border-r-2 border-black flex flex-col bg-gray-50 shrink-0">
                <div className="p-2 border-b-2 border-black bg-white object-cover">
                   <span className="text-[9px] font-black uppercase tracking-wider text-[#008ba3] px-1 block mb-2">Kontak Tersedia</span>
                   <input
                     type="text"
                     placeholder="Cari..."
                     value={contactSearchQuery}
                     onChange={(e) => setContactSearchQuery(e.target.value)}
                     className="w-full border-2 border-black p-1 text-[10px] font-bold outline-none focus:bg-yellow-50"
                   />
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredContactList.map((contact) => (
                    <button
                      key={contact}
                      onClick={() => setSelectedRecipient(contact)}
                      className={`w-full text-left p-3 border-b-2 border-black text-xs font-bold uppercase transition-colors ${selectedRecipient === contact ? 'bg-[#00E5FF] text-black shadow-inner border-l-[6px] border-l-black' : 'hover:bg-gray-200 border-l-[6px] border-l-transparent'}`}
                    >
                      @{contact}
                    </button>
                  ))}
                  {filteredContactList.length === 0 && <p className="text-[9px] p-4 text-center text-gray-400 font-mono italic">Belum ada kontak.</p>}
                </div>
             </div>
             
             {/* Chat Conversation Area */}
             <div className="flex-1 flex flex-col relative h-full min-w-0">
               {!selectedRecipient ? (
                   <div className="flex-1 flex items-center justify-center bg-gray-50"><p className="text-xs uppercase font-bold text-gray-400 font-mono text-center">Pilih kontak untuk mulai ngobrol</p></div>
               ) : (
                  <>
                    <div className="p-3 border-b-2 border-black bg-white shadow-sm flex items-center shrink-0">
                      <span className="font-display font-black text-xs uppercase tracking-widest text-[#008ba3] flex items-center gap-1.5">
                         <MessageSquare className="h-4 w-4 text-[#008ba3]" /> PRIVATE @{selectedRecipient}
                       </span>
                    </div>
                    <div ref={privateScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                      {currentPrivateMessages.length === 0 ? (
                         <p className="text-center text-[10px] font-mono font-bold text-gray-400 mt-10 uppercase italic">Kirim pesan pertama ke {selectedRecipient}!</p>
                      ) : (
                        currentPrivateMessages.map((msg) => {
                          const isMe = msg.senderName === currentUser.username;
                          return (
                            <div key={msg.id} className={`p-3 text-xs max-w-[85%] relative border-2 border-black ${isMe ? 'bg-white ml-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-gray-100 mr-auto shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}>
                              <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 font-bold mb-1 uppercase">
                                <span>{msg.senderName} {isMe && '(Anda)'}</span>
                                <span>{msg.timestamp}</span>
                              </div>
                              <p className="font-medium mt-0.5 whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          );
                        })
                      )}

                    </div>
                    <div className="p-3 bg-gray-50 border-t-4 border-black shrink-0 w-full">
                      <form onSubmit={handleSendPrivate} className="flex gap-2 w-full">
                        <input autoFocus value={privateInput} onChange={e=>setPrivateInput(e.target.value)} type="text" placeholder={`Pesan pribadi ke @${selectedRecipient}...`} className="flex-1 border-2 border-black p-2 text-xs font-bold outline-none focus:bg-yellow-50 min-w-0" />
                        <button type="submit" className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-gray-800 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none shrink-0"><Send className="w-4 h-4"/></button>
                      </form>
                    </div>
                  </>
               )}
             </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="flex flex-col h-full bg-white">
            <div className="p-3 border-b-2 border-black bg-[#111111] flex justify-between items-center shadow-sm shrink-0">
              <span className="font-display font-black text-xs uppercase tracking-widest text-[#00E5FF] flex items-center gap-2"><Bot className="w-4 h-4"/> AI Features Support</span>
            </div>
            <div ref={aiScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {aiChatHistory.map((msg, idx) => {
                const isMe = msg.sender === "Anda";
                return (
                  <div key={idx} className={`p-4 text-xs max-w-[85%] relative border-2 border-black ${isMe ? 'bg-white ml-auto shadow-[4px_4px_0px_0px_rgba(0,229,255,1)]' : 'bg-white mr-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                    <div className={`text-[10px] font-black mb-2 uppercase ${isMe ? 'text-[#00E5FF]' : 'text-black'}`}>
                      {msg.sender}
                    </div>
                    {msg.image && (
                      <div className="mb-2">
                        <img src={msg.image} alt="User submission" className="w-auto max-w-[200px] h-auto border-2 border-black object-contain"/>
                      </div>
                    )}
                    <div className="font-medium leading-relaxed whitespace-pre-wrap"><span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\ng/g, '<br/>') }} /></div>
                  </div>
                );
              })}
              {isAiLoading && (
                <div className="p-4 text-xs max-w-[85%] w-fit bg-white border-2 border-black border-dashed text-gray-500 font-mono mr-auto animate-pulse flex items-center gap-2">
                  <Bot className="w-4 h-4 animate-bounce text-[#00E5FF]"/> AI sedang melihat permintaan Anda...
                </div>
              )}
            </div>
            <div className="p-3 bg-white border-t-4 border-black shrink-0 relative">
              {aiImageBase64 && (
                <div className="absolute bottom-[100%] left-0 z-10 bg-white border-2 border-black p-2 mb-2 flex items-start gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <img src={aiImageBase64} alt="Preview" className="w-20 h-auto border-2 border-black"/>
                  <button onClick={() => setAiImageBase64(null)} className="p-1 hover:bg-rose-100 text-rose-500 border border-transparent hover:border-rose-500" title="Hapus Gambar">
                     <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSendAi} className="flex gap-2 items-center">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 border-2 text-black bg-gray-100 border-black hover:bg-black hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Unggah Gambar"
                >
                  <ImageIcon className="w-5 h-5"/>
                </button>
                <input 
                  disabled={isAiLoading} 
                  value={aiInput} 
                  onChange={(e) => setAiInput(e.target.value)} 
                  type="text" 
                  placeholder="Ketik pesan atau tekan Ctrl+V paste gambar..." 
                  className="flex-1 border-2 border-black p-2.5 text-xs font-bold outline-none focus:bg-yellow-50 min-w-0" 
                />
                <button disabled={isAiLoading} type="submit" className="px-5 py-2.5 bg-black text-[#00E5FF] border-2 border-black hover:bg-gray-800 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-px active:translate-y-px active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                  <Send className="w-4 h-4"/>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

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

