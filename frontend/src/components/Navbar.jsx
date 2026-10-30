import React from 'react';
import { 
  Sparkles, 
  PlusCircle, 
  Bell, 
  RotateCcw, 
  LayoutDashboard, 
  Receipt, 
  TrendingUp, 
  Sliders, 
  Target, 
  Bot,
  FileText,
  Smartphone,
  ShieldCheck,
  Database,
  Lock,
  LogOut 
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenAddExpense, 
  onToggleChat, 
  onToggleAlerts, 
  onTogglePhoneAlerts,
  onOpenMongoModal,
  onOpenAuthModal,
  dbStatus,
  unreadAlertCount, 
  onSeedDemo, 
  isSeeding 
}) {
  const { user, signOut, isGuestMode } = useAuth();
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'enterprise', label: 'Enterprise HQ', icon: ShieldCheck },
    { id: 'phone', label: 'Phone Alerts', icon: Smartphone },
    { id: 'invoices', label: 'Invoices & Roadmap', icon: FileText },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'forecast', label: 'Forecast & Anomalies', icon: TrendingUp },
    { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
    { id: 'goals', label: 'Savings Goals', icon: Target },
    { id: 'account', label: 'Login & Account', icon: Lock },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#08090f]/85 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Agent Status with Minimalist Crest */}
          <div className="flex items-center gap-3">
            <Logo size="md" />
          </div>

          {/* Desktop Frosted Glass Navigation Pill */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0e101a]/90 p-1.5 rounded-2xl border border-white/[0.08] backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] overflow-x-auto max-w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_4px_16px_rgba(139,92,246,0.35),inset_0_1px_0_0_rgba(255,255,255,0.25)] border border-violet-400/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Frosted Action Buttons - Generous Spacing */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Supabase User Auth Profile Pill / Login Button */}
            {user && !user.is_guest ? (
              <div 
                onClick={() => setActiveTab('account')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-btn border border-emerald-500/35 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-pointer hover:border-emerald-400"
                title={`Signed in as: ${user.email} (Click to view account)`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline max-w-[100px] truncate">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); signOut(); }}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="btn-open-auth"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-btn text-xs font-bold text-violet-300 hover:text-white border border-violet-500/30 hover:border-violet-400/60 transition-all shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                title="Sign In or Register with Enterprise Vault"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* MongoDB Real-Time Status Pill */}
            <button
              id="btn-mongo-status"
              onClick={onOpenMongoModal}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold glass-btn border transition-all ${
                dbStatus?.connected_to_atlas
                  ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:border-emerald-400'
                  : 'text-violet-300 border-violet-500/40 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:border-violet-400'
              }`}
              title="MongoDB Database Connection & Live Sync"
            >
              <Database className={`w-3.5 h-3.5 ${dbStatus?.connected_to_atlas ? 'text-emerald-400' : 'text-violet-300'}`} />
              <span className="flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full animate-pulse ${
                  dbStatus?.connected_to_atlas ? 'bg-emerald-400' : 'bg-violet-400'
                }`} />
                <span className="hidden sm:inline">
                  {dbStatus?.connected_to_atlas ? 'Atlas Cloud Live' : 'MongoDB Live'}
                </span>
              </span>
            </button>

            {/* Quick Demo Seed */}
            <button
              id="btn-seed-demo"
              onClick={onSeedDemo}
              disabled={isSeeding}
              title="Reset & Load 25+ realistic demo transactions for judging"
              className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold glass-btn text-violet-300 border border-violet-500/30 hover:border-violet-400/60 shadow-sm"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>{isSeeding ? 'Seeding...' : 'Load Demo Data'}</span>
            </button>

            {/* Phone Link & Alerts Button */}
            <button
              id="btn-toggle-phone"
              onClick={onTogglePhoneAlerts}
              className="relative p-3 rounded-2xl glass-btn text-violet-300 hover:text-white border border-violet-500/30 hover:border-violet-400/60 shadow-[0_0_15px_rgba(139,92,246,0.2)] transition-all"
              title="Pair Phone Number & Mobile Alerts (SMS/WhatsApp)"
            >
              <Smartphone className="w-4 h-4" />
            </button>

            {/* Notification Bell with Glass Glow */}
            <button
              id="btn-toggle-alerts"
              onClick={onToggleAlerts}
              className="relative p-3 rounded-2xl glass-btn text-slate-300 hover:text-white border border-white/[0.12] hover:border-white/30 transition-all"
              title="Active Spending Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-[0_0_12px_rgba(244,63,94,0.6)] border border-white/40">
                  {unreadAlertCount}
                </span>
              )}
            </button>

            {/* Add Expense Button - Glassmorphism */}
            <button
              onClick={onOpenAddExpense}
              className="py-2 px-3.5 text-xs font-bold rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Add New Expense"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Add Expense</span>
            </button>

            {/* AI Agent Chat Toggle - Glassmorphism */}
            <button
              onClick={onToggleChat}
              className="py-2 px-3.5 text-xs font-bold rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/25 border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Chat with Pilot AI Agent"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Ask Agent</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-white/[0.08] overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-violet-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
