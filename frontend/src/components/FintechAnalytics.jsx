import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Copy, 
  PieChart as PieIcon,
  BarChart3,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar 
} from 'recharts';
import { fetchDashboardSummary } from '../api';

const VELOCITY_DATA = [
  { day: 'Day 1', spend: 12000, cumulative: 12000 },
  { day: 'Day 5', spend: 34000, cumulative: 46000 },
  { day: 'Day 10', spend: 28000, cumulative: 74000 },
  { day: 'Day 15', spend: 45000, cumulative: 119000 },
  { day: 'Day 20', spend: 31000, cumulative: 150000 },
  { day: 'Day 25', spend: 22000, cumulative: 172000 },
  { day: 'Day 30', spend: 15000, cumulative: 187000 },
];

const DEPT_SPEND = [
  { dept: 'Sales', amount: 84000, budget: 120000, color: '#10B981' },
  { dept: 'Product & Eng', amount: 96000, budget: 140000, color: '#06B6D4' },
  { dept: 'Procurement', amount: 62000, budget: 90000, color: '#8B5CF6' },
  { dept: 'Operations', amount: 38000, budget: 60000, color: '#F59E0B' },
  { dept: 'Executive', amount: 24000, budget: 50000, color: '#3B82F6' },
];

export default function FintechAnalytics() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchDashboardSummary();
        setDashboardData(res);
      } catch (e) {
        console.error("Analytics load error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const duplicates = dashboardData?.flagged_duplicates || [];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      
      {/* 4 Analytics Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="fintech-card p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase">Budget Utilization</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">68.2%</div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full w-[68%]" />
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block font-medium">₹187k of ₹274k allocated</span>
        </div>

        <div className="fintech-card p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase">Policy Compliance</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1 font-mono">98.4%</div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-emerald-600 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Zero hard cap breaches</span>
          </div>
        </div>

        <div className="fintech-card p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase">Duplicate Prevention</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">₹15,400</div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-amber-600 font-medium">
            <Copy className="w-4 h-4" />
            <span>1 Duplicate invoice auto-frozen</span>
          </div>
        </div>

        <div className="fintech-card p-5">
          <span className="text-xs font-semibold text-slate-500 uppercase">Approval SLA Avg</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">1.4 Days</div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-emerald-600 font-medium">
            <Clock className="w-4 h-4" />
            <span>Beating 48-hour SLA target</span>
          </div>
        </div>

      </div>

      {/* Burn Rate / Spend Velocity Spline */}
      <div className="fintech-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Cumulative Monthly Burn Velocity</h2>
            <p className="text-xs text-slate-500">Day-by-day aggregate expenditure curve</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
            Current Pace: Optimal
          </span>
        </div>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={VELOCITY_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip 
                formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#FFFFFF', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="cumulative" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#spendGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Department Breakdown & Duplicate Detection Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Department Budgets */}
        <div className="fintech-card p-6 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Department Spending vs Budgets</h2>
            <p className="text-xs text-slate-500">Track department burn rates against allocated ceilings</p>
          </div>

          <div className="space-y-3.5">
            {DEPT_SPEND.map((dept, idx) => {
              const pct = Math.round((dept.amount / dept.budget) * 100);
              return (
                <div key={idx} className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{dept.dept}</span>
                    <span className="font-mono text-slate-600">
                      ₹{dept.amount.toLocaleString('en-IN')} / ₹{dept.budget.toLocaleString('en-IN')} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: dept.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Flagged Duplicates Audit Drawer */}
        <div className="fintech-card p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">Duplicate Ingestion Guard</h2>
            </div>
            <p className="text-xs text-slate-500">
              Deterministic rule engine detected duplicate vendor submissions
            </p>
          </div>

          <div className="space-y-3">
            {duplicates.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No duplicate anomalies currently active.
              </div>
            ) : (
              duplicates.map((dup, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
                    <span>{dup.vendor_id} Discrepancy</span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Auto-Frozen
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-slate-700">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Original</div>
                      <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{dup.original_invoice_no}</div>
                      <div className="font-mono text-slate-600 mt-1">₹{dup.amount?.toLocaleString('en-IN')}</div>
                    </div>

                    <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200 text-rose-800">
                      <div className="text-[10px] text-rose-500 uppercase font-semibold">Flagged Duplicate</div>
                      <div className="font-mono font-bold text-rose-900 text-xs mt-0.5">{dup.duplicate_invoice_no}</div>
                      <div className="font-mono text-rose-700 mt-1">₹{dup.amount?.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-800">
                    Rule triggered: <strong>DUPLICATE_INVOICE</strong>. Payout held under ESC-4001.
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
