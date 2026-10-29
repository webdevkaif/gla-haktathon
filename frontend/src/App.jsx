import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AgentChat from './components/AgentChat';
import FinanceDashboard from './components/FinanceDashboard';
import ClaimsInvoicesView from './components/ClaimsInvoicesView';
import ApprovalsEscalationsView from './components/ApprovalsEscalationsView';
import AuditTrailView from './components/AuditTrailView';
import PoliciesView from './components/PoliciesView';
import { getCurrentUserId, setCurrentUserId, fetchUsers, seedEnterpriseDemoData } from './api';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const DEMO_USERS_MAP = {
  emp_john: { id: 'emp_john', name: 'John Doe', role: 'employee', grade: 'L2', dept: 'Sales' },
  ven_acme: { id: 'ven_acme', name: 'Acme Supplies', role: 'vendor', grade: 'Ext', dept: 'Procurement' },
  mgr_sarah: { id: 'mgr_sarah', name: 'Sarah Connor', role: 'manager', grade: 'L4', dept: 'Sales' },
  fin_alex: { id: 'fin_alex', name: 'Alex Morgan', role: 'finance', grade: 'L4', dept: 'Finance' },
};

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); // default hero view
  const [currentUserId, setUserIdState] = useState(getCurrentUserId());
  const [currentUser, setCurrentUser] = useState(DEMO_USERS_MAP[currentUserId] || DEMO_USERS_MAP.emp_john);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUserChange = (newUserId) => {
    setUserIdState(newUserId);
    setCurrentUserId(newUserId);
    const u = DEMO_USERS_MAP[newUserId] || { id: newUserId, name: newUserId, role: 'employee' };
    setCurrentUser(u);
    showToast(`Switched active session to: ${u.name} (${u.role.toUpperCase()})`);
  };

  const handleResetData = async () => {
    try {
      await seedEnterpriseDemoData();
      showToast("Meridian sample data re-seeded successfully!");
      // Trigger refresh by updating state
      window.location.reload();
    } catch (err) {
      showToast("Failed to re-seed sample data", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans">
      
      {/* Global Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onUserChange={handleUserChange}
        onResetData={handleResetData}
      />

      {/* Global Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-bounce">
          <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-2xl border ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/50'
              : 'bg-rose-950/95 text-rose-300 border-rose-500/50'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'chat' && (
          <AgentChat currentUser={currentUser} onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'dashboard' && (
          <FinanceDashboard onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'claims_invoices' && (
          <ClaimsInvoicesView currentUser={currentUser} />
        )}

        {activeTab === 'approvals_escalations' && (
          <ApprovalsEscalationsView currentUser={currentUser} />
        )}

        {activeTab === 'audit' && (
          <AuditTrailView />
        )}

        {activeTab === 'policies' && (
          <PoliciesView />
        )}
      </main>

      {/* Corporate Footer Watermark */}
      <footer className="border-t border-slate-800/80 py-3 text-center text-xs text-slate-400 bg-slate-950/40">
        <div className="flex items-center justify-center gap-2">
          <span>Expense Pilot — Corporate Finance & Procurement Agent</span>
          <span>•</span>
          <span className="font-mono text-teal-400 font-semibold">Hackathon DEV-C04</span>
          <span>•</span>
          <span className="text-amber-400 font-medium">All numbers and policies reflect sample Meridian corporate data</span>
        </div>
      </footer>
    </div>
  );
}
