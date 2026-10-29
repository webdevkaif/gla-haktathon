import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  Layers, 
  Server, 
  ShieldCheck, 
  Zap 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { fetchDatabaseStatus, reconnectAtlasDatabase } from '../api';

export default function MongoConnectionModal({ isOpen, onClose, onDataMutated }) {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDatabaseStatus();
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    setFeedback(null);
    try {
      const result = await reconnectAtlasDatabase();
      if (result.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        setFeedback({ type: 'success', message: result.message });
        await loadStatus();
        if (onDataMutated) onDataMutated();
      } else {
        setFeedback({ 
          type: 'error', 
          message: result.message || 'Connection timed out. Please verify Network Access IP whitelist on cloud.mongodb.com.' 
        });
      }
    } catch (err) {
      setFeedback({ 
        type: 'error', 
        message: err.message || 'Failed to connect to Atlas cluster.' 
      });
    } finally {
      setIsReconnecting(false);
    }
  };

  const copyIpRule = () => {
    navigator.clipboard.writeText('0.0.0.0/0');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-2xl glass-panel-deep rounded-3xl border border-white/10 bg-[#070d1d]/95 p-6 sm:p-7 space-y-6 shadow-[0_25px_80px_rgba(0,0,0,0.85)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-lg tracking-tight">
                  MongoDB Atlas Real-Time Connection
                </h3>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  status?.connected_to_atlas 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {status?.connected_to_atlas ? 'Atlas Live' : 'In-Memory Live'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ExpensePilot AI persistent cloud database and real-time synchronization gateway
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-btn transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Card */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Active Database Cluster
            </span>
            <span className="font-mono text-xs text-cyan-300">
              {status?.cluster_host || 'cluster0.cllnh1c.mongodb.net'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 block">Database</span>
              <span className="font-bold text-white font-mono">{status?.database_name || 'expensepilot'}</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 block">Active Mode</span>
              <span className={`font-bold font-mono text-[11px] ${status?.connected_to_atlas ? 'text-emerald-400' : 'text-amber-400'}`}>
                {status?.connected_to_atlas ? 'Cloud Atlas' : 'Local Async'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 block">Expenses Logged</span>
              <span className="font-bold text-cyan-300 font-mono">{status?.counts?.expenses || 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[10px] text-slate-400 block">Invoices Audited</span>
              <span className="font-bold text-purple-300 font-mono">{status?.counts?.invoices || 0}</span>
            </div>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5 border shadow-md animate-fade-in ${
            feedback.type === 'success' 
              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200' 
              : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
            <div>
              <span className="font-bold block">{feedback.type === 'success' ? 'Connection Successful!' : 'Connection Notice'}</span>
              <span className="opacity-90">{feedback.message}</span>
            </div>
          </div>
        )}

        {/* Instructions: Whitelisting IP on MongoDB Atlas */}
        {!status?.connected_to_atlas && (
          <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-4 h-4" /> To Enable 100% Real-Time Cloud Atlas Access:
              </span>
              <button
                onClick={copyIpRule}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] transition-all"
                title="Copy 0.0.0.0/0 to clipboard"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied 0.0.0.0/0' : 'Copy 0.0.0.0/0'}</span>
              </button>
            </div>

            <ol className="space-y-2 text-slate-300 pl-4 list-decimal leading-relaxed">
              <li>Log in to your MongoDB Atlas dashboard at <a href="https://cloud.mongodb.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline font-bold inline-flex items-center gap-1">cloud.mongodb.com <ExternalLink className="w-3 h-3 inline" /></a></li>
              <li>In the left sidebar under <strong>Security</strong>, click <strong>Network Access</strong>.</li>
              <li>Click <strong>+ Add IP Address</strong>, then click the <strong>"Allow Access from Anywhere"</strong> button (adds <code className="text-amber-300 font-mono font-bold">0.0.0.0/0</code>).</li>
              <li>Click <strong>Confirm</strong>. Once it says <em>Active</em> (approx. 15 seconds), click the button below!</li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Automatic failover & non-blocking replication active</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-bold glass-btn text-slate-300 hover:text-white"
            >
              Close
            </button>
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Verifying Atlas...' : 'Test & Connect to MongoDB Atlas'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

