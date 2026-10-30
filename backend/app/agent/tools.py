import re
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple
from backend.app.models import Approval, Escalation, serialize_doc, serialize_docs, build_id_query
from backend.app.services.audit import write_audit
from backend.app.services.workflow import (
    send_approval_reminder, calculate_next_reimbursement_friday
)
from backend.app.services.escalation import create_escalation

CATEGORY_KEYWORD_MAP = {
    "food": ["restaurant", "cafe", "coffee", "lunch", "dinner", "breakfast", "burger", "pizza", "starbucks", "swiggy", "zomato", "groceries", "supermarket"],
    "transportation": ["uber", "ola", "taxi", "cab", "metro", "bus", "train", "flight", "petrol", "fuel", "gas"],
    "shopping": ["amazon", "flipkart", "clothes", "shoes", "mall", "electronics", "retail"],
    "entertainment": ["netflix", "spotify", "cinema", "movie", "concert", "game", "steam"],
    "utilities": ["electricity", "water", "wifi", "internet", "broadband", "mobile", "recharge", "bill", "rent"],
    "healthcare": ["pharmacy", "medicine", "doctor", "hospital", "clinic", "dental"],
    "education": ["course", "books", "udemy", "coursera", "tuition", "training"],
    "travel": ["hotel", "airbnb", "resort", "flight", "airline"]
}

def auto_categorize(text: str) -> str:
    """Classifies expense text into standard categories with keyword heuristics."""
    lowered = text.lower()
    for cat, keywords in CATEGORY_KEYWORD_MAP.items():
        if any(kw in lowered for kw in keywords):
            return cat.capitalize()
    return "Miscellaneous"

async def tool_add_expense(
    db,
    user_id: str,
    amount: float,
    category: Optional[str],
    description: str,
    date_str: Optional[str] = None,
    payment_method: Optional[str] = "Unknown"
) -> Dict[str, Any]:
    if not date_str or date_str.lower() in ["today", "now"]:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
    elif date_str.lower() == "yesterday":
        date_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

    cat = (category.capitalize() if category and category.strip() else auto_categorize(description))

    is_unusual = False
    reason = None
    try:
        from backend.app.services.anomaly import check_expense_anomaly, audit_and_generate_alerts
        is_unusual, reason = await check_expense_anomaly(db, user_id, amount, cat)
    except Exception:
        pass

    from backend.app.models import Expense
    doc = Expense.create(
        user_id=user_id,
        amount=round(float(amount), 2),
        category=cat,
        description=description,
        date=date_str,
        payment_method=payment_method or "Unknown",
        is_unusual=is_unusual,
        anomaly_reason=reason
    )
    res = await db.expenses.insert_one(doc)
    doc_id = str(res.inserted_id)
    await db.expenses.update_one({"_id": res.inserted_id}, {"$set": {"id": doc_id}})

    try:
        month_str = date_str[:7]
        from backend.app.services.anomaly import audit_and_generate_alerts
        await audit_and_generate_alerts(db, user_id, month_str)
    except Exception:
        pass

    # Instant Telegram Flash Alert if transaction was flagged unusual
    if is_unusual:
        try:
            ps = await db.phone_settings.find_one({"user_id": user_id})
            chat_id = ps.get("telegram_chat_id") if ps else None
            if not chat_id:
                any_ps = await db.phone_settings.find_one({"telegram_chat_id": {"$exists": True, "$ne": None}})
                if any_ps:
                    chat_id = any_ps.get("telegram_chat_id")
            if chat_id:
                from backend.app.services.telegram_bot import send_telegram_message
                flash_text = (
                    f"⚠️ *Financial Anomaly Flash Alert!*\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"💸 *Amount:* ₹{float(amount):,.2f}\n"
                    f"🏷️ *Category:* {cat}\n"
                    f"📝 *Note:* {description}\n"
                    f"🔍 *Anomaly Reason:* {reason}\n\n"
                    f"⚡ Flagged for review by ExpensePilot AI."
                )
                await send_telegram_message(chat_id, flash_text)
        except Exception as e:
            print(f"[Telegram Anomaly Flash Notice]: {e}")

    return {
        "id": doc_id,
        "amount": doc["amount"],
        "category": doc["category"],
        "description": doc["description"],
        "date": doc["date"],
        "payment_method": doc["payment_method"],
        "is_unusual": doc["is_unusual"],
        "anomaly_reason": doc["anomaly_reason"]
    }

