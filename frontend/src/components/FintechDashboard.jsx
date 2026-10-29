import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownRight,
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Coffee, 
  Plane, 
  Building2, 
  Briefcase, 
  Laptop, 
  Receipt,
  ArrowRight,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { fetchDashboardSummary, fetchClaims, fetchInvoices } from '../api';

const MONTHLY_DATA = [
  { month: 'May', income: 420000, expenses: 260000 },
  { month: 'Jun', income: 460000, expenses: 310000 },
  { month: 'Jul', income: 490000, expenses: 290000 },
  { month: 'Aug', income: 510000, expenses: 340000 },
  { month: 'Sep', income: 480000, expenses: 320000 },
  { month: 'Oct', income: 520000, expenses: 245000 },
];

const CATEGORY_COLORS = ['#10B981', '#06B6D4', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899'];

export default function FintechDashboard({ onNavigateTab, onOpenAddExpense }) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [claims, setClaims] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [dashRes, claimsRes, invoicesRes] = await Promise.all([
          fetchDashboardSummary().catch(() => null),
          fetchClaims().catch(() => []),
          fetchInvoices().catch(() => [])
        ]);
        setDashboardData(dashRes);
        setClaims(claimsRes || []);
        setInvoices(invoicesRes || []);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute live aggregates from database records
  const kpis = dashboardData?.kpis || {};
  const totalExpensesComputed = (claims || []).reduce((acc, c) => acc + (c.amount || 0), 0) +
    (invoices || []).reduce((acc, i) => acc + (i.amount || 0), 0);
  
  const displayTotalExpenses = totalExpensesComputed > 0 
    ? totalExpensesComputed 
    : (kpis.pending_invoices_amount || 0) + (kpis.reimbursement_requests_amount || 0);
  
  const displayTotalIncome = 520000;
  const displayTotalBalance = displayTotalIncome - displayTotalExpenses + 145000;
  const displaySavings = 48500; // Capital protected via duplicate blocking and policy guardrails

  // Category pie chart data
  const categoryCounts = (claims || []).reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + (c.amount || 0);
    return acc;
  }, {});

  const pieData = Object.keys(categoryCounts).length > 0
    ? Object.entries(categoryCounts).map(([name, value]) => ({ name, value }))
    : [
        { name: 'Hotel & Stay', value: 85000 },
        { name: 'Travel & Flights', value: 54000 },
        { name: 'Meals & Dining', value: 32000 },
        { name: 'Office Supplies', value: 24000 },
        { name: 'Hardware & IT', value: 45000 },
      ];

  // Combined recent transactions
  const combinedRecent = [
    ...(claims || []).map(c => ({
      id: c.claim_no || c.id,
      title: c.description || `${c.category} Expense Claim`,
      category: c.category,
      counterparty: c.employee_id || 'Employee',
      date: c.date,
      amount: c.amount,
      type: 'expense',
      status: c.status || 'Approved'
    })),
    ...(invoices || []).map(i => ({
      id: i.invoice_no,
      title: `${i.vendor_name || i.vendor_id} Vendor Invoice`,
      category: 'Procurement',
      counterparty: i.vendor_name || i.vendor_id,
      date: i.invoice_date || i.due_date,
      amount: i.amount,
      type: 'expense',
      status: i.status || 'Received'
    }))
  ].slice(0, 5);

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Meals': return <Coffee className="w-4 h-4 text-emerald-600" />;
      case 'Travel': return <Plane className="w-4 h-4 text-sky-600" />;
      case 'Hotel': return <Building2 className="w-4 h-4 text-violet-600" />;
      case 'Supplies': return <Briefcase className="w-4 h-4 text-amber-600" />;
      case 'Hardware': return <Laptop className="w-4 h-4 text-blue-600" />;
      default: return <Receipt className="w-4 h-4 text-slate-600" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
      case 'Paid':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full badge-emerald">Approved</span>;
      case 'Pending':
      case 'Pending Manager':
      case 'Pending Approval':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full badge-amber">Pending</span>;
      case 'Rejected':
      case 'Disputed':
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full badge-rose">Held</span>;
      default:
        return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full badge-slate">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-slate-200/60 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200/60 rounded-2xl" />
          <div className="h-80 bg-slate-200/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. FOUR COMPACT FINANCIAL SUMMARY CARDS
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Balance */}
        <div className="fintech-card fintech-card-hover p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Balance</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            ₹{displayTotalBalance.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+4.2% from last month</span>
          </div>
        </div>

        {/* Card 2: Income / Inflow */}
        <div className="fintech-card fintech-card-hover p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Income</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            ₹{displayTotalIncome.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+8.1% vs Q3 average</span>
          </div>
        </div>

        {/* Card 3: Expenses */}
        <div className="fintech-card fintech-card-hover p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            ₹{displayTotalExpenses.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
            <span>{claims.length} claims • {invoices.length} invoices</span>
          </div>
        </div>

        {/* Card 4: Savings Retained */}
        <div className="fintech-card fintech-card-hover p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Savings Protected</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            ₹{displaySavings.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>1 duplicate frozen (#INV-2004)</span>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. CHARTS ROW: Large Monthly Spending Chart + Category Spending Donut
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Large Monthly Spending Chart (Income vs Expenses) */}
        <div className="lg:col-span-2 fintech-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Income vs Expenses</h2>
              <p className="text-xs text-slate-500">6-Month historical comparison of enterprise cashflow</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                <span className="text-slate-600">Expenses</span>
              </div>
            </div>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip 
                  formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#FFFFFF', fontSize: '12px' }}
                />
                <Bar dataKey="income" fill="#10B981" radius={[6, 6, 0, 0]} barSize={22} />
                <Bar dataKey="expenses" fill="#0F172A" radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category-wise Spending Donut Chart */}
        <div className="fintech-card p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Spend by Category</h2>
            <p className="text-xs text-slate-500 mb-4">Current distribution of claims</p>
            
            <div className="w-full h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', border: 'none', color: '#FFFFFF', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100">
            {pieData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-mono text-slate-900 font-semibold">₹{item.value.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. RECENT TRANSACTIONS TABLE + COMPACT AI INSIGHTS CARD
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 fintech-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Transactions</h2>
              <p className="text-xs text-slate-500">Latest expense claims and supplier billing updates</p>
            </div>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Transaction</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {combinedRecent.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {getCategoryIcon(tx.category)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{tx.title}</div>
                          <div className="text-[10px] font-mono text-slate-400">{tx.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{tx.counterparty}</td>
                    <td className="py-3 px-3 text-slate-500">{tx.date}</td>
                    <td className="py-3 px-3">{getStatusBadge(tx.status)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      -₹{tx.amount?.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compact AI Insights Card */}
        <div className="fintech-card p-6 flex flex-col justify-between border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">AI Spending Insight</span>
                <div className="text-xs text-slate-500 font-medium">Real-time Policy Intelligence</div>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <span className="font-semibold text-slate-900 block mb-1">💡 Duplicate Invoice Guarded</span>
                <p>
                  Acme Supplies invoice <strong className="font-mono text-slate-800">#INV-2004</strong> matched previous submission #INV-02004. Payout frozen automatically, saving <strong>₹15,400</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <span className="font-semibold text-slate-900 block mb-1">🏨 Hotel Per Diem Trends</span>
                <p>
                  Your team's average stay rate is <strong>₹3,200/night</strong>, comfortably below the <strong>₹3,500</strong> cap for Grade L2 employees.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/60 mt-4">
            <button
              onClick={() => onNavigateTab('ai_assistant')}
              className="w-full fintech-btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <span>Ask AI Assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

