import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  CornerDownLeft, 
  Wand2,
  TrendingDown,
  RotateCcw
} from 'lucide-react';
import { sendAgentMessage } from '../api';
import { formatCurrency } from '../utils/formatters';

const STARTER_PROMPTS = [
  "Today I spent ₹250 on food, ₹100 on petrol, and ₹500 on shopping.",
  "I spent ₹350 on dinner yesterday.",
  "How much did I spend this month?",
  "Where did most of my money go?",
  "How much can I spend per day?",
  "Can I afford a ₹1,200 purchase?",
  "What if I reduce shopping expenses by 20% next month?",
  "I want to save ₹5,000 in the next three months.",
  "Detect unusual expenses"
];

export default function AgentChat({ isOpen, onClose, onDataMutated }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'agent',
      text: "👋 Hi! I am **ExpensePilot AI**, your autonomous financial agent.\n\nYou can chat with me in plain English to record expenses, simulate budget what-ifs, analyze unusual transactions, or plan savings goals.\n\nTry clicking one of the suggested prompts below or type your own!",
      suggestedActions: [
        "Today I spent ₹250 on food, ₹100 on petrol, and ₹500 on shopping.",
        "How much did I spend this month?",
        "Can I afford a ₹1,200 purchase?",
        "What if I reduce shopping expenses by 20%?"
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    const userMsgId = Date.now().toString();
    const newMessages = [
      ...messages,
      { id: userMsgId, sender: 'user', text: text.trim() }
    ];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendAgentMessage(text.trim());
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: response.reply,
          toolCalled: response.tool_called,
          toolResult: response.tool_result,
          addedExpenses: response.structured_expenses_added,
          suggestedActions: response.suggested_actions || []
        }
      ]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-xl h-full glass-panel-deep border-l border-white/10 bg-[#070d1d]/85 backdrop-blur-3xl flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)] transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/90 to-blue-600/90 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-white/30 backdrop-blur-xl">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-white flex items-center gap-2 tracking-tight">
                ExpensePilot AI
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
                  Autonomous Cycle
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Observe → Analyze → Decide → Act</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-btn transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Message Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl px-5 py-3.5 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-500/90 to-blue-600/90 text-white shadow-[0_8px_25px_rgba(6,182,212,0.35),inset_0_1px_0_0_rgba(255,255,255,0.4)] border border-cyan-400/40 backdrop-blur-xl rounded-tr-none'
                    : 'bg-white/[0.06] border border-white/10 text-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.14)] backdrop-blur-xl rounded-tl-none'
                }`}
              >
                {/* Tool Badge */}
                {msg.toolCalled && (
                  <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-bold text-cyan-300 bg-cyan-500/20 border border-cyan-400/30 px-3 py-1 rounded-xl w-fit shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                    <Wand2 className="w-3 h-3" />
                    <span>Executed Tool: <code className="font-mono text-white">{msg.toolCalled}()</code></span>
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

                {/* Text Content */}
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>

              {/* Next Suggested Action Chips */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[85%]">
                  {msg.suggestedActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(action)}
                      className="text-xs px-3 py-1.5 rounded-xl glass-btn text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 transition-all text-left shadow-sm"
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
              <span>Pilot AI is analyzing and computing actions...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts Bar */}
        <div className="px-4 py-2 border-t border-white/[0.08] bg-black/20 overflow-x-auto whitespace-nowrap scrollbar-none">
          <div className="flex gap-2">
            {STARTER_PROMPTS.slice(0, 5).map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="text-[11px] px-3 py-1.5 rounded-xl glass-btn text-slate-300 hover:text-cyan-300 shrink-0 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-black/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2.5"
          >
            <input
              type="text"
              id="input-agent-chat"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 'Spent ₹250 on lunch' or 'What if I reduce shopping by 20%?'"
              className="flex-1 glass-input rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400"
            />
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
