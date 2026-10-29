import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Search, 
  Hash, 
  Lock, 
  Clock, 
  User, 
  Layers,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { fetchAuditLogs, verifyAuditChain } from '../api';

export default function AuditTrailView() {
  const [logs, setLogs] = useState([]);
  const [verification, setVerification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  const loadLogsAndVerify = async () => {
    setIsLoading(true);
    try {
      const [logList, verRes] = await Promise.all([
        fetchAuditLogs(0, 100),
        verifyAuditChain()
      ]);
      setLogs(logList || []);
      setVerification(verRes);
    } catch (err) {
      console.error("Audit load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogsAndVerify();
  }, []);

  const handleManualVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyAuditChain();
      setVerification(res);
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredLogs = logs.filter(l => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      l.id?.toLowerCase().includes(q) ||
      l.actor_id?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.entity_id?.toLowerCase().includes(q) ||
      l.hash?.toLowerCase().includes(q)
    );
    const matchesAction = actionFilter === 'All' || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action).filter(Boolean)));

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      
      {/* Cryptographic Verification Hero Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
        verification?.valid
          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
          : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
      }`}>
        <div className="flex items-start gap-3">
          {verification?.valid ? (
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <ShieldAlert className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                {verification?.valid ? "Cryptographic Audit Trail Integrity: 100% VALID" : "Tampering Detected in Immutable Ledger!"}
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                verification?.valid
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              }`}>
                {verification?.valid ? `${verification?.total || verification?.total_entries || logs.length} BLOCKS INTACT` : `BROKEN AT: ${verification?.broken_at}`}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {verification?.message || "All transactions, rule evaluations, and approval decisions are cryptographically chained via SHA-256."}
            </p>
          </div>
        </div>

        <button
          onClick={handleManualVerify}
          disabled={isVerifying}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isVerifying ? 'animate-spin' : ''}`} />
          <span>{isVerifying ? "Verifying SHA-256..." : "Re-Verify Chain"}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by actor, action, entity ID, or SHA-256 hash prefix..."
            className="w-full bg-slate-900/80 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="filter-audit-action" className="text-xs text-slate-400 whitespace-nowrap">Action:</label>
          <select
            id="filter-audit-action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="All">All Actions ({logs.length})</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Log ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor & Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity Reference</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 font-mono">Previous Block Hash</th>
                <th className="py-2.5 px-3 font-mono">Current Block Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-400">
                    No audit records found matching current query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-teal-300">{entry.id}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(entry.ts).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-200 font-medium">{entry.actor_id}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">{entry.actor_role}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-slate-200 text-[11px]">
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      <span className="uppercase text-[10px] text-slate-400 font-semibold">{entry.entity_type}:</span> {entry.entity_id}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        entry.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        entry.status === 'REFUSED' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400" title={entry.prev_hash}>
                      {entry.prev_hash ? `${entry.prev_hash.slice(0, 10)}...` : 'GENESIS'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-teal-400" title={entry.hash}>
                      {entry.hash ? `${entry.hash.slice(0, 10)}...` : 'PENDING'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

