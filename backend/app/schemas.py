from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

# ─────────────────────────────────────────────────────────────────────────────
# User & Auth Schemas
# ─────────────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    name: str
    role: str  # employee | vendor | manager | finance
    grade: Optional[str] = None
    email: Optional[str] = None
    manager_id: Optional[str] = None
    is_sample: Optional[bool] = True

    class Config:
        from_attributes = True

# ─────────────────────────────────────────────────────────────────────────────
# Policy Schemas
# ─────────────────────────────────────────────────────────────────────────────

class PolicyOut(BaseModel):
    id: str
    doc_name: str
    section_id: str
    title: str
    text: str
    category: Optional[str] = "General"
    grade_limits: Optional[Dict[str, float]] = {}
    is_sample: Optional[bool] = True

    class Config:
        from_attributes = True

class PolicyCitation(BaseModel):
    doc_name: str
    section_id: str
    title: str
    relevant_snippet: Optional[str] = None

# ─────────────────────────────────────────────────────────────────────────────
# Claim Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ClaimCreate(BaseModel):
    category: str = Field(..., description="Category: Meals, Travel, Hotel, Utilities, etc.")
    amount: float = Field(..., gt=0)
    date: str = Field(..., description="YYYY-MM-DD")
    receipt_attached: bool = True
    currency: Optional[str] = "INR"
    description: Optional[str] = ""

class ClaimUpdate(BaseModel):
    category: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    receipt_attached: Optional[bool] = None
    status: Optional[str] = None
    approver_id: Optional[str] = None
    expected_payment_date: Optional[str] = None
    policy_flags: Optional[List[str]] = None

class ClaimOut(BaseModel):
    id: str
    claim_no: str
    employee_id: str
    category: str
    amount: float
    currency: str = "INR"
    date: str
    receipt_attached: bool = True
    status: str  # Submitted | Pending Manager | Approved | Rejected | Pending Finance | Paid
    approver_id: Optional[str] = None
    expected_payment_date: Optional[str] = None
    policy_flags: List[str] = []
    description: Optional[str] = ""
    created_at: Optional[datetime] = None
    is_sample: Optional[bool] = True

    class Config:
        from_attributes = True

# ─────────────────────────────────────────────────────────────────────────────
# Invoice & Purchase Order Schemas
# ─────────────────────────────────────────────────────────────────────────────

class InvoiceItem(BaseModel):
    name: str
    quantity: Optional[int] = 1
    unit_price: Optional[float] = 0.0
    total: float

class InvoiceCreate(BaseModel):
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    invoice_no: str
    po_no: Optional[str] = None
    amount: float
    currency: Optional[str] = "INR"
    invoice_date: str
    due_date: str
    tax: Optional[float] = 0.0
    status: Optional[str] = "Received"
    duplicate_of: Optional[str] = None
    flags: Optional[List[str]] = []
    line_items: Optional[List[InvoiceItem]] = []
    file_name: Optional[str] = None

class InvoiceOut(BaseModel):
    id: str
    invoice_no: str
    vendor_id: str
    vendor_name: Optional[str] = None
    po_no: Optional[str] = None
    amount: float
    currency: str = "INR"
    invoice_date: str
    due_date: str
    status: str  # Received | Pending Approval | Approved | Paid | Disputed
    duplicate_of: Optional[str] = None
    flags: List[str] = []
    tax: Optional[float] = 0.0
    line_items: List[Dict[str, Any]] = []
    file_name: Optional[str] = None
    created_at: Optional[datetime] = None
    is_sample: Optional[bool] = True

    # Legacy invoice field aliases for backwards compatibility
    vendor: Optional[str] = None
    date: Optional[str] = None
    category: Optional[str] = "Procurement"
    is_anomaly: Optional[bool] = False
    anomaly_reason: Optional[str] = None

    class Config:
        from_attributes = True

