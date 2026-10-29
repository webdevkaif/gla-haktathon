import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Sparkles, 
  Calculator, 
  ShoppingBag, 
  Calendar, 
  TrendingDown, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  PiggyBank
} from 'lucide-react';
import { simulateWhatIf } from '../api';
import { formatCurrency, formatPercent } from '../utils/formatters';

export default function WhatIfSimulator({ summary }) {
  const [selectedCategory, setSelectedCategory] = useState('Shopping');
  const [percentReduction, setPercentReduction] = useState(20);
  const [categoryResult, setCategoryResult] = useState(null);
  const [isSimulatingCat, setIsSimulatingCat] = useState(false);

  // Purchase Affordability State
  const [purchaseAmount, setPurchaseAmount] = useState(1500);
  const [purchaseCategory, setPurchaseCategory] = useState('Shopping');
  const [purchaseResult, setPurchaseResult] = useState(null);
  const [isSimulatingPurchase, setIsSimulatingPurchase] = useState(false);

  // Set default category to top category once summary is available
  useEffect(() => {
    if (summary?.categories && summary.categories.length > 0) {
      setSelectedCategory(summary.top_category || summary.categories[0].category);
    }
  }, [summary]);

  // Run Category Simulation
  const handleRunCategorySimulation = async () => {
    setIsSimulatingCat(true);
    try {
      const res = await simulateWhatIf({
        category: selectedCategory,
        percent_reduction: parseFloat(percentReduction),
      }, summary?.month);
      setCategoryResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulatingCat(false);
    }
  };

  // Run Purchase Affordability
  const handleRunPurchaseSimulation = async () => {
    if (!purchaseAmount || purchaseAmount <= 0) return;
    setIsSimulatingPurchase(true);
    try {
      const res = await simulateWhatIf({
        category: purchaseCategory,
        upcoming_purchase_amount: parseFloat(purchaseAmount),
        upcoming_purchase_category: purchaseCategory,
      }, summary?.month);
      setPurchaseResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulatingPurchase(false);
    }
  };

  useEffect(() => {
    handleRunCategorySimulation();
    handleRunPurchaseSimulation();
  }, [selectedCategory, percentReduction]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Intro Header - Frosted Purple-Cyan Glass */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 glass-panel border border-purple-500/30 shadow-[0_20px_50px_rgba(168,85,247,0.15)]">
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)] backdrop-blur-md">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Financial What-If Scenario Simulator
              </h2>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-[0_0_10px_rgba(168,85,247,0.25)]">
                AI Copilot Sandbox
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Explore hypothetical decisions before spending real money. ExpensePilot analyzes your actual historical baseline and projects runway impacts.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Scenario 1: Category Reduction Simulator */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base tracking-tight">Category Cut & Savings</h3>
                <p className="text-xs text-slate-400">What if I reduce spending in a category?</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Target Category
              </label>
              <select
                id="select-whatif-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full glass-input rounded-2xl px-4 py-3 text-sm text-white bg-slate-900/90 font-medium"
              >
                {(summary?.categories || []).map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category} (Current: {formatCurrency(c.amount)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Reduction Percentage</span>
                <span className="text-cyan-300 font-extrabold text-sm px-2.5 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-400/30">
                  {percentReduction}% cut
                </span>
              </div>
              <input
                type="range"
                id="range-whatif-reduction"
                min="5"
                max="75"
                step="5"
                value={percentReduction}
                onChange={(e) => setPercentReduction(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 shadow-inner"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-medium pt-1">
                <span>5% (Gentle)</span>
                <span>20% (Recommended)</span>
                <span>50% (Strict)</span>
                <span>75% (Extreme)</span>
              </div>
            </div>
          </div>

          {/* Simulation Output Card */}
          {categoryResult && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4 shadow-lg backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] shadow-inner">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Monthly Savings</span>
                  <span className="text-2xl font-black text-emerald-400 drop-shadow-sm mt-0.5 block">
                    +{formatCurrency(categoryResult.projected_monthly_savings)}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] shadow-inner">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Annualized Growth</span>
                  <span className="text-2xl font-black text-cyan-300 drop-shadow-sm mt-0.5 block">
                    +{formatCurrency(categoryResult.annualized_savings)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 space-y-2 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Original {selectedCategory} Spend:</span>
                  <span className="font-semibold text-white">{formatCurrency(categoryResult.historical_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Adjusted {selectedCategory} Spend:</span>
                  <span className="font-bold text-cyan-300">{formatCurrency(categoryResult.new_category_spending)}</span>
                </div>
                <div className="flex justify-between border-t border-white/[0.08] pt-2">
                  <span className="text-slate-400">Revised Monthly Total:</span>
                  <span className="font-bold text-emerald-400 text-sm">{formatCurrency(categoryResult.new_total_spent)}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2.5 shadow-sm">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{categoryResult.advice}</span>
              </div>
            </div>
          )}
        </div>

        {/* Scenario 2: Purchase Affordability Simulator */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base tracking-tight">Affordability Checker</h3>
                <p className="text-xs text-slate-400">Can I afford an upcoming purchase?</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Planned Purchase Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-slate-400 text-sm font-bold">₹</span>
                <input
                  type="number"
                  id="input-affordability-amount"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                  onBlur={handleRunPurchaseSimulation}
                  min="50"
                  step="100"
                  className="w-full glass-input rounded-2xl pl-9 pr-4 py-3 text-sm text-white font-bold"
                  placeholder="e.g. 1500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[500, 1000, 2500, 5000].map((quickAmt) => (
                <button
                  key={quickAmt}
                  onClick={() => {
                    setPurchaseAmount(quickAmt);
                    setTimeout(handleRunPurchaseSimulation, 50);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-semibold ${
                    purchaseAmount === quickAmt 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                      : 'glass-btn text-slate-300 hover:text-white'
                  }`}
                >
                  ₹{quickAmt}
                </button>
              ))}
            </div>
          </div>

          {/* Affordability Output */}
          {purchaseResult && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.04] border border-white/10 space-y-4 shadow-lg backdrop-blur-xl">
              <div className="flex items-center gap-2.5">
                {purchaseResult.can_afford ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Purchase Affordable</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm px-3 py-1 rounded-xl bg-rose-500/20 border border-rose-400/30">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Exceeds Current Monthly Budget</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] shadow-inner">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Remaining (Before)</span>
                  <span className="text-lg font-bold text-slate-200 block mt-0.5">
                    {formatCurrency(purchaseResult.remaining_budget_before)}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] shadow-inner">
                  <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Remaining (After)</span>
                  <span className={`text-lg font-bold block mt-0.5 ${purchaseResult.remaining_budget_after >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                    {formatCurrency(purchaseResult.remaining_budget_after)}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] text-xs shadow-inner">
                <span className="text-slate-400 block uppercase tracking-wider text-[10px] font-semibold">Revised Daily Allowance:</span>
                <span className="text-base font-extrabold text-emerald-400 block mt-0.5">
                  {formatCurrency(purchaseResult.new_daily_budget)}/day
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Over remaining {purchaseResult.days_left} days to maintain a balanced budget.
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200 flex items-start gap-2.5 shadow-sm">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{purchaseResult.advice}</span>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