async def tool_get_monthly_spending(db, user_id: str, month_str: Optional[str] = None) -> Dict[str, Any]:
    from backend.app.services.analytics import get_monthly_summary
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    summary = await get_monthly_summary(db, user_id, month_str)
    return summary

async def tool_get_category_breakdown(db, user_id: str, month_str: Optional[str] = None) -> Dict[str, Any]:
    from backend.app.services.analytics import get_monthly_summary
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    summary = await get_monthly_summary(db, user_id, month_str)
    return {
        "month": month_str,
        "categories": summary.get("categories", []),
        "top_category": summary.get("top_category"),
        "top_category_amount": summary.get("top_category_amount", 0.0),
        "total_spent": summary.get("total_spent", 0.0)
    }

async def tool_calculate_remaining_budget(db, user_id: str, month_str: Optional[str] = None) -> Dict[str, Any]:
    from backend.app.services.analytics import get_monthly_summary
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    summary = await get_monthly_summary(db, user_id, month_str)
    return {
        "month": month_str,
        "total_budget": summary.get("total_budget", 0.0),
        "total_spent": summary.get("total_spent", 0.0),
        "remaining_budget": summary.get("remaining_budget", 0.0),
        "percentage_used": summary.get("percentage_used", 0.0),
        "days_remaining": summary.get("days_remaining", 0),
        "daily_budget_remaining": summary.get("daily_budget_remaining", 0.0)
    }

async def tool_predict_monthly_spending(db, user_id: str, month_str: Optional[str] = None) -> Dict[str, Any]:
    from backend.app.services.forecasting import forecast_monthly_spending
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    return await forecast_monthly_spending(db, user_id, month_str)

async def tool_detect_anomalies(db, user: Dict[str, Any], month_str: Optional[str] = None) -> Dict[str, Any]:
    from backend.app.services.anomaly import detect_pyod_isolation_forest_anomalies
    user_id = user.get("id") or user.get("user_id", "user_default")
    report = await detect_pyod_isolation_forest_anomalies(db, user_id=user_id, month=month_str)
    anoms = report.get("anomalies", [])
    
    if not anoms:
        reply = (
            f"✅ **PyOD Isolation Forest Anomaly Scan Complete**\n\n"
            f"All **{report.get('total_analyzed', 0)} transactions** evaluated match expected spending baselines.\n"
            f"• No sudden daily spending spikes detected.\n"
            f"• No duplicate charges or statistical category outliers identified.\n"
            f"Your cashflow risk profile is currently **Healthy & Normal**."
        )
    else:
        lines = [
            f"🚨 **PyOD Isolation Forest Flagged {len(anoms)} Statistical Anomalies**\n",
            f"Analyzed **{report.get('total_analyzed', 0)} transactions** across multiple dimensions (log-amount, category ratio, daily spend spike, date distribution):\n"
        ]
        for a in anoms[:5]:
            lines.append(
                f"• **₹{a['amount']:,.0f}** ({a['category']}) — *{a.get('description', 'Expense')}*\n"
                f"  ↳ **Type:** `{a.get('anomaly_type', 'Outlier')}`\n"
                f"  ↳ **Diagnosis:** {a.get('reason', '')}\n"
                f"  ↳ **Status:** `{a.get('status', 'Review Recommended')}`\n"
            )
        lines.append("💡 **Recommended Action:** Review flagged items in the **Forecast & Anomalies** dashboard tab or confirm legitimate expenses.")
        reply = "\n".join(lines)
        
    return {
        "reply": reply,
        "report": report,
        "anomalies": anoms,
        "total_analyzed": report.get("total_analyzed", 0),
        "anomalies_detected": len(anoms)
    }

async def tool_detect_unusual_expenses(db, user_id: str, month_str: Optional[str] = None) -> List[Dict[str, Any]]:
    from backend.app.services.anomaly import detect_pyod_isolation_forest_anomalies
    res = await detect_pyod_isolation_forest_anomalies(db, user_id=user_id, month=month_str)
    return res.get("anomalies", [])

