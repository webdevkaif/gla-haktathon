import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare, 
  BellRing, 
  RefreshCw, 
  Clock, 
  Check, 
  ShieldCheck, 
  Key, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  Users,
  UserPlus,
  Trash2,
  Share2,
  AlertTriangle,
  FileText,
  UserCheck,
  Copy,
  ExternalLink
} from 'lucide-react';
import { 
  fetchPhoneSettings, 
  savePhoneSettings, 
  fetchNotificationHistory, 
  sendTestPhoneMessage, 
  dispatchPhoneSummary, 
  dispatchPhoneRoadmap,
  sendTelegramTest,
  dispatchAnomaliesToTelegram,
  directSendMessage,
  fetchPhoneContacts,
  addPhoneContact,
  deletePhoneContact
} from '../api';

export default function PhoneAlertsView({ onToggleChat }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [activeChannel, setActiveChannel] = useState('SMS');
  const [customText, setCustomText] = useState('');
  const [showCarrierSettings, setShowCarrierSettings] = useState(false);
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioFrom, setTwilioFrom] = useState('');

  // Tab State: 'direct' vs 'personal'
  const [activeTab, setActiveTab] = useState('direct');

  // Direct Message to Any Person State
  const [contacts, setContacts] = useState([]);
  const [directRecipientName, setDirectRecipientName] = useState('Alex (Finance Reviewer)');
  const [directCountryCode, setDirectCountryCode] = useState('+91');
  const [directPhoneNumber, setDirectPhoneNumber] = useState('9997534798');
  const [directChannel, setDirectChannel] = useState('SMS');
  const [directContent, setDirectContent] = useState('');
  const [isDirectSending, setIsDirectSending] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRole, setNewContactRole] = useState('Finance Reviewer');

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
    loadData();
  }, []);

  const showFeedback = (msg, type = 'success') => {
    setActionFeedback({ msg, type });
    setTimeout(() => setActionFeedback(null), 4500);
  };

  const handleSavePhone = async (e) => {
    e?.preventDefault();
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
        twilio_sid: twilioSid,
        twilio_token: twilioToken,
        twilio_from: twilioFrom
      });
      setSettings(updated);
      showFeedback(`✅ Phone connected! Verification message dispatched to ${fullNumber}`);
      await loadData();
    } catch (err) {
      showFeedback("Failed to save phone number", "error");
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
        alert_budget_warning: newSettings.alert_budget_warning,
        twilio_sid: twilioSid,
        twilio_token: twilioToken,
        twilio_from: twilioFrom
      });
      showFeedback("Notification channel updated!");
    } catch (err) {
      showFeedback("Failed to update preferences", "error");
    }
  };

  const handleSendTest = async (overrideChannel) => {
    setIsSending(true);
    const targetChan = overrideChannel || activeChannel;
    try {
      if (targetChan === 'Telegram' || targetChan === 'TELEGRAM') {
        const res = await sendTelegramTest("user_default", customText.trim() || undefined);
        showFeedback(`⚡ Delivered Telegram alert! Status: ${res.status}`);
      } else {
        const res = await sendTestPhoneMessage({
          phone_number: settings?.phone_number || `${countryCode} ${phoneNumber}`,
          channel: targetChan,
          custom_text: customText.trim() || undefined
        });
        if (res?.whatsapp_url && targetChan === 'WhatsApp') {
          window.open(res.whatsapp_url, '_blank');
        }
        showFeedback(`⚡ Delivered ${targetChan} alert! Status: ${res.status}`);
      }
      setCustomText('');
      await loadData();
    } catch (err) {
      showFeedback("Failed to dispatch message", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleDispatchAnomalies = async () => {
    setIsSending(true);
    try {
      const res = await dispatchAnomaliesToTelegram();
      if (res?.connected) {
        showFeedback(`🚨 Dispatched PyOD Anomaly Scan (${res.anomalies_detected} flagged) directly to your Telegram!`);
      } else {
        showFeedback(res?.message || "Please connect Telegram first by sending /start or your phone number to @Isehsgiwjsbot", "error");
      }
      await loadData();
    } catch (err) {
      showFeedback(err.message || "Failed to dispatch anomalies to Telegram", "error");
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
      showFeedback(`🚀 Delivered Financial Roadmap link via ${activeChannel}!`);
      await loadData();
    } catch (err) {
      showFeedback("Failed to send roadmap link", "error");
    } finally {
      setIsSending(false);
    }
  };

  // Direct Send Handlers
  const handleSelectContact = (contact) => {
    setDirectRecipientName(contact.name);
    const raw = contact.phone_number.trim();
    if (raw.startsWith('+91')) {
      setDirectCountryCode('+91');
      setDirectPhoneNumber(raw.replace('+91', '').trim());
    } else if (raw.startsWith('+1')) {
      setDirectCountryCode('+1');
      setDirectPhoneNumber(raw.replace('+1', '').trim());
    } else if (raw.startsWith('+44')) {
      setDirectCountryCode('+44');
      setDirectPhoneNumber(raw.replace('+44', '').trim());
    } else {
      setDirectPhoneNumber(raw);
    }
  };

  const handleApplyTemplate = (type) => {
    if (type === 'summary') {
      setDirectContent(`📊 Expense Pilot Report: October spending is currently ₹43,250 across 18 transactions. Operations: ₹18,500, Travel: ₹8,200. Budget status is within healthy boundaries.`);
    } else if (type === 'anomaly') {
      setDirectContent(`⚠️ Financial Anomaly Warning: Isolation Forest detected unusual spending of ₹15,000 under Shopping. Immediate reviewer verification recommended.`);
    } else if (type === 'budget') {
      setDirectContent(`🚨 Budget Alert: 78% of monthly allocated expense threshold reached. Remaining safe allowance is ₹12,000 for October.`);
    } else if (type === 'approval') {
      setDirectContent(`⚡ Action Required: 2 pending enterprise expense claims are awaiting your review and approval in Expense Pilot.`);
    }
  };

  const handleSendDirect = async (e) => {
    e?.preventDefault();
    if (!directPhoneNumber.trim()) {
      alert("Please enter a valid recipient phone number.");
      return;
    }
    if (!directContent.trim()) {
      alert("Please type a message or select one of the quick templates.");
      return;
    }

    setIsDirectSending(true);
    const fullTargetPhone = `${directCountryCode} ${directPhoneNumber.trim()}`;

    try {
      const res = await directSendMessage({
        recipient_name: directRecipientName.trim() || "Recipient",
        phone_number: fullTargetPhone,
        channel: directChannel,
        message_type: "DIRECT_MESSAGE",
        content: directContent.trim()
      });

      if (res?.whatsapp_url && directChannel === 'WhatsApp') {
        window.open(res.whatsapp_url, '_blank');
      } else if (directChannel === 'Telegram') {
        window.open(`https://t.me/share/url?text=${encodeURIComponent(directContent.trim())}`, '_blank');
      }

      showFeedback(`🚀 Successfully dispatched to ${directRecipientName} (${fullTargetPhone}) via ${directChannel}!`);
      await loadData();
    } catch (err) {
      showFeedback(err.message || "Failed to dispatch message to recipient", "error");
    } finally {
      setIsDirectSending(false);
    }
  };

  const handleOpenSmsApp = () => {
    if (!directPhoneNumber.trim()) {
      alert("Please enter a phone number");
      return;
    }
    const fullTargetPhone = `${directCountryCode} ${directPhoneNumber.trim()}`;
    const cleanDigits = fullTargetPhone.replace(/[^\d+]/g, '');
    const text = directContent.trim() || `[Expense Pilot] Update for ${directRecipientName}`;
    window.location.href = `sms:${cleanDigits}?&body=${encodeURIComponent(text)}`;
    showFeedback(`📱 Opening phone's native SMS app for ${cleanDigits}...`);
  };

  const handleOpenWhatsApp = () => {
    if (!directPhoneNumber.trim()) {
      alert("Please enter a phone number");
      return;
    }
    const fullTargetPhone = `${directCountryCode} ${directPhoneNumber.trim()}`;
    const cleanDigits = fullTargetPhone.replace(/[^\d]/g, '');
    const text = directContent.trim() || `[Expense Pilot] Update for ${directRecipientName}`;
    window.open(`https://wa.me/${cleanDigits}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyMessage = () => {
    if (!directContent.trim()) {
      alert("Please select a preset or type a message first");
      return;
    }
    navigator.clipboard.writeText(directContent.trim());
    showFeedback("📋 Message copied to clipboard! You can paste it into SMS, WhatsApp, or Email.");
  };

  const handleSystemShare = async () => {
    const text = directContent.trim() || "Expense Pilot Report";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Expense Pilot: ${directRecipientName}`,
          text: text,
        });
        showFeedback("✅ Shared via phone system drawer!");
      } catch (e) {}
    } else {
      handleCopyMessage();
    }
  };

  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) {
      alert("Please provide both name and phone number");
      return;
    }

    try {
      await addPhoneContact({
        name: newContactName.trim(),
        phone_number: newContactPhone.trim(),
        role: newContactRole.trim()
      });
      showFeedback(`Contact ${newContactName} added successfully!`);
      setNewContactName('');
      setNewContactPhone('');
      setShowAddContact(false);
      await loadData();
    } catch (err) {
      showFeedback("Failed to save contact", "error");
    }
  };

  const handleDeleteContactItem = async (contactId) => {
    try {
      await deletePhoneContact(contactId);
      showFeedback("Contact removed.");
      await loadData();
    } catch (err) {
      showFeedback("Failed to remove contact", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Direct Phone Dispatch & Multi-Recipient Messaging
              </h2>
              <p className="text-xs text-slate-400">
                Send real-time expense alerts, budget warnings, and custom reports directly to any person's phone.
              </p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-2xl bg-black/40 border border-emerald-500/40 backdrop-blur-xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-emerald-300">
            {settings?.is_connected ? `Active Target: ${settings.phone_number}` : 'Gateway Ready'}
          </span>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 max-w-md">
        <button
          onClick={() => setActiveTab('direct')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'direct'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Send to Another Person's Phone</span>
        </button>

        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'personal'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>My Device Connection</span>
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border backdrop-blur-xl animate-fade-in ${
          actionFeedback.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionFeedback.msg}</span>
        </div>
      )}

      {/* Main Grid: Settings & Phone Screen Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 cols): Active Tab Views */}
        <div className="lg:col-span-7 space-y-6">

          {/* Telegram Autonomous Bot Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-sky-950/40 via-blue-950/40 to-slate-900/60 border border-sky-500/35 backdrop-blur-xl space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30 shadow-[0_0_15px_rgba(14,165,233,0.35)]">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-extrabold text-white">
                      Telegram Autonomous Bot
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Live • @Isehsgiwjsbot
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Search <strong className="text-cyan-300 font-mono">@Isehsgiwjsbot</strong> in Telegram, or tap the button to open directly.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="tg://resolve?domain=Isehsgiwjsbot"
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-105"
                >
                  <span>Open Telegram App</span>
                </a>
                <a
                  href="https://telegram.me/Isehsgiwjsbot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-all"
                >
                  <span>Web</span>
                </a>
              </div>
            </div>
          </div>

          {/* TAB 1: SEND DIRECTLY TO ANOTHER PERSON */}
          {activeTab === 'direct' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Quick Contacts Bar */}
              <div className="glass-panel p-5 rounded-3xl border border-white/10 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Saved Recipient Contacts
                  </span>
                  <button
                    onClick={() => setShowAddContact(prev => !prev)}
                    className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 bg-cyan-500/10 px-2.5 py-1 rounded-xl border border-cyan-400/20 hover:scale-105 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{showAddContact ? 'Cancel' : 'Add New Person'}</span>
                  </button>
                </div>

                {/* Add Contact Inline Drawer */}
                {showAddContact && (
                  <form onSubmit={handleAddContactSubmit} className="p-4 rounded-2xl bg-white/[0.03] border border-cyan-500/30 space-y-3 animate-fade-in">
                    <span className="text-xs font-bold text-white block">Add Contact to Phone Book</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Name (e.g. Accountant)"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        className="glass-input rounded-xl px-3 py-2 text-xs text-white"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Phone (e.g. +91 9997534798)"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        className="glass-input rounded-xl px-3 py-2 text-xs text-white"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Role (e.g. Auditor, Spouse)"
                        value={newContactRole}
                        onChange={(e) => setNewContactRole(e.target.value)}
                        className="glass-input rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-white transition-all shadow-md cursor-pointer"
                    >
                      Save Recipient Contact
                    </button>
                  </form>
                )}

                {/* Contacts Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {contacts.map((c) => (
                    <div
                      key={c.id || c.phone_number}
                      onClick={() => handleSelectContact(c)}
                      className={`cursor-pointer px-3 py-2 rounded-2xl border text-xs flex items-center gap-2 transition-all ${
                        directPhoneNumber === c.phone_number.replace(/^\+\d+\s*/, '')
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20 scale-[1.02]'
                          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-cyan-400/40 hover:text-white'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <div>
                        <div className="font-bold leading-tight">{c.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.phone_number}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContactItem(c.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 ml-1"
                        title="Delete contact"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct Send Form */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 backdrop-blur-xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Send className="w-4 h-4 text-cyan-400" />
                    Enter Recipient Phone & Send Direct Message
                  </span>
                  
                  {/* Channel Selector */}
                  <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-2xl border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setDirectChannel('SMS')}
                      className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                        directChannel === 'SMS' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectChannel('WhatsApp')}
                      className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                        directChannel === 'WhatsApp' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectChannel('Telegram')}
                      className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                        directChannel === 'Telegram' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Telegram
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSendDirect} className="space-y-4">
                  {/* Recipient Details Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Recipient Name
                      </label>
                      <input
                        type="text"
                        value={directRecipientName}
                        onChange={(e) => setDirectRecipientName(e.target.value)}
                        placeholder="e.g. Alex (Finance)"
                        className="w-full glass-input rounded-2xl px-3.5 py-2.5 text-xs text-white"
                        required
                      />
                    </div>

                    <div className="sm:col-span-8">
                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                        Recipient Phone Number
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={directCountryCode}
                          onChange={(e) => setDirectCountryCode(e.target.value)}
                          className="glass-input rounded-2xl px-3 py-2.5 text-xs text-slate-200 bg-slate-900 border border-white/10 shrink-0"
                        >
                          <option value="+91">🇮🇳 +91 (India)</option>
                          <option value="+1">🇺🇸 +1 (USA)</option>
                          <option value="+44">🇬🇧 +44 (UK)</option>
                          <option value="+971">🇦🇪 +971 (UAE)</option>
                          <option value="+65">🇸🇬 +65 (Singapore)</option>
                          <option value="+61">🇦🇺 +61 (Australia)</option>
                        </select>

                        <input
                          type="tel"
                          value={directPhoneNumber}
                          onChange={(e) => setDirectPhoneNumber(e.target.value)}
                          placeholder="e.g. 9997534798"
                          className="flex-1 glass-input rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Message Templates */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400">
                        1-Click Quick Presets (Populates with real live system data):
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('summary')}
                        className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Spend Summary</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('anomaly')}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Anomaly Alert</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('budget')}
                        className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Budget Warning</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('approval')}
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pending Claim</span>
                      </button>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Message Content to Dispatch
                    </label>
                    <textarea
                      rows={3}
                      value={directContent}
                      onChange={(e) => setDirectContent(e.target.value)}
                      placeholder="Type your message here, or click one of the quick presets above..."
                      className="w-full glass-input rounded-2xl p-3 text-xs text-white placeholder-slate-500 resize-none"
                      required
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                      <span>Gateway: {directChannel} Direct Carrier & Gateway Engine</span>
                      <span>{directContent.length} characters</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isDirectSending}
                    className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/25 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isDirectSending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Dispatching to {directRecipientName}...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          Send Message Directly to {directRecipientName || 'Recipient'} ({directCountryCode} {directPhoneNumber || '...'})
                        </span>
                      </>
                    )}
                  </button>

                  {/* 1-Click Direct Share Strip */}
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 block">
                      Or Open & Share Instantly via Your Device Apps:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={handleOpenSmsApp}
                        className="py-2.5 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Opens your phone's native SMS Messages app with text pre-filled"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Phone SMS App</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenWhatsApp}
                        className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Opens WhatsApp chat with recipient and message"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyMessage}
                        className="py-2.5 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/30 text-purple-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Copy message to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSystemShare}
                        className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Open device native share drawer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Sheet</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* TAB 2: PERSONAL PHONE SETTINGS */}
          {activeTab === 'personal' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Card 1: Enter Phone Number */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    Connect Your Personal Mobile Number
                  </span>
                  <span className="text-[11px] text-cyan-300 font-mono bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-400/20">
                    Gateway: Active
                  </span>
                </div>

                <form onSubmit={handleSavePhone} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="glass-input rounded-2xl px-3 py-3 text-sm text-slate-200 bg-slate-900 border border-white/10 shrink-0"
                    >
                      <option value="+91">🇮🇳 +91 (India)</option>
                      <option value="+1">🇺🇸 +1 (USA / Canada)</option>
                      <option value="+44">🇬🇧 +44 (UK)</option>
                      <option value="+971">🇦🇪 +971 (UAE)</option>
                      <option value="+65">🇸🇬 +65 (Singapore)</option>
                      <option value="+61">🇦🇺 +61 (Australia)</option>
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
                      className="px-6 py-3 rounded-2xl glass-btn-primary text-white font-bold text-xs shrink-0 shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all text-center cursor-pointer"
                    >
                      {isSaving ? 'Connecting...' : 'Connect & Pair Phone'}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Connecting your number registers your phone to receive personal approval reminders and anomaly alerts.
                  </p>
                </form>
              </div>

              {/* Telegram Phone Pairing & Anomaly Detection Hub */}
              <div className="glass-panel p-6 rounded-3xl border border-sky-500/40 bg-gradient-to-br from-sky-950/30 via-slate-900/50 to-slate-900/80 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-sky-500/20 text-sky-400 font-mono text-sm">🤖</span>
                    Telegram Bot Anomaly Protection (@Isehsgiwjsbot)
                  </span>
                  <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                    settings?.telegram_chat_id 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${settings?.telegram_chat_id ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    {settings?.telegram_chat_id ? `Active • Chat ID: ${settings.telegram_chat_id}` : 'Not Connected'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pairs your mobile device with the <strong>ExpensePilot AI Telegram Bot</strong>. Once linked, the backend automatically sends <strong>real-time lock screen notifications</strong> whenever an anomaly, sudden expense spike, or budget threshold breach is detected!
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <a
                      href="tg://resolve?domain=Isehsgiwjsbot"
                      onClick={() => {
                        setTimeout(() => window.open('https://t.me/Isehsgiwjsbot', '_blank'), 400);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all text-center cursor-pointer"
                    >
                      <span>Open Bot (@Isehsgiwjsbot)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={handleDispatchAnomalies}
                      disabled={isSending}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-xs transition-all text-center cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isSending ? 'Scanning...' : 'Test Anomaly Alert'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendTest('TELEGRAM')}
                      disabled={isSending}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/10 font-bold text-xs transition-all text-center cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Send Test Ping</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                    <div className="font-semibold text-slate-200">How to Connect in 2 Steps:</div>
                    <div className="text-[11px]">1. Open Telegram app on phone & search <code>@Isehsgiwjsbot</code></div>
                    <div className="text-[11px]">2. Tap <strong>START</strong> or send your phone number (<code>{phoneNumber || '9997534798'}</code>) in chat.</div>
                    <div className="text-[10px] text-emerald-400 font-medium">✓ Phone and project will link instantly with 0 SMS credits needed.</div>
                  </div>
                </div>
              </div>

              {/* Card 2: Notification Channel Preferences */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 backdrop-blur-xl space-y-4">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Autonomous Push Channels & Alert Rules
                </span>

                <div className="space-y-3">
                  <div 
                    onClick={() => handleToggleChannel('channel_telegram')}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/[0.06] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Telegram Push Notifications (Free & Instant)</div>
                        <div className="text-[11px] text-slate-400">Lock-screen notifications with 0 carrier SMS credits needed</div>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings?.channel_telegram ?? true} 
                      readOnly 
                      className="rounded accent-sky-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <div 
                    onClick={() => handleToggleChannel('channel_sms')}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/[0.06] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">SMS Notifications</div>
                        <div className="text-[11px] text-slate-400">Receive instant SMS alerts directly to your phone</div>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings?.channel_sms ?? true} 
                      readOnly 
                      className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div 
                    onClick={() => handleToggleChannel('channel_whatsapp')}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/[0.06] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">WhatsApp Business Alerts</div>
                        <div className="text-[11px] text-slate-400">Formatted cards with quick-approval buttons</div>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings?.channel_whatsapp ?? true} 
                      readOnly 
                      className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div 
                    onClick={() => handleToggleChannel('alert_anomaly')}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/[0.06] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                        <BellRing className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Financial Anomaly Flash Warnings</div>
                        <div className="text-[11px] text-slate-400">Instant alert when PyOD flags suspicious expense</div>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings?.alert_anomaly ?? true} 
                      readOnly 
                      className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Send Live Test to Personal Device */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 backdrop-blur-xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Dispatch Real-Time Message to Personal Phone
                  </span>

                  <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/10 text-xs">
                    <button
                      onClick={() => setActiveChannel('SMS')}
                      className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        activeChannel === 'SMS' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      SMS
                    </button>
                    <button
                      onClick={() => setActiveChannel('WhatsApp')}
                      className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        activeChannel === 'WhatsApp' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => setActiveChannel('Telegram')}
                      className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                        activeChannel === 'Telegram' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Telegram
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <button
                    onClick={handleSendTest}
                    disabled={isSending}
                    className="flex flex-col items-center justify-center p-3.5 rounded-2xl glass-btn text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 transition-all text-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span className="text-xs font-bold">Send Test Alert</span>
                    <span className="text-[10px] text-slate-400">Verify phone connection</span>
                  </button>

                  <button
                    onClick={handleSendDailyRecap}
                    disabled={isSending}
                    className="flex flex-col items-center justify-center p-3.5 rounded-2xl glass-btn text-purple-300 border border-purple-500/30 hover:border-purple-400/60 transition-all text-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold">Send Daily Recap</span>
                    <span className="text-[10px] text-slate-400">Today's allowance & spent</span>
                  </button>

                  <button
                    onClick={handleSendRoadmap}
                    disabled={isSending}
                    className="flex flex-col items-center justify-center p-3.5 rounded-2xl glass-btn text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/60 transition-all text-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold">Send Roadmap PDF</span>
                    <span className="text-[10px] text-slate-400">90-Day report download link</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right Column (5 cols): Interactive Smartphone Device Mockup Screen */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-sm rounded-[44px] p-4 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-4 border-slate-700 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
            
            {/* Phone Speaker Notch */}
            <div className="flex justify-center mb-3">
              <div className="w-24 h-4 bg-slate-900 rounded-full flex items-center justify-center gap-2 border border-slate-700/50">
                <div className="w-8 h-1 bg-slate-600 rounded-full"></div>
                <div className="w-2 h-2 bg-cyan-500/80 rounded-full animate-pulse"></div>
              </div>
            </div>

            {/* Simulated Phone Screen */}
            <div className="h-[520px] rounded-[30px] bg-[#0c1322] border border-white/5 flex flex-col overflow-hidden text-xs">
              
              {/* Phone Header */}
              <div className="px-4 py-3 bg-[#11192e] border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                    EP
                  </div>
                  <div>
                    <div className="font-bold text-white text-[11px] leading-tight flex items-center gap-1">
                      ExpensePilot AI
                      <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div className="text-[9px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live Phone Dispatcher
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">5G • Online</span>
              </div>

              {/* Message Feed Display */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                <div className="text-center text-[9px] text-slate-500 my-1">
                  Dispatched Financial Feeds & Direct SMS
                </div>

                {history.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-slate-300 text-[11px] leading-relaxed">
                    🚀 <strong>Phone Gateway Connected!</strong> Enter any recipient's phone number or click "Send Test Alert" to see live dispatches here.
                  </div>
                ) : (
                  history.slice(0, 6).map((msg, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-slate-800/90 border border-white/10 text-slate-100 text-[11px] leading-relaxed shadow-md animate-fade-in space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] text-cyan-300 font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/20">
                          {msg.channel} • {msg.message_type}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Recipient tag if present */}
                      <div className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                        <span>To: {msg.recipient_name || 'Personal Handset'}</span>
                        <span className="text-slate-400 font-mono">({msg.phone_number})</span>
                      </div>

                      <div className="text-slate-200">{msg.content}</div>

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

              {/* Phone Footer */}
              <div className="p-2.5 bg-[#11192e] border-t border-white/[0.08] text-center text-[10px] text-slate-400">
                Direct Recipient Gateway Active
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* Dispatched Messages Audit Log Table */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Live Dispatched Messages to Other Persons ({history.length} Messages)
          </span>
          <button
            onClick={loadData}
            className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 glass-btn px-3 py-1.5 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-slate-400 text-[10px] uppercase font-semibold border-b border-white/[0.08]">
              <tr>
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3.5">Recipient & Phone</th>
                <th className="py-3 px-3.5">Channel</th>
                <th className="py-3 px-3.5">Type</th>
                <th className="py-3 px-3.5">Dispatched Message</th>
                <th className="py-3 px-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No messages dispatched yet. Enter a recipient's phone number above and click Send!
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="font-semibold text-white block">
                        {item.recipient_name || 'Contact'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.phone_number}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
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
                    <td className="py-3 px-3.5 text-slate-300 font-mono text-[10px]">
                      {item.message_type}
                    </td>
                    <td className="py-3 px-3.5 text-slate-300 max-w-md truncate">
                      {item.content}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
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
  );
}
