import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  X, 
  ShieldCheck, 
  Check, 
  UserCheck, 
  Building2, 
  Lock, 
  Mail, 
  Sparkles,
  ArrowRight
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Meridian Authentication & Demo Accounts</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  JWT HS256
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Log in to test role-scoped queries, evidence citations, and authorized approval actions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Demo Accounts List (Hackathon Judge Credentials) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold flex items-center gap-1.5 text-teal-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Demo Accounts (Click any account to authenticate instantly):</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Password for all accounts: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-teal-300">password123</code>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            {demoAccounts.map((acc) => {
              const isActive = acc.id === currentUserId;
              return (
                <div
                  key={acc.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-teal-950/40 border-teal-500/60 shadow-sm'
                      : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300">
                      <UserCheck className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-slate-100">{acc.name}</strong>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-700/80 text-teal-300">
                          {acc.role} {acc.grade ? `(${acc.grade})` : ''}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {acc.email}
                      </p>
                      <p className="text-[11px] text-slate-300/80 mt-0.5">
                        {acc.description}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isLoading}
                    onClick={() => handleQuickLogin(acc)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 hover:text-white flex items-center gap-1 transition-all flex-shrink-0 shadow-sm disabled:opacity-50"
                  >
                    <span>{isActive ? 'Current' : 'Log In'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manual Login Form */}
        <div className="border-t border-slate-800 pt-4">
          <p className="text-xs font-semibold text-slate-400 mb-2">Or enter credentials manually:</p>
          <form onSubmit={handleManualLogin} className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Email or user ID (e.g. john.doe@meridian.com)"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div className="relative sm:w-48">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 disabled:opacity-40 text-slate-950 font-semibold rounded-lg text-xs shadow-md transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <span>Authenticate</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
