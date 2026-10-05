import React, { useEffect, useState } from 'react';
import { Film, Sparkles, ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onDismiss: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onDismiss }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Auto-dismiss splash screen after 1.8 seconds
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(onDismiss, 400);
    }, 1800);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleSkip = () => {
    setFading(true);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0B0F] text-white transition-opacity duration-400 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#E50914]/10 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-sm">
        {/* Gold on Black Logo */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-[#15151C] border-2 border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.25)] flex items-center justify-center">
            <Film className="w-10 h-10 text-[#D4AF37]" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#E50914] flex items-center justify-center shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        <h1 className="font-display font-black text-4xl tracking-wider text-white">
          SEAT<span className="text-[#D4AF37]">SERVE</span>
        </h1>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37] mt-1">
          Cinema In-Seat Dining
        </p>

        <p className="text-sm text-[#A1A1AA] mt-4 leading-relaxed">
          Scan your seat QR, order snacks, and enjoy uninterrupted cinema delivery.
        </p>

        <button
          onClick={handleSkip}
          className="mt-8 px-6 py-2.5 rounded-full bg-[#15151C] hover:bg-[#1f1f2a] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-2 hover:border-[#D4AF37]"
        >
          <span>Enter Cinema</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="absolute bottom-6 text-[11px] text-[#A1A1AA]/60">
        SeatServe • Premium QR Cinema Dining
      </div>
    </div>
  );
};
