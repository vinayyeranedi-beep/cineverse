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
            {/* Official Cineverse Multiplex Logo */}
            <CineverseLogo
              layout="vertical"
              size="xl"
              showSubtitle={true}
              subtitle="MULTIPLEX CINEMA DINING"
              className="drop-shadow-[0_0_35px_rgba(212,175,55,0.4)]"
            />

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
