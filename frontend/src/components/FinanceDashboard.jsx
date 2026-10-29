import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  FileCheck, 
  Copy, 
  AlertCircle, 
  DollarSign, 
  Bell, 
  CheckCircle2, 
  RefreshCw,
  TrendingUp,
  Building,
  ArrowRight
} from 'lucide-react';
import { fetchDashboardSummary, sendApprovalReminder } from '../api';

export default function FinanceDashboard({ onNavigateTab }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [remindingId, setRemindingId] = useState(null);
  const [reminderToast, setReminderToast] = useState(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetchDashboardSummary();
      setData(res);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSendReminder = async (approvalId) => {
    setRemindingId(approvalId);
    try {
      const res = await sendApprovalReminder(approvalId, true);
      setReminderToast({ type: 'success', message: res.message || `Reminder sent for ${approvalId}!` });
      // Reload dashboard data to reflect incremented reminder count
      await loadDashboard();
    } catch (err) {
      setReminderToast({ type: 'error', message: err.message || 'Could not send reminder' });
    } finally {
      setRemindingId(null);
      setTimeout(() => setReminderToast(null), 4000);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-400 mr-2" />
        <span>Loading Executive Finance Intelligence...</span>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const invoicesByStatus = data?.invoices_by_status || {};
  const overdueItems = data?.overdue_items || [];
  const flaggedDuplicates = data?.flagged_duplicates || [];
  const approvalDelays = data?.approval_delays || [];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      
      {/* Toast Alert */}
      {reminderToast && (
        <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-all ${
          reminderToast.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
            : 'bg-rose-950/90 text-rose-300 border border-rose-500/50'
        }`}>
          {reminderToast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{reminderToast.message}</span>
        </div>
      )}

      {/* Header & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Corporate Finance & Procurement Command Center</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
              Live Aggregation
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time KPIs computed from Meridian sample corporate ledger (DEV-C04).
          </p>
        </div>
        <button
          onClick={loadDashboard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
          <span>Refresh Live</span>
        </button>
      </div>

      {/* 6 Core KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* KPI 1: Pending Invoices */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pending Invoices</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-lg font-bold text-white">
            ₹{kpis.pending_invoices_amount?.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-[11px] text-sky-400 font-medium mt-0.5">
            {kpis.pending_invoices_count || 0} invoices awaiting review
          </div>
        </div>

        {/* KPI 2: Overdue Payments */}
        <div className="bg-slate-800/90 border border-rose-500/40 rounded-xl p-3.5 shadow-sm bg-gradient-to-b from-rose-950/20 to-transparent">
          <div className="flex items-center justify-between text-rose-300 text-xs mb-1">
            <span>Overdue Payments</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg font-bold text-rose-200">
            ₹{kpis.overdue_payments_amount?.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-[11px] text-rose-400 font-semibold mt-0.5">
            {kpis.overdue_payments_count || 0} bills past due date
          </div>
        </div>

        {/* KPI 3: Reimbursement Requests */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Reimbursements</span>
            <FileCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-lg font-bold text-white">
            ₹{kpis.reimbursement_requests_amount?.toLocaleString('en-IN') || '0'}
          </div>
          <div className="text-[11px] text-teal-400 font-medium mt-0.5">
            {kpis.reimbursement_requests_count || 0} claims in pipeline
          </div>
        </div>

        {/* KPI 4: Flagged Duplicate Invoices */}
        <div className="bg-slate-800/90 border border-amber-500/40 rounded-xl p-3.5 shadow-sm bg-gradient-to-b from-amber-950/20 to-transparent">
          <div className="flex items-center justify-between text-amber-300 text-xs mb-1">
            <span>Duplicate Invoices</span>
            <Copy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-200">
            {kpis.flagged_duplicates_count || 0}
          </div>
          <div className="text-[11px] text-amber-400 font-medium mt-0.5">
            Pairs blocked from payout
          </div>
        </div>

        {/* KPI 5: Approval Delays > 2d */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>SLA Delays (&gt;2d)</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-200">
            {kpis.approval_delays_count || 0}
          </div>
          <div className="text-[11px] text-purple-400 font-medium mt-0.5">
            Pending manager review
          </div>
        </div>

        {/* KPI 6: Open Escalations */}
        <div className="bg-slate-800/90 border border-rose-500/50 rounded-xl p-3.5 shadow-sm bg-gradient-to-b from-rose-950/30 to-transparent">
          <div className="flex items-center justify-between text-rose-300 text-xs mb-1">
            <span>Open Escalations</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-200">
            {kpis.open_escalations_count || 0}
          </div>
          <div className="text-[11px] text-rose-400 font-semibold mt-0.5">
            Active compliance tickets
          </div>
        </div>

      </div>

      {/* Second Row: Invoices Status Breakdown & Overdue Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Status Distribution */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white mb-1">Invoices by Lifecycle State</h2>
            <p className="text-xs text-slate-400 mb-4">Total active vendor submissions in repository</p>
            <div className="space-y-2.5">
              {Object.entries(invoicesByStatus).map(([st, cnt]) => {
                const colors = {
                  Received: 'bg-blue-500 text-blue-300 border-blue-500/40',
                  'Pending Approval': 'bg-amber-500 text-amber-300 border-amber-500/40',
                  Approved: 'bg-emerald-500 text-emerald-300 border-emerald-500/40',
                  Paid: 'bg-purple-500 text-purple-300 border-purple-500/40',
                  Disputed: 'bg-rose-500 text-rose-300 border-rose-500/40'
                };
                return (
                  <div key={st} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300 font-medium">
                      <span className={`w-2 h-2 rounded-full ${colors[st]?.split(' ')[0] || 'bg-slate-500'}`} />
                      {st}
                    </span>
                    <span className="font-mono font-bold text-slate-200 px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60">
                      {cnt}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-700/60 mt-4 text-[11px] text-slate-400">
            Policy Net-30 applies from date of invoice receipt.
          </div>
        </div>

        {/* Overdue Items Table */}
        <div className="lg:col-span-2 bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Overdue Invoices Requiring Release</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {overdueItems.length} Overdue
                </span>
              </h2>
              <p className="text-xs text-slate-400">Invoices exceeding agreed payment deadline without Paid status</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] border-b border-slate-700/80">
                <tr>
                  <th className="py-2 px-3">Invoice No</th>
                  <th className="py-2 px-3">Vendor</th>
                  <th className="py-2 px-3">Amount</th>
                  <th className="py-2 px-3">Due Date</th>
                  <th className="py-2 px-3">Overdue</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {overdueItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="py-2 px-3 font-mono font-bold text-teal-300">{item.invoice_no}</td>
                    <td className="py-2 px-3 text-slate-300">{item.vendor_name || item.vendor_id}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-white">₹{item.amount?.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-slate-400">{item.due_date}</td>
                    <td className="py-2 px-3 font-semibold text-rose-400">{item.days_overdue} days</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Third Row: Flagged Duplicate Invoices (Side-by-side comparison) */}
      <div className="bg-slate-800/90 border border-amber-500/40 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Copy className="w-4 h-4 text-amber-400" />
              <span>Flagged Duplicate Invoices — Side-by-Side Audit</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Frozen from Payout
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Invoices flagged by DUPLICATE_INVOICE rule matching existing submissions (vendor, amount, & date).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flaggedDuplicates.map((dup, idx) => (
            <div key={idx} className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300">Duplicate Pair #{idx + 1}</span>
                <span className="text-[10px] text-slate-400">{dup.reason}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Original Submission */}
                <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">Original Document</div>
                  <div className="font-mono font-bold text-teal-300 text-sm mt-0.5">{dup.original_invoice_no}</div>
                  <div className="text-slate-300 mt-1">₹{dup.amount?.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-slate-400">Date: {dup.original_date}</div>
                </div>

                {/* Flagged Duplicate */}
                <div className="bg-rose-950/30 p-2.5 rounded-lg border border-rose-500/40">
                  <div className="text-[10px] font-semibold text-rose-300 uppercase">Flagged Submission</div>
                  <div className="font-mono font-bold text-rose-300 text-sm mt-0.5">{dup.duplicate_invoice_no}</div>
                  <div className="text-rose-200 mt-1">₹{dup.amount?.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] text-rose-300/80">Date: {dup.duplicate_date}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px]">
                <span className="text-slate-400">Vendor: <strong className="text-slate-200">{dup.vendor_id}</strong></span>
                <span className="text-rose-400 font-semibold">Status: Frozen (Escalation ESC-4001)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fourth Row: Approval Delays Table with 1-Click Reminder */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Pending Approvals Exceeding 2-Day SLA</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {approvalDelays.length} Overdue
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Send SMS/WhatsApp notifications to assigned approvers to expedite turnaround.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] border-b border-slate-700/80">
              <tr>
                <th className="py-2.5 px-3">Approval ID</th>
                <th className="py-2.5 px-3">Entity Type</th>
                <th className="py-2.5 px-3">Target ID</th>
                <th className="py-2.5 px-3">Assigned Approver</th>
                <th className="py-2.5 px-3">Days Pending</th>
                <th className="py-2.5 px-3">Reminders Sent</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {approvalDelays.map((app, idx) => (
                <tr key={idx} className="hover:bg-slate-700/30">
                  <td className="py-2.5 px-3 font-mono font-bold text-teal-300">{app.approval_id}</td>
                  <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-300">{app.entity_type}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-200">{app.entity_id}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-medium">{app.approver_id}</td>
                  <td className="py-2.5 px-3 font-semibold text-rose-400">{app.days_pending} days</td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{app.reminders_sent}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleSendReminder(app.approval_id)}
                      disabled={remindingId === app.approval_id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Bell className={`w-3 h-3 ${remindingId === app.approval_id ? 'animate-bounce' : ''}`} />
                      <span>{remindingId === app.approval_id ? 'Sending...' : 'Send Reminder'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
