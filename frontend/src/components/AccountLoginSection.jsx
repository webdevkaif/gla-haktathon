import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  LogOut,
  KeyRound,
  ShieldAlert,
  UserCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

const DEMO_ACCOUNTS = [
  {
    name: "Kaif Mohammad",
    email: "kaif@expensepilot.ai",
    role: "Senior Software Engineer (L2)",
    grade: "L2",
    badgeColor: "from-cyan-500 to-blue-600",
    initials: "KM"
  },
  {
    name: "Sarah Chen",
    email: "sarah.chen@meridian.corp",
    role: "Engineering Manager (L3)",
    grade: "L3",
    badgeColor: "from-purple-500 to-indigo-600",
    initials: "SC"
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@meridian.corp",
    role: "Finance Director & Controller (L4)",
    grade: "L4",
    badgeColor: "from-amber-500 to-orange-600",
    initials: "PS"
  }
];

export default function AccountLoginSection({ onLoginSuccess }) {
  const { user, isGuestMode, signIn, signUp, signOut, continueAsGuest, isSupabaseConfigured } = useAuth();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isLoggedIn = user && !user.is_guest;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        setSuccessMessage('Successfully signed in! Welcome back.');
      } else {
        await signUp(email.trim(), password, { full_name: fullName.trim() });
        setSuccessMessage('Account created successfully!');
      }

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (acc) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await signIn(acc.email, "demo_secure_pass_123");
      setSuccessMessage(`Switched active profile to ${acc.name} (${acc.role})!`);
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 }
      });
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setErrorMessage(err.message || 'Quick login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl glass-panel border border-cyan-500/30 bg-gradient-to-r from-[#070d1d]/90 via-[#0a1530]/90 to-[#070d1d]/90 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Authentication & Account HQ
              </h2>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isLoggedIn 
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              }`}>
                {isLoggedIn ? 'Authenticated' : isGuestMode ? 'Guest Session' : 'Unauthenticated'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Zero-Trust Identity • Supabase Auth • Row Level Security (RLS) • Web Crypto SHA-256
            </p>
          </div>
        </div>

        {isLoggedIn && (
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition-all shadow-sm shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* Main Container */}
      {isLoggedIn ? (
        /* =========================================================================
           ACTIVE AUTHENTICATED PROFILE VIEW
           ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* User Profile Card */}
          <div className="md:col-span-1 glass-panel p-6 sm:p-7 rounded-3xl space-y-5 border border-white/10 relative overflow-hidden">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-cyan-500/20 border border-white/20">
                {(user.user_metadata?.full_name || user.email || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg tracking-tight">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </h3>
                <p className="text-xs text-slate-400">{user.email}</p>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                Verified Supabase Identity
              </span>
            </div>

            <div className="pt-4 border-t border-white/[0.08] space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Account ID:</span>
                <span className="font-mono text-[11px] text-slate-300 truncate max-w-[140px]">{user.id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Created:</span>
                <span className="text-slate-300">{new Date(user.created_at || Date.now()).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Session Type:</span>
                <span className="text-emerald-400 font-semibold">Active JWT Token</span>
              </div>
            </div>

            <button
              onClick={signOut}
              className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 border border-white/15 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out Current Account</span>
            </button>
          </div>

          {/* Security & Data Protection Report */}
          <div className="md:col-span-2 glass-panel p-6 sm:p-7 rounded-3xl space-y-6 border border-white/10">
            <div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-white text-base tracking-tight">
                Active Security & Data Protection Controls
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Row Level Security (RLS)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  PostgreSQL kernel policy isolates your expenses. Other users cannot query or mutate your transactions.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>Web Crypto SHA-256 Seals</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Every submitted expense is cryptographically hashed with native browser Web Crypto for non-repudiation.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  <span>Zero Plain-Text Passwords</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Passwords never touch plain SHA-256; salted and stretched via Supabase Auth (Argon2 / Bcrypt).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>PyOD Anomaly Detection</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Isolation Forest monitors personal spending history for velocity spikes, duplicates, and outliers.
                </p>
              </div>
            </div>

            {/* Quick Demo Switcher when signed in */}
            <div className="pt-2 border-t border-white/[0.08] space-y-3">
              <span className="text-xs font-bold text-slate-300 block">
                Switch to Demo Role for Judging:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleQuickDemoLogin(acc)}
                    disabled={isSubmitting || user.email === acc.email}
                    className={`p-3 rounded-2xl text-left border transition-all text-xs ${
                      user.email === acc.email
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.07]'
                    }`}
                  >
                    <span className="font-extrabold block">{acc.name}</span>
                    <span className="text-[10px] text-slate-400 block">{acc.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* =========================================================================
           LOGIN / REGISTRATION SECTION
           ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form (7 Columns) */}
          <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl space-y-6 border border-white/15 bg-[#070d1d]/95">
            {/* Form Mode Toggle */}
            <div className="flex items-center p-1.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                  mode === 'signin'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                  mode === 'signup'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Register Account
              </button>
            </div>

            {/* Error / Success Feedback */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Kaif Mohammad"
                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. pilot@expensepilot.ai"
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Password (Min. 8 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 pr-11 rounded-2xl bg-white/[0.05] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.05] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Authenticating with Supabase...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === 'signin' ? 'Sign In Securely' : 'Create Supabase Account'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>

            {/* Instant Guest Explorer Option */}
            <div className="pt-2 border-t border-white/[0.08] text-center">
              <button
                type="button"
                onClick={continueAsGuest}
                className="w-full py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Continue as Guest (Instant Demo Mode)</span>
              </button>
            </div>
          </div>

          {/* Right Cards: Quick Demo Switcher + Security Explainer (5 Columns) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Quick Demo Role Cards */}
            <div className="glass-panel p-6 rounded-3xl border border-white/15 bg-[#070d1d]/90 space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                <h3 className="font-extrabold text-white text-sm tracking-tight">
                  Quick Demo Login (Judging)
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Instantly simulate corporate employee personas with preset approval grades:
              </p>

              <div className="space-y-2.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleQuickDemoLogin(acc)}
                    disabled={isSubmitting}
                    className="w-full p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/50 transition-all text-left group flex items-center gap-3"
                  >
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${acc.badgeColor} flex items-center justify-center text-white font-extrabold text-xs shadow-md shrink-0`}>
                      {acc.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-white text-xs block group-hover:text-cyan-300 transition-colors">
                        {acc.name}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {acc.role}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Zero-Trust Architecture Badge */}
            <div className="glass-panel p-5 rounded-3xl border border-emerald-500/25 bg-emerald-950/20 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 font-extrabold text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero-Trust Data Protection</span>
              </div>
              <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
                <li>Passwords encrypted via Supabase Auth (Argon2 / Bcrypt)</li>
                <li>Expenses isolated using PostgreSQL Row Level Security (RLS)</li>
                <li>Non-password records sealed with Web Crypto SHA-256</li>
              </ul>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
