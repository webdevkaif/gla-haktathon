from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.database import get_db
from backend.app.models import serialize_doc, serialize_docs, build_id_query
from backend.app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseOut
from backend.app.agent.tools import tool_add_expense
from backend.app.services.anomaly import audit_and_generate_alerts

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])

@router.get("", response_model=List[ExpenseOut])
async def list_expenses(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format"),
    category: Optional[str] = Query(None),
    is_unusual: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query: dict = {"user_id": user_id}
    if month:
        start_date = f"{month}-01"
        end_date = f"{month}-31"
        query["date"] = {"$gte": start_date, "$lte": end_date}
    if category and category.lower() != "all":
        query["category"] = category
    if is_unusual is not None:
        query["is_unusual"] = is_unusual
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}}
        ]

    cursor = db.expenses.find(query).sort([("date", -1), ("_id", -1)]).limit(limit)
    docs = await cursor.to_list(length=limit)
    return serialize_docs(docs)

@router.post("", response_model=ExpenseOut)
async def create_expense(
    payload: ExpenseCreate,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    res = await tool_add_expense(
        db=db,
        user_id=user_id,
        amount=payload.amount,
        category=payload.category,
        description=payload.description,
        date_str=payload.date,
        payment_method=payload.payment_method
    )
    query = {"$and": [{"user_id": user_id}, build_id_query(res["id"])]}
    obj = await db.expenses.find_one(query)
    return serialize_doc(obj)

@router.put("/{expense_id}", response_model=ExpenseOut)
async def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query = {"$and": [{"user_id": user_id}, build_id_query(expense_id)]}
    exp = await db.expenses.find_one(query)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_fields = {}
    if payload.amount is not None:
        update_fields["amount"] = payload.amount
    if payload.category is not None:
        update_fields["category"] = payload.category
    if payload.description is not None:
        update_fields["description"] = payload.description
    if payload.date is not None:
        update_fields["date"] = payload.date
    if payload.payment_method is not None:
        update_fields["payment_method"] = payload.payment_method
    if payload.is_unusual is not None:
        update_fields["is_unusual"] = payload.is_unusual
    if payload.anomaly_reason is not None:
        update_fields["anomaly_reason"] = payload.anomaly_reason

    if update_fields:
        await db.expenses.update_one(query, {"$set": update_fields})
    
    updated_exp = await db.expenses.find_one(query)
    
    # Re-audit
    if updated_exp and "date" in updated_exp:
        await audit_and_generate_alerts(db, user_id, updated_exp["date"][:7])
        
    return serialize_doc(updated_exp)

@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query = {"$and": [{"user_id": user_id}, build_id_query(expense_id)]}
    exp = await db.expenses.find_one(query)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    month_str = exp.get("date", "")[:7]
    await db.expenses.delete_one(query)

    # Re-audit
    if month_str:
        await audit_and_generate_alerts(db, user_id, month_str)
        
    return {"status": "success", "message": "Expense deleted"}

@router.post("/confirm-unusual/{expense_id}")
async def confirm_unusual(
    expense_id: str,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query = {"$and": [{"user_id": user_id}, build_id_query(expense_id)]}
    exp = await db.expenses.find_one(query)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    await db.expenses.update_one(
        query,
        {"$set": {"is_unusual": False, "anomaly_reason": "Verified & confirmed by user"}}
    )
    return {"status": "success", "message": "Expense confirmed"}
