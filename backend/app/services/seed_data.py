from datetime import datetime, timedelta
import hashlib
import json
from typing import Dict, Any, List
from backend.app.models import (
    User, Policy, Claim, Invoice, PurchaseOrder, Approval, Escalation, AuditLog,
    Expense, Budget, SavingGoal, Alert
)
from backend.app.auth import DEMO_USERS
from backend.app.services.audit import compute_audit_hash, GENESIS_HASH

# ─────────────────────────────────────────────────────────────────────────────
# 12-Section Realistic Corporate Policy Text (Meridian 2026)
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_POLICIES = [
    {
        "id": "POL-101",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-101",
        "title": "Purpose, Scope & General Principles",
        "category": "General",
        "text": (
            "This policy establishes rules for business expenses and procurement at Meridian. "
            "All expenditures must be ordinary, reasonable, and necessary for business objectives. "
            "Reimbursement claims must reflect actual incurred expenses. Employees must exercise prudent judgment, "
            "and procurement of third-party services requires adherence to competitive purchase order workflows."
        ),
        "grade_limits": {}
    },
    {
        "id": "POL-102",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-102",
        "title": "Meal & Business Entertainment Allowances",
        "category": "Meals",
        "text": (
            "Daily meal limits vary by employee grade: Grades L1 and L2 are entitled to ₹800 per day. "
            "Grade L3 is entitled to ₹1,500 per day. Grades L4 and L5 (Management & Leadership) are entitled to ₹3,000 per day. "
            "Client entertainment expenses require pre-approval by a Department Head (L4+) and must list all attendees. "
            "Personal alcoholic beverages without clients present are strictly non-reimbursable."
        ),
        "grade_limits": {"L1": 800.0, "L2": 800.0, "L3": 1500.0, "L4": 3000.0, "L5": 3000.0}
    },
    {
        "id": "POL-103",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-103",
        "title": "Travel, Flights & Local Transportation",
        "category": "Travel",
        "text": (
            "All domestic air travel must be booked in Economy Class at least 7 days in advance. "
            "Train travel is permitted up to 2nd AC for Grades L1-L3 and 1st AC for L4-L5. "
            "Local commute via app rideshare (Uber/Ola) or metered taxis is reimbursable for business travel. "
            "Personal car mileage may be reimbursed at the standard rate of ₹10 per km with odometer logs."
        ),
        "grade_limits": {"L1": 2500.0, "L2": 3500.0, "L3": 6000.0, "L4": 12000.0, "L5": 20000.0}
    },
    {
        "id": "POL-104",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-104",
        "title": "Hotel & Accommodation Rate Limits",
        "category": "Hotel",
        "text": (
            "Nightly hotel room allowances for Tier-1 metropolitan cities (Mumbai, Delhi NCR, Bengaluru) are: "
            "Grades L1 and L2: up to ₹3,500 per night; Grade L3: up to ₹6,000 per night; Grades L4 and L5: up to ₹10,000 per night. "
            "For Tier-2 and Tier-3 cities, the allowance is reduced by 25%. "
            "Incidental personal charges such as mini-bar, in-room pay-TV, and spa services will not be reimbursed."
        ),
        "grade_limits": {"L1": 3500.0, "L2": 3500.0, "L3": 6000.0, "L4": 10000.0, "L5": 10000.0}
    },
    {
        "id": "POL-105",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-105",
        "title": "Claim Submission Deadline & Grace Periods",
        "category": "General",
        "text": (
            "All expense claims must be submitted within thirty (30) calendar days from the date the expense was incurred. "
            "Claims submitted beyond 30 days are automatically flagged as LATE_SUBMISSION and require written justification "
            "and Finance Controller approval. Claims older than 90 days are strictly rejected without exception."
        ),
        "grade_limits": {}
    },
    {
        "id": "POL-106",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-106",
        "title": "Receipt & Documentation Verification Rules",
        "category": "Documentation",
        "text": (
            "An original itemized tax invoice or digital receipt is mandatory for any single transaction exceeding ₹500. "
            "Credit card slips or bank account statements showing lump-sum debits do not qualify as itemized receipts. "
            "Claims missing receipts are flagged with MISSING_RECEIPT and held until proof of purchase is attached."
        ),
        "grade_limits": {}
    },
    {
        "id": "POL-107",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-107",
        "title": "Approval Hierarchy & Financial Thresholds",
        "category": "Workflow",
        "text": (
            "Approval authority is tiered by claim value: "
            "Claims under ₹10,000 require approval from the employee's direct Line Manager. "
            "Claims between ₹10,000 and ₹50,000 require secondary approval from the Department Head (L4+). "
            "Claims exceeding ₹50,000 require final sign-off from the Finance Controller (L5). "
            "Approvers have a 2-day SLA (48 hours) to review and decide on pending requests."
        ),
        "grade_limits": {}
    },
    {
        "id": "POL-108",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-108",
        "title": "Reimbursement Disbursement Timeline",
        "category": "Reimbursement",
        "text": (
            "Reimbursement cycles run weekly. Claims approved by Wednesday 17:00 IST are processed for bank disbursement "
            "on the immediate Friday. Expected payment date is calculated as the upcoming Friday following full approval. "
            "Payments are deposited directly into the employee's registered corporate salary bank account."
        ),
        "grade_limits": {}
    },
    {
        "id": "POL-109",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-109",
        "title": "Vendor Invoice Payment Terms (Net 30)",
        "category": "Procurement",
        "text": (
            "Standard vendor payment terms are Net-30 from the official invoice receipt date. "
            "All vendor invoices must cite a valid Purchase Order (PO) number. "
            "Payment runs occur bi-weekly on the 1st and 15th of each calendar month. "
            "Invoices marked 'Paid' have funds released; 'Approved' invoices await the next scheduled disbursement window."
        ),
        "grade_limits": {}
    },
    {
        "id": "POL-110",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-110",
        "title": "Purchase Order (PO) Matching & Tolerance Thresholds",
        "category": "Procurement",
        "text": (
            "Invoices are validated via 3-way matching against approved Purchase Orders. "
            "A cumulative price tolerance of up to 5% or ₹1,000 (whichever is lower) is allowed for freight or tax rounding. "
            "Any invoice exceeding the PO total beyond this tolerance triggers a PO_MISMATCH flag and is frozen for procurement review."
        ),
        "grade_limits": {}
    },
    {
        "id": "POL-111",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-111",
        "title": "Duplicate Invoice Detection & Fraud Prevention",
        "category": "Security",
        "text": (
            "The system automatically scans all incoming invoices for duplicates. "
            "A submission is flagged as DUPLICATE_INVOICE if it matches an existing record by: "
            "(a) Identical vendor ID and invoice number; OR "
            "(b) Identical vendor ID, identical amount, and an invoice date within 7 calendar days. "
            "Duplicate invoices are immediately blocked from payment and escalated to Finance Audit."
        ),
        "grade_limits": {}
    },
    {
        "id": "POL-112",
        "doc_name": "Meridian Expense & Procurement Policy 2026",
        "section_id": "SEC-112",
        "title": "Escalation Matrix & Audit Review Procedures",
        "category": "Audit",
        "text": (
            "Violations classified as High Severity (duplicate billing, intentional fraud, over-limit by > 50%) "
            "automatically create an Open Escalation assigned to the Finance Lead. "
            "Escalations must be reviewed within 48 hours. The finance team may request updated documentation, "
            "apply penalty deductions, or reject non-compliant claims."
        ),
        "grade_limits": {}
    }
]

