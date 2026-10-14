import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundService } from '../services/sound';
import { Sparkles } from 'lucide-react';

interface CineverseSplashProps {
  onComplete: () => void;
}

export const CineverseSplash: React.FC<CineverseSplashProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const hasTriggeredComplete = useRef(false);

  const handleFinish = () => {
    if (hasTriggeredComplete.current) return;
    hasTriggeredComplete.current = true;
    setIsVisible(false);
    setTimeout(onComplete, 450); // Wait for exit motion
  };

  useEffect(() => {
    // Play warm cinematic theater intro chime
    soundService.playCinemaIntroSound();

    // 2-second total intro duration
    const DURATION_MS = 2000;
    const startTime = performance.now();

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(pct);
      if (elapsed >= DURATION_MS) {
        clearInterval(interval);
        handleFinish();
      }
    }, 16);

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        clearInterval(interval);
        handleFinish();
      }
    };
    window.addEventListener('keydown', keyHandler);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', keyHandler);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] bg-[#07070B] flex flex-col items-center justify-center p-4 overflow-hidden select-none cursor-pointer"
          onClick={handleFinish}
          title="Click anywhere to skip into cinema menu"
        >
          {/* Cinema Anamorphic Projector Light Beam Background */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            {/* Top Projector Light Flare */}
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 0.45, scaleY: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute top-0 w-[600px] h-full bg-gradient-to-b from-[#D4AF37]/25 via-[#D4AF37]/5 to-transparent blur-3xl transform -rotate-6"
            />
            {/* Ambient Center Glow */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: [0.9, 1.1, 1], opacity: [0.2, 0.5, 0.35] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] rounded-full bg-[#D4AF37]/15 blur-[120px]"
            />
          </div>

          {/* Main Cinematic Content */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 18 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center space-y-6 z-10 max-w-md w-full px-4"
          >
            {/* Fixed Official Cineverse Vector Projector Emblem */}
            <div className="relative">
              {/* Outer Glow Halo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1.15 }}
                transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
                className="absolute inset-0 rounded-3xl bg-[#D4AF37]/20 blur-xl"
              />

              {/* Vector Logo Badge */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-[#12121A] border-2 border-[#D4AF37] p-2 flex items-center justify-center shadow-[0_0_40px_rgba(212,175,55,0.45)]">
                <svg
                  viewBox="0 0 120 120"
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="splashGold" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFF2A8" />
                      <stop offset="25%" stopColor="#E5B942" />
                      <stop offset="55%" stopColor="#D4AF37" />
                      <stop offset="85%" stopColor="#B8861B" />
                      <stop offset="100%" stopColor="#7B570A" />
                    </linearGradient>
                    <linearGradient id="splashBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#FFF5B8" stopOpacity="0.95" />
                      <stop offset="45%" stopColor="#D4AF37" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Play Chevrons */}
                  <polygon points="14,38 32,60 14,82 23,82 41,60 23,38" fill="url(#splashGold)" opacity="0.65" />
                  <polygon points="27,38 45,60 27,82 36,82 54,60 36,38" fill="url(#splashGold)" />

                  {/* Dual Film Reels with gentle rotation */}
                  {/* Left Reel */}
                  <g transform="translate(64, 34)">
                    <circle cx="0" cy="0" r="14.5" fill="none" stroke="url(#splashGold)" strokeWidth="3.5" />
                    <circle cx="0" cy="0" r="4.5" fill="url(#splashGold)" />
                    <circle cx="0" cy="-7.5" r="2.2" fill="url(#splashGold)" />
                    <circle cx="-6.5" cy="4" r="2.2" fill="url(#splashGold)" />
                    <circle cx="6.5" cy="4" r="2.2" fill="url(#splashGold)" />
                  </g>

                  {/* Right Reel */}
                  <g transform="translate(93, 34)">
                    <circle cx="0" cy="0" r="14.5" fill="none" stroke="url(#splashGold)" strokeWidth="3.5" />
                    <circle cx="0" cy="0" r="4.5" fill="url(#splashGold)" />
                    <circle cx="0" cy="-7.5" r="2.2" fill="url(#splashGold)" />
                    <circle cx="-6.5" cy="4" r="2.2" fill="url(#splashGold)" />
                    <circle cx="6.5" cy="4" r="2.2" fill="url(#splashGold)" />
                  </g>

                  {/* Connecting Loop */}
                  <path d="M64 20 Q78.5 25 93 20" fill="none" stroke="url(#splashGold)" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Projector Body Chassis */}
                  <rect x="52" y="49" width="46" height="30" rx="5" fill="url(#splashGold)" />
                  <line x1="58" y1="56" x2="72" y2="56" stroke="#12121A" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="58" y1="62" x2="72" y2="62" stroke="#12121A" strokeWidth="2.2" strokeLinecap="round" />
                  <circle cx="85" cy="64" r="5" fill="#12121A" />
                  <circle cx="85" cy="64" r="2.5" fill="url(#splashGold)" />

                  {/* Projector Lens & Radiant Light Cone */}
                  <polygon points="98,54 113,46 113,76 98,68" fill="url(#splashGold)" />
                  <polygon points="113,48 126,41 126,81 113,74" fill="url(#splashBeam)" />
                </svg>
              </div>
            </div>

            {/* Typography */}
            <div className="space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl sm:text-5xl font-display font-black tracking-widest text-white flex items-center justify-center gap-1 leading-none"
              >
                CINE<span className="text-[#D4AF37] drop-shadow-[0_0_20px_rgba(212,175,55,0.7)]">VERSE</span>
              </motion.h1>

              {/* Subtitle with gold line accents */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="flex items-center justify-center gap-3 text-xs sm:text-sm font-bold tracking-[0.35em] text-[#D4AF37] uppercase"
              >
                <span className="w-8 h-[1px] bg-gradient-to-r from-transparent to-[#D4AF37]" />
                <span>MULTIPLEX</span>
                <span className="w-8 h-[1px] bg-gradient-to-l from-transparent to-[#D4AF37]" />
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-[10px] tracking-[0.25em] text-zinc-400 uppercase pt-1"
              >
                In-Seat Food Concession
              </motion.p>
            </div>

            {/* 2-Second Cinematic Progress Bar */}
            <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden mt-6 border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-[#B8861B] via-[#FFE79A] to-[#D4AF37] transition-all duration-75 shadow-[0_0_10px_rgba(212,175,55,0.8)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>

          {/* Quick Skip button in bottom corner */}
          <div className="absolute bottom-6 right-6 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFinish();
              }}
              className="px-3.5 py-1.5 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-[#D4AF37]/50 text-zinc-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all backdrop-blur-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Skip Intro</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
