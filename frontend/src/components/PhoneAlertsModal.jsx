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
  Radio
} from 'lucide-react';
import { 
  fetchPhoneSettings, 
  savePhoneSettings, 
  fetchNotificationHistory, 
  sendTestPhoneMessage, 
  dispatchPhoneSummary, 
  dispatchPhoneRoadmap 
} from '../api';

export default function PhoneAlertsModal({ isOpen, onClose }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [activeChannel, setActiveChannel] = useState('SMS');

  // Load user phone settings and message history
  const loadData = async () => {
    try {
      const [setRes, histRes] = await Promise.all([
        fetchPhoneSettings(),
        fetchNotificationHistory()
      ]);
      setSettings(setRes);
      setHistory(histRes);
      if (setRes.phone_number) {
        // Strip country code if present for cleaner input
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
        alert_daily_recap: newSettings.alert_daily_recap,
        alert_anomaly: newSettings.alert_anomaly,
        alert_budget_warning: newSettings.alert_budget_warning
      });
      showFeedback("Alert preferences updated!");
    } catch (err) {
      showFeedback("Failed to update preferences", "error");
    }
  };

  const handleSendTest = async () => {
    setIsSending(true);
    try {
      const res = await sendTestPhoneMessage({
        phone_number: settings?.phone_number || `${countryCode} ${phoneNumber}`,
        channel: activeChannel
      });
      showFeedback(`⚡ Delivered test ${activeChannel} alert! (ID: ${res.dispatch_id})`);
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
      showFeedback(`🗺️ Delivered 90-Day Roadmap Link via ${activeChannel}!`);
      await loadData();
    } catch (err) {
      showFeedback("Failed to send roadmap link", "error");
    } finally {
      setIsSending(false);
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
                  Phone Link & Mobile Alerts
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Active Phone Gateway
                </span>
              </div>
              <p className="text-xs text-slate-400">Pair your phone number to receive real-time SMS & WhatsApp financial alerts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-btn transition-colors"
          >
            <X className="w-5 h-5" />
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
                      placeholder="e.g. 98765 43210"
                      className="flex-1 glass-input rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500"
                    />

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-3 rounded-2xl glass-btn-primary text-white font-bold text-xs shrink-0 shadow-lg shadow-cyan-500/25 hover:scale-105 transition-all"
                    >
                      {isSaving ? 'Connecting...' : 'Connect & Pair'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Pairing immediately sends an authentication SMS to verify your carrier connection.
                  </p>
                </form>
              </div>

              {/* Alert Channel Toggles */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Autonomous Alert Triggers
                </span>

                <div className="space-y-2.5">
                  {/* SMS Channel */}
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

                  {/* WhatsApp Channel */}
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

                  {/* Daily Evening Recap */}
                  <div 
                    onClick={() => handleToggleChannel('alert_daily_recap')}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">9:00 PM Daily Budget Recap</span>
                        <span className="text-[11px] text-slate-400">Sends today's total spent & remaining daily limit</span>
                      </div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings?.alert_daily_recap ?? true} 
                      readOnly 
                      className="rounded accent-purple-500 w-4 h-4"
                    />
                  </div>

                  {/* Anomaly / Overrun Alerts */}
                  <div 
                    onClick={() => handleToggleChannel('alert_anomaly')}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                        <BellRing className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Critical Anomaly & Over-Budget Pushes</span>
                        <span className="text-[11px] text-slate-400">Immediate push when velocity exceeds 100% of budget</span>
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
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Trigger Message to Phone
                  </span>
                  
                  {/* Select Channel */}
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[11px]">
                    <button
                      onClick={() => setActiveChannel('SMS')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        activeChannel === 'SMS' ? 'bg-cyan-500 text-white shadow' : 'text-slate-400'
                      }`}
                    >
                      SMS
                    </button>
                    <button
                      onClick={() => setActiveChannel('WhatsApp')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        activeChannel === 'WhatsApp' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400'
                      }`}
                    >
                      WhatsApp
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <button
                    onClick={handleSendTest}
                    disabled={isSending}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl glass-btn text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/60 transition-all text-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span className="text-xs font-bold">Send Test Alert</span>
                    <span className="text-[10px] text-slate-400">Verify connection</span>
                  </button>

                  <button
                    onClick={handleSendDailyRecap}
                    disabled={isSending}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl glass-btn text-purple-300 border border-purple-500/30 hover:border-purple-400/60 transition-all text-center gap-1.5"
                  >
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold">Send Daily Recap</span>
                    <span className="text-[10px] text-slate-400">Budget allowance</span>
                  </button>

                  <button
                    onClick={handleSendRoadmap}
                    disabled={isSending}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl glass-btn text-emerald-300 border border-emerald-500/30 hover:border-emerald-400/60 transition-all text-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-bold">Send Roadmap PDF</span>
                    <span className="text-[10px] text-slate-400">Official report link</span>
                  </button>
                </div>
              </div>

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
                        🚀 <strong>ExpensePilot AI Connected!</strong> Your phone number ({settings?.phone_number || DEFAULT_PHONE}) is linked. Click "Send Test Alert" to preview incoming pushes.
                      </div>
                    ) : (
                      history.slice(0, 4).map((msg, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-slate-800/80 border border-white/10 text-slate-200 text-[11px] leading-relaxed shadow-sm animate-fade-in">
                          <div className="flex items-center justify-between text-[9px] text-cyan-300 font-semibold mb-1">
                            <span>{msg.channel} • {msg.message_type}</span>
                            <span className="text-slate-400 font-mono">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div>{msg.content}</div>
                          <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-white/5 text-[9px] text-slate-400 font-mono">
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
                    Reply <strong className="text-slate-200">STOP</strong> to pause or <strong className="text-slate-200">STATUS</strong> for quick recap
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
                className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1 glass-btn px-2.5 py-1 rounded-xl"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] text-slate-400 text-[10px] uppercase font-semibold border-b border-white/[0.08]">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Phone & Channel</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Content Dispatched</th>
                    <th className="py-2.5 px-3">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                        No messages dispatched yet. Pair a phone number or click "Send Test Alert".
                      </td>
                    </tr>
                  ) : (
                    history.slice(0, 10).map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.01]">
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-white block">{item.phone_number}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            item.channel === 'WHATSAPP' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'
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
