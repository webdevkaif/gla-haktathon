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
  Shield, 
  Fingerprint, 
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import confetti from 'canvas-confetti';

const DEMO_ACCOUNTS = [
  {
    id: "user_kaif",
    name: "Mohammad Kaif",
    email: "kaif@expensepilot.ai",
    role: "Lead AI Architect & Admin (L4)",
    grade: "L4",
    badgeColor: "from-violet-600 to-indigo-600",
    initials: "MK",
    description: "Full administrative governance, model tuning & policy control"
  },
  {
    id: "mgr_sarah",
    name: "Sarah Chen",
    email: "sarah.chen@meridian.corp",
    role: "Engineering Manager (L3)",
    grade: "L3",
    badgeColor: "from-purple-600 to-violet-600",
    initials: "SC",
    description: "Team approvals, budget allocation & department oversight"
  },
  {
    id: "dir_priya",
    name: "Priya Sharma",
    email: "priya.sharma@meridian.corp",
    role: "Finance Director & Controller (L4)",
    grade: "L4",
    badgeColor: "from-emerald-600 to-teal-600",
    initials: "PS",
    description: "Corporate audit trails, invoice settlement & SLA compliance"
  },
  {
    id: "emp_john",
    name: "John Doe",
    email: "john.doe@meridian.com",
    role: "Senior Expense Analyst (L2)",
    grade: "L2",
    badgeColor: "from-blue-600 to-cyan-600",
    initials: "JD",
    description: "Standard employee reimbursements & receipt submissions"
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

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: 'Enter Password', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score === 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Strong', color: 'bg-emerald-400' };
    return { score: 100, label: 'Enterprise Shield (Maximum)', color: 'bg-violet-400' };
  };

  const passStrength = getPasswordStrength(password);

  const syncActiveUserToStorage = (userData) => {
    try {
      localStorage.setItem('expensepilot_active_user', JSON.stringify({ user: userData }));
      localStorage.setItem('expensepilot_demo_session', JSON.stringify({ user: userData }));
    } catch (_) {}
  };

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
      setErrorMessage('Please enter a valid corporate or personal email address.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long for security compliance.');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
      if (!fullName.trim()) {
        setErrorMessage('Please enter your full legal name for audit records.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let activeProfile;
      if (mode === 'signin') {
        const res = await signIn(email.trim(), password);
        const nameGuess = fullName.trim() || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        activeProfile = {
          id: res?.data?.user?.id || `user_${email.split('@')[0]}`,
          email: email.trim(),
          user_metadata: {
            full_name: res?.data?.user?.user_metadata?.full_name || nameGuess,
            role: "Enterprise Member",
            grade: "L3"
          }
        };
        syncActiveUserToStorage(activeProfile);
        setSuccessMessage(`Welcome back, ${activeProfile.user_metadata.full_name}! Identity verified.`);
      } else {
        const res = await signUp(email.trim(), password, { full_name: fullName.trim() });
        activeProfile = {
          id: res?.data?.user?.id || `user_${fullName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          email: email.trim(),
          user_metadata: {
            full_name: fullName.trim(),
            role: "Enterprise Member",
            grade: "L2"
          }
        };
        syncActiveUserToStorage(activeProfile);
        setSuccessMessage(`Account provisioned successfully for ${fullName.trim()}!`);
      }

      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 }
      });

      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setErrorMessage(err.message || 'Authentication rejected. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (acc) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const activeProfile = {
        id: acc.id,
        email: acc.email,
        user_metadata: {
          full_name: acc.name,
          role: acc.role,
          grade: acc.grade
        }
      };
      syncActiveUserToStorage(activeProfile);
      await signIn(acc.email, "demo_secure_pass_123");
      setSuccessMessage(`Switched active profile to ${acc.name} (${acc.role})!`);
      confetti({
        particleCount: 65,
        spread: 55,
        origin: { y: 0.6 }
      });
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setErrorMessage(err.message || 'Quick profile switch failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* Top Identity Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl glass-panel border border-violet-500/25 bg-gradient-to-r from-[#0a0d18]/90 via-[#0f1224]/90 to-[#0a0d18]/90 shadow-2xl">
        <div className="flex items-center gap-4">
          <Logo size="lg" showSubtitle={false} />
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Enterprise Identity Vault
              </h2>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isLoggedIn 
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                  : 'bg-violet-500/15 border-violet-500/30 text-violet-300'
              }`}>
                {isLoggedIn ? 'Authenticated' : 'Zero-Trust Gate'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Role-Based Access Control • Web Crypto SHA-256 • Cryptographic Audit Trails
            </p>
          </div>
        </div>

        {isLoggedIn && (
          <button
            onClick={() => {
              signOut();
              localStorage.removeItem('expensepilot_active_user');
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition-all shadow-sm shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {isLoggedIn ? (
        /* =========================================================================
           ACTIVE AUTHENTICATED PROFILE VIEW
           ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* User Profile Card */}
          <div className="md:col-span-1 glass-panel p-6 sm:p-7 rounded-3xl space-y-5 border border-violet-400/20 relative overflow-hidden">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-800 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-violet-500/20 border border-violet-300/30">
                {(user.user_metadata?.full_name || user.email || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-black text-white text-lg tracking-tight">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </h3>
                <p className="text-xs text-violet-300 font-mono mt-0.5">{user.email}</p>
                <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200">
                  {user.user_metadata?.role || "Enterprise Member (L3)"}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Account ID:</span>
                <span className="font-mono text-[11px] text-slate-300 truncate max-w-[140px]">{user.id}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Agent Greeting:</span>
                <span className="font-bold text-emerald-400">{user.user_metadata?.full_name || user.email?.split('@')[0]}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Session Type:</span>
                <span className="text-violet-300 font-semibold">Verified HS256 Token</span>
              </div>
            </div>

            <button
              onClick={() => {
                signOut();
                localStorage.removeItem('expensepilot_active_user');
              }}
              className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-rose-500/20 border border-white/15 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out Current Account</span>
            </button>
          </div>

          {/* Security & Quick Profile Switcher */}
          <div className="md:col-span-2 glass-panel p-6 sm:p-7 rounded-3xl space-y-6 border border-white/10">
            <div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-white text-base tracking-tight">
                Verified Security & Autonomous Guardrails
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-violet-300">
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                  <span>Personalized Agent Identity</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Voice AI & chat agents address you directly by your registered name across telemetry and PDF reports.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Row-Level Data Isolation</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cryptographically scoped tenant boundaries isolate user liabilities, invoices, and expense claims.
                </p>
              </div>
            </div>

            {/* Quick Demo Switcher when signed in */}
            <div className="pt-2 border-t border-white/[0.08] space-y-3">
              <span className="text-xs font-bold text-slate-300 block">
                Switch Verified Profile for Judging:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleQuickDemoLogin(acc)}
                    disabled={isSubmitting || user.email === acc.email}
                    className={`p-3.5 rounded-2xl text-left border transition-all text-xs cursor-pointer ${
                      user.email === acc.email
                        ? 'bg-violet-500/20 border-violet-400/50 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.07] hover:border-violet-400/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm">{acc.name}</span>
                      <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                        {acc.grade}
                      </span>
                    </div>
                    <span className="text-[11px] text-violet-300 block font-medium">{acc.role}</span>
                    <span className="text-[10px] text-slate-400 block mt-1">{acc.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* =========================================================================
           LOGIN / REGISTRATION VAULT
           ========================================================================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form: Sign In / Register (7 Columns) */}
          <div className="lg:col-span-7 glass-panel p-6 sm:p-8 rounded-3xl space-y-6 border border-violet-500/20 bg-[#090b14]/95">
            {/* Form Mode Toggle */}
            <div className="flex items-center p-1.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 border border-white/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 border border-white/20'
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

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Mohammad Kaif"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs text-white placeholder-slate-500 focus:border-violet-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs text-white placeholder-slate-500 focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl glass-input text-xs text-white placeholder-slate-500 focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Security Strength:</span>
                      <span className="font-bold text-violet-300">{passStrength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${passStrength.color}`} style={{ width: `${passStrength.score}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs text-white placeholder-slate-500 focus:border-violet-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-500/30 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <span>Authenticating Identity...</span>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Complete Registration'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Cards: 1-Click Judging Profiles (5 Columns) */}
          <div className="lg:col-span-5 glass-panel p-6 sm:p-7 rounded-3xl space-y-5 border border-white/10 bg-[#090b14]/80">
            <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
              <Fingerprint className="w-5 h-5 text-violet-400" />
              <div>
                <h4 className="font-extrabold text-white text-sm">One-Click Judging Profiles</h4>
                <p className="text-[11px] text-slate-400">Instantly switch role persona to evaluate agent</p>
              </div>
            </div>

            <div className="space-y-3">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickDemoLogin(acc)}
                  disabled={isSubmitting}
                  className="w-full p-3.5 rounded-2xl text-left glass-btn hover:border-violet-400/40 border border-white/10 transition-all flex items-center gap-3.5 group cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${acc.badgeColor} flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md`}>
                    {acc.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-white text-xs truncate group-hover:text-violet-300 transition-colors">
                        {acc.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                        {acc.grade}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">{acc.role}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-white/[0.08] text-center">
              <button
                type="button"
                onClick={continueAsGuest}
                className="text-xs text-slate-400 hover:text-violet-300 transition-colors font-medium underline cursor-pointer"
              >
                Or continue exploring in Guest Session
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
