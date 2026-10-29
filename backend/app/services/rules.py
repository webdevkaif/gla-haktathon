import re
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional, Tuple
from difflib import SequenceMatcher
import numpy as np
from backend.app.services.escalation import create_escalation
from backend.app.services.audit import write_audit

# ─────────────────────────────────────────────────────────────────────────────
# Normalization & Fuzzy Helpers
# ─────────────────────────────────────────────────────────────────────────────

def normalize_invoice_no(raw_no: str) -> str:
    """
    Normalizes invoice numbers by:
      1. Uppercasing
      2. Stripping leading zeros in numeric sequences (e.g. '02004' -> '2004')
      3. Stripping all non-alphanumerics
    Ensures that 'INV 2004', 'INV2004', 'INV-02004', and 'INV 002004' all produce 'INV2004'.
    """
    if not raw_no:
        return ""
    no_leading_zeros = re.sub(r'\d+', lambda m: str(int(m.group(0))), str(raw_no).upper())
    return re.sub(r'[^A-Za-z0-9]', '', no_leading_zeros)

def amounts_match_with_tolerance(amt1: float, amt2: float, tolerance_pct: float = 0.005) -> bool:
    """Checks if two amounts match within a 0.5% tolerance window."""
    if amt1 == 0 and amt2 == 0:
        return True
    base = max(abs(amt1), abs(amt2))
    return abs(amt1 - amt2) <= (base * tolerance_pct)

def vendor_matches(v1_id: str, v1_name: str, v2_id: str, v2_name: str, threshold: float = 0.8) -> bool:
    """Fuzzy vendor matching via ID equality or name similarity >= threshold."""
    id1 = (v1_id or "").strip().lower()
    id2 = (v2_id or "").strip().lower()
    if id1 and id2 and id1 == id2:
        return True
    n1 = re.sub(r'[^a-z0-9]', '', (v1_name or v1_id or "").lower())
    n2 = re.sub(r'[^a-z0-9]', '', (v2_name or v2_id or "").lower())
    if not n1 or not n2:
        return False
    if n1 == n2:
        return True
    return SequenceMatcher(None, n1, n2).ratio() >= threshold

