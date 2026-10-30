import AIRiskPredictorHUD from './AIRiskPredictorHUD';
import React from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Info, 
  Calendar, 
  DollarSign, 
  Activity 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { confirmUnusualExpense } from '../api';

export default function ForecastingCard({ forecast, expenses, onExpenseUpdated }) {
  if (!forecast) {
    return (
      <div className="p-16 text-center text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-sm font-semibold">Loading predictive forecast model...</p>
      </div>
    );
  }

  // Filter unusual expenses
  const unusualExpenses = (expenses || []).filter((e) => e.is_unusual);

  const handleConfirm = async (id) => {
    try {
      await confirmUnusualExpense(id);
      if (onExpenseUpdated) onExpenseUpdated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Autonomous AI Prediction Risk Predictor HUD */}
      <AIRiskPredictorHUD 
        month={forecast.month || "2026-10"} 
        onRiskUpdated={onExpenseUpdated} 
      />
      
      {/* Forecast Header Banner - Frosted Indigo-Cyan Glass */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 glass-panel border border-blue-500/30 shadow-[0_20px_50px_rgba(59,130,246,0.15)]">
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-500/20 border border-blue-400/40 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] backdrop-blur-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Statistical Spending Forecast
                </h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 shadow-[0_0_10px_rgba(59,130,246,0.25)]">
                  Velocity Extrapolation
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {forecast.summary_text}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-black/40 border border-white/[0.08] shadow-inner shrink-0 backdrop-blur-xl">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Projected Month-End Range</span>
            <div className="text-xl font-black text-white mt-1">
              {formatCurrency(forecast.projected_range?.min)} – {formatCurrency(forecast.projected_range?.max)}
            </div>
            <span className="text-[11px] text-cyan-300 block mt-1 font-medium">
              Budget Target: {formatCurrency(forecast.monthly_budget)}
            </span>
          </div>
        </div>
      </div>

      {/* Trajectory Composed Chart - Frosted Glass Container */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-5 border border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Day-by-Day Cumulative Spending Trajectory
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Compares actual historical spend to date with projected end-of-month curve</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span> Actual Spend
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1 border-t-2 border-dashed border-purple-400"></span> Extrapolated Curve
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1 border-t border-slate-600"></span> Linear Budget Ceiling
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecast.trajectory || []} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickFormatter={(d) => `Day ${d}`} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${Math.round(v/1000)}k`} />
              <Tooltip 
                formatter={(val, name) => [
                  formatCurrency(val), 
                  name === 'actual' ? 'Actual' : name === 'projected' ? 'Projected' : 'Linear Budget'
                ]}
                contentStyle={{ 
                  backgroundColor: 'rgba(10, 16, 32, 0.9)', 
                  backdropFilter: 'blur(16px)',
                  borderColor: 'rgba(255, 255, 255, 0.15)', 
                  borderRadius: '16px', 
                  color: '#fff',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
              />
              <Area type="monotone" dataKey="actual" fill="#0891b2" fillOpacity={0.25} stroke="#06b6d4" strokeWidth={2.5} />
              <Line type="monotone" dataKey="projected" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="budget_linear" stroke="#64748b" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Standout Feature: Unusual Transaction Detection Hub */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-5 border border-white/10 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight">Unusual Transactions & Anomaly Detection</h3>
              <p className="text-xs text-slate-400">Statistically flagged transactions exceeding typical category baselines (mean + 2σ)</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full glass-pill text-amber-300">
            {unusualExpenses.length} flagged
          </span>
        </div>

        {unusualExpenses.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-2 backdrop-blur-xl">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-100">No Statistical Anomalies Detected</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All transactions in this period adhere to your established category spending distributions.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {unusualExpenses.map((exp) => (
              <div 
                key={exp.id} 
                className="p-4 sm:p-5 rounded-2xl bg-amber-500/[0.08] border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg backdrop-blur-xl"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-white text-sm">{exp.description}</span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-white/[0.08] text-slate-200 border border-white/10">
                        {exp.category}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{exp.date}</span>
                    </div>
                    <p className="text-xs text-amber-200/95 mt-1 leading-relaxed">
                      {exp.anomaly_reason || `Transaction of ${formatCurrency(exp.amount)} is unusually high for ${exp.category}.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 self-end sm:self-center shrink-0">
                  <span className="text-xl font-black text-amber-400 drop-shadow-sm">
                    {formatCurrency(exp.amount)}
                  </span>
                  <button
                    onClick={() => handleConfirm(exp.id)}
                    className="text-xs px-4 py-2.5 rounded-xl glass-btn-emerald text-white font-bold transition-all shadow-md hover:scale-105"
                    title="Mark as confirmed legitimate expense"
                  >
                    Confirm & Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
