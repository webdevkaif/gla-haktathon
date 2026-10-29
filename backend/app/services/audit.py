import asyncio
import hashlib
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.app.models import AuditLog, serialize_doc, serialize_docs

GENESIS_HASH = "0" * 64

# Global asyncio Lock to guarantee atomic, sequential append-only writes under concurrency
_audit_write_lock = asyncio.Lock()

def _to_canonical_json(data: Any) -> str:
    """Converts a dict or object to sorted, compact canonical JSON string."""
    if data is None:
        return ""
    if isinstance(data, (dict, list)):
        return json.dumps(data, sort_keys=True, separators=(',', ':'), default=str)
    return str(data)

def compute_audit_hash(prev_hash: str, entry_dict: Dict[str, Any]) -> str:
    """
    Computes an immutable SHA-256 hash chaining to the previous log entry.
    Canonical JSON payload covers:
      - prev_hash
      - ts
      - actor_id
      - actor_role
      - action
      - entity_type
      - entity_id
      - rule_id
      - input_data (canonical sorted JSON)
      - result (canonical sorted JSON)
      - status
    """
    ts_val = entry_dict.get("ts")
    if isinstance(ts_val, datetime):
        ts_str = ts_val.strftime("%Y-%m-%dT%H:%M:%SZ")
    elif ts_val:
        ts_str = str(ts_val)[:19]
    else:
        ts_str = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Resolve input_data (supports 'input_data' or legacy 'input')
    raw_input = entry_dict.get("input_data")
    if raw_input is None:
        raw_input = entry_dict.get("input")

    payload = {
        "prev_hash": prev_hash or GENESIS_HASH,
        "ts": ts_str,
        "actor_id": str(entry_dict.get("actor_id", "system")),
        "actor_role": str(entry_dict.get("actor_role", "employee")),
        "action": str(entry_dict.get("action", "UNKNOWN")),
        "entity_type": str(entry_dict.get("entity_type", "general")),
        "entity_id": str(entry_dict.get("entity_id", "none")),
        "rule_id": str(entry_dict.get("rule_id") or ""),
        "input_data": _to_canonical_json(raw_input or {}),
        "result": _to_canonical_json(entry_dict.get("result") or {}),
        "status": str(entry_dict.get("status", "SUCCESS"))
    }

    canonical_json = json.dumps(payload, sort_keys=True, separators=(',', ':'))
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
    Thread-safe and coroutine-safe via _audit_write_lock.
    Never updates or deletes existing rows.
    """
    async with _audit_write_lock:
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

        # 1. Verify previous hash link
        if recorded_prev != expected_prev:
            return {
                "valid": False,
                "total": total,
                "broken_at": entry_id,
                "broken_at_index": idx,
                "message": (
                    f"Broken hash link at index {idx} ({entry_id}): "
                    f"expected prev_hash '{expected_prev[:12]}...', got '{recorded_prev[:12]}...'"
                )
            }

        # 2. Re-compute hash from payload
        recomputed_hash = compute_audit_hash(expected_prev, entry)
        if recomputed_hash != recorded_hash:
            return {
                "valid": False,
                "total": total,
                "broken_at": entry_id,
                "broken_at_index": idx,
                "message": (
                    f"Cryptographic tampering detected at entry {entry_id} (index {idx}): "
                    f"recalculated hash '{recomputed_hash[:12]}...' does not match recorded hash '{recorded_hash[:12]}...'"
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
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
) -> List[Dict[str, Any]]:
    """Retrieves paginated audit log history with optional filters."""
    query: Dict[str, Any] = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if actor_id:
        query["actor_id"] = actor_id
    if action:
        query["action"] = action

    cursor = db.audit_log.find(query).sort([("ts", -1)]).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    return serialize_docs(docs)
