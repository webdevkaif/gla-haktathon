import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Bot, 
  Trash2, 
  Calendar, 
  Tag, 
  TrendingUp, 
  ShieldCheck, 
  ArrowUpRight 
} from 'lucide-react';
import { 
  fetchInvoices, 
  fetchInvoiceSummary, 
  uploadInvoiceFile, 
  deleteInvoice, 
  fetchFinancialRoadmap, 
  getRoadmapPdfUrl 
} from '../api';
import { formatCurrency } from '../utils/formatters';

export default function InvoicesRoadmapView({ onToggleChat }) {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState(null);

  const loadData = async () => {
    try {
      const [invRes, sumRes, rdRes] = await Promise.all([
        fetchInvoices({ category: filterCategory !== 'All' ? filterCategory : undefined }),
        fetchInvoiceSummary(),
        fetchFinancialRoadmap("2026-10")
      ]);
      setInvoices(invRes);
      setSummary(sumRes);
      setRoadmap(rdRes);
    } catch (err) {
      console.error("Error loading invoice & roadmap data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterCategory]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploaded = await uploadInvoiceFile(formData);
      setUploadSuccessMsg(`✅ Successfully uploaded and audited "${file.name}"!`);
      setTimeout(() => setUploadSuccessMsg(null), 4000);
      await loadData();
    } catch (err) {
      alert("Failed to upload invoice. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await deleteInvoice(id);
      await loadData();
    } catch (err) {
      alert("Failed to delete invoice");
    }
  };

  const categories = ['All', 'Shopping', 'Food', 'Groceries', 'Utilities', 'Transportation'];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
              Autonomous Intelligence
            </span>
            <span className="text-xs text-slate-400">OCR & Audit Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Invoices & Financial Roadmap
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload receipts, inspect autonomous GST & anomaly audits, and download your personalized 90-day PDF roadmap.
          </p>
        </div>

        {/* Talk with Voice Agent Button */}
        <button
          onClick={onToggleChat}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/30 transition-all self-start sm:self-auto hover:scale-105"
        >
          <Bot className="w-4 h-4 animate-pulse" />
          <span>Discuss with Voice Agent</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Invoiced */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Total Invoiced</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {formatCurrency(summary?.total_invoiced_amount || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {summary?.total_invoices || 0} tracked invoices
          </p>
        </div>

        {/* KPI 2: Financial Health Score */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Financial Health Score</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {roadmap?.health_score || 85} <span className="text-sm font-normal text-slate-400">/ 100</span>
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">
            Autonomous rating: Stable runway
          </p>
        </div>

        {/* KPI 3: 90-Day Projected Savings */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>90-Day Roadmap Target</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300">
            {formatCurrency(roadmap?.projected_savings_90_days || 15000)}
          </div>
          <p className="text-[11px] text-cyan-400/80 mt-1">
            +₹5,000/month recurring savings
          </p>
        </div>

        {/* KPI 4: Audited Status */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Audit Status</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {summary?.total_invoices || 0} <span className="text-sm font-normal text-slate-400">Audited</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Zero pending unverified bills
          </p>
        </div>
      </div>

      {/* Financial Roadmap Executive Banner with PDF Download */}
      <div className="glass-panel-deep p-6 sm:p-8 rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-[#070d1d]/80 to-blue-950/40 backdrop-blur-2xl relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        
        {/* Glow orb */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Personalized Financial Strategy
              </span>
              <span className="text-xs text-slate-400">PDF-1.4 Standard Document</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Autonomous 3-Phase Financial Defense & Wealth Roadmap
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Synthesized from your historical spending velocity and uploaded invoices. 
              Provides actionable daily allowances, category spending envelopes, and debt prevention steps targeting <strong>₹15,000 in preserved capital</strong>.
            </p>

            {/* Recommendations preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Phase 1 (Days 1–30)</span>
                <span className="text-xs text-slate-200 font-semibold block mt-1">Runway Defense</span>
                <span className="text-[11px] text-slate-400">₹3,200/mo savings target</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Phase 2 (Days 31–60)</span>
                <span className="text-xs text-slate-200 font-semibold block mt-1">Run-Rate Realignment</span>
                <span className="text-[11px] text-slate-400">₹5,000/mo savings target</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Phase 3 (Days 61–90)</span>
                <span className="text-xs text-slate-200 font-semibold block mt-1">Wealth Acceleration</span>
                <span className="text-[11px] text-slate-400">₹15,000 safety reserve</span>
              </div>
            </div>
          </div>

          {/* Action Download Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <a
              href={getRoadmapPdfUrl("2026-10")}
              target="_blank"
              rel="noopener noreferrer"
              download="ExpensePilot_Financial_Roadmap.pdf"
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-sm shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 transition-all text-center"
            >
              <Download className="w-5 h-5" />
              <span>Download Official Roadmap PDF</span>
            </a>

            <button
              onClick={() => onToggleChat && onToggleChat()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl glass-btn text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 font-semibold text-xs transition-all"
            >
              <Bot className="w-4 h-4" />
              <span>Ask Voice Agent to Read Highlights</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Management & Upload Section */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 backdrop-blur-xl space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Uploaded Invoices & Receipt Audits
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Autonomous OCR parses vendor names, dates, amounts, line items, and tax compliance.
            </p>
          </div>

          {/* Upload Button */}
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-btn-primary text-white font-bold text-xs cursor-pointer shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all self-start sm:self-auto">
            {isUploading ? (
              <Upload className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isUploading ? 'Extracting OCR...' : 'Upload New Invoice (PDF / Image)'}</span>
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              className="hidden"
            />
          </label>
        </div>

        {/* Upload Success Alert */}
        {uploadSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                filterCategory === cat
                  ? 'bg-gradient-to-r from-cyan-500/90 to-blue-600/90 text-white shadow-md border border-cyan-400/40'
                  : 'glass-btn text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-slate-400 text-[11px] font-semibold border-b border-white/[0.08] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Vendor & Receipt</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Amount & Tax</th>
                <th className="py-3.5 px-4">Audit Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                    No invoices found. Click "Upload New Invoice" above or ask the voice agent!
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Vendor */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-white">{inv.vendor}</div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{inv.invoice_number}</span>
                        {inv.file_name && (
                          <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                            {inv.file_name}
                          </span>
                        )}
                      </div>
                      {inv.items && inv.items.length > 0 && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          {inv.items.map(it => `${it.name} (x${it.quantity || 1})`).join(' • ')}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                        {inv.category}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-xs text-slate-300">
                      {inv.date}
                    </td>

                    {/* Amount & Tax */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-sm">
                        {formatCurrency(inv.amount)}
                      </div>
                      {inv.tax > 0 && (
                        <div className="text-[11px] text-slate-400">
                          Tax: {formatCurrency(inv.tax)}
                        </div>
                      )}
                    </td>

                    {/* Status & Anomaly Warning */}
                    <td className="py-4 px-4">
                      {inv.is_anomaly ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30">
                            <AlertTriangle className="w-3 h-3" /> Anomaly Flagged
                          </span>
                          <p className="text-[10px] text-rose-300/80 max-w-xs">
                            {inv.anomaly_reason}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          <CheckCircle2 className="w-3 h-3" /> Audited
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleDelete(inv.id)}
                        title="Delete invoice"
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
