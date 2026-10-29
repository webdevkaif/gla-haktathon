import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Bell, 
  Clock, 
  User, 
  FileText, 
  ShieldAlert, 
  RefreshCw,
  Search,
  Check
} from 'lucide-react';
import { 
  fetchApprovals, 
  decideApproval, 
  sendApprovalReminder, 
  fetchEscalations, 
  resolveEscalation 
} from '../api';

export default function ApprovalsEscalationsView({ currentUser }) {
  const [activeSubTab, setActiveSubTab] = useState('approvals'); // 'approvals' | 'escalations'
  const [approvals, setApprovals] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters
  const [approvalFilter, setApprovalFilter] = useState('Pending');
  const [escalationFilter, setEscalationFilter] = useState('Open');

  // Resolution modal
  const [resolvingEscalation, setResolvingEscalation] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [appRes, escRes] = await Promise.all([
        fetchApprovals(approvalFilter === 'All' ? null : approvalFilter),
        fetchEscalations(escalationFilter === 'All' ? null : escalationFilter)
      ]);
      setApprovals(appRes || []);
      setEscalations(escRes || []);
    } catch (err) {
      console.error("Error loading approvals/escalations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [approvalFilter, escalationFilter]);

  const handleDecision = async (approvalId, decision) => {
    setProcessingId(approvalId);
    try {
      const res = await decideApproval(approvalId, decision, `Decided via web console by ${currentUser?.name}`);
      showToast(`Approval ${approvalId} successfully marked as ${decision}!`);
      await loadData();
    } catch (err) {
      showToast(err.message || `Failed to ${decision.toLowerCase()} approval`, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReminder = async (approvalId) => {
    setProcessingId(approvalId);
    try {
      const res = await sendApprovalReminder(approvalId, true);
      showToast(res.message || `Reminder dispatched for ${approvalId}`);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Could not send reminder', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolveEscalation = async () => {
    if (!resolvingEscalation) return;
    setProcessingId(resolvingEscalation.id);
    try {
      await resolveEscalation(resolvingEscalation.id, resolutionNote || "Compliance review verified.");
      showToast(`Escalation ${resolvingEscalation.id} marked as Resolved!`);
      setResolvingEscalation(null);
      setResolutionNote('');
      await loadData();
    } catch (err) {
      showToast(err.message || 'Only Finance Controller can resolve escalations', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const isUserAuthorizedApprover = (approval) => {
    if (currentUser?.role === 'finance') return true;
    return approval.approver_id === currentUser?.id;
  };

  const isUserFinance = currentUser?.role === 'finance';

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
            : 'bg-rose-950/90 text-rose-300 border border-rose-500/50'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 shadow-sm">
        
        {/* Sub-Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('approvals')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'approvals'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Workflow Approvals ({approvals.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('escalations')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'escalations'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Compliance Escalations ({escalations.length})</span>
          </button>
        </div>

        {/* Filter by state */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter-approvals-status" className="text-xs text-slate-400">State:</label>
          {activeSubTab === 'approvals' ? (
            <select
              id="filter-approvals-status"
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="Pending">Pending Only</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="All">All States</option>
            </select>
          ) : (
            <select
              id="filter-approvals-status"
              value={escalationFilter}
              onChange={(e) => setEscalationFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="Open">Open Only</option>
              <option value="Resolved">Resolved</option>
              <option value="All">All States</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        {activeSubTab === 'approvals' ? (
          /* APPROVALS TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Approval ID</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">Entity ID</th>
                  <th className="py-2.5 px-3">Assigned Approver</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">Reminders Sent</th>
                  <th className="py-2.5 px-3 text-right">Authorized Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {approvals.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400">
                      No approvals found in this state.
                    </td>
                  </tr>
                ) : (
                  approvals.map((app, idx) => {
                    const isAuth = isUserAuthorizedApprover(app);
                    const isPending = app.state === 'Pending';
                    return (
                      <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-teal-300">{app.id || app.approval_id}</td>
                        <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-300">{app.entity_type}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-100">{app.entity_id}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-300">
                          {app.approver_id}
                          {app.approver_id === currentUser?.id && (
                            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold">You</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            app.state === 'Approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                            app.state === 'Rejected' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                            'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {app.state}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {app.reminders_sent} sent
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleDecision(app.id || app.approval_id, 'Approved')}
                                disabled={!isAuth || processingId === (app.id || app.approval_id)}
                                title={isAuth ? 'Approve request' : 'Only assigned approver or Finance can decide'}
                                className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDecision(app.id || app.approval_id, 'Rejected')}
                                disabled={!isAuth || processingId === (app.id || app.approval_id)}
                                title={isAuth ? 'Reject request' : 'Only assigned approver or Finance can decide'}
                                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleReminder(app.id || app.approval_id)}
                                disabled={processingId === (app.id || app.approval_id)}
                                title="Nudge approver via simulated SMS"
                                className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-teal-300 transition-colors"
                              >
                                <Bell className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-500 text-[11px] font-medium">Decided</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ESCALATIONS TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Escalation ID</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Assignee</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Summary</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {escalations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-400">
                      No compliance escalations found.
                    </td>
                  </tr>
                ) : (
                  escalations.map((esc, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-300">{esc.id || esc.escalation_id}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-200">
                        {esc.entity_type?.toUpperCase()}: {esc.entity_id}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-300 capitalize">{esc.reason?.replace('_', ' ')}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          esc.severity === 'high' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                          esc.severity === 'medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                          'bg-slate-700 text-slate-300 border-slate-600'
                        }`}>
                          {esc.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-300">{esc.assignee_id || 'fin_alex'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          esc.status === 'Resolved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                          'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}>
                          {esc.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-sm truncate" title={esc.summary}>
                        {esc.summary}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {esc.status === 'Open' ? (
                          <button
                            onClick={() => setResolvingEscalation(esc)}
                            disabled={!isUserFinance}
                            title={isUserFinance ? 'Resolve ticket' : 'Only Finance Controller can resolve escalations'}
                            className="px-2.5 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-xs font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Resolve
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-medium">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RESOLUTION MODAL */}
      {resolvingEscalation && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h2 className="text-lg font-bold text-white mb-1">Resolve Compliance Escalation</h2>
            <p className="text-xs text-slate-400 mb-4">
              Ticket: <strong className="text-rose-300">{resolvingEscalation.id}</strong> — {resolvingEscalation.summary}
            </p>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Resolution Note / Audit Findings</label>
                <textarea
                  rows="3"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Verified duplicate invoice with Acme Supplies; redundant claim marked cancelled..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingEscalation(null)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResolveEscalation}
                  disabled={processingId === resolvingEscalation.id}
                  className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md disabled:opacity-50"
                >
                  Confirm Resolution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

