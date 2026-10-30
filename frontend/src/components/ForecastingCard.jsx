import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Info, 
  Calendar, 
  DollarSign, 
  Activity,
  RefreshCw,
  Send,
  Smartphone,
  Cpu,
  Sparkles
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
import { confirmUnusualExpense, fetchAnomalyDetections, dispatchAnomaliesToTelegram } from '../api';

export default function ForecastingCard({ forecast, expenses, onExpenseUpdated }) {
  const [anomalyData, setAnomalyData] = useState(null);
  const [isLoadingAnomalies, setIsLoadingAnomalies] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState(null);

  const loadPyodAnomalies = async () => {
    setIsLoadingAnomalies(true);
    try {
      const res = await fetchAnomalyDetections('2026-10');
      setAnomalyData(res);
    } catch (err) {
      console.error('[PyOD Isolation Forest Scan Error]', err);
    } finally {
      setIsLoadingAnomalies(false);
    }
  };

  useEffect(() => {
    loadPyodAnomalies();
  }, [expenses]);

  const handleDispatchTelegram = async () => {
    setIsDispatching(true);
    setDispatchStatus(null);
    try {
      const res = await dispatchAnomaliesToTelegram();
      if (res.connected) {
        setDispatchStatus({ success: true, message: `✅ Dispatched PyOD scan (${res.anomalies_detected} flagged) directly to your Telegram bot!` });
      } else {
        setDispatchStatus({ success: false, message: res.message || 'Telegram bot not yet linked to phone.' });
      }
    } catch (err) {
      setDispatchStatus({ success: false, message: err.message || 'Failed to dispatch to Telegram' });
    } finally {
      setIsDispatching(false);
      setTimeout(() => setDispatchStatus(null), 6000);
    }
  };

  if (!forecast) {
    return (
      <div className="p-16 text-center text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-sm font-semibold">Loading predictive forecast model...</p>
      </div>
    );
  }

  // Filter unusual expenses from local list
  const unusualExpenses = (expenses || []).filter((e) => e.is_unusual);
  const pyodAnomalies = anomalyData?.anomalies || [];
  const totalAnomaliesCount = Math.max(unusualExpenses.length, pyodAnomalies.length);

  const handleConfirm = async (id) => {
    try {
      await confirmUnusualExpense(id);
      if (onExpenseUpdated) onExpenseUpdated();
      await loadPyodAnomalies();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Forecast Header Banner - Frosted Violet-Indigo Glass */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 glass-panel border border-violet-500/30 shadow-[0_20px_50px_rgba(139,92,246,0.15)]">
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-violet-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-violet-500/20 border border-violet-400/40 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.3)] backdrop-blur-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Statistical Spending Forecast
                </h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-400/30 shadow-[0_0_10px_rgba(139,92,246,0.25)]">
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
            <span className="text-[11px] text-violet-300 block mt-1 font-medium">
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
              <Activity className="w-4 h-4 text-violet-400" />
              Day-by-Day Cumulative Spending Trajectory
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Compares actual historical spend to date with projected end-of-month curve</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1.5 bg-violet-400 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.6)]"></span> Actual Spend
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1 border-t-2 border-dashed border-indigo-400"></span> Extrapolated Curve
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
                  backgroundColor: 'rgba(8, 9, 15, 0.95)', 
                  backdropFilter: 'blur(16px)',
                  borderColor: 'rgba(255, 255, 255, 0.15)', 
                  borderRadius: '16px', 
                  color: '#fff',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
              />
              <Area type="monotone" dataKey="actual" fill="#8b5cf6" fillOpacity={0.25} stroke="#8b5cf6" strokeWidth={2.5} />
              <Line type="monotone" dataKey="projected" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="budget_linear" stroke="#64748b" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Standout Feature: Anomaly Detection Hub (PyOD Isolation Forest) */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-5 border border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base tracking-tight">Unusual Transactions & Anomaly Detection</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-400/30">
                  PyOD • Isolation Forest
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-dimensional unsupervised ML detection analyzing {anomalyData?.total_analyzed || (expenses?.length || 0)} transactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadPyodAnomalies}
              disabled={isLoadingAnomalies}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-btn text-xs font-semibold text-slate-300 hover:text-white border border-white/10 hover:border-white/20 transition-all"
              title="Re-run Isolation Forest statistical model scan"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAnomalies ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isLoadingAnomalies ? 'Scanning...' : 'Re-scan ML'}</span>
            </button>

            <button
              onClick={handleDispatchTelegram}
              disabled={isDispatching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-btn text-xs font-semibold text-violet-300 hover:text-white border border-violet-500/30 hover:border-violet-400/50 shadow-sm transition-all"
              title="Push anomalous transactions alert to Telegram bot"
            >
              <Smartphone className="w-3.5 h-3.5 text-violet-400" />
              <span>{isDispatching ? 'Pushing...' : 'Push to Phone'}</span>
            </button>

            <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
              totalAnomaliesCount > 0 
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]' 
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
            }`}>
              {totalAnomaliesCount} {totalAnomaliesCount === 1 ? 'Anomaly' : 'Anomalies'} Flagged
            </span>
          </div>
        </div>

        {/* Telegram Push Feedback Banner */}
        {dispatchStatus && (
          <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border animate-fade-in ${
            dispatchStatus.success 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <span>{dispatchStatus.message}</span>
            <button onClick={() => setDispatchStatus(null)} className="text-slate-400 hover:text-white ml-2">✕</button>
          </div>
        )}

        {/* Display Anomalies Content */}
        {isLoadingAnomalies ? (
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-400 border-t-transparent mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">Training PyOD Isolation Forest on MongoDB transactions...</p>
          </div>
        ) : totalAnomaliesCount === 0 ? (
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-2 backdrop-blur-xl">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-100">No Statistical Anomalies Detected</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All transactions adhere to your established category spending distributions and normal velocity limits.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* 1. Flagged Expenses from Local State / Seed Data */}
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
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Review Recommended
                      </span>
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

            {/* 2. Additional PyOD Unsupervised Anomalies (if not already listed in unusualExpenses) */}
            {pyodAnomalies
              .filter(pa => !unusualExpenses.some(ue => ue.id === pa.id || ue.description === pa.description))
              .map((anom, idx) => (
                <div 
                  key={anom.id || idx} 
                  className="p-4 sm:p-5 rounded-2xl bg-violet-500/[0.08] border border-violet-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg backdrop-blur-xl"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-400/40 shrink-0 mt-0.5">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-white text-sm">{anom.description}</span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-white/[0.08] text-slate-200 border border-white/10">
                          {anom.category}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{anom.date}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40">
                          {anom.anomaly_type || 'Statistical Outlier'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {anom.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 self-end sm:self-center shrink-0">
                    <span className="text-xl font-black text-rose-300 drop-shadow-sm">
                      {formatCurrency(anom.amount)}
                    </span>
                    <button
                      onClick={() => handleConfirm(anom.id)}
                      className="text-xs px-4 py-2.5 rounded-xl glass-btn text-slate-300 hover:text-white font-bold transition-all border border-white/15"
                      title="Verify and confirm transaction"
                    >
                      Acknowledge
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
