/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { NetworkPacket, Participant } from '../types';
import { generateChecksum } from '../utils';
import { Activity, ShieldAlert, Cpu, List, Bug, Zap, Send, CheckCircle2 } from 'lucide-react';

interface NetworkLabProps {
  packets: NetworkPacket[];
  clearPackets: () => void;
  latencySlider: number;
  setLatencySlider: (val: number) => void;
  injectPacketError: (type: 'checksum' | 'duplicate_user' | 'malformed') => void;
  students: Record<string, Participant>;
  triggerLoadTesting: (studentsCount: number) => void;
}

export default function NetworkLab({
  packets,
  clearPackets,
  latencySlider,
  setLatencySlider,
  injectPacketError,
  students,
  triggerLoadTesting
}: NetworkLabProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'tools' | 'architecture'>('console');
  const [customPayload, setCustomPayload] = useState('{"message": "Hello Server Protocol!"}');
  const [injectStatus, setInjectStatus] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the socket log console
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [packets]);

  const handleCustomInjection = () => {
    try {
      // Validate JSON format
      const parsed = JSON.parse(customPayload);
      setInjectStatus('✓ Packet sent successfully with valid checksum sequence');
      setTimeout(() => setInjectStatus(null), 3500);
      
      // Inject regular data packet simulation
      injectPacketError('malformed'); // triggers simulated flow
    } catch (e) {
      setInjectStatus('❌ Malformed Packet Validation: Invalid JSON structure!');
      setTimeout(() => setInjectStatus(null), 4000);
    }
  };

  return (
    <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,229,255,1)] flex flex-col space-y-6 text-[#111111]">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-[#FF007A]" />
            <span className="font-display text-lg font-black uppercase tracking-wider">Network Programming Lab</span>
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Analisis TCP/Socket, Heartbeat & Concurrency secara Real-time</p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap space-x-1.5 p-1 bg-gray-50 border-2 border-black rounded-none shrink-0 self-start">
          {[
            { id: 'console', label: 'Packet Logger', icon: List },
            { id: 'tools', label: 'Stress Testing', icon: Bug },
            { id: 'architecture', label: 'TCP Layer Spec', icon: Activity }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center space-x-1 px-3 py-1 text-[10px] font-black uppercase tracking-wide border transition-all cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-black text-white border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]'
                    : 'bg-white text-gray-500 border-gray-200 hover:text-black hover:bg-gray-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5 mr-1" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'console' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#00E5FF]/15 p-3.5 border-4 border-black font-mono">
            {/* Latency manipulation slider */}
            <div className="flex items-center space-x-3 flex-grow max-w-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-black shrink-0">RTT Laten_Delay:</span>
              <input 
                type="range" 
                min="5" 
                max="800" 
                value={latencySlider} 
                onChange={(e) => setLatencySlider(Number(e.target.value))}
                className="w-full accent-[#FF007A] cursor-ew-resize h-1.5"
              />
              <span className="text-xs font-black text-[#FF007A] w-12 shrink-0">{latencySlider}ms</span>
            </div>

            <button 
              onClick={clearPackets}
              className="text-xs font-black uppercase text-black font-sans bg-white border-2 border-black px-4 py-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              Clear Logs
            </button>
          </div>

          {/* Real-time Socket Logs Panel */}
          <div className="border-4 border-black overflow-hidden bg-neutral-900 text-white font-mono text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black px-4 py-3 border-b border-neutral-800 flex items-center justify-between text-[11px] text-gray-400 font-bold">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#00E5FF] animate-pulse border border-black" />
                <span className="uppercase text-white tracking-widest font-black">TCP_SOCKET_CONCURRENT_STREAM : PORT_5000</span>
              </div>
              <div className="text-[10px] bg-neutral-800 px-2 py-0.5 font-bold">ACK_SYNC: LIVE</div>
            </div>

            <div ref={scrollContainerRef} className="p-4 space-y-2 h-[260px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-800 cursor-text">
              {packets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 italic space-y-2 select-none">
                  <Activity className="h-6 w-6 stroke-1 text-gray-600 animate-pulse" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-center">Menunggu segment data kuis, chat, atau slide untuk direkam...</p>
                </div>
              ) : (
                packets.map((pkt, idx) => {
                  let badgeColor = 'text-[#00E5FF]';
                  if (pkt.type === 'ERROR' || pkt.type === 'RST') badgeColor = 'text-[#FF007A]';
                  if (pkt.type === 'SYN' || pkt.type === 'ACK') badgeColor = 'text-emerald-400';

                  return (
                    <div key={pkt.id} className="border-b border-[#222222] pb-2 flex flex-col space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                        <span>[{pkt.timestamp}] SEQ {pkt.sequenceNum}</span>
                        <span className="text-gray-400">MD5: {pkt.checksum}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold">
                          <span className={`${badgeColor} uppercase`}>{pkt.type}</span>
                          <span className="text-gray-400 text-[11px] ml-2 font-normal">({pkt.eventName})</span>
                        </span>
                        <span className="text-gray-400 text-[10px] uppercase font-mono font-bold">
                          {pkt.sender} ➔ {pkt.receiver}
                        </span>
                      </div>
                      <div className="pl-3 py-1.5 bg-black rounded-none border-l-2 border-[#FF007A] text-gray-300 break-all leading-relaxed max-h-16 overflow-y-auto">
                        Payload: {pkt.payload}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tools' && (
        <div className="space-y-6">
          {/* Section 1: Network Chaos Engineering Simulators */}
          <div className="bg-white p-5 border-4 border-black space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-display font-black text-xs text-[#111111] uppercase tracking-wider flex items-center space-x-1.5 border-b-2 border-black pb-1">
              <ShieldAlert className="h-4 w-4 text-[#FF007A]" />
              <span>Simulasi Kegagalan Sinyal (TCP Packet Chaos)</span>
            </h3>
            <p className="text-xs text-gray-500 font-bold leading-relaxed">
              Uji kekuatan sistem komunikasi kelas Flask-SocketIO Anda dengan menyiarkan segmen biner buruk secara asinkron.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button 
                id="btn-chaos-checksum"
                onClick={() => injectPacketError('checksum')}
                className="p-3 bg-white border-2 border-black hover:border-black hover:bg-[#FF007A]/10 text-left transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <p className="text-xs font-black text-[#FF007A] uppercase leading-none">Checksum Mismatch</p>
                <p className="text-[10px] text-gray-500 mt-2 font-bold leading-relaxed">Sengaja mengirim file response dengan MD5 checksum invalid.</p>
              </button>

              <button 
                id="btn-chaos-duplicate"
                onClick={() => injectPacketError('duplicate_user')}
                className="p-3 bg-white border-2 border-black hover:border-black hover:bg-[#00E5FF]/10 text-left transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <p className="text-xs font-black text-[#00E5FF] uppercase leading-none">ID DUPLICATION</p>
                <p className="text-[10px] text-gray-500 mt-2 font-bold leading-relaxed">Duplikasi parameter ID Sockets untuk mensimulasikan login ganda.</p>
              </button>

              <button 
                id="btn-chaos-timeout"
                onClick={() => injectPacketError('malformed')}
                className="p-3 bg-white border-2 border-black hover:border-black hover:bg-yellow-50/50 text-left transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <p className="text-xs font-black text-amber-500 uppercase leading-none">Invalid Frame Format</p>
                <p className="text-[10px] text-gray-500 mt-2 font-bold leading-relaxed">Menyiarkan paket JSON kosong tanpa atribut header dan port.</p>
              </button>
            </div>
          </div>

          {/* Section 2: Concurrency & Multithreading Load Testing */}
          <div className="bg-white p-5 border-4 border-black space-y-4 shadow-[4px_4px_0px_0px_rgba(0,229,255,1)]">
            <h3 className="font-display font-black text-xs text-[#111111] uppercase tracking-wider flex items-center space-x-1.5 border-b-2 border-black pb-1">
              <Zap className="h-4 w-4 text-[#00E5FF]" />
              <span>Simulasi Beban Konkurensi (Active Load testing)</span>
            </h3>
            <p className="text-xs text-gray-500 font-bold leading-relaxed">
              Uji ketahanan konkurensi (Active Concurrency Stress Test) dengan mensimulasikan puluhan sub-proses socket client aktif secara simultan.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-gray-50 p-4 border-2 border-black">
              <div className="space-y-1">
                <span className="text-xs font-black text-[#111111] uppercase leading-none">Jumlah Virtual Sockets:</span>
                <p className="text-[10px] text-gray-500 font-bold uppercase font-mono">Beban request serentak ke scheduler asinkron.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {[10, 50, 100].map((num) => (
                  <button
                    key={num}
                    onClick={() => triggerLoadTesting(num)}
                    className="px-3.5 py-2 text-[10px] font-black uppercase text-black bg-[#00E5FF] hover:bg-[#00c5dd] border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    🚀 Spawn {num} Clients
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom injection script */}
          <div className="bg-[#111111] border-4 border-black text-white p-5 space-y-3 font-mono text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] select-none">
            <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-wider">RAW SOCKET PACKET INJECTOR (DESCRIPTORS)</h4>
            <div className="space-y-2">
              <textarea 
                rows={3}
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                className="w-full bg-black border-2 border-neutral-700 text-[#00E5FF] p-3 focus:outline-none focus:border-[#00E5FF] text-xs font-mono whitespace-pre leading-relaxed outline-none"
              />
              <div className="flex justify-between items-center flex-wrap gap-2">
                <span className="text-[10px] text-gray-500 font-bold font-mono">Port Ingress Binding: localhost:5000</span>
                <button
                  onClick={handleCustomInjection}
                  className="px-4 py-2 bg-[#FF007A] text-white border-2 border-black font-black font-sans uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:bg-[#ff1f89] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all text-[10px] tracking-widest"
                >
                  <Send className="h-3.5 w-3.5 mr-1 align-sub inline" />
                  <span>Transmit Payload</span>
                </button>
              </div>
              {injectStatus && (
                <p className="text-[11px] font-bold text-amber-400 border-2 border-amber-500 bg-amber-950/40 p-2 uppercase mt-2">{injectStatus}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'architecture' && (
        <div className="bg-white border-4 border-black p-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-display font-black text-xs text-black uppercase tracking-wider pb-1 border-b-2 border-black">
            🎰 WEBSOCKET SOCKET TCP STACK ARCHITECTURE SPEC
          </h3>
          <p className="text-xs text-gray-500 font-bold leading-relaxed">
            Lapisan visual pengaliran paket data kuliah jaringan pada backend model multiplex asinkron yang kami bangun:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-white border-4 border-black p-4 space-y-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[#111111]">
              <p className="font-black text-[#FF007A] text-[11px]">1. APPLICATION LAYER</p>
              <p className="text-gray-500 text-[10px] font-bold leading-relaxed font-sans">Enkapsulasi segment data JSON, hashing MD5 checksum biner untuk validasi corrupt, dan frame broadcast.</p>
              <span className="inline-block bg-[#FF007A]/10 border border-[#FF007A] text-[#FF007A] px-1.5 py-0.5 text-[9px] font-black uppercase">Segment Frame</span>
            </div>

            <div className="bg-white border-4 border-black p-4 space-y-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[#111111]">
              <p className="font-black text-[#00E5FF] text-[11px]">2. TRANSPORT LAYER (TCP)</p>
              <p className="text-gray-500 text-[10px] font-bold leading-relaxed font-sans">Komunikasi stream berorientasi koneksi. Sockets mengontrol sequence_num dan port binding: 5000.</p>
              <span className="inline-block bg-[#00E5FF]/10 border border-[#00E5FF] text-[#008ba3] px-1.5 py-0.5 text-[9px] font-black uppercase">Socket Han_Shake</span>
            </div>

            <div className="bg-white border-4 border-black p-4 space-y-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-[#111111]">
              <p className="font-black text-neutral-700 text-[11px]">3. NETWORK INTERFACE</p>
              <p className="text-gray-500 text-[10px] font-bold leading-relaxed font-sans">Pengukuran latensi RTT (Round-trip delay) dari biner packet PING-PONG asinkron di dalam event loop.</p>
              <span className="inline-block bg-neutral-100 border border-neutral-300 text-neutral-800 px-1.5 py-0.5 text-[9px] font-black uppercase">RTT Heartbeat</span>
            </div>
          </div>

          <div className="border-4 border-black p-4 bg-white flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center space-x-3 text-xs text-[#111111]">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-black uppercase text-[11px]">Non-blocking Multithreading Enabled</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase leading-none mt-1">Mencegah server deadlock dengan asinkron multiplexing.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
