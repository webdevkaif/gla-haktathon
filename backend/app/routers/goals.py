from typing import List
from fastapi import APIRouter, Depends, HTTPException
from backend.app.database import get_db
from backend.app.models import serialize_doc, serialize_docs, build_id_query
from backend.app.schemas import SavingGoalCreate, SavingGoalOut
from backend.app.agent.tools import tool_create_saving_plan

router = APIRouter(prefix="/api/goals", tags=["Saving Goals"])

@router.get("", response_model=List[SavingGoalOut])
async def list_goals(
    user_id: str = "user_default",
    db = Depends(get_db)
):
    cursor = db.saving_goals.find({"user_id": user_id}).sort("created_at", -1)
    goals = await cursor.to_list(length=100)
    return serialize_docs(goals)

@router.post("", response_model=SavingGoalOut)
async def create_goal(
    payload: SavingGoalCreate,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    plan = await tool_create_saving_plan(
        db=db,
        user_id=user_id,
        target_amount=payload.target_amount,
        months=payload.target_months,
        title=payload.title
    )
    query = {"$and": [{"user_id": user_id}, build_id_query(plan["goal_id"])]}
    obj = await db.saving_goals.find_one(query)
    return serialize_doc(obj)

@router.put("/{goal_id}/add-funds")
async def add_funds(
    goal_id: str,
    amount: float,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query = {"$and": [{"user_id": user_id}, build_id_query(goal_id)]}
    g = await db.saving_goals.find_one(query)
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")

    target = float(g.get("target_amount", 0.0))
    current = float(g.get("current_saved", 0.0))
    new_saved = min(target, current + amount)

    await db.saving_goals.update_one(query, {"$set": {"current_saved": new_saved}})
    return {"status": "success", "current_saved": new_saved}

@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query = {"$and": [{"user_id": user_id}, build_id_query(goal_id)]}
    g = await db.saving_goals.find_one(query)
    if not g:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    await db.saving_goals.delete_one(query)
    return {"status": "success", "message": "Goal removed"}
