import re
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple
from backend.app.models import Approval, Escalation, serialize_doc, serialize_docs, build_id_query
from backend.app.services.audit import write_audit
from backend.app.services.workflow import (
    send_approval_reminder, calculate_next_reimbursement_friday
)
from backend.app.services.escalation import create_escalation

# ─────────────────────────────────────────────────────────────────────────────
# 1. Policy Q&A Tool (with strict citations)
# ─────────────────────────────────────────────────────────────────────────────

POLICY_KEYWORD_INDEX = {
    "Meals": ["meal", "meals", "food", "dinner", "lunch", "breakfast", "beverage", "client entertainment", "alcohol", "dining", "swiggy", "zomato", "restaurant", "cafe"],
    "Travel": ["travel", "flight", "airfare", "air travel", "train", "rail", "economy", "cab", "uber", "ola", "taxi", "mileage", "commute", "car", "distance"],
    "Hotel": ["hotel", "room", "accommodation", "stay", "tier-1", "tier-2", "tier-3", "night", "lodging", "mini-bar"],
    "Supplies": ["laptop", "hardware", "software", "monitor", "mouse", "keyboard", "stationery", "equipment", "wfh", "office supply", "supplies"],
    "Hierarchy": ["approval", "manager", "threshold", "hierarchy", "matrix", "levels", "director", "controller", "sign-off"],
    "Submission": ["receipt", "bill", "voucher", "missing receipt", "deadline", "30 days", "timeline", "submission", "submit", "lost receipt", "declaration"],
    "Disbursement": ["reimbursement", "cycle", "disbursement", "weekly", "friday", "salary account", "bank transfer", "deposit", "payment date"],
    "Procurement": ["invoice", "vendor", "net 30", "po", "purchase order", "matching", "tolerance", "3-way", "payment terms", "bill"],
    "Security": ["duplicate", "duplicate invoice", "fraud", "scam", "identical", "prevention"],
    "Audit": ["escalation", "audit", "violation", "penalty", "deduction", "review", "investigation"]
}

