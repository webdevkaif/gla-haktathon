import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Wand2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Download,
  FileText,
  Paperclip,
  Upload,
  Play,
  Square,
  ShieldCheck,
  Phone,
  PhoneCall,
  PhoneForwarded
} from 'lucide-react';
import { sendAgentMessage, uploadInvoiceFile, uploadExpenseCSV, uploadAgentFile, callDeviceViaAgent } from '../api';
import { sendNativeMobileNotification } from '../utils/mobileNotifications';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

const STARTER_PROMPTS = [
  "Call my phone with spending update",
  "Generate PDF for GLA Hackathon Presentation",
  "Generate image of a futuristic cyberpunk city",
  "Read webpage https://www.example.com",
  "Talk about my uploaded invoices",
  "How much did I spend this month?",
  "Where did most of my money go?",
  "Can I afford a ₹1,200 purchase?",
  "What if I reduce shopping expenses by 20%?",
  "Detect unusual expenses"
];

export default function AgentChat({ isOpen, onClose, onDataMutated, initialMessage }) {
  const { user } = useAuth();
  const activeUserName = user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : null) || 'Mohammad Kaif';

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'agent',
      text: `🎙️ **Hello ${activeUserName}! I'm ExpensePilot Voice AI**, your autonomous financial and invoice intelligence copilot. 🚀\n\nI can speak with you, audit your uploaded invoices, generate 1200x675 HD visuals, and synthesize custom Executive PDF reports on any project or budget.\n\nClick a quick voice prompt below or tap the **Microphone** to speak naturally!`,
      voiceText: `Hello ${activeUserName}! I am ExpensePilot Voice AI, your autonomous financial copilot. Ask me to introduce myself, generate a custom PDF report, or create visual cards!`,
      suggestedActions: [
        "Call my device",
        "Introduce yourself",
        "Generate PDF for GLA Hackathon Presentation",
        "Generate image of a red sports car",
        "Talk about my uploaded invoices"
      ]
    }
  ]);

  // Dynamically update greeting if user switches accounts
  useEffect(() => {
    setMessages(prev => {
      if (prev.length > 0 && prev[0].id === 'welcome') {
        return [
          {
            ...prev[0],
            text: `🎙️ **Hello ${activeUserName}! I'm ExpensePilot Voice AI**, your autonomous financial and invoice intelligence copilot. 🚀\n\nI can speak with you, audit your uploaded invoices, generate 1200x675 HD visuals, and synthesize custom Executive PDF reports on any project or budget.\n\nClick a quick voice prompt below or tap the **Microphone** to speak naturally!`,
            voiceText: `Hello ${activeUserName}! I am ExpensePilot Voice AI, your autonomous financial copilot. Ask me to introduce myself, generate a custom PDF report, or create visual cards!`
          },
          ...prev.slice(1)
        ];
      }
      return prev;
    });
  }, [activeUserName]);
  const [input, setInput] = useState('');
  const [attachedFileContext, setAttachedFileContext] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize Speech Recognition & Synthesis check
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition notice:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (initialMessage) {
        setInput(initialMessage);
      }
    }
  }, [messages, isOpen, initialMessage]);

  // Voice output synthesis helper
  const speakVoice = useCallback((text) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    
    try {
      window.speechSynthesis.cancel();
      // Clean up markdown syntax for clear speech
      let clean = text
        .replace(/[*_#`~]/g, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .replace(/[•\-–—]/g, ' ')
        .replace(/₹/g, ' rupees ')
        .replace(/\s+/g, ' ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select high-quality natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en'));
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
    }
  }, [isVoiceEnabled]);

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (!speechSupported) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      setInput('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Mic start notice:', err);
      }
    }
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    stopSpeaking();

    const userMsgId = Date.now().toString();
    const newMessages = [
      ...messages,
      { id: userMsgId, sender: 'user', text: text.trim() }
    ];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendAgentMessage(text.trim(), attachedFileContext, activeUserName, user?.id);
      const agentMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        text: response.reply,
        voiceText: response.voice_text,
        toolCalled: response.tool_called,
        toolResult: response.tool_result,
        addedExpenses: response.structured_expenses_added,
        suggestedActions: response.suggested_actions || [],
        pdfDownloadUrl: response.pdf_download_url || response.tool_result?.pdf_url,
        imageUrl: response.image_url || response.tool_result?.image_url,
        callInfo: response.call_info || response.tool_result?.call_info
      };

      setMessages((prev) => [...prev, agentMsg]);

      // Speak agent reply out loud
      if (response.voice_text || response.reply) {
        speakVoice(response.voice_text || response.reply);
      }

      if (response.tool_called === 'add_expense' || response.tool_called === 'create_saving_plan') {
        if (onDataMutated) onDataMutated();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: "⚠️ Sorry, I encountered an issue executing that request. Please try again.",
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload (CSV, Excel, PDF, Images, or TXT) from chat
  const handleFileUpload = async (e) => {
    const file = e.target?.files?.[0] || e;
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const isSpreadsheet = /\.(csv|xlsx|xls|xlsm|xltx|tsv)$/i.test(file.name);
    const isInvoiceDoc = /\.(pdf|png|jpg|jpeg|webp)$/i.test(file.name);

    try {
      // 1. Process via Intelligent File Extractor
      const extracted = await uploadAgentFile(formData);
      setAttachedFileContext(extracted);

      // 2. If it is a spreadsheet, also attempt background sync to ledger
      let syncResult = null;
      if (isSpreadsheet) {
        try {
          syncResult = await uploadExpenseCSV(formData);
          if (onDataMutated) onDataMutated();
        } catch (syncErr) {
          console.log("Expense auto-sync notice:", syncErr);
        }
      } else if (isInvoiceDoc) {
        try {
          await uploadInvoiceFile(formData);
          if (onDataMutated) onDataMutated();
        } catch (invErr) {
          console.log("Invoice OCR register notice:", invErr);
        }
      }

      // Build rich introductory breakdown
      const rowCount = extracted.row_count || 0;
      const totalSum = extracted.summary?.total_sum;
      const avgAmt = extracted.summary?.average_amount;
      const highItems = extracted.summary?.flagged_high_expenses || [];
      const dupRows = extracted.summary?.duplicate_rows || [];

      let introReply = `📊 **Successfully processed & analyzed "${file.name}"!**\n\n`;
      if (rowCount > 0) {
        introReply += `• **Extracted**: ${rowCount} row(s) across ${extracted.column_count || 0} column(s)\n`;
      }
      if (totalSum !== null && totalSum !== undefined) {
        introReply += `• **Total Amount**: ₹${Number(totalSum).toLocaleString('en-IN')} ${avgAmt ? `(Avg: ₹${Number(avgAmt).toLocaleString('en-IN')})` : ''}\n`;
      }
      if (highItems.length > 0) {
        introReply += `• ⚠️ **Policy Flag**: ${highItems.length} high-value expense(s) exceed ₹10,000 threshold (requires SEC-107 approval)\n`;
      }
      if (dupRows.length > 0) {
        introReply += `• ⚠️ **Duplicate Check**: ${dupRows.length} duplicate line item(s) detected\n`;
      }
      if (syncResult && syncResult.imported > 0) {
        introReply += `• ✅ **Ledger Sync**: ${syncResult.imported} transaction(s) synchronized into your monthly analytics database\n`;
      }
      if (extracted.summary?.text_summary) {
        introReply += `\n**Document Content Summary:**\n${extracted.summary.text_summary.slice(0, 350)}...\n`;
      }
      introReply += `\n📎 **I have attached this file to our conversation.** You can ask me anything about it—such as highest expenses, category breakdowns, vendor details, or compliance!`;

      const promptActions = extracted.suggested_prompts || [
        `Summarize everything in ${file.name}`,
        "What is the total expenditure in this file?",
        "Are there any policy violations or high expenses?",
        "Did you find any duplicate rows or anomalies?"
      ];

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'user',
          text: `📎 Attached file: **${file.name}** (${(file.size / 1024).toFixed(1)} KB)`
        },
        {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: introReply,
          voiceText: `Successfully processed ${file.name}. Total amount is ${totalSum ? 'rupees ' + Math.round(totalSum) : 'processed'}. Ask me anything about this file!`,
          suggestedActions: promptActions,
          filePreview: extracted.markdown_preview
        }
      ]);

      if (isVoiceEnabled) {
        speakVoice(`Successfully processed ${file.name}. Ask me anything about this file!`);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'agent',
          text: `❌ **Failed to process "${file.name}":**\n${err.message || 'Please check that the file is not corrupted.'}`,
          isError: true
        }
      ]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className={`w-full max-w-xl h-full glass-panel-deep border-l border-white/10 bg-[#070d1d]/90 backdrop-blur-3xl flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.85)] transition-transform relative ${
          isDragging ? 'ring-2 ring-cyan-400/80 bg-[#0a1530]/95' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const droppedFile = e.dataTransfer.files?.[0];
          if (droppedFile) processUploadedFile(droppedFile);
        }}
      >
        {/* Drag and Drop Active Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-cyan-950/80 backdrop-blur-md flex flex-col items-center justify-center border-2 border-dashed border-cyan-400 m-4 rounded-3xl pointer-events-none animate-fade-in">
            <Upload className="w-12 h-12 text-cyan-300 animate-bounce mb-3" />
            <h4 className="text-lg font-bold text-white">Drop your spreadsheet or receipt here!</h4>
            <p className="text-xs text-cyan-200 mt-1">Supports Excel (.xlsx, .xls, .xlsm) & CSV</p>
          </div>
        )}
        
        {/* Voice Agent Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            {/* Animated Pulsing Voice Avatar Orb */}
            <div className={`relative flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-500 border border-white/30 backdrop-blur-xl ${
              isSpeaking
                ? 'bg-gradient-to-tr from-violet-600 to-pink-500 shadow-[0_0_25px_rgba(217,70,239,0.7)] scale-105'
                : isListening
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-[0_0_25px_rgba(16,185,129,0.7)] scale-105'
                : 'bg-gradient-to-tr from-cyan-500/90 to-blue-600/90 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
            }`}>
              <Bot className={`w-5 h-5 text-white ${isSpeaking || isListening ? 'animate-bounce' : 'animate-pulse'}`} />
              
              {/* Dynamic Sound Wave Ring */}
              {(isSpeaking || isListening) && (
                <span className="absolute -inset-1 rounded-2xl border-2 border-cyan-400/60 animate-ping pointer-events-none"></span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  ExpensePilot Voice AI
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm transition-all ${
                  isSpeaking
                    ? 'bg-pink-500/20 text-pink-300 border-pink-400/40 animate-pulse'
                    : isListening
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 animate-pulse'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                }`}>
                  {isSpeaking ? 'Speaking Voice' : isListening ? 'Listening...' : 'Voice Ready'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Autonomous Voice Copilot • Invoices & Roadmap</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Device Call Button */}
            <button
              onClick={() => handleSend("Call my device with a voice spending update")}
              title="Call your paired phone / device directly with voice telemetry"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all cursor-pointer hover:scale-105"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Call Device</span>
            </button>

            {/* Audio Speech Mute / Unmute Toggle */}
            <button
              onClick={() => {
                if (isSpeaking) stopSpeaking();
                setIsVoiceEnabled(prev => !prev);
              }}
              title={isVoiceEnabled ? "Voice narration active (Click to mute)" : "Voice narration muted (Click to enable)"}
              className={`p-2.5 rounded-xl border transition-all ${
                isVoiceEnabled
                  ? 'glass-btn text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'glass-btn text-slate-500 border-white/10'
              }`}
            >
              {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                stopSpeaking();
                if (isListening) recognitionRef.current?.stop();
                onClose();
              }}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white glass-btn transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Audio Visualizer Banner (When Speaking or Listening) */}
        {(isSpeaking || isListening) && (
          <div className={`px-6 py-2.5 border-b flex items-center justify-between text-xs font-semibold backdrop-blur-xl animate-fade-in ${
            isListening
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-violet-500/10 border-violet-500/30 text-violet-300'
          }`}>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-current"></span>
              </span>
              <span>
                {isListening ? 'Listening to your speech... Speak clearly' : 'ExpensePilot is narrating response...'}
              </span>
            </div>
            
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <Square className="w-3 h-3 fill-current" /> Stop Audio
              </button>
            )}
          </div>
        )}

        {/* Chat Message Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-3xl px-5 py-4 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-500/90 to-blue-600/90 text-white shadow-[0_8px_25px_rgba(6,182,212,0.35),inset_0_1px_0_0_rgba(255,255,255,0.4)] border border-cyan-400/40 backdrop-blur-xl rounded-tr-none'
                    : 'bg-white/[0.06] border border-white/10 text-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.14)] backdrop-blur-xl rounded-tl-none'
                }`}
              >
                {/* Tool Badge */}
                {msg.toolCalled && (
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-400/30 px-3 py-1 rounded-xl shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                      <Wand2 className="w-3 h-3" />
                      <span>Action: <code className="font-mono text-white">{msg.toolCalled}()</code></span>
                    </div>

                    {/* Read Aloud Button */}
                    <button
                      onClick={() => speakVoice(msg.voiceText || msg.text)}
                      title="Read out loud"
                      className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Structured Newly Added Expenses Preview */}
                {msg.addedExpenses && msg.addedExpenses.length > 0 && (
                  <div className="my-2.5 space-y-2 p-3 rounded-2xl bg-black/40 border border-emerald-500/40 shadow-inner">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Added to Database:
                    </span>
                    {msg.addedExpenses.map((exp, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs text-slate-300 border-t border-white/[0.08] pt-1.5">
                        <span className="font-medium">{exp.description} ({exp.category})</span>
                        <span className="font-bold text-white text-sm">{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Interactive PDF Roadmap Card */}
                {msg.pdfDownloadUrl && (
                  <div className="my-3.5 p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-violet-950/30 to-indigo-950/40 border border-purple-400/40 shadow-[0_8px_30px_rgba(168,85,247,0.25)] backdrop-blur-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-purple-400/20">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">
                            {msg.toolResult?.custom_title || "Executive Financial Roadmap"}
                          </h4>
                          <p className="text-[11px] text-purple-200">
                            {msg.toolResult?.custom_notes || "Vector PDF-1.4 • High Resolution Print Ready"}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        Ready
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Format</span>
                        <span className="font-bold text-purple-300 text-xs">High-Res Vector PDF</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Engine</span>
                        <span className="font-bold text-emerald-400 text-xs">
                          {msg.toolResult?.craftmypdf_status?.status === "ACTIVE_AUTHENTICATED" ? "CraftMyPDF Cloud" : "Templated.io Studio"}
                        </span>
                      </div>
                    </div>

                    <a
                      href={msg.pdfDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download="ExpensePilot_Financial_Roadmap.pdf"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/30 hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Executive PDF Report</span>
                    </a>
                  </div>
                )}

                {/* Interactive Generated Visual Image Card */}
                {msg.imageUrl && (
                  <div className="my-3.5 p-3 rounded-2xl bg-black/40 border border-purple-500/40 shadow-xl overflow-hidden">
                    <img 
                      src={msg.imageUrl} 
                      alt="Generated Financial Card" 
                      className="w-full rounded-xl object-cover border border-white/10" 
                    />
                    <div className="flex items-center justify-between pt-2.5 px-1">
                      <span className="text-[11px] text-purple-200 font-mono">
                        {msg.toolResult?.engine || "1200x675 HD • AI Studio"} {msg.toolResult?.custom_text ? `• "${msg.toolResult.custom_text.slice(0, 30)}"` : ""}
                      </span>
                      <a 
                        href={msg.imageUrl} 
                        download={`Generated_${msg.toolResult?.custom_text ? msg.toolResult.custom_text.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20) : 'Visual'}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-200 border border-purple-400/30 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Image
                      </a>
                    </div>
                  </div>
                )}

                {/* Interactive Direct Device Voice Call HUD Card */}
                {msg.callInfo && (
                  <div className="my-3.5 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900/90 to-slate-950/95 border border-emerald-500/40 shadow-[0_8px_30px_rgba(16,185,129,0.25)] backdrop-blur-xl space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                      <div className="flex items-center gap-2.5">
                        <div className="relative p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                          <PhoneCall className="w-5 h-5 animate-pulse" />
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                        </div>
                        <div>
                          <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                            <span>Direct Device Voice Call</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                              Active
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-300">
                            Dialing Handset: <strong className="text-emerald-300 font-mono">{msg.callInfo.phone_number}</strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Spoken Voice Transcript */}
                    <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        Spoken Voice Transcript:
                      </span>
                      <p className="text-xs text-slate-200 italic leading-relaxed">
                        "{msg.callInfo.spoken_message}"
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <a
                        href={msg.callInfo.tel_url || `tel:${msg.callInfo.phone_number}`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition-all cursor-pointer"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>Answer / Dial Handset Now</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => speakVoice(msg.callInfo.spoken_message)}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer"
                        title="Listen to spoken audio in browser speaker"
                      >
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                        <span>Play Audio</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Text Content */}
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* File Markdown Preview */}
                {msg.filePreview && (
                  <div className="mt-3 p-3 rounded-2xl bg-black/60 border border-cyan-500/30 overflow-x-auto text-[11px] font-mono text-cyan-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">File Preview:</span>
                    <pre className="whitespace-pre font-mono">{msg.filePreview}</pre>
                  </div>
                )}
              </div>

              {/* Next Suggested Action Chips */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-2.5 mt-3 max-w-[92%]">
                  {msg.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(action)}
                      className="text-xs px-3.5 py-2 rounded-xl glass-btn text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 transition-all text-left shadow-sm hover:scale-[1.02]"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-white/[0.05] border border-white/10 text-slate-300 text-xs w-fit backdrop-blur-xl">
              <Bot className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>Pilot AI is analyzing and synthesizing actions...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Voice & Action Prompts Bar */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-black/20 overflow-x-auto whitespace-nowrap scrollbar-none">
          <div className="flex gap-3">
            {STARTER_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="text-xs px-3.5 py-2 rounded-xl glass-btn text-slate-300 hover:text-cyan-300 shrink-0 transition-all flex items-center gap-2 font-medium hover:scale-[1.02]"
              >
                {i < 3 && <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{prompt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hidden File Input for All Files: Spreadsheets, Invoices, PDFs, Images */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".csv,.xlsx,.xls,.xlsm,.xltx,.tsv,.pdf,.png,.jpg,.jpeg,.webp,.txt,.json,.md"
          className="hidden"
        />

        {/* Chat & Voice Input Bar */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-black/30 space-y-3">
          
          {/* Active Attached File Pill */}
          {attachedFileContext && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-cyan-950/60 border border-cyan-400/40 text-xs text-cyan-300 animate-fade-in shadow-md">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">
                  Attached: <strong className="text-white">{attachedFileContext.filename}</strong> ({attachedFileContext.file_type || 'FILE'})
                </span>
                {attachedFileContext.summary?.total_sum && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 font-mono shrink-0">
                    Total: ₹{Number(attachedFileContext.summary.total_sum).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAttachedFileContext(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white shrink-0 ml-2"
                title="Detach file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            {/* Upload File Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isLoading}
              title="Upload Receipt (PDF/Img) or Spreadsheet (CSV/Excel)"
              className="p-3 rounded-2xl glass-btn text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/40 transition-all shrink-0"
            >
              {isUploading ? <Upload className="w-4 h-4 animate-spin text-cyan-400" /> : <Paperclip className="w-4 h-4" />}
            </button>

            {/* Microphone Voice Button */}
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              title={isListening ? "Stop listening" : "Click to speak to Voice Agent"}
              className={`p-3 rounded-2xl transition-all shrink-0 ${
                isListening
                  ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse'
                  : 'glass-btn text-cyan-300 hover:text-cyan-200 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Text Input Field */}
            <input
              type="text"
              id="input-agent-chat"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening to your voice..." : "Ask Pilot AI or speak naturally..."}
              className={`flex-1 glass-input rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400 transition-all ${
                isListening ? 'border-emerald-500/50 bg-emerald-500/5' : ''
              }`}
            />

            {/* Send Button */}
            <button
              type="submit"
              id="btn-send-agent-chat"
              disabled={!input.trim() || isLoading}
              className="p-3 rounded-2xl glass-btn-primary text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
