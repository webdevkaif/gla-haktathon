import React from 'react';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  AlertCircle, 
  TrendingUp, 
  Check, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { markAlertRead } from '../api';

export default function AnomalyAlerts({ isOpen, onClose, alerts, onAlertsMutated }) {
  if (!isOpen) return null;

  const handleDismiss = async (id) => {
    try {
      await markAlertRead(id);
      if (onAlertsMutated) onAlertsMutated();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-md h-full glass-panel-deep border-l border-white/10 bg-[#070d1d]/85 backdrop-blur-3xl flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base tracking-tight">Financial Alert Feed</h3>
              <p className="text-[11px] text-slate-400">Explainable spending notices & action triggers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-btn transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {(!alerts || alerts.length === 0) ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Check className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-white">All Clear</p>
              <p className="text-xs text-slate-400">No active alerts. Your spending is in safe territory.</p>
            </div>
          ) : (
            alerts.map((a) => {
              const isDanger = a.severity === 'danger';
              return (
                <div 
                  key={a.id} 
                  className={`p-5 rounded-2xl border space-y-3.5 transition-all backdrop-blur-xl shadow-lg ${
                    isDanger 
                      ? 'bg-rose-500/[0.08] border-rose-500/30' 
                      : 'bg-amber-500/[0.08] border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      {isDanger ? (
                        <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-300">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                      <h4 className="font-bold text-xs text-white">{a.title}</h4>
                    </div>
                    {!a.is_read && (
                      <button
                        onClick={() => handleDismiss(a.id)}
                        className="text-slate-400 hover:text-white p-1.5 glass-btn rounded-xl"
                        title="Dismiss alert"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">
                    {a.message}
                  </p>

                  {/* Recommended Autonomous Actions */}
                  {a.action_options && a.action_options.length > 0 && (
                    <div className="pt-2.5 border-t border-white/[0.08] space-y-1.5">
                      <span className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Recommended Pilot Actions:
                      </span>
                      {a.action_options.map((opt, idx) => (
                        <div key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-cyan-400 font-bold shrink-0">→</span>
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
