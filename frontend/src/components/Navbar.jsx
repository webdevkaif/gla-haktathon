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
  Building2
} from 'lucide-react';
import { getCurrentUserId, setCurrentUserId } from '../api';

const DEMO_USERS = [
  { id: 'emp_john', name: 'John Doe', role: 'Employee', grade: 'L2', dept: 'Sales', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { id: 'ven_acme', name: 'Acme Supplies', role: 'Vendor', grade: 'Ext', dept: 'Procurement', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'mgr_sarah', name: 'Sarah Connor', role: 'Manager', grade: 'L4', dept: 'Sales', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { id: 'fin_alex', name: 'Alex Morgan', role: 'Finance Controller', grade: 'L4', dept: 'Finance', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
];

export default function Navbar({ activeTab, setActiveTab, onUserChange, onResetData }) {
  const [selectedUserId, setSelectedUserId] = useState(getCurrentUserId());
  const [isSeeding, setIsSeeding] = useState(false);

  const handleRoleSelect = (e) => {
    const newId = e.target.value;
    setSelectedUserId(newId);
    setCurrentUserId(newId);
    if (onUserChange) onUserChange(newId);
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
    { id: 'chat', label: 'Agent Chat', icon: Bot },
    { id: 'dashboard', label: 'Finance Dashboard', icon: BarChart3 },
    { id: 'claims_invoices', label: 'Claims & Invoices', icon: FileText },
    { id: 'approvals_escalations', label: 'Approvals & Escalations', icon: CheckSquare },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
    { id: 'policies', label: 'Policies', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-700/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-teal-500/20">
              <Building2 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white">Expense Pilot</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  DEV-C04
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                  SAMPLE DATA
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Expense & Invoice Query Agent — Meridian Finance & Procurement
              </p>
            </div>
          </div>

          {/* Right Actions: Role Switcher & Reset */}
          <div className="flex items-center gap-3">
            
            {/* Role Switcher */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 shadow-sm">
              <User className="w-4 h-4 text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 leading-none">Active Role</span>
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
              className="p-2 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
            >
              <RotateCcw className={`w-4 h-4 ${isSeeding ? 'animate-spin text-teal-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/60 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500/20 to-sky-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