# ─────────────────────────────────────────────────────────────────────────────
# Master Seeder
# ─────────────────────────────────────────────────────────────────────────────

async def seed_enterprise_data(db) -> Dict[str, int]:
    """
    Clears and seeds realistic Meridian corporate data for Dev-C04:
    - 4 Demo Users
    - 12 Corporate Policy Sections
    - 4 Purchase Orders
    - 28 Claims (with deliberate stories: over-limit, missing receipt, late, CLM-1042)
    - 20 Invoices (2 duplicate pairs, PO mismatch, 3 overdue)
    - 10 Approvals (4 pending > 3 days)
    - 3 Escalations
    - Cryptographically linked Audit Trail
    """
    now = datetime.utcnow()

    # Clear enterprise collections
    await db.users.delete_many({})
    await db.policies.delete_many({})
    await db.claims.delete_many({})
    await db.invoices.delete_many({})
    await db.purchase_orders.delete_many({})
    await db.approvals.delete_many({})
    await db.escalations.delete_many({})
    await db.audit_log.delete_many({})

    # 1. Seed Demo Users
    user_docs = [User.create(**u) for u in DEMO_USERS.values()]
    await db.users.insert_many(user_docs)

    # 2. Seed Policy Documents
    policy_docs = [Policy.create(
        policy_id=p["id"],
        doc_name=p["doc_name"],
        section_id=p["section_id"],
        title=p["title"],
        text=p["text"],
        category=p.get("category"),
        grade_limits=p.get("grade_limits")
    ) for p in SAMPLE_POLICIES]
    await db.policies.insert_many(policy_docs)

    # 3. Seed Purchase Orders
    po_docs = [
        PurchaseOrder.create("PO-9001", "ven_acme", 150000.0, description="Annual IT Infrastructure & Office Supplies"),
        PurchaseOrder.create("PO-9002", "ven_acme", 42000.0, description="Ergonomic Workstations for Engineering Team"),
        PurchaseOrder.create("PO-9003", "ven_acme", 85000.0, description="Server Hardware Maintenance & Upgrades"),
        PurchaseOrder.create("PO-9004", "ven_acme", 25000.0, description="Logistics & Warehousing Services (PO Mismatch Test)")
    ]
    await db.purchase_orders.insert_many(po_docs)

    # 4. Seed Claims (28 deliberate items)
    # Story 1: CLM-1042 for John Doe (Acceptance Check 1)
    friday_date = (now + timedelta(days=(4 - now.weekday()) % 7)).strftime("%Y-%m-%d")
    claim_docs = [
        Claim.create(
            claim_no="CLM-1042",
            employee_id="emp_john",
            category="Meals",
            amount=750.0,
            date=(now - timedelta(days=2)).strftime("%Y-%m-%d"),
            receipt_attached=True,
            status="Approved",
            approver_id="mgr_sarah",
            expected_payment_date=friday_date,
            description="Client lunch meeting at cafe (Grade L2 compliant)",
            policy_flags=[]
        ),
        # Story 2: Policy Violation - Over limit (L2 meal limit is ₹800, claim is ₹4,500)
        Claim.create(
            claim_no="CLM-1015",
            employee_id="emp_john",
            category="Meals",
            amount=4500.0,
            date=(now - timedelta(days=5)).strftime("%Y-%m-%d"),
            receipt_attached=True,
            status="Pending Manager",
            approver_id="mgr_sarah",
            description="Team celebration dinner at upscale bistro",
            policy_flags=["POLICY_LIMIT: Amount ₹4500 exceeds grade L2 daily meal limit of ₹800"]
        ),
        # Story 3: Policy Violation - Missing receipt (> ₹500 requires receipt)
        Claim.create(
            claim_no="CLM-1018",
            employee_id="emp_john",
            category="Travel",
            amount=2200.0,
            date=(now - timedelta(days=4)).strftime("%Y-%m-%d"),
            receipt_attached=False,
            status="Pending Manager",
            approver_id="mgr_sarah",
            description="Airport cab fare on cash voucher",
            policy_flags=["MISSING_RECEIPT: Mandatory for expenses over ₹500"]
        ),
        # Story 4: Policy Violation - Late submission (> 30 days)
        Claim.create(
            claim_no="CLM-1022",
            employee_id="emp_alice",
            category="Hotel",
            amount=8500.0,
            date=(now - timedelta(days=48)).strftime("%Y-%m-%d"),
            receipt_attached=True,
            status="Submitted",
            approver_id="mgr_sarah",
            description="Hotel stay during August conference",
            policy_flags=["LATE_SUBMISSION: Submitted past 30-day deadline"]
        ),
    ]

    # Additional standard realistic claims across employees, categories, and statuses
    claim_templates = [
        ("CLM-1001", "emp_john", "Meals", 350.0, 3, True, "Approved", "mgr_sarah", "Working lunch at client site"),
        ("CLM-1002", "emp_john", "Travel", 450.0, 6, True, "Paid", "mgr_sarah", "Taxi to airport terminal"),
        ("CLM-1003", "emp_john", "Utilities", 1499.0, 8, True, "Paid", "mgr_sarah", "Monthly remote broadband bill"),
        ("CLM-1004", "emp_john", "Meals", 620.0, 10, True, "Paid", "mgr_sarah", "Dinner during project rollout"),
        ("CLM-1005", "emp_john", "Travel", 280.0, 12, True, "Approved", "mgr_sarah", "Metro commute for offsite"),
        ("CLM-1006", "emp_john", "Documentation", 320.0, 15, True, "Paid", "mgr_sarah", "Legal notarization fees"),
        ("CLM-1007", "emp_john", "Travel", 3100.0, 18, True, "Approved", "mgr_sarah", "Train ticket 2AC to regional office"),
        ("CLM-1008", "emp_john", "Meals", 780.0, 20, True, "Paid", "mgr_sarah", "Client breakfast briefing"),
        ("CLM-1009", "emp_john", "Hotel", 3400.0, 22, True, "Paid", "mgr_sarah", "Overnight stay Tier-1 city"),
        ("CLM-1010", "emp_john", "Meals", 420.0, 24, True, "Paid", "mgr_sarah", "Project milestone dinner"),
        ("CLM-1011", "emp_john", "Travel", 890.0, 26, True, "Paid", "mgr_sarah", "Airport express cab"),
        ("CLM-1012", "emp_john", "Meals", 290.0, 28, True, "Paid", "mgr_sarah", "Coffee and snacks at seminar"),
        # Alice Smith (L3 employee) claims
        ("CLM-1025", "emp_alice", "Meals", 1200.0, 1, True, "Pending Manager", "mgr_sarah", "Client dinner (Grade L3 limit ₹1,500)"),
        ("CLM-1026", "emp_alice", "Travel", 4800.0, 3, True, "Pending Finance", "fin_alex", "Domestic flight Economy booking"),
        ("CLM-1027", "emp_alice", "Hotel", 5800.0, 7, True, "Approved", "mgr_sarah", "2-night stay Tier-1 city"),
        ("CLM-1028", "emp_alice", "Travel", 950.0, 11, True, "Paid", "mgr_sarah", "Inter-city cab transfer"),
        ("CLM-1029", "emp_alice", "Meals", 1400.0, 14, True, "Paid", "mgr_sarah", "Dinner with partner delegates"),
        ("CLM-1030", "emp_alice", "Utilities", 2100.0, 16, True, "Paid", "mgr_sarah", "Mobile data & international roaming"),
        ("CLM-1031", "emp_alice", "Travel", 350.0, 19, True, "Paid", "mgr_sarah", "Local rideshare commute"),
        ("CLM-1032", "emp_alice", "Meals", 890.0, 21, True, "Paid", "mgr_sarah", "Breakfast and team snacks"),
        ("CLM-1033", "emp_alice", "Documentation", 1200.0, 23, True, "Paid", "mgr_sarah", "Conference pass entry fee"),
        ("CLM-1034", "emp_alice", "Travel", 1600.0, 25, True, "Paid", "mgr_sarah", "Rental car for site audit"),
        ("CLM-1035", "emp_alice", "Hotel", 4200.0, 27, True, "Paid", "mgr_sarah", "Tier-2 hotel room booking"),
        ("CLM-1036", "emp_alice", "Meals", 750.0, 29, True, "Paid", "mgr_sarah", "Lunch during client onboarding")
    ]

    for (c_no, emp, cat, amt, days_ago, rcpt, st, appr, desc) in claim_templates:
        claim_date = (now - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        exp_pay = (now + timedelta(days=5)).strftime("%Y-%m-%d") if st in ["Approved", "Pending Finance"] else None
        claim_docs.append(Claim.create(
            claim_no=c_no,
            employee_id=emp,
            category=cat,
            amount=amt,
            date=claim_date,
            receipt_attached=rcpt,
            status=st,
            approver_id=appr,
            expected_payment_date=exp_pay,
            description=desc,
            policy_flags=[]
        ))

    await db.claims.insert_many(claim_docs)

    # 5. Seed Invoices (20 deliberate items)
    invoice_docs = [
        # Overdue item 1 (Due 19 days ago, Pending Approval)
        Invoice.create(
            invoice_no="INV-2002",
            vendor_id="ven_acme",
            vendor_name="Acme Supplies Ltd",
            amount=38500.0,
            invoice_date=(now - timedelta(days=49)).strftime("%Y-%m-%d"),
            due_date=(now - timedelta(days=19)).strftime("%Y-%m-%d"),
            status="Pending Approval",
            po_no="PO-9001",
            flags=["OVERDUE: Payment due date passed (19 days overdue)"]
        ),
        # Overdue item 2 (Due 14 days ago, Received)
        Invoice.create(
            invoice_no="INV-2006",
            vendor_id="ven_acme",
            vendor_name="Acme Supplies Ltd",
            amount=14200.0,
            invoice_date=(now - timedelta(days=44)).strftime("%Y-%m-%d"),
            due_date=(now - timedelta(days=14)).strftime("%Y-%m-%d"),
            status="Received",
            po_no="PO-9001",
            flags=["OVERDUE: Payment due date passed (14 days overdue)"]
        ),
        # Overdue item 3 (Due 9 days ago, Disputed)
        Invoice.create(
            invoice_no="INV-2010",
            vendor_id="ven_acme",
            vendor_name="Acme Supplies Ltd",
            amount=21000.0,
            invoice_date=(now - timedelta(days=39)).strftime("%Y-%m-%d"),
            due_date=(now - timedelta(days=9)).strftime("%Y-%m-%d"),
            status="Disputed",
            po_no="PO-9001",
            flags=["OVERDUE: Payment due date passed", "DISPUTED: Damaged goods delivered"]
        ),
        # Duplicate Pair 1 (INV-2004 and INV-2005)
        Invoice.create(
            invoice_no="INV-2004",
            vendor_id="ven_acme",
            vendor_name="Acme Supplies Ltd",
            amount=42000.0,
            invoice_date=(now - timedelta(days=15)).strftime("%Y-%m-%d"),
            due_date=(now + timedelta(days=15)).strftime("%Y-%m-%d"),
            status="Approved",
            po_no="PO-9002",
            flags=[]
        ),
        Invoice.create(
            invoice_no="INV-2005",
            vendor_id="ven_acme",
            vendor_name="Acme Supplies Ltd",
            amount=42000.0,
            invoice_date=(now - timedelta(days=13)).strftime("%Y-%m-%d"),
            due_date=(now + timedelta(days=17)).strftime("%Y-%m-%d"),
            status="Received",
            po_no="PO-9002",
            duplicate_of="INV-2004",
            flags=["DUPLICATE_INVOICE: Matches INV-2004 (same vendor, amount ₹42000, within 2 days)"]
        ),
        # Duplicate Pair 2 (INV-2011 and INV-2012)
        Invoice.create(
            invoice_no="INV-2011",
            vendor_id="ven_acme",
            vendor_name="Acme Supplies Ltd",
            amount=18500.0,
            invoice_date=(now - timedelta(days=8)).strftime("%Y-%m-%d"),
            due_date=(now + timedelta(days=22)).strftime("%Y-%m-%d"),
            status="Pending Approval",
            po_no="PO-9001",
            flags=[]
        ),
        Invoice.create(
            invoice_no="INV-2012",
            vendor_id="ven_acme",
            vendor_name="Acme Supplies Ltd",
            amount=18500.0,
            invoice_date=(now - timedelta(days=6)).strftime("%Y-%m-%d"),
            due_date=(now + timedelta(days=24)).strftime("%Y-%m-%d"),
            status="Received",
            po_no="PO-9001",
            duplicate_of="INV-2011",
            flags=["DUPLICATE_INVOICE: Matches INV-2011 (same vendor and exact amount within 2 days)"]
        ),
        # PO Mismatch Story (PO-9004 is ₹25,000, invoice is ₹32,000)
        Invoice.create(
            invoice_no="INV-2008",
            vendor_id="ven_acme",
            vendor_name="Acme Supplies Ltd",
            amount=32000.0,
            invoice_date=(now - timedelta(days=10)).strftime("%Y-%m-%d"),
            due_date=(now + timedelta(days=20)).strftime("%Y-%m-%d"),
            status="Received",
            po_no="PO-9004",
            flags=["PO_MISMATCH: Invoice ₹32000 exceeds PO-9004 value ₹25000 by 28%"]
        ),
    ]

    # Additional realistic invoices to reach 20
    extra_invoices = [
        ("INV-2001", 12500.0, 25, 5, "Paid", "PO-9001"),
        ("INV-2003", 5600.0, 22, 8, "Approved", "PO-9001"),
        ("INV-2007", 8900.0, 18, 12, "Paid", "PO-9001"),
        ("INV-2009", 16800.0, 14, 16, "Approved", "PO-9003"),
        ("INV-2013", 29500.0, 12, 18, "Pending Approval", "PO-9003"),
        ("INV-2014", 7400.0, 10, 20, "Paid", "PO-9001"),
        ("INV-2015", 34500.0, 7, 23, "Pending Approval", "PO-9003"),
        ("INV-2016", 11200.0, 5, 25, "Approved", "PO-9001"),
        ("INV-2017", 4900.0, 4, 26, "Received", "PO-9001"),
        ("INV-2018", 15800.0, 3, 27, "Received", "PO-9001"),
        ("INV-2019", 22400.0, 2, 28, "Received", "PO-9003"),
        ("INV-2020", 9800.0, 1, 29, "Received", "PO-9001"),
    ]

    for inv_no, amt, days_ago, days_due, st, po in extra_invoices:
        inv_date = (now - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        due_dt = (now + timedelta(days=days_due)).strftime("%Y-%m-%d")
        v_id = "ven_techcorp" if po == "PO-9003" else ("ven_cloudinfra" if po == "PO-9004" else "ven_acme")
        v_name = "TechCorp Systems Ltd" if po == "PO-9003" else ("CloudInfra Hosting" if po == "PO-9004" else "Acme Supplies Ltd")
        invoice_docs.append(Invoice.create(
            invoice_no=inv_no,
            vendor_id=v_id,
            vendor_name=v_name,
            amount=amt,
            invoice_date=inv_date,
            due_date=due_dt,
            status=st,
            po_no=po,
            flags=[]
        ))

    await db.invoices.insert_many(invoice_docs)

    # 6. Seed Approvals (10 items including 4 pending > 3 days)
    approval_docs = [
        # Approval Delay 1: CLM-1015 (Pending 5 days)
        Approval.create(
            approval_id="APP-3001",
            entity_type="claim",
            entity_id="CLM-1015",
            approver_id="mgr_sarah",
            state="Pending",
            due_at=now - timedelta(days=3),
            reminders_sent=2,
            last_reminder_at=now - timedelta(days=1)
        ),
        # Approval Delay 2: CLM-1018 (Pending 4 days)
        Approval.create(
            approval_id="APP-3002",
            entity_type="claim",
            entity_id="CLM-1018",
            approver_id="mgr_sarah",
            state="Pending",
            due_at=now - timedelta(days=2),
            reminders_sent=1,
            last_reminder_at=now - timedelta(days=1)
        ),
        # Approval Delay 3: INV-2002 (Pending 6 days)
        Approval.create(
            approval_id="APP-3003",
            entity_type="invoice",
            entity_id="INV-2002",
            approver_id="fin_alex",
            state="Pending",
            due_at=now - timedelta(days=4),
            reminders_sent=3,
            last_reminder_at=now - timedelta(hours=18)
        ),
        # Approval Delay 4: INV-2008 (Pending 4 days)
        Approval.create(
            approval_id="APP-3004",
            entity_type="invoice",
            entity_id="INV-2008",
            approver_id="fin_alex",
            state="Pending",
            due_at=now - timedelta(days=2),
            reminders_sent=1,
            last_reminder_at=now - timedelta(hours=22)
        ),
        # Non-delayed / completed approvals
        Approval.create(
            approval_id="APP-3005",
            entity_type="claim",
            entity_id="CLM-1042",
            approver_id="mgr_sarah",
            state="Approved",
            due_at=now - timedelta(days=1),
            reminders_sent=0
        ),
        Approval.create(
            approval_id="APP-3006",
            entity_type="claim",
            entity_id="CLM-1002",
            approver_id="mgr_sarah",
            state="Pending",
            due_at=now + timedelta(days=1),
            reminders_sent=0
        ),
        Approval.create(
            approval_id="APP-3007",
            entity_type="invoice",
            entity_id="INV-2013",
            approver_id="fin_alex",
            state="Pending",
            due_at=now + timedelta(days=1),
            reminders_sent=0
        ),
        Approval.create(
            approval_id="APP-3008",
            entity_type="invoice",
            entity_id="INV-2004",
            approver_id="fin_alex",
            state="Approved",
            due_at=now - timedelta(days=12),
            reminders_sent=0
        ),
        Approval.create(
            approval_id="APP-3009",
            entity_type="invoice",
            entity_id="INV-2015",
            approver_id="fin_alex",
            state="Pending",
            due_at=now + timedelta(hours=14),
            reminders_sent=0
        ),
        Approval.create(
            approval_id="APP-3010",
            entity_type="claim",
            entity_id="CLM-1022",
            approver_id="mgr_sarah",
            state="Rejected",
            due_at=now - timedelta(days=40),
            reminders_sent=1
        ),
    ]
    await db.approvals.insert_many(approval_docs)

    # 7. Seed Escalations (3 deliberate items)
    escalation_docs = [
        Escalation.create(
            escalation_id="ESC-4001",
            entity_type="invoice",
            entity_id="INV-2005",
            reason="duplicate",
            severity="high",
            assignee_id="fin_alex",
            status="Open",
            summary="Duplicate invoice flagged: INV-2005 matches INV-2004 (same vendor Acme, amount ₹42,000 within 2 days)."
        ),
        Escalation.create(
            escalation_id="ESC-4002",
            entity_type="invoice",
            entity_id="INV-2008",
            reason="discrepancy",
            severity="medium",
            assignee_id="fin_alex",
            status="Open",
            summary="PO Mismatch: Invoice INV-2008 amount ₹32,000 exceeds approved PO-9004 amount ₹25,000 by 28%."
        ),
        Escalation.create(
            escalation_id="ESC-4003",
            entity_type="claim",
            entity_id="CLM-1015",
            reason="policy_violation",
            severity="high",
            assignee_id="fin_alex",
            status="Open",
            summary="Policy Violation: Claim CLM-1015 amount ₹4,500 exceeds Grade L2 daily meal limit of ₹800 by 462%."
        )
    ]
    await db.escalations.insert_many(escalation_docs)

    # 8. Seed Audit Log with cryptographic hash chain
    initial_audit_entries = [
        {
            "id": "AUD-INIT-001",
            "ts": now - timedelta(days=15),
            "actor_id": "system",
            "actor_role": "finance",
            "action": "POLICY_SEED",
            "entity_type": "policy",
            "entity_id": "POL-101",
            "input": {"policy_doc": "Meridian Expense & Procurement Policy 2026"},
            "rule_id": None,
            "result": {"status": "seeded", "sections_count": 12},
            "status": "SUCCESS"
        },
        {
            "id": "AUD-INIT-002",
            "ts": now - timedelta(days=13),
            "actor_id": "ven_acme",
            "actor_role": "vendor",
            "action": "INVOICE_SUBMIT",
            "entity_type": "invoice",
            "entity_id": "INV-2004",
            "input": {"amount": 42000.0, "po_no": "PO-9002"},
            "rule_id": None,
            "result": {"status": "Received"},
            "status": "SUCCESS"
        },
        {
            "id": "AUD-INIT-003",
            "ts": now - timedelta(days=13),
            "actor_id": "ven_acme",
            "actor_role": "vendor",
            "action": "INVOICE_SUBMIT",
            "entity_type": "invoice",
            "entity_id": "INV-2005",
            "input": {"amount": 42000.0, "po_no": "PO-9002"},
            "rule_id": "DUPLICATE_INVOICE",
            "result": {"flag": "DUPLICATE_INVOICE", "duplicate_of": "INV-2004"},
            "status": "SUCCESS"
        },
        {
            "id": "AUD-INIT-004",
            "ts": now - timedelta(days=13),
            "actor_id": "system",
            "actor_role": "finance",
            "action": "ESCALATION_CREATE",
            "entity_type": "escalation",
            "entity_id": "ESC-4001",
            "input": {"target_invoice": "INV-2005", "reason": "duplicate"},
            "rule_id": "DUPLICATE_INVOICE",
            "result": {"escalation_id": "ESC-4001", "assigned_to": "fin_alex"},
            "status": "SUCCESS"
        },
        {
            "id": "AUD-INIT-005",
            "ts": now - timedelta(days=5),
            "actor_id": "emp_john",
            "actor_role": "employee",
            "action": "CLAIM_SUBMIT",
            "entity_type": "claim",
            "entity_id": "CLM-1015",
            "input": {"category": "Meals", "amount": 4500.0},
            "rule_id": "POLICY_LIMIT",
            "result": {"policy_flags": ["POLICY_LIMIT: Exceeds L2 limit of ₹800"]},
            "status": "SUCCESS"
        },
        {
            "id": "AUD-INIT-006",
            "ts": now - timedelta(days=2),
            "actor_id": "emp_john",
            "actor_role": "employee",
            "action": "CLAIM_SUBMIT",
            "entity_type": "claim",
            "entity_id": "CLM-1042",
            "input": {"category": "Meals", "amount": 750.0},
            "rule_id": None,
            "result": {"status": "Submitted"},
            "status": "SUCCESS"
        },
        {
            "id": "AUD-INIT-007",
            "ts": now - timedelta(days=1),
            "actor_id": "mgr_sarah",
            "actor_role": "manager",
            "action": "APPROVAL_DECIDE",
            "entity_type": "claim",
            "entity_id": "CLM-1042",
            "input": {"decision": "Approved"},
            "rule_id": None,
            "result": {"new_state": "Approved", "expected_payment_date": friday_date},
            "status": "SUCCESS"
        }
    ]

    audit_docs = []
    current_hash = "0" * 64
    for entry in initial_audit_entries:
        next_hash = compute_audit_hash(current_hash, entry)
        doc = AuditLog.create(
            actor_id=entry["actor_id"],
            actor_role=entry["actor_role"],
            action=entry["action"],
            entity_type=entry["entity_type"],
            entity_id=entry["entity_id"],
            input_data=entry["input"],
            rule_id=entry["rule_id"],
            result=entry["result"],
            status=entry["status"],
            prev_hash=current_hash,
            entry_hash=next_hash,
            log_id=entry["id"]
        )
        doc["ts"] = entry["ts"]
        audit_docs.append(doc)
        current_hash = next_hash

    await db.audit_log.insert_many(audit_docs)

    return {
        "users": len(user_docs),
        "policies": len(policy_docs),
        "purchase_orders": len(po_docs),
        "claims": len(claim_docs),
        "invoices": len(invoice_docs),
        "approvals": len(approval_docs),
        "escalations": len(escalation_docs),
        "audit_logs": len(audit_docs)
    }

# Backwards compatibility wrapper
async def seed_demo_data(db, user_id: str = "user_default") -> int:
    counts = await seed_enterprise_data(db)
    return counts.get("claims", 0) + counts.get("invoices", 0)
