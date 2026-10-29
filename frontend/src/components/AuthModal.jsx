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
  Database,
  ExternalLink 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

export default function AuthModal({ isOpen, onClose }) {
  const { signIn, signUp, continueAsGuest, isSupabaseConfigured } = useAuth();
  
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Input Validation
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email format (e.g. name@company.com).');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long for security.');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter.');
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
        setSuccessMessage('Account created successfully! Check your inbox to confirm or proceed.');
      }

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        if (onClose) onClose();
      }, 700);

    } catch (err) {
      console.error('[Auth Error]', err);
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestAccess = () => {
    continueAsGuest();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-md glass-panel-deep rounded-3xl border border-white/15 bg-[#070d1d]/95 p-6 sm:p-8 space-y-6 shadow-[0_25px_80px_rgba(0,0,0,0.85)] max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.35)]">
            <ShieldCheck className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {mode === 'signin' ? 'Sign In to ExpensePilot' : 'Create Pilot Account'}
          </h2>
          <p className="text-xs text-slate-400">
            Autonomous Financial Agent • Enterprise Zero-Trust Security
          </p>
        </div>

        {/* Security Assurance Badge */}
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[11px] leading-relaxed">
          <Lock className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>
            <strong>Zero-Knowledge Password Protection:</strong> Handled by Supabase Auth (Argon2/Bcrypt). Web Crypto SHA-256 used for payload data integrity.
          </span>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/10">
          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
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
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error / Success Alerts */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Kaif Mohammad"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. pilot@expensepilot.ai"
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" /> Password (Min. 8 characters)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/[0.05] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                Authenticating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {mode === 'signin' ? 'Sign In Securely' : 'Create Supabase Account'}
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <span className="relative px-3 bg-[#070d1d] text-[10px] font-bold uppercase tracking-wider text-slate-400">
            or explore
          </span>
        </div>

        {/* Instant Guest / Demo Mode Button */}
        <button
          type="button"
          onClick={handleGuestAccess}
          className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
          title="Instant Hackathon Judging / Guest Access"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Continue as Guest (Instant Demo Mode)</span>
        </button>

        {/* Supabase Status Footer */}
        <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${
              isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`} />
            <span>
              {isSupabaseConfigured ? 'Supabase Auth Online' : 'Supabase (Demo Fallback)'}
            </span>
          </span>
          <span className="text-slate-400">Row Level Security (RLS) Ready</span>
        </div>
      </div>
    </div>
  );
}
