from typing import Optional, List, Dict, Any
from fastapi import Header, HTTPException, Depends
from backend.app.database import get_db

DEMO_USERS: Dict[str, Dict[str, Any]] = {
    "emp_john": {
        "id": "emp_john",
        "name": "John Doe",
        "role": "employee",
        "grade": "L2",
        "email": "john.doe@meridian.com",
        "manager_id": "mgr_sarah",
        "is_sample": True
    },
    "emp_alice": {
        "id": "emp_alice",
        "name": "Alice Smith",
        "role": "employee",
        "grade": "L3",
        "email": "alice.smith@meridian.com",
        "manager_id": "mgr_sarah",
        "is_sample": True
    },
    "ven_acme": {
        "id": "ven_acme",
        "name": "Acme Supplies Ltd",
        "role": "vendor",
        "grade": None,
        "email": "billing@acmesupplies.com",
        "manager_id": None,
        "is_sample": True
    },
    "mgr_sarah": {
        "id": "mgr_sarah",
        "name": "Sarah Connor",
        "role": "manager",
        "grade": "L4",
        "email": "sarah.connor@meridian.com",
        "manager_id": "fin_alex",
        "is_sample": True
    },
    "fin_alex": {
        "id": "fin_alex",
        "name": "Alex Morgan",
        "role": "finance",
        "grade": "L5",
        "email": "finance@meridian.com",
        "manager_id": None,
        "is_sample": True
    }
}

DEFAULT_USER_ID = "emp_john"

async def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db = Depends(get_db)
) -> Dict[str, Any]:
    """
    Extracts user identity from X-User-Id header.
    Falls back to default demo employee if not provided.
    """
    user_id = (x_user_id or DEFAULT_USER_ID).strip()
    if not user_id:
        user_id = DEFAULT_USER_ID

    # Try database first
    user_doc = await db.users.find_one({"id": user_id})
    if user_doc:
        doc = dict(user_doc)
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    # Fallback to static demo user map
    if user_id in DEMO_USERS:
        return DEMO_USERS[user_id]

    # If unknown user_id provided, default to employee role safely
    return {
        "id": user_id,
        "name": user_id.replace("_", " ").title(),
        "role": "employee",
        "grade": "L2",
        "email": f"{user_id}@meridian.com",
        "manager_id": "mgr_sarah",
        "is_sample": True
    }

def require_role(allowed_roles: List[str]):
    """FastAPI dependency factory enforcing role-based access control."""
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role", "employee").lower()
        if user_role not in [r.lower() for r in allowed_roles]:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: Role '{user_role}' is not authorized. Allowed roles: {allowed_roles}"
            )
        return user
    return role_checker

