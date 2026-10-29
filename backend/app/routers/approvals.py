from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.database import get_db
from backend.app.auth import get_current_user
from backend.app.schemas import ApprovalOut, ApprovalDecideRequest, ApprovalRemindRequest
from backend.app.models import serialize_docs, serialize_doc, build_id_query
from backend.app.services.workflow import (
    decide_approval, send_approval_reminder, check_and_send_due_reminders
)

router = APIRouter(prefix="/api/approvals", tags=["Approvals Workflow"])

@router.get("", response_model=List[ApprovalOut])
async def list_approvals(
    state: Optional[str] = Query(None, description="Filter by state: Pending, Approved, Rejected"),
    entity_type: Optional[str] = Query(None, description="Filter by entity_type: claim or invoice"),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Returns role-filtered approvals:
    - Manager: approvals assigned to them
    - Finance: all approvals
    - Employee: approvals for their own claims
    - Vendor: approvals for their invoices
    """
    role = current_user.get("role", "employee")
    user_id = current_user.get("id", "")

    query: Dict[str, Any] = {}
    if state:
        query["state"] = state
    if entity_type:
        query["entity_type"] = entity_type

    if role == "finance":
        pass  # Global visibility
    elif role == "manager":
        query["$or"] = [
            {"approver_id": user_id},
            {"entity_id": {"$in": [c["claim_no"] for c in await db.claims.find({"employee_id": user_id}, {"claim_no": 1}).to_list(100)]}}
        ]
    elif role == "employee":
        user_claims = await db.claims.find({"employee_id": user_id}, {"claim_no": 1}).to_list(100)
        c_ids = [c["claim_no"] for c in user_claims]
        query["entity_id"] = {"$in": c_ids}
    elif role == "vendor":
        vendor_invs = await db.invoices.find({"vendor_id": user_id}, {"invoice_no": 1}).to_list(100)
        i_ids = [i["invoice_no"] for i in vendor_invs]
        query["entity_id"] = {"$in": i_ids}

    docs = await db.approvals.find(query).sort([("created_at", -1)]).to_list(200)
    return serialize_docs(docs)


@router.post("/{approval_id}/decide")
async def decide_approval_endpoint(
    approval_id: str,
    payload: ApprovalDecideRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Executes approval or rejection for an approval request:
    - Strictly checks that only the assigned approver or Finance staff can decide.
    - Transitions claim/invoice state.
    - Automatically calculates next Friday payment disbursement date if approved.
    - Routes to Finance if claim > ₹10,000 threshold.
    - Writes immutable audit log entry.
    """
    res = await decide_approval(
        db=db,
        approval_id=approval_id,
        user=current_user,
        decision=payload.decision,
        notes=payload.notes or ""
    )
    return res


@router.post("/{approval_id}/remind")
async def send_reminder_endpoint(
    approval_id: str,
    payload: Optional[ApprovalRemindRequest] = None,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Dispatches a reminder notification to the designated approver.
    Enforces a 10-minute cooldown to prevent notification fatigue.
    """
    force = payload.force if payload else False
    res = await send_approval_reminder(
        db=db,
        approval_id=approval_id,
        user=current_user,
        force=force
    )
    return res


@router.post("/check-reminders")
async def trigger_due_reminders_check(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Manual trigger endpoint for demos:
    Scans all pending approvals past SLA (> 2 days) and dispatches simulated reminders.
    """
    res = await check_and_send_due_reminders(db)
    return res
