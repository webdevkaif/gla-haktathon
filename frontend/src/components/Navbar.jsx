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
  Database 
} from 'lucide-react';

import GhibliButton from './GhibliButton';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenAddExpense, 
  onToggleChat, 
  onToggleAlerts, 
  onTogglePhoneAlerts,
  onOpenMongoModal,
  dbStatus,
  unreadAlertCount, 
  onSeedDemo, 
  isSeeding 
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'enterprise', label: 'Enterprise HQ', icon: ShieldCheck },
    { id: 'phone', label: 'Phone Alerts', icon: Smartphone },
    { id: 'invoices', label: 'Invoices & Roadmap', icon: FileText },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'forecast', label: 'Forecast & Anomalies', icon: TrendingUp },
    { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
    { id: 'goals', label: 'Savings Goals', icon: Target },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel-deep border-b border-white/[0.08] bg-[#070d1d]/75 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Agent Status with Frosted Glow */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/90 to-blue-600/90 shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-white/30 backdrop-blur-xl">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-950"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent drop-shadow-sm">
                  ExpensePilot AI
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  Autonomous
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Observe → Analyze → Decide → Act</p>
            </div>
          </div>

          {/* Desktop Frosted Glass Navigation Pill */}
          <nav className="hidden md:flex items-center gap-2 bg-white/[0.04] p-2 px-3 rounded-2xl border border-white/[0.12] backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/90 to-blue-600/90 text-white shadow-[0_4px_16px_rgba(6,182,212,0.35),inset_0_1px_0_0_rgba(255,255,255,0.4)] border border-cyan-300/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.08]'
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
            {/* MongoDB Real-Time Status Pill */}
            <button
              id="btn-mongo-status"
              onClick={onOpenMongoModal}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold glass-btn border transition-all ${
                dbStatus?.connected_to_atlas
                  ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:border-emerald-400'
                  : 'text-amber-300 border-amber-500/40 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:border-amber-400'
              }`}
              title="MongoDB Atlas Cloud Database Connection & Live Sync"
            >
              <Database className="w-3.5 h-3.5" />
              <span className="flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  dbStatus?.connected_to_atlas ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`} />
                <span className="hidden sm:inline">
                  {dbStatus?.connected_to_atlas ? 'Atlas Live' : 'Connect Mongo'}
                </span>
              </span>
            </button>

            {/* Quick Demo Seed */}
            <button
              id="btn-seed-demo"
              onClick={onSeedDemo}
              disabled={isSeeding}
              title="Reset & Load 25+ realistic demo transactions for judging"
              className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold glass-btn text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 shadow-sm"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>{isSeeding ? 'Seeding...' : 'Load Demo Data'}</span>
            </button>

            {/* Phone Link & Alerts Button */}
            <button
              id="btn-toggle-phone"
              onClick={onTogglePhoneAlerts}
              className="relative p-3 rounded-2xl glass-btn text-cyan-300 hover:text-white border border-cyan-500/35 hover:border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all"
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

            {/* Add Expense Button (Studio Ghibli Animated Button) */}
            <GhibliButton
              onClick={onOpenAddExpense}
              variant="forest"
              icon={PlusCircle}
              showSprite={true}
              spritePosition="right"
              className="py-2.5 px-4 text-xs font-bold rounded-2xl shadow-md"
              title="Add New Expense (Studio Ghibli Animated)"
            >
              <span className="hidden sm:inline">Add Expense</span>
            </GhibliButton>

            {/* AI Agent Chat Toggle (Studio Ghibli Animated Button) */}
            <GhibliButton
              onClick={onToggleChat}
              variant="sky"
              icon={Bot}
              showSprite={true}
              spritePosition="right"
              className="py-2.5 px-4 text-xs font-bold rounded-2xl shadow-md"
              title="Chat with Pilot AI Agent"
            >
              <span className="hidden sm:inline">Ask Agent</span>
            </GhibliButton>
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
                  isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
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
