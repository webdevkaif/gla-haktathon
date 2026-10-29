import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Coffee, 
  Plane, 
  Building2, 
  Briefcase, 
  Laptop, 
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Copy
} from 'lucide-react';
import { fetchClaims, fetchInvoices } from '../api';

export default function FintechTransactions({ onOpenAddExpense, currentUser }) {
  const [claims, setClaims] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All'); // 'All' | 'expense' | 'inflow'

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, iRes] = await Promise.all([
        fetchClaims().catch(() => []),
        fetchInvoices().catch(() => [])
      ]);
      setClaims(cRes || []);
      setInvoices(iRes || []);
    } catch (err) {
      console.error("Transactions load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format all items into unified transaction list
  const allTransactions = [
    // Approved claims represented as approved reimbursement credits/disbursements
    ...(claims || []).map(c => ({
      id: c.claim_no || c.id,
      title: c.description || `${c.category} Expense Claim`,
      category: c.category || 'General',
      entity: c.employee_id || 'Employee',
      date: c.date,
      amount: c.amount,
      type: c.status === 'Approved' ? 'inflow' : 'expense',
      status: c.status || 'Submitted',
      rawType: 'claim',
      duplicateOf: c.duplicate_of || null,
      flags: c.flags || []
    })),
    // Vendor invoices
    ...(invoices || []).map(i => ({
      id: i.invoice_no,
      title: `${i.vendor_name || i.vendor_id} Supplier Invoice`,
      category: 'Procurement',
      entity: i.vendor_name || i.vendor_id,
      date: i.invoice_date || i.due_date,
      amount: i.amount,
      type: 'expense',
      status: i.status || 'Received',
      rawType: 'invoice',
      duplicateOf: i.duplicate_of || null,
      flags: i.flags || []
    }))
  ];

  // Filtering
  const filtered = allTransactions.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      item.id?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.entity?.toLowerCase().includes(q);
    
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesType = typeFilter === 'All' || item.type === typeFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesType;
  });

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
        return <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full badge-emerald">Approved</span>;
      case 'Pending':
      case 'Pending Manager':
      case 'Pending Approval':
        return <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full badge-amber">Pending</span>;
      case 'Rejected':
      case 'Disputed':
        return <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full badge-rose">Held</span>;
      default:
        return <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full badge-slate">{status}</span>;
    }
  };

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Transaction History</h2>
          <p className="text-xs text-slate-500">
            {filtered.length} corporate items recorded in current billing cycle
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAddExpense}
            className="fintech-btn-primary flex items-center gap-2 px-4 py-2 text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="fintech-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, merchant, desc..."
              className="w-full fintech-input pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full fintech-input px-3 py-1.5 text-xs text-slate-700 font-medium cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Meals">Meals & Dining</option>
              <option value="Travel">Travel & Flight</option>
              <option value="Hotel">Hotel & Stay</option>
              <option value="Supplies">Office Supplies</option>
              <option value="Procurement">Supplier Procurement</option>
              <option value="General">General Expense</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full fintech-input px-3 py-1.5 text-xs text-slate-700 font-medium cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending Review</option>
              <option value="Received">Received</option>
              <option value="Rejected">Held / Disputed</option>
            </select>
          </div>

          {/* Flow Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full fintech-input px-3 py-1.5 text-xs text-slate-700 font-medium cursor-pointer"
            >
              <option value="All">All Cash Flows</option>
              <option value="expense">Outflow / Expense</option>
              <option value="inflow">Inflow / Reimbursement</option>
            </select>
          </div>

        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="fintech-card overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className="h-12 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">No Transactions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              We couldn't find any transactions matching your active filter criteria.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setCategoryFilter('All'); setStatusFilter('All'); setTypeFilter('All'); }}
              className="fintech-btn-secondary px-4 py-2 text-xs"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Transaction Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status & Flags</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Title & Ref ID */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {getCategoryIcon(tx.category)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{tx.title}</div>
                          <div className="font-mono text-[10px] text-slate-400">{tx.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-700">{tx.category}</span>
                    </td>

                    {/* Entity / Counterparty */}
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {tx.entity}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {tx.date}
                    </td>

                    {/* Status & Guardrail Flags */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(tx.status)}
                        {tx.duplicateOf && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Copy className="w-3 h-3 text-rose-500" />
                            <span>Duplicate of {tx.duplicateOf}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                      {tx.type === 'inflow' ? (
                        <span className="text-emerald-600">
                          +₹{tx.amount?.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-900">
                          -₹{tx.amount?.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

