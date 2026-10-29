from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import HTTPException
from backend.app.models import Escalation, serialize_doc, serialize_docs, build_id_query
from backend.app.services.audit import write_audit

async def create_escalation(
    db: Any,
    entity_type: str,
    entity_id: str,
    reason: str,
    summary: str,
    severity: str = "medium",
    assignee_id: Optional[str] = "fin_alex",
    actor_id: str = "system",
    actor_role: str = "finance"
) -> Dict[str, Any]:
    """
    Creates an escalation ticket assigned to Finance, writes an audit entry,
    and returns the created record.
    """
    # Prevent duplicate open escalations for the same entity and reason
    existing = await db.escalations.find_one({
        "entity_id": entity_id,
        "reason": reason,
        "status": "Open"
    })
    if existing:
        return serialize_doc(existing)

    doc = Escalation.create(
        entity_type=entity_type,
        entity_id=entity_id,
        reason=reason,
        summary=summary,
        severity=severity,
        assignee_id=assignee_id or "fin_alex",
        status="Open"
    )

    await db.escalations.insert_one(doc)

    # Immutable audit trail
    await write_audit(
        db=db,
        actor_id=actor_id,
        actor_role=actor_role,
        action="ESCALATION_CREATE",
        entity_type=entity_type,
        entity_id=entity_id,
        input_data={
            "reason": reason,
            "severity": severity,
            "summary": summary
        },
        result={
            "escalation_id": doc["id"],
            "assignee_id": doc["assignee_id"]
        },
        status="SUCCESS"
    )

    return serialize_doc(doc)

async def resolve_escalation(
    db: Any,
    escalation_id: str,
    actor_id: str,
    actor_role: str,
    resolution_note: str = ""
) -> Dict[str, Any]:
    """
    Resolves an open escalation. Strictly enforces role-based access:
    Only Finance staff can resolve escalations.
    """
    if actor_role != "finance":
        await write_audit(
            db=db,
            actor_id=actor_id,
            actor_role=actor_role,
            action="ESCALATION_RESOLVE_ATTEMPT",
            entity_type="escalation",
            entity_id=escalation_id,
            input_data={"resolution_note": resolution_note},
            status="REFUSED"
        )
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only finance personnel are authorized to resolve escalations."
        )

    query = build_id_query(escalation_id)
    # Also support searching by custom escalation_id field
    query = {"$or": [query, {"escalation_id": escalation_id}, {"id": escalation_id}]}

    esc = await db.escalations.find_one(query)
    if not esc:
        raise HTTPException(status_code=404, detail=f"Escalation '{escalation_id}' not found.")

    now = datetime.utcnow()
    update_data = {
        "status": "Resolved",
        "resolution_note": resolution_note,
        "resolved_at": now,
        "resolved_by": actor_id
    }

    await db.escalations.update_one({"_id": esc["_id"]}, {"$set": update_data})
    esc.update(update_data)

    await write_audit(
        db=db,
        actor_id=actor_id,
        actor_role=actor_role,
        action="ESCALATION_RESOLVE",
        entity_type=esc["entity_type"],
        entity_id=esc["entity_id"],
        input_data={"escalation_id": escalation_id, "resolution_note": resolution_note},
        result={"status": "Resolved", "resolved_by": actor_id},
        status="SUCCESS"
    )

    return serialize_doc(esc)

async def get_escalations(
    db: Any,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Retrieve escalations with optional status and severity filters."""
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if severity:
        query["severity"] = severity

    cursor = db.escalations.find(query).sort([("created_at", -1)]).limit(limit)
    docs = await cursor.to_list(limit)
    return serialize_docs(docs)