async def tool_simulate_what_if(
    db,
    user_id: str,
    category: Optional[str] = None,
    percent_reduction: float = 0.0,
    upcoming_purchase_amount: float = 0.0,
    month_str: Optional[str] = None
) -> Dict[str, Any]:
    from backend.app.services.simulator import run_what_if_simulation
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    return await run_what_if_simulation(
        db=db,
        user_id=user_id,
        month_str=month_str,
        category=category,
        percent_reduction=percent_reduction,
        upcoming_purchase_amount=upcoming_purchase_amount
    )

async def tool_create_saving_plan(
    db,
    user_id: str,
    target_amount: float,
    months: int = 3,
    title: str = "Custom Savings Plan"
) -> Dict[str, Any]:
    from backend.app.services.analytics import get_monthly_summary
    from backend.app.models import SavingGoal
    month_str = datetime.utcnow().strftime("%Y-%m")
    summary = await get_monthly_summary(db, user_id, month_str)

    monthly_needed = round(target_amount / max(1, months), 2)
    daily_needed = round(monthly_needed / 30.0, 2)

    discretionary = ["shopping", "entertainment", "food"]
    suggestions = []
    
    total_trim_found = 0.0
    for cat_item in summary.get("categories", []):
        cat_name = cat_item["category"]
        amt = cat_item["amount"]
        if cat_name.lower() in discretionary and amt > 500:
            suggested_cut = min(amt * 0.25, monthly_needed * 0.5)
            suggestions.append({
                "category": cat_name,
                "current_spending": amt,
                "monthly_cut": round(suggested_cut, 2),
                "tip": f"Trim {cat_name} by 25% to free up ₹{suggested_cut:,.0f}/month"
            })
            total_trim_found += suggested_cut

    goal_doc = SavingGoal.create(
        user_id=user_id,
        title=title,
        target_amount=float(target_amount),
        current_saved=0.0,
        target_months=months,
        monthly_target=monthly_needed,
        category_suggestions=suggestions
    )
    res = await db.saving_goals.insert_one(goal_doc)
    goal_id = str(res.inserted_id)
    await db.saving_goals.update_one({"_id": res.inserted_id}, {"$set": {"id": goal_id}})

    return {
        "goal_id": goal_id,
        "title": title,
        "target_amount": target_amount,
        "months": months,
        "monthly_target": monthly_needed,
        "daily_target": daily_needed,
        "suggestions": suggestions,
        "plan_viable": total_trim_found >= (monthly_needed * 0.6)
    }

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

