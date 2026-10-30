import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  FileText, 
  TrendingUp, 
  Maximize2, 
  Minimize2, 
  Radio, 
  Cpu, 
  Zap, 
  Smartphone,
  Flame,
  Activity
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function AnimeAgentCinemaHUD({ 
  summary, 
  budget, 
  forecast, 
  onToggleChat, 
  onTogglePhoneAlerts, 
  onNavigateTab 
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [activeMode, setActiveMode] = useState('DEFENSE'); // 'DEFENSE', 'INVOICE_SCAN', 'ROADMAP'
  const [recSeconds, setRecSeconds] = useState(142);
  const [glitchActive, setGlitchActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Video recording timer increment
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setRecSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Occasional cyber glitch effect simulation
  useEffect(() => {
    if (!isPlaying) return;
    const glitchInterval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 350);
    }, 8000);
    return () => clearInterval(glitchInterval);
  }, [isPlaying]);

  // Format seconds to HH:MM:SS:FF
  const formatRecTime = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    const frames = Math.floor((totalSec * 24) % 24).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}:${frames}`;
  };

  const pct = summary?.percentage_used || 0;
  const isBudgetExceeded = pct >= 100;

  return (
    <div className={`relative rounded-3xl border border-cyan-500/40 bg-[#060a15] shadow-[0_0_60px_rgba(6,182,212,0.25)] overflow-hidden transition-all duration-500 ${
      isFullscreen ? 'fixed inset-4 z-50 rounded-2xl flex flex-col' : 'w-full'
    }`}>
      
      {/* Video Stream Main Container */}
      <div className={`relative w-full overflow-hidden select-none ${
        isFullscreen ? 'flex-1 min-h-0' : 'aspect-[16/9] sm:aspect-[21/9] min-h-[360px] sm:min-h-[440px]'
      }`}>
        
        {/* Background Anime Character Image with Breathing Motion */}
        <div 
          className={`absolute inset-0 bg-cover bg-center transition-transform duration-700 ${
            isPlaying ? 'animate-anime-float' : ''
          } ${glitchActive ? 'animate-anime-glitch' : ''}`}
          style={{ backgroundImage: `url('/anime_agent_hud.jpg')` }}
        />

        {/* Cinematic Vignette & Color Grading Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060a15] via-transparent to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#060a15]/90 via-transparent to-[#060a15]/70 pointer-events-none" />

        {/* CRT Scanline Moving Animation */}
        {isPlaying && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            <div className="w-full h-24 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-anime-scanline"></div>
          </div>
        )}

        {/* Top Video Overlay Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 sm:p-5 flex items-center justify-between text-xs z-20 pointer-events-none">
          
          {/* Top Left: REC status & Live Timestamp */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md">
              <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`} />
              <span className="font-mono font-bold text-rose-400 text-[11px] tracking-wider">
                {isPlaying ? 'LIVE // REC' : 'PAUSED'}
              </span>
              <span className="font-mono text-slate-300 text-[11px]">{formatRecTime(recSeconds)}</span>
            </div>

            <span className="hidden md:inline-flex text-[10px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-black/40 border border-white/5 text-cyan-300">
              4K UHD 60FPS • RAW-HDR
            </span>
          </div>

          {/* Top Right: Japanese Subtitle & Neural Sync Rate */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-[10px] font-mono text-cyan-300/90 tracking-widest uppercase">
                自律型財務知能 // PILOT-AI
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                QUANTUM RUNTIME // SYNC 99.8%
              </span>
            </div>

            {/* Simulated Live Audio Equalizer Bars */}
            <div className="flex items-end gap-1 h-6 px-2.5 py-1 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md">
              <span className={`w-1 bg-cyan-400 rounded-full ${isPlaying ? 'animate-eq-1' : 'h-2'}`} />
              <span className={`w-1 bg-pink-500 rounded-full ${isPlaying ? 'animate-eq-2' : 'h-3'}`} />
              <span className={`w-1 bg-emerald-400 rounded-full ${isPlaying ? 'animate-eq-3' : 'h-1.5'}`} />
              <span className={`w-1 bg-cyan-400 rounded-full ${isPlaying ? 'animate-eq-2' : 'h-4'}`} />
              <span className={`w-1 bg-violet-400 rounded-full ${isPlaying ? 'animate-eq-1' : 'h-2'}`} />
            </div>
          </div>
        </div>

        {/* Center Futuristic Targeting Reticle & Holographic Coordinates */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-70">
          <div className="relative w-44 h-44 sm:w-60 sm:h-60 rounded-full border border-cyan-500/20 flex items-center justify-center">
            {/* Rotating Radar Line */}
            {isPlaying && (
              <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400/60 animate-radar"></div>
            )}
            {/* Center Crosshair */}
            <div className="w-12 h-12 rounded-full border border-cyan-400/40 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]"></div>
            </div>
            {/* Cyber Corner Ticks */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></div>
          </div>
        </div>

        {/* Left Side: Cyber Anime Agent Telemetry Widget */}
        <div className="absolute left-4 sm:left-6 bottom-20 z-20 max-w-xs space-y-2 pointer-events-auto">
          <div className="px-3.5 py-2.5 rounded-2xl bg-black/65 border border-cyan-500/30 backdrop-blur-xl shadow-lg space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                NEURAL CYCLE
              </span>
              <span className="text-emerald-400 text-[10px] font-mono tracking-wider">ACTIVE</span>
            </div>

            {/* Cycle Flow: Observe -> Analyze -> Decide -> Act */}
            <div className="grid grid-cols-4 gap-1 text-[9px] font-mono font-bold text-center">
              <span className="px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">OBS</span>
              <span className="px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">ANA</span>
              <span className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">DEC</span>
              <span className="px-1 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-400/30">ACT</span>
            </div>

            <p className="text-[10px] text-slate-300 leading-tight">
              {activeMode === 'DEFENSE' 
                ? `Runway Defense Engaged • Velocity ${pct}% of cap`
                : activeMode === 'INVOICE_SCAN'
                ? `4 Invoices Audited • 1 Anomaly Isolated`
                : `90-Day Wealth Plan • +₹15,000 Target`}
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-[10px] font-mono text-slate-300">
            <span className="text-cyan-400">BURN:</span>
            <span>{formatCurrency(summary?.total_spent || 0)}</span>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-400">SAFE:</span>
            <span>{formatCurrency(summary?.daily_budget_remaining || 0)}/day</span>
          </div>
        </div>

        {/* Right Side: Mode Hologram Selector */}
        <div className="absolute right-4 sm:right-6 bottom-20 z-20 flex flex-col gap-3 pointer-events-auto">
          <button
            onClick={() => setActiveMode('DEFENSE')}
            className={`px-4.5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all text-left flex items-center gap-2.5 backdrop-blur-md ${
              activeMode === 'DEFENSE'
                ? 'bg-cyan-500/90 text-white border border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105'
                : 'bg-black/60 text-slate-400 hover:text-white border border-white/10 hover:border-white/30'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-cyan-300" />
            <span>01 // DEFENSE</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('INVOICE_SCAN');
              if (onNavigateTab) onNavigateTab('invoices');
            }}
            className={`px-4.5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all text-left flex items-center gap-2.5 backdrop-blur-md ${
              activeMode === 'INVOICE_SCAN'
                ? 'bg-purple-600/90 text-white border border-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.5)] scale-105'
                : 'bg-black/60 text-slate-400 hover:text-white border border-white/10 hover:border-white/30'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-300" />
            <span>02 // INVOICE OCR</span>
          </button>

          <button
            onClick={() => {
              setActiveMode('ROADMAP');
              if (onNavigateTab) onNavigateTab('invoices');
            }}
            className={`px-4.5 py-2.5 rounded-2xl text-xs font-mono font-bold transition-all text-left flex items-center gap-2.5 backdrop-blur-md ${
              activeMode === 'ROADMAP'
                ? 'bg-pink-600/90 text-white border border-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.5)] scale-105'
                : 'bg-black/60 text-slate-400 hover:text-white border border-white/10 hover:border-white/30'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-pink-300" />
            <span>03 // 90D ROADMAP</span>
          </button>
        </div>

      </div>

      {/* Futuristic Video Controller Bar (Bottom) */}
      <div className="relative z-30 p-3 sm:p-4 bg-[#0a1122]/95 border-t border-cyan-500/30 backdrop-blur-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Playback Controls & Status */}
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(prev => !prev)}
            title={isPlaying ? "Pause Video Motion" : "Play Video Motion"}
            className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-400/40 transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)]"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsAudioMuted(prev => !prev)}
            title={isAudioMuted ? "Unmute Audio" : "Mute Audio"}
            className="p-2.5 rounded-xl glass-btn text-slate-400 hover:text-white transition-all"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Glitch Trigger Button */}
          <button
            onClick={() => {
              setGlitchActive(true);
              setTimeout(() => setGlitchActive(false), 400);
            }}
            title="Trigger Neural Cyber Glitch"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-mono glass-btn text-pink-400 border border-pink-500/30 hover:border-pink-400/60"
          >
            <Zap className="w-3 h-3" />
            <span>CYBER GLITCH</span>
          </button>
        </div>

        {/* Center Live Ticker Subtitle */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-slate-300">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>AUTONOMOUS AGENT ACTIVE: MONITORING TRANSACTIONS & ANOMALIES IN REAL-TIME</span>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Phone Link Button */}
          <button
            onClick={onTogglePhoneAlerts}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-btn text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/60 font-semibold text-xs transition-all shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phone Alerts</span>
          </button>

          {/* Voice Chat Launch Button */}
          <button
            onClick={onToggleChat}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/30 hover:scale-105 transition-all"
          >
            <Bot className="w-4 h-4 animate-bounce" />
            <span>Talk to Anime Pilot</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            title={isFullscreen ? "Exit Cinema View" : "Expand Cinema View"}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-btn transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

      </div>

    </div>
  );
}
