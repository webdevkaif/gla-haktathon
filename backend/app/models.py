from datetime import datetime
from typing import Optional, Dict, Any, List, Union
import json
import uuid
from bson import ObjectId

def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Converts a MongoDB document into a JSON-friendly dict for Pydantic models."""
    if not doc:
        return None
    d = dict(doc)
    
    # Handle primary identifier
    if "_id" in d:
        doc_id = str(d["_id"])
        if "id" not in d or not d["id"]:
            d["id"] = doc_id
        d["_id"] = doc_id
    elif "id" in d:
        d["id"] = str(d["id"])
        
    # Ensure created_at / ts is valid datetime
    for dt_field in ["created_at", "ts", "due_at", "last_reminder_at", "resolved_at"]:
        if dt_field in d and isinstance(d[dt_field], str):
            try:
                d[dt_field] = datetime.fromisoformat(d[dt_field])
            except Exception:
                pass

    return d

def serialize_docs(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [serialize_doc(doc) for doc in docs if doc is not None]

def build_id_query(id_val: Union[int, str]) -> Dict[str, Any]:
    """Generates an accurate MongoDB query matching either ObjectId or string id."""
    str_val = str(id_val)
    conditions: List[Dict[str, Any]] = [
        {"id": str_val},
        {"id": id_val}
    ]
    if ObjectId.is_valid(str_val):
        conditions.append({"_id": ObjectId(str_val)})
    return {"$or": conditions}

# ─────────────────────────────────────────────────────────────────────────────
# Document Helper Classes for Meridian Enterprise Collections
# ─────────────────────────────────────────────────────────────────────────────

class User:
    @staticmethod
    def create(
        user_id: Optional[str] = None,
        name: str = "",
        role: str = "employee",
        grade: Optional[str] = None,
        email: Optional[str] = None,
        manager_id: Optional[str] = None,
        is_sample: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        uid = user_id or kwargs.get("id") or "user_default"
        return {
            "id": uid,
            "name": name,
            "role": role,  # employee | vendor | manager | finance
            "grade": grade,  # L1, L2, L3, L4, L5
            "email": email or f"{uid}@meridian.com",
            "manager_id": manager_id,
            "is_sample": is_sample,
            "created_at": datetime.utcnow()
        }

class Policy:
    @staticmethod
    def create(
        policy_id: str,
        doc_name: str,
        section_id: str,
        title: str,
        text: str,
        category: Optional[str] = None,
        grade_limits: Optional[Dict[str, float]] = None,
        is_sample: bool = True
    ) -> Dict[str, Any]:
        return {
            "id": policy_id,
            "doc_name": doc_name,
            "section_id": section_id,
            "title": title,
            "text": text,
            "category": category or "General",
            "grade_limits": grade_limits or {},
            "is_sample": is_sample,
            "created_at": datetime.utcnow()
        }

class Claim:
    @staticmethod
    def create(
        claim_no: str,
        employee_id: str,
        category: str,
        amount: float,
        date: str,
        receipt_attached: bool = True,
        status: str = "Submitted",
        currency: str = "INR",
        approver_id: Optional[str] = None,
        expected_payment_date: Optional[str] = None,
        policy_flags: Optional[List[str]] = None,
        description: str = "",
        is_sample: bool = True
    ) -> Dict[str, Any]:
        return {
            "id": claim_no,
            "claim_no": claim_no,
            "employee_id": employee_id,
            "category": category,
            "amount": round(float(amount), 2),
            "currency": currency,
            "date": date,
            "receipt_attached": receipt_attached,
            "status": status,  # Submitted | Pending Manager | Approved | Rejected | Pending Finance | Paid
            "approver_id": approver_id,
            "expected_payment_date": expected_payment_date,
            "policy_flags": policy_flags or [],
            "description": description,
            "is_sample": is_sample,
            "created_at": datetime.utcnow()
        }

class Invoice:
    @staticmethod
    def create(
        invoice_no: str,
        vendor_id: str,
        amount: float,
        invoice_date: str,
        due_date: str,
        po_no: Optional[str] = None,
        vendor_name: Optional[str] = None,
        status: str = "Received",
        duplicate_of: Optional[str] = None,
        flags: Optional[List[str]] = None,
        tax: float = 0.0,
        currency: str = "INR",
        line_items: Optional[List[Dict[str, Any]]] = None,
        file_name: Optional[str] = None,
        is_sample: bool = True
    ) -> Dict[str, Any]:
        return {
            "id": invoice_no,
            "invoice_no": invoice_no,
            "vendor_id": vendor_id,
            "vendor_name": vendor_name or vendor_id,
            "po_no": po_no,
            "amount": round(float(amount), 2),
            "currency": currency,
            "invoice_date": invoice_date,
            "due_date": due_date,
            "status": status,  # Received | Pending Approval | Approved | Paid | Disputed
            "duplicate_of": duplicate_of,
            "flags": flags or [],
            "tax": round(float(tax), 2),
            "line_items": line_items or [],
            "file_name": file_name,
            "is_sample": is_sample,
            "created_at": datetime.utcnow()
        }

class PurchaseOrder:
    @staticmethod
    def create(
        po_no: str,
        vendor_id: str,
        amount: float,
        currency: str = "INR",
        description: str = "",
        status: str = "Open",
        is_sample: bool = True
    ) -> Dict[str, Any]:
        return {
            "id": po_no,
            "po_no": po_no,
            "vendor_id": vendor_id,
            "amount": round(float(amount), 2),
            "currency": currency,
            "description": description,
            "status": status,
            "is_sample": is_sample,
            "created_at": datetime.utcnow()
        }

class Approval:
    @staticmethod
    def create(
        entity_type: str,
        entity_id: str,
        approver_id: str,
        state: str = "Pending",
        due_at: Optional[datetime] = None,
        reminders_sent: int = 0,
        last_reminder_at: Optional[datetime] = None,
        approval_id: Optional[str] = None,
        is_sample: bool = True
    ) -> Dict[str, Any]:
        app_id = approval_id or f"APP-{uuid.uuid4().hex[:8].upper()}"
        return {
            "id": app_id,
            "approval_id": app_id,
            "entity_type": entity_type,  # claim | invoice
            "entity_id": entity_id,
            "approver_id": approver_id,
            "state": state,  # Pending | Approved | Rejected
            "created_at": datetime.utcnow(),
            "due_at": due_at or datetime.utcnow(),
            "reminders_sent": reminders_sent,
            "last_reminder_at": last_reminder_at,
            "is_sample": is_sample
        }

class Escalation:
    @staticmethod
    def create(
        entity_type: str,
        entity_id: str,
        reason: str,
        summary: str,
        severity: str = "medium",
        assignee_id: Optional[str] = "fin_alex",
        status: str = "Open",
        escalation_id: Optional[str] = None,
        is_sample: bool = True
    ) -> Dict[str, Any]:
        esc_id = escalation_id or f"ESC-{uuid.uuid4().hex[:8].upper()}"
        return {
            "id": esc_id,
            "escalation_id": esc_id,
            "entity_type": entity_type,  # claim | invoice
            "entity_id": entity_id,
            "reason": reason,  # duplicate | policy_violation | discrepancy | other
            "severity": severity,  # low | medium | high
            "assignee_id": assignee_id,
            "status": status,  # Open | Resolved
            "summary": summary,
            "created_at": datetime.utcnow(),
            "resolved_at": None,
            "is_sample": is_sample
        }

class AuditLog:
    @staticmethod
    def create(
        actor_id: str,
        actor_role: str,
        action: str,
        entity_type: str,
        entity_id: str,
        input_data: Optional[Dict[str, Any]] = None,
        rule_id: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None,
        status: str = "SUCCESS",
        prev_hash: str = "0" * 64,
        entry_hash: Optional[str] = None,
        log_id: Optional[str] = None,
        is_sample: bool = True
    ) -> Dict[str, Any]:
        lid = log_id or f"AUD-{uuid.uuid4().hex[:12].upper()}"
        return {
            "id": lid,
            "ts": datetime.utcnow(),
            "actor_id": actor_id,
            "actor_role": actor_role,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "input": input_data or {},
            "rule_id": rule_id,
            "result": result or {},
            "status": status,  # SUCCESS | FAILED | REFUSED
            "prev_hash": prev_hash,
            "hash": entry_hash or "",
            "is_sample": is_sample
        }

# Backwards compatibility helpers
class Expense:
    @staticmethod
    def create(user_id: str, amount: float, category: str, description: str, date: str, **kwargs) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "amount": round(float(amount), 2),
            "category": category,
            "description": description,
            "date": date,
            "payment_method": kwargs.get("payment_method", "Unknown"),
            "is_unusual": kwargs.get("is_unusual", False),
            "anomaly_reason": kwargs.get("anomaly_reason"),
            "created_at": datetime.utcnow(),
            "is_sample": kwargs.get("is_sample", True)
        }

class Budget:
    @staticmethod
    def create(user_id: str, month: str, total_budget: float, category_limits: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "month": month,
            "total_budget": float(total_budget),
            "category_limits": category_limits or {},
            "created_at": datetime.utcnow(),
            "is_sample": True
        }

class Alert:
    @staticmethod
    def create(user_id: str, type: str, title: str, message: str, severity: str = "warning", **kwargs) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "type": type,
            "severity": severity,
            "title": title,
            "message": message,
            "action_options": kwargs.get("action_options", []),
            "is_read": kwargs.get("is_read", False),
            "created_at": datetime.utcnow(),
            "is_sample": True
        }

class SavingGoal:
    @staticmethod
    def create(user_id: str, title: str, target_amount: float, monthly_target: float, **kwargs) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "title": title,
            "target_amount": float(target_amount),
            "current_saved": float(kwargs.get("current_saved", 0.0)),
            "target_months": int(kwargs.get("target_months", 3)),
            "monthly_target": float(monthly_target),
            "category_suggestions": kwargs.get("category_suggestions", []),
            "created_at": datetime.utcnow(),
            "is_sample": True
        }
