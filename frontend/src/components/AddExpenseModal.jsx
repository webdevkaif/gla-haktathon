import React, { useState } from 'react';
import { X, Sparkles, PlusCircle, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { createExpense, sendAgentMessage } from '../api';
import { formatCurrency } from '../utils/formatters';
import { generateExpenseIntegritySeal } from '../utils/crypto';

const CATEGORIES = [
  "Food",
  "Transportation",
  "Groceries",
  "Shopping",
  "Entertainment",
  "Utilities",
  "Healthcare",
  "Education",
  "Miscellaneous"
];

export default function AddExpenseModal({ isOpen, onClose, onExpenseAdded }) {
  const [mode, setMode] = useState('natural'); // 'natural' or 'manual'
  const [naturalText, setNaturalText] = useState('');
  
  // Manual fields
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isOpen) return null;

  const handleNaturalSubmit = async (e) => {
    e.preventDefault();
    if (!naturalText.trim()) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await sendAgentMessage(naturalText);
      if (res.structured_expenses_added && res.structured_expenses_added.length > 0) {
        setFeedback({
          type: 'success',
          message: res.reply,
          items: res.structured_expenses_added
        });
        setNaturalText('');
        if (onExpenseAdded) onExpenseAdded();
      } else {
        setFeedback({
          type: 'info',
          message: res.reply
        });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to record expense. Please check connection.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !description) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      // 🛡️ Web Crypto SHA-256 Non-Password Data Integrity Seal
      const expensePayload = {
        amount: parseFloat(amount),
        category,
        description,
        date,
        payment_method: paymentMethod
      };
      const seal = await generateExpenseIntegritySeal(expensePayload);

      const res = await createExpense({
        ...expensePayload,
        payload_hash: seal.payload_hash
      });

      setFeedback({
        type: 'success',
        message: `Expense recorded under ${res.category}! Web Crypto SHA-256 seal: ${seal.payload_hash.slice(0, 10)}...`,
        items: [res]
      });
      setAmount('');
      setDescription('');
      if (onExpenseAdded) onExpenseAdded();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Failed to save expense.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-lg glass-panel-deep rounded-3xl border border-white/10 bg-[#070d1d]/90 p-6 sm:p-7 space-y-6 shadow-[0_20px_70px_rgba(0,0,0,0.8)] relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg tracking-tight">Add New Expense</h3>
              <p className="text-xs text-slate-400">Record individual or multiple transactions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-btn transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex rounded-2xl bg-white/[0.04] p-1.5 border border-white/[0.08] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => { setMode('natural'); setFeedback(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              mode === 'natural' 
                ? 'bg-gradient-to-r from-cyan-500/90 to-blue-600/90 text-white shadow-[0_4px_16px_rgba(6,182,212,0.35)] border border-cyan-400/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Natural Language</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('manual'); setFeedback(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'manual' 
                ? 'bg-gradient-to-r from-emerald-500/90 to-teal-600/90 text-white shadow-[0_4px_16px_rgba(16,185,129,0.35)] border border-emerald-400/30' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Structured Form
          </button>
        </div>

        {/* Natural Language AI Mode */}
        {mode === 'natural' ? (
          <form onSubmit={handleNaturalSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Tell Pilot AI what you spent in plain text:
              </label>
              <textarea
                rows={3}
                id="input-natural-expense"
                value={naturalText}
                onChange={(e) => setNaturalText(e.target.value)}
                placeholder="e.g. 'I spent ₹350 on dinner yesterday' or 'Today I spent ₹250 on food, ₹100 on petrol, and ₹500 on shopping'"
                className="w-full glass-input rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2.5">
              {[
                "₹350 dinner yesterday",
                "₹250 food and ₹100 petrol",
                "₹1200 groceries on weekend"
              ].map((sample, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNaturalText(sample)}
                  className="text-xs px-3.5 py-2 rounded-xl glass-btn text-slate-300 hover:text-cyan-300 transition-all font-medium hover:scale-[1.02]"
                >
                  "{sample}"
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || !naturalText.trim()}
              className="w-full py-3 rounded-2xl text-xs font-bold glass-btn-primary text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoading ? 'Extracting & Validating...' : 'Extract & Save Expenses'}</span>
            </button>
          </form>
        ) : (
          /* Structured Manual Form */
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="350"
                  className="w-full glass-input rounded-2xl px-4 py-2.5 text-sm text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-2.5 text-sm text-white bg-slate-900/90 font-medium"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Description</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Dinner with team at bistro"
                className="w-full glass-input rounded-2xl px-4 py-2.5 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full glass-input rounded-2xl px-4 py-2.5 text-sm text-white bg-slate-900/90 font-medium"
                >
                  <option value="UPI">UPI (GPay / PhonePe)</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="NetBanking">Net Banking</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !amount || !description}
              className="w-full py-3 rounded-2xl text-xs font-bold glass-btn-emerald text-white disabled:opacity-50 transition-all shadow-lg"
            >
              {isLoading ? 'Saving...' : 'Record Transaction'}
            </button>
          </form>
        )}

        {/* Feedback message box */}
        {feedback && (
          <div className={`p-4 rounded-2xl text-xs space-y-2 ${
            feedback.type === 'success' 
              ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 shadow-md' 
              : feedback.type === 'error'
              ? 'bg-rose-950/40 border border-rose-500/40 text-rose-300 shadow-md'
              : 'bg-white/[0.05] border border-white/10 text-slate-300'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
              <span>{feedback.type === 'success' ? 'Recorded Successfully' : 'Notice'}</span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{feedback.message}</p>
          </div>
        )}

      </div>
    </div>
  );
}
