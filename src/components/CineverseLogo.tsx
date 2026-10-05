import React from 'react';

interface CineverseLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const CineverseLogo: React.FC<CineverseLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Exact CINEVERSE Logo Icon (Double Play Chevrons + Film Projector) */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-[#15151C] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] shrink-0 p-1.5`}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Double Play Chevrons */}
          <g transform="translate(2, 10)">
            <polygon points="0,5 20,25 0,45" opacity="0.6" />
            <polygon points="15,5 35,25 15,45" />
          </g>
          {/* Film Projector Icon */}
          <g transform="translate(42, 15)">
            {/* Dual Reels */}
            <circle cx="12" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="5" />
            <circle cx="32" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="5" />
            <circle cx="12" cy="10" r="2" />
            <circle cx="32" cy="10" r="2" />
            {/* Camera Body */}
            <rect x="5" y="22" width="35" height="26" rx="5" />
            {/* Lens / Shutter */}
            <polygon points="40,26 52,20 52,44 40,38" />
          </g>
        </svg>
      </div>

      <div>
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-display font-black tracking-wider text-white ${textSizes[size]}`}>
            CINE<span className="text-[#D4AF37]">VERSE</span>
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] sm:text-xs text-[#D4AF37] font-bold tracking-[0.25em] uppercase mt-1 block">
            MULTIPLEX
          </span>
        )}
      </div>
    </div>
  );
};
