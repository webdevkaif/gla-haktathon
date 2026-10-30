const getApiBase = () => {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const host = window.location.hostname;
    return `http://${host}:8000/api`;
  }
  return "http://127.0.0.1:8000/api";
};

const API_BASE = import.meta.env.VITE_API_BASE || getApiBase();

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

export async function sendAgentMessage(message) {
  const res = await fetch(`${API_BASE}/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error("Agent message failed");
  return res.json();
}

export async function fetchInvoices(params = {}) {
  const query = new URLSearchParams();
  if (params.category && params.category !== "All") query.append("category", params.category);
  if (params.status) query.append("status", params.status);
  const res = await fetch(`${API_BASE}/invoices?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
}

export async function fetchInvoiceSummary() {
  const res = await fetch(`${API_BASE}/invoices/summary`);
  if (!res.ok) throw new Error("Failed to fetch invoice summary");
  return res.json();
}

export async function uploadInvoiceFile(formData) {
  const res = await fetch(`${API_BASE}/invoices/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload invoice");
  return res.json();
}

export async function createInvoice(data) {
  const res = await fetch(`${API_BASE}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create invoice");
  return res.json();
}

export async function deleteInvoice(id) {
  const res = await fetch(`${API_BASE}/invoices/${id}`, {
    method: "DELETE",
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
