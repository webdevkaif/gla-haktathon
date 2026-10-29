import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  Bell, 
  Search, 
  User, 
  ChevronDown,
  Sparkles,
  ShieldAlert,
  RotateCcw
} from 'lucide-react';

const TITLE_MAP = {
  dashboard: { title: 'Financial Overview', desc: 'Real-time corporate ledger, department budgets, and spend analytics.' },
  transactions: { title: 'Transactions Ledger', desc: 'All corporate expense reimbursements and vendor invoices.' },
  analytics: { title: 'Spend Intelligence & Analytics', desc: 'Predictive burn rate, category breakdowns, and compliance monitoring.' },
  ai_assistant: { title: 'AI Finance Assistant', desc: 'Ask natural-language questions regarding policies, records, and approvals.' },
  approvals_audit: { title: 'Approvals & Audit Trail', desc: 'Multi-level approval state machine and SHA-256 cryptographic audit logs.' },
  settings: { title: 'Corporate Policies & Settings', desc: 'View grade caps, Net-30 payment guidelines, and system configuration.' }
};

export default function FintechHeader({ 
  activeTab, 
  currentUser, 
  onOpenAddExpense, 
  onOpenDemoAccounts,
  onResetData,
  dateRange,
  setDateRange
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const currentInfo = TITLE_MAP[activeTab] || TITLE_MAP.dashboard;

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
      
      {/* Left: Page Title & Context */}
      <div>
        <h1 className="text-base font-bold text-slate-900 tracking-tight">
          {currentInfo.title}
        </h1>
        <p className="text-xs text-slate-500 hidden sm:block">
          {currentInfo.desc}
        </p>
      </div>

      {/* Right: Actions, Date Filter & Add Expense Button */}
      <div className="flex items-center gap-3">
        
        {/* Date Filter Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="this_month">This Month (Oct 2026)</option>
            <option value="last_30">Last 30 Days</option>
            <option value="q4">Q4 2026</option>
            <option value="ytd">Year to Date (2026)</option>
          </select>
        </div>

        {/* Notifications Icon Pill */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
            title="System Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 ring-2 ring-white" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  2 New
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="font-semibold text-slate-800">Duplicate Invoice Flagged</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">Acme Supplies #INV-2004 was held for review.</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="font-semibold text-slate-800">Reimbursement Approved</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">CLM-1042 Meals claim approved by Manager Sarah.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Re-seed Sample Data Quick Button */}
        {onResetData && (
          <button
            onClick={onResetData}
            title="Reset & Re-seed Sample Data for Judges"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Demo</span>
          </button>
        )}

        {/* Prominent "Add Expense" Action Button */}
        <button
          onClick={onOpenAddExpense}
          className="fintech-btn-primary flex items-center gap-2 px-3.5 py-2 text-xs font-semibold shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Expense</span>
        </button>

      </div>

    </header>
  );
}
