# ⚡ Expense Pilot — Expense & Invoice Query Agent
> **Hackathon Problem Statement:** DEV-C04 | Meridian, Finance and Procurement  
> **Corporate Edition:** Meridian Enterprise Expense Management, Invoicing & Autonomous Query Engine

**Expense Pilot** is an enterprise AI query agent built specifically for corporate finance and procurement operations at Meridian. Employees, external vendors, department managers, and finance controllers interact with a single conversational agent that enforces strict role-based access control (RBAC), answers corporate expense policy questions with exact document citations, automates approval workflows with SLA reminder notifications, detects duplicate billing and purchase order (PO) discrepancies, and maintains an immutable, cryptographically hashed audit trail.

---

## 🏗️ Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend ["Frontend UI (React + Vite + Tailwind)"]
        UI_Role[Role Switcher: Employee / Vendor / Manager / Finance]
        UI_Chat[Agent Chat Hero with Citations & Tools]
        UI_Dash[Finance Dashboard: 6 KPIs & Side-by-Side Duplicates]
        UI_Claims[Claims & Invoices Table + OCR Upload]
        UI_App[Approvals & Escalations Workflow]
        UI_Audit[Audit Trail & Real-Time Chain Verification]
    end

    subgraph Auth ["Security & Guardrail Layer"]
        XUser[Header: X-User-Id]
        RBAC[Role Authorization Matrix: Employee | Vendor | Manager | Finance]
        PII[PII Masking: Card, Phone & Account Redaction]
        OOS[Out-of-Scope Intent Filter]
    end

    subgraph Agent ["Agent Core & Whitelisted Tools"]
        Engine[Agent Engine: Groq LLM + Deterministic Fallback]
        Hinglish[Hinglish & Natural Language Normalizer]
        T1[policy_qa: Chunked Semantic Search + Citations]
        T2[claim_status: Role-Checked Reimbursement Status]
        T3[invoice_status: Vendor-Restricted Invoice Query]
        T4[start_approval: Authorized Hierarchy Routing]
        T5[send_reminder: Rate-Limited Nudge with SMS]
        T6[escalate_to_finance: Fraud & High-Severity Dispatch]
        T7[get_finance_summary: Executive C-Suite Metrics]
    end

    subgraph Rules ["Corporate Rule Engine (services/rules.py)"]
        R_Dup[DUPLICATE_INVOICE: Vendor + Inv No / Amount Window]
        R_Limit[POLICY_LIMIT: Grade L1-L5 Per Diem Thresholds]
        R_PO[PO_MISMATCH: 5% / ₹1000 Tolerance Matching]
        R_Receipt[MISSING_RECEIPT: Mandatory > ₹500]
        R_Late[LATE_SUBMISSION: 30-Day Deadline]
        R_SLA[APPROVAL_DELAY: 48h Overdue SLA]
    end

    subgraph Storage ["Persistent Storage & Blockchain Trail"]
        DB[(MongoDB Atlas / mongomock-motor Fallback)]
        AuditLog[(Immutable Audit Log: SHA-256 Hash Chaining)]
    end

    UI_Chat --> XUser
    UI_Dash --> XUser
    XUser --> RBAC --> PII --> OOS --> Engine
    Engine --> Hinglish
    Engine --> T1 & T2 & T3 & T4 & T5 & T6 & T7
    T1 & T2 & T3 & T4 & T5 & T6 & T7 --> Rules
    Rules --> Storage
    Storage --> AuditLog
