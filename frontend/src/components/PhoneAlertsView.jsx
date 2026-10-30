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
  Database,
  Bell
} from 'lucide-react';
import { 
  fetchPhoneSettings, 
  savePhoneSettings, 
  fetchNotificationHistory, 
  sendTestPhoneMessage, 
  dispatchPhoneSummary, 
  dispatchPhoneRoadmap,
  triggerFetchNotification
} from '../api';
import { requestMobileNotificationPermission, sendNativeMobileNotification, notifyMobileOfDataFetch } from '../utils/mobileNotifications';

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

  const loadData = async () => {
    try {
      const [setRes, histRes] = await Promise.all([
        fetchPhoneSettings(),
        fetchNotificationHistory()
      ]);
      setSettings(setRes);
      setHistory(histRes);
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
      if (setRes.twilio_sid) setTwilioSid(setRes.twilio_sid);
      if (setRes.twilio_from) setTwilioFrom(setRes.twilio_from);
    } catch (err) {
      console.warn("Notice loading phone settings:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showFeedback = (msg, type = 'success') => {
    setActionFeedback({ msg, type });
    setTimeout(() => setActionFeedback(null), 5000);
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
        alert_data_fetch: settings?.alert_data_fetch ?? true,
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
        alert_daily_recap: newSettings.alert_daily_recap,
        alert_anomaly: newSettings.alert_anomaly,
        alert_budget_warning: newSettings.alert_budget_warning,
        alert_data_fetch: newSettings.alert_data_fetch,
        twilio_sid: twilioSid,
        twilio_token: twilioToken,
        twilio_from: twilioFrom
      });
      showFeedback("Notification channel updated!");
    } catch (err) {
      showFeedback("Failed to update preferences", "error");
    }
  };

  const handleSendTest = async () => {
    setIsSending(true);
    try {
      const res = await sendTestPhoneMessage({
        phone_number: settings?.phone_number || `${countryCode} ${phoneNumber}`,
        channel: activeChannel,
        custom_text: customText.trim() || undefined
      });
      showFeedback(`⚡ Delivered ${activeChannel} alert! Status: ${res.status}`);
      setCustomText('');
      await loadData();
    } catch (err) {
      showFeedback("Failed to dispatch message", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendDailyRecap = async () => {
    setIsSending(true);
    try {
      const res = await dispatchPhoneSummary(activeChannel);
      showFeedback(`📊 Delivered Daily Budget Recap via ${activeChannel}!`);
      await loadData();
    } catch (err) {
      showFeedback("Failed to send daily recap", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendDataFetchAlert = async () => {
    setIsSending(true);
    try {
      const res = await notifyMobileOfDataFetch({
        source: "Excel & Bank Statement Sync",
        count: 5,
        totalAmount: 3450.00,
        details: "Live test of Mobile Data Fetch Notification"
      });
      showFeedback(`📲 Data fetch notification delivered to mobile phone via ${activeChannel}!`);
      await loadData();
    } catch (err) {
      showFeedback("Failed to trigger data fetch alert", "error");
    } finally {
      setIsSending(false);
    }
  };

  const [pushStatus, setPushStatus] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );

  const handleEnablePush = async () => {
    const res = await requestMobileNotificationPermission();
    setPushStatus(res.permission);
    if (res.permission === 'granted') {
      sendNativeMobileNotification("📲 ExpensePilot Alerts Active", {
        body: "Mobile push notifications are now enabled on your handset!"
      });
      showFeedback("✅ Mobile device push notifications enabled!");
    } else {
      showFeedback("Notification permission was not granted by browser", "error");
    }
  };

  const handleSendRoadmap = async () => {
    setIsSending(true);
    try {
      const res = await dispatchPhoneRoadmap(activeChannel);
      showFeedback(`🗺️ Delivered 90-Day Roadmap Link via ${activeChannel}!`);
      await loadData();
    } catch (err) {
      showFeedback("Failed to send roadmap link", "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
              Autonomous Mobile Gateway
            </span>
            <span className="text-xs text-slate-400">SMS & WhatsApp Alerts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Phone Connection & Mobile Alerts
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Add your phone number to pair your personal device with ExpensePilot AI for real-time notifications.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-2xl bg-black/40 border border-emerald-500/40 backdrop-blur-xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-emerald-300">
            {settings?.is_connected ? `Connected (${settings.phone_number})` : 'Awaiting Connection'}
          </span>
        </div>
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
        
        {/* Left Column (7 cols): Phone Setup & Dispatch Actions */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card 1: Enter Phone Number */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                Connect Your Mobile Number
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
                  placeholder="e.g. 98765 43210"
                  className="flex-1 glass-input rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500"
                />

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 rounded-2xl glass-btn-primary text-white font-bold text-xs shrink-0 shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all text-center"
                >
                  {isSaving ? 'Connecting...' : 'Connect & Pair Phone'}
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Connecting your number will immediately register your phone and dispatch an authentication verification SMS.
              </p>
            </form>
          </div>

          {/* Card 2: Notification Channel Preferences */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 backdrop-blur-xl space-y-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Autonomous Push Channels & Alert Rules
            </span>

            <div className="space-y-3">
              {/* Direct Carrier SMS */}
              <div 
                onClick={() => handleToggleChannel('channel_sms')}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Direct Carrier SMS Gateway</span>
                    <span className="text-[11px] text-slate-400">Receive verified mobile text messages directly on your phone</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings?.channel_sms ?? true} 
                  readOnly 
                  className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* WhatsApp Business Alerts */}
              <div 
                onClick={() => handleToggleChannel('channel_whatsapp')}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">WhatsApp Financial Reports</span>
                    <span className="text-[11px] text-slate-400">Receive 90-day roadmap PDF links and visual invoice breakdowns</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings?.channel_whatsapp ?? true} 
                  readOnly 
                  className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* 9:00 PM Daily Recap */}
              <div 
                onClick={() => handleToggleChannel('alert_daily_recap')}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">9:00 PM Evening Daily Budget Recap</span>
                    <span className="text-[11px] text-slate-400">Automated daily summary of today's spending & safe allowance</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings?.alert_daily_recap ?? true} 
                  readOnly 
                  className="rounded accent-purple-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Critical Anomaly Alerts */}
              <div 
                onClick={() => handleToggleChannel('alert_anomaly')}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Critical Anomaly & Over-Budget Pushes</span>
                    <span className="text-[11px] text-slate-400">Instant alert when statistical outlier or velocity crosses 100%</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings?.alert_anomaly ?? true} 
                  readOnly 
                  className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Data Fetch & Bank Sync Mobile Alerts */}
              <div 
                onClick={() => handleToggleChannel('alert_data_fetch')}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-cyan-500/20 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Data Fetch & Excel Import Mobile Alerts</span>
                    <span className="text-[11px] text-slate-400">Instant SMS/WhatsApp & Push notifications when new transactions or statements are fetched</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings?.alert_data_fetch ?? true} 
                  readOnly 
                  className="rounded accent-cyan-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Send Live Message / Quick Actions */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Dispatch Real-Time Message to Phone
              </span>

              {/* Channel Selector */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[11px]">
                <button
                  onClick={() => setActiveChannel('SMS')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    activeChannel === 'SMS' ? 'bg-cyan-500 text-white shadow' : 'text-slate-400'
                  }`}
                >
                  SMS
                </button>
                <button
                  onClick={() => setActiveChannel('WhatsApp')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    activeChannel === 'WhatsApp' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400'
                  }`}
                >
                  WhatsApp
                </button>
              </div>
            </div>

            {/* Custom text composer */}
            <div className="space-y-2">
              <textarea
                rows={2}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type a custom message to dispatch to your phone, or click one of the quick actions below..."
                className="w-full glass-input rounded-2xl p-3 text-xs text-white placeholder-slate-500 resize-none"
              />

              {customText.trim() && (
                <button
                  onClick={handleSendTest}
                  disabled={isSending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md hover:scale-[1.01] transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Custom Message to {settings?.phone_number || `${countryCode} ${phoneNumber}`}</span>
                </button>
              )}
            </div>

            {/* Quick Preset Dispatch Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                onClick={handleSendTest}
                disabled={isSending}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl glass-btn text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 transition-all text-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span className="text-xs font-bold">Send Test Alert</span>
                <span className="text-[10px] text-slate-400">Verify phone connection</span>
              </button>

              <button
                onClick={handleSendDailyRecap}
                disabled={isSending}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl glass-btn text-purple-300 border border-purple-500/30 hover:border-purple-400/60 transition-all text-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold">Send Daily Recap</span>
                <span className="text-[10px] text-slate-400">Today's allowance & spent</span>
              </button>

              <button
                onClick={handleSendRoadmap}
                disabled={isSending}
                className="flex flex-col items-center justify-center p-3.5 rounded-2xl glass-btn text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/60 transition-all text-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold">Send Roadmap PDF</span>
                <span className="text-[10px] text-slate-400">90-Day report download link</span>
              </button>
            </div>
          </div>

          {/* Optional Live Twilio Carrier Setup Drawer */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
            <button
              onClick={() => setShowCarrierSettings(prev => !prev)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                Live Twilio Carrier Gateway (Optional for Real Hardware Cellular SMS)
              </span>
              {showCarrierSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showCarrierSettings && (
              <div className="space-y-3 pt-2 text-xs border-t border-white/5 animate-fade-in">
                <p className="text-[11px] text-slate-400">
                  By default, messages are delivered with instant carrier simulation to your virtual device preview. To send real cellular SMS to your physical phone hand-held device, enter your Twilio credentials below:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    placeholder="Twilio Account SID"
                    className="glass-input rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="password"
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    placeholder="Twilio Auth Token"
                    className="glass-input rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={twilioFrom}
                    onChange={(e) => setTwilioFrom(e.target.value)}
                    placeholder="Twilio Phone Number"
                    className="glass-input rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <button
                  onClick={handleSavePhone}
                  className="px-4 py-2 rounded-xl text-xs font-bold glass-btn text-cyan-300 border border-cyan-400/30"
                >
                  Save Twilio Credentials
                </button>
              </div>
            )}
          </div>

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
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Verified Financial Bot
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">5G • Full Bars</span>
              </div>

              {/* Message Feed Display */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                <div className="text-center text-[9px] text-slate-500 my-1">
                  Today • Encrypted Financial Notifications
                </div>

                {history.length === 0 ? (
                  <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-slate-300 text-[11px] leading-relaxed">
                    🚀 <strong>Phone Gateway Connected!</strong> Your phone number ({settings?.phone_number || `${countryCode} ${phoneNumber}`}) is linked. Click "Send Test Alert" or type a prompt to see incoming pushes.
                  </div>
                ) : (
                  history.slice(0, 5).map((msg, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-slate-800/90 border border-white/10 text-slate-100 text-[11px] leading-relaxed shadow-md animate-fade-in space-y-1.5">
                      <div className="flex items-center justify-between text-[9px] text-cyan-300 font-bold">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/20">
                          {msg.channel} • {msg.message_type}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
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
                Reply <strong className="text-slate-200">STOP</strong> to pause or <strong className="text-slate-200">STATUS</strong> for quick recap
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
            Live Dispatched Message History Log ({history.length} Messages)
          </span>
          <button
            onClick={loadData}
            className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 glass-btn px-3 py-1.5 rounded-xl transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-slate-400 text-[10px] uppercase font-semibold border-b border-white/[0.08]">
              <tr>
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3.5">Phone & Channel</th>
                <th className="py-3 px-3.5">Type</th>
                <th className="py-3 px-3.5">Content Dispatched</th>
                <th className="py-3 px-3.5">Delivery Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    No messages dispatched yet. Pair a phone number or click "Send Test Alert".
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="font-semibold text-white block">{item.phone_number}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.channel === 'WHATSAPP' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'
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
