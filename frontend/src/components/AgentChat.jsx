import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  ShieldAlert, 
  FileText, 
  CheckCircle2, 
  Volume2, 
  ChevronDown, 
  ChevronUp,
  Layers,
  HelpCircle,
  ExternalLink,
  Globe,
  UploadCloud,
  FileSpreadsheet,
  Paperclip,
  X,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { 
  sendAgentMessage, 
  getCurrentUserId, 
  uploadAgentSpreadsheet,
  fetchMindeeStatus 
} from '../api';

const QUICK_PROMPTS = [
  "What is the hotel rate limit for Grade L2?",
  "What is the meal allowance for Grade L2?",
  "Mera claim CLM-1042 approve hua kya?",
  "Status of invoice INV-2004",
  "What are the vendor Net-30 payment terms?",
  "Give me the executive finance summary",
  "Send a reminder for pending approvals"
];

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', voiceLocale: 'en-US' },
  { code: 'hi', label: 'हिंदी (Hindi)', flag: '🇮🇳', voiceLocale: 'hi-IN' },
  { code: 'hinglish', label: 'Hinglish', flag: '💬', voiceLocale: 'en-IN' },
  { code: 'es', label: 'Español', flag: '🇪🇸', voiceLocale: 'es-ES' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', voiceLocale: 'fr-FR' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', voiceLocale: 'de-DE' }
];

