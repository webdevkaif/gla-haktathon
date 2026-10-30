from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from backend.app.database import get_db
from backend.app.auth import get_current_user
from backend.app.schemas import FinanceDashboardOut, DashboardKPIs
from backend.app.models import serialize_docs

router = APIRouter(prefix="/api/dashboard", tags=["Finance Dashboard"])

@router.get("/summary", response_model=FinanceDashboardOut)
async def get_dashboard_summary(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Computes all 6 live corporate KPIs and analytical aggregations:
    1. Pending Invoices (Count & Amount)
    2. Overdue Payments (Count & Amount)
    3. Reimbursement Requests (Count & Amount)
    4. Flagged Duplicate Invoices (Count & Side-by-side matches)
    5. Approval Delays > 2 days SLA
    6. Open Escalations
    Plus status distributions, overdue lists, and delayed approvals.
    """
    now = datetime.utcnow()
    today_str = now.strftime("%Y-%m-%d")

    # 1. Fetch Invoices
    all_invoices = await db.invoices.find({}).to_list(500)
    invoices_by_status: Dict[str, int] = {}
    pending_inv_count = 0
    pending_inv_amount = 0.0
    overdue_count = 0
    overdue_amount = 0.0
    overdue_items: List[Dict[str, Any]] = []
    flagged_duplicates: List[Dict[str, Any]] = []

    for inv in all_invoices:
        st = inv.get("status", "Received")
        invoices_by_status[st] = invoices_by_status.get(st, 0) + 1
        amt = float(inv.get("amount", 0.0))

        if st == "Pending Approval":
            pending_inv_count += 1
            pending_inv_amount += amt

        # Check overdue condition: due_date < today and not Paid
        due_str = inv.get("due_date", "")
        if st != "Paid" and due_str and due_str < today_str:
            overdue_count += 1
            overdue_amount += amt
            try:
                due_dt = datetime.strptime(due_str[:10], "%Y-%m-%d")
                days_over = (now - due_dt).days
            except Exception:
                days_over = 1
            overdue_items.append({
                "invoice_no": inv.get("invoice_no"),
                "vendor_id": inv.get("vendor_id"),
                "vendor_name": inv.get("vendor_name"),
                "amount": amt,
                "due_date": due_str,
                "days_overdue": max(1, days_over),
                "status": st
            })

        # Check duplicate invoices
        dup_of = inv.get("duplicate_of")
        if dup_of:
            # Find original invoice for comparison
            orig = next((i for i in all_invoices if i.get("invoice_no") == dup_of), None)
            flagged_duplicates.append({
                "duplicate_invoice_no": inv.get("invoice_no"),
                "original_invoice_no": dup_of,
                "vendor_id": inv.get("vendor_id"),
                "amount": amt,
                "duplicate_date": inv.get("invoice_date"),
                "original_date": orig.get("invoice_date") if orig else "Unknown",
                "reason": f"Matches {dup_of} (same vendor & amount within tolerance window)",
                "status": st
            })

    # 2. Fetch Claims
    all_claims = await db.claims.find({}).to_list(500)
    claims_by_status: Dict[str, int] = {}
    reimburse_count = 0
    reimburse_amount = 0.0

    for clm in all_claims:
        st = clm.get("status", "Submitted")
        claims_by_status[st] = claims_by_status.get(st, 0) + 1
        amt = float(clm.get("amount", 0.0))
        if st in ["Submitted", "Pending Manager", "Pending Finance"]:
            reimburse_count += 1
            reimburse_amount += amt

    # 3. Fetch Approvals past SLA (> 2 days)
    two_days_ago = now - timedelta(days=2)
    delayed_approvals_cursor = db.approvals.find({
        "state": "Pending",
        "$or": [
            {"due_at": {"$lte": now}},
            {"created_at": {"$lte": two_days_ago}}
        ]
    })
    delayed_approvals_raw = await delayed_approvals_cursor.to_list(100)
    approval_delays: List[Dict[str, Any]] = []

    for app in delayed_approvals_raw:
        c_at = app.get("created_at")
        if isinstance(c_at, str):
            try:
                c_at = datetime.fromisoformat(c_at)
            except Exception:
                c_at = now
        elif not isinstance(c_at, datetime):
            c_at = now
        days_pending = max(1.0, round((now - c_at).total_seconds() / 86400.0, 1))

        approval_delays.append({
            "approval_id": app.get("id") or str(app.get("_id")),
            "entity_type": app.get("entity_type"),
            "entity_id": app.get("entity_id"),
            "approver_id": app.get("approver_id"),
            "days_pending": days_pending,
            "reminders_sent": app.get("reminders_sent", 0),
            "last_reminder_at": app.get("last_reminder_at")
        })

    # 4. Open Escalations
    open_escalations_raw = await db.escalations.find({"status": "Open"}).sort([("created_at", -1)]).to_list(50)
    open_escalations_count = len(open_escalations_raw)

    kpis = DashboardKPIs(
        pending_invoices_count=pending_inv_count,
        pending_invoices_amount=round(pending_inv_amount, 2),
        overdue_payments_count=overdue_count,
        overdue_payments_amount=round(overdue_amount, 2),
        reimbursement_requests_count=reimburse_count,
        reimbursement_requests_amount=round(reimburse_amount, 2),
        flagged_duplicates_count=len(flagged_duplicates),
        approval_delays_count=len(approval_delays),
        open_escalations_count=open_escalations_count
    )

    return FinanceDashboardOut(
        kpis=kpis,
        invoices_by_status=invoices_by_status,
        claims_by_status=claims_by_status,
        overdue_items=sorted(overdue_items, key=lambda x: x["days_overdue"], reverse=True),
        flagged_duplicates=flagged_duplicates,
        approval_delays=sorted(approval_delays, key=lambda x: x["days_pending"], reverse=True),
        open_escalations=serialize_docs(open_escalations_raw),
        sample_data_badge=True
    )
