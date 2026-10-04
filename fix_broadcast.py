import sys

with open('src/components/TeacherDashboard_fixed.tsx', 'r') as f:
    content = f.read()

state_insert = "const [activeClassroomSubTab, setActiveClassroomSubTab] = useState<string>('broadcast');"
state_code = """const [broadcastInput, setBroadcastInput] = useState('');
  const [broadcasts, setBroadcasts] = useState<any[]>([]);

  const handleSendBroadcast = () => {
    if (!broadcastInput.trim()) return;
    const alertRecord = {
      id: 'bc-' + Date.now(),
      senderName: username,
      timestamp: String(new Date().toLocaleTimeString()),
      payload: { text: broadcastInput }
    };
    onBroadcastPayload('ANNOUNCEMENT_MSG', alertRecord);
    setBroadcasts([alertRecord, ...broadcasts]);
    setBroadcastInput('');
  };

  """

if state_insert in content and "const [broadcastInput" not in content:
    content = content.replace(state_insert, state_code + state_insert)


old_tab = """                {activeClassroomSubTab === 'broadcast' && (
                  <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,229,255,1)] space-y-6">
                    <h3 className="font-display font-black text-xs text-black uppercase tracking-widest pb-1 border-b-2 border-black flex items-center gap-1.5">
                      <Rocket className="h-4 w-4 text-[#00E5FF] shrink-0" /> BUAT PERTEMUAN BARU
                    </h3>
                    <form onSubmit={handleAddNewMeeting} className="flex gap-4 items-end flex-wrap sm:flex-nowrap">
                      <div>
                        <label className="text-[10px] font-bold font-mono text-gray-500 block pb-1">PERTEMUAN KE-</label>
                        <input 
                          type="number"
                          required
                          min={1}
                          max={20}
                          value={meetingNumberInput}
                          onChange={(e) => setMeetingNumberInput(parseInt(e.target.value) || 1)}
                          className="w-16 text-xs font-bold p-2 bg-neutral-100 border-2 border-black rounded-none outline-none focus:ring-1 focus:ring-[#FF007A]"
                        />
                      </div>
                      <div className="flex-grow">
                        <label className="text-[10px] font-bold font-mono text-gray-500 block pb-1">TOPIK MATERI</label>
                        <input 
                          type="text"
                          required
                          placeholder="Contoh: Socket Programming"
                          value={meetingTopicInput}
                          onChange={(e) => setMeetingTopicInput(e.target.value)}
                          className="w-full text-xs font-bold p-2 bg-neutral-100 border-2 border-black rounded-none outline-none focus:ring-1 focus:ring-[#FF007A]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="py-2.5 px-6 bg-[#00E5FF] text-black border-2 border-black font-black uppercase text-[10px] tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
                      >
                        DAFTARKAN <Rocket className="h-3 w-3 inline ml-1" />
                      </button>
                    </form>
                  </div>
                )}"""

new_tab = """                {activeClassroomSubTab === 'broadcast' && (
                  <div className="space-y-4">
                    <div className="bg-white border-4 border-black p-4 lg:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4 relative">
                      <h3 className="font-display font-black text-xs text-black uppercase tracking-widest pb-1 border-b-2 border-black flex items-center gap-1.5">
                        <Volume2 className="h-4 w-4 text-[#FF007A] shrink-0" /> BAGIKAN PENGUMUMAN KE KELAS...
                      </h3>
                      <div>
                        <textarea
                          value={broadcastInput}
                          onChange={(e) => setBroadcastInput(e.target.value)}
                          placeholder="Umumkan sesuatu ke kelas Anda..."
                          className="w-full text-[11px] sm:text-xs font-bold p-3 bg-neutral-50 border-2 border-black rounded-none outline-none focus:ring-1 focus:ring-[#FF007A] resize-none pb-8 shadow-inner"
                          rows={3}
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            type="button"
                            onClick={handleSendBroadcast}
                            className="bg-[#00E5FF] px-6 py-2.5 border-2 border-black text-black font-black uppercase text-[10px] tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-px active:shadow-none hover:bg-[#00c5dd] transition-all cursor-pointer"
                          >
                            DIBAGIKAN
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {broadcasts.length === 0 ? (
                        <p className="text-center italic text-[11px] text-gray-500 bg-neutral-50 border-2 border-black p-4 font-sans font-semibold">Belum ada pengumuman yang dibagikan ke stream kelas.</p>
                      ) : (
                        broadcasts.map((b, idx) => (
                           <div key={idx} className="bg-white border-2 border-black p-4 space-y-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-left hover:bg-neutral-50 transition-colors">
                              <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-none border border-black bg-neutral-900 flex items-center justify-center text-[10px] font-black text-[#00E5FF] shrink-0 font-mono shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                    {b.senderName.substring(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-black text-black uppercase tracking-tight">{b.senderName}</p>
                                    <p className="text-[9px] font-mono font-bold text-gray-400">{b.timestamp}</p>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs font-semibold text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">{b.payload.text || JSON.stringify(b.payload)}</p>
                           </div>
                        ))
                      )}
                    </div>
                  </div>
                )}"""

content = content.replace(old_tab, new_tab)

with open('src/components/TeacherDashboard.tsx', 'w') as f:
    f.write(content)

print("Broadcast tab fixed using python!")
