import React from 'react';

interface CineverseLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showSubtitle?: boolean;
  subtitle?: string;
  layout?: 'horizontal' | 'vertical' | 'icon-only';
}

export const CineverseLogo: React.FC<CineverseLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  subtitle = 'MULTIPLEX',
  layout = 'horizontal',
}) => {
  const displayName = 'Cineverse';
  const displaySubtitle = subtitle;

  const iconSizes = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32',
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm tracking-wide',
    md: 'text-lg sm:text-xl tracking-wider',
    lg: 'text-2xl sm:text-3xl tracking-widest',
    xl: 'text-3xl sm:text-4xl tracking-widest',
    '2xl': 'text-4xl sm:text-5xl tracking-widest',
  };

  const subtitleSizes = {
    xs: 'text-[7px] tracking-[0.2em]',
    sm: 'text-[9px] tracking-[0.25em]',
    md: 'text-[11px] tracking-[0.3em]',
    lg: 'text-xs tracking-[0.35em]',
    xl: 'text-sm tracking-[0.4em]',
    '2xl': 'text-base tracking-[0.45em]',
  };

  const isVertical = layout === 'vertical';
  const isIconOnly = layout === 'icon-only';

  return (
    <div
      className={`inline-flex ${
        isVertical ? 'flex-col items-center text-center gap-3' : 'items-center gap-3'
      } ${className}`}
    >
      {/* Fixed Official Cineverse Vector Projector Emblem */}
      <div
        className={`${iconSizes[size]} relative rounded-2xl bg-[#15151C] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] shadow-[0_0_24px_rgba(212,175,55,0.3)] shrink-0 p-1 sm:p-1.5 overflow-hidden group-hover:border-[#D4AF37] transition-all`}
      >
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
              {/* Metallic Gold Gradient */}
              <linearGradient id="cvLogoGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF2A8" />
                <stop offset="25%" stopColor="#E5B942" />
                <stop offset="55%" stopColor="#D4AF37" />
                <stop offset="85%" stopColor="#B8861B" />
                <stop offset="100%" stopColor="#7B570A" />
              </linearGradient>

              {/* Radiant Beam Gradient */}
              <linearGradient id="cvLogoBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FFF5B8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Double Play Chevrons (Left Flank) */}
            <polygon
              points="14,38 32,60 14,82 23,82 41,60 23,38"
              fill="url(#cvLogoGold)"
              opacity="0.65"
            />
            <polygon
              points="27,38 45,60 27,82 36,82 54,60 36,38"
              fill="url(#cvLogoGold)"
            />

            {/* Dual Film Reels */}
            {/* Left Reel */}
            <g transform="translate(64, 34)">
              <circle cx="0" cy="0" r="14.5" fill="none" stroke="url(#cvLogoGold)" strokeWidth="3.5" />
              <circle cx="0" cy="0" r="4.5" fill="url(#cvLogoGold)" />
              <circle cx="0" cy="-7.5" r="2.2" fill="url(#cvLogoGold)" />
              <circle cx="-6.5" cy="4" r="2.2" fill="url(#cvLogoGold)" />
              <circle cx="6.5" cy="4" r="2.2" fill="url(#cvLogoGold)" />
            </g>

            {/* Right Reel */}
            <g transform="translate(93, 34)">
              <circle cx="0" cy="0" r="14.5" fill="none" stroke="url(#cvLogoGold)" strokeWidth="3.5" />
              <circle cx="0" cy="0" r="4.5" fill="url(#cvLogoGold)" />
              <circle cx="0" cy="-7.5" r="2.2" fill="url(#cvLogoGold)" />
              <circle cx="-6.5" cy="4" r="2.2" fill="url(#cvLogoGold)" />
              <circle cx="6.5" cy="4" r="2.2" fill="url(#cvLogoGold)" />
            </g>

            {/* Connecting Film Strip */}
            <path
              d="M64 20 Q78.5 25 93 20"
              fill="none"
              stroke="url(#cvLogoGold)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Projector Chassis */}
            <rect x="52" y="49" width="46" height="30" rx="5" fill="url(#cvLogoGold)" />
            <line x1="58" y1="56" x2="72" y2="56" stroke="#15151C" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="58" y1="62" x2="72" y2="62" stroke="#15151C" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="85" cy="64" r="5" fill="#15151C" />
            <circle cx="85" cy="64" r="2.5" fill="url(#cvLogoGold)" />

            {/* Projector Lens & Light Cone */}
            <polygon points="98,54 113,46 113,76 98,68" fill="url(#cvLogoGold)" />
            <polygon points="113,48 119,45 119,77 113,74" fill="url(#cvLogoBeam)" />
          </svg>
      </div>

      {!isIconOnly && (
        <div className={isVertical ? 'text-center' : 'text-left'}>
          {/* Primary Wordmark */}
          <div className="flex items-center justify-center leading-none">
            {displayName.toLowerCase() === 'cineverse' ? (
              <span className={`font-display font-black text-white ${textSizes[size]}`}>
                CINE<span className="text-[#D4AF37]">VERSE</span>
              </span>
            ) : (
              <span className={`font-display font-black text-white ${textSizes[size]}`}>
                {displayName}
              </span>
            )}
          </div>

          {/* Subtitle */}
          {showSubtitle && (
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span
                className={`font-bold text-[#D4AF37] uppercase block ${subtitleSizes[size]}`}
              >
                {displaySubtitle}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


