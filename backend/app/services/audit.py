import hashlib
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.app.models import AuditLog, serialize_doc, serialize_docs

GENESIS_HASH = "0" * 64

def compute_audit_hash(prev_hash: str, entry_dict: Dict[str, Any]) -> str:
    """
    Computes an immutable SHA-256 hash chaining to the previous log entry.
    Uses canonical JSON representation of core audit fields.
    """
    ts_val = entry_dict.get("ts")
    if isinstance(ts_val, datetime):
        ts_str = ts_val.strftime("%Y-%m-%dT%H:%M:%SZ")
    elif ts_val:
        ts_str = str(ts_val)[:19]
    else:
        ts_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = {
        "prev_hash": prev_hash or GENESIS_HASH,
        "ts": ts_str,
        "actor_id": str(entry_dict.get("actor_id", "system")),
        "action": str(entry_dict.get("action", "UNKNOWN")),
        "entity_type": str(entry_dict.get("entity_type", "general")),
        "entity_id": str(entry_dict.get("entity_id", "none")),
        "status": str(entry_dict.get("status", "SUCCESS"))
    }
    canonical_json = json.dumps(payload, sort_keys=True)
    return hashlib.sha256((prev_hash + canonical_json).encode("utf-8")).hexdigest()

async def write_audit(
    db: Any,
    actor_id: str,
    actor_role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    input_data: Optional[Dict[str, Any]] = None,
    rule_id: Optional[str] = None,
    result: Optional[Dict[str, Any]] = None,
    status: str = "SUCCESS",
    is_sample: bool = True
) -> Dict[str, Any]:
    """
    Appends an immutable, cryptographically chained audit log entry.
    Never updates or deletes existing rows.
    """
    # Find the most recent audit entry to chain from
    last_cursor = db.audit_log.find().sort([("_id", -1)]).limit(1)
    last_entries = await last_cursor.to_list(1)
    prev_hash = last_entries[0]["hash"] if last_entries and last_entries[0].get("hash") else GENESIS_HASH

    doc = AuditLog.create(
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        input_data=input_data or {},
        rule_id=rule_id,
        result=result or {},
        status=status,
        prev_hash=prev_hash,
        is_sample=is_sample
    )

    doc["hash"] = compute_audit_hash(prev_hash, doc)
    await db.audit_log.insert_one(doc)
    return serialize_doc(doc)

async def verify_chain(db: Any) -> Dict[str, Any]:
    """
    Walks the entire audit log collection in sequential order.
    Verifies that every entry correctly links to the preceding entry's hash
    and matches its recomputed content hash.
    Returns:
        {"valid": bool, "total": int, "broken_at": Optional[str], "message": str}
    """
    cursor = db.audit_log.find().sort([("_id", 1)])
    logs = await cursor.to_list(None)

    total = len(logs)
    if total == 0:
        return {
            "valid": True,
            "total": 0,
            "broken_at": None,
            "message": "Audit trail is empty."
        }

    expected_prev = GENESIS_HASH
    for idx, entry in enumerate(logs):
        entry_id = entry.get("id") or str(entry.get("_id"))
        recorded_prev = entry.get("prev_hash", "")
        recorded_hash = entry.get("hash", "")

        # Verify previous hash link
        if recorded_prev != expected_prev:
            return {
                "valid": False,
                "total": total,
                "broken_at": entry_id,
                "message": (
                    f"Broken hash link at index {idx} ({entry_id}): "
                    f"expected prev_hash '{expected_prev[:12]}...', got '{recorded_prev[:12]}...'"
                )
            }

        # Verify entry content integrity
        computed_hash = compute_audit_hash(expected_prev, entry)
        if computed_hash != recorded_hash:
            return {
                "valid": False,
                "total": total,
                "broken_at": entry_id,
                "message": (
                    f"Cryptographic tampering detected at entry {entry_id} (index {idx}): "
                    f"recalculated hash '{computed_hash[:12]}...' does not match recorded hash '{recorded_hash[:12]}...'"
                )
            }

        expected_prev = recorded_hash

    return {
        "valid": True,
        "total": total,
        "broken_at": None,
        "message": f"Audit chain verified successfully ({total} immutable blocks intact)."
    }

async def get_audit_logs(
    db: Any,
    skip: int = 0,
    limit: int = 50,
    actor_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieve audit logs with optional filtering, sorted newest first."""
    query: Dict[str, Any] = {}
    if actor_id:
        query["actor_id"] = actor_id
    if entity_type:
        query["entity_type"] = entity_type
    if action:
        query["action"] = action

    cursor = db.audit_log.find(query).sort([("ts", -1)]).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    return serialize_docs(docs)
