import random
import time
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.database import get_db
from backend.app.auth import get_current_user
from backend.app.schemas import ClaimCreate, ClaimOut
from backend.app.models import Claim, Approval, serialize_doc, serialize_docs, build_id_query
from backend.app.services.rules import audit_and_flag_claim
from backend.app.services.audit import write_audit

router = APIRouter(prefix="/api/claims", tags=["Reimbursement Claims"])

@router.get("", response_model=List[ClaimOut])
async def list_claims(
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Returns role-filtered reimbursement claims:
    - Employee: only their own claims
    - Manager: direct team claims or assigned approvals
    - Finance: all corporate claims
    - Vendor: empty list (vendors do not access employee claims)
    """
    role = current_user.get("role", "employee")
    user_id = current_user.get("id", "")

    if role == "vendor":
        return []

    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category

    if role == "employee":
        query["employee_id"] = user_id
    elif role == "manager":
        # Direct reports or assigned approver or self
        direct_reports = await db.users.find({"manager_id": user_id}, {"id": 1}).to_list(100)
        report_ids = [u["id"] for u in direct_reports] + [user_id]
        query["$or"] = [
            {"employee_id": {"$in": report_ids}},
            {"approver_id": user_id}
        ]

    docs = await db.claims.find(query).sort([("created_at", -1)]).to_list(200)
    return serialize_docs(docs)


@router.post("", response_model=ClaimOut)
async def submit_claim(
    payload: ClaimCreate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Submits a new employee reimbursement claim:
    1. Validates category and amount.
    2. Runs corporate rule engine (policy limits, receipts, deadlines, anomalies).
    3. Auto-triggers High-Severity escalation to Finance if severe violation occurs.
    4. Automatically routes to reporting manager for approval.
    5. Appends immutable audit log.
    """
    role = current_user.get("role", "employee")
    user_id = current_user.get("id", "")

    if role == "vendor":
        raise HTTPException(status_code=403, detail="Vendors cannot submit employee expense claims.")

    claim_no = f"CLM-{int(time.time() * 1000) % 9000 + 1000}"
    # Ensure unique claim_no
    while await db.claims.find_one({"claim_no": claim_no}):
        claim_no = f"CLM-{random.randint(1000, 9999)}"

    # Approver is direct manager or default manager
    approver_id = current_user.get("manager_id") or "mgr_sarah"

    claim_dict = Claim.create(
        claim_no=claim_no,
        employee_id=user_id,
        category=payload.category,
        amount=payload.amount,
        currency=payload.currency,
        date=payload.date,
        receipt_attached=payload.receipt_attached,
        description=payload.description or "",
        approver_id=approver_id,
        status="Pending Manager",
        is_sample=True
    )

    # Run rule engine & auto-escalation
    flags, escalation = await audit_and_flag_claim(db=db, claim=claim_dict, user=current_user)
    claim_dict["policy_flags"] = flags

    await db.claims.insert_one(claim_dict)

    # Create Approval Request for Manager
    approval_doc = Approval.create(
        entity_type="claim",
        entity_id=claim_no,
        approver_id=approver_id,
        state="Pending"
    )
    await db.approvals.insert_one(approval_doc)

    # Write Audit Log
    await write_audit(
        db=db,
        actor_id=user_id,
        actor_role=role,
        action="CLAIM_SUBMIT",
        entity_type="claim",
        entity_id=claim_no,
        input_data={
            "amount": payload.amount,
            "category": payload.category,
            "receipt_attached": payload.receipt_attached
        },
        result={
            "claim_no": claim_no,
            "status": "Pending Manager",
            "approver_id": approver_id,
            "flags_count": len(flags),
            "escalated": escalation is not None
        },
        status="SUCCESS"
    )

    return serialize_doc(claim_dict)


@router.get("/{claim_no}", response_model=ClaimOut)
async def get_claim_detail(
    claim_no: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Returns details for a specific claim with role-based authorization check.
    """
    clean_no = claim_no.strip().upper()
    claim = await db.claims.find_one({"$or": [{"claim_no": clean_no}, {"id": clean_no}, build_id_query(clean_no)]})
    if not claim:
        raise HTTPException(status_code=404, detail=f"Claim '{claim_no}' not found.")

    role = current_user.get("role", "employee")
    user_id = current_user.get("id", "")

    if role == "employee" and claim.get("employee_id") != user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only view your own claims.")
    if role == "vendor":
        raise HTTPException(status_code=403, detail="Forbidden: Vendors cannot view employee claims.")

    return serialize_doc(claim)
