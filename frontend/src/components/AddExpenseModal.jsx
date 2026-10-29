import React, { useState } from 'react';
import { X, Plus, AlertCircle, FileText, CheckCircle2, DollarSign } from 'lucide-react';
import { createClaim } from '../api';

const CATEGORY_LIMITS = {
  Meals: 800,
  Travel: 3500,
  Hotel: 3500,
  Supplies: 15000,
  General: 5000
};

export default function AddExpenseModal({ isOpen, onClose, onSuccess, currentUser }) {
  const [category, setCategory] = useState('Meals');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [receiptAttached, setReceiptAttached] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const currentLimit = CATEGORY_LIMITS[category] || 5000;
  const numAmount = parseFloat(amount) || 0;
  const isOverLimit = numAmount > currentLimit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!amount || numAmount <= 0) {
      setError("Please enter a valid expense amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category,
        amount: numAmount,
        date,
        receipt_attached: receiptAttached,
        description: description.trim() || `${category} corporate expense`
      };

      const res = await createClaim(payload);
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit expense claim");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative animate-in fade-in-50 zoom-in-95">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 absolute top-5 right-5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200/50">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Add New Expense</h2>
            <p className="text-xs text-slate-500">
              Submit a reimbursement claim governed by Meridian Policy guidelines.
            </p>
          </div>
        </div>

        {/* Validation Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Category Select */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Expense Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full fintech-input p-2.5 text-xs text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="Meals">Meals & Dining (Grade Limit: ₹800/day)</option>
              <option value="Travel">Local & Flight Travel (Grade Limit: ₹3,500)</option>
              <option value="Hotel">Hotel & Stay (Grade Limit: ₹3,500/night)</option>
              <option value="Supplies">Office Supplies / Hardware (Limit: ₹15,000)</option>
              <option value="General">General Business Expense</option>
            </select>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                Amount (INR ₹) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Grade {currentUser?.grade || 'L2'} Policy Cap: <strong>₹{currentLimit.toLocaleString('en-IN')}</strong>
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full fintech-input pl-8 pr-4 py-2 text-sm font-semibold font-mono"
              />
            </div>
            {isOverLimit && (
              <p className="mt-1 text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>Notice: Exceeds standard limit. This claim will require manager escalation approval.</span>
              </p>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Transaction Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full fintech-input p-2.5 text-xs text-slate-900"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Description / Business Justification
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Client dinner with Meridian sales prospective partners"
              className="w-full fintech-input p-2.5 text-xs text-slate-900 resize-none"
            />
          </div>

          {/* Receipt Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="receipt"
              checked={receiptAttached}
              onChange={(e) => setReceiptAttached(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="receipt" className="text-xs text-slate-700 cursor-pointer select-none">
              Receipt document is attached and verified
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="fintech-btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Expense</span>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

