import React, { useState } from 'react';
import { Wallet, Check, X } from 'lucide-react';
import { updateBudget } from '../api';
import { formatCurrency } from '../utils/formatters';

export default function BudgetManager({ budget, isOpen, onClose, onBudgetUpdated }) {
  const [totalBudget, setTotalBudget] = useState(budget?.total_budget || 18000);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateBudget({
        month: budget?.month || "2026-10",
        total_budget: parseFloat(totalBudget),
        category_limits: budget?.category_limits || {}
      });
      if (onBudgetUpdated) onBudgetUpdated();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-md glass-panel-deep rounded-3xl border border-white/10 bg-[#070d1d]/90 p-6 sm:p-7 space-y-5 shadow-[0_20px_70px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-white text-base tracking-tight">Adjust Monthly Budget</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white glass-btn transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Monthly Budget Ceiling (₹) for {budget?.month || "Current Month"}
            </label>
            <input
              type="number"
              min="1000"
              step="500"
              value={totalBudget}
              onChange={(e) => setTotalBudget(Number(e.target.value))}
              className="w-full glass-input rounded-2xl px-4 py-3 text-white font-black text-xl"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold glass-btn text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 text-xs font-bold rounded-2xl glass-btn-primary text-white shadow-lg"
            >
              {isSaving ? 'Updating...' : 'Save Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
