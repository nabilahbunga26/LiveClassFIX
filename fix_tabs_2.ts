import fs from 'fs';

let content = fs.readFileSync('src/components/TeacherDashboard_fixed.tsx', 'utf8');

const oldSubtabs = `                  {[
                    { id: 'broadcast', label: 'BUAT PERTEMUAN' },
                    { id: 'members', label: 'ANGGOTA' },
                    { id: 'banksoal', label: 'BANK SOAL' },
                    { id: 'material', label: 'MATERI KELAS' },
                    { id: 'assignment', label: 'TUGAS' },
                    { id: 'calendar', label: 'KALENDER' }
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setActiveClassroomSubTab(sub.id as any)}
                      className={\`flex-1 min-w-[80px] py-2 px-3 text-[10px] font-black uppercase tracking-wider transition-all border-2 cursor-pointer \${activeClassroomSubTab === sub.id ? 'bg-[#00E5FF] text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-neutral-800'}\`}
                    >
                      {sub.label}
                    </button>
                  ))}`;

const newSubtabs = `                  {[
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
                        onClick={() => setActiveClassroomSubTab(sub.id as any)}
                        className={\`flex items-center space-x-1.5 px-4 py-2.5 font-black text-[10px] uppercase tracking-widest border-2 border-black focus:outline-none transition-all cursor-pointer \${
                          activeClassroomSubTab === sub.id || (activeClassroomSubTab === 'material' && sub.id === 'materials')
                            ? 'bg-[var(--color-primary)] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transform translate-x-px translate-y-px z-10'
                            : 'bg-white text-gray-700 hover:text-black hover:bg-neutral-100'
                        }\`}
                        style={{ '--color-primary': '#FF007A' } as React.CSSProperties}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{sub.label}</span>
                      </button>
                    );
                  })}`;

if (content.includes("BUAT PERTEMUAN")) {
  content = content.replace(oldSubtabs, newSubtabs);
  fs.writeFileSync('src/components/TeacherDashboard_fixed.tsx', content);
  console.log("Classroom tabs fixed.");
} else {
  console.log("BUAT PERTEMUAN not found or format mismatch");
}
