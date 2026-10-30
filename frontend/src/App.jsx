import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import DashboardOverview from './components/DashboardOverview';
import ExpenseList from './components/ExpenseList';
import ForecastingCard from './components/ForecastingCard';
import WhatIfSimulator from './components/WhatIfSimulator';
import SavingsGoalPlanner from './components/SavingsGoalPlanner';
import AddExpenseModal from './components/AddExpenseModal';
import AgentChat from './components/AgentChat';
import AnomalyAlerts from './components/AnomalyAlerts';
import BudgetManager from './components/BudgetManager';
import InvoicesRoadmapView from './components/InvoicesRoadmapView';
import PhoneAlertsModal from './components/PhoneAlertsModal';
import PhoneAlertsView from './components/PhoneAlertsView';
import HackathonDifferentiatorsView from './components/HackathonDifferentiatorsView';
import MongoConnectionModal from './components/MongoConnectionModal';
import AuthModal from './components/AuthModal';
import AccountLoginSection from './components/AccountLoginSection';
import { AuthProvider, useAuth } from './context/AuthContext';
import { 
  fetchMonthlySummary, 
  fetchCurrentBudget, 
  fetchForecast, 
  fetchExpenses, 
  fetchAlerts, 
  fetchGoals, 
  fetchDatabaseStatus,
  seedDemoData 
} from './api';
import { Bot, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

function AppContent() {
  const { user, isGuestMode, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // App data state
  const [summary, setSummary] = useState(null);
  const [budget, setBudget] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Drawers
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState('');
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isMongoModalOpen, setIsMongoModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toast, setToast] = useState(null);

  const handleOpenChatWithMessage = (msg) => {
    setChatInitialPrompt(msg);
    setIsChatOpen(true);
  };

  // Glassmorphism Ambient Theme: 'lavender' | 'pearl' | 'minimal'
  const [bgTheme, setBgTheme] = useState('lavender');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [sumRes, budRes, fcRes, expRes, alRes, gRes, dbRes] = await Promise.all([
        fetchMonthlySummary("2026-10"),
        fetchCurrentBudget("2026-10"),
        fetchForecast("2026-10"),
        fetchExpenses({ month: "2026-10" }),
        fetchAlerts(false),
        fetchGoals(),
        fetchDatabaseStatus().catch(() => null),
      ]);

      setSummary(sumRes);
      setBudget(budRes);
      setForecast(fcRes);
      setExpenses(expRes);
      setAlerts(alRes);
      setGoals(gRes);
      if (dbRes) setDbStatus(dbRes);
    } catch (err) {
      console.error("Error loading application data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      await seedDemoData();
      await loadAllData();
      showToast("Demo data loaded with 25+ realistic transactions, budget, goals, and anomalies!");
    } catch (err) {
      showToast("Failed to seed demo data", "error");
    } finally {
      setIsSeeding(false);
    }
  };

  const unreadAlerts = alerts.filter(a => !a.is_read);

  return (
    <div className="relative min-h-screen bg-[#090a18] text-slate-100 flex flex-col selection:bg-purple-500/40 selection:text-white overflow-hidden">
      
      {/* =====================================================================
          EXECUTIVE GLASSMORPHISM AMBIENT BACKDROP (LAVENDER & WHITE MINIMALIST)
          ===================================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        
        {/* Dynamic Glassmorphism Mesh Gradients */}
        {bgTheme === 'lavender' && (
          <>
            <div className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-purple-500/25 via-violet-500/15 to-transparent blur-[130px]" />
            <div className="absolute -top-24 -right-28 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-indigo-500/20 via-purple-600/15 to-transparent blur-[140px]" />
            <div className="absolute -bottom-36 right-10 w-[600px] h-[600px] rounded-full bg-fuchsia-500/15 blur-[140px]" />
            <div className="absolute top-1/2 left-1/3 w-[450px] h-[450px] rounded-full bg-purple-400/10 blur-[150px]" />
          </>
        )}

        {bgTheme === 'pearl' && (
          <>
            <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-white/20 via-purple-200/15 to-transparent blur-[120px]" />
            <div className="absolute -top-24 -right-28 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-violet-200/15 via-slate-100/10 to-transparent blur-[140px]" />
            <div className="absolute -bottom-36 right-10 w-[600px] h-[600px] rounded-full bg-white/10 blur-[130px]" />
          </>
        )}

        {bgTheme === 'minimal' && (
          <>
            <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-purple-900/15 blur-[150px]" />
            <div className="absolute -bottom-36 right-10 w-[500px] h-[500px] rounded-full bg-slate-800/20 blur-[150px]" />
          </>
        )}

        {/* Ambient Dark Frosted Vignette for 100% Contrast & Crisp Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#090a18]/90 via-[#090a18]/80 to-[#090a18]/95 backdrop-blur-[1px]" />
        
        {/* Subtle Frosted Grid Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(216,180,254,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl glass-panel-deep border border-cyan-500/50 text-slate-100 shadow-2xl animate-fade-in">
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        onToggleChat={() => setIsChatOpen(prev => !prev)}
        onToggleAlerts={() => setIsAlertsOpen(prev => !prev)}
        onTogglePhoneAlerts={() => setIsPhoneModalOpen(prev => !prev)}
        onOpenMongoModal={() => setIsMongoModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        dbStatus={dbStatus}
        unreadAlertCount={unreadAlerts.length}
        onSeedDemo={handleSeedDemo}
        isSeeding={isSeeding}
      />

      {/* Main Content View Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-400">Initializing ExpensePilot Autonomous Agent...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardOverview
                summary={summary}
                budget={budget}
                forecast={forecast}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenAddExpense={() => setIsAddExpenseOpen(true)}
                onToggleChat={() => setIsChatOpen(true)}
                onTogglePhoneAlerts={() => setIsPhoneModalOpen(true)}
              />
            )}

            {activeTab === 'enterprise' && (
              <HackathonDifferentiatorsView
                onOpenChatWithMessage={handleOpenChatWithMessage}
              />
            )}

            {activeTab === 'phone' && (
              <PhoneAlertsView
                onToggleChat={() => setIsChatOpen(true)}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoicesRoadmapView
                onToggleChat={() => setIsChatOpen(true)}
              />
            )}

            {activeTab === 'transactions' && (
              <ExpenseList
                expenses={expenses}
                onExpenseMutated={loadAllData}
                onOpenAddModal={() => setIsAddExpenseOpen(true)}
              />
            )}

            {activeTab === 'forecast' && (
              <ForecastingCard
                forecast={forecast}
                expenses={expenses}
                onExpenseUpdated={loadAllData}
              />
            )}

            {activeTab === 'simulator' && (
              <WhatIfSimulator
                summary={summary}
              />
            )}

            {activeTab === 'goals' && (
              <SavingsGoalPlanner
                goals={goals}
                onGoalsMutated={loadAllData}
              />
            )}

            {activeTab === 'account' && (
              <AccountLoginSection
                onLoginSuccess={() => setActiveTab('dashboard')}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Action Button for AI Chat */}
      <button
        id="fab-agent-chat"
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-purple-500/25 hover:scale-105 transition-all group"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-purple-200" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-400"></span>
          </span>
        </div>
        <span>Ask Pilot AI</span>
      </button>

      {/* Executive Ambient Theme Controller */}
      <div className="fixed bottom-6 left-6 z-40 hidden sm:flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-[#0b0d18]/90 border border-white/[0.08] backdrop-blur-2xl shadow-2xl">
        <span className="text-xs font-semibold text-slate-400 px-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Theme:</span>
        </span>
        <button
          onClick={() => setBgTheme('lavender')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            bgTheme === 'lavender' 
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 border border-violet-400/30' 
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          Obsidian Violet
        </button>
        <button
          onClick={() => setBgTheme('pearl')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            bgTheme === 'pearl' 
              ? 'bg-gradient-to-r from-slate-200 to-slate-100 text-slate-950 shadow-md shadow-white/20 border border-white/40' 
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          Platinum Light
        </button>
        <button
          onClick={() => setBgTheme('minimal')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            bgTheme === 'minimal' 
              ? 'bg-slate-800 text-white border border-white/20' 
              : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Minimal Slate"
        >
          Pure Slate
        </button>
      </div>

      {/* Modals & Slide-out Drawers */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onExpenseAdded={loadAllData}
      />

      <AgentChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onDataMutated={loadAllData}
        initialMessage={chatInitialPrompt}
      />

      <AnomalyAlerts
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onAlertsMutated={loadAllData}
      />

      <BudgetManager
        budget={budget}
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onBudgetUpdated={loadAllData}
      />

      <PhoneAlertsModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
      />

      <MongoConnectionModal
        isOpen={isMongoModalOpen}
        onClose={() => setIsMongoModalOpen(false)}
        onDataMutated={loadAllData}
      />

      {/* Supabase Authentication & Route Protection Modal */}
      <AuthModal
        isOpen={isAuthModalOpen || (!authLoading && !user && !isGuestMode)}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>ExpensePilot AI — Autonomous Financial Management Agent • GLA Hackathon Edition</p>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
