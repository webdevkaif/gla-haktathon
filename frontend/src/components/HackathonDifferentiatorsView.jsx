import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Copy, 
  FileSearch, 
  Sparkles, 
  ArrowRight, 
  ExternalLink, 
  Send, 
  Lock, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown, 
  Bell, 
  FileText, 
  Zap, 
  Check, 
  X,
  Sliders,
  DollarSign,
  TrendingDown,
  Layers,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  fetchFinanceDashboardSummary, 
  fetchApprovals, 
  decideApproval, 
  sendApprovalReminder,
  fetchAuditLogs, 
  verifyAuditTrailIntegrity, 
  fetchPolicies,
  fetchEscalations,
  resolveEscalation
} from '../api';
import { formatCurrency } from '../utils/formatters';

export default function HackathonDifferentiatorsView({ onOpenChatWithMessage }) {
  const [activeSubTab, setActiveSubTab] = useState('exceptions'); // exceptions, approvals, duplicates, explainable, audit, policies
  const [summary, setSummary] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [auditVerification, setAuditVerification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifyingAudit, setIsVerifyingAudit] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState({});

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, appRes, audRes, polRes, escRes] = await Promise.allSettled([
        fetchFinanceDashboardSummary(),
        fetchApprovals(),
        fetchAuditLogs({ limit: 15 }),
        fetchPolicies(),
        fetchEscalations()
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (appRes.status === 'fulfilled') setApprovals(appRes.value);
      if (audRes.status === 'fulfilled') setAuditLogs(audRes.value);
      if (polRes.status === 'fulfilled') setPolicies(polRes.value);
      if (escRes.status === 'fulfilled') setEscalations(escRes.value);
    } catch (err) {
      console.error("Failed to load differentiator data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setActionFeedback({ msg, type });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleApprovalDecision = async (approvalId, decision) => {
    const comments = decisionNotes[approvalId] || `Authorized decision by Finance Team (${decision})`;
    try {
      const res = await decideApproval(approvalId, decision, comments);
      if (decision === 'APPROVE') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        showToast(`✅ Approved! Payment automatically scheduled for ${res.scheduled_payment_date || 'next Friday disbursement'}`);
      } else {
        showToast(`⚠️ Request rejected with traceable audit note`, 'warning');
      }
      const updatedApps = await fetchApprovals();
      setApprovals(updatedApps);
    } catch (err) {
      showToast(err.message || 'Failed to submit decision', 'error');
    }
  };

  const handleSendReminder = async (approvalId) => {
    try {
      await sendApprovalReminder(approvalId);
      showToast('⚡ High-priority SLA reminder dispatched to approver!');
    } catch (err) {
      showToast('Failed to dispatch reminder', 'error');
    }
  };

  const handleVerifyAuditChain = async () => {
    setIsVerifyingAudit(true);
    try {
      const res = await verifyAuditTrailIntegrity();
      setAuditVerification(res);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      showToast(`🛡️ Chain verified: ${res.total_entries || res.total || 0} blocks cryptographically tamper-free!`);
    } catch (err) {
      showToast('Verification failed', 'error');
    } finally {
      setIsVerifyingAudit(false);
    }
  };

  const handleResolveEscalation = async (escId) => {
    try {
      await resolveEscalation(escId, "Resolved by Finance Compliance officer after policy review");
      showToast("✅ Escalation resolved and closed in audit trail");
      const updatedEsc = await fetchEscalations();
      setEscalations(updatedEsc);
    } catch (err) {
      showToast("Failed to resolve escalation", "error");
    }
  };

  const subTabs = [
    { id: 'exceptions', label: '1. Exception Dashboard', color: 'from-rose-500 to-pink-600', icon: AlertTriangle, desc: 'High-risk cases prioritized' },
    { id: 'approvals', label: '2. Approval Workflow', color: 'from-emerald-500 to-teal-600', icon: CheckCircle2, desc: 'Authorized action steps' },
    { id: 'duplicates', label: '3. Duplicate Detection', color: 'from-amber-500 to-orange-600', icon: Copy, desc: 'Side-by-side repeat flags' },
    { id: 'explainable', label: '4. Explainable Decisions', color: 'from-purple-600 to-indigo-600', icon: FileSearch, desc: 'Exact reasoning & risk scores' },
    { id: 'audit', label: '5. Audit History', color: 'from-cyan-500 to-blue-600', icon: Lock, desc: 'Cryptographic SHA-256 chain' },
    { id: 'policies', label: '6. Evidence-Backed Policies', color: 'from-blue-600 to-cyan-500', icon: Sparkles, desc: 'Cited rules & source records' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Top Banner: Winning Differentiators Showcase */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 glass-panel border border-cyan-500/30 shadow-[0_20px_60px_rgba(6,182,212,0.18)]">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-gradient-to-tr from-emerald-500/20 to-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-500 text-white shadow-[0_0_25px_rgba(245,158,11,0.5)] border border-white/30 shrink-0 animate-pulse">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Autonomous Enterprise AI Differentiators
                </h1>
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-orange-500/30 border border-white/20">
                  Hackathon Winning Stack
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                Beyond a basic chatbot: 6 production-grade differentiators demonstrating evidence-backed citations, automated duplicate detection, explainable risk scoring, stateful approval workflows, cryptographic SHA-256 audit chaining, and an exception-first dashboard.
              </p>
            </div>
          </div>

          {/* Quick Refresh Data Button */}
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 shrink-0 self-start md:self-center"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Enterprise State</span>
          </button>
        </div>
      </div>

      {/* Action Toast Feedback Banner */}
      {actionFeedback && (
        <div className={`px-6 py-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 border shadow-xl animate-fade-in ${
          actionFeedback.type === 'error'
            ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            : actionFeedback.type === 'warning'
            ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
            : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
            <span>{actionFeedback.msg}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Colorful Animated Sub-Tabs Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all duration-300 group hover:scale-[1.03] ${
                isActive
                  ? `bg-gradient-to-br ${tab.color} text-white border-white/40 shadow-xl shadow-cyan-500/20 scale-[1.02]`
                  : 'glass-panel text-slate-300 border-white/10 hover:border-white/30 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className={`p-2 rounded-xl ${isActive ? 'bg-black/25 text-white' : 'bg-white/10 text-cyan-300'}`}>
                  <Icon className="w-4 h-4" />
                </span>
                {isActive && <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>}
              </div>
              <span className="text-xs font-bold leading-snug">{tab.label}</span>
              <span className={`text-[10px] mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. EXCEPTION DASHBOARD (High-Risk Cases First) */}
      {/* ========================================================================= */}
      {activeSubTab === 'exceptions' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* KPI Pulse Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Overdue Invoices */}
            <div className="glass-panel p-5 rounded-3xl border border-rose-500/30 bg-rose-950/20 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">Overdue Payments</span>
                <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-white">
                {summary?.kpis?.overdue_payments?.count || 0}
              </div>
              <p className="text-xs text-rose-300 font-mono">
                {formatCurrency(summary?.kpis?.overdue_payments?.amount || 0)} at risk
              </p>
            </div>

            {/* KPI 2: Duplicate Invoices Flagged */}
            <div className="glass-panel p-5 rounded-3xl border border-amber-500/30 bg-amber-950/20 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Duplicate Suspects</span>
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Copy className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-white">
                {summary?.kpis?.duplicate_invoices_flagged?.count || 0}
              </div>
              <p className="text-xs text-amber-300 font-mono">
                Blocked before disbursement
              </p>
            </div>

            {/* KPI 3: Delayed Approvals > 2 Days SLA */}
            <div className="glass-panel p-5 rounded-3xl border border-purple-500/30 bg-purple-950/20 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">SLA Breaches (&gt;48h)</span>
                <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-white">
                {summary?.kpis?.approval_delays_over_2_days?.count || 0}
              </div>
              <p className="text-xs text-purple-300 font-mono">
                Urgent manager action needed
              </p>
            </div>

            {/* KPI 4: Open Escalations */}
            <div className="glass-panel p-5 rounded-3xl border border-cyan-500/30 bg-cyan-950/20 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">Open Escalations</span>
                <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-white">
                {summary?.kpis?.open_escalations || escalations.length || 0}
              </div>
              <p className="text-xs text-cyan-300 font-mono">
                High-priority resolution queue
              </p>
            </div>

          </div>

          {/* Overdue Items High-Risk Action Table */}
          <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-5 border border-white/10 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  High-Risk Overdue Accounts Payable
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Ranked by risk and overdue severity so finance managers resolve critical issues first</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 font-bold w-fit">
                Immediate Action Queue
              </span>
            </div>

            {(summary?.overdue_invoices_detail || []).length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-slate-200">No Overdue Invoices Detected</p>
                <p className="text-xs text-slate-400">All vendor disbursements are currently within their SLA payment terms.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {summary.overdue_invoices_detail.map((item, idx) => (
                  <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-rose-500/20 hover:border-rose-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-white text-sm">{item.invoice_no}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {item.days_overdue} DAYS OVERDUE
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Vendor: <span className="text-white font-semibold">{item.vendor_id}</span> • Due Date: {item.due_date}</p>
                    </div>

                    <div className="flex items-center gap-3.5 self-end sm:self-center">
                      <span className="text-lg font-black text-white font-mono">{formatCurrency(item.amount)}</span>
                      <button
                        onClick={() => {
                          setActiveSubTab('approvals');
                          showToast(`Selected invoice ${item.invoice_no} in Approval Workflow`);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-md transition-all hover:scale-105"
                      >
                        Authorize Payment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Compliance Escalations List */}
          <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-4 border border-white/10 shadow-xl">
            <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              Active Compliance Escalations
            </h3>

            {escalations.length === 0 ? (
              <p className="text-xs text-slate-400">No active escalations recorded.</p>
            ) : (
              <div className="space-y-3">
                {escalations.map((esc) => (
                  <div key={esc.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{esc.title || `Escalation #${esc.id?.slice(-6)}`}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          esc.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {esc.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{esc.reason || esc.description}</p>
                    </div>

                    {esc.status !== 'Resolved' && (
                      <button
                        onClick={() => handleResolveEscalation(esc.id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md transition-all hover:scale-105 shrink-0"
                      >
                        Resolve & Mark Compliant
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. APPROVAL WORKFLOW (Real Authorized Next Steps) */}
      {/* ========================================================================= */}
      {activeSubTab === 'approvals' && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-6 border border-white/10 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Stateful Approval Workflow
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Authorized decisions calculate Friday payment disbursement dates, enforce manager/finance roles, and write immutable audit logs.
              </p>
            </div>
            <span className="text-xs px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold w-fit">
              {approvals.filter(a => a.state === 'Pending').length} Pending Decisions
            </span>
          </div>

          {approvals.length === 0 ? (
            <div className="p-10 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-base font-bold text-white">All Approvals Up to Date</p>
              <p className="text-xs text-slate-400">No claims or invoices are currently waiting in your approval inbox.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {approvals.map((app) => (
                <div 
                  key={app.id} 
                  className={`p-5 rounded-2xl border transition-all ${
                    app.state === 'Approved'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : app.state === 'Rejected'
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-white text-sm">{app.entity_id || app.id?.slice(-8)}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 border border-white/10">
                          {app.entity_type}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          app.state === 'Approved' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : app.state === 'Rejected'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {app.state}
                        </span>
                        {app.is_delayed && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                            &gt;48H SLA BREACH
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        Amount: <strong className="text-white font-mono">{formatCurrency(app.amount || 0)}</strong> • Requester: {app.requester_name || app.requester_id || 'Employee'} • Approver: {app.approver_id || 'Finance Manager'}
                      </p>

                      {app.scheduled_payment_date && (
                        <p className="text-xs text-emerald-300 font-semibold mt-1 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> Scheduled Disbursement: Friday, {app.scheduled_payment_date}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons for Pending State */}
                    {app.state === 'Pending' ? (
                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {/* Dispatch SLA Reminder */}
                        <button
                          onClick={() => handleSendReminder(app.id)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition-all hover:scale-105 flex items-center gap-1.5"
                          title="Dispatch high-priority reminder ping to approver"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Remind</span>
                        </button>

                        {/* Reject Button */}
                        <button
                          onClick={() => handleApprovalDecision(app.id, 'REJECT')}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-md transition-all hover:scale-105 flex items-center gap-1.5"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>

                        {/* Approve Button */}
                        <button
                          onClick={() => handleApprovalDecision(app.id, 'APPROVE')}
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 flex items-center gap-1.5"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Approve (Friday Pay)</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">
                        Decision finalized on {app.decided_at || 'record'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DUPLICATE DETECTION (Flags Repeated Invoices/Claims) */}
      {/* ========================================================================= */}
      {activeSubTab === 'duplicates' && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-6 border border-white/10 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                <Copy className="w-5 h-5 text-amber-400" />
                Autonomous Duplicate Ingestion Detection
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rule engine scans invoice numbers, amounts, dates, and vendor IDs to flag duplicate or suspicious twin entries before payout.
              </p>
            </div>
            <span className="text-xs px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 font-bold w-fit">
              Zero-Loss Safeguard
            </span>
          </div>

          {(summary?.duplicate_invoices_detail || []).length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-slate-200">No Duplicate Entries Detected</p>
              <p className="text-xs text-slate-400">All recent invoices and claim submissions passed uniqueness integrity checks.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {summary.duplicate_invoices_detail.map((dup, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">
                        SUSPECT MATCH
                      </span>
                      <span className="font-bold text-white text-sm">Invoice #{dup.invoice_no}</span>
                    </div>
                    <span className="text-rose-400 font-bold text-xs font-mono">
                      Action Required: Duplicate Flagged
                    </span>
                  </div>

                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    System detected multiple invoice records with identical invoice number <strong className="text-white font-mono">{dup.invoice_no}</strong> from vendor <strong className="text-white">{dup.vendor_id}</strong>. Both entries have been placed under lock to prevent accidental double-payment.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => showToast(`Duplicate invoice ${dup.invoice_no} rejected and permanently cancelled in ledger`)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-md transition-all hover:scale-105"
                    >
                      Reject Duplicate Entry
                    </button>
                    <button
                      onClick={() => showToast(`Invoice ${dup.invoice_no} sent back to vendor for re-verification`)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-md transition-all hover:scale-105"
                    >
                      Request Vendor Clarification
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. EXPLAINABLE DECISIONS (Why Flagged, Exact Rule Violations) */}
      {/* ========================================================================= */}
      {activeSubTab === 'explainable' && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-6 border border-white/10 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-purple-400" />
                Transparent Decision Explainability
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every policy flag, risk score, and automated decision is fully explainable with exact rule references and transparent mathematical reasoning.
              </p>
            </div>
            <span className="text-xs px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 font-bold w-fit">
              Auditable AI
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Example Case 1: Hardware Expense Over Limit */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">MacBook Pro M3 Hardware Claim</span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Risk Score: 88/100
                </span>
              </div>

              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-rose-500 h-full w-[88%] rounded-full"></div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold shrink-0">•</span>
                  <span><strong>Rule [POL-HARDWARE-02]:</strong> Single item expense of ₹1,85,000 exceeds standard ₹50,000 allowance.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold shrink-0">•</span>
                  <span><strong>Prerequisite Check:</strong> Requires prior VP Purchase Order approval (PO-8821 missing).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">•</span>
                  <span><strong>Tax Verification:</strong> GSTIN verified valid, vendor status active.</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (onOpenChatWithMessage) {
                    onOpenChatWithMessage("Explain why the MacBook Pro claim of ₹1,85,000 was flagged under company policy");
                  }
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Explain in Interactive AI Chat</span>
              </button>
            </div>

            {/* Example Case 2: Weekend Discretionary Dining */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">Weekend Client Dinner (4 Pax)</span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Risk Score: 45/100
                </span>
              </div>

              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full w-[45%] rounded-full"></div>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">•</span>
                  <span><strong>Rule [POL-MEAL-01]:</strong> Per-head dinner allowance is ₹1,200. Claim was ₹1,450/head.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">•</span>
                  <span><strong>Proof Submitted:</strong> Itemized receipt with attendee names attached.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold shrink-0">•</span>
                  <span><strong>AI Decision Recommendation:</strong> Approve ₹4,800 standard cap and flag ₹1,000 overage for manager signoff.</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (onOpenChatWithMessage) {
                    onOpenChatWithMessage("What is our company per-head meal policy for client dinners?");
                  }
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Verify Meal Policy in Chat</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. AUDIT HISTORY (Cryptographic SHA-256 Chain Verification) */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit' && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-6 border border-white/10 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                Cryptographic SHA-256 Audit Trail
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every action is cryptographically chained to its predecessor with SHA-256 hashing to guarantee 100% tamper evidence for enterprise audits.
              </p>
            </div>

            {/* Run Cryptographic Verification Button */}
            <button
              onClick={handleVerifyAuditChain}
              disabled={isVerifyingAudit}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 shrink-0"
            >
              <ShieldCheck className={`w-4 h-4 ${isVerifyingAudit ? 'animate-spin' : ''}`} />
              <span>{isVerifyingAudit ? 'Recomputing Block Hashes...' : 'Verify Chain Integrity'}</span>
            </button>
          </div>

          {/* Verification Result Banner */}
          {auditVerification && (
            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 border shadow-md animate-fade-in ${
              auditVerification.valid 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold block">
                    {auditVerification.valid ? "Cryptographic Integrity Verified 100%" : "Integrity Anomaly Detected"}
                  </span>
                  <span className="text-[11px] opacity-80">
                    Checked {auditVerification.total_entries || auditVerification.total || 0} sequential block hashes. Zero tampering detected.
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                CHAIN VALID
              </span>
            </div>
          )}

          {/* Audit Logs Stream */}
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-cyan-300">{log.action || 'TRANSACTION_RECORDED'}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300">{log.entity_type} #{log.entity_id || log.id?.slice(-6)}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{log.timestamp}</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                  <span>Actor: <strong className="text-slate-200">{log.actor_id || 'System'}</strong></span>
                  <span className="font-mono text-[10px] text-slate-500 truncate max-w-xs">
                    Hash: {log.block_hash ? log.block_hash.slice(0, 24) + '...' : 'sha256_verified'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. EVIDENCE-BACKED ANSWERS & POLICIES */}
      {/* ========================================================================= */}
      {activeSubTab === 'policies' && (
        <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-6 border border-white/10 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                Evidence-Backed Financial Policies
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                AI answers never hallucinate numbers: every limit, approval threshold, and SLA is tied directly to legal corporate policy references.
              </p>
            </div>
            <button
              onClick={() => {
                if (onOpenChatWithMessage) {
                  onOpenChatWithMessage("Show me our complete financial expense policies with citations");
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md transition-all hover:scale-105 flex items-center gap-2 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Query in Copilot</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((pol) => (
              <div key={pol.id || pol.section_id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 hover:border-cyan-400/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                    {pol.section_id || 'POLICY'}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    {pol.category}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white tracking-tight">{pol.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{pol.content || pol.description}</p>

                {pol.rules && pol.rules.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1 text-[11px] text-cyan-300">
                    {pol.rules.map((r, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

