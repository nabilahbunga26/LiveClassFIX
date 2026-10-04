/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Slide, Annotation } from '../types';
import { Maximize2, Minimize2, Edit2, ShieldAlert, Sparkles, Navigation, Upload, FolderOpen } from 'lucide-react';

interface PdfSlidesContainerProps {
  slides: Slide[];
  currentSlideIndex: number;
  onNavigate: (index: number, updatedAnnotations: Annotation[]) => void;
  role: 'teacher' | 'student';
  externalAnnotations?: Annotation[];
  onDraw?: (annotations: Annotation[]) => void;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadedFilename?: string;
}

export default function PdfSlidesContainer({
  slides,
  currentSlideIndex,
  onNavigate,
  role,
  externalAnnotations = [],
  onDraw,
  onFileChange,
  isUploading,
  uploadProgress = 0,
  uploadedFilename
}: PdfSlidesContainerProps) {
  const [tool, setTool] = useState<'laser' | 'pen' | 'marker' | 'eraser'>('laser');
  const [color, setColor] = useState<string>('#FF007A');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const currentSlide = (slides && slides.length > 0) ? (slides[currentSlideIndex] || slides[0]) : null;

  // Synchronize student views with external annotations broadcasted by teacher
  useEffect(() => {
    if (role === 'student') {
      setAnnotations(externalAnnotations);
    }
  }, [externalAnnotations, role]);

  // Synchronize internal state with changes in currentSlideIndex
  useEffect(() => {
    if (role === 'teacher') {
      setAnnotations([]); // Reset drawings for the new slide
      if (onDraw) onDraw([]);
    }
  }, [currentSlideIndex]);

  // Handle pointer tracking for laser pointing
  const getCoordinates = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // Store as percentage
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (role === 'student') return;
    if (tool === 'laser') return;

    const coords = getCoordinates(e);
    setIsDrawing(true);
    setCurrentPath([coords]);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getCoordinates(e);

    // Laser Pointer Broadcast (Teacher only)
    if (role === 'teacher') {
      if (tool === 'laser') {
        setPointer(coords);
      } else {
        setPointer(null);
      }
    }

    if (!isDrawing || role === 'student') return;

    if (tool === 'eraser') {
      // Simple collision eraser: remove any path containing points close to stroke
      const filtered = annotations.filter(ann => {
        const hasClosePoint = ann.points.some(pt => {
          const dx = pt.x - coords.x;
          const dy = pt.y - coords.y;
          return Math.sqrt(dx * dx + dy * dy) < 4; // Tolerance threshold 4%
        });
        return !hasClosePoint;
      });
      setAnnotations(filtered);
      if (onDraw) onDraw(filtered);
    } else {
      setCurrentPath(prev => [...prev, coords]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPath.length > 1 && tool !== 'laser' && tool !== 'eraser') {
      const newAnn: Annotation = {
        id: Math.random().toString(36).substr(2, 9),
        type: tool === 'marker' ? 'marker' : 'pen',
        color: tool === 'marker' ? '#00E5FF' : color,
        points: currentPath,
        size: tool === 'marker' ? 8 : 3
      };
      const updated = [...annotations, newAnn];
      setAnnotations(updated);
      if (onDraw) onDraw(updated);
    }
    setCurrentPath([]);
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
    setPointer(null);
  };

  const clearCanvas = () => {
    setAnnotations([]);
    if (onDraw) onDraw([]);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => console.log(err));
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      id="slide-presentation-mount"
      className="bg-white border-2 border-black p-5 flex flex-col justify-between relative overflow-hidden text-[#111111]"
    >
      {/* Top action bar */}
      <div className="flex justify-between items-center border-b-2 border-black pb-3 mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="h-3.5 w-3.5 bg-[#FF007A] border border-black animate-pulse shrink-0" />
          <span className="text-[10px] font-mono font-black text-gray-500 uppercase tracking-wider">
            {role === 'teacher' ? 'SLIDE_CONTROLLERS_ACTIVE' : 'LIVE_MUTIPLEX_STREAM'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono">
          {/* Upload Button overlayed next to Slide marker for the teacher */}
          {role === 'teacher' && onFileChange && (
            <div className="flex items-center gap-1.5">
              <label className="flex items-center space-x-1 px-2.5 py-1 bg-[#FF007A] hover:bg-[#ff1f89] text-white border-2 border-black font-sans font-black uppercase text-[9px] tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer select-none transition-all">
                <Upload className="h-3 w-3" />
                <span>UNGGAH SLIDE (PDF/JPG)</span>
                <input 
                  type="file" 
                  multiple
                  accept=".pptx,.ppt,.pdf,.txt,.md,image/png,image/jpeg,image/jpg" 
                  onChange={onFileChange} 
                  className="hidden" 
                />
              </label>
              {isUploading && (
                <span className="text-[9px] font-sans font-black text-[#FF007A] animate-pulse bg-pink-50 border border-black px-1">
                  ⏳ {uploadProgress}%
                </span>
              )}
              {uploadedFilename && !isUploading && (
                <span className="text-[8px] font-sans font-bold text-emerald-600 max-w-[80px] truncate" title={uploadedFilename}>
                  ✓ {uploadedFilename}
                </span>
              )}
            </div>
          )}

          <span className="font-sans font-black text-xs text-black bg-[#00E5FF]/20 border border-black px-3 py-1">
            Slide {currentSlideIndex + 1} / {slides.length}
          </span>
          <button 
            id="btn-presentation-fullscreen"
            onClick={toggleFullscreen}
            className="p-1.5 bg-white hover:bg-gray-100 border border-black transition-all text-black cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            title="Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Visual Workspace Canvas container */}
      <div className="relative w-full aspect-video border-4 border-black bg-white p-4 sm:p-6 md:p-8 flex flex-col justify-between select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        {!currentSlide ? (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 bg-neutral-900 text-white z-20">
            <div className="text-center max-w-md space-y-4">
              <div className="w-16 h-16 rounded-full border-4 border-dashed border-[#00E5FF] flex items-center justify-center mx-auto animate-pulse">
                <FolderOpen className="h-8 w-8 text-[#00E5FF]" />
              </div>
              <h3 className="font-sans text-lg sm:text-xl font-black text-[#00E5FF] uppercase tracking-wider">
                {role === 'teacher' ? 'BELUM ADA MATERI SLIDE' : 'MENUNGGU SLIDE PRESENTASI'}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed uppercase font-mono">
                {role === 'teacher' 
                  ? 'Silakan unggah dokumen PDF atau gambar JPG materi perkuliahan Anda menggunakan tombol "UNGGAH SLIDE (PDF/JPG)" di atas untuk memulai presentasi interaktif.' 
                  : 'Teacher pengampu belum mengunggah berkas slide/gambar materi pembelajaran. Coretan real-time dan asisten AI akan menyusul di papan ini setelah berkas disinkronkan.'
                }
              </p>
              {role === 'teacher' && onFileChange && (
                <div className="pt-2">
                  <label className="inline-flex items-center space-x-2 px-4 py-2 bg-[#00E5FF] hover:bg-[#00cadf] text-black border-2 border-white font-sans font-black uppercase text-xs tracking-wider shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer select-none transition-all">
                    <Upload className="h-4 w-4" />
                    <span>PILIH BERKAS PDF / JPG</span>
                    <input 
                      type="file" 
                      multiple
                      accept=".pptx,.ppt,.pdf,.txt,.md,image/png,image/jpeg,image/jpg" 
                      onChange={onFileChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
              )}
            </div>
            {/* Decorative layout detail */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between text-[8px] font-mono text-neutral-600">
              <div>BUS_CHANNEL: DISCONNECTED</div>
              <div>SLIDE_STATE: EMPTY_BOARD</div>
            </div>
          </div>
        ) : currentSlide.backgroundImageUrl ? (
          <div className="absolute inset-0 w-full h-full">
            <img src={currentSlide.backgroundImageUrl} className="w-full h-full object-contain pointer-events-none" alt={currentSlide.title} />
          </div>
        ) : (
          <>
            <div className="overflow-y-auto pr-1 relative z-10 w-full h-full flex flex-col justify-between">
              <div>
                {/* Slide Heading */}
                <h2 id="lecture-slide-title" className="font-sans text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-[#111111] tracking-tight leading-tight">
                  {currentSlide.title?.toUpperCase() || ''}
                </h2>
                <p id="lecture-slide-content" className="mt-1.5 sm:mt-2.5 text-[9px] sm:text-xs md:text-sm text-gray-600 leading-relaxed max-w-3xl font-bold uppercase tracking-wide whitespace-pre-wrap">
                  {currentSlide.content}
                </p>

                {/* Decorative design bullet lists */}
                <div className="mt-3 sm:mt-5 space-y-1.5 sm:space-y-2.5">
                  {currentSlide.bullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-start space-x-2 sm:space-x-3 text-[9px] sm:text-xs text-black font-black uppercase tracking-wide">
                      <span className="mt-1 sm:mt-1.5 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-[#FF007A] border border-black shrink-0" />
                      <span className="leading-tight">{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Decorative architectural layout detail */}
              <div className="mt-2 sm:mt-4 flex justify-between items-end border-t border-gray-150 pt-2 text-[7px] sm:text-[9px] font-mono font-bold text-gray-400 shrink-0">
                <div>BUS_CHANNEL: LECT_0x5F3F</div>
                <div className="flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full border border-black bg-emerald-500 animate-pulse" />
                  <span>ACK_SYNC_STATE: VERIFIED_PASS</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Drawing & Laser Overlays */}
        <svg
          ref={svgRef}
          className={`absolute inset-0 w-full h-full cursor-${tool === 'laser' ? 'crosshair' : 'pencil'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ pointerEvents: role === 'teacher' ? 'auto' : 'none' }}
        >
          {/* Annotations drawing path segments */}
          {annotations.map((ann) => (
            <path
              key={ann.id}
              d={`M ${ann.points.map(p => `${p.x * svgRef.current!.clientWidth / 100} ${p.y * svgRef.current!.clientHeight / 100}`).join(' L ')}`}
              fill="none"
              stroke={ann.color}
              strokeWidth={ann.size}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={ann.type === 'marker' ? 0.35 : 0.85}
            />
          ))}

          {/* Current unsaved drawing path */}
          {currentPath.length > 0 && svgRef.current && (
            <path
              d={`M ${currentPath.map(p => `${p.x * svgRef.current!.clientWidth / 100} ${p.y * svgRef.current!.clientHeight / 100}`).join(' L ')}`}
              fill="none"
              stroke={tool === 'marker' ? '#00E5FF' : color}
              strokeWidth={tool === 'marker' ? 8 : 3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={tool === 'marker' ? 0.35 : 0.85}
            />
          )}

          {/* Laser Pointer marker */}
          {pointer && svgRef.current && (
            <circle
              cx={`${pointer.x}%`}
              cy={`${pointer.y}%`}
              r="8"
              fill="#FF007A"
              className="animate-pulse opacity-90 border-2 border-white"
              style={{ filter: 'drop-shadow(0 0 6px #FF007A)' }}
            />
          )}
        </svg>
      </div>

      {/* Toolbar - Interactive controls (Only available for Teachers) */}
      {role === 'teacher' && (
        <div className="mt-4 p-3 bg-gray-50 border-2 border-black flex flex-wrap items-center justify-between gap-3 text-xs select-none">
          <div className="flex flex-wrap gap-1.5 font-mono">
            {[
              { id: 'laser', label: 'Pointer Tool', icon: Navigation, style: 'bg-black text-white hover:bg-neutral-800' },
              { id: 'pen', label: 'Whiteboard Pen', icon: Edit2, style: 'bg-[#FF007A] text-white hover:bg-[#ff1f89]' },
              { id: 'marker', label: 'Marker Highlight', icon: Sparkles, style: 'bg-[#00E5FF] text-black hover:bg-[#00c5dd]' },
              { id: 'eraser', label: 'Eraser', icon: ShieldAlert, style: 'bg-neutral-800 text-white hover:bg-neutral-900' }
            ].map((bt) => {
              const Icon = bt.icon;
              const isActive = tool === bt.id;
              return (
                <button
                  key={bt.id}
                  onClick={() => setTool(bt.id as any)}
                  className={`px-3 py-1.5 border-2 border-black text-[9px] font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all cursor-pointer ${
                    isActive 
                      ? `${bt.style} shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] translate-y-[-1px]` 
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{bt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-3 flex-wrap">
            {tool === 'pen' && (
              <div className="flex items-center space-x-1.5 bg-white p-1 border-2 border-black">
                {['#FF007A', '#00E5FF', '#111111', '#22C55E'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="h-4 w-4 border-2 border-black transition-transform hover:scale-110 cursor-pointer"
                    style={{ backgroundColor: c, outline: color === c ? '2px solid black' : 'none' }}
                  />
                ))}
              </div>
            )}
            <button
              onClick={clearCanvas}
              className="px-3.5 py-1.5 bg-white border-2 border-black text-black hover:bg-rose-50 hover:text-[#FF007A] font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]"
            >
              Clear Canvas
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigate(Math.max(0, currentSlideIndex - 1), annotations)}
              disabled={slides.length === 0 || currentSlideIndex === 0}
              className="px-3.5 py-1.5 bg-[#00E5FF] hover:bg-[#00c5dd] border-2 border-black text-black font-black text-[9px] uppercase tracking-wider disabled:opacity-40 transition-all cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Prev Slide
            </button>
            <button
              onClick={() => onNavigate(Math.min(slides.length - 1, currentSlideIndex + 1), annotations)}
              disabled={slides.length === 0 || currentSlideIndex >= slides.length - 1}
              className="px-3.5 py-1.5 bg-[#00E5FF] hover:bg-[#00c5dd] border-2 border-black text-black font-black text-[9px] uppercase tracking-wider disabled:opacity-40 transition-all cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Next Slide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
