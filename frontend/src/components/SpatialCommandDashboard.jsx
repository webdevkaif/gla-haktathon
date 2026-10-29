import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Zap, Sparkles, Sliders, Play, Pause, RotateCcw, 
  Volume2, VolumeX, Plus, X, ArrowUpRight, Copy, Check,
  Search, Terminal, Shield, LogOut, Moon, Sun, Flame,
  FileText, CheckCircle2, AlertTriangle, ArrowRight, CornerDownLeft,
  Command, Layers, Compass, BarChart3, Database, MessageSquare,
  UploadCloud, ExternalLink, HelpCircle
} from 'lucide-react';

export default function SpatialCommandDashboard({ 
  currentUser, 
  onLockSession, 
  onNavigateTab, 
  currentTheme, 
  setCurrentTheme 
}) {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Feature A: "Time-Horizon" Scrubbable Glass Ribbon (08:00 to 22:00)
  // ─────────────────────────────────────────────────────────────────────────────
  const [timelineHour, setTimelineHour] = useState(11.5); // 11:30 AM
  
  // Schedule blocks mapped across 08:00 to 22:00
  const scheduleEvents = [
    { start: 8.5, end: 10.0, title: 'Autonomous Invoice OCR Ingestion', category: 'Audit', load: 65 },
    { start: 10.5, end: 12.5, title: 'High-Cognition Deep Work & Policy Reconciliation', category: 'Deep Work', load: 95 },
    { start: 13.5, end: 15.0, title: 'Vendor PO Matching & Discrepancy Checks', category: 'Procurement', load: 70 },
    { start: 15.5, end: 17.5, title: 'Multi-Level Manager Approval Batching', category: 'Approvals', load: 80 },
    { start: 18.0, end: 20.0, title: 'Cryptographic Audit Trail Chain Verification', category: 'Compliance', load: 40 },
    { start: 20.5, end: 22.0, title: 'Cognitive Wind-Down & System Archival', category: 'Review', load: 20 },
  ];

  // Find active event based on scrubbed time
  const currentEvent = scheduleEvents.find(e => timelineHour >= e.start && timelineHour <= e.end) || {
    title: 'Ad-hoc Copilot & Spatial Workflow Exploration',
    category: 'Free Form',
    load: 35
  };

  const formatHour = (h) => {
    const whole = Math.floor(h);
    const mins = Math.round((h - whole) * 60);
    const suffix = whole >= 12 ? 'PM' : 'AM';
    const displayHour = whole > 12 ? whole - 12 : whole;
    return `${displayHour}:${mins < 10 ? '0' : ''}${mins} ${suffix}`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Feature B: Spatial "Zen-Lock" Focus Aperture & Pomodoro Timer
  // ─────────────────────────────────────────────────────────────────────────────
  const [zenMode, setZenMode] = useState(false);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [brownNoiseActive, setBrownNoiseActive] = useState(false);
  const [activeTaskText, setActiveTaskText] = useState('Reconcile Acme Supplies & TechCorp Q4 Duplicate Submissions');

  useEffect(() => {
    let interval = null;
    if (pomodoroRunning && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds(prev => prev - 1);
      }, 1000);
    } else if (pomodoroSeconds === 0) {
      setPomodoroRunning(false);
    }
    return () => clearInterval(interval);
  }, [pomodoroRunning, pomodoroSeconds]);

  const togglePomodoro = () => setPomodoroRunning(!pomodoroRunning);
  const resetPomodoro = () => {
    setPomodoroRunning(false);
    setPomodoroSeconds(25 * 60);
  };

  const pomodoroProgress = ((25 * 60 - pomodoroSeconds) / (25 * 60)) * 100;
  const timerMinutes = Math.floor(pomodoroSeconds / 60);
  const timerSecondsDisplay = pomodoroSeconds % 60;

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Feature C: Magnetic Context Shelf (Collapsible Dock)
  // ─────────────────────────────────────────────────────────────────────────────
  const [shelfOpen, setShelfOpen] = useState(true);
  const [contextChips, setContextChips] = useState([
    { id: 1, label: 'SEC-104 Hotel Per Diem Rule: L2 limit ₹3,500/night', tag: 'policy', type: 'rule' },
    { id: 2, label: 'Duplicate Check: #INV-2004 vs #INV-02004 (Acme)', tag: 'invoice', type: 'anomaly' },
    { id: 3, label: 'Mindee OCR Prompt: "Summarize Q4 discrepancies and GST"', tag: 'prompt', type: 'copilot' },
    { id: 4, label: 'Voice Memo: Approver escalation threshold for claims > ₹10k', tag: 'memo', type: 'audio' },
  ]);
  const [newChipInput, setNewChipInput] = useState('');
  const [copiedChipId, setCopiedChipId] = useState(null);

  const addChip = (e) => {
    e.preventDefault();
    if (!newChipInput.trim()) return;
    setContextChips([
      ...contextChips,
      {
        id: Date.now(),
        label: newChipInput.trim(),
        tag: 'custom',
        type: 'snippet'
      }
    ]);
    setNewChipInput('');
  };

  const removeChip = (id) => {
    setContextChips(contextChips.filter(c => c.id !== id));
  };

  const injectChip = (chip) => {
    setActiveTaskText(prev => `${prev} [Ref: ${chip.label}]`);
    setCopiedChipId(chip.id);
    setTimeout(() => setCopiedChipId(null), 2000);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Feature E: Omni-Command HUD (`Cmd + K`)
  // ─────────────────────────────────────────────────────────────────────────────
  const [hudOpen, setHudOpen] = useState(false);
  const [hudQuery, setHudQuery] = useState('');
  const hudInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setHudOpen(prev => !prev);
      } else if (e.key === 'Escape' && hudOpen) {
        setHudOpen(false);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        setZenMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hudOpen]);

  useEffect(() => {
    if (hudOpen && hudInputRef.current) {
      hudInputRef.current.focus();
    }
  }, [hudOpen]);

  const commandActions = [
    { id: 'zen', cmd: '/zen', label: 'Toggle Zen Aperture Mode', action: () => setZenMode(!zenMode), badge: '⌘Z' },
    { id: 'focus45', cmd: '/focus 45m', label: 'Start 45m Focus Aperture Session', action: () => { setZenMode(true); setPomodoroSeconds(45 * 60); setPomodoroRunning(true); }, badge: 'ENTER' },
    { id: 'chat', cmd: '/view chat', label: 'Open Autonomous AI Copilot Chat', action: () => onNavigateTab('chat'), badge: '⌘1' },
    { id: 'dash', cmd: '/view dashboard', label: 'Open Executive Finance Dashboard', action: () => onNavigateTab('dashboard'), badge: '⌘2' },
    { id: 'invoices', cmd: '/view invoices', label: 'Open Claims & Vendor Invoices Hub', action: () => onNavigateTab('claims_invoices'), badge: '⌘3' },
    { id: 'approvals', cmd: '/view approvals', label: 'Open Approvals & Escalations Matrix', action: () => onNavigateTab('approvals_escalations'), badge: '⌘4' },
    { id: 'audit', cmd: '/view audit', label: 'Inspect Cryptographic Hash Chain Audit Trail', action: () => onNavigateTab('audit'), badge: '⌘5' },
    { id: 'theme-obsidian', cmd: '/theme obsidian', label: 'Switch Theme to Cyber Obsidian', action: () => setCurrentTheme('obsidian'), badge: 'THEME' },
    { id: 'theme-emerald', cmd: '/theme emerald', label: 'Switch Theme to Aurora Emerald', action: () => setCurrentTheme('emerald'), badge: 'THEME' },
    { id: 'theme-solar', cmd: '/theme solar', label: 'Switch Theme to Solar Flare', action: () => setCurrentTheme('solar'), badge: 'THEME' },
    { id: 'clearshelf', cmd: '/clear shelf', label: 'Flush Magnetic Context Shelf', action: () => setContextChips([]), badge: 'CLEAR' },
    { id: 'lock', cmd: '/lock', label: 'Lock Session & Return to Gateway', action: onLockSession, badge: 'ESC' },
  ];

  const filteredCommands = commandActions.filter(c => 
    c.cmd.toLowerCase().includes(hudQuery.toLowerCase()) || 
    c.label.toLowerCase().includes(hudQuery.toLowerCase())
  );

  return (
    <div className="w-full relative pb-24">

      {/* =========================================================================
          TOP COMMAND BAR & TIME-HORIZON SCRUBBABLE GLASS RIBBON
          ========================================================================= */}
      <header className="sticky top-4 z-40 mb-6">
        <div className="glass-tier-2 rounded-2xl p-3 sm:p-4 border border-white/15 flex flex-col gap-3 shadow-xl">
          
          {/* Upper Utility Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Identity & Status */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-tight">Expense Pilot Workspace</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {currentUser?.role?.toUpperCase() || 'FINANCE'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">User: {currentUser?.name || 'Alex Morgan'}</span>
              </div>
            </div>

            {/* Quick Feature Controls: Zen Aperture, Theme Switcher, HUD trigger & Lock */}
            <div className="flex items-center gap-2">
              
              {/* Feature B: Zen Aperture Switch */}
              <button
                type="button"
                onClick={() => setZenMode(!zenMode)}
                className={`py-1.5 px-3 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all duration-300 border ${
                  zenMode 
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/40' 
                    : 'glass-tier-1 text-slate-300 hover:text-white border-white/10 hover:border-white/20'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${zenMode ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
                <span>{zenMode ? 'Zen Aperture ACTIVE' : 'Zen Aperture'}</span>
                <span className="text-[10px] px-1 rounded bg-black/40 text-slate-400">⌘Z</span>
              </button>

              {/* Theme Switcher Pills */}
              <div className="hidden md:flex items-center gap-1 p-1 rounded-xl glass-tier-1 border border-white/10 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setCurrentTheme('obsidian')}
                  className={`px-2 py-1 rounded-lg transition-all ${currentTheme === 'obsidian' ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/30' : 'text-slate-400 hover:text-white'}`}
                >
                  Obsidian
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTheme('emerald')}
                  className={`px-2 py-1 rounded-lg transition-all ${currentTheme === 'emerald' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/30' : 'text-slate-400 hover:text-white'}`}
                >
                  Emerald
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentTheme('solar')}
                  className={`px-2 py-1 rounded-lg transition-all ${currentTheme === 'solar' ? 'bg-amber-500/30 text-amber-300 border border-amber-400/30' : 'text-slate-400 hover:text-white'}`}
                >
                  Solar
                </button>
              </div>

              {/* Omni-Command HUD Trigger Button */}
              <button
                type="button"
                onClick={() => setHudOpen(true)}
                className="py-1.5 px-3 rounded-xl glass-tier-1 hover:border-cyan-400/50 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 border border-white/10 transition-colors"
              >
                <Command className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Omni-HUD</span>
                <span className="text-[10px] px-1 py-0.5 rounded bg-black/40 text-slate-400">⌘K</span>
              </button>

              {/* Session Lock Button */}
              <button
                type="button"
                onClick={onLockSession}
                className="py-1.5 px-3 rounded-xl glass-tier-1 hover:border-rose-400/40 text-rose-300 hover:bg-rose-500/10 text-xs font-mono flex items-center gap-1.5 border border-white/10 transition-colors"
                title="Lock Session and return to Glassmorphic Gateway"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lock Session</span>
              </button>
            </div>
          </div>

          {/* Feature A: "Time-Horizon" Scrubbable Glass Ribbon */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-white font-semibold">Time-Horizon: {formatHour(timelineHour)}</span>
                <span className="text-slate-400 text-[11px]">• Block:</span>
                <span className="text-cyan-300 text-[11px] font-medium">{currentEvent.title}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-400">Cognitive Load:</span>
                <span className={`font-semibold ${currentEvent.load > 75 ? 'text-rose-400' : currentEvent.load > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {currentEvent.load}%
                </span>
              </div>
            </div>

            {/* Scrubbable Slider Bar */}
            <div className="relative w-full h-7 flex items-center">
              
              {/* Scheduled Blocks Ribbon Underlay */}
              <div className="absolute inset-x-0 h-2.5 rounded-full bg-slate-900/80 border border-white/10 overflow-hidden flex">
                {scheduleEvents.map((ev, idx) => {
                  const widthPct = ((ev.end - ev.start) / 14) * 100;
                  const leftPct = ((ev.start - 8) / 14) * 100;
                  return (
                    <div
                      key={idx}
                      style={{ width: `${widthPct}%` }}
                      className={`h-full opacity-60 border-r border-black/40 ${
                        ev.category === 'Deep Work' ? 'bg-gradient-to-r from-cyan-500 to-indigo-600' :
                        ev.category === 'Audit' ? 'bg-gradient-to-r from-amber-500 to-orange-600' :
                        ev.category === 'Approvals' ? 'bg-gradient-to-r from-violet-500 to-purple-600' :
                        'bg-slate-700'
                      }`}
                      title={`${ev.title} (${ev.start}:00 - ${ev.end}:00)`}
                    />
                  );
                })}
              </div>

              {/* Native Scrub Range Input overlaid */}
              <input
                type="range"
                min="8"
                max="22"
                step="0.25"
                value={timelineHour}
                onChange={(e) => setTimelineHour(parseFloat(e.target.value))}
                className="w-full absolute inset-0 opacity-0 cursor-ew-resize z-20"
              />

              {/* Glowing Playhead Pointer */}
              <div 
                style={{ left: `${((timelineHour - 8) / 14) * 100}%` }}
                className="absolute -top-1 -translate-x-1/2 w-4 h-9 rounded-md bg-cyan-400 shadow-[0_0_15px_#06b6d4] border-2 border-white pointer-events-none z-10 transition-all duration-75 flex items-center justify-center"
              >
                <div className="w-0.5 h-3 bg-slate-900 rounded-full" />
              </div>
            </div>

            {/* Time Ticks */}
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1 px-1">
              <span>08:00 AM</span>
              <span>11:00 AM</span>
              <span>02:00 PM (Peak)</span>
              <span>05:00 PM</span>
              <span>08:00 PM</span>
              <span>10:00 PM</span>
            </div>
          </div>

        </div>
      </header>

      {/* =========================================================================
          SPATIAL BENTO-GRID DASHBOARD LAYOUT
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        
        {/* =========================================================================
            FEATURE B: Active Task / Studio Canvas (Zen Aperture Centerpiece)
            ========================================================================= */}
        <div className={`lg:col-span-8 transition-all duration-700 ${zenMode ? 'zen-elevated lg:col-span-12' : ''}`}>
          <div className="glass-tier-2 rounded-3xl p-6 sm:p-8 border border-white/15 relative overflow-hidden">
            
            {/* Ambient Background Aura */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar with Pomodoro Ring Timer and Waveform Visualizer */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10 relative z-10">
              
              <div className="flex items-center gap-4">
                {/* Pomodoro Circular Ring Timer */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-white/10"
                      fill="transparent"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray="175.9"
                      strokeDashoffset={175.9 - (175.9 * pomodoroProgress) / 100}
                      className="text-cyan-400 transition-all duration-300"
                      fill="transparent"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono">
                    <span className="text-xs font-bold text-white tracking-tighter">
                      {timerMinutes}:{timerSecondsDisplay < 10 ? '0' : ''}{timerSecondsDisplay}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                      Zen Focus Aperture
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${pomodoroRunning ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 animate-pulse' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                      {pomodoroRunning ? 'ACTIVE FOCUS' : 'PAUSED'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-0.5">High-Velocity Studio Canvas</h2>
                </div>
              </div>

              {/* Timer Controls & Brown-Noise Visualizer Waveform */}
              <div className="flex items-center gap-3">
                
                {/* Waveform Soundwave Visualizer */}
                <div 
                  onClick={() => setBrownNoiseActive(!brownNoiseActive)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl glass-tier-1 border cursor-pointer transition-all ${
                    brownNoiseActive 
                      ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300 shadow-md shadow-cyan-500/20' 
                      : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Toggle Ambient Brown-Noise Focus Generator"
                >
                  {brownNoiseActive ? <Volume2 className="w-4 h-4 text-cyan-400 mr-1" /> : <VolumeX className="w-4 h-4 text-slate-500 mr-1" />}
                  <div className="flex items-end gap-0.5 h-6">
                    <div className={`w-1 rounded-full bg-cyan-400 ${brownNoiseActive ? 'waveform-bar-1' : 'h-1.5'}`} />
                    <div className={`w-1 rounded-full bg-cyan-400 ${brownNoiseActive ? 'waveform-bar-2' : 'h-2'}`} />
                    <div className={`w-1 rounded-full bg-cyan-400 ${brownNoiseActive ? 'waveform-bar-3' : 'h-1'}`} />
                    <div className={`w-1 rounded-full bg-cyan-400 ${brownNoiseActive ? 'waveform-bar-4' : 'h-3'}`} />
                    <div className={`w-1 rounded-full bg-cyan-400 ${brownNoiseActive ? 'waveform-bar-5' : 'h-1.5'}`} />
                    <div className={`w-1 rounded-full bg-cyan-400 ${brownNoiseActive ? 'waveform-bar-6' : 'h-2.5'}`} />
                  </div>
                  <span className="text-[11px] font-mono ml-1.5">{brownNoiseActive ? '432Hz Brown' : 'Noise Off'}</span>
                </div>

                {/* Pomodoro Action Buttons */}
                <button
                  type="button"
                  onClick={togglePomodoro}
                  className="p-2.5 rounded-xl glass-btn-primary text-white hover:scale-105 transition-transform shadow-lg shadow-cyan-500/20"
                  title={pomodoroRunning ? 'Pause Timer' : 'Start Pomodoro Timer'}
                >
                  {pomodoroRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                </button>

                <button
                  type="button"
                  onClick={resetPomodoro}
                  className="p-2.5 rounded-xl glass-tier-1 border border-white/10 hover:border-white/25 text-slate-400 hover:text-white transition-colors"
                  title="Reset 25m Timer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Active Deep Work Task Description Bar */}
            <div className="relative mb-6">
              <label className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2 block flex items-center justify-between">
                <span>Active Objective in Focus</span>
                <span className="text-cyan-400 font-mono text-[11px]">Ready for Injection</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={activeTaskText}
                  onChange={(e) => setActiveTaskText(e.target.value)}
                  className="w-full py-3.5 pl-4 pr-10 rounded-2xl glass-input text-white text-sm font-medium border border-white/20 focus:border-cyan-400 transition-all"
                />
                <button 
                  onClick={() => onNavigateTab('chat')}
                  className="absolute right-3 top-3 p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
                  title="Forward to Copilot Agent Chat"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Spatial Action Launchpad Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-2">
              <div 
                onClick={() => onNavigateTab('chat')}
                className="p-4 rounded-2xl glass-tier-1 hover:border-cyan-400/50 hover:bg-white/5 border border-white/10 cursor-pointer transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-2.5 text-cyan-400 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-cyan-300">Enterprise AI Copilot</div>
                <div className="text-[11px] text-slate-400 mt-1">Multi-language claims, OCR & policy queries</div>
              </div>

              <div 
                onClick={() => onNavigateTab('claims_invoices')}
                className="p-4 rounded-2xl glass-tier-1 hover:border-amber-400/50 hover:bg-white/5 border border-white/10 cursor-pointer transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2.5 text-amber-400 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-amber-300">Invoice Mindee OCR</div>
                <div className="text-[11px] text-slate-400 mt-1">High-precision document audit & ingestion</div>
              </div>

              <div 
                onClick={() => onNavigateTab('audit')}
                className="p-4 rounded-2xl glass-tier-1 hover:border-emerald-400/50 hover:bg-white/5 border border-white/10 cursor-pointer transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2.5 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-white group-hover:text-emerald-300">Hash-Chained Audit</div>
                <div className="text-[11px] text-slate-400 mt-1">Cryptographic tamper-evident verification</div>
              </div>
            </div>

          </div>
        </div>

        {/* =========================================================================
            FEATURE D: Biometric Energy & Velocity Matrix (Bento Widget)
            ========================================================================= */}
        <div className={`lg:col-span-4 transition-all duration-700 ${zenMode ? 'zen-dimmed' : ''}`}>
          <div className="glass-tier-2 rounded-3xl p-6 border border-white/15 h-full flex flex-col justify-between">
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center border border-indigo-500/30">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Biometric Matrix</h3>
                    <span className="text-[10px] text-slate-400">Velocity vs Energy Spline</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold">+18% Peak Index</span>
              </div>

              {/* Dual-Spline Glowing SVG Chart */}
              <div className="relative w-full h-36 my-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 280 120">
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="30" x2="280" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="70" x2="280" y2="70" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <line x1="0" y1="110" x2="280" y2="110" stroke="rgba(255,255,255,0.06)" />

                  {/* Shaded Area for Velocity Curve */}
                  <path
                    d="M 10 100 Q 60 20, 110 35 T 200 65 T 270 95 L 270 115 L 10 115 Z"
                    fill="url(#velocityGrad)"
                  />
                  {/* Spline 1: Task Velocity (Cyan) */}
                  <path
                    d="M 10 100 Q 60 20, 110 35 T 200 65 T 270 95"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Spline 2: Biological Energy Curve (Violet) */}
                  <path
                    d="M 10 75 Q 70 25, 120 45 T 190 85 T 270 105"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    strokeLinecap="round"
                  />

                  {/* Active Hour Marker at 11:30 AM */}
                  <circle cx="110" cy="35" r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                </svg>

                {/* Chart Legend */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>Velocity Spline</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Energy Curve</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Designated Optimal Work Windows */}
            <div className="space-y-2 mt-4 pt-4 border-t border-white/10 text-xs">
              <div className="p-2.5 rounded-xl glass-tier-1 border border-cyan-500/20 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-[11px]">High-Cognition Creation</div>
                  <div className="text-[10px] text-slate-400 font-mono">09:00 AM — 12:30 PM (NOW)</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-bold">
                  OPTIMAL
                </span>
              </div>

              <div className="p-2.5 rounded-xl glass-tier-1 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-300 text-[11px]">Low-Friction Admin</div>
                  <div className="text-[10px] text-slate-500 font-mono">02:30 PM — 05:00 PM</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-400">
                  SCHEDULED
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* =========================================================================
          FEATURE C: Magnetic Context Shelf (Floating Bottom-Right Translucent Dock)
          ========================================================================= */}
      <aside className={`fixed bottom-6 right-6 z-40 transition-all duration-500 ${shelfOpen ? 'w-80 sm:w-96' : 'w-auto'}`}>
        <div className="glass-tier-3 rounded-2xl border border-white/20 shadow-2xl overflow-hidden backdrop-blur-3xl">
          
          {/* Shelf Header */}
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div 
              onClick={() => setShelfOpen(!shelfOpen)}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white font-mono tracking-tight">Magnetic Context Shelf</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300">
                {contextChips.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShelfOpen(!shelfOpen)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              {shelfOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          {/* Expandable Body */}
          {shelfOpen && (
            <div className="p-3.5 space-y-3 max-h-72 overflow-y-auto">
              
              {/* Chips List */}
              <div className="space-y-2">
                {contextChips.map((chip) => (
                  <div
                    key={chip.id}
                    className="p-2.5 rounded-xl glass-tier-2 border border-white/10 hover:border-cyan-400/40 transition-all flex items-start justify-between gap-2 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                        {chip.label}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          #{chip.tag}
                        </span>
                        <button
                          type="button"
                          onClick={() => injectChip(chip)}
                          className="text-[10px] font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        >
                          {copiedChipId === chip.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Injected!</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Inject</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeChip(chip.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 opacity-40 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Quick Add Snippet Input */}
              <form onSubmit={addChip} className="pt-2 border-t border-white/10 flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Drop snippet or prompt fragment..."
                  value={newChipInput}
                  onChange={(e) => setNewChipInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl glass-input text-white border border-white/15 focus:border-cyan-400 transition-all"
                />
                <button
                  type="submit"
                  disabled={!newChipInput.trim()}
                  className="p-1.5 rounded-xl glass-btn-primary text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>

            </div>
          )}

        </div>
      </aside>

      {/* =========================================================================
          FEATURE E: Omni-Command HUD (`Cmd/Ctrl + K` Floating Modal)
          ========================================================================= */}
      {hudOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-xl glass-tier-3 rounded-3xl p-5 border border-white/20 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Search Input Bar */}
            <div className="relative mb-4 flex items-center border-b border-white/15 pb-3">
              <Search className="w-5 h-5 text-cyan-400 mr-3 shrink-0" />
              <input
                ref={hudInputRef}
                type="text"
                placeholder="Type a command or natural language instruction (e.g. /focus 45m, /theme)..."
                value={hudQuery}
                onChange={(e) => setHudQuery(e.target.value)}
                className="w-full bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500 font-medium"
              />
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-400">
                ESC to close
              </span>
            </div>

            {/* Quick Actions List */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 font-mono">
                  No matching workspace actions found for "{hudQuery}"
                </div>
              ) : (
                filteredCommands.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      item.action();
                      setHudOpen(false);
                      setHudQuery('');
                    }}
                    className="p-2.5 rounded-xl glass-tier-1 hover:border-cyan-400/50 hover:bg-white/10 cursor-pointer flex items-center justify-between text-xs transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-cyan-400 font-bold">{item.cmd}</span>
                      <span className="text-slate-200 group-hover:text-white">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 group-hover:border-cyan-400/40 group-hover:text-cyan-300">
                      {item.badge}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Keyboard Shortcuts Footer */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10 text-[10px] font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <span>Navigate: <strong className="text-slate-200">↑↓</strong></span>
                <span>Execute: <strong className="text-slate-200">ENTER</strong></span>
                <span>Zen: <strong className="text-slate-200">⌘Z</strong></span>
              </div>
              <span className="text-cyan-400">Expense Pilot Spatial OS</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
