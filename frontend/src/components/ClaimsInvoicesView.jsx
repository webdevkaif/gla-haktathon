import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Receipt, 
  Search, 
  Plus, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Calendar,
  X,
  FileCheck
} from 'lucide-react';
import { fetchClaims, fetchInvoices, createClaim, uploadInvoiceOCR, getCurrentUserId } from '../api';

export default function ClaimsInvoicesView({ currentUser }) {
  const [activeSubTab, setActiveSubTab] = useState('claims'); // 'claims' | 'invoices'
  const [claims, setClaims] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // New Claim Form
  const [newClaim, setNewClaim] = useState({
    category: 'Meals',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    receipt_attached: true,
    description: ''
  });

  // Invoice Upload Form
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoicePoNo, setInvoicePoNo] = useState('PO-9001');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cRes, iRes] = await Promise.all([
        fetchClaims(statusFilter === 'All' ? null : statusFilter),
        fetchInvoices(statusFilter === 'All' ? null : statusFilter)
      ]);
      setClaims(cRes || []);
      setInvoices(iRes || []);
    } catch (err) {
      console.error("Error loading records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!newClaim.amount || Number(newClaim.amount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category: newClaim.category,
        amount: parseFloat(newClaim.amount),
        currency: "INR",
        date: newClaim.date,
        receipt_attached: newClaim.receipt_attached,
        description: newClaim.description
      };
      const res = await createClaim(payload);
      showToast(`Claim ${res.claim_no} submitted successfully! Routed to manager.`);
      setIsClaimModalOpen(false);
      setNewClaim({ category: 'Meals', amount: '', date: new Date().toISOString().slice(0, 10), receipt_attached: true, description: '' });
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to submit claim", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvoiceUpload = async (e) => {
    e.preventDefault();
    if (!invoiceFile) {
      showToast("Please select an invoice file to upload", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", invoiceFile);
      if (invoicePoNo) formData.append("po_no", invoicePoNo);

      const res = await uploadInvoiceOCR(formData);
      showToast(`Invoice ${res.invoice_no} uploaded & parsed via Mindee AI OCR!`);
      setIsInvoiceModalOpen(false);
      setInvoiceFile(null);
      await loadData();
    } catch (err) {
      showToast(err.message || "Invoice upload failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      Received: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      Submitted: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      'Pending Manager': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      'Pending Finance': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      'Pending Approval': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      Approved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      Paid: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      Disputed: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      Rejected: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    };
    const style = map[status] || 'bg-slate-700 text-slate-300 border-slate-600';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${style}`}>
        {status}
      </span>
    );
  };

  // Filtered Lists
  const filteredClaims = claims.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.claim_no?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      c.employee_id?.toLowerCase().includes(q)
    );
  });

  const filteredInvoices = invoices.filter(i => {
    const q = searchQuery.toLowerCase();
    return (
      i.invoice_no?.toLowerCase().includes(q) ||
      i.vendor_id?.toLowerCase().includes(q) ||
      i.vendor_name?.toLowerCase().includes(q) ||
      i.po_no?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50'
            : 'bg-rose-950/90 text-rose-300 border border-rose-500/50'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header with Sub-Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 shadow-sm">
        
        {/* Sub-Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('claims')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'claims'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Employee Claims ({claims.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'invoices'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Vendor Invoices ({invoices.length})</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {currentUser?.role !== 'vendor' && (
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 text-xs font-bold shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Claim</span>
            </button>
          )}

          {(currentUser?.role === 'vendor' || currentUser?.role === 'finance') && (
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-100 text-xs font-semibold transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span>Upload Invoice (OCR)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeSubTab === 'claims' ? 'claims by ID, claimant, category' : 'invoices by No, vendor, PO'}...`}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-teal-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="filter-status-select" className="text-xs text-slate-400 whitespace-nowrap">Status:</label>
          <select
            id="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="All">All States</option>
            <option value="Received">Received</option>
            <option value="Pending Manager">Pending Manager</option>
            <option value="Pending Finance">Pending Finance</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Paid">Paid</option>
            <option value="Disputed">Disputed</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        {activeSubTab === 'claims' ? (
          /* CLAIMS TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Claim No</th>
                  <th className="py-2.5 px-3">Claimant</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Expense Date</th>
                  <th className="py-2.5 px-3">Receipt</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Expected Payout</th>
                  <th className="py-2.5 px-3">Policy Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-slate-400">
                      No claims found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-300">{c.claim_no}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-medium">{c.employee_id}</td>
                      <td className="py-2.5 px-3 text-slate-300">{c.category}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">₹{c.amount?.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-slate-400">{c.date}</td>
                      <td className="py-2.5 px-3">
                        {c.receipt_attached ? (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Attached
                          </span>
                        ) : (
                          <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Missing
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">{getStatusBadge(c.status)}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {c.expected_payment_date || (c.status === 'Approved' ? 'Next Friday' : 'Awaiting Approval')}
                      </td>
                      <td className="py-2.5 px-3">
                        {c.policy_flags && c.policy_flags.length > 0 ? (
                          <div className="space-y-0.5 max-w-xs">
                            {c.policy_flags.map((flag, fIdx) => (
                              <div key={fIdx} className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded truncate">
                                ⚠️ {flag}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">None</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* INVOICES TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">PO Reference</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Invoice Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Duplicate / Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-slate-400">
                      No invoices found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-300">{inv.invoice_no}</td>
                      <td className="py-2.5 px-3 text-slate-200 font-medium">{inv.vendor_name || inv.vendor_id}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{inv.po_no || 'None'}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">₹{inv.amount?.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-slate-400">{inv.invoice_date}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-medium">{inv.due_date}</td>
                      <td className="py-2.5 px-3">{getStatusBadge(inv.status)}</td>
                      <td className="py-2.5 px-3">
                        {inv.duplicate_of ? (
                          <span className="text-[10px] font-bold text-rose-300 bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded inline-block">
                            🚨 Duplicate of {inv.duplicate_of}
                          </span>
                        ) : inv.flags && inv.flags.length > 0 ? (
                          <div className="space-y-0.5 max-w-xs">
                            {inv.flags.map((fl, fIdx) => (
                              <div key={fIdx} className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded truncate">
                                ⚠️ {fl}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-medium">Valid PO match</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SUBMIT CLAIM MODAL */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsClaimModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white mb-1">Submit Reimbursement Claim</h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter expense details. Corporate rules will validate limits for your grade ({currentUser?.grade || 'L2'}).
            </p>

            <form onSubmit={handleClaimSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category</label>
                <select
                  value={newClaim.category}
                  onChange={(e) => setNewClaim({ ...newClaim, category: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none"
                >
                  <option value="Meals">Meals (L2 Limit: ₹800/day)</option>
                  <option value="Travel">Travel (L2 Limit: ₹3,500)</option>
                  <option value="Hotel">Hotel & Stay (L2 Limit: ₹3,500/night)</option>
                  <option value="Supplies">Office Supplies / Hardware</option>
                  <option value="General">General Business Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Amount (INR ₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newClaim.amount}
                  onChange={(e) => setNewClaim({ ...newClaim, amount: e.target.value })}
                  placeholder="e.g. 750"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={newClaim.date}
                  onChange={(e) => setNewClaim({ ...newClaim, date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="receipt-cb"
                  checked={newClaim.receipt_attached}
                  onChange={(e) => setNewClaim({ ...newClaim, receipt_attached: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-700 text-teal-500 focus:ring-0"
                />
                <label htmlFor="receipt-cb" className="text-slate-300 font-medium cursor-pointer">
                  Valid GST receipt / tax voucher attached (Required for &gt; ₹500)
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Purpose</label>
                <textarea
                  rows="2"
                  value={newClaim.description}
                  onChange={(e) => setNewClaim({ ...newClaim, description: e.target.value })}
                  placeholder="Client lunch with Meridian vendor partners..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-bold shadow-md disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Evaluating...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD INVOICE MODAL (OCR) */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsInvoiceModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white mb-1">Upload Vendor Invoice</h2>
            <p className="text-xs text-slate-400 mb-4">
              Mindee AI OCR will extract invoice number, amount, date, and run 3-way PO matching.
            </p>

            <form onSubmit={handleInvoiceUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Associated Purchase Order (PO)</label>
                <select
                  value={invoicePoNo}
                  onChange={(e) => setInvoicePoNo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none"
                >
                  <option value="PO-9001">PO-9001 — Acme Supplies (₹50,000)</option>
                  <option value="PO-9002">PO-9002 — Acme Supplies (₹45,000)</option>
                  <option value="PO-9003">PO-9003 — TechCorp Systems (₹80,000)</option>
                  <option value="PO-9004">PO-9004 — CloudInfra Hosting (₹25,000)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Document File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setInvoiceFile(e.target.files[0])}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 cursor-pointer"
                />
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 text-[11px] text-slate-400">
                ⚡ Powered by <strong>Mindee AI OCR Engine</strong>. Automated duplicate detection and 5% tolerance PO matching will run upon upload.
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !invoiceFile}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-slate-950 font-bold shadow-md disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? 'Parsing OCR...' : 'Process Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

