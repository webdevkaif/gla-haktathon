import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Coins, 
  Trash2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { createGoal, addFundsToGoal, deleteGoal } from '../api';
import { formatCurrency, formatPercent } from '../utils/formatters';

export default function SavingsGoalPlanner({ goals, onGoalsMutated }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState(15000);
  const [targetMonths, setTargetMonths] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fundAmount, setFundAmount] = useState({});

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!title || !targetAmount) return;
    setIsSubmitting(true);
    try {
      await createGoal({
        title,
        target_amount: parseFloat(targetAmount),
        target_months: parseInt(targetMonths)
      });
      setTitle('');
      setShowAddForm(false);
      if (onGoalsMutated) onGoalsMutated();
      
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddFunds = async (goalId, goal) => {
    const amt = parseFloat(fundAmount[goalId] || 1000);
    if (!amt || amt <= 0) return;
    try {
      await addFundsToGoal(goalId, amt);
      setFundAmount((prev) => ({ ...prev, [goalId]: '' }));
      if (onGoalsMutated) onGoalsMutated();

      // Confetti burst
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm("Are you sure you want to remove this savings goal?")) return;
    try {
      await deleteGoal(goalId);
      if (onGoalsMutated) onGoalsMutated();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Banner - Frosted Emerald Glass */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 glass-panel border border-emerald-500/30 shadow-[0_20px_50px_rgba(16,185,129,0.15)]">
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-teal-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-md">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Personalized Savings Planner
                </h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                  AI Tailored Trims
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Set milestone goals. ExpensePilot AI calculates the monthly run-rate and recommends specific trims to discretionary spending.
              </p>
            </div>
          </div>

          <button
            id="btn-create-saving-goal"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold glass-btn-emerald text-white shadow-lg transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Savings Goal</span>
          </button>
        </div>
      </div>

      {/* Goal Creation Form - Deep Frosted Glass */}
      {showAddForm && (
        <form
          onSubmit={handleCreateGoal}
          className="glass-panel-deep p-6 sm:p-7 rounded-3xl border border-emerald-500/40 space-y-5 animate-fade-in shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Create Personalized Savings Plan
            </h3>
            <span className="text-xs text-slate-400">Deterministic calculation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Goal Name</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Emergency Fund, New Laptop"
                className="w-full glass-input rounded-2xl px-4 py-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Target Amount (₹)</label>
              <input
                type="number"
                required
                min="500"
                step="500"
                value={targetAmount}
                onChange={(e) => setTargetAmount(Number(e.target.value))}
                className="w-full glass-input rounded-2xl px-4 py-3 text-sm text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Timeframe (Months)</label>
              <select
                value={targetMonths}
                onChange={(e) => setTargetMonths(Number(e.target.value))}
                className="w-full glass-input rounded-2xl px-4 py-3 text-sm text-white bg-slate-900/90 font-medium"
              >
                <option value={1}>1 Month (Sprint)</option>
                <option value={2}>2 Months</option>
                <option value={3}>3 Months (Quarterly)</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months (Annual)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-bold glass-btn text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold rounded-2xl glass-btn-emerald text-white shadow-lg"
            >
              {isSubmitting ? 'Analyzing & Building Plan...' : 'Generate Plan & Save'}
            </button>
          </div>
        </form>
      )}

      {/* Goal Cards Grid - Frosted Glass Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(goals || []).map((goal) => {
          const pct = Math.min(100, Math.round((goal.current_saved / goal.target_amount) * 100));
          const isDone = goal.current_saved >= goal.target_amount;

          return (
            <div key={goal.id} className="glass-panel glass-panel-hover p-6 sm:p-7 rounded-3xl space-y-5 relative overflow-hidden border border-white/10 shadow-xl group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] uppercase font-extrabold tracking-wider text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30">
                    {goal.target_months} Month Target
                  </span>
                  <h3 className="text-xl font-bold text-white mt-2 tracking-tight">{goal.title}</h3>
                </div>
                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="p-2 text-slate-400 hover:text-rose-400 glass-btn rounded-xl transition-colors"
                  title="Remove goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-bold">
                  <span className="text-white">
                    {formatCurrency(goal.current_saved)}
                  </span>
                  <span className="text-slate-400">
                    of {formatCurrency(goal.target_amount)} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-black/40 border border-white/5 overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-700 shadow-sm ${
                      isDone 
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.7)]' 
                        : 'bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    }`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>

              {/* Run Rate Metric */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] shadow-inner">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Monthly Run Rate</span>
                  <span className="text-base font-bold text-white block mt-0.5">
                    {formatCurrency(goal.monthly_target)}/mo
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] shadow-inner">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Daily Run Rate</span>
                  <span className="text-base font-bold text-cyan-300 block mt-0.5">
                    ~{formatCurrency(goal.monthly_target / 30)}/day
                  </span>
                </div>
              </div>

              {/* AI Category Trims Recommendations */}
              {goal.category_suggestions && goal.category_suggestions.length > 0 && (
                <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] text-xs space-y-2 shadow-inner">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <Sparkles className="w-3.5 h-3.5" /> AI Recommended Trim Sources:
                  </span>
                  {goal.category_suggestions.map((s, idx) => (
                    <div key={idx} className="text-slate-300 flex items-start gap-2">
                      <span className="text-cyan-400 font-bold shrink-0">•</span>
                      <span className="leading-relaxed">
                        <strong className="text-white">{s.category}:</strong> {s.tip}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Deposit Quick Action */}
              {!isDone && (
                <div className="pt-2 border-t border-white/[0.08] flex items-center gap-2.5">
                  <input
                    type="number"
                    placeholder="Add amount (₹)"
                    value={fundAmount[goal.id] || ''}
                    onChange={(e) => setFundAmount({ ...fundAmount, [goal.id]: e.target.value })}
                    className="flex-1 glass-input rounded-2xl px-4 py-2.5 text-xs text-white font-bold"
                  />
                  <button
                    onClick={() => handleAddFunds(goal.id, goal)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold glass-btn-emerald text-white shadow-md transition-all shrink-0"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Deposit</span>
                  </button>
                </div>
              )}

              {isDone && (
                <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-center text-xs font-extrabold text-emerald-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-4 h-4" /> Goal Target Achieved! 🚀
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