class PurchaseOrderOut(BaseModel):
    id: str
    po_no: str
    vendor_id: str
    amount: float
    currency: str = "INR"
    description: Optional[str] = ""
    status: str = "Open"
    created_at: Optional[datetime] = None
    is_sample: Optional[bool] = True

    class Config:
        from_attributes = True

# ─────────────────────────────────────────────────────────────────────────────
# Approval Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ApprovalOut(BaseModel):
    id: str
    approval_id: str
    entity_type: str  # claim | invoice
    entity_id: str
    approver_id: str
    state: str  # Pending | Approved | Rejected
    created_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    reminders_sent: int = 0
    last_reminder_at: Optional[datetime] = None
    is_sample: Optional[bool] = True

    # Augmented fields for UI display
    entity_summary: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class ApprovalDecideRequest(BaseModel):
    decision: str = Field(..., description="'Approved' or 'Rejected'")
    comment: Optional[str] = None
    notes: Optional[str] = None

class ApprovalRemindRequest(BaseModel):
    message: Optional[str] = None
    force: Optional[bool] = False

# ─────────────────────────────────────────────────────────────────────────────
# Escalation Schemas
# ─────────────────────────────────────────────────────────────────────────────

class EscalationCreate(BaseModel):
    entity_type: str
    entity_id: str
    reason: str  # duplicate | policy_violation | discrepancy | other
    summary: str
    severity: Optional[str] = "medium"  # low | medium | high
    assignee_id: Optional[str] = "fin_alex"

class EscalationOut(BaseModel):
    id: str
    escalation_id: str
    entity_type: str
    entity_id: str
    reason: str
    severity: str
    assignee_id: str
    status: str  # Open | Resolved
    summary: str
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    is_sample: Optional[bool] = True

    class Config:
        from_attributes = True

class EscalationResolveRequest(BaseModel):
    resolution_note: Optional[str] = "Resolved by finance reviewer."

# ─────────────────────────────────────────────────────────────────────────────
# Audit Log Schemas
# ─────────────────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: str
    ts: datetime
    actor_id: str
    actor_role: str
    action: str
    entity_type: str
    entity_id: str
    input: Dict[str, Any] = {}
    rule_id: Optional[str] = None
    result: Dict[str, Any] = {}
    status: str  # SUCCESS | FAILED | REFUSED
    prev_hash: str
    hash: str
    is_sample: Optional[bool] = True

    class Config:
        from_attributes = True

class AuditVerifyResponse(BaseModel):
    valid: bool
    total_entries: int = 0
    total: Optional[int] = None
    broken_at_index: Optional[int] = None
    broken_entry_id: Optional[str] = None
    broken_at: Optional[str] = None
    message: str = ""

# ─────────────────────────────────────────────────────────────────────────────
# Agent Chat Schemas
# ─────────────────────────────────────────────────────────────────────────────

class AgentChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None

class AgentChatResponse(BaseModel):
    reply: str
    citations: List[PolicyCitation] = []
    tool_called: Optional[str] = None
    tool_result: Optional[Any] = None
    escalated: bool = False
    suggested_actions: List[str] = []
    voice_text: Optional[str] = None

# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Summary Schema
# ─────────────────────────────────────────────────────────────────────────────

class DashboardKPIs(BaseModel):
    pending_invoices_count: int = 0
    pending_invoices_amount: float = 0.0
    overdue_payments_count: int = 0
    overdue_payments_amount: float = 0.0
    reimbursement_requests_count: int = 0
    reimbursement_requests_amount: float = 0.0
    flagged_duplicates_count: int = 0
    approval_delays_count: int = 0
    open_escalations_count: int = 0

class FinanceDashboardOut(BaseModel):
    kpis: DashboardKPIs
    invoices_by_status: Dict[str, int] = {}
    claims_by_status: Dict[str, int] = {}
    overdue_items: List[Dict[str, Any]] = []
    flagged_duplicates: List[Dict[str, Any]] = []
    approval_delays: List[Dict[str, Any]] = []
    open_escalations: List[Dict[str, Any]] = []
    sample_data_badge: bool = True

