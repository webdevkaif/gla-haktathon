import React, { useState } from 'react';
import { 
  Fingerprint, Sparkles, Shield, ArrowRight, Zap, CheckCircle2, 
  Circle, Lock, Mail, Key, Compass, Layers, BarChart3, Clock, 
  Cpu, Flame, Users, Check
} from 'lucide-react';

export default function LoginGateway({ onLoginSuccess, currentTheme, setCurrentTheme }) {
  const [email, setEmail] = useState('john.doe@meridian.com');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedPersona, setSelectedPersona] = useState('focus'); // focus | creator | analytics
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Interactive preview tasks
  const [previewTasks, setPreviewTasks] = useState([
    { id: 1, text: 'Review Q4 Travel & Hotel Reimbursement Claims', tag: 'Finance', completed: true },
    { id: 2, text: 'Audit Acme Supplies duplicate invoice #INV-2004', tag: 'Audit', completed: false },
    { id: 3, text: 'Executive briefing with VP of Procurement', tag: 'High-Focus', completed: false },
  ]);

  const togglePreviewTask = (id) => {
    setPreviewTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleInitialize = (userOverride = null) => {
    setIsTransitioning(true);
    setTimeout(() => {
      onLoginSuccess(userOverride || {
        id: 'emp_john',
        name: 'John Doe',
        role: 'employee',
        email: email,
        persona: selectedPersona
      });
    }, 450);
  };

  const handleBiometricAuth = () => {
    setBiometricScanning(true);
    setTimeout(() => {
      setBiometricScanning(false);
      handleInitialize({
        id: 'fin_alex',
        name: 'Alex Morgan',
        role: 'finance',
        email: 'finance@meridian.com',
        persona: selectedPersona
      });
    }, 1200);
  };

  const demoAccounts = [
    { id: 'emp_john', label: 'John Doe', role: 'Employee (L2)', persona: 'focus', color: 'from-cyan-500 to-blue-500' },
    { id: 'mgr_sarah', label: 'Sarah Connor', role: 'Manager (L4)', persona: 'creator', color: 'from-violet-500 to-purple-500' },
    { id: 'fin_alex', label: 'Alex Morgan', role: 'Finance (L5)', persona: 'analytics', color: 'from-emerald-500 to-teal-500' },
    { id: 'ven_acme', label: 'Acme Supplies', role: 'Vendor (Ext)', persona: 'focus', color: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className={`min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden transition-all duration-700 ${
      isTransitioning ? 'scale-105 filter blur-sm opacity-0' : 'scale-100 opacity-100'
    }`}>
      
      {/* Top Header Floating Brand Pill & Theme Selector */}
      <div className="absolute top-6 left-6 right-6 z-20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 border border-white/20">
            <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">Expense Pilot</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Spatial OS v2.4
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                Orange & Green
              </span>
            </div>
            <p className="text-xs text-slate-400">Next-Gen Autonomous Finance & AI Workspace</p>
          </div>
        </div>

        {/* Quick Theme Selector Pills */}
        {setCurrentTheme && (
          <div className="flex items-center gap-1.5 p-1 rounded-2xl glass-tier-2 border border-white/10">
            <button
              type="button"
              onClick={() => setCurrentTheme('citrus')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                currentTheme === 'citrus'
                  ? 'bg-gradient-to-r from-emerald-500/30 to-orange-500/30 text-emerald-200 border border-emerald-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Emerald & Cyber Orange (Flagship Hackathon Palette)"
            >
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-orange-400" />
              <span>Citrus (OG)</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentTheme('emerald')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                currentTheme === 'emerald'
                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Emerald</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentTheme('solar')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                currentTheme === 'solar'
                  ? 'bg-orange-500/30 text-orange-200 border border-orange-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <span>Solar</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentTheme('obsidian')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                currentTheme === 'obsidian'
                  ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/50 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>Obsidian</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Split-Glass Grid Container */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10 pt-16 lg:pt-0">
        
        {/* =========================================================================
            LEFT PANEL: Interactive Authentication Card
            ========================================================================= */}
        <div className="lg:col-span-7 w-full">
          <div className="glass-tier-2 rounded-3xl p-6 sm:p-10 relative overflow-hidden border border-white/15">
            
            {/* Ambient Corner Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              
              {/* Header Badge & Title */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-mono tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Session Gateway • Secure Access
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" /> End-to-End Cryptographic
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
                Initialize Spatial Workspace
              </h1>
              <p className="text-sm text-slate-400 mb-8">
                Welcome back. Select your workspace persona and enter your credential keys or quick biometric passkey.
              </p>

              {/* Workspace Persona Selector */}
              <div className="mb-6">
                <label className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2.5 block">
                  Workspace Persona Selector
                </label>
                <div className="grid grid-cols-3 gap-2.5 p-1 rounded-2xl glass-tier-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setSelectedPersona('focus')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-300 ${
                      selectedPersona === 'focus'
                        ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Deep Focus</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPersona('creator')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-300 ${
                      selectedPersona === 'creator'
                        ? 'bg-gradient-to-r from-violet-500/30 to-purple-500/30 text-violet-300 border border-violet-400/40 shadow-lg shadow-violet-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Creator Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPersona('analytics')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-300 ${
                      selectedPersona === 'analytics'
                        ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-300 border border-emerald-400/40 shadow-lg shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Analytics</span>
                  </button>
                </div>
              </div>

              {/* Floating-Label Form Inputs */}
              <div className="space-y-4 mb-6">
                {/* Email Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-400 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=" "
                    className="w-full pl-10 pr-4 pt-5 pb-2 rounded-2xl glass-input text-white text-sm focus:border-cyan-400/80 transition-all peer"
                  />
                  <label className="absolute text-xs text-slate-400 duration-200 transform -translate-y-2.5 scale-75 top-4 z-10 origin-[0] left-10 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-cyan-400 pointer-events-none">
                    Corporate Email Address
                  </label>
                </div>

                {/* Password Field */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" "
                    className="w-full pl-10 pr-4 pt-5 pb-2 rounded-2xl glass-input text-white text-sm focus:border-cyan-400/80 transition-all peer"
                  />
                  <label className="absolute text-xs text-slate-400 duration-200 transform -translate-y-2.5 scale-75 top-4 z-10 origin-[0] left-10 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-2.5 peer-focus:text-cyan-400 pointer-events-none">
                    Secure Password
                  </label>
                </div>
              </div>

              {/* Quick Biometric & Primary Initialize Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                
                {/* Biometric / Passkey Quick-Auth Button */}
                <button
                  type="button"
                  onClick={handleBiometricAuth}
                  disabled={biometricScanning}
                  className="w-full py-3.5 px-4 rounded-2xl glass-tier-2 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10 text-white font-medium text-xs flex items-center justify-center gap-2.5 transition-all duration-300 relative group overflow-hidden"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Fingerprint className={`w-4 h-4 text-emerald-400 ${biometricScanning ? 'animate-spin' : 'animate-pulse'}`} />
                  </div>
                  <span className="font-mono text-emerald-200">
                    {biometricScanning ? 'Verifying Passkey...' : 'Biometric / Passkey'}
                  </span>
                </button>

                {/* Initialize Workspace Button */}
                <button
                  type="button"
                  onClick={() => handleInitialize()}
                  className="w-full py-3.5 px-4 rounded-2xl glass-btn-citrus text-slate-950 font-bold text-xs flex items-center justify-center gap-2 group shadow-xl shadow-orange-500/30"
                >
                  <span>Initialize Workspace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-slate-950 font-bold" />
                </button>
              </div>

              {/* SSO Quick-Pills */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-[11px] text-slate-400 font-mono">Enterprise SSO:</span>
                <div className="flex items-center gap-2">
                  {['Google Workspace', 'GitHub Enterprise', 'Apple ID'].map((sso) => (
                    <button
                      key={sso}
                      type="button"
                      onClick={() => handleInitialize()}
                      className="px-2.5 py-1 rounded-xl glass-tier-1 text-[11px] text-slate-300 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
                    >
                      {sso}
                    </button>
                  ))}
                </div>
              </div>

              {/* Demo Accounts Quick-Picker Pill Bar */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <span className="text-[11px] font-mono text-slate-400 block mb-2 uppercase tracking-wider">
                  Judge / Demo Quick-Switch Accounts (1-Click Auth)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {demoAccounts.map(demo => (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => handleInitialize({
                        id: demo.id,
                        name: demo.label,
                        role: demo.role.split(' ')[0].toLowerCase(),
                        email: `${demo.id}@meridian.com`,
                        persona: demo.persona
                      })}
                      className="p-2 rounded-xl glass-tier-1 hover:border-cyan-400/50 text-left transition-all group"
                    >
                      <div className="text-xs font-semibold text-white group-hover:text-cyan-300">{demo.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{demo.role}</div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* =========================================================================
            RIGHT PANEL: Live Ambient 3D Perspective Preview
            ========================================================================= */}
        <div className="lg:col-span-5 w-full flex justify-center perspective-1200">
          <div className="perspective-preview w-full max-w-md glass-tier-2 rounded-3xl p-6 sm:p-7 border border-white/20 shadow-2xl relative">
            
            {/* Top Bar Indicators */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono text-emerald-300 font-medium">Daily Productivity Pulse</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-tier-1 text-[11px] text-amber-300 font-mono border border-amber-500/20">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>14-Day Streak</span>
              </div>
            </div>

            {/* Quick Metrics Bento Card */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 rounded-2xl glass-tier-1 border border-white/10">
                <span className="text-[11px] text-slate-400 font-mono block mb-1">Focus Velocity</span>
                <div className="text-xl font-bold text-white font-mono flex items-baseline gap-1">
                  <span>94.8%</span>
                  <span className="text-[10px] text-emerald-400 font-normal">+6.2%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full w-[94%]" />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl glass-tier-1 border border-white/10">
                <span className="text-[11px] text-slate-400 font-mono block mb-1">Pending Actions</span>
                <div className="text-xl font-bold text-white font-mono flex items-baseline gap-1">
                  <span>3 Items</span>
                  <span className="text-[10px] text-cyan-400 font-normal">SLA 48h</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-400 to-rose-500 h-full w-[60%]" />
                </div>
              </div>
            </div>

            {/* Interactive Priority Tasks Checklist */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Pending Priority Queue
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">Live Sync</span>
              </div>

              <div className="space-y-2">
                {previewTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => togglePreviewTask(t.id)}
                    className={`p-3 rounded-xl glass-tier-1 border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                      t.completed 
                        ? 'border-emerald-500/30 bg-emerald-500/5' 
                        : 'border-white/10 hover:border-cyan-400/40 hover:bg-white/5'
                    }`}
                  >
                    <div className="mt-0.5 text-slate-400">
                      {t.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${t.completed ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                        {t.text}
                      </p>
                      <span className="inline-block mt-1 text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
                        #{t.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Status Indicator Card */}
            <div className="p-3.5 rounded-2xl glass-tier-1 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Autonomous Core</div>
                  <div className="text-[10px] text-slate-400 font-mono">All services 99.98% healthy</div>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                12ms latency
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

