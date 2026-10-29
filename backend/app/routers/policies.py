from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from backend.app.database import get_db
from backend.app.auth import get_current_user
from backend.app.schemas import PolicyOut
from backend.app.models import serialize_docs, serialize_doc

router = APIRouter(prefix="/api/policies", tags=["Corporate Policies"])

@router.get("", response_model=List[PolicyOut])
async def list_policies(
    category: Optional[str] = Query(None, description="Filter: Meals, Travel, Hotel, etc."),
    q: Optional[str] = Query(None, description="Search keyword"),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Returns chunked policy sections from Meridian Expense & Procurement Policy 2026.
    """
    query = {}
    if category:
        query["category"] = category
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"text": {"$regex": q, "$options": "i"}},
            {"section_id": {"$regex": q, "$options": "i"}}
        ]

    docs = await db.policies.find(query).sort([("section_id", 1)]).to_list(100)
    if not docs:
        from backend.app.services.seed_data import SAMPLE_POLICIES
        return [serialize_doc(p) for p in SAMPLE_POLICIES]

    return serialize_docs(docs)


@router.get("/{section_id}", response_model=PolicyOut)
async def get_policy_section(
    section_id: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Returns specific policy section by its section ID (e.g. SEC-104).
    """
    clean_sec = section_id.strip().upper()
    doc = await db.policies.find_one({"$or": [{"section_id": clean_sec}, {"id": clean_sec}]})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Policy section '{section_id}' not found.")
    return serialize_doc(doc)
