import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Send, 
  CheckCircle2, 
  X, 
  Sparkles, 
  ShieldCheck, 
  MessageSquare, 
  BellRing, 
  RefreshCw, 
  Clock, 
  ArrowRight, 
  Sliders, 
  Check, 
  Radio,
  Users,
  UserCheck,
  FileText,
  AlertTriangle,
  AlertCircle,
  Copy,
  Share2
} from 'lucide-react';
import { 
  fetchPhoneSettings, 
  savePhoneSettings, 
  fetchNotificationHistory, 
  sendTestPhoneMessage, 
  dispatchPhoneSummary, 
  dispatchPhoneRoadmap,
  fetchTelegramInfo,
  sendTelegramTest,
  dispatchAnomaliesToTelegram,
  directSendMessage,
  fetchPhoneContacts
} from '../api';

export default function PhoneAlertsModal({ isOpen, onClose }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [activeChannel, setActiveChannel] = useState('SMS');
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' or 'personal'

  // Direct send state
  const [directName, setDirectName] = useState('Alex (Finance Reviewer)');
  const [directCountryCode, setDirectCountryCode] = useState('+91');
  const [directPhone, setDirectPhone] = useState('9997534798');
  const [directChannel, setDirectChannel] = useState('SMS');
  const [directContent, setDirectContent] = useState('');
  const [isDirectSending, setIsDirectSending] = useState(false);

  // Load user phone settings, contacts, and message history
  const loadData = async () => {
    try {
      const [setRes, histRes, contRes] = await Promise.all([
        fetchPhoneSettings(),
        fetchNotificationHistory(),
        fetchPhoneContacts().catch(() => [])
      ]);
      setSettings(setRes);
      setHistory(histRes);
      setContacts(contRes);

      if (setRes.phone_number) {
        const raw = setRes.phone_number.trim();
        if (raw.startsWith('+91')) {
          setCountryCode('+91');
          setPhoneNumber(raw.replace('+91', '').trim());
        } else if (raw.startsWith('+1')) {
          setCountryCode('+1');
          setPhoneNumber(raw.replace('+1', '').trim());
        } else {
          setPhoneNumber(raw);
        }
      }
    } catch (err) {
      console.warn("Notice loading phone settings:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const showFeedback = (msg, type = 'success') => {
    setActionFeedback({ msg, type });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleSavePhone = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      alert("Please enter a valid phone number");
      return;
    }

    setIsSaving(true);
    const fullNumber = `${countryCode} ${phoneNumber.trim()}`;

    try {
      const updated = await savePhoneSettings({
        phone_number: fullNumber,
        channel_sms: settings?.channel_sms ?? true,
        channel_whatsapp: settings?.channel_whatsapp ?? true,
        alert_daily_recap: settings?.alert_daily_recap ?? true,
        alert_anomaly: settings?.alert_anomaly ?? true,
        alert_budget_warning: settings?.alert_budget_warning ?? true,
      });
      setSettings(updated);
      showFeedback(`✅ Phone paired! Confirmation message sent to ${fullNumber}`);
      await loadData();
    } catch (err) {
      showFeedback("Failed to pair phone number", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleChannel = async (key) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    try {
      await savePhoneSettings({
        phone_number: settings.phone_number || `${countryCode} ${phoneNumber}`,
        channel_sms: newSettings.channel_sms,
        channel_whatsapp: newSettings.channel_whatsapp,
        channel_telegram: newSettings.channel_telegram,
        telegram_chat_id: newSettings.telegram_chat_id,
        alert_daily_recap: newSettings.alert_daily_recap,
        alert_anomaly: newSettings.alert_anomaly,
        alert_budget_warning: newSettings.alert_budget_warning
      });
      showFeedback("Alert preferences updated!");
    } catch (err) {
      showFeedback("Failed to update preferences", "error");
    }
  };

  const handleDispatchAnomalies = async () => {
    setIsSending(true);
    try {
      const res = await dispatchAnomaliesToTelegram();
      if (res?.connected) {
        showFeedback(`🚨 Dispatched PyOD Anomaly Scan (${res.anomalies_detected} flagged) to your Telegram!`);
      } else {
        showFeedback(res?.message || "Please link Telegram first by sending /start or your phone number to @Isehsgiwjsbot", "error");
      }
      await loadData();
    } catch (err) {
      showFeedback(err.message || "Failed to dispatch anomalies to Telegram", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTest = async () => {
    setIsSending(true);
    try {
      if (activeChannel === 'Telegram') {
        const res = await sendTelegramTest("user_default");
        showFeedback(`⚡ Telegram alert: ${res.status || 'Dispatched'}`);
      } else {
        const res = await sendTestPhoneMessage({
          phone_number: settings?.phone_number || `${countryCode} ${phoneNumber}`,
          channel: activeChannel
        });
        if (res?.whatsapp_url && activeChannel === 'WhatsApp') {
          window.open(res.whatsapp_url, '_blank');
        }
        showFeedback(`⚡ Delivered test ${activeChannel} alert! (ID: ${res.dispatch_id})`);
      }
      await loadData();
    } catch (err) {
      showFeedback("Failed to dispatch test message", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendDailyRecap = async () => {
    setIsSending(true);
    try {
      const res = await dispatchPhoneSummary(activeChannel);
      if (res?.whatsapp_url && activeChannel === 'WhatsApp') {
        window.open(res.whatsapp_url, '_blank');
      }
      showFeedback(`📊 Delivered Daily Budget Recap via ${activeChannel}!`);
      await loadData();
    } catch (err) {
      showFeedback("Failed to send daily recap", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendRoadmap = async () => {
    setIsSending(true);
    try {
      const res = await dispatchPhoneRoadmap(activeChannel);
      if (res?.whatsapp_url && activeChannel === 'WhatsApp') {
        window.open(res.whatsapp_url, '_blank');
      }
      showFeedback(`🗺️ Delivered 90-Day Roadmap Link via ${activeChannel}!`);
      await loadData();
    } catch (err) {
      showFeedback("Failed to send roadmap link", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectContact = (c) => {
    setDirectName(c.name);
    const raw = c.phone_number.trim();
    if (raw.startsWith('+91')) {
      setDirectCountryCode('+91');
      setDirectPhone(raw.replace('+91', '').trim());
    } else if (raw.startsWith('+1')) {
      setDirectCountryCode('+1');
      setDirectPhone(raw.replace('+1', '').trim());
    } else {
      setDirectPhone(raw);
    }
  };

  const handleApplyTemplate = (type) => {
    if (type === 'summary') {
      setDirectContent("📊 Expense Pilot: October spending total ₹43,250 across 18 transactions. Operations: ₹18,500. Budget status is healthy.");
    } else if (type === 'anomaly') {
      setDirectContent("⚠️ Anomaly Detected: Isolation Forest flagged unusual spending of ₹15,000 in Shopping. Review recommended.");
    } else if (type === 'budget') {
      setDirectContent("🚨 Budget Alert: 78% of monthly limit reached. Remaining safe allowance is ₹12,000.");
    }
  };

  const handleSendDirect = async (e) => {
    e.preventDefault();
    if (!directPhone.trim()) {
      alert("Please enter a valid recipient phone number");
      return;
    }
    if (!directContent.trim()) {
      alert("Please enter a message to send");
      return;
    }

    setIsDirectSending(true);
    const fullTarget = `${directCountryCode} ${directPhone.trim()}`;

    try {
      const res = await directSendMessage({
        recipient_name: directName.trim() || "Recipient",
        phone_number: fullTarget,
        channel: directChannel,
        message_type: "DIRECT_MESSAGE",
        content: directContent.trim()
      });
      if (res?.whatsapp_url && directChannel === 'WhatsApp') {
        window.open(res.whatsapp_url, '_blank');
      } else if (directChannel === 'Telegram') {
        window.open(`https://t.me/share/url?text=${encodeURIComponent(directContent.trim())}`, '_blank');
      }
      showFeedback(`🚀 Successfully dispatched to ${directName} (${fullTarget}) via ${directChannel}!`);
      await loadData();
    } catch (err) {
      showFeedback(err.message || "Failed to dispatch message", "error");
    } finally {
      setIsDirectSending(false);
    }
  };

  const handleOpenSmsApp = () => {
    if (!directPhone.trim()) {
      alert("Please enter a phone number");
      return;
    }
    const fullTarget = `${directCountryCode} ${directPhone.trim()}`;
    const cleanDigits = fullTarget.replace(/[^\d+]/g, '');
    const text = directContent.trim() || `[Expense Pilot] Update for ${directName}`;
    window.location.href = `sms:${cleanDigits}?&body=${encodeURIComponent(text)}`;
    showFeedback(`📱 Opening phone's native SMS app for ${cleanDigits}...`);
  };

  const handleOpenWhatsApp = () => {
    if (!directPhone.trim()) {
      alert("Please enter a phone number");
      return;
    }
    const fullTarget = `${directCountryCode} ${directPhone.trim()}`;
    const cleanDigits = fullTarget.replace(/[^\d]/g, '');
    const text = directContent.trim() || `[Expense Pilot] Update for ${directName}`;
    window.open(`https://wa.me/${cleanDigits}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyMessage = () => {
    if (!directContent.trim()) {
      alert("Please select a preset or type a message first");
      return;
    }
    navigator.clipboard.writeText(directContent.trim());
    showFeedback("📋 Message copied to clipboard!");
  };

  const handleSystemShare = async () => {
    const text = directContent.trim() || "Expense Pilot Report";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Expense Pilot: ${directName}`,
          text: text,
        });
        showFeedback("✅ Shared via phone system drawer!");
      } catch (e) {}
    } else {
      handleCopyMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-4xl max-h-[90vh] glass-panel-deep border border-white/10 bg-[#070d1d]/95 backdrop-blur-3xl rounded-3xl flex flex-col shadow-[0_0_90px_rgba(0,0,0,0.9)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/90 to-blue-600/90 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-white/30 backdrop-blur-xl">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-lg tracking-tight">
                  Phone Link & Direct Multi-Recipient Messaging
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Active Phone Gateway
                </span>
              </div>
              <p className="text-xs text-slate-400">Send real-time expense alerts and custom reports directly to any person's phone</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-btn transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 pb-1 border-b border-white/5 bg-slate-900/40 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('direct')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'direct'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Send to Another Person's Phone</span>
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'personal'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>My Phone Connection</span>
          </button>
        </div>

        {/* Feedback Banner */}
        {actionFeedback && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 border-b animate-fade-in ${
            actionFeedback.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionFeedback.msg}</span>
          </div>
        )}

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left 7 Columns: Setup & Configuration */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Telegram Bot Live Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-sky-950/40 via-blue-950/40 to-slate-900/60 border border-sky-500/35 backdrop-blur-xl space-y-2 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-white">
                          Telegram Bot: @Isehsgiwjsbot
                        </h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Live
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        Search <strong className="text-cyan-300 font-mono">@Isehsgiwjsbot</strong> in Telegram, or tap the button to open directly.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href="tg://resolve?domain=Isehsgiwjsbot"
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-md transition-all"
                    >
                      <span>Open Telegram</span>
                    </a>
                    <a
                      href="https://telegram.me/Isehsgiwjsbot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all"
                    >
                      <span>Web</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* TAB 1: SEND TO ANOTHER PERSON */}
              {activeTab === 'direct' && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Saved Contacts Selector */}
                  <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2.5">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Quick Recipient Selection:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {contacts.map((c) => (
                        <button
                          key={c.id || c.phone_number}
                          type="button"
                          onClick={() => handleSelectContact(c)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            directPhone === c.phone_number.replace(/^\+\d+\s*/, '')
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md'
                              : 'bg-white/[0.02] border-white/10 text-slate-300 hover:border-cyan-400/40 hover:text-white'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSendDirect} className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Send className="w-4 h-4 text-cyan-400" />
                        Recipient Details
                      </span>

                      {/* Channel selector */}
                      <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-[11px]">
                        {['SMS', 'WhatsApp', 'Telegram'].map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => setDirectChannel(ch)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                              directChannel === ch ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-5">
                        <label className="text-[10px] text-slate-400 block mb-1">Recipient Name</label>
                        <input
                          type="text"
                          value={directName}
                          onChange={(e) => setDirectName(e.target.value)}
                          placeholder="e.g. Alex (Finance)"
                          className="w-full glass-input rounded-xl px-3 py-2 text-xs text-white"
                          required
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <label className="text-[10px] text-slate-400 block mb-1">Phone Number</label>
                        <div className="flex gap-1.5">
                          <select
                            value={directCountryCode}
                            onChange={(e) => setDirectCountryCode(e.target.value)}
                            className="glass-input rounded-xl px-2 py-2 text-xs text-slate-200 bg-slate-900 border border-white/10 shrink-0"
                          >
                            <option value="+91">🇮🇳 +91</option>
                            <option value="+1">🇺🇸 +1</option>
                            <option value="+44">🇬🇧 +44</option>
                            <option value="+971">🇦🇪 +971</option>
                          </select>
                          <input
                            type="tel"
                            value={directPhone}
                            onChange={(e) => setDirectPhone(e.target.value)}
                            placeholder="e.g. 9997534798"
                            className="flex-1 glass-input rounded-xl px-3 py-2 text-xs text-white font-mono"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">1-Click Message Presets:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate('summary')}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Expense Summary</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate('anomaly')}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Anomaly Alert</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate('budget')}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <AlertCircle className="w-3 h-3" />
                          <span>Budget Warning</span>
                        </button>
                      </div>
                    </div>

                    {/* Message */}
                    <div>
                      <textarea
                        rows={2}
                        value={directContent}
                        onChange={(e) => setDirectContent(e.target.value)}
                        placeholder="Type message to send directly to recipient's phone..."
                        className="w-full glass-input rounded-xl p-2.5 text-xs text-white placeholder-slate-500 resize-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isDirectSending}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isDirectSending ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending to {directName}...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Message Directly to {directName} ({directCountryCode} {directPhone})</span>
                        </>
                      )}
                    </button>

                    {/* Quick Native Share Strip */}
                    <div className="pt-2 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={handleOpenSmsApp}
                        className="py-2 px-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Opens your device native Messages app"
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Phone SMS</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenWhatsApp}
                        className="py-2 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Open WhatsApp chat"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyMessage}
                        className="py-2 px-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/30 text-purple-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Copy text"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSystemShare}
                        className="py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title="Open native share sheet"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Share</span>
                      </button>
                    </div>
                  </form>

                </div>
              )}

              {/* TAB 2: PERSONAL PHONE SETTINGS */}
              {activeTab === 'personal' && (
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Phone Input Box */}
                  <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-cyan-400" />
                        Connected Mobile Number
                      </span>
                      {settings?.phone_number && (
                        <span className="text-[11px] text-cyan-300 font-mono bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-400/20">
                          Paired: {settings.phone_number}
                        </span>
                      )}
                    </div>

                    <form onSubmit={handleSavePhone} className="space-y-3">
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="glass-input rounded-2xl px-3 py-3 text-sm text-slate-200 bg-slate-900 border border-white/10 shrink-0"
                        >
                          <option value="+91">🇮🇳 +91 (IN)</option>
                          <option value="+1">🇺🇸 +1 (US)</option>
                          <option value="+44">🇬🇧 +44 (UK)</option>
                          <option value="+971">🇦🇪 +971 (UAE)</option>
                          <option value="+65">🇸🇬 +65 (SG)</option>
                        </select>

                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="e.g. 9997534798"
                          className="flex-1 glass-input rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500"
                        />

                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-5 py-3 rounded-2xl glass-btn-primary text-white font-bold text-xs shrink-0 shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all cursor-pointer"
                        >
                          {isSaving ? 'Connecting...' : 'Connect & Pair'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Pairing immediately sends an authentication SMS to verify your connection.
                      </p>
                    </form>
                  </div>

                  {/* Telegram Phone Pairing & Anomaly Detection Hub */}
                  <div className="p-5 rounded-3xl border border-sky-500/40 bg-gradient-to-br from-sky-950/30 via-slate-900/50 to-slate-900/80 backdrop-blur-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-sky-500/20 text-sky-400 font-mono text-xs">🤖</span>
                        Telegram Anomaly Protection (@Isehsgiwjsbot)
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        settings?.telegram_chat_id 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${settings?.telegram_chat_id ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                        {settings?.telegram_chat_id ? `Active (${settings.telegram_chat_id})` : 'Not Paired'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Connect your phone to receive <strong>real-time lock screen notifications</strong> whenever an anomaly or budget breach is detected by PyOD Isolation Forest.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <a
                        href="tg://resolve?domain=Isehsgiwjsbot"
                        onClick={() => {
                          setTimeout(() => window.open('https://t.me/Isehsgiwjsbot', '_blank'), 400);
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md transition-all text-center cursor-pointer"
                      >
                        <span>Open Bot (@Isehsgiwjsbot)</span>
                        <Radio className="w-3.5 h-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={handleDispatchAnomalies}
                        disabled={isSending}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-all text-center cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>{isSending ? 'Scanning...' : 'Push Anomalies to Phone'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Alert Channel Toggles */}
                  <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-3">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Autonomous Alert Triggers
                    </span>

                    <div className="space-y-2.5">
                      <div 
                        onClick={() => handleToggleChannel('channel_telegram')}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                            <Radio className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">Telegram Push Alerts (Direct & Free)</span>
                            <span className="text-[11px] text-slate-400">Lock-screen notifications with 0 SMS recharge required</span>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={settings?.channel_telegram ?? true} 
                          readOnly 
                          className="rounded accent-sky-500 w-4 h-4"
                        />
                      </div>
                      <div 
                        onClick={() => handleToggleChannel('channel_sms')}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">Direct Carrier SMS</span>
                            <span className="text-[11px] text-slate-400">Receive verified mobile text messages</span>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={settings?.channel_sms ?? true} 
                          readOnly 
                          className="rounded accent-cyan-500 w-4 h-4"
                        />
                      </div>

                      <div 
                        onClick={() => handleToggleChannel('channel_whatsapp')}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">WhatsApp Business Alerts</span>
                            <span className="text-[11px] text-slate-400">Instant PDF download links and invoices</span>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={settings?.channel_whatsapp ?? true} 
                          readOnly 
                          className="rounded accent-emerald-500 w-4 h-4"
                        />
                      </div>

                      <div 
                        onClick={() => handleToggleChannel('alert_anomaly')}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                            <BellRing className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">Anomaly & Over-Budget Pushes</span>
                            <span className="text-[11px] text-slate-400">Immediate push when anomalous spending is flagged</span>
                          </div>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={settings?.alert_anomaly ?? true} 
                          readOnly 
                          className="rounded accent-rose-500 w-4 h-4"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Instant Dispatch Actions */}
                  <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-3">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Trigger Message to Personal Phone
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        onClick={handleSendTest}
                        disabled={isSending}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl glass-btn text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 transition-all text-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span className="text-xs font-bold">Send Test Alert</span>
                      </button>

                      <button
                        onClick={handleSendDailyRecap}
                        disabled={isSending}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl glass-btn text-purple-300 border border-purple-500/30 hover:border-purple-400/60 transition-all text-center gap-1.5 cursor-pointer"
                      >
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-bold">Send Daily Recap</span>
                      </button>

                      <button
                        onClick={handleSendRoadmap}
                        disabled={isSending}
                        className="flex flex-col items-center justify-center p-3 rounded-2xl glass-btn text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/60 transition-all text-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold">Send Roadmap</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Right 5 Columns: Realistic Mobile Phone Screen Mockup Preview */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="w-full max-w-sm rounded-[40px] p-4 bg-gradient-to-b from-slate-800 to-slate-950 border-4 border-slate-700 shadow-2xl relative overflow-hidden">
                
                {/* Phone Speaker Notch */}
                <div className="flex justify-center mb-3">
                  <div className="w-20 h-4 bg-slate-900 rounded-full flex items-center justify-center gap-2">
                    <div className="w-8 h-1 bg-slate-700 rounded-full"></div>
                    <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
                  </div>
                </div>

                {/* Simulated Screen */}
                <div className="h-[460px] rounded-[28px] bg-[#0c1322] border border-white/5 flex flex-col overflow-hidden text-xs">
                  
                  {/* Phone Header */}
                  <div className="px-4 py-3 bg-[#11192e] border-b border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                        EP
                      </div>
                      <div>
                        <div className="font-bold text-white text-[11px] leading-tight">ExpensePilot AI</div>
                        <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Verified Financial Bot
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Carrier 5G</span>
                  </div>

                  {/* Messages Feed on Phone */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    <div className="text-center text-[9px] text-slate-500 my-1">
                      Today • Encrypted Financial Notification
                    </div>

                    {history.length === 0 ? (
                      <div className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-slate-300 text-[11px] leading-relaxed">
                        🚀 <strong>ExpensePilot AI Connected!</strong> Your phone number ({settings?.phone_number || '+91 9997534798'}) is linked. Enter a number or click "Send Test Alert".
                      </div>
                    ) : (
                      history.slice(0, 4).map((msg, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-slate-800/80 border border-white/10 text-slate-200 text-[11px] leading-relaxed shadow-sm animate-fade-in space-y-1">
                          <div className="flex items-center justify-between text-[9px] text-cyan-300 font-semibold">
                            <span>{msg.channel} • {msg.message_type}</span>
                            <span className="text-slate-400 font-mono">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-[10px] text-cyan-400 font-medium">
                            To: {msg.recipient_name || 'Contact'} ({msg.phone_number})
                          </div>
                          <div>{msg.content}</div>
                          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9px] text-slate-400 font-mono">
                            <span>{msg.dispatch_id}</span>
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> {msg.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Phone Footer Bar */}
                  <div className="p-2.5 bg-[#11192e] border-t border-white/[0.08] text-center text-[10px] text-slate-400">
                    Direct Recipient Gateway Active
                  </div>

                </div>

              </div>
            </div>

          </div>

          {/* Dispatched Messages History Log Table */}
          <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Live Dispatched Message Audit Log ({history.length})
              </span>
              <button
                onClick={loadData}
                className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 glass-btn px-2.5 py-1 rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] text-slate-400 text-[10px] uppercase font-semibold border-b border-white/[0.08]">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Recipient & Phone</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Content Dispatched</th>
                    <th className="py-2.5 px-3">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                        No messages dispatched yet.
                      </td>
                    </tr>
                  ) : (
                    history.slice(0, 10).map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.01]">
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-white block">{item.recipient_name || 'Contact'}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{item.phone_number}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.channel === 'WHATSAPP' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : item.channel === 'TELEGRAM'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {item.channel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-mono text-[10px]">
                          {item.message_type}
                        </td>
                        <td className="py-3 px-3 text-slate-300 max-w-md truncate">
                          {item.content}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-400/20 text-[10px]">
                            <Check className="w-3 h-3" /> {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
