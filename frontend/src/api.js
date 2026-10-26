const API_BASE = "http://127.0.0.1:8000/api";

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
