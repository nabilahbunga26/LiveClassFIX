/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LiveClassLogo from './LiveClassLogo';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Stage 1: Display Logo on Top and "LIVESCREEN" centered below
    const timer1 = setTimeout(() => {
      setStep(2);
    }, 1800);

    // Stage 2: After Logo shifts Left & "LiveClass." animates in, complete and exit splash screen
    const timer2 = setTimeout(() => {
      setIsExiting(true);
    }, 3800);

    const timer3 = setTimeout(() => {
      onComplete();
    }, 4400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 400);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          id="splash-screen-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center font-sans overflow-hidden select-none"
        >
          {/* Main animated logo and logotype block */}
          <div className="relative border-4 border-black p-10 md:p-14 bg-white shadow-[8px_8px_0px_0px_rgba(17,17,17,1)] flex flex-col items-center justify-center min-h-[220px] min-w-[320px] md:min-w-[450px]">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step-1"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="flex flex-col items-center justify-center gap-4"
                >
                  <LiveClassLogo size="xl" variant="icon-only" themeColor="mixed" />
                  
                  <motion.h1 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="font-display font-black text-3xl md:text-4xl tracking-tighter text-[#111111] text-center"
                  >
                    LiveClass<span className="text-[#FF007A]">.</span>
                  </motion.h1>
                </motion.div>
              ) : (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-4 text-left"
                >
                  {/* Outer container animating from center to left format */}
                  <motion.div
                    initial={{ x: 30 }}
                    animate={{ x: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  >
                    <LiveClassLogo size="xl" variant="icon-only" themeColor="mixed" />
                  </motion.div>

                  {/* Text details moving/sliding in from left to right */}
                  <motion.div
                    initial={{ width: 0, opacity: 0, x: -20 }}
                    animate={{ width: "auto", opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                    className="overflow-hidden flex flex-col justify-center whitespace-nowrap pl-2 border-t-2 sm:border-t-0 sm:border-l-4 border-black pt-3 sm:pt-0 sm:pl-4"
                  >
                    <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter text-[#111111] leading-none">
                      LiveClass<span className="text-[#FF007A]">.</span>
                    </h1>
                    <motion.p 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
                      className="font-display font-black text-xs sm:text-sm tracking-tight leading-loose sm:leading-loose"
                    >
                      <span className="text-black">Interaktif</span>{' '}
                      <span className="text-[#00E5FF]">Selalu,</span>{' '}
                      <span className="text-[#FF007A]">Belajar</span>{' '}
                      <span className="text-black">Jadi</span>{' '}
                      <span className="text-[#00E5FF]">Lebih</span>{' '}
                      <span className="text-[#FF007A]">Seru!</span>
                    </motion.p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