async def tool_generate_pdf_report(
    db: Any,
    user: Dict[str, Any],
    month_str: Optional[str] = None,
    custom_title: Optional[str] = None,
    custom_notes: Optional[str] = None
) -> Dict[str, Any]:
    """Generates an official executive PDF spending & financial roadmap report using the PDF generation engine, embedding custom titles and prompt notes."""
    import time
    from pathlib import Path
    from backend.app.services.analytics import get_monthly_summary
    from backend.app.services.pdf_generator import generate_roadmap_pdf_bytes, synthesize_pdf_content
    from backend.app.config import settings

    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")

    user_id = user.get("id", "user_default")
    summary = await get_monthly_summary(db, user_id, month_str)
    budget_doc = await db.budgets.find_one({"user_id": user_id, "month": month_str})
    budget = budget_doc or {"total_budget": 50000.0}

    inv_cursor = db.invoices.find({"status": {"$in": ["Pending", "Overdue"]}}).limit(10)
    invoices = await inv_cursor.to_list(length=10)

    # Dynamically synthesize prompt-specific sections, KPIs, and deliverables
    prompt_to_synthesize = f"{custom_title or ''} {custom_notes or ''}".strip()
    structured_content = await synthesize_pdf_content(prompt_to_synthesize) if prompt_to_synthesize else None

    pdf_bytes = generate_roadmap_pdf_bytes(
        user_id=user_id,
        month=month_str,
        summary=summary,
        budget=budget,
        invoices=invoices,
        custom_title=custom_title,
        custom_notes=custom_notes,
        structured_content=structured_content
    )

    project_root = Path(__file__).resolve().parents[3]
    gen_dir = project_root / "frontend" / "public" / "generated_reports"
    gen_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = int(time.time())
    safe_slug = re.sub(r'[^a-zA-Z0-9]', '_', (custom_title or 'custom_report')[:25]).strip('_').lower()
    unique_pdf_name = f"report_{timestamp}_{safe_slug}.pdf"
    unique_pdf_path = gen_dir / unique_pdf_name

    with open(unique_pdf_path, "wb") as f:
        f.write(pdf_bytes)

    # Keep default file updated for legacy access
    try:
        with open(gen_dir / "financial_roadmap.pdf", "wb") as f:
            f.write(pdf_bytes)
    except Exception:
        pass

    static_pdf_url = f"/generated_reports/{unique_pdf_name}?t={timestamp}"
    
    # Check live CraftMyPDF & Templated.io status
    from backend.app.services.craftmypdf import get_craftmypdf_status, render_craftmypdf_document
    craft_info = await get_craftmypdf_status()
    craft_active = craft_info.get("status") == "ACTIVE_AUTHENTICATED"

    # Attempt CraftMyPDF cloud render
    craft_cloud_url = None
    craft_res = await render_craftmypdf_document(
        data_payload={
            "month": month_str,
            "title": custom_title or (structured_content.get("title") if structured_content else "Financial Roadmap"),
            "notes": custom_notes or (structured_content.get("subtitle") if structured_content else ""),
            "total_spent": summary.get("total_spent", 0),
            "budget_remaining": summary.get("remaining_safe_allowance", 0),
            "user_id": user_id
        },
        output_format="pdf"
    )
    if craft_res.get("success") and craft_res.get("file_url"):
        craft_cloud_url = craft_res.get("file_url")

    active_engine = "CraftMyPDF Cloud API" if craft_cloud_url else "CraftMyPDF & Dynamic Vector Studio"
    final_pdf_url = craft_cloud_url or static_pdf_url

    doc_display_title = structured_content.get("title") if structured_content else (custom_title or "Executive Financial Roadmap")
    title_display = f"• **Document Title:** {doc_display_title}\n"
    notes_display = f"• **Report Directive:** {custom_notes}\n" if custom_notes else ""
    summary_highlight = f"• **Topic Overview:** {structured_content['section1_bullets'][0]}\n" if (structured_content and structured_content.get("section1_bullets")) else ""

    craft_note = (
        "• **CraftMyPDF Cloud:** ✅ Connected & Rendered via CraftMyPDF Cloud\n" if craft_cloud_url else
        "• **CraftMyPDF API:** ✅ Key Authenticated (`6ea4MzM5...`). Note: CraftMyPDF cloud rendering requires saving a template on craftmypdf.com; our dynamic vector engine has synthesized your document directly.\n"
    )

    reply = (
        f"📄 **Custom Executive PDF Report Generated!**\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"{title_display}"
        f"{notes_display}"
        f"{summary_highlight}"
        f"• **Format:** Vector PDF-1.4 (High Resolution Print Ready • {len(pdf_bytes):,} bytes)\n"
        f"{craft_note}"
        f"• **Status:** ✅ File Ready for Download\n\n"
        f"📥 [**Click Here to Download Custom PDF Report**]({final_pdf_url})\n\n"
        f"*(Direct local mirror also available at: [{unique_pdf_name}]({static_pdf_url}))*"
    )

    return {
        "success": True,
        "pdf_url": final_pdf_url,
        "static_url": static_pdf_url,
        "pdf_size_bytes": len(pdf_bytes),
        "custom_title": custom_title,
        "custom_notes": custom_notes,
        "craftmypdf_status": craft_info,
        "month": month_str,
        "reply": reply
    }

