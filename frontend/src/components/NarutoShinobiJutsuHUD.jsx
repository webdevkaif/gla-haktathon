import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Flame, 
  Zap, 
  ShieldCheck, 
  Bot, 
  Smartphone, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  Users, 
  Scroll, 
  Compass,
  CheckCircle2,
  RefreshCw,
  Box,
  Film
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import Naruto3DCanvas from './Naruto3DCanvas';

export default function NarutoShinobiJutsuHUD({
  summary,
  budget,
  forecast,
  onToggleChat,
  onTogglePhoneAlerts,
  onNavigateTab
}) {
  const [activeJutsu, setActiveJutsu] = useState('RASENGAN'); // 'RASENGAN', 'RASENSHURIKEN', 'KURAMA', 'CHIDORI', 'CLONES', 'SAGE'
  const [displayMode, setDisplayMode] = useState('3D'); // '3D' or 'CINEMATIC'
  const [isChakraActive, setIsChakraActive] = useState(true);
  const [rasenganCharging, setRasenganCharging] = useState(false);
  const [cloneBurst, setCloneBurst] = useState(false);
  const [chakraLevel, setChakraLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Periodic chakra flux animation
  useEffect(() => {
    if (!isChakraActive) return;
    const interval = setInterval(() => {
      setChakraLevel(prev => (prev === 100 ? 98 : 100));
    }, 3000);
    return () => clearInterval(interval);
  }, [isChakraActive]);

  // Trigger Rasengan Energy Surge Blast
  const triggerRasenganSurge = () => {
    setRasenganCharging(true);
    setTimeout(() => {
      setRasenganCharging(false);
    }, 1200);
  };

  // Trigger Shadow Clone Jutsu (Kage Bunshin)
  const triggerShadowClones = () => {
    setActiveJutsu('CLONES');
    setCloneBurst(true);
    setTimeout(() => {
      setCloneBurst(false);
    }, 2500);
  };

  const pct = summary?.percentage_used || 0;

  return (
    <div className={`relative rounded-3xl border-2 border-amber-500/50 bg-[#080d1a] shadow-[0_0_70px_rgba(245,158,11,0.25)] overflow-hidden transition-all duration-500 ${
      isFullscreen ? 'fixed inset-4 z-50 rounded-2xl flex flex-col' : 'w-full'
    }`}>
      
      {/* Mode Switcher Pill & Telemetry Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-[#050811] border-b border-amber-500/20 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="font-mono font-extrabold text-amber-300 tracking-wider">
            SHINOBI CHAKRA ENGINE
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400">
            • REAL-TIME 3D PARTICLE VORTEX
          </span>
        </div>

        {/* 3D vs 2D Mode Switcher */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/80 border border-amber-500/40 shadow-inner">
          <button 
            onClick={() => setDisplayMode('3D')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              displayMode === '3D' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_14px_rgba(6,182,212,0.6)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D WebGL Canvas</span>
          </button>
          <button 
            onClick={() => setDisplayMode('CINEMATIC')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              displayMode === 'CINEMATIC' 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.6)]' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>2D Shinobi Anime</span>
          </button>
        </div>
      </div>

      {/* Shinobi Banner Stream Container */}
      <div className={`relative w-full overflow-hidden select-none ${
        isFullscreen ? 'flex-1 min-h-0' : 'aspect-[16/9] sm:aspect-[21/9] min-h-[420px] sm:min-h-[490px]'
      }`}>
        
        {displayMode === '3D' ? (
          /* Real-Time Interactive 3D WebGL Three.js Canvas */
          <div className="w-full h-full relative">
            <Naruto3DCanvas 
              activeJutsu={activeJutsu} 
              onJutsuChange={setActiveJutsu} 
            />
          </div>
        ) : (
          /* 2D Cinematic Naruto Kurama Artwork Banner */
          <>
            {/* Naruto Kurama & Sage Mode Hero Background Image */}
            <div 
              className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
                isChakraActive ? 'animate-kurama-aura' : ''
              }`}
              style={{ backgroundImage: `url('/naruto_chakra_pilot.jpg')` }}
            />

            {/* Ambient Dark Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-transparent to-black/70 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070b14]/90 via-transparent to-[#070b14]/75 pointer-events-none" />

            {/* Top Jutsu Video Overlay Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 sm:p-5 flex items-center justify-between text-xs z-20 pointer-events-none">
              
              {/* Top Left: Ninja Headband & Shinobi Village Callout */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-black/75 border border-amber-500/40 backdrop-blur-xl shadow-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="font-mono font-extrabold text-amber-300 text-[11px] tracking-wider uppercase">
                    木ノ葉隠れ // LEAF VILLAGE SHINOBI
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">RANK: S-CLASS HOKAGE</span>
                </div>

                <span className="hidden md:inline-flex text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-orange-950/60 border border-orange-500/30 text-orange-300">
                  🦊 九尾 KURAMA CHAKRA // MODE ACTIVE
                </span>
              </div>

              {/* Top Right: Chakra Gauge & Japanese Jutsu Header */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-[11px] font-mono font-bold text-amber-300 tracking-wider">
                    忍道自律金融 // SHINOBI FINANCE
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    CHAKRA SYNC: {chakraLevel}% • SAGE SENSE
                  </span>
                </div>

                {/* Glowing Golden Chakra Embers Bar */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-black/75 border border-amber-500/30 backdrop-blur-xl">
                  <Flame className="w-4 h-4 text-orange-400 animate-bounce" />
                  <div className="w-16 h-2 rounded-full bg-black/60 overflow-hidden border border-amber-500/40">
                    <div className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 rounded-full animate-pulse w-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Spinning Rasengan Vortex Overlay (Positioned around Naruto's Hand) */}
            <div 
              onClick={triggerRasenganSurge}
              title="Click to unleash Rasengan Chakra Burst!"
              className="absolute left-[20%] sm:left-[24%] top-[22%] sm:top-[25%] -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer pointer-events-auto group"
            >
              {/* Swirling Outer Rasengan Chakra Orb */}
              <div className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center transition-transform duration-300 ${
                rasenganCharging ? 'scale-125' : 'group-hover:scale-110'
              }`}>
                {/* Spinning Outer Ring with Blue Flame Glow */}
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/80 animate-rasengan-outer opacity-80 shadow-[0_0_50px_rgba(6,182,212,0.9)]"></div>
                
                {/* Spinning Inner Vortex */}
                <div className="absolute inset-2 rounded-full border-2 border-blue-400/90 animate-rasengan-inner opacity-90 shadow-[inset_0_0_30px_#38bdf8]"></div>
                
                {/* Core Dense Blue Energy Sphere */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-cyan-300 via-blue-500 to-sky-200 shadow-[0_0_40px_#38bdf8,inset_0_0_20px_#ffffff] flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white animate-chakra-lightning" />
                </div>

                {/* Lightning Sparks */}
                <div className="absolute -top-3 -right-2 text-cyan-300 animate-chakra-lightning text-xs font-mono font-bold">
                  ⚡ 螺旋丸
                </div>
              </div>

              {/* Rasengan Interactive Tooltip Label */}
              <div className="text-center mt-1">
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-black/80 text-cyan-300 border border-cyan-400/50 shadow-md">
                  {rasenganCharging ? '💥 RASENGAN BURST!' : '🌀 Tap to Trigger Rasengan'}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Shadow Clone Jutsu (Kage Bunshin) Poof Smoke & Clone Cards */}
        {cloneBurst && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-clone-poof pointer-events-auto">
            <div className="max-w-2xl w-full p-6 rounded-3xl bg-gradient-to-br from-amber-950/70 via-black/90 to-blue-950/70 border-2 border-amber-400/70 shadow-[0_0_80px_rgba(245,158,11,0.6)] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-amber-400/30">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💨</span>
                  <div>
                    <h3 className="font-extrabold text-amber-300 text-lg">
                      影分身の術 // KAGE BUNSHIN NO JUTSU ACTIVATED!
                    </h3>
                    <p className="text-xs text-slate-300">4 Autonomous Shinobi Clones Auditing Cashflow in Parallel</p>
                  </div>
                </div>
                <button
                  onClick={() => setCloneBurst(false)}
                  className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono text-xs"
                >
                  Dismiss Clones
                </button>
              </div>

              {/* 4 Clones Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-black/60 border border-cyan-400/30 space-y-1">
                  <div className="flex items-center justify-between text-cyan-300 font-bold">
                    <span>👥 Shadow Clone #1</span>
                    <span className="text-[10px] text-cyan-400">Rasengan Shield</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Capping daily burn rate at ₹185/day to defend against overdraft.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-black/60 border border-purple-400/30 space-y-1">
                  <div className="flex items-center justify-between text-purple-300 font-bold">
                    <span>👥 Shadow Clone #2</span>
                    <span className="text-[10px] text-purple-400">Byakugan OCR Audit</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Inspecting 4 uploaded invoices. Flagged Starbucks pricing anomaly.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-black/60 border border-amber-400/30 space-y-1">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span>👥 Shadow Clone #3</span>
                    <span className="text-[10px] text-amber-400">Kurama Chakra Flow</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Monthly budget pace: 102.2% consumed. Temporary dining freeze active.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-black/60 border border-emerald-400/30 space-y-1">
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span>👥 Shadow Clone #4</span>
                    <span className="text-[10px] text-emerald-400">Shinobi Scroll Roadmap</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Synthesizing 90-day wealth roadmap targeting +₹15,000 preserved capital.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Left Side: Shinobi Telemetry & Scroll Status Widget */}
        <div className="absolute left-4 sm:left-6 bottom-20 z-20 max-w-xs space-y-2 pointer-events-auto">
          <div className="px-4 py-3 rounded-2xl bg-black/75 border border-amber-500/40 backdrop-blur-xl shadow-xl space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-amber-300 flex items-center gap-1.5 uppercase font-mono">
                <Scroll className="w-3.5 h-3.5 text-amber-400" />
                SHINOBI FINANCIAL SCROLL
              </span>
              <span className="text-emerald-400 text-[10px] font-mono">SAGE MODE</span>
            </div>

            {/* Ninja Stats */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between items-center text-slate-300">
                <span>Chakra Velocity:</span>
                <span className="font-bold text-amber-300 font-mono">
                  {formatCurrency(summary?.total_spent || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Safe Daily Allowance:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {formatCurrency(summary?.daily_budget_remaining || 0)}/day
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>90-Day Preserved Goal:</span>
                <span className="font-bold text-cyan-300 font-mono">+₹15,000</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 border-t border-white/10 pt-1.5 leading-tight">
              ⚡ Rasengan Defense active: Discretionary dining and high-risk spending buffered.
            </p>
          </div>
        </div>

        {/* Right Side: Ninja Jutsu Selection Hand Signs Bar */}
        <div className="absolute right-4 sm:right-6 bottom-20 z-20 flex flex-col gap-3 pointer-events-auto">
          {/* Jutsu 1: Rasengan */}
          <button
            onClick={() => {
              setActiveJutsu('RASENGAN');
              triggerRasenganSurge();
            }}
            className={`px-4.5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all text-left flex items-center gap-3 backdrop-blur-xl ${
              activeJutsu === 'RASENGAN'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-105'
                : 'bg-black/70 text-slate-400 hover:text-white border border-white/10 hover:border-white/30'
            }`}
          >
            <Zap className="w-4 h-4 text-cyan-300" />
            <span>螺旋丸 // RASENGAN SHIELD</span>
          </button>

          {/* Jutsu 2: Shadow Clones */}
          <button
            onClick={triggerShadowClones}
            className={`px-4.5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all text-left flex items-center gap-3 backdrop-blur-xl ${
              activeJutsu === 'CLONES'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border border-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.6)] scale-105'
                : 'bg-black/70 text-slate-400 hover:text-white border border-white/10 hover:border-white/30'
            }`}
          >
            <Users className="w-4 h-4 text-purple-300" />
            <span>影分身 // SHADOW CLONES</span>
          </button>

          {/* Jutsu 3: Kurama Chakra Mode */}
          <button
            onClick={() => setActiveJutsu('KURAMA')}
            className={`px-4.5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all text-left flex items-center gap-3 backdrop-blur-xl ${
              activeJutsu === 'KURAMA'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] scale-105'
                : 'bg-black/70 text-slate-400 hover:text-white border border-white/10 hover:border-white/30'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-300" />
            <span>九尾 // KURAMA FLAME</span>
          </button>

          {/* Jutsu 4: Sage Mode Roadmap */}
          <button
            onClick={() => {
              setActiveJutsu('SAGE');
              if (onNavigateTab) onNavigateTab('invoices');
            }}
            className={`px-4.5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all text-left flex items-center gap-3 backdrop-blur-xl ${
              activeJutsu === 'SAGE'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.6)] scale-105'
                : 'bg-black/70 text-slate-400 hover:text-white border border-white/10 hover:border-white/30'
            }`}
          >
            <Scroll className="w-4 h-4 text-emerald-300" />
            <span>仙人 // ROADMAP SCROLL</span>
          </button>
        </div>

      </div>

      {/* Shinobi Bottom Action Bar */}
      <div className="relative z-30 p-3 sm:p-4 bg-[#0a101f]/95 border-t-2 border-amber-500/40 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Playback & Chakra Control */}
        <div className="flex items-center gap-2">
          {/* Pause / Play Chakra Aura */}
          <button
            onClick={() => setIsChakraActive(prev => !prev)}
            title={isChakraActive ? "Pause Chakra Aura" : "Ignite Chakra Aura"}
            className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/40 transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)]"
          >
            {isChakraActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Trigger Jutsu Surge Button */}
          <button
            onClick={triggerRasenganSurge}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono glass-btn text-cyan-300 border border-cyan-400/40 hover:border-cyan-400/70 transition-all shadow-md"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>UNLEASH RASENGAN</span>
          </button>

          {/* Shadow Clone Burst Button */}
          <button
            onClick={triggerShadowClones}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono glass-btn text-purple-300 border border-purple-400/40 hover:border-purple-400/70 transition-all shadow-md"
          >
            <Users className="w-3.5 h-3.5" />
            <span>SHADOW CLONES (4X)</span>
          </button>
        </div>

        {/* Center Shinobi Code Ticker */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-amber-500/20 text-[11px] font-mono text-amber-200">
          <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>SHINOBI CHAKRA RUNTIME: RASENGAN DEFENSE ENGAGED • OVERDRAFT SHIELD ACTIVE</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Phone Alert Button */}
          <button
            onClick={onTogglePhoneAlerts}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-btn text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/60 font-semibold text-xs transition-all shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phone Alerts</span>
          </button>

          {/* Talk with Shinobi Copilot */}
          <button
            onClick={onToggleChat}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-xs shadow-lg shadow-orange-500/40 hover:scale-105 transition-all"
          >
            <Bot className="w-4 h-4 animate-bounce" />
            <span>Talk to Shinobi AI</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Shinobi View"}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-btn transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

      </div>

    </div>
  );
}
