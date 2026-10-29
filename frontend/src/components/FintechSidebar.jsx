import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  CreditCard,
  User,
  KeyRound,
  LogOut
} from 'lucide-react';

export default function FintechSidebar({ 
  activeTab, 
  setActiveTab, 
  collapsed, 
  setCollapsed, 
  currentUser, 
  onUserChange,
  onOpenDemoAccounts 
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'ai_assistant', label: 'AI Assistant', icon: Sparkles, badge: 'AI' },
    { id: 'approvals_audit', label: 'Approvals & Audit', icon: ShieldCheck },
    { id: 'settings', label: 'Policies & Settings', icon: Settings },
  ];

  return (
    <aside 
      className={`bg-white border-r border-slate-200/80 flex flex-col justify-between transition-all duration-300 z-30 flex-shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div className="h-16 flex items-center px-5 border-b border-slate-100 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/20">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                  ExpensePilot
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    SaaS
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Enterprise Finance</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-1">
          <div className={`px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${collapsed ? 'text-center' : ''}`}>
            {collapsed ? '•••' : 'Main Menu'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                {!collapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Profile and Utilities */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        {/* Demo Credentials Quick Trigger */}
        <button
          onClick={onOpenDemoAccounts}
          title="Switch Demo Role & Credentials for Judges"
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 border border-dashed border-slate-200 transition-colors ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <KeyRound className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {!collapsed && <span>Demo Accounts</span>}
        </button>

        {/* Active User Card */}
        <div className={`p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-2.5 ${collapsed ? 'justify-center p-2' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
            {currentUser?.name?.slice(0, 2).toUpperCase() || 'EP'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {currentUser?.name || 'John Doe'}
              </div>
              <div className="text-[10px] text-slate-500 capitalize truncate">
                {currentUser?.role || 'employee'} • {currentUser?.grade || 'L2'}
              </div>
            </div>
          )}
        </div>

        {/* Collapse Sidebar Toggle Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg text-xs transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <div className="flex items-center gap-1.5"><ChevronLeft className="w-4 h-4" /><span>Collapse</span></div>}
        </button>
      </div>
    </aside>
  );
}

