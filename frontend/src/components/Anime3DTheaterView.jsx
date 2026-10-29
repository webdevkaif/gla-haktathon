import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Wind, 
  Flame, 
  Zap, 
  Bot, 
  Layers, 
  Compass, 
  Maximize2, 
  Minimize2,
  FileText,
  ShieldCheck,
  CheckSquare,
  BarChart3,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';
import NarutoShinobiJutsuHUD from './NarutoShinobiJutsuHUD';
import GhibliMeadowHUD from './GhibliMeadowHUD';
import AnimeAgentCinemaHUD from './AnimeAgentCinemaHUD';
import Naruto3DCanvas from './Naruto3DCanvas';
import { fetchDashboardSummary } from '../api';

export default function Anime3DTheaterView({ currentUser, onNavigateTab }) {
  const [activeHud, setActiveHud] = useState('NARUTO'); // 'NARUTO' | 'GHIBLI' | 'CYBER' | 'STANDALONE_3D'
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeJutsu, setActiveJutsu] = useState('RASENGAN');

  useEffect(() => {
    let isMounted = true;
    fetchDashboardSummary()
      .then(res => {
        if (isMounted && res.data) {
          setDashboardData(res.data);
        }
      })
      .catch(err => console.log('Dashboard summary fetch notice:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Format mock/live telemetry for the HUDs
  const telemetrySummary = {
    total_spent: dashboardData?.total_spent_mtd || 382400,
    budget_limit: 850000,
    daily_average: dashboardData?.daily_burn_rate || 14200,
    savings_protected: dashboardData?.risk_prevention_savings || 42800,
    active_claims: dashboardData?.pending_approvals_count || 5,
    flagged_invoices: dashboardData?.flagged_invoices_count || 3,
  };

  const mockBudget = {
    total_budget: 850000,
    spent: dashboardData?.total_spent_mtd || 382400,
    remaining: 850000 - (dashboardData?.total_spent_mtd || 382400),
    percentage_used: 45.0,
  };

  const mockForecast = {
    projected_month_end: 780000,
    confidence_score: 0.94,
    burn_status: 'HEALTHY'
  };

  return (
    <div className="w-full space-y-6 animate-fade-in pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          TOP CONTROL BAR & 3D ENGINE SELECTOR
          ───────────────────────────────────────────────────────────── */}
      <div className="glass-panel p-4 rounded-3xl border border-white/15 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">3D Visual Engine & Interactive Anime HUDs</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">
                STAGE-1 REIMAGINED
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive Three.js particle vortex, reactive sound synthesizers, and real-time corporate telemetry.
            </p>
          </div>
        </div>

        {/* HUD Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl">
          
          <button
            onClick={() => setActiveHud('NARUTO')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeHud === 'NARUTO'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)] border border-white/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🌀</span>
            <span>3D Naruto Shinobi</span>
          </button>

          <button
            onClick={() => setActiveHud('STANDALONE_3D')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeHud === 'STANDALONE_3D'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-white/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>⚡</span>
            <span>Pure 3D Canvas</span>
          </button>

          <button
            onClick={() => setActiveHud('CYBER')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeHud === 'CYBER'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🤖</span>
            <span>Cyber Pilot HUD</span>
          </button>

          <button
            onClick={() => setActiveHud('GHIBLI')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeHud === 'GHIBLI'
                ? 'bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-white/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>🌿</span>
            <span>Studio Ghibli Meadow</span>
          </button>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ACTIVE 3D DISPLAY VIEW
          ───────────────────────────────────────────────────────────── */}
      {activeHud === 'NARUTO' && (
        <NarutoShinobiJutsuHUD
          summary={telemetrySummary}
          budget={mockBudget}
          forecast={mockForecast}
          onToggleChat={() => onNavigateTab('chat')}
          onTogglePhoneAlerts={() => onNavigateTab('approvals_escalations')}
          onNavigateTab={onNavigateTab}
        />
      )}

      {activeHud === 'STANDALONE_3D' && (
        <div className="glass-panel rounded-3xl p-6 border border-cyan-500/30 shadow-[0_20px_50px_rgba(6,182,212,0.2)]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                Three.js Interactive 3D Chakra Energy Vortex
              </h3>
              <p className="text-xs text-slate-400">
                Click & drag to rotate 3D particle fields. Sound synthesizer and turbine RPM reactive controls.
              </p>
            </div>

            {/* Jutsu Quick Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {['RASENGAN', 'RASENSHURIKEN', 'KURAMA', 'CHIDORI'].map((j) => (
                <button
                  key={j}
                  onClick={() => setActiveJutsu(j)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all border ${
                    activeJutsu === j
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/40'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/80">
            <Naruto3DCanvas activeJutsu={activeJutsu} />
          </div>
        </div>
      )}

      {activeHud === 'CYBER' && (
        <AnimeAgentCinemaHUD
          summary={telemetrySummary}
          budget={mockBudget}
          forecast={mockForecast}
          onToggleChat={() => onNavigateTab('chat')}
          onTogglePhoneAlerts={() => onNavigateTab('claims_invoices')}
          onNavigateTab={onNavigateTab}
        />
      )}

      {activeHud === 'GHIBLI' && (
        <GhibliMeadowHUD
          summary={telemetrySummary}
          budget={mockBudget}
          forecast={mockForecast}
          onToggleChat={() => onNavigateTab('chat')}
          onTogglePhoneAlerts={() => onNavigateTab('audit')}
          onNavigateTab={onNavigateTab}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          QUICK ENTERPRISE FUNCTION ROUTER
          ───────────────────────────────────────────────────────────── */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 shadow-xl">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
          Direct Access to Enterprise Financial Workflows
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <button
            onClick={() => onNavigateTab('claims_invoices')}
            className="p-3 rounded-2xl bg-white/[0.04] hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 text-left transition-all group"
          >
            <FileText className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Claims & Invoices</div>
            <div className="text-[10px] text-slate-400">OCR & grade caps</div>
          </button>

          <button
            onClick={() => onNavigateTab('approvals_escalations')}
            className="p-3 rounded-2xl bg-white/[0.04] hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 text-left transition-all group"
          >
            <CheckSquare className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Approvals Matrix</div>
            <div className="text-[10px] text-slate-400">Multi-level signoff</div>
          </button>

          <button
            onClick={() => onNavigateTab('audit')}
            className="p-3 rounded-2xl bg-white/[0.04] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-left transition-all group"
          >
            <ShieldCheck className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Cryptographic Audit</div>
            <div className="text-[10px] text-slate-400">SHA-256 block ledger</div>
          </button>

          <button
            onClick={() => onNavigateTab('chat')}
            className="p-3 rounded-2xl bg-white/[0.04] hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 text-left transition-all group"
          >
            <Bot className="w-5 h-5 text-orange-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Autonomous Copilot</div>
            <div className="text-[10px] text-slate-400">Groq, Gemini, Grok</div>
          </button>

          <button
            onClick={() => onNavigateTab('dashboard')}
            className="p-3 rounded-2xl bg-white/[0.04] hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 text-left transition-all group"
          >
            <BarChart3 className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Finance Dashboard</div>
            <div className="text-[10px] text-slate-400">Budgets & velocity</div>
          </button>

          <button
            onClick={() => onNavigateTab('spatial')}
            className="p-3 rounded-2xl bg-white/[0.04] hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 text-left transition-all group"
          >
            <Compass className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Spatial OS</div>
            <div className="text-[10px] text-slate-400">Time-horizon ribbon</div>
          </button>

        </div>
      </div>

    </div>
  );
}
