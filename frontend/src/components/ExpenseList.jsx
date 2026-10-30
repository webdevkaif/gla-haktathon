import React, { useState } from 'react';
import { 
  Search, 
  Trash2, 
  AlertTriangle, 
  Download,
  Upload,
  Plus, 
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { deleteExpense, confirmUnusualExpense, uploadExpenseCSV } from '../api';
import { sendNativeMobileNotification } from '../utils/mobileNotifications';
import { formatCurrency, getCategoryColor } from '../utils/formatters';

const CATEGORIES = [
  "All", 
  "Food", 
  "Shopping", 
  "Groceries", 
  "Transportation", 
  "Entertainment", 
  "Utilities", 
  "Healthcare"
];

export default function ExpenseList({ expenses, onExpenseMutated, onOpenAddModal }) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');
  const [showUnusualOnly, setShowUnusualOnly] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const filtered = (expenses || []).filter((e) => {
    const matchesCat = selectedCat === 'All' || e.category.toLowerCase() === selectedCat.toLowerCase();
    const matchesSearch = !search || 
      e.description.toLowerCase().includes(search.toLowerCase()) || 
      e.category.toLowerCase().includes(search.toLowerCase());
    const matchesUnusual = !showUnusualOnly || e.is_unusual;
    return matchesCat && matchesSearch && matchesUnusual;
  });

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense transaction?")) return;
    try {
      await deleteExpense(id);
      if (onExpenseMutated) onExpenseMutated();
      sendNativeMobileNotification("📲 ExpensePilot: Data Fetch Complete", {
        body: `Imported ${result.imported || 0} transactions from ${file.name}.`
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmUnusual = async (id) => {
    try {
      await confirmUnusualExpense(id);
      if (onExpenseMutated) onExpenseMutated();
      sendNativeMobileNotification("📲 ExpensePilot: Data Fetch Complete", {
        body: `Imported ${result.imported || 0} transactions from ${file.name}.`
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadExpenseCSV(formData);
      setImportResult({
        type: 'success',
        message: result.message,
        skipped: result.skipped_details || [],
        imported: result.imported,
      });
      if (onExpenseMutated) onExpenseMutated();
      sendNativeMobileNotification("📲 ExpensePilot: Data Fetch Complete", {
        body: `Imported ${result.imported || 0} transactions from ${file.name}.`
      });
    } catch (err) {
      setImportResult({ type: 'error', message: err.message || 'Import failed. Please check your file format.' });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleExportCSV = () => {
    if (!filtered || filtered.length === 0) return;
    const headers = ["ID", "Date", "Category", "Description", "Amount (INR)", "Payment Method", "Is Unusual", "Reason"];
    const rows = filtered.map(e => [
      e.id,
      e.date,
      `"${e.category}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.amount,
      `"${e.payment_method || 'Unknown'}"`,
      e.is_unusual ? "Yes" : "No",
      `"${(e.anomaly_reason || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ExpensePilot_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Controls Bar - Frosted Glass Container */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl space-y-5 border border-white/10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              id="input-search-expenses"
              placeholder="Search expenses by title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full glass-input rounded-2xl pl-11 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Unusual toggle */}
            <button
              onClick={() => setShowUnusualOnly(!showUnusualOnly)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                showUnusualOnly 
                  ? 'bg-amber-500/90 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-amber-300' 
                  : 'glass-btn text-slate-300 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Anomalies Only</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold glass-btn text-slate-300 hover:text-white transition-all"
              title="Export filtered transactions to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Import CSV / Excel Button */}
            <label
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer
                ${isImporting
                  ? 'glass-btn text-emerald-400 opacity-70 cursor-not-allowed'
                  : 'glass-btn text-emerald-400 hover:text-white hover:bg-emerald-500/20'
                }`}
              title="Import expenses from CSV or Excel file"
            >
              {isImporting ? (
                <Upload className="w-3.5 h-3.5 animate-bounce" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isImporting ? 'Importing...' : 'Import Excel / CSV'}</span>
              <input
                type="file"
                onChange={handleImportCSV}
                accept=".csv,.xlsx,.xls,.xlsm,.xltx"
                className="hidden"
                disabled={isImporting}
              />
            </label>

            {/* Add Expense Button */}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold glass-btn-emerald text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

        </div>

        {/* Import Result Banner */}
        {importResult && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex flex-col gap-1.5 animate-fade-in border ${
              importResult.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{importResult.message}</span>
              <button
                onClick={() => setImportResult(null)}
                className="text-slate-400 hover:text-white ml-4 shrink-0"
              >
                ✕
              </button>
            </div>
            {importResult.type === 'success' && importResult.skipped?.length > 0 && (
              <div className="mt-1 space-y-0.5 text-amber-300/80">
                <span className="font-bold">Skipped rows:</span>
                {importResult.skipped.map((s, i) => (
                  <div key={i}>Row {s.row}: {s.reason}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CSV Format Hint */}
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <FileSpreadsheet className="w-3 h-3 shrink-0" />
          <span>
            Import accepts <strong className="text-slate-400">CSV</strong> or <strong className="text-slate-400">Excel (.xlsx)</strong> files.
            Required columns: <code className="bg-white/5 px-1 rounded">date</code>,{' '}
            <code className="bg-white/5 px-1 rounded">amount</code>,{' '}
            <code className="bg-white/5 px-1 rounded">description</code>.
            Optional: <code className="bg-white/5 px-1 rounded">category</code>,{' '}
            <code className="bg-white/5 px-1 rounded">payment_method</code>.
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCat === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500/80 to-blue-600/80 text-white shadow-[0_0_15px_rgba(6,182,212,0.35),inset_0_1px_0_0_rgba(255,255,255,0.4)] border border-cyan-400/40'
                    : 'glass-pill text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transactions Table - Frosted Deep Glass Container */}
      <div className="glass-panel-deep rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-white/[0.08]">
              <tr>
                <th className="py-3.5 px-5">Date</th>
                <th className="py-3.5 px-5">Category</th>
                <th className="py-3.5 px-5">Description</th>
                <th className="py-3.5 px-5">Payment</th>
                <th className="py-3.5 px-5 text-right">Amount</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500 text-sm">
                    No transactions found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-white/[0.05] transition-colors ${
                      item.is_unusual ? 'bg-amber-500/[0.08] hover:bg-amber-500/[0.12] border-l-2 border-l-amber-400' : ''
                    }`}
                  >
                    <td className="py-4 px-5 font-mono text-xs text-slate-400 whitespace-nowrap">
                      {item.date}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <span 
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full shadow-sm"
                        style={{ 
                          backgroundColor: `${getCategoryColor(item.category)}20`,
                          color: getCategoryColor(item.category),
                          border: `1px solid ${getCategoryColor(item.category)}40`
                        }}
                      >
                        {item.category}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-slate-100">{item.description}</span>
                        {item.is_unusual && (
                          <span 
                            title={item.anomaly_reason || "Statistical Outlier"} 
                            className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.25)] shrink-0"
                          >
                            <AlertTriangle className="w-3 h-3" /> Unusual
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-5 text-xs text-slate-400 whitespace-nowrap font-medium">
                      {item.payment_method || 'Unknown'}
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <span className={`font-black text-sm ${item.is_unusual ? 'text-amber-400 drop-shadow-sm' : 'text-white'}`}>
                        {formatCurrency(item.amount)}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {item.is_unusual && (
                          <button
                            onClick={() => handleConfirmUnusual(item.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 glass-btn rounded-xl transition-colors"
                            title="Confirm & mark usual"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 glass-btn rounded-xl transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 bg-white/[0.02] border-t border-white/[0.08] text-xs text-slate-400 flex items-center justify-between">
          <span>Showing <strong className="text-white">{filtered.length}</strong> of {expenses?.length || 0} transactions</span>
          <span className="font-bold text-slate-100 text-sm">
            Filtered Total: <span className="text-cyan-300">{formatCurrency(filtered.reduce((sum, e) => sum + e.amount, 0))}</span>
          </span>
        </div>
      </div>

    </div>
  );
}
