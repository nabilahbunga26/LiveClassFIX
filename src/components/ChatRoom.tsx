/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Participant } from '../types';
import { Send, Smile, Volume2, ShieldAlert, AtSign, MessageSquare, Megaphone } from 'lucide-react';

interface ChatRoomProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isAnnouncement: boolean) => void;
  onSendReply?: (messageId: string, text: string) => void;
  role: 'teacher' | 'student';
  username: string;
  activeStudents: Record<string, Participant>;
}

export default function ChatRoom({
  messages,
  onSendMessage,
  onSendReply,
  role,
  username,
  activeStudents
}: ChatRoomProps) {
  const [inputText, setInputText] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleReplySubmit = (messageId: string) => {
    const text = replyTexts[messageId] || '';
    if (!text.trim()) return;

    if (onSendReply) {
      onSendReply(messageId, text.trim());
    }
    setReplyTexts(prev => ({ ...prev, [messageId]: '' }));
  };

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText.trim(), isAnnouncement);
    setInputText('');
    setIsAnnouncement(false);
    setShowEmojiPicker(false);
    setShowMentionSuggestions(false);
  };

  const handleEmojiClick = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleMentionClick = (studentName: string) => {
    setInputText(prev => {
      const lastIndex = prev.lastIndexOf('@');
      if (lastIndex !== -1) {
        return prev.substring(0, lastIndex) + `@${studentName} `;
      }
      return prev + `@${studentName} `;
    });
    setShowMentionSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);

    // Toggle mention suggestions
    if (value.endsWith('@')) {
      setShowMentionSuggestions(true);
    } else if (!value.includes('@') || value.endsWith(' ')) {
      setShowMentionSuggestions(false);
    }
  };

  const emojis = ['⚡', '🔥', '💻', '🚀', '💯', '👍', '🧠', '🎓', '😮', '👏'];

  return (
    <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[400px] justify-between relative overflow-hidden text-[#111111]">
      
      {/* List Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-display font-black text-xs text-orange-500 uppercase tracking-wider flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 text-orange-500 shrink-0" /> SALURAN DISKUSI
          </span>
        </div>
      </div>

      {/* Forum Threads (formerly Chat Messages) */}
      <div ref={scrollContainerRef} className="flex-grow overflow-y-auto space-y-3 pr-1 mb-3 scrollbar-thin">
        {(() => {
          const chatMessagesOnly = messages.filter(msg => {
            const isAnn = msg.isAnnouncement || (msg.text && (
              msg.text.includes('[BROADCAST') ||
              msg.text.includes('[INFORMASI') ||
              msg.text.includes('[INFO TUGAS]') ||
              msg.text.includes('[NILAI TUGAS]') ||
              msg.text.includes('[PRESENSI') ||
              msg.text.includes('[PENGUMUMAN]') ||
              msg.text.startsWith('PENGUMUMAN')
            ));
            return !isAnn;
          });

          if (chatMessagesOnly.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 italic py-6 space-y-1.5 select-none">
                <p className="text-[10px] font-bold uppercase tracking-wider">Belum ada diskusi.</p>
              </div>
            );
          }

          return chatMessagesOnly.map((msg) => {
            const isMe = msg.senderName === username;

            return (
              <div 
                key={msg.id} 
                className="w-full border-2 border-black bg-white flex flex-col text-left relative"
              >
                {/* Header (Author) */}
                <div className="border-b border-black p-1.5 bg-gray-50 flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase text-purple-600 bg-purple-100 px-1 border border-purple-200">
                    OLEH: {msg.senderName} {isMe && '(ANDA)'}
                  </span>
                  <span className="text-[8px] text-gray-500 font-mono font-bold">{msg.timestamp}</span>
                </div>
                
                {/* Content */}
                <div className="p-2.5">
                  <p className="text-[11px] text-black font-bold font-sans leading-relaxed break-words whitespace-pre-wrap">
                    {msg.text.split(/(@\w+)/g).map((word, index) => {
                      if (word.startsWith('@')) {
                        return <span key={index} className="text-[#FF007A] font-black bg-[#FF007A]/10 border-b border-[#FF007A] px-0.5">{word}</span>;
                      }
                      return word;
                    })}
                  </p>
                </div>

                {/* Existing Replies List */}
                {msg.replies && msg.replies.length > 0 && (
                  <div className="border-t border-neutral-200 bg-[#FAF9F5] px-2.5 py-1.5 space-y-1.5 text-left">
                    {msg.replies.map(reply => (
                      <div key={reply.id} className="text-[9px] border-l-2 border-orange-400 pl-1.5 py-0.5 bg-white/50 border border-neutral-100">
                        <div className="flex justify-between font-mono text-[7px] text-gray-400 font-bold uppercase select-none mb-0.5">
                          <span>{reply.senderName}</span>
                          <span>{reply.timestamp}</span>
                        </div>
                        <p className="text-[9.5px] text-black font-semibold font-sans break-words whitespace-pre-wrap">{reply.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Real Interactive Reply Input to match Image 3 style */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleReplySubmit(msg.id);
                  }}
                  className="border-t border-black p-1 bg-gray-100 flex gap-1"
                >
                  <input 
                    type="text" 
                    placeholder="Tulis tanggapan atau analisis di sini..." 
                    value={replyTexts[msg.id] || ''}
                    onChange={(e) => setReplyTexts(prev => ({ ...prev, [msg.id]: e.target.value }))}
                    className="text-[8px] font-semibold flex-grow bg-white border border-neutral-300 focus:outline-none focus:border-black px-1.5 py-0.5 text-black placeholder-neutral-400" 
                  />
                  <button 
                    type="submit" 
                    className="bg-black text-white hover:bg-neutral-800 text-[7px] font-black px-2 py-0.5 border border-black cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none uppercase tracking-wider"
                  >
                    KIRIM
                  </button>
                </form>
              </div>
            );
          });
        })()}
      </div>

      {/* Suggestion autocomplete panel */}
      {showMentionSuggestions && Object.keys(activeStudents).length > 0 && (
        <div className="absolute bottom-28 left-4 right-4 bg-white border-2 border-black p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-20 space-y-1">
          <p className="text-[8px] text-gray-500 font-black uppercase tracking-wider pl-1 pb-1 border-b border-black font-mono">
            Mention...
          </p>
          <div className="max-h-20 overflow-y-auto space-y-0.5">
            {Object.keys(activeStudents).map((s) => (
              <button
                key={s}
                onClick={() => handleMentionClick(s)}
                className="w-full text-left px-2 py-1 text-[9px] font-black uppercase hover:bg-[#00E5FF]/20 transition-colors cursor-pointer"
              >
                @{s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message input composer */}
      <div className="shrink-0 border-t-2 border-black pt-3">
        <h4 className="font-display font-black text-[10px] text-black uppercase tracking-wider pb-1.5 flex items-center gap-1">
           LONTARKAN UTAS BARU
        </h4>
        <form onSubmit={handleSend} className="space-y-2">
          {role === 'teacher' && (
            <div className="flex items-center space-x-1.5 pl-1 select-none">
              <input 
                type="checkbox" 
                id="announcement-toggle" 
                checked={isAnnouncement}
                onChange={(e) => setIsAnnouncement(e.target.checked)}
                className="accent-[#FF007A] cursor-pointer h-3 w-3 border-2 border-black"
              />
              <label htmlFor="announcement-toggle" className="text-[9px] font-black text-[#FF007A] uppercase tracking-wider cursor-pointer">
                Tandai sbg Pengumuman
              </label>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <textarea
              id="input-chat-composer"
              value={inputText}
              onChange={(e: any) => handleInputChange(e)}
              rows={2}
              placeholder="Contoh: Mengapa koneksi UDP..."
              className="w-full px-2 py-1.5 text-[10px] border-2 border-black bg-white text-black font-semibold outline-none resize-none"
            />
            <button
              type="submit"
              id="btn-chat-send"
              className="w-full py-1.5 bg-black text-white font-black border-2 border-black hover:bg-neutral-800 cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none text-[9px] uppercase tracking-wide"
            >
              RILIS UTAS DISKUSI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
