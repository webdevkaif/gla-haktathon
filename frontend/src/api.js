const getApiBase = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    return `http://${host}:8000/api`;
  }
  return "http://127.0.0.1:8000/api";
};

const API_BASE = getApiBase();

export async function fetchMonthlySummary(month = "2026-10") {
  const res = await fetch(`${API_BASE}/analytics/monthly?month=${month}`);
  if (!res.ok) throw new Error("Failed to fetch monthly summary");
  return res.json();
}

export async function fetchCurrentBudget(month = "2026-10") {
  const res = await fetch(`${API_BASE}/budgets/current?month=${month}`);
  if (!res.ok) throw new Error("Failed to fetch budget");
  return res.json();
}

export async function updateBudget(data) {
  const res = await fetch(`${API_BASE}/budgets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update budget");
  return res.json();
}

export async function fetchExpenses(params = {}) {
  const query = new URLSearchParams();
  if (params.month) query.append("month", params.month);
  if (params.category && params.category !== "All") query.append("category", params.category);
  if (params.is_unusual !== undefined && params.is_unusual !== null) query.append("is_unusual", params.is_unusual);
  if (params.search) query.append("search", params.search);

  const res = await fetch(`${API_BASE}/expenses?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function createExpense(data) {
  const res = await fetch(`${API_BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create expense");
  return res.json();
}

export async function deleteExpense(id) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete expense");
  return res.json();
}

export async function confirmUnusualExpense(id) {
  const res = await fetch(`${API_BASE}/expenses/confirm-unusual/${id}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to confirm expense");
  return res.json();
}

export async function fetchForecast(month = "2026-10") {
  const res = await fetch(`${API_BASE}/analytics/forecast?month=${month}`);
  if (!res.ok) throw new Error("Failed to fetch forecast");
  return res.json();
}

export async function simulateWhatIf(payload, month = "2026-10") {
  const res = await fetch(`${API_BASE}/analytics/what-if?month=${month}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to simulate what-if");
  return res.json();
}

export async function fetchAlerts(unreadOnly = false) {
  const res = await fetch(`${API_BASE}/analytics/alerts?unread_only=${unreadOnly}`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function markAlertRead(id) {
  const res = await fetch(`${API_BASE}/analytics/alerts/${id}/read`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to mark alert as read");
  return res.json();
}

export async function fetchGoals() {
  const res = await fetch(`${API_BASE}/goals`);
  if (!res.ok) throw new Error("Failed to fetch goals");
  return res.json();
}

export async function createGoal(payload) {
  const res = await fetch(`${API_BASE}/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create goal");
  return res.json();
}

export async function addFundsToGoal(goalId, amount) {
  const res = await fetch(`${API_BASE}/goals/${goalId}/add-funds?amount=${amount}`, {
    method: "PUT",
  });
  if (!res.ok) throw new Error("Failed to add funds");
  return res.json();
}

export async function deleteGoal(goalId) {
  const res = await fetch(`${API_BASE}/goals/${goalId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete goal");
  return res.json();
}

export async function seedDemoData() {
  const res = await fetch(`${API_BASE}/analytics/seed-demo`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to seed demo data");
  return res.json();
}

let cachedToken = null;

function isTokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && (payload.exp * 1000) <= (Date.now() + 60000)) {
      return false; // Expired or expiring within 60s
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function ensureAuthToken(forceRefresh = false) {
  if (!forceRefresh && cachedToken && isTokenValid(cachedToken)) return cachedToken;
  
  if (!forceRefresh) {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (stored && isTokenValid(stored)) {
      cachedToken = stored;
      return stored;
    }
  }

  // Clear expired cached token
  cachedToken = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('auth_token');
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'fin_alex', password: 'password123' })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        cachedToken = data.access_token;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('auth_token', data.access_token);
        }
        return data.access_token;
      }
    }
  } catch (e) {
    console.log("Auto-token notice:", e);
  }
  return null;
}

export async function sendAgentMessage(message, fileContext = null, customUserName = null, customUserId = null) {
  const token = await ensureAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let activeUserName = customUserName;
  let activeUserId = customUserId;

  if (!activeUserName) {
    try {
      const stored = localStorage.getItem('expensepilot_active_user') || localStorage.getItem('expensepilot_demo_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        const u = parsed.user || parsed;
        activeUserName = u.user_metadata?.full_name || u.name || (u.email ? u.email.split('@')[0] : null);
        activeUserId = u.id;
      }
    } catch (_) {}
  }

  const payload = { 
    message,
    user_id: activeUserId || "user_kaif",
    user_name: activeUserName || "Mohammad Kaif"
  };
  if (fileContext) {
    payload.file_context = fileContext;
  }

  let res = await fetch(`${API_BASE}/agent/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  // Self-heal on 401 Unauthorized
  if (res.status === 401) {
    const freshToken = await ensureAuthToken(true);
    if (freshToken) {
      headers["Authorization"] = `Bearer ${freshToken}`;
    } else {
      delete headers["Authorization"];
    }
    res = await fetch(`${API_BASE}/agent/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || "Agent message failed");
  }
  return res.json();
}

export async function uploadAgentFile(formData) {
  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};

  const res = await fetch(`${API_BASE}/agent/upload-file`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to process uploaded file");
  }
  return res.json();
}

export async function readWebpageUrl(url) {
  const token = await ensureAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };

  const res = await fetch(`${API_BASE}/agent/read-url`, {
    method: "POST",
    headers,
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to read webpage via Jina Reader");
  }
  return res.json();
}

export async function callDeviceViaAgent(data = {}) {
  const token = await ensureAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };

  const res = await fetch(`${API_BASE}/agent/call-device`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to trigger device call");
  }
  return res.json();
}

export async function fetchInvoices(params = {}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== "All") query.append("category", params.category);
  if (params.status) query.append("status", params.status);

  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};

  const res = await fetch(`${API_BASE}/invoices?${query.toString()}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
}

export async function fetchInvoiceSummary() {
  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};

  const res = await fetch(`${API_BASE}/invoices/summary`, { headers });
  if (!res.ok) throw new Error("Failed to fetch invoice summary");
  return res.json();
}

export async function uploadInvoiceFile(formData) {
  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};

  const res = await fetch(`${API_BASE}/invoices/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload invoice");
  return res.json();
}

export async function createInvoice(data) {
  const token = await ensureAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/invoices`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create invoice");
  return res.json();
}

export async function deleteInvoice(id) {
  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};

  const res = await fetch(`${API_BASE}/invoices/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete invoice");
  return res.json();
}

export async function fetchFinancialRoadmap(month = "2026-10") {
  const res = await fetch(`${API_BASE}/analytics/roadmap?month=${month}`);
  if (!res.ok) throw new Error("Failed to fetch roadmap");
  return res.json();
}

export function getRoadmapPdfUrl(month = "2026-10") {
  return `${API_BASE}/analytics/roadmap/pdf?month=${month}`;
}

export async function fetchPhoneSettings() {
  const res = await fetch(`${API_BASE}/notifications/settings`);
  if (!res.ok) throw new Error("Failed to fetch phone settings");
  return res.json();
}

export async function savePhoneSettings(data) {
  const res = await fetch(`${API_BASE}/notifications/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save phone settings");
  return res.json();
}

export async function fetchNotificationHistory() {
  const res = await fetch(`${API_BASE}/notifications/history`);
  if (!res.ok) throw new Error("Failed to fetch notification history");
  return res.json();
}

export async function sendTestPhoneMessage(payload = {}) {
  const res = await fetch(`${API_BASE}/notifications/send-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to send test message");
  return res.json();
}

export async function directSendMessage(payload) {
  const res = await fetch(`${API_BASE}/notifications/direct-send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to send message to recipient");
  }
  return res.json();
}

export async function fetchPhoneContacts() {
  const res = await fetch(`${API_BASE}/notifications/contacts`);
  if (!res.ok) throw new Error("Failed to load contacts");
  return res.json();
}

export async function addPhoneContact(contact) {
  const res = await fetch(`${API_BASE}/notifications/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });
  if (!res.ok) throw new Error("Failed to add contact");
  return res.json();
}

export async function deletePhoneContact(contactId) {
  const res = await fetch(`${API_BASE}/notifications/contacts/${contactId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete contact");
  return res.json();
}

export async function dispatchPhoneSummary(channel = "SMS") {
  const res = await fetch(`${API_BASE}/notifications/dispatch-summary?channel=${channel}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to dispatch summary");
  return res.json();
}

export async function dispatchPhoneRoadmap(channel = "SMS") {
  const res = await fetch(`${API_BASE}/notifications/dispatch-roadmap?channel=${channel}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to dispatch roadmap");
  return res.json();
}

export async function uploadExpenseCSV(formData) {
  const res = await fetch(`${API_BASE}/expenses/upload-csv`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to upload CSV/Excel file");
  }
  return res.json();
}

export async function triggerFetchNotification(payload = {}) {
  const res = await fetch(`${API_BASE}/notifications/notify-fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to trigger fetch notification");
  return res.json();
}

export async function fetchRiskPrediction(month = "2026-10") {
  const res = await fetch(`${API_BASE}/analytics/risk-prediction?month=${month}`);
  if (!res.ok) throw new Error("Failed to fetch risk prediction");
  return res.json();
}

export async function dispatchRiskAlert(month = "2026-10", channel = "SMS") {
  const res = await fetch(`${API_BASE}/analytics/risk-prediction/dispatch-alert?month=${month}&channel=${channel}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to dispatch risk alert");
  return res.json();
}

export async function simulateRiskIntervention(spendCutPct = 20, upcomingExpense = 0, month = "2026-10") {
  const res = await fetch(`${API_BASE}/analytics/risk-prediction/simulate?spend_cut_percent=${spendCutPct}&upcoming_expense=${upcomingExpense}&month=${month}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to simulate risk intervention");
  return res.json();
}

export async function activateEmergencyProtocol(month = "2026-10", channel = "SMS") {
  const res = await fetch(`${API_BASE}/analytics/risk-prediction/emergency-protocol?month=${month}&channel=${channel}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to activate emergency protocol");
  return res.json();
}

// -------------------------------------------------------------
// Hackathon Differentiators API Endpoints (6 Key Winner Features)
// -------------------------------------------------------------

export async function fetchFinanceDashboardSummary() {
  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/dashboard/summary`, { headers });
  if (!res.ok) throw new Error("Failed to fetch finance dashboard summary");
  return res.json();
}

export async function fetchApprovals(params = {}) {
  const query = new URLSearchParams();
  if (params.state) query.append("state", params.state);
  if (params.entity_type) query.append("entity_type", params.entity_type);

  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/approvals?${query.toString()}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch approvals");
  return res.json();
}

export async function decideApproval(approvalId, decision, comments = "") {
  const token = await ensureAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/approvals/${approvalId}/decide`, {
    method: "POST",
    headers,
    body: JSON.stringify({ decision, comments }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit approval decision");
  }
  return res.json();
}

export async function sendApprovalReminder(approvalId) {
  const token = await ensureAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/approvals/${approvalId}/remind`, {
    method: "POST",
    headers,
    body: JSON.stringify({ approval_id: approvalId }),
  });
  if (!res.ok) throw new Error("Failed to send reminder");
  return res.json();
}

export async function fetchAuditLogs(params = {}) {
  const query = new URLSearchParams();
  if (params.skip) query.append("skip", params.skip);
  if (params.limit) query.append("limit", params.limit || 50);
  if (params.action) query.append("action", params.action);
  if (params.entity_type) query.append("entity_type", params.entity_type);

  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/audit?${query.toString()}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

export async function verifyAuditTrailIntegrity() {
  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/audit/verify`, { headers });
  if (!res.ok) throw new Error("Failed to verify audit trail integrity");
  return res.json();
}

export async function fetchPolicies() {
  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/policies`, { headers });
  if (!res.ok) throw new Error("Failed to fetch policies");
  return res.json();
}

export async function fetchClaims() {
  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/claims`, { headers });
  if (!res.ok) throw new Error("Failed to fetch claims");
  return res.json();
}

export async function fetchEscalations() {
  const token = await ensureAuthToken();
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/escalations`, { headers });
  if (!res.ok) throw new Error("Failed to fetch escalations");
  return res.json();
}

export async function resolveEscalation(escalationId, resolutionNotes) {
  const token = await ensureAuthToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/escalations/${escalationId}/resolve`, {
    method: "POST",
    headers,
    body: JSON.stringify({ resolution_notes: resolutionNotes }),
  });
  if (!res.ok) throw new Error("Failed to resolve escalation");
  return res.json();
}

export async function fetchDatabaseStatus() {
  const res = await fetch(`${API_BASE}/system/db-status`);
  if (!res.ok) throw new Error("Failed to fetch database status");
  return res.json();
}

export async function reconnectAtlasDatabase() {
  const res = await fetch(`${API_BASE}/system/reconnect`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to trigger Atlas reconnect");
  return res.json();
}

export async function fetchAnomalyDetections(month = "2026-10", userId = "user_default") {
  const query = new URLSearchParams();
  if (month) query.append("month", month);
  if (userId) query.append("user_id", userId);

  const res = await fetch(`${API_BASE}/anomalies/detect?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch financial anomaly detections");
  return res.json();
}

export async function fetchTelegramInfo() {
  const res = await fetch(`${API_BASE}/notifications/telegram/info`);
  if (!res.ok) throw new Error("Failed to fetch Telegram bot info");
  return res.json();
}

export async function sendTelegramTest(userId = "user_default", customText = null) {
  const query = new URLSearchParams();
  if (userId) query.append("user_id", userId);
  if (customText) query.append("custom_text", customText);

  const res = await fetch(`${API_BASE}/notifications/telegram/send-test?${query.toString()}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to dispatch Telegram test message");
  return res.json();
}

export async function pairTelegramDevice(data = {}) {
  const res = await fetch(`${API_BASE}/notifications/telegram/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to pair Telegram device");
  return res.json();
}

export async function dispatchAnomaliesToTelegram(userId = "user_default", month = null) {
  const query = new URLSearchParams();
  if (userId) query.append("user_id", userId);
  if (month) query.append("month", month);

  const res = await fetch(`${API_BASE}/anomalies/dispatch-telegram?${query.toString()}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to dispatch anomalies to Telegram");
  return res.json();
}
