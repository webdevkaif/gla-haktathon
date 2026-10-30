import React, { useState } from 'react';
import { 
  Bot, 
  Smartphone, 
  ShieldCheck, 
  TrendingUp, 
  Maximize2, 
  Minimize2, 
  Zap, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  Layers, 
  DollarSign, 
  PieChart, 
  Clock, 
  ChevronRight,
  Activity,
  Compass
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatters';

export default function GlassmorphismExecutiveHUD({
  summary,
  budget,
  forecast,
  anomalyReport,
  onToggleChat,
  onTogglePhoneAlerts,
  onNavigateTab,
  onOpenAddExpense
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [glassTheme, setGlassTheme] = useState('OBSIDIAN'); // 'OBSIDIAN', 'AURORA', 'QUANTUM'

  const pct = summary?.percentage_used || 0;
  const spent = summary?.total_spent || 0;
  const totalBudget = summary?.total_budget || budget?.total_budget || 50000;
  const remaining = summary?.remaining_budget ?? (totalBudget - spent);
  const isBudgetExceeded = pct >= 100;
  const isBudgetWarning = pct >= 75 && pct < 100;

  const anomaliesCount = anomalyReport?.anomalies_detected ?? 0;
  const daysLeft = summary?.days_remaining ?? 14;
  const dailyTarget = summary?.daily_budget_remaining ?? (daysLeft > 0 ? remaining / daysLeft : 0);

  // Theme-specific styles for glass accents
  const themeStyles = {
    OBSIDIAN: {
      border: 'border-cyan-500/30',
      glow: 'shadow-[0_0_50px_rgba(6,182,212,0.18)]',
      gradient: 'from-cyan-950/40 via-slate-900/80 to-slate-950/90',
      accentText: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      buttonPrimary: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25',
    },
    AURORA: {
      border: 'border-purple-500/30',
      glow: 'shadow-[0_0_50px_rgba(168,85,247,0.18)]',
      gradient: 'from-purple-950/40 via-slate-900/80 to-slate-950/90',
      accentText: 'text-purple-400',
      badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      buttonPrimary: 'bg-gradient-to-r from-purple-500 via-indigo-600 to-pink-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25',
    },
    QUANTUM: {
      border: 'border-emerald-500/30',
      glow: 'shadow-[0_0_50px_rgba(16,185,129,0.18)]',
      gradient: 'from-emerald-950/40 via-slate-900/80 to-slate-950/90',
      accentText: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      buttonPrimary: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25',
    }
  }[glassTheme];

  return (
    <div className={`relative rounded-3xl border ${themeStyles.border} bg-gradient-to-br ${themeStyles.gradient} backdrop-blur-2xl ${themeStyles.glow} overflow-hidden transition-all duration-300 ${
      isFullscreen ? 'fixed inset-4 z-50 rounded-2xl flex flex-col p-6 shadow-2xl overflow-y-auto' : 'w-full p-5 sm:p-6'
    }`}>
      
      {/* Background Decorative Mesh Orbs */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-blue-600/10 blur-[80px] pointer-events-none" />

      {/* Top Header: System Identity & Theme Switcher */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-xl shadow-inner">
            <Layers className={`w-5 h-5 ${themeStyles.accentText}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                Executive Financial Intelligence Cockpit
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${themeStyles.badgeBg}`}>
                Autonomous v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time cashflow telemetry, PyOD anomaly shielding, and multi-channel notification engine.
            </p>
          </div>
        </div>

        {/* Style Preset Selector & Fullscreen */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/[0.08] backdrop-blur-xl text-xs">
            <button
              onClick={() => setGlassTheme('OBSIDIAN')}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                glassTheme === 'OBSIDIAN'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Obsidian
            </button>
            <button
              onClick={() => setGlassTheme('AURORA')}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                glassTheme === 'AURORA'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Aurora
            </button>
            <button
              onClick={() => setGlassTheme('QUANTUM')}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                glassTheme === 'QUANTUM'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Quantum
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-5">
        
        {/* Metric 1: Monthly Spend */}
        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Outflow ({summary?.month || 'Current'})</span>
            <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {formatCurrency(spent)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Budget: {formatCurrency(totalBudget)}</span>
            <span className={`font-mono font-bold ${isBudgetExceeded ? 'text-rose-400' : isBudgetWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
              {formatPercent(pct)}
            </span>
          </div>
        </div>

        {/* Metric 2: Remaining Runway */}
        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Safe Remaining Allowance</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className={`text-xl sm:text-2xl font-black tracking-tight ${remaining < 0 ? 'text-rose-400' : 'text-emerald-300'}`}>
            {formatCurrency(remaining)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>{daysLeft} days left in cycle</span>
            <span className="font-mono text-slate-300">{formatCurrency(dailyTarget)}/day</span>
          </div>
        </div>

        {/* Metric 3: PyOD Anomaly Shield */}
        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">PyOD Isolation Forest</span>
            <ShieldCheck className={`w-3.5 h-3.5 ${anomaliesCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {anomaliesCount === 0 ? '0 Flags' : `${anomaliesCount} Anomaly`}
            </span>
            <span className={`w-2 h-2 rounded-full ${anomaliesCount > 0 ? 'bg-rose-400 animate-pulse' : 'bg-emerald-400'}`} />
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Statistical Confidence</span>
            <span className="font-mono text-emerald-400 font-bold">98.4%</span>
          </div>
        </div>

        {/* Metric 4: Lead Category Velocity */}
        <div className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl transition-all space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Top Category Velocity</span>
            <PieChart className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
            {summary?.top_category || 'Operations'}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Consumed:</span>
            <span className="font-mono text-cyan-300 font-bold">
              {formatCurrency(summary?.top_category_amount || 0)}
            </span>
          </div>
        </div>

      </div>

      {/* Budget Progress Bar */}
      <div className="relative z-10 p-4 rounded-2xl bg-black/30 border border-white/[0.06] backdrop-blur-xl space-y-2 my-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-semibold flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Monthly Allocation Consumption Rate
          </span>
          <span className="font-mono font-bold text-white">
            {formatCurrency(spent)} of {formatCurrency(totalBudget)} ({formatPercent(pct)})
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden border border-white/5">
          <div 
            className={`h-full rounded-full transition-all duration-700 ${
              isBudgetExceeded 
                ? 'bg-gradient-to-r from-rose-500 to-red-600' 
                : isBudgetWarning 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400'
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>

      {/* Interactive Action Hub (Same essential features without cartoon clutter) */}
      <div className="relative z-10 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </span>
          <span>Zero-friction financial orchestration ready</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action 1: Talk to AI Copilot */}
          <button
            type="button"
            onClick={onToggleChat}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${themeStyles.buttonPrimary}`}
          >
            <Bot className="w-4 h-4" />
            <span>Ask Pilot AI Copilot</span>
          </button>

          {/* Action 2: Phone Alerts & Multi-Recipient Dispatch */}
          <button
            type="button"
            onClick={onTogglePhoneAlerts}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white/[0.05] hover:bg-white/[0.09] text-white border border-white/10 hover:border-cyan-400/40 transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Phone Alerts & Dispatch</span>
          </button>

          {/* Action 3: 90-Day Roadmap */}
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('invoices')}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white/[0.05] hover:bg-white/[0.09] text-slate-200 border border-white/10 hover:border-purple-400/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-purple-400" />
              <span>90-Day Roadmap</span>
            </button>
          )}

          {/* Action 4: Quick Log Expense */}
          {onOpenAddExpense && (
            <button
              type="button"
              onClick={onOpenAddExpense}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white/[0.05] hover:bg-white/[0.09] text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/60 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Log Expense</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