```

---

## 🌟 Key Capabilities

### 1. Policy Q&A With Mandatory Citations
The agent indexes the complete **Meridian Expense & Procurement Policy 2026** chunked across 12 realistic sections (`SEC-101` to `SEC-112`). It answers queries with exact document citations (`doc_name`, `section_id`, `title`) and per-diem limits for the user's specific employee grade (`L1` to `L5`). It **never hallucinates policy clauses**—if an expense item is uncovered, it explicitly states so.

### 2. Role-Enforced Status Lookups
- **Employees (`emp_john`)**: Can only view their own claims (`CLM-1042`), expected reimbursement dates, and flags; blocked with HTTP 403 from viewing peer claims or vendor bills.
- **Vendors (`ven_acme`)**: Can only query their own invoices (`INV-2004`); blocked from internal employee expense reports and competitor invoices.
- **Managers (`mgr_sarah`)**: Can query claims submitted by direct reports, view pending team approvals, and send reminders.
- **Finance Staff (`fin_alex`)**: Global visibility across corporate disbursements, overdue bills, duplicate alerts, and executive cash-flow KPIs.

### 3. Authorized Workflow State Machine & Reminders
- State progression: `Submitted -> Pending Manager -> Approved / Rejected -> Pending Finance -> Paid`.
- **Secondary Sign-off (SEC-106)**: Claims exceeding ₹10,000 approved by a manager automatically route to Finance for secondary approval before funds release.
- **Weekly Reimbursement Cycle (SEC-108)**: Approved claims calculate expected disbursement date as the immediate upcoming Friday.
- **SLA Reminders**: Pending approvals older than 48 hours trigger SMS/WhatsApp notifications with a 10-minute cooldown to prevent notification fatigue.
- Automated background worker scans pending items every 60 seconds.

### 4. Cryptographic, Append-Only Audit Trail (SHA-256)
Every submission, rule trigger, approval decision, reminder dispatch, and agent query is recorded into an append-only ledger (`db.audit_log`).
- Each block stores `prev_hash` and computes:
  $$\text{hash} = \text{SHA-256}(\text{prev\_hash} + \text{canonical\_json}(\text{entry}))$$
- An on-demand verification endpoint (`GET /api/audit/verify`) walks the chain and flags any modified, inserted, or deleted blocks.

### 5. Automated Duplicate Invoice & Discrepancy Escalations
- Automatically flags duplicate billing (matching vendor ID + invoice number, or matching vendor + amount within 7 days).
- Validates 3-way PO matching with a 5% or ₹1,000 tolerance window.
- Severe violations automatically create an **Open Escalation** ticket assigned to Finance Controller Alex Morgan (`fin_alex`).

### 6. Full Hinglish Query Support & PII Masking
- Natural understanding of mixed Hinglish queries:
  - *"Mera claim CLM-1042 approve hua kya?"*
  - *"Policy me hotel limit kitna hai L2 ke liye?"*
  - *"Vendor Acme ka payment kab aayega?"*
- Credit card numbers, bank account numbers, and phone numbers are automatically redacted as `[REDACTED_CARD_NUMBER]`, `[REDACTED_ACCOUNT_NUMBER]`, and `[REDACTED_PHONE_NUMBER]` before sending to LLM providers or audit logs.

---

## ⚡ 1-Command Startup

### Prerequisites
- Python 3.9+ installed
- Node.js 18+ and npm installed

### Start Both Backend and Frontend

```bash
# 1. Clone repository
git clone https://github.com/webdevkaif/gla-haktathon.git
cd gla-haktathon

# 2. Run the automated master startup script
./start.sh
```

Alternatively, run backend and frontend in separate terminals:

```bash
# Terminal 1: Backend API
cd backend
source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=.
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Frontend Console
cd frontend
npm install
npm run dev
```

- **Frontend Console:** `http://localhost:5173`
- **FastAPI Interactive Docs:** `http://localhost:8000/docs`
- **Audit Verification Endpoint:** `http://localhost:8000/api/audit/verify`

---

## 🎭 5-Step Demo Script (Walkthrough of the 4 Roles)

### Step 1: Employee John Doe (`emp_john`, Grade L2)
1. Open `http://localhost:5173`. Active role defaults to **John Doe (Employee)**.
2. In **Agent Chat**, type:
   > *"What is the hotel allowance for Grade L2 employees?"*
   - **Result**: Agent replies citing **SEC-104** with the exact ₹3,500/night limit for Tier-1 cities. Click the citation chip to view the excerpt.
3. Type:
   > *"Mera claim CLM-1042 approve hua kya?"*
   - **Result**: Agent calls `[claim_status]`, confirms `Approved`, and displays the scheduled Friday disbursement date.
