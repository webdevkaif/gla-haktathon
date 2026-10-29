import React, { useState, useEffect } from 'react';
import FintechSidebar from './components/FintechSidebar';
import FintechHeader from './components/FintechHeader';
import FintechDashboard from './components/FintechDashboard';
import FintechTransactions from './components/FintechTransactions';
import FintechAnalytics from './components/FintechAnalytics';
import FintechAIAssistant from './components/FintechAIAssistant';
import FintechApprovalsAudit from './components/FintechApprovalsAudit';
import FintechSettings from './components/FintechSettings';
import AddExpenseModal from './components/AddExpenseModal';
import LoginModal from './components/LoginModal';
import { 
  getCurrentUserId, 
  setCurrentUserId, 
  seedEnterpriseDemoData, 
  getAuthToken, 
  loginUser 
} from './api';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const DEMO_USERS_MAP = {
  emp_john: { id: 'emp_john', name: 'John Doe', role: 'employee', grade: 'L2', dept: 'Sales' },
  emp_alice: { id: 'emp_alice', name: 'Alice Smith', role: 'employee', grade: 'L3', dept: 'Product' },
  ven_acme: { id: 'ven_acme', name: 'Acme Supplies', role: 'vendor', grade: 'Ext', dept: 'Procurement' },
  ven_techcorp: { id: 'ven_techcorp', name: 'TechCorp Solutions', role: 'vendor', grade: 'Ext', dept: 'IT Hardware' },
  mgr_sarah: { id: 'mgr_sarah', name: 'Sarah Connor', role: 'manager', grade: 'L4', dept: 'Sales' },
  fin_alex: { id: 'fin_alex', name: 'Alex Morgan', role: 'finance', grade: 'L5', dept: 'Finance' },
  admin_rachel: { id: 'admin_rachel', name: 'Rachel Green', role: 'admin', grade: 'L5', dept: 'Executive' },
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'transactions' | 'analytics' | 'ai_assistant' | 'approvals_audit' | 'settings'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUserId, setUserIdState] = useState(getCurrentUserId());
  const [currentUser, setCurrentUser] = useState(DEMO_USERS_MAP[currentUserId] || DEMO_USERS_MAP.emp_john);
  const [dateRange, setDateRange] = useState('this_month');
  
  // Modals & Notifications
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Auto-acquire JWT token on initial load
  useEffect(() => {
    if (!getAuthToken()) {
      loginUser(currentUserId, 'password123').catch((err) => {
        console.log("Initial auto-login notice:", err);
      });
    }
  }, [currentUserId]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleUserChange = (newUserId) => {
    setUserIdState(newUserId);
    setCurrentUserId(newUserId);
    const u = DEMO_USERS_MAP[newUserId] || { id: newUserId, name: newUserId, role: 'employee', grade: 'L2' };
    setCurrentUser(u);
    showToast(`Switched active session to: ${u.name} (${u.role.toUpperCase()})`);
  };

  const handleLoginSuccess = (userPayload) => {
    if (userPayload?.id) {
      handleUserChange(userPayload.id);
    }
    showToast(`Welcome back, ${userPayload?.name || 'User'}!`);
  };

  const handleAddExpenseSuccess = (claim) => {
    showToast(`Expense claim ${claim.claim_no || 'submitted'} created successfully!`);
  };

  const handleResetData = async () => {
    try {
      await seedEnterpriseDemoData();
      showToast("Meridian sample data re-seeded successfully!");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      showToast("Failed to re-seed sample data", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex antialiased">
      
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. SLIM COLLAPSIBLE SIDEBAR
          ───────────────────────────────────────────────────────────────────────────── */}
      <FintechSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        currentUser={currentUser}
        onUserChange={handleUserChange}
        onOpenDemoAccounts={() => setIsLoginModalOpen(true)}
      />

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. MAIN CONTENT AREA (Header + Active View)
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        
        {/* Clean Fintech Top Header */}
        <FintechHeader
          activeTab={activeTab}
          currentUser={currentUser}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          onOpenDemoAccounts={() => setIsLoginModalOpen(true)}
          onResetData={handleResetData}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />

        {/* View Content Router */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <FintechDashboard 
              onNavigateTab={setActiveTab} 
              onOpenAddExpense={() => setIsAddExpenseOpen(true)} 
            />
          )}

          {activeTab === 'transactions' && (
            <FintechTransactions 
              onOpenAddExpense={() => setIsAddExpenseOpen(true)} 
              currentUser={currentUser} 
            />
          )}

          {activeTab === 'analytics' && (
            <FintechAnalytics />
          )}

          {activeTab === 'ai_assistant' && (
            <FintechAIAssistant 
              currentUser={currentUser} 
            />
          )}

          {activeTab === 'approvals_audit' && (
            <FintechApprovalsAudit 
              currentUser={currentUser} 
            />
          )}

          {activeTab === 'settings' && (
            <FintechSettings 
              currentUser={currentUser} 
              onUserChange={handleUserChange} 
              onResetData={handleResetData} 
            />
          )}
        </main>

        {/* Minimal Footer */}
        <footer className="h-10 border-t border-slate-200/80 px-6 flex items-center justify-between text-xs text-slate-500 bg-white">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">ExpensePilot</span>
            <span>•</span>
            <span>Enterprise Fintech Suite</span>
            <span>•</span>
            <span className="font-mono text-emerald-600">v2.6 Live</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Meridian DEV-C04
          </div>
        </footer>

      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. MODALS & TOASTS
          ───────────────────────────────────────────────────────────────────────────── */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSuccess={handleAddExpenseSuccess}
        currentUser={currentUser}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUserId={currentUserId}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xl border bg-white ${
            toast.type === 'success' ? 'border-emerald-200 text-emerald-800' : 'border-rose-200 text-rose-800'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