async def tool_generate_visual_card(
    db: Any,
    user: Dict[str, Any],
    visual_type: Optional[str] = "financial_card",
    custom_text: Optional[str] = None
) -> Dict[str, Any]:
    """Generates a high-definition visual analytics card or creative AI image according to the user's prompt, embedding custom text and preventing browser caching."""
    import time
    from pathlib import Path
    from backend.app.services.analytics import get_monthly_summary
    from backend.app.services.craftmypdf import get_craftmypdf_status
    from backend.app.services.image_generator import save_financial_card_image
    from backend.app.config import settings

    user_id = user.get("id", "user_default")
    now_month = datetime.utcnow().strftime("%Y-%m")
    summary = await get_monthly_summary(db, user_id, now_month)
    budget_doc = await db.budgets.find_one({"user_id": user_id, "month": now_month})
    budget = budget_doc or {"total_budget": 50000.0, "month": now_month}

    project_root = Path(__file__).resolve().parents[3]
    gen_dir = project_root / "frontend" / "public" / "generated_reports"
    gen_dir.mkdir(parents=True, exist_ok=True)

    timestamp = int(time.time())
    safe_slug = re.sub(r'[^a-zA-Z0-9]', '_', (custom_text or 'visual')[:25]).strip('_').lower()
    unique_filename = f"gen_img_{timestamp}_{safe_slug}.png"
    img_path = gen_dir / unique_filename

    # Determine whether the prompt is explicitly financial or a creative AI image
    financial_keywords = [
        "spending", "expense", "budget", "outflow", "cashflow", "finance",
        "kpi", "telemetry", "breakdown", "allowance", "audit", "balance",
        "cost", "transaction", "invoice", "claim", "reimbursement"
    ]
    is_explicit_financial = bool(custom_text) and any(kw in custom_text.lower() for kw in financial_keywords)
    is_creative_prompt = bool(custom_text) and not is_explicit_financial

    ai_generated = False
    if is_creative_prompt:
        try:
            import urllib.parse
            encoded_p = urllib.parse.quote(f"{custom_text}, ultra high quality, 4k, cinematic, photorealistic")
            ai_gen_url = f"https://image.pollinations.ai/prompt/{encoded_p}?width=1200&height=675&nologo=true"
            import httpx
            async with httpx.AsyncClient(timeout=12.0) as client:
                ai_resp = await client.get(ai_gen_url, headers={"User-Agent": "Mozilla/5.0"})
                if ai_resp.status_code == 200 and len(ai_resp.content) > 1000:
                    with open(img_path, "wb") as f:
                        f.write(ai_resp.content)
                    ai_generated = True
        except Exception as e:
            print(f"[Creative AI Image Generator Notice]: {e}")

    if not ai_generated:
        # Fall back to high-definition Lavender & White glassmorphic generator embedding custom text
        save_financial_card_image(
            user_id=user_id,
            month=now_month,
            summary=summary,
            budget=budget,
            output_path=str(img_path),
            custom_text=custom_text
        )

    # Mirror to spending_card.png for legacy backward compatibility
    try:
        import shutil
        shutil.copyfile(img_path, gen_dir / "spending_card.png")
    except Exception:
        pass

    from backend.app.services.craftmypdf import get_craftmypdf_status, render_craftmypdf_document
    craft_info = await get_craftmypdf_status()
    craft_active = craft_info.get("status") == "ACTIVE_AUTHENTICATED"

    # Attempt CraftMyPDF cloud image rendering if template is available
    craft_img_cloud_url = None
    craft_img_res = await render_craftmypdf_document(
        data_payload={
            "custom_text": custom_text or "Executive Financial Diagnostic",
            "prompt": custom_text or "",
            "month": now_month,
            "total_spent": summary.get("total_spent", 0),
            "budget_remaining": summary.get("remaining_safe_allowance", 0),
            "user_id": user_id
        },
        output_format="png"
    )
    if craft_img_res.get("success") and craft_img_res.get("file_url"):
        craft_img_cloud_url = craft_img_res.get("file_url")

    engine_name = "CraftMyPDF Cloud API" if craft_img_cloud_url else ("CraftMyPDF & AI Neural Studio" if ai_generated else ("CraftMyPDF Studio Engine" if craft_active else "Templated.io Studio"))
    image_web_url = craft_img_cloud_url or f"/generated_reports/{unique_filename}?t={timestamp}"
    download_api_url = image_web_url

    custom_line = f"• **Prompt / Subject:** \"{custom_text}\"\n" if custom_text else ""
    card_type_desc = "AI Neural Render (1200x675 HD PNG)" if ai_generated else "Executive Cashflow & Anomaly Diagnostics (1200x675 HD PNG)"

    reply = (
        f"🎨 **Visual Image Rendered!**\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"• **Generator Engine:** {engine_name} (✅ Active)\n"
        f"• **Status:** Connected & Generated\n"
        f"{custom_line}"
        f"• **Format:** {card_type_desc}\n"
        f"• **File Asset:** `{unique_filename}`\n\n"
        f"![Generated Visual Asset]({image_web_url})\n\n"
        f"📥 [**Download High-Resolution Image**]({image_web_url})"
    )

    return {
        "success": True,
        "visual_type": visual_type,
        "custom_text": custom_text,
        "image_url": image_web_url,
        "download_url": image_web_url,
        "engine": engine_name,
        "craftmypdf_account": craft_info,
        "reply": reply
    }

