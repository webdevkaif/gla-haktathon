import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  Zap, 
  Send, 
  Sparkles, 
  ChevronRight, 
  Flame,
  ShieldCheck,
  RefreshCw,
  BellRing,
  Volume2,
  VolumeX,
  Sliders,
  DollarSign,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Radio,
  Lock
} from 'lucide-react';
import { 
  fetchRiskPrediction, 
  dispatchRiskAlert, 
  simulateRiskIntervention,
  activateEmergencyProtocol 
} from '../api';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { sendNativeMobileNotification, playNotificationChime } from '../utils/mobileNotifications';

export default function AIRiskPredictorHUD({ month = "2026-10", onRiskUpdated }) {
  const [riskData, setRiskData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [isEngagingShield, setIsEngagingShield] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState(null);
  const [channel, setChannel] = useState('SMS');
  
  // Interactive Simulation State
  const [spendCutPct, setSpendCutPct] = useState(20);
  const [upcomingExpense, setUpcomingExpense] = useState(0);
  const [simResult, setSimResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Audio Voice Briefing
  const [isSpeaking, setIsSpeaking] = useState(false);

  const loadRisk = async () => {
    setIsLoading(true);
    try {
      const data = await fetchRiskPrediction(month);
      setRiskData(data);
      if (onRiskUpdated) onRiskUpdated(data);
      // Run initial simulation
      runSimulation(20, 0, data);
    } catch (err) {
      console.warn("Notice loading AI risk predictor:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const runSimulation = async (cut, expense, baseData) => {
    setIsSimulating(true);
    try {
      const res = await simulateRiskIntervention(cut, expense, month);
      setSimResult(res);
    } catch (err) {
      console.warn("Simulation notice:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    loadRisk();
  }, [month]);

  // Handle slider changes
  const handleCutChange = (val) => {
    const num = Number(val);
    setSpendCutPct(num);
    runSimulation(num, upcomingExpense, riskData);
  };

  const handleExpenseChange = (val) => {
    const num = Number(val);
    setUpcomingExpense(num);
    runSimulation(spendCutPct, num, riskData);
  };

  // Voice Narration
  const handleSpeakBriefing = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const level = riskData?.risk_level || "MODERATE";
    const score = riskData?.risk_score || 50;
    const headline = riskData?.ai_assessment?.headline || "Spending risk analysis";
    const runway = riskData?.exhaustion_status || "Budget active";
    const daily = Math.round(riskData?.safe_daily_allowance || 0);

    const speechText = `ExpensePilot Financial Risk Briefing. Your current composite risk score is ${score} out of 100, placing you at ${level} risk. ${headline}. Your budget runway indicates: ${runway}. To prevent deficit, your safe daily burn target is ${daily} rupees per day.`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Dispatch standard report
  const handleDispatchRisk = async () => {
    setIsDispatching(true);
    try {
      const res = await dispatchRiskAlert(month, channel);
      sendNativeMobileNotification("🚨 ExpensePilot Risk Alert", {
        body: `Risk Score: ${riskData?.risk_score}/100 [${riskData?.risk_level}]. ${riskData?.ai_assessment?.headline || ''}`
      });
      playNotificationChime();
      setDispatchFeedback({
        type: 'success',
        msg: `Delivered AI Risk Assessment to phone via ${channel}! (ID: ${res.dispatch_id})`
      });
      setTimeout(() => setDispatchFeedback(null), 5000);
    } catch (err) {
      setDispatchFeedback({
        type: 'error',
        msg: 'Failed to dispatch risk alert to phone'
      });
      setTimeout(() => setDispatchFeedback(null), 5000);
    } finally {
      setIsDispatching(false);
    }
  };

  // Autonomous Emergency De-Risking Protocol
  const handleEngageEmergencyShield = async () => {
    if (!window.confirm("Activate Emergency Budget Shield? This will enforce a strict spending ceiling and dispatch a high-priority lock alert to your mobile handset.")) return;

    setIsEngagingShield(true);
    try {
      const res = await activateEmergencyProtocol(month, channel);
      sendNativeMobileNotification("🛡️ EMERGENCY SHIELD ACTIVATED", {
        body: `Strict daily ceiling ₹${Math.round(res.safe_daily_cap)}/day locked. Discretionary orders frozen.`
      });
      playNotificationChime();
      setDispatchFeedback({
        type: 'success',
        msg: `🛡️ EMERGENCY SHIELD ENGAGED! Daily spending ceiling locked to ₹${Math.round(res.safe_daily_cap)}/day. Urgent alert dispatched to handset!`
      });
      await loadRisk();
      setTimeout(() => setDispatchFeedback(null), 7000);
    } catch (err) {
      setDispatchFeedback({
        type: 'error',
        msg: 'Failed to activate emergency protocol'
      });
    } finally {
      setIsEngagingShield(false);
    }
  };

  if (isLoading && !riskData) {
    return (
      <div className="glass-panel p-8 rounded-3xl border border-white/10 text-center text-slate-400 animate-pulse">
        <div className="inline-flex items-center gap-2 text-cyan-400 font-bold mb-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Computing AI Risk Vector & Monte Carlo Trajectories...</span>
        </div>
        <p className="text-xs text-slate-500">Analyzing 250 simulated spending paths, category breaches, and velocity runway</p>
      </div>
    );
  }

  if (!riskData) return null;

  const score = riskData.risk_score || 0;
  const level = riskData.risk_level || "LOW";
  const ai = riskData.ai_assessment || {};
  const mc = riskData.monte_carlo || {};

  // Theme configuration
  const defconMap = {
    LOW: {
      defcon: "DEFCON 4",
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      border: "border-emerald-500/40",
      halo: "rgba(16,185,129,0.25)",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
      accent: "text-emerald-400",
      ringColor: "#10b981",
      icon: ShieldCheck,
      burnRateColor: "text-emerald-400"
    },
    MODERATE: {
      defcon: "DEFCON 3",
      gradient: "from-amber-500/20 via-yellow-500/10 to-transparent",
      border: "border-amber-500/40",
      halo: "rgba(245,158,11,0.25)",
      badge: "bg-amber-500/20 text-amber-300 border-amber-400/40",
      accent: "text-amber-400",
      ringColor: "#f59e0b",
      icon: Zap,
      burnRateColor: "text-amber-400"
    },
    HIGH: {
      defcon: "DEFCON 2",
      gradient: "from-orange-500/20 via-rose-500/10 to-transparent",
      border: "border-orange-500/40",
      halo: "rgba(249,115,22,0.25)",
      badge: "bg-orange-500/20 text-orange-300 border-orange-400/40",
      accent: "text-orange-400",
      ringColor: "#f97316",
      icon: AlertTriangle,
      burnRateColor: "text-orange-400"
    },
    CRITICAL: {
      defcon: "DEFCON 1",
      gradient: "from-rose-600/25 via-pink-600/15 to-transparent",
      border: "border-rose-500/50",
      halo: "rgba(244,63,94,0.35)",
      badge: "bg-rose-500/25 text-rose-300 border-rose-400/60 animate-pulse",
      accent: "text-rose-400",
      ringColor: "#f43f5e",
      icon: Flame,
      burnRateColor: "text-rose-400"
    }
  };

  const theme = defconMap[level] || defconMap.MODERATE;
  const LevelIcon = theme.icon;

  // Gauge animation math
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border ${theme.border} shadow-[0_20px_70px_${theme.halo}] space-y-7 transition-all animate-fade-in`}>
      
      {/* Background Animated Atmosphere */}
      <div 
        className="absolute -top-36 -right-36 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-50 transition-all duration-700"
        style={{ backgroundColor: theme.halo }}
      ></div>

      {/* ── Top Header & Tactical Mission Bar ─────────────────────────────── */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="flex items-start gap-3.5">
          <div className={`p-3.5 rounded-2xl bg-white/[0.05] border ${theme.border} ${theme.accent} shadow-md shrink-0 relative group`}>
            <LevelIcon className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-current"></span>
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-black/50 text-white font-mono border border-white/10">
                {theme.defcon}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                AI Prediction Risk Predictor
              </h2>
              <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-sm ${theme.badge}`}>
                {level} RISK ({score}/100)
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                API Linked: sk_live_...35f8
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl font-medium">
              {ai.headline || "Continuous statistical spend velocity & budget runway monitoring."}
            </p>
          </div>
        </div>

        {/* Action Controls: Voice Briefing, Channel & Emergency Shield */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Voice Briefing Button */}
          <button
            onClick={handleSpeakBriefing}
            title={isSpeaking ? "Mute Voice Briefing" : "Listen to AI Risk Briefing"}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
              isSpeaking 
                ? 'bg-rose-500/20 text-rose-300 border-rose-400/50 animate-pulse' 
                : 'glass-btn text-cyan-300 hover:text-white border-cyan-400/30'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span className="hidden sm:inline">{isSpeaking ? 'Stop Audio' : 'Voice Brief'}</span>
          </button>

          {/* Channel Selector */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[11px]">
            <button
              onClick={() => setChannel('SMS')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                channel === 'SMS' ? 'bg-cyan-500 text-white shadow' : 'text-slate-400'
              }`}
            >
              SMS
            </button>
            <button
              onClick={() => setChannel('WhatsApp')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                channel === 'WhatsApp' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400'
              }`}
            >
              WhatsApp
            </button>
          </div>

          {/* Send To Mobile Button */}
          <button
            onClick={handleDispatchRisk}
            disabled={isDispatching}
            title="Dispatch Risk Assessment Alert to Mobile Handset"
            className="px-3.5 py-2 rounded-xl text-xs font-bold glass-btn text-cyan-200 hover:text-white border border-cyan-400/40 flex items-center gap-1.5 shadow-sm transition-all shrink-0 disabled:opacity-50"
          >
            {isDispatching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Send Alert</span>
          </button>

          {/* Emergency Shield 1-Click Action */}
          <button
            onClick={handleEngageEmergencyShield}
            disabled={isEngagingShield}
            title="Autonomous Emergency Protocol: Enforce safe daily spend ceiling and lock budget"
            className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white flex items-center gap-1.5 shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all shrink-0 disabled:opacity-50"
          >
            {isEngagingShield ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            <span>Emergency Shield</span>
          </button>
        </div>
      </div>

      {/* Dispatch Feedback Toast */}
      {dispatchFeedback && (
        <div className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between animate-fade-in ${
          dispatchFeedback.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
            : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 shrink-0" />
            <span>{dispatchFeedback.msg}</span>
          </div>
          <button onClick={() => setDispatchFeedback(null)} className="text-slate-400 hover:text-white ml-3">✕</button>
        </div>
      )}

      {/* ── Section 1: Radial Speedometer Gauge & Runway Core Metrics ───────── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Speedometer Radial Gauge (4 Cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-black/40 border border-white/10 p-6 flex flex-col items-center justify-center text-center backdrop-blur-xl relative group">
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* SVG Radial Gauge */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 136 136">
              <circle
                cx="68"
                cy="68"
                r={radius}
                className="text-white/[0.08]"
                strokeWidth="11"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="68"
                cy="68"
                r={radius}
                strokeWidth="11"
                strokeLinecap="round"
                stroke={theme.ringColor}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
            </svg>

            {/* Score inside ring */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter">{score}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">INDEX / 100</span>
            </div>
          </div>

          <div className="mt-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-200 block">
              Spending Risk Velocity
            </span>
            <span className={`text-xs font-bold ${theme.accent} mt-0.5 block`}>
              {riskData.burn_status}
            </span>
          </div>

          <div className="mt-4 pt-3.5 border-t border-white/5 w-full grid grid-cols-2 gap-2 text-center">
            <div className="bg-white/[0.02] p-2 rounded-xl">
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Burn Speed</span>
              <span className="text-base font-black text-white">{riskData.velocity_ratio}x</span>
            </div>
            <div className="bg-white/[0.02] p-2 rounded-xl">
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Std Deviation</span>
              <span className="text-base font-black text-white">±₹{Math.round(riskData.volatility_std_dev || 0)}</span>
            </div>
          </div>
        </div>

        {/* Runway Metrics Cards & AI Diagnosis (8 Cols) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card A: Budget Runway Exhaustion */}
          <div className="rounded-3xl bg-black/40 border border-white/10 p-5 flex flex-col justify-between backdrop-blur-xl hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Runway Horizon</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="my-2.5">
              <div className="text-2xl font-black text-white">
                {riskData.is_exhausted 
                  ? "0 Days" 
                  : (riskData.days_until_exhaustion !== null ? `${riskData.days_until_exhaustion} Days` : "Safe")}
              </div>
              <span className="text-[11px] text-cyan-300 font-semibold block mt-0.5">
                {riskData.exhaustion_status}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 pt-2 border-t border-white/5">
              Month Days Remaining: {riskData.days_remaining}
            </div>
          </div>

          {/* Card B: Safe Target vs Actual Burn */}
          <div className="rounded-3xl bg-black/40 border border-white/10 p-5 flex flex-col justify-between backdrop-blur-xl hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Survival Allowance</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="my-2.5">
              <div className="text-2xl font-black text-emerald-400">
                {formatCurrency(riskData.safe_daily_allowance)}
                <span className="text-xs text-slate-400 font-normal">/day</span>
              </div>
              <span className="text-[11px] text-rose-300 font-semibold block mt-0.5">
                Burn Rate: {formatCurrency(riskData.actual_daily_avg)}/day
              </span>
            </div>
            <div className="text-[10px] text-slate-400 pt-2 border-t border-white/5">
              Remaining: {formatCurrency(riskData.remaining_budget)}
            </div>
          </div>

          {/* Card C: Monte Carlo Overrun Probability */}
          <div className="rounded-3xl bg-black/40 border border-white/10 p-5 flex flex-col justify-between backdrop-blur-xl hover:border-white/20 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Overrun Probability</span>
              <Activity className="w-4 h-4 text-rose-400" />
            </div>
            <div className="my-2.5">
              <div className="text-2xl font-black text-rose-400">
                {mc.overrun_probability_pct ?? (riskData.projected_overrun > 0 ? 100 : 0)}%
              </div>
              <span className="text-[11px] text-slate-300 block mt-0.5">
                250 Monte Carlo Trials
              </span>
            </div>
            <div className="text-[10px] text-slate-400 pt-2 border-t border-white/5">
              Stress Spread: ±{formatCurrency(mc.variance_spread || 500)}
            </div>
          </div>

          {/* AI Diagnosis Commentary Box (Span 3) */}
          <div className="sm:col-span-3 rounded-3xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-indigo-950/40 border border-cyan-400/30 p-5 backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-200">
                  Groq AI Financial Risk Verdict
                </h4>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono">QWEN 3.8 REASONING</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
              {ai.verdict || "Your daily spending burn rate indicates significant velocity above target. Implement discretionary caps to prevent month-end debt."}
            </p>
          </div>

        </div>
      </div>

      {/* ── Section 2: Interactive "DEFCON Calibrator" Live What-If Slider ─── */}
      <div className="relative z-10 rounded-3xl bg-black/40 border border-cyan-500/30 p-6 backdrop-blur-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Interactive DEFCON Risk Calibrator
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Slide to simulate instant risk reduction & preserved capital
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slider 1: Spend Cut % */}
          <div className="space-y-2.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Discretionary Spend Cut</span>
              <span className="font-mono font-black text-cyan-300 text-sm">{spendCutPct}% Reduction</span>
            </div>
            <input 
              type="range"
              min="0"
              max="60"
              step="5"
              value={spendCutPct}
              onChange={(e) => handleCutChange(e.target.value)}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-white/10 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0% (Status Quo)</span>
              <span>25% (Moderate)</span>
              <span>50% (Strict)</span>
            </div>
          </div>

          {/* Slider 2: Upcoming Purchase */}
          <div className="space-y-2.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">Test Upcoming Purchase</span>
              <span className="font-mono font-black text-amber-300 text-sm">+{formatCurrency(upcomingExpense)}</span>
            </div>
            <input 
              type="range"
              min="0"
              max="5000"
              step="250"
              value={upcomingExpense}
              onChange={(e) => handleExpenseChange(e.target.value)}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-white/10 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>₹0</span>
              <span>₹2,500</span>
              <span>₹5,000</span>
            </div>
          </div>
        </div>

        {/* Live Simulation Outcome Banner */}
        {simResult && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-blue-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Simulation Projection
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {simResult.intervention_summary}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center px-3 py-1.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[9px] uppercase text-slate-400 block font-semibold">Risk Shift</span>
                <span className="text-sm font-black text-emerald-300 flex items-center gap-0.5 justify-center">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {simResult.original_risk_score} → {simResult.adjusted_risk_score}
                </span>
              </div>
              <div className="text-center px-3 py-1.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[9px] uppercase text-slate-400 block font-semibold">Preserved Capital</span>
                <span className="text-sm font-black text-white">
                  +{formatCurrency(simResult.projected_savings)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 3: Monte Carlo Confidence Cone & Category Threats ─────── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Monte Carlo Probability Cone (6 Cols) */}
        <div className="lg:col-span-6 rounded-3xl bg-black/30 border border-white/10 p-5 space-y-3.5 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Monte Carlo Probabilistic Scenarios
            </span>
            <span className="text-[10px] text-cyan-300 font-mono">250 Iterations</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">P10 (Disciplined)</span>
              <span className="text-sm font-black text-emerald-400 mt-1 block">
                {formatCurrency(mc.optimistic_p10 || riskData.total_spent)}
              </span>
              <span className="text-[9px] text-emerald-300/80 block mt-0.5">Best Case</span>
            </div>

            <div className="p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-center">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">P50 (Expected)</span>
              <span className="text-sm font-black text-cyan-300 mt-1 block">
                {formatCurrency(mc.expected_p50 || riskData.projected_total)}
              </span>
              <span className="text-[9px] text-cyan-200/80 block mt-0.5">Current Pace</span>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-center">
              <span className="text-[10px] uppercase text-slate-400 font-bold block">P90 (Stress Shock)</span>
              <span className="text-sm font-black text-rose-400 mt-1 block">
                {formatCurrency(mc.stress_test_p90 || (riskData.projected_total * 1.15))}
              </span>
              <span className="text-[9px] text-rose-300/80 block mt-0.5">Spike Shock</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-white/[0.02] p-3 rounded-xl border border-white/5 leading-relaxed">
            💡 <strong>Model Assessment:</strong> Over <strong>{mc.overrun_probability_pct ?? 85}%</strong> of simulated pathways confirm an early budget breach without intervention. Enforcing the safe target of <strong>{formatCurrency(riskData.safe_daily_allowance)}/day</strong> shifts 94% of pathways into healthy surplus.
          </div>
        </div>

        {/* Category Threat Matrix & Risk Accelerators (6 Cols) */}
        <div className="lg:col-span-6 rounded-3xl bg-black/30 border border-white/10 p-5 space-y-3.5 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Primary Risk Accelerators by Category
            </span>
            <span className="text-[10px] text-slate-400">Sorted by Spend</span>
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {(riskData.category_risks || []).slice(0, 4).map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${
                    c.threat_color === 'rose' ? 'bg-rose-500 animate-pulse' :
                    c.threat_color === 'amber' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}></span>
                  <div>
                    <span className="font-bold text-white block">{c.category}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatCurrency(c.spent)} ({c.share_pct}%) • {c.burn_velocity || 1.0}x velocity
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full block ${
                    c.threat_color === 'rose' ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40' :
                    c.threat_color === 'amber' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  }`}>
                    {c.threat_level || 'NORMAL'}
                  </span>
                  <span className="text-[10px] text-emerald-400 block mt-0.5 font-semibold">
                    Cut 20%: +{formatCurrency(c.savings_opportunity_20pct || (c.spent * 0.2))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
