from datetime import datetime
from typing import Optional, Dict, Any, List, Union
import json
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
        
    # Ensure created_at is valid datetime
    if "created_at" in d and isinstance(d["created_at"], str):
        try:
            d["created_at"] = datetime.fromisoformat(d["created_at"])
        except Exception:
            d["created_at"] = datetime.utcnow()
    elif "created_at" not in d or d["created_at"] is None:
        d["created_at"] = datetime.utcnow()

    # Parse JSON string fields if stored as text
    if "category_limits" in d and isinstance(d["category_limits"], str):
        try:
            d["category_limits"] = json.loads(d["category_limits"])
        except Exception:
            d["category_limits"] = {}
    elif "category_limits" not in d and "total_budget" in d:
        d["category_limits"] = {}

    if "action_options" in d and isinstance(d["action_options"], str):
        try:
            d["action_options"] = json.loads(d["action_options"])
        except Exception:
            d["action_options"] = []
    elif "action_options" not in d and "severity" in d:
        d["action_options"] = []

    if "category_suggestions" in d and isinstance(d["category_suggestions"], str):
        try:
            d["category_suggestions"] = json.loads(d["category_suggestions"])
        except Exception:
            d["category_suggestions"] = []
    elif "category_suggestions" not in d and "target_amount" in d:
        d["category_suggestions"] = []

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

class Expense:
    """Helper for Expense document structure in MongoDB."""
    @staticmethod
    def create(
        user_id: str,
        amount: float,
        category: str,
        description: str,
        date: str,
        payment_method: str = "Unknown",
        is_unusual: bool = False,
        anomaly_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "amount": round(float(amount), 2),
            "category": category,
            "description": description,
            "date": date,
            "payment_method": payment_method or "Unknown",
            "is_unusual": is_unusual,
            "anomaly_reason": anomaly_reason,
            "created_at": datetime.utcnow()
        }

class Budget:
    """Helper for Budget document structure in MongoDB."""
    @staticmethod
    def create(
        user_id: str,
        month: str,
        total_budget: float,
        category_limits: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "month": month,
            "total_budget": float(total_budget),
            "category_limits": category_limits or {},
            "created_at": datetime.utcnow()
        }

class Alert:
    """Helper for Alert document structure in MongoDB."""
    @staticmethod
    def create(
        user_id: str,
        type: str,
        title: str,
        message: str,
        severity: str = "warning",
        action_options: Optional[List[str]] = None,
        is_read: bool = False
    ) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "type": type,
            "severity": severity,
            "title": title,
            "message": message,
            "action_options": action_options or [],
            "is_read": is_read,
            "created_at": datetime.utcnow()
        }

class SavingGoal:
    """Helper for SavingGoal document structure in MongoDB."""
    @staticmethod
    def create(
        user_id: str,
        title: str,
        target_amount: float,
        monthly_target: float,
        target_months: int = 3,
        current_saved: float = 0.0,
        category_suggestions: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        return {
            "user_id": user_id,
            "title": title,
            "target_amount": float(target_amount),
            "current_saved": float(current_saved),
            "target_months": int(target_months),
            "monthly_target": float(monthly_target),
            "category_suggestions": category_suggestions or [],
            "created_at": datetime.utcnow()
        }
