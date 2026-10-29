from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from backend.app.database import get_db
from backend.app.auth import get_current_user
from backend.app.schemas import AuditLogOut, AuditVerifyResponse
from backend.app.services.audit import get_audit_logs, verify_chain

router = APIRouter(prefix="/api/audit", tags=["Cryptographic Audit Trail"])

@router.get("", response_model=List[AuditLogOut])
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    actor_id: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Returns immutable, chronologically ordered audit logs with SHA-256 hash chains.
    """
    return await get_audit_logs(
        db=db,
        skip=skip,
        limit=limit,
        actor_id=actor_id,
        entity_type=entity_type,
        action=action
    )


@router.get("/verify", response_model=AuditVerifyResponse)
async def verify_audit_trail_integrity(
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Cryptographic verification endpoint:
    Walks the entire audit log collection block-by-block, recomputing SHA-256 hashes
    and validating that every previous block hash matches without alteration.
    Returns whether the chain is fully valid or flags the exact compromised entry.
    """
    res = await verify_chain(db)
    return AuditVerifyResponse(
        valid=res["valid"],
        total_entries=res["total"],
        total=res["total"],
        broken_at=res.get("broken_at"),
        broken_entry_id=res.get("broken_at"),
        message=res.get("message", "")
    )
