/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LiveClassLogoProps {
  className?: string;
  variant?: 'icon-only' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  themeColor?: 'pink' | 'cyan' | 'mixed';
}

export default function LiveClassLogo({ 
  className = '', 
  variant = 'full', 
  size = 'md',
  themeColor = 'mixed'
}: LiveClassLogoProps) {
  
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-5xl sm:text-6xl'
  };

  const getShadowColor = () => {
    switch (themeColor) {
      case 'pink': return 'bg-[#00E5FF]';
      case 'cyan': return 'bg-[#FF007A]';
      case 'mixed':
      default: return 'bg-[#00E5FF]';
    }
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Neo-brutalist logo container */}
      <div className={`relative ${iconSizes[size]} shrink-0 transform hover:-rotate-6 hover:scale-105 transition-all duration-200 cursor-pointer`}>
        {/* Shadow layer offset */}
        <div className={`absolute inset-0 ${getShadowColor()} border-2 border-black rounded-lg translate-x-[3px] translate-y-[3px]`}></div>
        
        {/* Main interactive face container */}
        <div className="absolute inset-0 bg-[#111111] border-2 border-black rounded-lg flex items-center justify-center text-white overflow-hidden shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          {/* Custom SVG premium vector representing online interactive classroom learning */}
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full p-1"
          >
            {/* Ambient dot matrix grid in the background */}
            <circle cx="20" cy="20" r="1.5" fill="rgba(255,255,255,0.15)" />
            <circle cx="20" cy="40" r="1.5" fill="rgba(255,255,255,0.15)" />
            <circle cx="20" cy="60" r="1.5" fill="rgba(255,255,255,0.15)" />
            <circle cx="20" cy="80" r="1.5" fill="rgba(255,255,255,0.15)" />
            <circle cx="40" cy="20" r="1.5" fill="rgba(255,255,255,0.15)" />
            <circle cx="60" cy="20" r="1.5" fill="rgba(255,255,255,0.15)" />
            <circle cx="80" cy="20" r="1.5" fill="rgba(255,255,255,0.15)" />
            <circle cx="80" cy="40" r="1.5" fill="rgba(255,255,255,0.15)" />
            <circle cx="80" cy="60" r="1.5" fill="rgba(255,255,255,0.15)" />
            <circle cx="80" cy="80" r="1.5" fill="rgba(255,255,255,0.15)" />

            {/* Glowing Active Broadcast Signal waves emitting from the cap */}
            <path 
              d="M 32 18 A 22 22 0 0 1 68 18" 
              stroke="#00E5FF" 
              strokeWidth="4" 
              strokeLinecap="round" 
              opacity="0.85"
            />
            <path 
              d="M 22 10 A 34 34 0 0 1 78 10" 
              stroke="#FF007A" 
              strokeWidth="4" 
              strokeLinecap="round" 
              opacity="0.7"
            />

            {/* Neo-brutalist Graduation Cap - Represents class and professional education */}
            {/* The Cap solid Base shadow structure */}
            <path 
              d="M 32 48 V 56 C 32 63, 68 63, 68 56 V 48" 
              fill="#111111" 
              stroke="white" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* The primary diamond board of the cap */}
            <path 
              d="M 50 24 L 84 37 L 50 50 L 16 37 Z" 
              fill="#FF007A" 
              stroke="white" 
              strokeWidth="4.5" 
              strokeLinejoin="round" 
            />

            {/* Glowing socket tassel wire */}
            <path 
              d="M 50 37 L 76 43 V 54" 
              stroke="#00E5FF" 
              strokeWidth="3.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            {/* Glowing connector socket node */}
            <circle 
              cx="76" 
              cy="54" 
              r="4.5" 
              fill="#facc15" 
              stroke="black" 
              strokeWidth="2" 
            />

            {/* Retro Brutalist learning star sparkle element to the left */}
            <path 
              d="M 24 58 Q 24 64 18 64 Q 24 64 24 70 Q 24 64 30 64 Q 24 64 24 58 Z" 
              fill="#facc15" 
              stroke="black" 
              strokeWidth="2" 
            />

            {/* Elegant Open Book Base (Buku Terbuka) - representing Education & Learning */}
            <g>
              {/* Shadow of the book */}
              <path 
                d="M 22 71 C 36 65, 50 71, 50 71 C 50 71, 64 65, 78 71 V 84 C 64 78, 50 84, 50 84 C 50 84, 36 78, 22 84 Z" 
                fill="#FF007A" 
                stroke="black" 
                strokeWidth="2.5" 
                strokeLinejoin="round"
                transform="translate(2, 2)"
              />
              {/* Book body pages */}
              <path 
                d="M 22 71 C 36 65, 50 71, 50 71 C 50 71, 64 65, 78 71 V 84 C 64 78, 50 84, 50 84 C 50 84, 36 78, 22 84 Z" 
                fill="white" 
                stroke="black" 
                strokeWidth="2.5" 
                strokeLinejoin="round" 
              />
              {/* Book center spine line */}
              <path 
                d="M 50 71 V 84" 
                stroke="black" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
              {/* Little page line decorations to show content */}
              <path d="M 28 75 H 42" stroke="#FF007A" strokeWidth="2" strokeLinecap="round" />
              <path d="M 28 79 H 38" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
              <path d="M 58 75 H 72" stroke="#00E5FF" strokeWidth="2" strokeLinecap="round" />
              <path d="M 58 79 H 68" stroke="#111111" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      </div>

      {variant === 'full' && (
        <div className="flex flex-col select-none">
          <span className={`font-display font-black tracking-tighter text-[#111111] leading-none ${textSizes[size]}`}>
            LiveClass<span className="text-[#FF007A]">.</span>
          </span>
          <span className="text-[8px] sm:text-[9px] font-mono font-black text-gray-500 uppercase tracking-widest leading-none mt-1">
            PORTAL INTERAKTIF REAL-TIME
          </span>
        </div>
      )}
    </div>
  );
}
