import React, { useState } from 'react';
import { 
  BookOpen, 
  User, 
  RotateCcw, 
  CheckCircle2, 
  DollarSign, 
  ShieldCheck, 
  Database,
  Cpu,
  KeyRound
} from 'lucide-react';
import { seedEnterpriseDemoData } from '../api';

const DEMO_USERS = [
  { id: 'emp_john', name: 'John Doe', role: 'Employee', grade: 'L2', dept: 'Sales', email: 'john.doe@meridian.com' },
  { id: 'emp_alice', name: 'Alice Smith', role: 'Employee', grade: 'L3', dept: 'Product', email: 'alice.smith@meridian.com' },
  { id: 'mgr_sarah', name: 'Sarah Connor', role: 'Manager', grade: 'L4', dept: 'Sales', email: 'sarah.connor@meridian.com' },
  { id: 'fin_alex', name: 'Alex Morgan', role: 'Finance Controller', grade: 'L5', dept: 'Finance', email: 'finance@meridian.com' },
  { id: 'ven_acme', name: 'Acme Supplies', role: 'Vendor Partner', grade: 'Ext', dept: 'Procurement', email: 'billing@acmesupplies.com' },
  { id: 'admin_rachel', name: 'Rachel Green', role: 'Executive Admin', grade: 'L5', dept: 'Executive', email: 'admin@meridian.com' }
];

const GRADE_CAPS = [
  { category: 'Meals & Dining', l1: '₹500', l2: '₹800', l3: '₹1,200', l4: '₹2,000', l5: '₹3,500' },
  { category: 'Local & Flight Travel', l1: '₹1,500', l2: '₹3,500', l3: '₹6,000', l4: '₹12,000', l5: 'Actuals' },
  { category: 'Hotel Accommodation', l1: '₹2,000', l2: '₹3,500', l3: '₹5,500', l4: '₹9,500', l5: 'Actuals' },
  { category: 'Office Hardware', l1: '₹5,000', l2: '₹15,000', l3: '₹30,000', l4: '₹60,000', l5: '₹1,50,000' },
];

export default function FintechSettings({ currentUser, onUserChange, onResetData }) {
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);

  const handleReset = async () => {
    if (window.confirm("Re-seed Meridian enterprise sample ledger?")) {
      setSeeding(true);
      try {
        await seedEnterpriseDemoData();
        setToast("Sample corporate database successfully re-seeded!");
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setToast("Failed to re-seed demo data.");
      } finally {
        setSeeding(false);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      
      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{toast}</span>
        </div>
      )}

      {/* Corporate Policy Limits Table */}
      <div className="fintech-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Meridian Corporate Expense Policy 2026</h2>
            <p className="text-xs text-slate-500">Official per-diem caps and limits enforced by deterministic rules</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Expense Category</th>
                <th className="py-2.5 px-3 font-mono">Grade L1</th>
                <th className="py-2.5 px-3 font-mono">Grade L2</th>
                <th className="py-2.5 px-3 font-mono">Grade L3</th>
                <th className="py-2.5 px-3 font-mono">Grade L4</th>
                <th className="py-2.5 px-3 font-mono">Grade L5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {GRADE_CAPS.map((g, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-sans font-semibold text-slate-900">{g.category}</td>
                  <td className="py-3 px-3 text-slate-600">{g.l1}</td>
                  <td className="py-3 px-3 text-emerald-700 font-bold">{g.l2}</td>
                  <td className="py-3 px-3 text-slate-600">{g.l3}</td>
                  <td className="py-3 px-3 text-slate-600">{g.l4}</td>
                  <td className="py-3 px-3 text-slate-900 font-semibold">{g.l5}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Switch Demo Role Accounts Grid */}
      <div className="fintech-card p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Demo User Persona Switcher</h2>
          <p className="text-xs text-slate-500">Switch user context to verify role-based permissions and scoped data access</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DEMO_USERS.map((user) => {
            const isCurrent = currentUser?.id === user.id;
            return (
              <div 
                key={user.id}
                onClick={() => onUserChange && onUserChange(user.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isCurrent 
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>{user.name}</span>
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {user.role} • {user.dept} ({user.grade})
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">{user.email}</div>
                </div>

                <button
                  type="button"
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isCurrent ? 'Active' : 'Switch'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Architecture & Seed Reset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Core System Integrations */}
        <div className="fintech-card p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">System Core & Integrations</h3>
          
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Database Layer</span>
              <span className="font-semibold text-slate-900">MongoDB Atlas (Live)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Primary AI Model</span>
              <span className="font-semibold text-emerald-700">Google Gemini 1.5 Flash</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Fallback LLM Inference</span>
              <span className="font-semibold text-slate-900">Groq gpt-oss-120b</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-slate-600 font-medium">Intelligent OCR</span>
              <span className="font-semibold text-slate-900">Mindee V2 IDP Engine</span>
            </div>
          </div>
        </div>

        {/* Database Management & Reset */}
        <div className="fintech-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Reset Demo Ledger</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Resets all test reimbursement claims, vendor invoices, duplicate records, and the SHA-256 hash-chained audit log back to the initial Meridian demo state.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={handleReset}
              disabled={seeding}
              className="w-full fintech-btn-secondary py-2.5 text-xs font-semibold flex items-center justify-center gap-2 text-rose-700 hover:text-rose-800 hover:bg-rose-50 hover:border-rose-200"
            >
              <RotateCcw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
              <span>{seeding ? 'Re-seeding Ledger...' : 'Reset Demo Records'}</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