# ─────────────────────────────────────────────────────────────────────────────
# Legacy Compatibility Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ExpenseBase(BaseModel):
    amount: float = Field(..., gt=0)
    category: str
    description: str
    date: str
    payment_method: Optional[str] = "Unknown"

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    payment_method: Optional[str] = None
    is_unusual: Optional[bool] = None
    anomaly_reason: Optional[str] = None

class ExpenseOut(ExpenseBase):
    id: Union[int, str]
    user_id: str
    is_unusual: bool = False
    anomaly_reason: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BudgetCreate(BaseModel):
    month: str
    total_budget: float
    category_limits: Optional[Dict[str, float]] = {}

class BudgetOut(BaseModel):
    id: Union[int, str]
    user_id: str
    month: str
    total_budget: float
    category_limits: Dict[str, float]
    total_spent: float = 0.0
    remaining_budget: float = 0.0
    percentage_used: float = 0.0
    days_left_in_month: int = 0
    daily_budget_remaining: float = 0.0

    class Config:
        from_attributes = True

class AlertOut(BaseModel):
    id: Union[int, str]
    user_id: str
    type: str
    severity: str
    title: str
    message: str
    action_options: List[str] = []
    is_read: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class WhatIfRequest(BaseModel):
    category: str
    percent_reduction: Optional[float] = 0.0
    amount_reduction: Optional[float] = 0.0
    upcoming_purchase_amount: Optional[float] = 0.0
    upcoming_purchase_category: Optional[str] = "General"

class WhatIfResponse(BaseModel):
    category: str
    historical_spending: float
    projected_savings: float
    new_projected_total: float
    runway_impact: str
    advice: str

class SavingGoalCreate(BaseModel):
    title: str
    target_amount: float
    target_months: int = 3
    current_saved: Optional[float] = 0.0

class SavingGoalOut(BaseModel):
    id: Union[int, str]
    user_id: str
    title: str
    target_amount: float
    current_saved: float
    target_months: int
    monthly_target: float
    category_suggestions: List[Dict[str, Any]] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InvoiceSummary(BaseModel):
    total_invoices: int
    total_invoiced_amount: float
    category_totals: Dict[str, float]
    latest_invoice: Optional[InvoiceOut] = None
    pending_audit_count: int

class RoadmapPhase(BaseModel):
    phase: int
    title: str
    timeline: str
    focus: str
    monthly_savings_target: float
    action_items: List[str]
    status: str = "In Progress"

class FinancialRoadmapOut(BaseModel):
    month: str
    generated_at: str
    health_score: int
    current_burn_rate: float
    monthly_budget: float
    projected_savings_90_days: float
    phases: List[RoadmapPhase]
    key_recommendations: List[str]
    download_url: str

class PhoneSettingsUpdate(BaseModel):
    phone_number: str
    channel_sms: Optional[bool] = True
    channel_whatsapp: Optional[bool] = True
    alert_daily_recap: Optional[bool] = True
    alert_anomaly: Optional[bool] = True
    alert_budget_warning: Optional[bool] = True

class PhoneSettingsOut(BaseModel):
    phone_number: Optional[str] = None
    is_connected: bool = False
    channel_sms: bool = True
    channel_whatsapp: bool = True
    alert_daily_recap: bool = True
    alert_anomaly: bool = True
    alert_budget_warning: bool = True
    connected_at: Optional[datetime] = None
    total_messages_sent: int = 0

class SendMessageRequest(BaseModel):
    phone_number: Optional[str] = None
    message_type: Optional[str] = "TEST_ALERT"
    channel: Optional[str] = "SMS"
    custom_text: Optional[str] = None

class DispatchedMessageOut(BaseModel):
    id: str
    user_id: str
    phone_number: str
    channel: str
    message_type: str
    content: str
    status: str
    dispatch_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
