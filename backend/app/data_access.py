from typing import Dict, Any, List, Optional
from backend.app.models import serialize_docs, serialize_doc, build_id_query

# ─────────────────────────────────────────────────────────────────────────────
# Centralized Data-Access Layer (DAL): Role-Based Scoping Queries
# ─────────────────────────────────────────────────────────────────────────────

def get_claims_scope_query(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns the MongoDB query filter for Claims based on the caller's role:
    - finance / admin: Full access to all claims.
    - manager: Claims submitted by self OR where self is the assigned approver / manager.
    - employee: Strictly own claims.
    - vendor: Forbidden from viewing internal employee claims.
    """
    role = (user.get("role") or "employee").lower()
    user_id = user.get("id") or user.get("user_id", "")

    if role in ["finance", "admin"]:
        return {}

    if role == "manager":
        return {
            "$or": [
                {"employee_id": user_id},
                {"approver_id": user_id}
            ]
        }

    if role == "employee":
        return {"employee_id": user_id}

    # Vendors cannot view internal employee claims
    return {"_id": {"$exists": False}}


def get_invoices_scope_query(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns the MongoDB query filter for Invoices based on the caller's role:
    - finance / admin: Full access to all vendor invoices.
    - vendor: Strictly invoices belonging to this vendor.
    - manager: Invoices assigned to this manager or company invoices under review.
    - employee: Forbidden from viewing third-party vendor procurement invoices.
    """
    role = (user.get("role") or "vendor").lower()
    user_id = user.get("id") or user.get("user_id", "")
    vendor_id = user.get("vendor_id") or user_id

    if role in ["finance", "admin"]:
        return {}

    if role == "vendor":
        return {
            "$or": [
                {"vendor_id": vendor_id},
                {"vendor_id": user_id}
            ]
        }

    if role == "manager":
        # Managers can view invoices they are assigned to approve
        return {
            "$or": [
                {"approver_id": user_id},
                {"assigned_manager_id": user_id}
            ]
        }

    # Regular employees do not have vendor procurement clearance
    return {"_id": {"$exists": False}}


def get_approvals_scope_query(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns the MongoDB query filter for Approvals based on the caller's role:
    - finance / admin: Full access to all approvals.
    - manager: Approvals assigned to this manager.
    - employee / vendor: Approvals where caller is the assigned approver.
    """
    role = (user.get("role") or "employee").lower()
    user_id = user.get("id") or user.get("user_id", "")

    if role in ["finance", "admin"]:
        return {}

    return {"approver_id": user_id}


def get_escalations_scope_query(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns the MongoDB query filter for Escalations based on the caller's role:
    - finance / admin: Full access to all escalations.
    - manager: Escalations assigned to self.
    - employee / vendor: Escalations assigned to self.
    """
    role = (user.get("role") or "employee").lower()
    user_id = user.get("id") or user.get("user_id", "")

    if role in ["finance", "admin"]:
        return {}

    return {"assignee_id": user_id}


# ─────────────────────────────────────────────────────────────────────────────
# Scoped Retrieval Methods
# ─────────────────────────────────────────────────────────────────────────────

async def fetch_scoped_claims(
    db: Any,
    user: Dict[str, Any],
    additional_filter: Optional[Dict[str, Any]] = None,
    limit: int = 100,
    skip: int = 0
) -> List[Dict[str, Any]]:
    scope_query = get_claims_scope_query(user)
    if additional_filter:
        query = {"$and": [scope_query, additional_filter]} if scope_query else additional_filter
    else:
        query = scope_query

    cursor = db.claims.find(query).sort([("created_at", -1)]).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    return serialize_docs(docs)


async def fetch_scoped_claim_by_no(
    db: Any,
    user: Dict[str, Any],
    claim_no: str
) -> Optional[Dict[str, Any]]:
    scope_query = get_claims_scope_query(user)
    id_query = {"claim_no": claim_no}
    query = {"$and": [scope_query, id_query]} if scope_query else id_query
    doc = await db.claims.find_one(query)
    return serialize_doc(doc)


async def fetch_scoped_invoices(
    db: Any,
    user: Dict[str, Any],
    additional_filter: Optional[Dict[str, Any]] = None,
    limit: int = 100,
    skip: int = 0
) -> List[Dict[str, Any]]:
    scope_query = get_invoices_scope_query(user)
    if additional_filter:
        query = {"$and": [scope_query, additional_filter]} if scope_query else additional_filter
    else:
        query = scope_query

    cursor = db.invoices.find(query).sort([("created_at", -1)]).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    return serialize_docs(docs)


async def fetch_scoped_invoice_by_no(
    db: Any,
    user: Dict[str, Any],
    invoice_no: str
) -> Optional[Dict[str, Any]]:
    scope_query = get_invoices_scope_query(user)
    id_query = {"invoice_no": invoice_no}
    query = {"$and": [scope_query, id_query]} if scope_query else id_query
    doc = await db.invoices.find_one(query)
    return serialize_doc(doc)


async def fetch_scoped_approvals(
    db: Any,
    user: Dict[str, Any],
    additional_filter: Optional[Dict[str, Any]] = None,
    limit: int = 100,
    skip: int = 0
) -> List[Dict[str, Any]]:
    scope_query = get_approvals_scope_query(user)
    if additional_filter:
        query = {"$and": [scope_query, additional_filter]} if scope_query else additional_filter
    else:
        query = scope_query

    cursor = db.approvals.find(query).sort([("created_at", -1)]).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    return serialize_docs(docs)


async def fetch_scoped_escalations(
    db: Any,
    user: Dict[str, Any],
    additional_filter: Optional[Dict[str, Any]] = None,
    limit: int = 100,
    skip: int = 0
) -> List[Dict[str, Any]]:
    scope_query = get_escalations_scope_query(user)
    if additional_filter:
        query = {"$and": [scope_query, additional_filter]} if scope_query else additional_filter
    else:
        query = scope_query

    cursor = db.escalations.find(query).sort([("created_at", -1)]).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    return serialize_docs(docs)