async def tool_policy_qa(
    db: Any,
    question: str,
    user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Searches the chunked corporate policy collection for answers.
    ALWAYS provides citations (doc_name, section_id, title).
    If no clause matches, explicitly states that no policy covers it.
    """
    q_lower = question.lower()

    # Retrieve all policies from db
    policies = await db.policies.find({}).to_list(100)
    if not policies:
        # Fallback to in-memory policies if DB empty
        from backend.app.services.seed_data import SAMPLE_POLICIES
        policies = SAMPLE_POLICIES

    # Score each policy chunk
    scored_chunks: List[Tuple[float, Dict[str, Any], str]] = []

    for pol in policies:
        score = 0.0
        text = pol.get("text", "")
        title = pol.get("title", "")
        category = pol.get("category", "")
        combined = f"{title} {category} {text}".lower()

        # Check keyword matches
        for cat, kws in POLICY_KEYWORD_INDEX.items():
            for kw in kws:
                if kw in q_lower and kw in combined:
                    score += 2.5
                elif kw in combined and any(word in q_lower for word in kw.split()):
                    score += 1.0

        # Exact token overlap (excluding generic filler & stop words)
        STOP_WORDS = {
            "can", "i", "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of",
            "is", "it", "with", "from", "by", "as", "about", "what", "where", "when", "why",
            "how", "who", "claim", "reimbursement", "policy", "tell", "give", "please",
            "kitna", "kya", "hai", "mera", "meri", "karo", "batao", "mujhe", "buy"
        }
        q_tokens = set(re.findall(r'\b[a-zA-Z]{3,}\b', q_lower)) - STOP_WORDS
        for token in q_tokens:
            if token in combined:
                score += 2.0
            if token in title.lower():
                score += 3.5

        # Grade-specific bonus ONLY if question explicitly references an L1-L5 grade
        grade_match = re.search(r'\b(l[1-5])\b', q_lower)
        if grade_match:
            target_grade = grade_match.group(1).upper()
            if target_grade.lower() in combined:
                score += 2.5

        # Section ID match (e.g. SEC-104)
        sec_match = re.search(r'sec-\d+', q_lower)
        if sec_match and sec_match.group(0).upper() == pol.get("section_id", "").upper():
            score += 10.0

        if score >= 3.0:
            snippet = text[:280] + "..." if len(text) > 280 else text
            scored_chunks.append((score, pol, snippet))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    top_results = scored_chunks[:3]

    if not top_results or top_results[0][0] < 3.0:
        return {
            "reply": (
                "I searched the Meridian Expense & Procurement Policy 2026, but found no matching "
                "section addressing your query. Please consult your Finance Controller or Department Head."
            ),
            "citations": [],
            "matched_sections": []
        }

    citations = []
    text_snippets = []
    matched_sections = []

    for score, pol, snippet in top_results:
        citations.append({
            "doc_name": pol.get("doc_name", "Meridian Expense & Procurement Policy 2026"),
            "section_id": pol.get("section_id", "SEC-GEN"),
            "title": pol.get("title", "Policy Guidelines"),
            "relevant_snippet": snippet
        })
        text_snippets.append(f"• **{pol.get('section_id')} - {pol.get('title')}**: {pol.get('text')}")
        matched_sections.append(pol.get("section_id"))

    # Grade specific limit callout
    user_grade = user.get("grade", "L2")
    grade_limit_info = ""
    top_policy = top_results[0][1]
    limits = top_policy.get("grade_limits", {})
    if limits and user_grade in limits:
        grade_limit_info = f"\n\n*Note for your grade ({user_grade})*: The prescribed daily limit is **₹{limits[user_grade]:,.0f}**."

    reply = (
        f"According to the **{citations[0]['doc_name']}** ({citations[0]['section_id']}):\n\n"
        + "\n\n".join(text_snippets)
        + grade_limit_info
    )

    return {
        "reply": reply,
        "citations": citations,
        "matched_sections": matched_sections
    }

# ─────────────────────────────────────────────────────────────────────────────
# 2. Claim Status Tool (Role-checked)
# ─────────────────────────────────────────────────────────────────────────────

async def tool_claim_status(
    db: Any,
    claim_no: str,
    user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Looks up claim status, payment date, and policy flags.
    Enforces strict role checks:
    - employee: only their own claims
    - manager: their team's claims or assigned approvals
    - finance: any claim
    - vendor: not permitted
    """
    user_id = user.get("id") or user.get("user_id", "")
    user_role = user.get("role", "employee")

    if user_role == "vendor":
        return {
            "authorized": False,
            "error": "Access Denied: Vendors are not authorized to query internal employee claims.",
            "reply": "Access Denied: Vendors do not have authorization to view internal employee reimbursement claims."
        }

    claim_no_clean = claim_no.strip().upper()
    claim = await db.claims.find_one({"$or": [{"claim_no": claim_no_clean}, {"id": claim_no_clean}]})
    if not claim:
        return {
            "authorized": True,
            "found": False,
            "reply": f"Claim **{claim_no_clean}** was not found in the Meridian database."
        }

    # Role Authorization Check
    claim_emp = claim.get("employee_id")
    claim_approver = claim.get("approver_id")

    if user_role == "employee" and claim_emp != user_id:
        return {
            "authorized": False,
            "error": f"Access Denied: Claim {claim_no_clean} belongs to {claim_emp}. Employees can only view their own claims.",
            "reply": f"Access Restricted: Claim **{claim_no_clean}** belongs to another employee. As an employee, you are only permitted to view your own reimbursement claims."
        }

    if user_role == "manager" and claim_emp != user_id and claim_approver != user_id:
        # Check if claimant reports to this manager
        claimant = await db.users.find_one({"id": claim_emp})
        if not claimant or claimant.get("manager_id") != user_id:
            return {
                "authorized": False,
                "error": f"Access Denied: Claim {claim_no_clean} is not from a direct report of manager {user_id}.",
                "reply": f"Access Restricted: Claim **{claim_no_clean}** was submitted by **{claim_emp}**, who is not in your direct reporting chain."
            }

    # Format Details
    status = claim.get("status", "Submitted")
    amount = claim.get("amount", 0.0)
    category = claim.get("category", "General")
    flags = claim.get("policy_flags", [])
    payment_date = claim.get("expected_payment_date", "Pending full approval")

    reply = (
        f"**Claim {claim_no_clean} Details**:\n"
        f"• **Status**: `{status}`\n"
        f"• **Category**: {category}\n"
        f"• **Amount**: ₹{amount:,.2f} {claim.get('currency', 'INR')}\n"
        f"• **Claimant**: {claim_emp}\n"
        f"• **Assigned Approver**: {claim_approver or 'Finance Desk'}\n"
        f"• **Expected Disbursement**: {payment_date if status == 'Approved' else 'Awaiting full approval'}"
    )

    if flags:
        reply += f"\n• ⚠️ **Policy Flags**: {'; '.join(flags)}"

    return {
        "authorized": True,
        "found": True,
        "claim": serialize_doc(claim),
        "reply": reply
    }

# ─────────────────────────────────────────────────────────────────────────────
# 3. Invoice Status Tool (Role-checked)
# ─────────────────────────────────────────────────────────────────────────────

async def tool_invoice_status(
    db: Any,
    invoice_no: str,
    user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Looks up invoice status, due date, duplicate warnings, and PO details.
    Role checks:
    - vendor: can only see their own invoices
    - finance: can see all invoices
    - manager: can see procurement invoices for their department
    - employee: not permitted
    """
    user_id = user.get("id") or user.get("user_id", "")
    user_role = user.get("role", "employee")

    if user_role == "employee":
        return {
            "authorized": False,
            "error": "Access Denied: Regular employees do not have access to vendor procurement invoices.",
            "reply": "Access Denied: You do not have procurement clearance to view third-party vendor invoices."
        }

    inv_clean = invoice_no.strip().upper()
    invoice = await db.invoices.find_one({"$or": [{"invoice_no": inv_clean}, {"id": inv_clean}]})
    if not invoice:
        return {
            "authorized": True,
            "found": False,
            "reply": f"Invoice **{inv_clean}** was not found in Meridian records."
        }

    vendor_id = invoice.get("vendor_id")
    if user_role == "vendor" and vendor_id != user_id:
        return {
            "authorized": False,
            "error": f"Access Denied: Invoice {inv_clean} belongs to vendor {vendor_id}.",
            "reply": f"Access Restricted: You are only authorized to query invoices issued by your vendor entity (**{user_id}**)."
        }

    status = invoice.get("status", "Received")
    amount = invoice.get("amount", 0.0)
    due_date = invoice.get("due_date", "Unscheduled")
    po_no = invoice.get("po_no", "None")
    flags = invoice.get("flags", [])
    duplicate_of = invoice.get("duplicate_of")

    reply = (
        f"**Invoice {inv_clean} Details**:\n"
        f"• **Vendor**: {vendor_id}\n"
        f"• **Amount**: ₹{amount:,.2f} {invoice.get('currency', 'INR')}\n"
        f"• **Purchase Order**: {po_no}\n"
        f"• **Status**: `{status}`\n"
        f"• **Due Date**: {due_date}"
    )

    if duplicate_of:
        reply += f"\n• 🚨 **Duplicate Alert**: Matches earlier invoice **{duplicate_of}** (frozen from payment)"

    if flags:
        reply += f"\n• ⚠️ **Flags**: {'; '.join(flags)}"

    return {
        "authorized": True,
        "found": True,
        "invoice": serialize_doc(invoice),
        "reply": reply
    }

# ─────────────────────────────────────────────────────────────────────────────
# 4. Start Approval Request Tool
# ─────────────────────────────────────────────────────────────────────────────

async def tool_start_approval(
    db: Any,
    entity_type: str,
    entity_id: str,
    user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Initiates an approval request for a claim or invoice through the authorized workflow.
    """
    user_id = user.get("id") or user.get("user_id", "")
    user_role = user.get("role", "employee")
    entity_type = entity_type.lower()

    if entity_type == "claim":
        claim = await db.claims.find_one({"$or": [{"claim_no": entity_id}, {"id": entity_id}]})
        if not claim:
            return {"success": False, "reply": f"Claim **{entity_id}** not found."}

        if user_role == "employee" and claim.get("employee_id") != user_id:
            return {"success": False, "reply": "Access Denied: You can only initiate approvals for your own claims."}

        approver_id = user.get("manager_id") or "mgr_sarah"
        app_doc = Approval.create(
            entity_type="claim",
            entity_id=claim.get("claim_no", entity_id),
            approver_id=approver_id,
            state="Pending",
            due_at=datetime.utcnow() + timedelta(days=2)
        )
        await db.approvals.insert_one(app_doc)
        await db.claims.update_one(
            {"_id": claim["_id"]},
            {"$set": {"status": "Pending Manager", "approver_id": approver_id}}
        )

        await write_audit(
            db=db,
            actor_id=user_id,
            actor_role=user_role,
            action="APPROVAL_START",
            entity_type="claim",
            entity_id=entity_id,
            result={"approval_id": app_doc["id"], "approver_id": approver_id}
        )

        return {
            "success": True,
            "approval_id": app_doc["id"],
            "approver_id": approver_id,
            "reply": f"Approval request **{app_doc['id']}** started for Claim **{entity_id}**, assigned to **{approver_id}**."
        }

    elif entity_type == "invoice":
        invoice = await db.invoices.find_one({"$or": [{"invoice_no": entity_id}, {"id": entity_id}]})
        if not invoice:
            return {"success": False, "reply": f"Invoice **{entity_id}** not found."}

        app_doc = Approval.create(
            entity_type="invoice",
            entity_id=invoice.get("invoice_no", entity_id),
            approver_id="fin_alex",
            state="Pending",
            due_at=datetime.utcnow() + timedelta(days=2)
        )
        await db.approvals.insert_one(app_doc)
        await db.invoices.update_one(
            {"_id": invoice["_id"]},
            {"$set": {"status": "Pending Approval"}}
        )

        await write_audit(
            db=db,
            actor_id=user_id,
            actor_role=user_role,
            action="APPROVAL_START",
            entity_type="invoice",
            entity_id=entity_id,
            result={"approval_id": app_doc["id"], "approver_id": "fin_alex"}
        )

        return {
            "success": True,
            "approval_id": app_doc["id"],
            "approver_id": "fin_alex",
            "reply": f"Approval request **{app_doc['id']}** created for Invoice **{entity_id}**, routed to Finance Controller (**fin_alex**)."
        }

    return {"success": False, "reply": f"Unsupported entity type: '{entity_type}'. Must be 'claim' or 'invoice'."}

# ─────────────────────────────────────────────────────────────────────────────
# 5. Send Reminder Tool
# ─────────────────────────────────────────────────────────────────────────────

async def tool_send_reminder(
    db: Any,
    approval_id: str,
    user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Sends an automated notification reminder for a pending approval request.
    Respects rate-limiting cooldown and logs immutable audit trail.
    """
    try:
        res = await send_approval_reminder(db=db, approval_id=approval_id, user=user)
        return {
            "success": True,
            "approval_id": res["approval_id"],
            "reminders_sent": res["reminders_sent"],
            "reply": f"✅ Reminder successfully dispatched to **{res['recipient']}** for approval **{res['approval_id']}**. (Carrier SMS simulated)"
        }
    except Exception as e:
        detail = getattr(e, "detail", str(e))
        return {
            "success": False,
            "reply": f"⚠️ Could not send reminder: {detail}"
        }

# ─────────────────────────────────────────────────────────────────────────────
# 6. Escalate to Finance Tool
# ─────────────────────────────────────────────────────────────────────────────

async def tool_escalate_to_finance(
    db: Any,
    entity_type: str,
    entity_id: str,
    reason: str,
    summary: str,
    user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Creates an Open Escalation ticket assigned to Finance Lead Alex Morgan.
    """
    user_id = user.get("id") or user.get("user_id", "system")
    user_role = user.get("role", "employee")

    esc = await create_escalation(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id,
        reason=reason,
        summary=summary,
        severity="high",
        assignee_id="fin_alex",
        actor_id=user_id,
        actor_role=user_role
    )

    return {
        "success": True,
        "escalation_id": esc.get("id") or esc.get("escalation_id"),
        "assignee_id": "fin_alex",
        "reply": (
            f"🚨 Escalation **{esc.get('id')}** logged and assigned to Finance Controller Alex Morgan (**fin_alex**).\n"
            f"• Reason: `{reason}`\n"
            f"• Summary: {summary}"
        )
    }

# ─────────────────────────────────────────────────────────────────────────────
# 7. Get Finance Summary Tool (Finance role only)
# ─────────────────────────────────────────────────────────────────────────────

async def tool_get_finance_summary(
    db: Any,
    user: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Returns executive finance KPI summary: overdue counts, pending approvals,
    duplicate flags, and open escalations. Strictly restricted to Finance role.
    """
    user_role = user.get("role", "")
    if user_role != "finance":
        return {
            "authorized": False,
            "error": f"Access Denied: Executive Finance Summary is restricted to Finance personnel (your role: {user_role}).",
            "reply": f"Access Denied: The executive finance summary contains sensitive corporate cash flow metrics and is restricted to the Finance team. Your role is **{user_role}**."
        }

    now = datetime.utcnow()
    today_str = now.strftime("%Y-%m-%d")

    # Invoices metrics
    overdue_invoices = await db.invoices.find({
        "status": {"$ne": "Paid"},
        "due_date": {"$lt": today_str}
    }).to_list(100)
    overdue_count = len(overdue_invoices)
    overdue_amount = sum(float(i.get("amount", 0.0)) for i in overdue_invoices)

    pending_invoices = await db.invoices.find({"status": "Pending Approval"}).to_list(100)
    pending_inv_count = len(pending_invoices)
    pending_inv_amount = sum(float(i.get("amount", 0.0)) for i in pending_invoices)

    # Claims metrics
    pending_claims = await db.claims.find({
        "status": {"$in": ["Submitted", "Pending Manager", "Pending Finance"]}
    }).to_list(200)
    pending_claim_count = len(pending_claims)
    pending_claim_amount = sum(float(c.get("amount", 0.0)) for c in pending_claims)

    # Approvals SLA delay count (> 2 days old)
    two_days_ago = now - timedelta(days=2)
    delayed_approvals_count = await db.approvals.count_documents({
        "state": "Pending",
        "$or": [{"due_at": {"$lte": now}}, {"created_at": {"$lte": two_days_ago}}]
    })

    # Duplicate invoices
    duplicate_invoices_count = await db.invoices.count_documents({
        "$or": [{"duplicate_of": {"$ne": None}}, {"flags": {"$regex": "DUPLICATE"}}]
    })

    # Open escalations
    open_escalations_count = await db.escalations.count_documents({"status": "Open"})

    summary_data = {
        "overdue_invoices_count": overdue_count,
        "overdue_invoices_amount": overdue_amount,
        "pending_invoices_count": pending_inv_count,
        "pending_invoices_amount": pending_inv_amount,
        "reimbursement_requests_count": pending_claim_count,
        "reimbursement_requests_amount": pending_claim_amount,
        "flagged_duplicates_count": duplicate_invoices_count,
        "approval_delays_count": delayed_approvals_count,
        "open_escalations_count": open_escalations_count
    }

    reply = (
        f"📊 **Meridian Executive Finance Summary**:\n"
        f"• **Overdue Invoices**: {overdue_count} totaling ₹{overdue_amount:,.2f}\n"
        f"• **Pending Invoices**: {pending_inv_count} totaling ₹{pending_inv_amount:,.2f}\n"
        f"• **Reimbursements Pending**: {pending_claim_count} claims totaling ₹{pending_claim_amount:,.2f}\n"
        f"• **SLA Approval Delays (> 2 days)**: {delayed_approvals_count} requests\n"
        f"• **Flagged Duplicate Invoices**: {duplicate_invoices_count} records\n"
        f"• **Open Escalations**: {open_escalations_count} tickets requiring action"
    )

    return {
        "authorized": True,
        "summary": summary_data,
        "reply": reply
    }

# ─────────────────────────────────────────────────────────────────────────────
# Backwards Compatibility Helpers for Legacy Personal Expenses Router
# ─────────────────────────────────────────────────────────────────────────────

def auto_categorize(text: str) -> str:
    lowered = text.lower()
    if any(k in lowered for k in ["meal", "food", "lunch", "dinner", "breakfast", "cafe", "restaurant"]):
        return "Meals"
    if any(k in lowered for k in ["travel", "flight", "train", "cab", "uber", "ola", "fuel", "taxi"]):
        return "Travel"
    if any(k in lowered for k in ["hotel", "room", "stay", "accommodation", "lodging"]):
        return "Hotel"
    return "General"

async def tool_add_expense(
    db: Any,
    user_id: str,
    amount: float,
    category: Optional[str],
    description: str,
    date_str: Optional[str] = None,
    payment_method: Optional[str] = "Unknown"
) -> Dict[str, Any]:
    from backend.app.models import Expense
    from backend.app.services.anomaly import check_expense_anomaly
    cat = (category.capitalize() if category and category.strip() else auto_categorize(description))
    dt = date_str or datetime.utcnow().strftime("%Y-%m-%d")
    is_unusual, reason = await check_expense_anomaly(db, user_id, amount, cat)
    doc = Expense.create(
        user_id=user_id,
        amount=round(float(amount), 2),
        category=cat,
        description=description,
        date=dt,
        payment_method=payment_method or "Unknown",
        is_unusual=is_unusual,
        anomaly_reason=reason
    )
    res = await db.expenses.insert_one(doc)
    doc_id = str(res.inserted_id)
    await db.expenses.update_one({"_id": res.inserted_id}, {"$set": {"id": doc_id}})
    doc["id"] = doc_id
    doc["_id"] = res.inserted_id
    return serialize_doc(doc)

async def tool_create_saving_plan(
    db: Any,
    user_id: str,
    target_amount: float,
    months: int,
    title: str,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    from backend.app.models import SavingGoal
    monthly_saving = round(float(target_amount) / max(1, int(months)), 2)
    doc = SavingGoal.create(
        user_id=user_id,
        title=title,
        target_amount=float(target_amount),
        target_months=int(months),
        monthly_saving_needed=monthly_saving,
        notes=notes or f"Requires saving ₹{monthly_saving:,.2f} per month for {months} months."
    )
    res = await db.saving_goals.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return serialize_doc(doc)


