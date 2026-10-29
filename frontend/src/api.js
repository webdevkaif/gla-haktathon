const API_BASE = "http://127.0.0.1:8000/api";

export function getCurrentUserId() {
  return localStorage.getItem("expense_pilot_user") || "emp_john";
}

export function setCurrentUserId(userId) {
  localStorage.setItem("expense_pilot_user", userId);
}

function getAuthHeaders(extra = {}) {
  return {
    "X-User-Id": getCurrentUserId(),
    ...extra
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Users & Roles
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchUsers() {
  const res = await fetch(`${API_BASE}/users`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function fetchMe() {
  const res = await fetch(`${API_BASE}/users/me`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}

export async function seedEnterpriseDemoData() {
  const res = await fetch(`${API_BASE}/admin/seed`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" })
  });
  if (!res.ok) throw new Error("Failed to seed enterprise data");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Summary (6 KPIs + Tables)
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchDashboardSummary() {
  const res = await fetch(`${API_BASE}/dashboard/summary`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Claims
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchClaims(status = null, category = null) {
  const params = new URLSearchParams();
  if (status && status !== "All") params.append("status", status);
  if (category && category !== "All") params.append("category", category);

  const res = await fetch(`${API_BASE}/claims?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch claims");
  return res.json();
}

export async function createClaim(claimData) {
  const res = await fetch(`${API_BASE}/claims`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(claimData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit claim");
  }
  return res.json();
}

export async function fetchClaimDetail(claimNo) {
  const res = await fetch(`${API_BASE}/claims/${claimNo}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Claim ${claimNo} not found`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchInvoices(status = null, poNo = null) {
  const params = new URLSearchParams();
  if (status && status !== "All") params.append("status", status);
  if (poNo) params.append("po_no", poNo);

  const res = await fetch(`${API_BASE}/invoices?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    if (res.status === 403) return [];
    throw new Error("Failed to fetch invoices");
  }
  return res.json();
}

export async function createInvoice(invoiceData) {
  const res = await fetch(`${API_BASE}/invoices`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(invoiceData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit invoice");
  }
  return res.json();
}

export async function uploadInvoiceOCR(formData) {
  const res = await fetch(`${API_BASE}/invoices/upload`, {
    method: "POST",
    headers: {
      "X-User-Id": getCurrentUserId()
    },
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to process invoice OCR");
  }
  return res.json();
}

export async function fetchInvoiceDetail(invoiceNo) {
  const res = await fetch(`${API_BASE}/invoices/${invoiceNo}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Invoice ${invoiceNo} not found`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Approvals & Workflow
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchApprovals(state = null, entityType = null) {
  const params = new URLSearchParams();
  if (state && state !== "All") params.append("state", state);
  if (entityType && entityType !== "All") params.append("entity_type", entityType);

  const res = await fetch(`${API_BASE}/approvals?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch approvals");
  return res.json();
}

export async function decideApproval(approvalId, decision, notes = "") {
  const res = await fetch(`${API_BASE}/approvals/${approvalId}/decide`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ decision, notes, comment: notes })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to decide approval");
  }
  return res.json();
}

export async function sendApprovalReminder(approvalId, force = false) {
  const res = await fetch(`${API_BASE}/approvals/${approvalId}/remind`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ force })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to send reminder");
  }
  return res.json();
}

export async function checkDueReminders() {
  const res = await fetch(`${API_BASE}/approvals/check-reminders`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to run SLA reminder check");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Escalations
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchEscalations(status = null, severity = null) {
  const params = new URLSearchParams();
  if (status && status !== "All") params.append("status", status);
  if (severity && severity !== "All") params.append("severity", severity);

  const res = await fetch(`${API_BASE}/escalations?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch escalations");
  return res.json();
}

export async function createEscalation(escData) {
  const res = await fetch(`${API_BASE}/escalations`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(escData)
  });
  if (!res.ok) throw new Error("Failed to create escalation");
  return res.json();
}

export async function resolveEscalation(escalationId, note = "") {
  const res = await fetch(`${API_BASE}/escalations/${escalationId}/resolve`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ resolution_note: note })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Only Finance personnel can resolve escalations");
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log & Verification
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAuditLogs(skip = 0, limit = 50, filters = {}) {
  const params = new URLSearchParams({ skip, limit });
  if (filters.actor_id) params.append("actor_id", filters.actor_id);
  if (filters.entity_type) params.append("entity_type", filters.entity_type);
  if (filters.action) params.append("action", filters.action);

  const res = await fetch(`${API_BASE}/audit?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch audit log");
  return res.json();
}

export async function verifyAuditChain() {
  const res = await fetch(`${API_BASE}/audit/verify`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to verify audit chain");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Policies
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchPolicies(category = null, query = null) {
  const params = new URLSearchParams();
  if (category && category !== "All") params.append("category", category);
  if (query) params.append("q", query);

  const res = await fetch(`${API_BASE}/policies?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch corporate policies");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Chat
// ─────────────────────────────────────────────────────────────────────────────

export async function sendAgentMessage(message, userId = null) {
  const res = await fetch(`${API_BASE}/agent/chat`, {
    method: "POST",
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      message,
      user_id: userId || getCurrentUserId()
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Agent query failed");
  }
  return res.json();
}
