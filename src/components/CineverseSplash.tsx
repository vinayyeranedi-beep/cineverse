import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CineverseLogo } from './CineverseLogo';
import { Sparkles, Film } from 'lucide-react';

interface CineverseSplashProps {
  onComplete: () => void;
}

export const CineverseSplash: React.FC<CineverseSplashProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 400); // Wait for exit transition
    }, 1600); // 1.6 seconds splash display

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 bg-[#0B0B0F] flex flex-col items-center justify-center p-4 overflow-hidden"
        >
          {/* Ambient Gold Glow Background */}
          <div className="absolute w-[300px] h-[300px] rounded-full bg-[#D4AF37]/10 blur-[100px] pointer-events-none animate-pulse" />

          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center space-y-6 z-10"
          >
            {/* Large Animated Logo Icon */}
            <motion.div
              animate={{ rotate: [0, 3, -3, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="w-24 h-24 rounded-3xl bg-[#15151C] border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] shadow-[0_0_50px_rgba(212,175,55,0.4)] p-4"
            >
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g transform="translate(2, 10)">
                  <polygon points="0,5 20,25 0,45" opacity="0.6" />
                  <polygon points="15,5 35,25 15,45" />
                </g>
                <g transform="translate(42, 15)">
                  <circle cx="12" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="5" />
                  <circle cx="32" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="5" />
                  <circle cx="12" cy="10" r="2" />
                  <circle cx="32" cy="10" r="2" />
                  <rect x="5" y="22" width="35" height="26" rx="5" />
                  <polygon points="40,26 52,20 52,44 40,38" />
                </g>
              </svg>
            </motion.div>

            <div className="space-y-2">
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-3xl sm:text-4xl font-display font-black tracking-widest text-white"
              >
                CINE<span className="text-[#D4AF37]">VERSE</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, letterSpacing: '0.1em' }}
                animate={{ opacity: 1, letterSpacing: '0.3em' }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="text-xs sm:text-sm font-bold text-[#D4AF37] uppercase"
              >
                MULTIPLEX CINEMA DINING
              </motion.p>
            </div>

            {/* Loading shimmer bar */}
            <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden mt-4">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="w-full h-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
