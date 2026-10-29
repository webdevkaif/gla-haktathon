import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Layers, 
  CheckCircle2, 
  ChevronRight, 
  DollarSign, 
  ShieldCheck, 
  FileText 
} from 'lucide-react';
import { fetchPolicies } from '../api';

export default function PoliciesView() {
  const [policies, setPolicies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetchPolicies(selectedCategory === 'All' ? null : selectedCategory, searchQuery);
        setPolicies(res || []);
      } catch (err) {
        console.error("Policy load error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [selectedCategory, searchQuery]);

  const categories = ['All', 'General', 'Meals', 'Travel', 'Hotel', 'Procurement', 'Audit', 'Security'];

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight">Meridian Expense & Procurement Policy 2026</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
              12 Sections
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Official guidelines, category caps by grade, approval thresholds, and Net-30 procurement procedures.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search policy rules (e.g. hotel, limit, L2)..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Policy Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((pol) => {
          const limits = pol.grade_limits || {};
          const hasLimits = Object.keys(limits).length > 0;
          return (
            <div
              key={pol.id || pol.section_id}
              className="bg-slate-800/90 border border-slate-700/80 hover:border-teal-500/40 rounded-xl p-4 shadow-sm space-y-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-extrabold text-teal-300 bg-teal-950/60 border border-teal-500/30 px-2 py-0.5 rounded">
                  {pol.section_id}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  {pol.category || 'General'}
                </span>
              </div>

              <div>
                <h2 className="text-sm font-bold text-white mb-1.5">{pol.title}</h2>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {pol.text}
                </p>
              </div>

              {/* Grade Limit Table if Applicable */}
              {hasLimits && (
                <div className="pt-2 border-t border-slate-700/60">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-teal-400" />
                    <span>Prescribed Caps by Employee Grade:</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 text-center font-mono text-[11px]">
                    {Object.entries(limits).map(([grd, amt]) => (
                      <div key={grd} className="bg-slate-900/80 p-1.5 rounded border border-slate-700/60">
                        <div className="text-[10px] text-slate-400 font-bold">{grd}</div>
                        <div className="text-teal-300 font-bold text-xs">₹{amt?.toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

