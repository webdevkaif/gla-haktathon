import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Wallet, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight,
  Sliders,
  Bot,
  Copy,
  FileSearch,
  Lock,
  CheckCircle2,
  ArrowRight 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar 
} from 'recharts';
import { formatCurrency, formatPercent, getCategoryColor } from '../utils/formatters';
import { fetchAnomalyDetections } from '../api';
import AnimeAgentCinemaHUD from './AnimeAgentCinemaHUD';
import NarutoShinobiJutsuHUD from './NarutoShinobiJutsuHUD';
import GhibliMeadowHUD from './GhibliMeadowHUD';
import GhibliButton from './GhibliButton';

export default function DashboardOverview({ 
  summary, 
  budget, 
  forecast, 
  onNavigateTab, 
  onOpenAddExpense, 
  onToggleChat,
  onTogglePhoneAlerts 
}) {
  const [hudTheme, setHudTheme] = useState('GHIBLI'); // 'GHIBLI', 'NARUTO', or 'CYBER'
  const [anomalyReport, setAnomalyReport] = useState(null);
  const [isAnomalyLoading, setIsAnomalyLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadAnomalies() {
      try {
        setIsAnomalyLoading(true);
        const data = await fetchAnomalyDetections(summary?.month || '2026-10');
        if (isMounted) setAnomalyReport(data);
      } catch (err) {
        console.error('[PyOD Isolation Forest Error]', err);
      } finally {
        if (isMounted) setIsAnomalyLoading(false);
      }
    }
    if (summary) {
      loadAnomalies();
    }
    return () => { isMounted = false; };
  }, [summary?.month, summary?.total_spent]);

  if (!summary || !budget) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-400 border-t-transparent"></div>
      </div>
    );
  }

  const pct = summary.percentage_used || 0;
  const isBudgetWarning = pct >= 75 && pct < 100;
  const isBudgetExceeded = pct >= 100;

  // Prepare chart data
  const pieData = (summary.categories || []).map((c) => ({
    name: c.category,
    value: c.amount,
    count: c.count,
    color: getCategoryColor(c.category),
  }));

  const velocityData = [
    { name: 'Weekday Avg', amount: forecast?.avg_weekday || summary.daily_avg_spent || 0, fill: '#06b6d4' },
    { name: 'Weekend Avg', amount: forecast?.avg_weekend || summary.daily_avg_spent * 1.3 || 0, fill: '#ec4899' },
    { name: 'Safe Daily Target', amount: summary.daily_budget_remaining || 0, fill: '#10b981' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* HUD Theme Switcher Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
            Visual Anime & 3D Engine
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            Interactive
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-2 px-3 rounded-2xl bg-slate-900/90 border border-white/20 backdrop-blur-xl shadow-xl">
          {/* Studio Ghibli Theme Button */}
          <button
            onClick={() => setHudTheme('GHIBLI')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              hudTheme === 'GHIBLI'
                ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-white/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>🌿</span>
            <span>Studio Ghibli Meadow</span>
          </button>

          {/* 3D Naruto Shinobi Button */}
          <button
            onClick={() => setHudTheme('NARUTO')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              hudTheme === 'NARUTO'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-white/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>🌀</span>
            <span>3D Naruto Shinobi</span>
          </button>

          {/* Cyber-Anime Pilot Button */}
          <button
            onClick={() => setHudTheme('CYBER')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              hudTheme === 'CYBER'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-white/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>🤖</span>
            <span>Cyber-Anime Pilot</span>
          </button>
        </div>
      </div>

      {/* Conditional Active AI Pilot HUD */}
      {hudTheme === 'GHIBLI' ? (
        <GhibliMeadowHUD
          summary={summary}
          budget={budget}
          forecast={forecast}
          onToggleChat={onToggleChat}
          onTogglePhoneAlerts={onTogglePhoneAlerts}
          onNavigateTab={onNavigateTab}
        />
      ) : hudTheme === 'NARUTO' ? (
        <NarutoShinobiJutsuHUD
          summary={summary}
          budget={budget}
          forecast={forecast}
          onToggleChat={onToggleChat}
          onTogglePhoneAlerts={onTogglePhoneAlerts}
          onNavigateTab={onNavigateTab}
        />
      ) : (
        <AnimeAgentCinemaHUD
          summary={summary}
          budget={budget}
          forecast={forecast}
          onToggleChat={onToggleChat}
          onTogglePhoneAlerts={onTogglePhoneAlerts}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* Autonomous Agent Status Banner - Ultra Frosted Glass */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 glass-panel border border-emerald-500/30 shadow-[0_20px_50px_rgba(16,185,129,0.15)]">
        {/* Subtle internal neon blur */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-white text-base sm:text-lg tracking-tight">
                  Autonomous Cycle Active: Observe → Analyze → Decide → Act
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  LIVE RUNTIME
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isBudgetExceeded
                  ? `⚠️ Budget Alert: You have exceeded your ₹${summary.total_budget.toLocaleString('en-IN')} ceiling. Pilot AI recommends a temporary freeze on discretionary spending.`
                  : isBudgetWarning
                  ? `⚠️ Caution: You've consumed ${pct}% of your budget with ${summary.days_remaining} days left. Main driver: ${summary.top_category} (${formatCurrency(summary.top_category_amount)}).`
                  : `✅ Healthy Pace: Safe to spend ~${formatCurrency(summary.daily_budget_remaining)}/day to comfortably finish the month under budget.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GhibliButton
              onClick={() => onNavigateTab('simulator')}
              variant="parchment"
              icon={Sliders}
              showSprite={false}
              className="text-xs py-2 px-3"
            >
              Simulate What-If
            </GhibliButton>
            
            <GhibliButton
              onClick={onToggleChat}
              variant="forest"
              icon={Bot}
              showSprite={true}
              spritePosition="right"
              className="text-xs py-2 px-3.5"
            >
              Ask Agent
            </GhibliButton>
          </div>
        </div>
      </div>

      {/* Hackathon Winning Differentiators Showcase Strip */}
      <div className="p-6 rounded-3xl glass-panel border border-cyan-500/30 shadow-[0_20px_50px_rgba(6,182,212,0.12)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base tracking-tight flex items-center gap-2">
                <span>Hackathon Differentiators</span>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm">
                  Production Stack
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Beyond basic chatbots: Evidence citations • Duplicate detection • Explainable risk scoring • Approval workflow • SHA-256 audit • Exception dashboard
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab && onNavigateTab('enterprise')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:scale-105 transition-all shrink-0 w-fit"
          >
            <span>Open Enterprise HQ</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-300" />
          </button>
        </div>

        {/* 6 Colorful Action Buttons with Micro-Animations */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          <button
            onClick={() => onNavigateTab && onNavigateTab('enterprise')}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-lg shadow-rose-500/20 text-left transition-all duration-300 hover:scale-[1.04] group border border-white/20"
          >
            <div className="flex items-center justify-between mb-1.5">
              <AlertTriangle className="w-4 h-4 text-white" />
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            </div>
            <span className="text-xs font-extrabold block">1. Exceptions</span>
            <span className="text-[10px] text-white/80">High-risk first</span>
          </button>

          <button
            onClick={() => onNavigateTab && onNavigateTab('enterprise')}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 text-left transition-all duration-300 hover:scale-[1.04] group border border-white/20"
          >
            <div className="flex items-center justify-between mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            </div>
            <span className="text-xs font-extrabold block">2. Approvals</span>
            <span className="text-[10px] text-white/80">Friday disbursement</span>
          </button>

          <button
            onClick={() => onNavigateTab && onNavigateTab('enterprise')}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20 text-left transition-all duration-300 hover:scale-[1.04] group border border-white/20"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Copy className="w-4 h-4 text-white" />
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            </div>
            <span className="text-xs font-extrabold block">3. Duplicates</span>
            <span className="text-[10px] text-white/80">Zero double-pay</span>
          </button>

          <button
            onClick={() => onNavigateTab && onNavigateTab('enterprise')}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 text-left transition-all duration-300 hover:scale-[1.04] group border border-white/20"
          >
            <div className="flex items-center justify-between mb-1.5">
              <FileSearch className="w-4 h-4 text-white" />
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            </div>
            <span className="text-xs font-extrabold block">4. Explainable</span>
            <span className="text-[10px] text-white/80">Exact rule reasons</span>
          </button>

          <button
            onClick={() => onNavigateTab && onNavigateTab('enterprise')}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 text-left transition-all duration-300 hover:scale-[1.04] group border border-white/20"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Lock className="w-4 h-4 text-white" />
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            </div>
            <span className="text-xs font-extrabold block">5. SHA-256 Audit</span>
            <span className="text-[10px] text-white/80">Tamper-evident chain</span>
          </button>

          <button
            onClick={() => onNavigateTab && onNavigateTab('enterprise')}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/20 text-left transition-all duration-300 hover:scale-[1.04] group border border-white/20"
          >
            <div className="flex items-center justify-between mb-1.5">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            </div>
            <span className="text-xs font-extrabold block">6. Policy Evidence</span>
            <span className="text-[10px] text-white/80">Cited source rules</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Frosted Translucent Glass Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Total Spent */}
        <div className="glass-panel glass-panel-hover p-5 sm:p-6 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spent ({summary.month})</span>
            <div className="p-2.5 rounded-2xl bg-orange-500/15 border border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.25)]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
              {formatCurrency(summary.total_spent)}
            </h2>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-[11px] mb-1.5 font-semibold">
              <span className="text-slate-400">{pct}% of ₹{summary.total_budget.toLocaleString('en-IN')}</span>
              <span className={isBudgetExceeded ? 'text-rose-400' : isBudgetWarning ? 'text-amber-400' : 'text-emerald-400'}>
                {isBudgetExceeded ? 'Exceeded' : `${formatCurrency(summary.remaining_budget)} left`}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900/80 border border-white/5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 shadow-sm ${
                  isBudgetExceeded 
                    ? 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_10px_rgba(244,63,94,0.5)]' 
                    : isBudgetWarning 
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' 
                    : 'bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                }`}
                style={{ width: `${Math.min(100, pct)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Daily Allowance */}
        <div className="glass-panel glass-panel-hover p-5 sm:p-6 rounded-3xl group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Safe Daily Target</span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight drop-shadow-sm">
              {formatCurrency(summary.daily_budget_remaining)}
            </h2>
            <span className="text-xs font-medium text-slate-400">/ day</span>
          </div>
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">
            For remaining <strong className="text-slate-200">{summary.days_remaining} days</strong> (pace so far: {formatCurrency(summary.daily_avg_spent)}/day).
          </p>
        </div>

        {/* Forecast Month-End */}
        <div className="glass-panel glass-panel-hover p-5 sm:p-6 rounded-3xl group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projected Month-End</span>
            <div className={`p-2.5 rounded-2xl ${
              forecast?.is_projected_over 
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]' 
                : 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
              {formatCurrency(forecast?.projected_total || summary.total_spent * 1.2)}
            </h2>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold">
            {forecast?.is_projected_over ? (
              <span className="flex items-center gap-1 text-rose-400">
                <ArrowUpRight className="w-3.5 h-3.5" /> Over budget by {formatCurrency(forecast.diff_from_budget)}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <ArrowDownRight className="w-3.5 h-3.5" /> Under budget by {formatCurrency(Math.abs(forecast?.diff_from_budget || 0))}
              </span>
            )}
          </div>
        </div>

        {/* Largest Category */}
        <div className="glass-panel glass-panel-hover p-5 sm:p-6 rounded-3xl group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Largest Category</span>
            <div className="p-2.5 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.25)]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-pink-400 tracking-tight drop-shadow-sm">
              {summary.top_category}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">
            Consumes <strong className="text-slate-200">{formatCurrency(summary.top_category_amount)}</strong> ({formatPercent((summary.top_category_amount / (summary.total_spent || 1)) * 100)} of total spending).
          </p>
        </div>

      </div>

      {/* Standout Hackathon Feature: Explainable Spending Reason */}
      {summary.category_diffs && summary.category_diffs.length > 0 && (
        <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300 bg-cyan-500/20 px-2.5 py-1 rounded-lg border border-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
                Explainable Diagnostics
              </span>
              <span className="text-xs text-slate-300">
                Compared to {summary.previous_month?.month}: Total variance of {summary.previous_month?.diff_from_previous >= 0 ? '+' : ''}{formatCurrency(summary.previous_month?.diff_from_previous)}.
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs text-cyan-300 hover:text-cyan-200 font-bold underline transition-colors"
            >
              Inspect Transactions →
            </button>
          </div>
        </div>
      )}

      {/* Small Anomaly Detector Section (PyOD + Isolation Forest) */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-[#0d1527]/90 via-[#101b33]/90 to-[#0d1527]/90 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base tracking-tight">
                  Anomaly Detector
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  PyOD • Isolation Forest
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Unsupervised machine learning analysis of real MongoDB transactions
              </p>
            </div>
          </div>

          {/* Metric Counter Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {anomalyReport?.has_sufficient_history && (
              <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                anomalyReport.anomalies_detected > 0
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              }`}>
                <span>{anomalyReport.anomalies_detected} Anomalies Detected</span>
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Anomaly Content */}
        {isAnomalyLoading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-400 border-t-transparent" />
            <span>Running Isolation Forest statistical anomaly scan...</span>
          </div>
        ) : !anomalyReport?.has_sufficient_history ? (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-300 flex items-center gap-3">
            <Sparkles className="w-5 h-5 shrink-0 text-blue-400" />
            <span>{anomalyReport?.message || "Insufficient transaction history to detect statistical anomalies. Add at least 4 transactions."}</span>
          </div>
        ) : anomalyReport.anomalies_detected === 0 ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">✅ No unusual transactions detected.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {anomalyReport.anomalies.map((anomaly, idx) => (
                <div 
                  key={anomaly.id || idx}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-amber-500/30 hover:border-amber-400/60 transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>⚠️ Anomaly Detected</span>
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Status: {anomaly.status || "Review Recommended"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Amount</span>
                      <span className="font-extrabold text-rose-300 text-sm">{formatCurrency(anomaly.amount)}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">Category</span>
                      <span className="font-semibold text-slate-200">{anomaly.category}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 pt-1 border-t border-white/[0.06]">
                    <span className="text-slate-400 font-medium">Reason: </span>
                    <span>{anomaly.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Category Distribution Pie/Donut */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">Category Breakdown</h3>
            <span className="text-[11px] font-semibold text-slate-400 glass-pill px-2.5 py-0.5 rounded-full">
              {pieData.length} categories
            </span>
          </div>
          
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Spent']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(10, 16, 32, 0.9)', 
                    backdropFilter: 'blur(16px)',
                    borderColor: 'rgba(255, 255, 255, 0.15)', 
                    borderRadius: '16px', 
                    color: '#fff',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 max-h-36 overflow-y-auto pr-1">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-xs p-1 rounded-lg hover:bg-white/[0.04] transition-colors">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-300 truncate font-medium">{item.name}</span>
                <span className="ml-auto font-bold text-slate-400">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Velocity & Weekend vs Weekday analysis */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">Spending Velocity</h3>
              <p className="text-[11px] text-slate-400">Weekday vs Weekend spend pace</p>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  formatter={(val) => [formatCurrency(val), 'Daily Rate']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(10, 16, 32, 0.9)', 
                    backdropFilter: 'blur(16px)',
                    borderColor: 'rgba(255, 255, 255, 0.15)', 
                    borderRadius: '16px', 
                    color: '#fff',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {velocityData.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300">
            💡 <strong className="text-white">Behavioral Pattern:</strong> Weekend velocity runs at <strong className="text-pink-400">{formatCurrency(forecast?.avg_weekend || 0)}/day</strong> compared to <strong className="text-cyan-400">{formatCurrency(forecast?.avg_weekday || 0)}/day</strong> on weekdays.
          </div>
        </div>

        {/* Forecast Trajectory Area Chart */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">Cumulative Trajectory</h3>
              <p className="text-[11px] text-slate-400">Actual spend vs linear budget ceiling</p>
            </div>
            <button
              onClick={() => onNavigateTab('forecast')}
              className="text-xs font-bold text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              Full Forecast →
            </button>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast?.trajectory || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickFormatter={(d) => `D${d}`} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${Math.round(v/1000)}k`} />
                <Tooltip 
                  formatter={(val, name) => [formatCurrency(val), name === 'actual' ? 'Actual' : name === 'projected' ? 'Projected' : 'Linear Budget']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(10, 16, 32, 0.9)', 
                    backdropFilter: 'blur(16px)',
                    borderColor: 'rgba(255, 255, 255, 0.15)', 
                    borderRadius: '16px', 
                    color: '#fff',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                />
                <Area type="monotone" dataKey="actual" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActual)" />
                <Area type="monotone" dataKey="projected" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorProjected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span> Actual to date
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]"></span> Projected trajectory
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
