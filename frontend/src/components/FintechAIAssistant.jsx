import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Paperclip, 
  Bot, 
  User, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  X, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe
} from 'lucide-react';
import { sendAgentMessage, uploadAgentSpreadsheet, getCurrentUserId } from '../api';

const SUGGESTED_PROMPTS = [
  "Analyze our spending patterns this month",
  "What is the hotel rate limit for Grade L2?",
  "Summarize pending duplicate invoice alerts",
  "Check status of invoice #INV-2004",
  "What are our vendor Net-30 payment terms?"
];

export default function FintechAIAssistant({ currentUser }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'agent',
      text: `Hello, ${currentUser?.name || 'there'}! I am **Expense Pilot AI**, your autonomous enterprise finance and policy copilot.\n\nI verify reimbursement claims against official grade caps, audit vendor invoices for duplicate fraud, and assist with corporate policy lookups with exact citations.\n\nAsk me a financial question or attach a **CSV / Excel spreadsheet** below to audit expenses with AI.`,
      citations: [
        {
          doc_name: "Meridian Corporate Expense Policy 2026",
          section_id: "SEC-101",
          title: "Purpose & General Principles",
          relevant_snippet: "All transactions and claims must adhere strictly to grade per-diem allowances and authorized manager approval workflows."
        }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedCitationId, setExpandedCitationId] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend = null) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: String(Date.now()),
      sender: 'user',
      text
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const res = await sendAgentMessage(
        text,
        currentUser?.id || getCurrentUserId(),
        'en',
        attachedFile ? { filename: attachedFile.filename, sample: attachedFile.preview } : null
      );

      const agentMsg = {
        id: String(Date.now() + 1),
        sender: 'agent',
        text: res.reply || "I analyzed your query against the corporate database.",
        citations: res.citations || [],
        toolCalled: res.tool_called,
        suggestedActions: res.suggested_actions || []
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'agent',
          text: `⚠️ Error executing query: ${err.message || 'Please check API connection.'}`,
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadAgentSpreadsheet(file);
      setAttachedFile(res);
    } catch (err) {
      alert(err.message || "Spreadsheet upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] pb-4">
      
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. WELCOMING HEADER
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="text-center py-4 px-4 flex-shrink-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Google Gemini & Autonomous Policy Engine</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Financial Intelligence Assistant
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Evidence-backed answers citing verified corporate records and official policy sections.
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. CENTERED CONVERSATION AREA
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'agent' && (
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-2xl space-y-2.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Message Bubble Card */}
              <div 
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-xs shadow-sm font-medium'
                    : msg.isError
                    ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-bl-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>

              {/* Evidence Citations Panel */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Evidence & Verified Policy References ({msg.citations.length}):</span>
                  </div>

                  <div className="space-y-1.5">
                    {msg.citations.map((c, cIdx) => (
                      <div 
                        key={cIdx}
                        className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 space-y-1"
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px]">
                              {c.section_id}
                            </span>
                            <span>{c.title}</span>
                          </span>
                        </div>
                        <p className="text-slate-500 italic pl-1 border-l-2 border-emerald-400">
                          "{c.relevant_snippet}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Follow-up Actions */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {msg.suggestedActions.map((act, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={() => handleSend(act)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                    >
                      {act}
                    </button>
                  ))}
                </div>
              )}

            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                {currentUser?.name?.slice(0, 1) || 'U'}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
              <span className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
              <span>Checking policy per-diem limits, records & audit rules...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. SUGGESTED PROMPTS BAR
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 flex-shrink-0 overflow-x-auto scrollbar-none flex gap-2">
        {SUGGESTED_PROMPTS.map((prompt, pIdx) => (
          <button
            key={pIdx}
            onClick={() => handleSend(prompt)}
            className="text-[11px] font-medium whitespace-nowrap px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition-all shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Active Spreadsheet Attachment Pill */}
      {attachedFile && (
        <div className="mx-4 mb-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>
              Attached: <strong>{attachedFile.filename}</strong> ({attachedFile.row_count} rows, {attachedFile.column_count} columns)
            </span>
          </div>
          <button
            onClick={() => setAttachedFile(null)}
            className="p-1 hover:bg-emerald-100 rounded-md text-emerald-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. CLEAN MESSAGE COMPOSER
          ───────────────────────────────────────────────────────────────────────────── */}
      <div className="px-4 flex-shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="fintech-card p-2 flex items-center gap-2 shadow-sm focus-within:border-emerald-500 transition-colors"
        >
          {/* File Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Attach CSV or Excel spreadsheet"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              attachedFile
                ? `Ask questions about ${attachedFile.filename}...`
                : "Ask anything about policies, claims, limits, or invoices..."
            }
            className="flex-1 text-xs text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none px-2"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="fintech-btn-primary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </form>
      </div>

    </div>
  );
}
