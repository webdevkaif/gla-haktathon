from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from backend.app.database import get_db
from backend.app.models import Budget, serialize_doc
from backend.app.schemas import BudgetCreate, BudgetOut
from backend.app.services.analytics import get_monthly_summary

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])

@router.get("/current", response_model=BudgetOut)
async def get_current_budget(
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    b = await db.budgets.find_one({"user_id": user_id, "month": month})

    if not b:
        # Create default budget
        doc = Budget.create(
            user_id=user_id,
            month=month,
            total_budget=15000.0,
            category_limits={"Food": 4500.0, "Shopping": 3000.0, "Transportation": 2000.0, "Groceries": 3000.0}
        )
        res = await db.budgets.insert_one(doc)
        doc_id = str(res.inserted_id)
        await db.budgets.update_one({"_id": res.inserted_id}, {"$set": {"id": doc_id}})
        b = await db.budgets.find_one({"_id": res.inserted_id})

    summary = await get_monthly_summary(db, user_id, month)
    cat_limits = b.get("category_limits") or {}
    if isinstance(cat_limits, str):
        import json
        try:
            cat_limits = json.loads(cat_limits)
        except Exception:
            cat_limits = {}

    return BudgetOut(
        id=b.get("id", str(b.get("_id", ""))),
        user_id=b.get("user_id", user_id),
        month=b.get("month", month),
        total_budget=float(b.get("total_budget", 15000.0)),
        category_limits=cat_limits,
        total_spent=summary["total_spent"],
        remaining_budget=summary["remaining_budget"],
        percentage_used=summary["percentage_used"],
        days_left_in_month=summary["days_remaining"],
        daily_budget_remaining=summary["daily_budget_remaining"]
    )

@router.post("", response_model=BudgetOut)
async def set_or_update_budget(
    payload: BudgetCreate,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query = {"user_id": user_id, "month": payload.month}
    b = await db.budgets.find_one(query)

    cat_limits = payload.category_limits or {}

    if b:
        await db.budgets.update_one(
            query,
            {"$set": {"total_budget": payload.total_budget, "category_limits": cat_limits}}
        )
        b = await db.budgets.find_one(query)
    else:
        doc = Budget.create(
            user_id=user_id,
            month=payload.month,
            total_budget=payload.total_budget,
            category_limits=cat_limits
        )
        res = await db.budgets.insert_one(doc)
        doc_id = str(res.inserted_id)
        await db.budgets.update_one({"_id": res.inserted_id}, {"$set": {"id": doc_id}})
        b = await db.budgets.find_one({"_id": res.inserted_id})

    summary = await get_monthly_summary(db, user_id, payload.month)

    return BudgetOut(
        id=b.get("id", str(b.get("_id", ""))),
        user_id=b.get("user_id", user_id),
        month=b.get("month", payload.month),
        total_budget=float(b.get("total_budget", payload.total_budget)),
        category_limits=cat_limits,
        total_spent=summary["total_spent"],
        remaining_budget=summary["remaining_budget"],
        percentage_used=summary["percentage_used"],
        days_left_in_month=summary["days_remaining"],
        daily_budget_remaining=summary["daily_budget_remaining"]
    )
