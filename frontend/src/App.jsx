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
import { 
  fetchMonthlySummary, 
  fetchCurrentBudget, 
  fetchForecast, 
  fetchExpenses, 
  fetchAlerts, 
  fetchGoals, 
  seedDemoData 
} from './api';
import { Bot, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
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
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toast, setToast] = useState(null);

  // 3D Background Theme State: 'chakra' (Naruto) | 'cyber' (Anime Pilot) | 'ghibli' (Meadow) | 'none'
  const [bgTheme, setBgTheme] = useState('chakra');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [sumRes, budRes, fcRes, expRes, alRes, gRes] = await Promise.all([
        fetchMonthlySummary("2026-10"),
        fetchCurrentBudget("2026-10"),
        fetchForecast("2026-10"),
        fetchExpenses({ month: "2026-10" }),
        fetchAlerts(false),
        fetchGoals(),
      ]);

      setSummary(sumRes);
      setBudget(budRes);
      setForecast(fcRes);
      setExpenses(expRes);
      setAlerts(alRes);
      setGoals(gRes);
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
    <div className="relative min-h-screen bg-[#060a14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white overflow-hidden">
      
      {/* =====================================================================
          IMMERSIVE 3D BACKGROUND IMAGE & HOLOGRAPHIC AMBIENT LAYER
          ===================================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        
        {/* Active 3D Background Image Layer with Parallax Breathing */}
        {bgTheme === 'chakra' && (
          <div 
            className="absolute inset-0 bg-cover bg-center animate-3d-bg transition-opacity duration-1000 opacity-25 filter blur-[1.5px] brightness-90"
            style={{ backgroundImage: `url('/naruto_chakra_pilot.jpg')` }}
          />
        )}
        {bgTheme === 'cyber' && (
          <div 
            className="absolute inset-0 bg-cover bg-center animate-3d-bg transition-opacity duration-1000 opacity-25 filter blur-[1.5px] brightness-90"
            style={{ backgroundImage: `url('/anime_agent_hud.jpg')` }}
          />
        )}
        {bgTheme === 'ghibli' && (
          <div 
            className="absolute inset-0 bg-cover bg-center animate-3d-bg transition-opacity duration-1000 opacity-30 filter blur-[1px] brightness-95"
            style={{ backgroundImage: `url('/ghibli_peaceful_meadow.jpg')` }}
          />
        )}

        {/* Ambient Dark Vignette & Mesh Depth Gradients to guarantee 100% text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#060a14]/90 via-[#060a14]/75 to-[#060a14]/95 backdrop-blur-[0.5px]" />

        {/* Floating 3D Character Hologram Asset in Bottom-Right Corner */}
        <div className="hidden xl:block absolute -bottom-8 -right-6 w-80 h-80 pointer-events-none opacity-40 animate-3d-character z-0">
          <img 
            src="/src/assets/hero.png" 
            alt="3D Pilot AI" 
            className="w-full h-full object-contain filter drop-shadow-[0_0_35px_rgba(6,182,212,0.5)]" 
          />
        </div>

        {/* Dynamic Glowing Mesh Orbs */}
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-cyan-500/25 to-blue-600/15 blur-[130px] animate-float-1"></div>
        <div className="absolute -top-24 -right-28 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-purple-600/25 to-pink-600/15 blur-[150px] animate-float-2"></div>
        <div className="absolute top-1/3 left-1/3 w-[650px] h-[650px] rounded-full bg-blue-600/15 blur-[160px] animate-float-3"></div>
        <div className="absolute -bottom-36 right-10 w-[550px] h-[550px] rounded-full bg-emerald-500/20 blur-[140px] animate-float-1"></div>
        
        {/* Subtle Cyber Grid Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>
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
          </>
        )}
      </main>

      {/* Floating Action Button for AI Chat */}
      <button
        id="fab-agent-chat"
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-xl shadow-cyan-500/30 hover:scale-105 transition-all group"
      >
        <div className="relative">
          <Bot className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
          </span>
        </div>
        <span>Ask Pilot AI</span>
      </button>

      {/* Floating 3D Background Controller */}
      <div className="fixed bottom-6 left-6 z-40 hidden sm:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-xl shadow-2xl">
        <span className="text-[10px] font-mono font-bold text-slate-400 px-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>3D BG:</span>
        </span>
        <button
          onClick={() => setBgTheme('chakra')}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
            bgTheme === 'chakra' 
              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.6)]' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          🌀 Shinobi
        </button>
        <button
          onClick={() => setBgTheme('cyber')}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
            bgTheme === 'cyber' 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.6)]' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          🤖 Cyber
        </button>
        <button
          onClick={() => setBgTheme('ghibli')}
          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
            bgTheme === 'ghibli' 
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)]' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          🌿 Ghibli
        </button>
        <button
          onClick={() => setBgTheme('none')}
          className={`px-2 py-1 rounded-xl text-[11px] font-bold transition-all ${
            bgTheme === 'none' 
              ? 'bg-slate-700 text-white' 
              : 'text-slate-500 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Minimal Mesh Background"
        >
          Off
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

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>ExpensePilot AI — Autonomous Financial Management Agent • GLA Hackathon Edition</p>
      </footer>

    </div>
  );
}
