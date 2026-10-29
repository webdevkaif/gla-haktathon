import React, { useState } from 'react';
import confetti from 'canvas-confetti';

export function GhibliSootSprite({ size = 20, isHappy = false }) {
  return (
    <div 
      className={`relative inline-block transition-transform duration-300 ${
        isHappy ? 'scale-125 -translate-y-1' : ''
      }`}
      style={{ width: size, height: size }}
    >
      {/* Fluffy fuzzy black soot body */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full fill-slate-950 animate-ghibli-soot drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
      >
        {/* Furry spike perimeter */}
        <path d="M50 5 Q55 20 65 10 Q68 25 80 18 Q78 32 92 30 Q84 42 98 48 Q85 58 95 68 Q80 72 85 85 Q72 82 70 95 Q58 86 50 98 Q42 86 30 95 Q28 82 15 85 Q20 72 5 68 Q15 58 2 48 Q16 42 8 30 Q22 32 20 18 Q32 25 35 10 Q45 20 50 5 Z" />
        
        {/* Left Eye */}
        <circle cx="38" cy="46" r="14" fill="#ffffff" />
        {/* Right Eye */}
        <circle cx="62" cy="46" r="14" fill="#ffffff" />
        
        {/* Animated Blinking Pupils */}
        <g className="animate-ghibli-blink">
          <circle cx={isHappy ? 40 : 39} cy="46" r="6" fill="#0f172a" />
          <circle cx={isHappy ? 42 : 41} cy="44" r="2.5" fill="#ffffff" />
          
          <circle cx={isHappy ? 64 : 63} cy="46" r="6" fill="#0f172a" />
          <circle cx={isHappy ? 66 : 65} cy="44" r="2.5" fill="#ffffff" />
        </g>

        {/* Rosy cheeks when happy */}
        {isHappy && (
          <>
            <circle cx="28" cy="58" r="5" fill="#f43f5e" opacity="0.75" />
            <circle cx="72" cy="58" r="5" fill="#f43f5e" opacity="0.75" />
          </>
        )}
      </svg>
    </div>
  );
}

export default function GhibliButton({
  children,
  onClick,
  variant = 'forest', // 'forest', 'sunset', 'sky', 'parchment'
  className = '',
  icon: Icon,
  showSprite = true,
  spritePosition = 'right', // 'left', 'right', 'top'
  disabled = false,
  title = '',
  type = 'button'
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  // Variant class mapping
  const variantClass = {
    forest: 'ghibli-btn-forest',
    sunset: 'ghibli-btn-sunset',
    sky: 'ghibli-btn-sky',
    parchment: 'ghibli-btn-parchment',
  }[variant] || 'ghibli-btn-forest';

  const handleClick = (e) => {
    if (disabled) return;
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 400);

    // Ghibli Pastel Star Candy / Blossom Spores Confetti
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 16,
        spread: 45,
        startVelocity: 18,
        origin: { x, y },
        colors: ['#86efac', '#fde047', '#f472b6', '#38bdf8', '#fb923c', '#ffffff'],
        shapes: ['circle'],
        scalar: 0.7,
        ticks: 50,
      });
    } catch {
      // Confetti fallback
    }

    if (onClick) onClick(e);
  };

  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`ghibli-btn ${variantClass} relative group select-none px-4 py-2.5 text-xs sm:text-sm gap-2 ${
        isClicked ? 'scale-95' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {/* Left Soot Sprite */}
      {showSprite && spritePosition === 'left' && (
        <span className="shrink-0 -ml-1">
          <GhibliSootSprite size={20} isHappy={isHovered || isClicked} />
        </span>
      )}

      {/* Top Floating Soot Sprite Peeker */}
      {showSprite && spritePosition === 'top' && (
        <div className="absolute -top-3.5 right-3 transition-all duration-300 transform group-hover:-translate-y-1">
          <GhibliSootSprite size={22} isHappy={isHovered || isClicked} />
        </div>
      )}

      {/* Optional Leading Icon */}
      {Icon && <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />}

      {/* Button Content */}
      <span className="relative z-10 flex items-center gap-1.5 font-bold tracking-tight">
        {children}
      </span>

      {/* Right Soot Sprite */}
      {showSprite && spritePosition === 'right' && (
        <span className="shrink-0 -mr-1">
          <GhibliSootSprite size={20} isHappy={isHovered || isClicked} />
        </span>
      )}

      {/* Subtle Watercolor Sun-dapple Sheen on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/25 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </button>
  );
}
