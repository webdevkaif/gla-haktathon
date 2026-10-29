import React, { useState } from 'react';
import { 
  Bot, 
  BarChart3, 
  FileText, 
  CheckSquare, 
  ShieldCheck, 
  BookOpen, 
  User, 
  RotateCcw,
  Sparkles,
  Building2,
  KeyRound,
  Compass,
  LogOut
} from 'lucide-react';
import { getCurrentUserId, setCurrentUserId, loginUser } from '../api';
import LoginModal from './LoginModal';

const DEMO_USERS = [
  { id: 'emp_john', name: 'John Doe', email: 'john.doe@meridian.com', role: 'Employee', grade: 'L2', dept: 'Sales', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'emp_alice', name: 'Alice Smith', email: 'alice.smith@meridian.com', role: 'Employee', grade: 'L3', dept: 'Product', badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { id: 'ven_acme', name: 'Acme Supplies', email: 'billing@acmesupplies.com', role: 'Vendor', grade: 'Ext', dept: 'Procurement', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'ven_techcorp', name: 'TechCorp Solutions', email: 'orders@techcorp.com', role: 'Vendor', grade: 'Ext', dept: 'IT Hardware', badge: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
  { id: 'mgr_sarah', name: 'Sarah Connor', email: 'sarah.connor@meridian.com', role: 'Manager', grade: 'L4', dept: 'Sales', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'fin_alex', name: 'Alex Morgan', email: 'finance@meridian.com', role: 'Finance Controller', grade: 'L5', dept: 'Finance', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'admin_rachel', name: 'Rachel Green', email: 'admin@meridian.com', role: 'Admin', grade: 'L5', dept: 'Executive', badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
];

export default function Navbar({ activeTab, setActiveTab, onUserChange, onResetData, onLockSession }) {
  const [selectedUserId, setSelectedUserId] = useState(getCurrentUserId());
  const [isSeeding, setIsSeeding] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleRoleSelect = async (e) => {
    const newId = e.target.value;
    setSelectedUserId(newId);
    setCurrentUserId(newId);
    
    // Automatically acquire JWT token for the selected demo account
    const userObj = DEMO_USERS.find(u => u.id === newId);
    if (userObj) {
      try {
        await loginUser(userObj.email, 'password123');
      } catch (err) {
        console.log("Auto-login token notice:", err);
      }
    }

    if (onUserChange) onUserChange(newId);
  };

  const handleLoginSuccess = (user) => {
    if (user?.id) {
      setSelectedUserId(user.id);
      setCurrentUserId(user.id);
      if (onUserChange) onUserChange(user.id);
    }
  };

  const handleReset = async () => {
    if (window.confirm("Reset and re-seed Meridian sample corporate data?")) {
      setIsSeeding(true);
      try {
        if (onResetData) await onResetData();
      } finally {
        setIsSeeding(false);
      }
    }
  };

  const currentUser = DEMO_USERS.find(u => u.id === selectedUserId) || DEMO_USERS[0];

  const navItems = [
    { 
      id: 'spatial', 
      label: 'Spatial OS', 
      icon: Compass,
      activeClass: 'bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-orange-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
      activeIcon: 'text-emerald-400',
      hoverClass: 'hover:text-emerald-300 hover:bg-emerald-500/10'
    },
    { 
      id: 'chat', 
      label: 'Agent Chat', 
      icon: Bot,
      activeClass: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
      activeIcon: 'text-emerald-400',
      hoverClass: 'hover:text-emerald-300 hover:bg-emerald-500/10'
    },
    { 
      id: 'dashboard', 
      label: 'Finance Dashboard', 
      icon: BarChart3,
      activeClass: 'bg-orange-500/20 border-orange-500/50 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.25)]',
      activeIcon: 'text-orange-400',
      hoverClass: 'hover:text-orange-300 hover:bg-orange-500/10'
    },
    { 
      id: 'claims_invoices', 
      label: 'Claims & Invoices', 
      icon: FileText,
      activeClass: 'bg-teal-500/20 border-teal-500/50 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.25)]',
      activeIcon: 'text-teal-400',
      hoverClass: 'hover:text-teal-300 hover:bg-teal-500/10'
    },
    { 
      id: 'approvals_escalations', 
      label: 'Approvals & Escalations', 
      icon: CheckSquare,
      activeClass: 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
      activeIcon: 'text-amber-400',
      hoverClass: 'hover:text-amber-300 hover:bg-amber-500/10'
    },
    { 
      id: 'audit', 
      label: 'Audit Trail', 
      icon: ShieldCheck,
      activeClass: 'bg-green-500/20 border-green-500/50 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.25)]',
      activeIcon: 'text-green-400',
      hoverClass: 'hover:text-green-300 hover:bg-green-500/10'
    },
    { 
      id: 'policies', 
      label: 'Policies', 
      icon: BookOpen,
      activeClass: 'bg-orange-600/20 border-orange-500/50 text-orange-200 shadow-[0_0_15px_rgba(234,88,12,0.25)]',
      activeIcon: 'text-orange-400',
      hoverClass: 'hover:text-orange-300 hover:bg-orange-500/10'
    },
    { 
      id: 'anime_3d', 
      label: '3D Shinobi & HUD', 
      icon: Sparkles,
      activeClass: 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-rose-500/20 border-orange-500/50 text-orange-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
      activeIcon: 'text-amber-400',
      hoverClass: 'hover:text-orange-300 hover:bg-orange-500/10'
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#070b09]/95 backdrop-blur-md border-b border-emerald-950/80 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-orange-500/25 border border-white/20">
              <Building2 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white">Expense Pilot</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/40">
                  DEV-C04
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/40 animate-pulse">
                  SAMPLE DATA
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Expense & Invoice Query Agent — Meridian Finance & Procurement
              </p>
            </div>
          </div>

          {/* Right Actions: Demo Accounts / Login & Role Switcher */}
          <div className="flex items-center gap-3">
            
            {/* Quick Demo Accounts Modal Trigger */}
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-500/15 to-orange-500/15 hover:from-emerald-500/25 hover:to-orange-500/25 border border-emerald-500/40 text-emerald-300 hover:text-white transition-all shadow-sm"
              title="Open Demo Accounts and Credentials for Hackathon Judges"
            >
              <KeyRound className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Demo Accounts</span>
            </button>

            {/* Quick Role Switcher */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-sm">
              <User className="w-4 h-4 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 leading-none">Active User</span>
                <select
                  value={selectedUserId}
                  onChange={handleRoleSelect}
                  aria-label="Active Demo Role"
                  className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  {DEMO_USERS.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                      {u.name} ({u.role} - {u.dept})
                    </option>
                  ))}
                </select>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ml-1 hidden md:inline-block ${currentUser.badge}`}>
                {currentUser.role}
              </span>
            </div>

            {/* Reset Seed Button */}
            <button
              onClick={handleReset}
              disabled={isSeeding}
              title="Reset sample enterprise data"
              className="p-2 text-slate-400 hover:text-orange-400 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
            >
              <RotateCcw className={`w-4 h-4 ${isSeeding ? 'animate-spin text-orange-400' : ''}`} />
            </button>

            {/* Lock Session & Return to Gateway */}
            {onLockSession && (
              <button
                onClick={onLockSession}
                title="Lock Session and return to Glassmorphic Gateway"
                className="p-2 text-orange-400 hover:text-orange-200 hover:bg-orange-500/20 rounded-lg border border-orange-500/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 sm:space-x-2 border-t border-slate-800/80 pt-2 pb-2 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                  isActive
                    ? `${item.activeClass} font-semibold`
                    : `text-slate-400 ${item.hoverClass} border-transparent`
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? item.activeIcon : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Demo Accounts Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUserId={selectedUserId}
      />
    </header>
  );
}
