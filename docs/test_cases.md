# Meridian Expense Pilot — 25 Prompt Test Cases
**Problem Statement:** DEV-C04 (Meridian, Finance and Procurement)  
**Agent Engine:** Meridian Autonomous Query Agent (with Groq LLM & Deterministic Rule Fallback)

---

## Master Test Matrix

| ID | Category | Prompt / Input | Active Role | Expected Tool | Expected Citation / Entity | Expected Result |
|---|---|---|---|---|---|---|
| **TC-01** | Policy Q&A | "What is the daily meal limit for Grade L2 employees?" | `emp_john` (Employee) | `policy_qa` | `SEC-102` (Meal Allowances) | Returns ₹800 per day with citation to SEC-102. |
| **TC-02** | Policy Q&A | "What is the hotel allowance for Tier-1 cities like Mumbai?" | `emp_john` (Employee) | `policy_qa` | `SEC-104` (Hotel Limits) | Returns ₹3,500 (L1/L2), ₹6,000 (L3), ₹10,000 (L4/L5) with SEC-104 citation. |
| **TC-03** | Policy Q&A | "Do I need a receipt for an expense of ₹750?" | `emp_john` (Employee) | `policy_qa` | `SEC-106` (Receipt Rules) | States receipt is required for expenses > ₹500 under SEC-106. |
| **TC-04** | Policy Q&A | "What is the deadline to submit an expense claim?" | `emp_john` (Employee) | `policy_qa` | `SEC-105` (Submission Deadline) | Cites 30 calendar days from transaction date under SEC-105. |
| **TC-05** | Policy Q&A | "When will approved claims be paid into my bank account?" | `emp_john` (Employee) | `policy_qa` | `SEC-108` (Reimbursement Timeline) | Cites weekly Friday payout cycle for claims approved by Wednesday. |
| **TC-06** | Claim Status | "Check the status of my claim CLM-1042" | `emp_john` (Employee) | `claim_status` | `CLM-1042` | Status `Approved`, amount ₹750, scheduled payout upcoming Friday. |
| **TC-07** | Claim Status | "What is the status of CLM-1022?" (Alice's claim) | `emp_john` (Employee) | `claim_status` | `CLM-1022` | Access Restricted: employee blocked from viewing peer claim. |
| **TC-08** | Claim Status | "What is the status of CLM-1022?" (Direct report) | `mgr_sarah` (Manager) | `claim_status` | `CLM-1022` | Authorized: manager views team member Alice's claim details. |
| **TC-09** | Claim Status | "Status of claim CLM-1042" | `ven_acme` (Vendor) | `claim_status` | `CLM-1042` | Access Denied: vendors cannot access internal employee claims. |
| **TC-10** | Invoice Status | "What is the payment status of my invoice INV-2004?" | `ven_acme` (Vendor) | `invoice_status` | `INV-2004` | Status `Approved`, amount ₹42,000, associated PO-9002. |
| **TC-11** | Invoice Status | "Check status of INV-2013" (TechCorp invoice) | `ven_acme` (Vendor) | `invoice_status` | `INV-2013` | Access Restricted: vendor blocked from viewing competitor's invoice. |
| **TC-12** | Invoice Status | "Give me the status of invoice INV-2005" | `fin_alex` (Finance) | `invoice_status` | `INV-2005` | Authorized: shows duplicate alert matching INV-2004, frozen status. |
| **TC-13** | Invoice Status | "Status of vendor invoice INV-2004" | `emp_john` (Employee) | `invoice_status` | `INV-2004` | Access Denied: non-procurement employee blocked from vendor bills. |
| **TC-14** | Approval Action | "Approve claim CLM-1042" | `mgr_sarah` (Manager) | `decide_approval` | `APP-3001` | Successfully approved; calculates Friday disbursement date. |
| **TC-15** | Approval Action | "Approve claim CLM-1042" | `emp_john` (Employee) | `decide_approval` | `APP-3001` | Unauthorized: HTTP 403 Forbidden; employee cannot approve own claim. |
| **TC-16** | Approval Action | "Approve secondary approval for high-value claim" | `fin_alex` (Finance) | `decide_approval` | `APP-SEC` | Successfully approved by Finance Controller per SEC-106 threshold. |
| **TC-17** | Reminder Action | "Send reminder for approval APP-3002" | `mgr_sarah` (Manager) | `send_reminder` | `APP-3002` | Reminder dispatched via simulated carrier SMS; increments count. |
| **TC-18** | Reminder Action | "Send reminder for approval APP-3002" (Immediate retry) | `mgr_sarah` (Manager) | `send_reminder` | `APP-3002` | Rate limit: 429 Cooldown enforced (must wait 10 minutes). |
| **TC-19** | Reminder Action | "Trigger SLA scan for overdue approvals" | `fin_alex` (Finance) | `check_reminders` | `SLA-Worker` | Scans all pending > 2 days and dispatches simulated reminders. |
| **TC-20** | Escalation Action | "Submitting duplicate invoice INV-2005" | System / Rule | `rule_duplicate` | `ESC-4001` | Auto-creates Open Escalation assigned to `fin_alex`. |
| **TC-21** | Escalation Action | "Resolve escalation ESC-4001" | `fin_alex` (Finance) | `resolve_escalation` | `ESC-4001` | Status changed to `Resolved`; logs immutable audit entry. |
| **TC-22** | Hinglish Query | "Mera claim CLM-1042 approve hua kya?" | `emp_john` (Employee) | `claim_status` | `CLM-1042` | Accurately extracts CLM-1042 and returns approval status in plain terms. |
| **TC-23** | Hinglish Query | "Policy me hotel limit kitna hai L2 ke liye?" | `emp_john` (Employee) | `policy_qa` | `SEC-104` (Hotel Rates) | Accurately maps to SEC-104 citing ₹3,500/night limit for Grade L2. |
| **TC-24** | Out-of-Scope | "Tell me a funny joke about office pizza parties" | `emp_john` (Employee) | `None` | `Out-of-Scope` | Polite refusal: states scope is strictly corporate expenses & procurement. |
| **TC-25** | Out-of-Scope | "What is the weather in Mumbai tomorrow?" | `emp_john` (Employee) | `None` | `Out-of-Scope` | Polite refusal: guides user to ask about travel or meal allowances. |
