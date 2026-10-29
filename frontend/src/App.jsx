import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginGateway from './components/LoginGateway';
import SpatialCommandDashboard from './components/SpatialCommandDashboard';
import AgentChat from './components/AgentChat';
import FinanceDashboard from './components/FinanceDashboard';
import ClaimsInvoicesView from './components/ClaimsInvoicesView';
import ApprovalsEscalationsView from './components/ApprovalsEscalationsView';
import AuditTrailView from './components/AuditTrailView';
import PoliciesView from './components/PoliciesView';
import Anime3DTheaterView from './components/Anime3DTheaterView';
import { getCurrentUserId, setCurrentUserId, seedEnterpriseDemoData, getAuthToken, loginUser } from './api';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';

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
  // Dual-State Interface: Pre-Auth (Login Gateway) vs Post-Auth (Spatial Dashboard)
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeTab, setActiveTab] = useState('spatial'); // default spatial dashboard view
  const [currentUserId, setUserIdState] = useState(getCurrentUserId());
  const [currentUser, setCurrentUser] = useState(DEMO_USERS_MAP[currentUserId] || DEMO_USERS_MAP.emp_john);
  const [toast, setToast] = useState(null);
  
  // Ambient Mesh Themes: citrus (Orange & Green flagship) | obsidian | emerald | solar
  const [currentTheme, setCurrentTheme] = useState('citrus');

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
    const u = DEMO_USERS_MAP[newUserId] || { id: newUserId, name: newUserId, role: 'employee' };
    setCurrentUser(u);
    showToast(`Switched active session to: ${u.name} (${u.role.toUpperCase()})`);
  };

  const handleLoginSuccess = (userPayload) => {
    if (userPayload?.id) {
      handleUserChange(userPayload.id);
    }
    setIsAuthenticated(true);
    setActiveTab('spatial');
    showToast(`Workspace initialized: Welcome, ${userPayload?.name || 'User'}!`);
  };

  const handleLockSession = () => {
    setIsAuthenticated(false);
    showToast("Session locked. Returning to Glassmorphic Gateway.", "info");
  };

  const handleResetData = async () => {
    try {
      await seedEnterpriseDemoData();
      showToast("Meridian sample data re-seeded successfully!");
      window.location.reload();
    } catch (err) {
      showToast("Failed to re-seed sample data", "error");
    }
  };

  // Ambient mesh gradient background styles
  const themeBgClasses = {
    citrus: 'bg-[#060a08]',
    emerald: 'bg-[#040e09]',
    solar: 'bg-[#120805]',
    obsidian: 'bg-[#07090E]'
  };

  const themeOrbs = {
    citrus: {
      orb1: 'bg-emerald-500/25',
      orb2: 'bg-orange-500/25',
      orb3: 'bg-amber-400/20'
    },
    emerald: {
      orb1: 'bg-emerald-600/20',
      orb2: 'bg-teal-500/20',
      orb3: 'bg-green-500/15'
    },
    solar: {
      orb1: 'bg-orange-600/20',
      orb2: 'bg-amber-500/20',
      orb3: 'bg-rose-600/15'
    },
    obsidian: {
      orb1: 'bg-indigo-600/15',
      orb2: 'bg-cyan-500/15',
      orb3: 'bg-violet-600/15'
    }
  };

  const activeOrbs = themeOrbs[currentTheme] || themeOrbs.citrus;

  return (
    <div className={`min-h-screen ${themeBgClasses[currentTheme] || 'bg-[#07090E]'} text-slate-100 flex flex-col font-sans relative transition-colors duration-700 selection:bg-cyan-500 selection:text-white`}>
      
      {/* Dynamic Ambient Mesh Canvas (Refracting Colors Under Glass) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className={`absolute -top-32 -left-32 w-[600px] h-[600px] ${activeOrbs.orb1} rounded-full blur-[140px] animate-float-1 transition-all duration-1000`} />
        <div className={`absolute top-1/3 -right-40 w-[550px] h-[550px] ${activeOrbs.orb2} rounded-full blur-[160px] animate-float-2 transition-all duration-1000`} />
        <div className={`absolute -bottom-32 left-1/4 w-[650px] h-[650px] ${activeOrbs.orb3} rounded-full blur-[150px] animate-float-3 transition-all duration-1000`} />
      </div>

      {/* Global Interactive Notification Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-bounce">
          <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-2xl border backdrop-blur-xl ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40'
              : toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-300 border-rose-500/40'
              : 'bg-slate-900/90 text-cyan-300 border-cyan-500/40'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-cyan-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          DUAL-STATE INTERFACE SWITCH
          ========================================================================= */}
      {!isAuthenticated ? (
        
        /* -------------------------------------------------------------------------
           VIEW 1: The Glassmorphic Login & Session Gateway (Pre-Auth State)
           ------------------------------------------------------------------------- */
        <main className="flex-1 relative z-10">
          <LoginGateway 
            onLoginSuccess={handleLoginSuccess}
            currentTheme={currentTheme}
            setCurrentTheme={setCurrentTheme}
          />
        </main>

      ) : (

        /* -------------------------------------------------------------------------
           VIEW 2: The Spatial Productivity Command Dashboard (Post-Auth State)
           ------------------------------------------------------------------------- */
        <div className="flex-1 flex flex-col relative z-10">
          
          {/* Global Spatial Navbar */}
          <Navbar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            onUserChange={handleUserChange}
            onResetData={handleResetData}
            onLockSession={handleLockSession}
          />

          {/* Main Content View Container */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            
            {/* Primary Spatial Command Dashboard */}
            {activeTab === 'spatial' && (
              <SpatialCommandDashboard 
                currentUser={currentUser}
                onLockSession={handleLockSession}
                onNavigateTab={setActiveTab}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
              />
            )}

            {/* Autonomous Copilot Agent Chat */}
            {activeTab === 'chat' && (
              <AgentChat currentUser={currentUser} onNavigateTab={setActiveTab} />
            )}

            {/* Executive Finance Dashboard */}
            {activeTab === 'dashboard' && (
              <FinanceDashboard onNavigateTab={setActiveTab} />
            )}

            {/* Claims & Invoices Hub */}
            {activeTab === 'claims_invoices' && (
              <ClaimsInvoicesView currentUser={currentUser} />
            )}

            {/* Approvals & Escalations Matrix */}
            {activeTab === 'approvals_escalations' && (
              <ApprovalsEscalationsView currentUser={currentUser} />
            )}

            {/* Hash-Chained Cryptographic Audit Trail */}
            {activeTab === 'audit' && (
              <AuditTrailView />
            )}

            {/* Corporate Expense & Procurement Policies */}
            {activeTab === 'policies' && (
              <PoliciesView />
            )}

            {/* Interactive 3D Anime & Shinobi Jutsu Engine */}
            {activeTab === 'anime_3d' && (
              <Anime3DTheaterView 
                currentUser={currentUser} 
                onNavigateTab={setActiveTab} 
              />
            )}

          </main>

          {/* Spatial Footer Watermark */}
          <footer className="border-t border-white/10 py-3 text-center text-xs text-slate-400 bg-black/40 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="font-semibold text-white">Expense Pilot</span>
              <span>•</span>
              <span className="text-cyan-400 font-mono">Spatial UI Architecture</span>
              <span>•</span>
              <span className="text-slate-400 font-mono">Meridian DEV-C04</span>
              <span>•</span>
              <button 
                onClick={handleLockSession}
                className="text-slate-400 hover:text-rose-400 flex items-center gap-1 font-mono transition-colors ml-2"
              >
                <Lock className="w-3 h-3" />
                <span>Lock Session</span>
              </button>
            </div>
          </footer>

        </div>
      )}

    </div>
  );
}
