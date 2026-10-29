import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  X, 
  UserCheck, 
  Lock, 
  Mail, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { fetchDemoAccounts, loginUser } from '../api';

export default function LoginModal({ isOpen, onClose, onLoginSuccess, currentUserId }) {
  const [demoAccounts, setDemoAccounts] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDemoAccounts()
        .then((data) => setDemoAccounts(data))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await loginUser(username.trim(), password);
      if (onLoginSuccess) onLoginSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (acc) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginUser(acc.email, acc.password || 'password123');
      if (onLoginSuccess) onLoginSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in-50 zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/50 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Enterprise Credentials & Demo Accounts</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  JWT Auth
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Authenticate as different roles to evaluate data scoping, approvals, and audit trails.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Demo Accounts List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-semibold flex items-center gap-1.5 text-slate-900">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>1-Click Judge & Demo Sign-in:</span>
            </span>
            <span className="text-[11px] text-slate-500">
              Demo password: <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">password123</code>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {demoAccounts.map((acc) => {
              const isActive = acc.id === currentUserId;
              return (
                <div
                  key={acc.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-emerald-50/50 border-emerald-500 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600 font-bold text-xs">
                      {acc.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-slate-900">{acc.name}</strong>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {acc.role} {acc.grade ? `(${acc.grade})` : ''}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        {acc.email}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {acc.description}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isLoading}
                    onClick={() => handleQuickLogin(acc)}
                    className="fintech-btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all flex-shrink-0 disabled:opacity-50"
                  >
                    <span>{isActive ? 'Active' : 'Log In'}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manual Login Form */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-700 mb-2">Or enter credentials manually:</p>
          <form onSubmit={handleManualLogin} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Email or user ID"
                className="w-full fintech-input pl-8 pr-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div className="relative sm:w-44">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full fintech-input pl-8 pr-3 py-2 text-xs text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="fintech-btn-primary px-4 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <span>Authenticate</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
