import { triggerFetchNotification } from '../api';

// Web Audio API Synthesized Chime (Plays pleasant chime on notification)
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Pleasant two-tone chime (880Hz -> 1320Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio restrictions may prevent playback until user gesture
  }
}

// Request permission for native mobile device push notifications
export async function requestMobileNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    return { supported: true, permission };
  } catch (err) {
    console.warn("Notification permission request error:", err);
    return { supported: true, permission: Notification.permission };
  }
}

// Send native mobile push notification with vibration
export async function sendNativeMobileNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  // Play audio chime
  playNotificationChime();

  // 1. Try Service Worker showNotification (Works on mobile phones & lock screens)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body: options.body || "Financial records updated",
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          vibrate: [200, 100, 200],
          tag: "expensepilot-mobile-notification",
          renotify: true,
          ...options
        });
        return true;
      }
    } catch (e) {
      console.warn("Service worker notification notice:", e);
    }
  }

  // 2. Fallback to standard Window Notification
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([150, 80, 150]);
    }
    const notif = new Notification(title, {
      body: options.body || "Financial records updated",
      icon: "/favicon.svg",
      tag: "expensepilot-mobile-notification",
      ...options
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch (err) {
    console.warn("Native mobile notification fallback error:", err);
    return false;
  }
}

// Primary coordinator for mobile notification of data fetch:
// 1. Sends Native Browser Push Alert to Mobile Handset (with vibration & chime)
// 2. Dispatches Mobile SMS / WhatsApp Alert via Backend API
export async function notifyMobileOfDataFetch({
  source = "Spreadsheet / Bank Sync",
  count = 1,
  totalAmount = 0,
  details = null
}) {
  const amountStr = totalAmount > 0 ? ` (₹${Number(totalAmount).toLocaleString('en-IN')})` : '';
  const title = `📲 ExpensePilot: Data Fetch Complete`;
  const body = `Loaded ${count} transaction(s)${amountStr} from ${source}. Records updated!`;

  // 1. Native Mobile Screen Notification
  sendNativeMobileNotification(title, { body });

  // 2. Backend Carrier SMS / WhatsApp Dispatch
  try {
    const res = await triggerFetchNotification({
      fetch_source: source,
      items_count: count,
      total_amount: Number(totalAmount) || 0,
      details: details || `Mobile push synchronized at ${new Date().toLocaleTimeString()}`
    });
    return res;
  } catch (err) {
    console.warn("Notice dispatching carrier alert:", err);
    return null;
  }
}