# ─────────────────────────────────────────────────────────────────────────────
# Standard Enterprise Policy Limits Configuration
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_GRADE_LIMITS: Dict[str, Dict[str, float]] = {
    "Meals": {
        "L1": 800.0,
        "L2": 800.0,
        "L3": 1500.0,
        "L4": 3000.0,
        "L5": 3000.0
    },
    "Hotel": {
        "L1": 3500.0,
        "L2": 3500.0,
        "L3": 6000.0,
        "L4": 10000.0,
        "L5": 10000.0
    },
    "Travel": {
        "L1": 2500.0,
        "L2": 3500.0,
        "L3": 6000.0,
        "L4": 12000.0,
        "L5": 20000.0
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# Pure Rule Evaluation Functions
# ─────────────────────────────────────────────────────────────────────────────

def rule_duplicate_invoice(
    invoice: Dict[str, Any],
    existing_invoices: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    DUPLICATE_INVOICE rule:
    Triggers if another invoice has:
      a) same or fuzzy vendor + same normalized invoice_no, OR
      b) same or fuzzy vendor + amount within 0.5% tolerance + invoice_date within 7 calendar days.
    """
    raw_inv_no = str(invoice.get("invoice_no", "")).strip()
    norm_inv_no = normalize_invoice_no(raw_inv_no)
    v_id = str(invoice.get("vendor_id", "")).strip().lower()
    v_name = str(invoice.get("vendor_name", "")).strip()
    amount = float(invoice.get("amount", 0.0))
    inv_id = str(invoice.get("id", invoice.get("_id", "")))

    inv_date_str = invoice.get("invoice_date", "")
    inv_dt = None
    if inv_date_str:
        try:
            inv_dt = datetime.strptime(inv_date_str[:10], "%Y-%m-%d").date()
        except Exception:
            pass

    for other in existing_invoices:
        other_id = str(other.get("id", other.get("_id", "")))
        if inv_id and other_id and inv_id == other_id:
            continue

        other_v_id = str(other.get("vendor_id", "")).strip().lower()
        other_v_name = str(other.get("vendor_name", "")).strip()
        
        # Check vendor match (exact or fuzzy >= 0.8)
        if not vendor_matches(v_id, v_name, other_v_id, other_v_name):
            continue

        other_raw_no = str(other.get("invoice_no", "")).strip()
        other_norm_no = normalize_invoice_no(other_raw_no)

        # Case A: Matching normalized invoice_no
        if norm_inv_no and other_norm_no and norm_inv_no == other_norm_no:
            return {
                "rule_id": "DUPLICATE_INVOICE",
                "triggered": True,
                "reason": (
                    f"DUPLICATE_INVOICE: Invoice #{raw_inv_no} matches existing #{other_raw_no} "
                    f"(normalized: '{norm_inv_no}') for vendor '{v_name or v_id}'"
                ),
                "severity": "high",
                "duplicate_of": other_raw_no
            }

        # Case B: Matching amount within 0.5% tolerance + date within 7 calendar days
        other_amt = float(other.get("amount", 0.0))
        if amounts_match_with_tolerance(amount, other_amt, tolerance_pct=0.005) and inv_dt is not None:
            other_date_str = other.get("invoice_date", "")
            if other_date_str:
                try:
                    other_dt = datetime.strptime(other_date_str[:10], "%Y-%m-%d").date()
                    delta_days = abs((inv_dt - other_dt).days)
                    if delta_days <= 7:
                        return {
                            "rule_id": "DUPLICATE_INVOICE",
                            "triggered": True,
                            "reason": (
                                f"DUPLICATE_INVOICE: Matches invoice #{other_raw_no} "
                                f"(vendor '{v_name or v_id}', amount ₹{amount:,.2f} within 0.5% tolerance, within {delta_days} days)"
                            ),
                            "severity": "high",
                            "duplicate_of": other_raw_no
                        }
                except Exception:
                    pass

    return {
        "rule_id": "DUPLICATE_INVOICE",
        "triggered": False,
        "reason": None,
        "severity": "none",
        "duplicate_of": None
    }


def rule_repeated_claim(
    claim: Dict[str, Any],
    existing_claims: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    REPEATED_CLAIM rule:
    Triggers if another claim has:
      same employee + same category + same amount (within 0.5% tolerance) + same date.
    """
    emp_id = str(claim.get("employee_id", "")).strip().lower()
    cat = str(claim.get("category", "")).strip().lower()
    amount = float(claim.get("amount", 0.0))
    date_str = str(claim.get("date", ""))[:10]
    claim_id = str(claim.get("id", claim.get("claim_no", claim.get("_id", ""))))

    for other in existing_claims:
        other_id = str(other.get("id", other.get("claim_no", other.get("_id", ""))))
        if claim_id and other_id and claim_id == other_id:
            continue

        other_emp = str(other.get("employee_id", "")).strip().lower()
        if other_emp != emp_id:
            continue

        other_cat = str(other.get("category", "")).strip().lower()
        if other_cat != cat:
            continue

        other_date = str(other.get("date", ""))[:10]
        if other_date != date_str:
            continue

        other_amt = float(other.get("amount", 0.0))
        if amounts_match_with_tolerance(amount, other_amt, tolerance_pct=0.005):
            other_no = other.get("claim_no") or other_id
            return {
                "rule_id": "REPEATED_CLAIM",
                "triggered": True,
                "reason": (
                    f"REPEATED_CLAIM: Identical claim already exists #{other_no} "
                    f"(same employee '{emp_id}', category '{cat}', amount ₹{amount:,.2f}, date {date_str})"
                ),
                "severity": "high",
                "duplicate_of": other_no
            }

    return {
        "rule_id": "REPEATED_CLAIM",
        "triggered": False,
        "reason": None,
        "severity": "none",
        "duplicate_of": None
    }


def rule_policy_limit(
    claim: Dict[str, Any],
    user_grade: str = "L2",
    custom_limits: Optional[Dict[str, Dict[str, float]]] = None
) -> Dict[str, Any]:
    """
    POLICY_LIMIT rule:
    Checks if claim amount exceeds the category allowance for the user's grade.
    """
    category = claim.get("category", "General")
    amount = float(claim.get("amount", 0.0))
    limits = custom_limits or DEFAULT_GRADE_LIMITS

    cat_limits = limits.get(category, {})
    limit = cat_limits.get(user_grade.upper())

    if limit is not None and amount > limit:
        pct_over = ((amount - limit) / limit) * 100.0
        severity = "high" if pct_over > 50.0 else "medium"
        return {
            "rule_id": "POLICY_LIMIT",
            "triggered": True,
            "reason": (
                f"POLICY_LIMIT: Claim of ₹{amount:,.0f} exceeds Grade {user_grade.upper()} "
                f"limit of ₹{limit:,.0f} for category '{category}' by {round(pct_over)}%"
            ),
            "severity": severity,
            "limit": limit,
            "excess": amount - limit
        }

    return {
        "rule_id": "POLICY_LIMIT",
        "triggered": False,
        "reason": None,
        "severity": "none"
    }


def rule_missing_receipt(
    claim: Dict[str, Any],
    receipt_threshold: float = 500.0
) -> Dict[str, Any]:
    """
    MISSING_RECEIPT rule:
    Mandatory receipt proof required for claims over threshold (SEC-106).
    """
    amount = float(claim.get("amount", 0.0))
    receipt_attached = bool(claim.get("receipt_attached", True))

    if amount > receipt_threshold and not receipt_attached:
        return {
            "rule_id": "MISSING_RECEIPT",
            "triggered": True,
            "reason": f"MISSING_RECEIPT: Itemized receipt is mandatory for claims exceeding ₹{receipt_threshold:,.0f}",
            "severity": "medium"
        }

    return {
        "rule_id": "MISSING_RECEIPT",
        "triggered": False,
        "reason": None,
        "severity": "none"
    }


def rule_late_submission(
    claim: Dict[str, Any],
    max_days: int = 30,
    current_date: Optional[date] = None
) -> Dict[str, Any]:
    """
    LATE_SUBMISSION rule:
    Claims must be submitted within 30 days of the expense date (SEC-105).
    """
    claim_date_str = claim.get("date", "")
    if not claim_date_str:
        return {"rule_id": "LATE_SUBMISSION", "triggered": False, "reason": None, "severity": "none"}

    today = current_date or datetime.utcnow().date()
    try:
        claim_dt = datetime.strptime(claim_date_str[:10], "%Y-%m-%d").date()
    except Exception:
        return {"rule_id": "LATE_SUBMISSION", "triggered": False, "reason": None, "severity": "none"}

    age_days = (today - claim_dt).days
    if age_days > max_days:
        severity = "high" if age_days > 90 else "medium"
        return {
            "rule_id": "LATE_SUBMISSION",
            "triggered": True,
            "reason": f"LATE_SUBMISSION: Claim submitted {age_days} days after expense date (30-day deadline)",
            "severity": severity,
            "days_late": age_days - max_days
        }

    return {
        "rule_id": "LATE_SUBMISSION",
        "triggered": False,
        "reason": None,
        "severity": "none"
    }


def rule_po_mismatch(
    invoice: Dict[str, Any],
    purchase_order: Optional[Dict[str, Any]],
    tolerance_pct: float = 0.05,
    tolerance_amt: float = 1000.0
) -> Dict[str, Any]:
    """
    PO_MISMATCH rule:
    Invoice amount cannot exceed PO value beyond tolerance (5% or ₹1,000, whichever lower).
    """
    if not purchase_order:
        # If invoice specifies a PO number that doesn't exist
        po_no = invoice.get("po_no")
        if po_no:
            return {
                "rule_id": "PO_MISMATCH",
                "triggered": True,
                "reason": f"PO_MISMATCH: Referenced Purchase Order '{po_no}' was not found in procurement records",
                "severity": "high"
            }
        return {"rule_id": "PO_MISMATCH", "triggered": False, "reason": None, "severity": "none"}

    inv_amount = float(invoice.get("amount", 0.0))
    po_amount = float(purchase_order.get("amount", 0.0))
    po_no = purchase_order.get("po_no", invoice.get("po_no", "PO"))

    tolerance = min(po_amount * tolerance_pct, tolerance_amt)
    allowed_max = po_amount + tolerance

    if inv_amount > allowed_max:
        diff = inv_amount - po_amount
        pct_diff = (diff / po_amount * 100.0) if po_amount > 0 else 100.0
        severity = "high" if pct_diff >= 20.0 else "medium"
        return {
            "rule_id": "PO_MISMATCH",
            "triggered": True,
            "reason": (
                f"PO_MISMATCH: Invoice amount ₹{inv_amount:,.0f} exceeds authorized "
                f"PO '{po_no}' amount ₹{po_amount:,.0f} by ₹{diff:,.0f} ({round(pct_diff, 1)}%)"
            ),
            "severity": severity,
            "variance": diff
        }

    return {
        "rule_id": "PO_MISMATCH",
        "triggered": False,
        "reason": None,
        "severity": "none"
    }


def rule_overdue(
    invoice: Dict[str, Any],
    current_date: Optional[date] = None
) -> Dict[str, Any]:
    """
    OVERDUE rule:
    Triggers if invoice due_date has passed and status is not Paid.
    """
    status = invoice.get("status", "Received")
    if status == "Paid":
        return {"rule_id": "OVERDUE", "triggered": False, "reason": None, "severity": "none"}

    due_date_str = invoice.get("due_date", "")
    if not due_date_str:
        return {"rule_id": "OVERDUE", "triggered": False, "reason": None, "severity": "none"}

    today = current_date or datetime.utcnow().date()
    try:
        due_dt = datetime.strptime(due_date_str[:10], "%Y-%m-%d").date()
    except Exception:
        return {"rule_id": "OVERDUE", "triggered": False, "reason": None, "severity": "none"}

    if today > due_dt:
        days_overdue = (today - due_dt).days
        severity = "high" if days_overdue >= 14 else "medium"
        return {
            "rule_id": "OVERDUE",
            "triggered": True,
            "reason": f"OVERDUE: Payment overdue by {days_overdue} days (Due: {due_date_str}, Status: {status})",
            "severity": severity,
            "days_overdue": days_overdue
        }

    return {
        "rule_id": "OVERDUE",
        "triggered": False,
        "reason": None,
        "severity": "none"
    }


def rule_approval_delay(
    approval: Dict[str, Any],
    sla_days: int = 2,
    current_time: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    APPROVAL_DELAY rule:
    Triggers if approval remains Pending past the 2-day SLA window.
    """
    state = approval.get("state", "Pending")
    if state != "Pending":
        return {"rule_id": "APPROVAL_DELAY", "triggered": False, "reason": None, "severity": "none"}

    now = current_time or datetime.utcnow()
    created_at = approval.get("created_at")
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at)
        except Exception:
            created_at = now
    elif not isinstance(created_at, datetime):
        created_at = now

    age_days = (now - created_at).total_seconds() / 86400.0
    if age_days > sla_days:
        severity = "high" if age_days >= 4 else "medium"
        approver = approval.get("approver_id", "assigned approver")
        return {
            "rule_id": "APPROVAL_DELAY",
            "triggered": True,
            "reason": f"APPROVAL_DELAY: Pending with {approver} for {round(age_days, 1)} days (SLA: {sla_days} days)",
            "severity": severity,
            "age_days": round(age_days, 1)
        }

    return {
        "rule_id": "APPROVAL_DELAY",
        "triggered": False,
        "reason": None,
        "severity": "none"
    }


def rule_unusual_amount(
    amount: float,
    historical_amounts: List[float],
    category: str = "General"
) -> Dict[str, Any]:
    """
    Reuses statistical z-score from anomaly service as an additional rule.
    """
    if len(historical_amounts) >= 3:
        arr = np.array(historical_amounts)
        mean = float(np.mean(arr))
        std = float(np.std(arr))
        threshold = max(mean + 2.0 * std, mean * 2.0)
        if amount > threshold:
            multiplier = round(amount / mean, 1) if mean > 0 else 2.0
            return {
                "rule_id": "UNUSUAL_AMOUNT",
                "triggered": True,
                "reason": (
                    f"UNUSUAL_AMOUNT: ₹{amount:,.0f} {category} expense is {multiplier}x "
                    f"above historical category average (₹{mean:,.0f})"
                ),
                "severity": "medium"
            }

    return {
        "rule_id": "UNUSUAL_AMOUNT",
        "triggered": False,
        "reason": None,
        "severity": "none"
    }

# ─────────────────────────────────────────────────────────────────────────────
# Multi-Rule Evaluators
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_claim_rules(
    claim: Dict[str, Any],
    user_grade: str = "L2",
    historical_amounts: Optional[List[float]] = None,
    existing_claims: Optional[List[Dict[str, Any]]] = None
) -> List[Dict[str, Any]]:
    """Evaluates all rules applicable to an employee expense claim."""
    results = [
        rule_repeated_claim(claim, existing_claims or []),
        rule_policy_limit(claim, user_grade=user_grade),
        rule_missing_receipt(claim),
        rule_late_submission(claim),
        rule_unusual_amount(float(claim.get("amount", 0.0)), historical_amounts or [], claim.get("category", "General"))
    ]
    return [r for r in results if r["triggered"]]


def evaluate_invoice_rules(
    invoice: Dict[str, Any],
    existing_invoices: List[Dict[str, Any]],
    purchase_order: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """Evaluates all rules applicable to a vendor invoice."""
    results = [
        rule_duplicate_invoice(invoice, existing_invoices),
        rule_po_mismatch(invoice, purchase_order),
        rule_overdue(invoice)
    ]
    return [r for r in results if r["triggered"]]

# ─────────────────────────────────────────────────────────────────────────────
# Database Orchestrators with Automatic Escalation Creation
# ─────────────────────────────────────────────────────────────────────────────

async def audit_and_flag_claim(
    db,
    claim: Dict[str, Any],
    user: Dict[str, Any]
) -> Tuple[List[str], Optional[Dict[str, Any]]]:
    """
    Evaluates claim against all rules, computes flags, and creates
    automatic high-severity escalations.
    """
    # Fetch historical amounts for category anomaly check
    hist_cursor = db.claims.find(
        {"category": claim.get("category", "")},
        {"amount": 1}
    )
    hist_docs = await hist_cursor.to_list(length=100)
    historical_amounts = [float(d["amount"]) for d in hist_docs if "amount" in d]

    # Fetch existing claims for repeated claim detection
    existing_claims = await db.claims.find({"employee_id": claim.get("employee_id")}).to_list(100)

    triggered_rules = evaluate_claim_rules(
        claim=claim,
        user_grade=user.get("grade", "L2"),
        historical_amounts=historical_amounts,
        existing_claims=existing_claims
    )

    flags = [r["reason"] for r in triggered_rules if r.get("reason")]
    high_sev = [r for r in triggered_rules if r.get("severity") == "high"]
    escalation_created = None

    # Write audit log for any triggered rule
    for tr in triggered_rules:
        await write_audit(
            db=db,
            actor_id=user.get("id") or user.get("user_id", "system"),
            actor_role=user.get("role", "employee"),
            action="RULE_TRIGGER_CLAIM",
            entity_type="claim",
            entity_id=claim.get("claim_no", "CLM"),
            input_data={"amount": claim.get("amount"), "category": claim.get("category")},
            rule_id=tr.get("rule_id"),
            result={"reason": tr.get("reason"), "severity": tr.get("severity")},
            status="SUCCESS"
        )

    if high_sev:
        primary_violation = high_sev[0]
        escalation_created = await create_escalation(
            db=db,
            entity_type="claim",
            entity_id=claim.get("claim_no", "CLM"),
            reason="policy_violation",
            summary=f"Automatic Escalation: {primary_violation['reason']}",
            severity="high",
            assignee_id="fin_alex",
            actor_id=user.get("id") or user.get("user_id", "system"),
            actor_role=user.get("role", "employee")
        )

    return flags, escalation_created


async def audit_and_flag_invoice(
    db,
    invoice: Dict[str, Any]
) -> Tuple[List[str], Optional[str], Optional[Dict[str, Any]]]:
    """
    Evaluates invoice against duplicate, PO mismatch, and overdue rules.
    Returns (flags, duplicate_of, escalation_created).
    """
    existing_cursor = db.invoices.find({})
    existing_invoices = await existing_cursor.to_list(length=500)

    # Fetch associated PO if specified
    po_doc = None
    if invoice.get("po_no"):
        po_doc = await db.purchase_orders.find_one({"po_no": invoice["po_no"]})

    triggered_rules = evaluate_invoice_rules(
        invoice=invoice,
        existing_invoices=existing_invoices,
        purchase_order=po_doc
    )

    flags = [r["reason"] for r in triggered_rules if r.get("reason")]
    duplicate_of = None
    for r in triggered_rules:
        if r["rule_id"] == "DUPLICATE_INVOICE" and r.get("duplicate_of"):
            duplicate_of = r["duplicate_of"]
            break

    # Write audit log for any triggered rule
    for tr in triggered_rules:
        await write_audit(
            db=db,
            actor_id=invoice.get("vendor_id", "system"),
            actor_role="vendor",
            action="RULE_TRIGGER_INVOICE",
            entity_type="invoice",
            entity_id=invoice.get("invoice_no", "INV"),
            input_data={"amount": invoice.get("amount"), "po_no": invoice.get("po_no")},
            rule_id=tr.get("rule_id"),
            result={"reason": tr.get("reason"), "severity": tr.get("severity")},
            status="SUCCESS"
        )

    high_sev = [r for r in triggered_rules if r.get("severity") == "high"]
    escalation_created = None

    if high_sev:
        primary = high_sev[0]
        reason_type = "duplicate" if primary["rule_id"] == "DUPLICATE_INVOICE" else "discrepancy"
        escalation_created = await create_escalation(
            db=db,
            entity_type="invoice",
            entity_id=invoice.get("invoice_no", "INV"),
            reason=reason_type,
            summary=f"Automatic Escalation: {primary['reason']}",
            severity="high",
            assignee_id="fin_alex",
            actor_id=invoice.get("vendor_id", "system"),
            actor_role="vendor"
        )

    return flags, duplicate_of, escalation_created