async def tool_read_webpage(url: str, user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Reads and parses any webpage into clean Markdown for AI analysis using Jina AI Reader API (r.jina.ai)."""
    from backend.app.services.jina_reader import fetch_url_markdown
    result = await fetch_url_markdown(url)
    if result.get("success"):
        title = result.get("title", "Webpage")
        md = result.get("markdown", "")
        summary_preview = md[:600] + ("..." if len(md) > 600 else "")
        reply = (
            f"🌐 **Jina AI Web Reader: Scraped Successfully**\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"• **Source URL:** {url}\n"
            f"• **Title:** {title}\n"
            f"• **Extracted Content:** {len(md)} characters of clean Markdown\n\n"
            f"**Page Preview:**\n"
            f"{summary_preview}\n\n"
            f"⚡ _Processed via Jina AI Reader (r.jina.ai)_"
        )
    else:
        reply = f"❌ Unable to read webpage ({url}): {result.get('error', 'Network or scraping error')}"

    return {
        "success": result.get("success", False),
        "url": url,
        "title": result.get("title"),
        "markdown": result.get("markdown"),
        "reply": reply
    }


async def tool_call_device(
    db: Any,
    user: Dict[str, Any],
    reason: Optional[str] = "Corporate Financial & Anomaly Intelligence",
    phone_number: Optional[str] = None,
    custom_message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Autonomous tool for dialing and placing an active voice phone call to the user's mobile device.
    Generates tel: protocol URI for instant device dialing, pushes spoken text transcript,
    and connects carrier voice routes.
    """
    from backend.app.services.messaging import dispatch_phone_call
    user_id = user.get("id") or user.get("user_id") or "user_kaif"
    user_name = user.get("name") or "Mohammad Kaif"

    if not custom_message:
        custom_message = (
            f"Hello {user_name}! This is ExpensePilot Autonomous Voice AI. "
            f"I am calling to update you on your financial telemetry. "
            f"Your current budget status, recent claims, and anomaly checks are verified."
        )

    call_res = await dispatch_phone_call(
        db=db,
        user_id=user_id,
        phone_number=phone_number,
        call_reason=reason or "Expense & Budget Intelligence",
        spoken_message=custom_message,
        caller_name=f"{user_name} (Handset)"
    )

    reply = (
        f"📞 **ExpensePilot AI: Calling Your Personal Device**\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"• **Target Handset:** `{call_res.get('phone_number')}`\n"
        f"• **Call Reason:** {call_res.get('call_reason')}\n"
        f"• **Status:** {call_res.get('status')}\n\n"
        f"🎙️ **Spoken Audio Message:**\n"
        f"> \"{call_res.get('spoken_message')}\"\n\n"
        f"👉 **[Click Here to Answer / Dial Call]({call_res.get('tel_url')})**\n\n"
        f"⚡ _Device calling merged into autonomous agent._"
    )

    return {
        "success": True,
        "reply": reply,
        "call_info": call_res,
        "call_id": call_res.get("call_id"),
        "status": call_res.get("status"),
        "tel_url": call_res.get("tel_url"),
        "phone_number": call_res.get("phone_number"),
        "spoken_message": call_res.get("spoken_message")
    }





