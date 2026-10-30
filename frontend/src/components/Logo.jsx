import React from 'react';

export default function Logo({ size = 'md', showSubtitle = true, className = '' }) {
  const sizeClasses = {
    sm: {
      emblem: 'w-7 h-7',
      text: 'text-base',
      badge: 'text-[9px] px-1.5 py-0.5',
      sub: 'text-[10px]'
    },
    md: {
      emblem: 'w-9 h-9',
      text: 'text-lg',
      badge: 'text-[10px] px-2 py-0.5',
      sub: 'text-[11px]'
    },
    lg: {
      emblem: 'w-12 h-12',
      text: 'text-2xl',
      badge: 'text-xs px-2.5 py-1',
      sub: 'text-xs'
    }
  }[size] || {
    emblem: 'w-9 h-9',
    text: 'text-lg',
    badge: 'text-[10px] px-2 py-0.5',
    sub: 'text-[11px]'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Minimalist Geometric Pilot Crest */}
      <div className={`relative flex items-center justify-center ${sizeClasses.emblem} rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-800 shadow-[0_0_24px_rgba(139,92,246,0.35)] border border-violet-400/30 backdrop-blur-xl group`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5/6 h-5/6 transform transition-transform duration-300 group-hover:scale-110"
        >
          {/* Outer aerodynamic facet */}
          <path
            d="M16 3L27 12L16 29L5 12L16 3Z"
            fill="url(#pilot-glow)"
            fillOpacity="0.35"
            stroke="url(#pilot-border)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Inner forward vector wing */}
          <path
            d="M16 6L23 13L16 24L9 13L16 6Z"
            fill="url(#pilot-core)"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Core pulsing focus node */}
          <circle cx="16" cy="14" r="2.2" fill="#FFFFFF" />
          <circle cx="16" cy="14" r="4.2" stroke="#A78BFA" strokeWidth="0.8" strokeOpacity="0.8" />

          <defs>
            <linearGradient id="pilot-glow" x1="5" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8B5CF6" />
              <stop offset="0.5" stopColor="#6366F1" />
              <stop offset="1" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="pilot-border" x1="5" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
              <stop stopColor="#C4B5FD" />
              <stop offset="1" stopColor="#818CF8" />
            </linearGradient>
            <linearGradient id="pilot-core" x1="9" y1="6" x2="23" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7C3AED" />
              <stop offset="1" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
        </svg>

        {/* Live Status Beacon */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950" />
        </span>
      </div>

      {/* Typography & Subtitle */}
      <div>
        <div className="flex items-center gap-2">
          <span className={`font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent ${sizeClasses.text}`}>
            Expense<span className="text-violet-400 font-extrabold">Pilot</span>
          </span>
          <span className={`uppercase font-bold tracking-wider rounded-lg bg-violet-500/15 border border-violet-400/30 text-violet-300 shadow-[0_0_12px_rgba(139,92,246,0.25)] ${sizeClasses.badge}`}>
            AI
          </span>
        </div>
        {showSubtitle && (
          <p className={`text-slate-400 font-medium tracking-normal ${sizeClasses.sub}`}>
            Autonomous Financial Intelligence
          </p>
        )}
      </div>
    </div>
  );
}