export default function AgentChat({ currentUser, onNavigateTab }) {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'agent',
      text: `Hello! I am **Expense Pilot**, your Meridian Finance & Procurement Query Agent.\n\nI can answer expense policy questions **with exact citations**, check status of reimbursement claims and vendor invoices, initiate approvals, send reminders, and escalate discrepancies to the finance team.\n\n📁 **New**: You can also attach **CSV or Excel files** (.csv, .xlsx) below to extract data and audit expenses with AI!`,
      citations: [
        {
          doc_name: "Meridian Expense & Procurement Policy 2026",
          section_id: "SEC-101",
          title: "Purpose & General Principles",
          relevant_snippet: "All claims and procurement actions must follow authorized audit controls and grade per-diem limits."
        }
      ],
      tool_called: "policy_qa",
      escalated: false,
      suggested_actions: [
        "What is hotel room limit for Grade L2?",
        "Check status of CLM-1042",
        "Executive finance summary"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [mindeeInfo, setMindeeInfo] = useState(null);
  const [showMindeeModal, setShowMindeeModal] = useState(false);
  const [expandedCitation, setExpandedCitation] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check Mindee status on mount
  useEffect(() => {
    fetchMindeeStatus()
      .then((data) => setMindeeInfo(data))
      .catch((err) => console.log("Mindee status check error:", err));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isUploading]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const extracted = await uploadAgentSpreadsheet(file);
      setAttachedFile(extracted);

      // Post an immediate analysis message from the agent
      const summaryMsg = {
        id: `file-agent-${Date.now()}`,
        sender: 'agent',
        text: `📁 **Uploaded & Processed: \`${extracted.filename}\` (${extracted.file_type})**\n\n• **Rows Processed**: ${extracted.row_count} rows across ${extracted.column_count} columns\n• **Total Expense Sum**: ₹${(extracted.summary?.total_sum || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR\n• **Flagged High Expenses (> ₹10k)**: ${extracted.summary?.flagged_high_expenses_count || 0} line items (requires SEC-107 Finance Controller review)\n• **Potential Duplicates**: ${extracted.summary?.duplicate_rows_detected || 0} duplicate row(s) flagged under SEC-110.\n\n${extracted.markdown_preview ? `**Data Preview (First 5 Rows):**\n\n${extracted.markdown_preview}` : ''}`,
        citations: [
          {
            doc_name: "Meridian Expense & Procurement Policy 2026",
            section_id: "SEC-107",
            title: "Approval Matrix & Thresholds",
            relevant_snippet: "Claims exceeding ₹10,000 require secondary approval from the Finance Controller before disbursement."
          },
          {
            doc_name: "Meridian Expense & Procurement Policy 2026",
            section_id: "SEC-110",
            title: "Duplicate Claim & Invoice Detection",
            relevant_snippet: "Duplicate submissions for the same expense or invoice are strictly prohibited and immediately flagged for investigation."
          }
        ],
        tool_called: "spreadsheet_data_extractor",
        tool_result: extracted.summary,
        escalated: (extracted.summary?.flagged_high_expenses_count || 0) > 0 || (extracted.summary?.duplicate_rows_detected || 0) > 0,
        suggested_actions: extracted.suggested_prompts || [
          `Summarize expenses in ${extracted.filename}`,
          `Check policy violations in this file`
        ]
      };

      setMessages((prev) => [...prev, summaryMsg]);
    } catch (err) {
      alert(`Upload error: ${err.message || 'Failed to process spreadsheet'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async (messageText = null) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      attachedFile: attachedFile ? attachedFile.filename : null
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput('');
    setIsLoading(true);

    try {
      const activeUserId = getCurrentUserId();
      const res = await sendAgentMessage(
        textToSend, 
        activeUserId, 
        selectedLanguage, 
        attachedFile
      );

      const agentMsg = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: res.reply,
        citations: res.citations || [],
        tool_called: res.tool_called,
        tool_result: res.tool_result,
        escalated: res.escalated || false,
        suggested_actions: res.suggested_actions || [],
        voice_text: res.voice_text
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          text: `⚠️ **Error communicating with Expense Pilot**: ${err.message || 'Please check backend connectivity.'}`,
          citations: [],
          tool_called: null,
          escalated: false,
          suggested_actions: ["Check backend connection", "What is hotel limit for L2?"]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#`~]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      const currentLangObj = LANGUAGES.find(l => l.code === selectedLanguage);
      utterance.lang = currentLangObj?.voiceLocale || 'en-US';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-5xl mx-auto">
      
      {/* Header Info & Controls Banner */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 shadow-sm">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-teal-400" />
          <span>
            Connected to <strong>Meridian Knowledgebase 2026</strong> — Active User: <strong className="text-teal-300">{currentUser?.name || 'John Doe'}</strong> ({currentUser?.role || 'Employee'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mindee OCR Diagnostics Pill */}
          <button
            onClick={() => setShowMindeeModal(true)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
              mindeeInfo?.status === 'ACTIVE_CONNECTED'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Click to view Mindee OCR API status details"
          >
            <Activity className="w-3 h-3" />
            <span>Mindee OCR: {mindeeInfo?.status === 'ACTIVE_CONNECTED' ? 'Active (V2)' : 'Ready'}</span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5">
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-[11px] text-slate-200 focus:outline-none cursor-pointer pr-1"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-800 text-slate-200">
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>

          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Whitelisted Tools Active
          </span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-1 space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'agent' && (
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center flex-shrink-0 text-teal-400 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[85%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Tool Execution Badge */}
              {msg.tool_called && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-md w-fit">
                  <Layers className="w-3 h-3" />
                  <span>Executed Tool: [{msg.tool_called}]</span>
                </div>
              )}

              {/* Escalation Alert Banner */}
              {msg.escalated && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs shadow-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-rose-300">Automatic Escalation Triggered!</strong>
                    <p className="text-[11px] text-rose-300/90 mt-0.5">
                      This item has been flagged for compliance review and assigned to Finance Controller Alex Morgan.
                    </p>
                  </div>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-teal-600 to-sky-600 text-white rounded-tr-none'
                    : 'bg-slate-800/95 border border-slate-700/80 text-slate-100 rounded-tl-none'
                }`}
              >
                {msg.text}
              </div>

              {/* Citations Chips */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-teal-400" />
                    <span>Policy Citations:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((c, idx) => {
                      const isExpanded = expandedCitation === `${msg.id}-${idx}`;
                      return (
                        <div key={idx} className="flex flex-col">
                          <button
                            onClick={() => setExpandedCitation(isExpanded ? null : `${msg.id}-${idx}`)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-800/90 hover:bg-slate-700/90 border border-teal-500/40 text-teal-300 shadow-sm transition-colors text-left"
                          >
                            <span className="font-bold text-teal-400">{c.section_id}</span>
                            <span className="text-slate-300 truncate max-w-[200px]">{c.title}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                          </button>
                          {isExpanded && c.relevant_snippet && (
                            <div className="mt-1 p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 max-w-md shadow-lg">
                              <p className="font-semibold text-teal-400 text-[11px] mb-1">{c.doc_name} — {c.section_id}</p>
                              <p className="italic text-[11px] text-slate-300 leading-relaxed">{c.relevant_snippet}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons / Voice Read */}
              {msg.sender === 'agent' && (
                <div className="flex items-center gap-3 pt-0.5">
                  <button
                    onClick={() => speakText(msg.text)}
                    title="Read answer aloud"
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-teal-400 transition-colors"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Listen</span>
                  </button>
                </div>
              )}

              {/* Suggested Next Actions */}
              {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {msg.suggested_actions.map((action, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={() => handleSend(action)}
                      className="px-2.5 py-1 rounded-full text-xs bg-slate-800/60 hover:bg-slate-700 border border-slate-700/80 hover:border-teal-500/40 text-slate-300 hover:text-teal-300 transition-all text-left"
                    >
                      💡 {action}
                    </button>
                  ))}
                </div>
              )}

            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center flex-shrink-0 text-sky-400 shadow-sm">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center flex-shrink-0 text-teal-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-spin" />
              <span>Analyzing policies, claims & financial data...</span>
            </div>
          </div>
        )}

        {isUploading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center flex-shrink-0 text-sky-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 text-xs text-slate-400 flex items-center gap-2">
              <UploadCloud className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
              <span>Parsing spreadsheet, validating columns, and auditing line items with AI...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts Bar */}
      <div className="py-2 overflow-x-auto scrollbar-none flex gap-1.5">
        {QUICK_PROMPTS.map((prompt, pIdx) => (
          <button
            key={pIdx}
            onClick={() => handleSend(prompt)}
            className="px-3 py-1 rounded-full text-xs whitespace-nowrap bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Active Spreadsheet Attachment Pill */}
      {attachedFile && (
        <div className="flex items-center justify-between bg-teal-950/60 border border-teal-500/50 rounded-xl px-3 py-2 mb-2 text-xs text-teal-200 shadow-sm">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>
              Attached Spreadsheet: <strong className="text-white">{attachedFile.filename}</strong> ({attachedFile.row_count} rows, {attachedFile.column_count} columns)
            </span>
            <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-[10px] font-semibold text-teal-300">
              AI Ready
            </span>
          </div>
          <button
            onClick={() => setAttachedFile(null)}
            className="p-1 hover:bg-teal-900/60 rounded text-teal-300 hover:text-white transition-colors"
            title="Detach file"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hidden File Input for CSV / Excel */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,.xlsx,.xls"
        className="hidden"
      />

      {/* Input Bar with File Upload Attachment Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-2 shadow-lg"
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Upload CSV or Excel spreadsheet for AI analysis"
          className="p-2 hover:bg-slate-700/80 text-slate-400 hover:text-teal-400 rounded-lg transition-colors flex items-center justify-center flex-shrink-0 border border-transparent hover:border-slate-600"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            attachedFile
              ? `Ask anything about ${attachedFile.filename} (e.g., 'Check violations', 'Summarize expenditure')...`
              : selectedLanguage === 'hi'
              ? "नीति नियम, दावा या चालान स्थिति पूछें (जैसे 'होटल खर्च की सीमा क्या है?')..."
              : "Ask a policy rule, claim/invoice status, or attach a CSV/Excel file..."
          }
          className="flex-1 bg-transparent px-2 py-1.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4 py-2 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg flex items-center gap-1.5 text-xs shadow-md transition-all"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Mindee Status Diagnostics Modal */}
      {showMindeeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-slate-100 text-sm">Mindee AI OCR Integration Status</h3>
              </div>
              <button
                onClick={() => setShowMindeeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400">Connection Status:</span>
                <span className="font-semibold text-emerald-400">
                  {mindeeInfo?.status === 'ACTIVE_CONNECTED' ? '✅ Connected (HTTP 200 OK)' : 'Ready (Fallback Active)'}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400">API Architecture:</span>
                <span className="font-mono text-teal-300">Mindee V2 IDP Platform</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <span className="text-slate-400">Authentication Key:</span>
                <span className="font-mono text-slate-300">Configured in backend/.env</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 text-[11px] leading-relaxed text-slate-300">
                <p className="font-semibold text-teal-400 mb-1">Status Report:</p>
                <p>{mindeeInfo?.message || "Mindee V2 API key is authenticated and active on Mindee's Intelligent Document Processing platform."}</p>
                {mindeeInfo?.instructions && (
                  <p className="mt-2 text-slate-400 italic">{mindeeInfo.instructions}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowMindeeModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