4. Try unauthorized access: Type *"Check status of CLM-1022"* (Alice's claim).
   - **Result**: Agent politely refuses with `Access Restricted`.

### Step 2: Vendor Acme Supplies (`ven_acme`)
1. In the top-right role switcher, select **Acme Supplies (Vendor)**.
2. In **Agent Chat**, type:
   > *"What is the payment status of invoice INV-2004?"*
   - **Result**: Agent confirms invoice is `Approved` for ₹42,000 under PO-9002.
3. Type:
   > *"Check status of INV-2013"* (competitor TechCorp's invoice).
   - **Result**: Agent blocks access (`Access Restricted: Vendors can only query their own invoices`).
4. Switch to **Claims & Invoices** tab and click **Upload Invoice (OCR)** to test Mindee AI invoice parsing.

### Step 3: Manager Sarah Connor (`mgr_sarah`, Sales Head)
1. Switch role to **Sarah Connor (Manager)**.
2. Navigate to **Approvals & Escalations** tab.
3. Sarah sees pending approvals for her direct reports (e.g. John Doe).
4. Click **Approve** on a pending claim:
   - State instantly updates to `Approved`.
   - Expected payment date is calculated for upcoming Friday.
   - An immutable block is appended to the audit trail.
5. Click **Send Reminder** (bell icon) to dispatch a simulated carrier SMS reminder.

### Step 4: Finance Controller Alex Morgan (`fin_alex`)
1. Switch role to **Alex Morgan (Finance Controller)**.
2. Open **Finance Dashboard**:
   - Inspect all **6 live computed KPIs**: Pending Invoices, Overdue Payments, Reimbursement Requests, Flagged Duplicates, Approval Delays, and Open Escalations.
   - View the **Flagged Duplicate Invoices** side-by-side comparison (`INV-2005` vs `INV-2004`).
   - Click **Send Reminder** in the SLA delay table.
3. In **Approvals & Escalations**, resolve Open Escalation `ESC-4001` with an audit note.

### Step 5: Cryptographic Audit Trail Verification
1. Open the **Audit Trail** tab.
2. Observe the green badge: **"Cryptographic Audit Trail Integrity: 100% VALID"**.
3. Click **Re-Verify Chain**: The system walks all blocks and confirms zero hash discrepancies.

---

## 🧪 Comprehensive Verification Suite

Run all verification suites in one command:

```bash
# 1. Master Backend Test Suite (Stages 3, 4, 5, 6)
PYTHONPATH=. backend/.venv/bin/python backend/app/tests/test_suite.py

# 2. 25 Prompt Test Cases Runner (Policy citations, roles, Hinglish, guardrails)
PYTHONPATH=. backend/.venv/bin/python scripts/run_prompt_tests.py

# 3. Frontend Production Build Check
npm --prefix frontend run build
```

---

## 🛡️ Third-Party Services & Offline Autonomy Disclosure

| Service | Intended Role | Autonomous Offline Fallback (Active by Default) |
|---|---|---|
| **MongoDB Atlas** | Distributed Cloud Document DB | Automatically falls back to in-memory `mongomock-motor` when offline or without IP whitelist. |
| **Groq / Gemini LLM** | Generative conversational responses | High-precision deterministic regex & keyword parser executes tools, citations, and Hinglish queries offline. |
| **Mindee AI OCR** | Deep invoice/receipt extraction | Autonomous heuristic parser extracts vendor, amount, taxes, and dates when API key or internet is absent. |
| **Twilio API** | Live carrier SMS/WhatsApp dispatch | Dispatches simulated carrier messages to in-memory message ledger with zero failure risk. |

---

## 📂 Project Structure

```
gla-haktathon/
├── backend/
│   ├── app/
│   │   ├── agent/
│   │   │   ├── engine.py        # Conversational agent, PII masking, guardrails
│   │   │   └── tools.py         # 7 whitelisted role-checked enterprise tools
│   │   ├── routers/
│   │   │   ├── users.py         # User sessions & role switching
│   │   │   ├── claims.py        # Role-filtered claims & rule engine runner
│   │   │   ├── invoices.py      # Vendor invoices & Mindee AI OCR upload
│   │   │   ├── approvals.py     # Approval state machine & reminder triggers
│   │   │   ├── escalations.py   # High-severity compliance tickets
│   │   │   ├── audit.py         # Immutable SHA-256 audit log & verification
│   │   │   ├── policies.py      # 12 chunked corporate policy sections
│   │   │   └── dashboard.py     # 6 live executive finance KPIs
│   │   ├── services/
│   │   │   ├── rules.py         # Pure rule functions (duplicate, limits, PO, SLA)
│   │   │   ├── workflow.py      # Approval state machine & reminder scheduler
│   │   │   ├── escalation.py    # Ticket creation & resolution service
│   │   │   ├── audit.py         # SHA-256 hash chaining & chain verification
│   │   │   ├── seed_data.py     # Realistic Meridian corporate data seeder
│   │   │   └── messaging.py     # Twilio integration & simulated carrier SMS
│   │   ├── auth.py              # X-User-Id dependency & demo accounts
│   │   ├── database.py          # MongoDB client with mongomock-motor fallback
│   │   ├── models.py            # Enterprise document schemas
│   │   ├── schemas.py           # Pydantic v2 schemas
│   │   └── main.py              # FastAPI application & background SLA worker
│   └── tests/                   # Master test suite & prompt runners
├── docs/
│   └── test_cases.md            # 25 prompt test cases matrix
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Corporate header, role switcher & demo badge
│   │   │   ├── AgentChat.jsx    # Hero agent chat with citations & tools
│   │   │   ├── FinanceDashboard.jsx # 6 KPI cards, status charts, duplicates
│   │   │   ├── ClaimsInvoicesView.jsx # Claims & invoices with OCR upload
│   │   │   ├── ApprovalsEscalationsView.jsx # 1-click decisions & escalations
│   │   │   ├── AuditTrailView.jsx   # Block-by-block ledger & integrity badge
│   │   │   └── PoliciesView.jsx     # Policy browser with grade limit tables
│   │   ├── api.js               # Client API wrapper with X-User-Id headers
│   │   └── App.jsx              # Main application shell
│   └── index.html
├── scripts/
│   └── run_prompt_tests.py      # Automated 25-prompt execution runner
└── README.md
```

---

## 🏆 Hackathon Submission Notes (DEV-C04)
- **Problem Statement**: Meridian, Finance and Procurement
- **Zero Hallucination Policy**: Citations are mandatory for all policy responses.
- **Append-Only Immutability**: All modifications generate forward-chained SHA-256 blocks; verified on-demand.
- **Sample Data Flag**: Every UI panel, document, and test case clearly bears the Meridian sample corporate data designation.
