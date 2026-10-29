from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.database import get_db
from backend.app.auth import get_current_user
from backend.app.schemas import EscalationOut, EscalationCreate, EscalationResolveRequest
from backend.app.services.escalation import create_escalation, resolve_escalation, get_escalations

router = APIRouter(prefix="/api/escalations", tags=["Escalations"])

@router.get("", response_model=List[EscalationOut])
async def list_escalations(
    status: Optional[str] = Query(None, description="Filter: Open or Resolved"),
    severity: Optional[str] = Query(None, description="Filter: high, medium, low"),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Returns list of corporate escalations (duplicate invoices, policy violations, PO mismatches).
    """
    return await get_escalations(db, status=status, severity=severity, limit=100)


@router.post("", response_model=EscalationOut)
async def report_escalation(
    payload: EscalationCreate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Manually creates an escalation assigned to the Finance team.
    """
    user_id = current_user.get("id", "system")
    role = current_user.get("role", "employee")

    res = await create_escalation(
        db=db,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        reason=payload.reason,
        summary=payload.summary,
        severity=payload.severity,
        assignee_id="fin_alex",
        actor_id=user_id,
        actor_role=role
    )
    return res


@router.post("/{escalation_id}/resolve", response_model=EscalationOut)
async def resolve_escalation_endpoint(
    escalation_id: str,
    payload: EscalationResolveRequest,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Resolves an open escalation.
    Strictly restricted to Finance personnel.
    """
    user_id = current_user.get("id", "")
    role = current_user.get("role", "employee")

    if role != "finance":
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only Finance personnel are authorized to resolve escalations."
        )

    res = await resolve_escalation(
        db=db,
        escalation_id=escalation_id,
        actor_id=user_id,
        actor_role=role,
        resolution_note=payload.resolution_note or "Resolved after compliance review."
    )
    return res

