from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from backend.app.database import get_db
from backend.app.models import serialize_docs, build_id_query
from backend.app.schemas import AlertOut, WhatIfRequest
from backend.app.services.analytics import get_monthly_summary
from backend.app.services.forecasting import forecast_monthly_spending
from backend.app.services.simulator import run_what_if_simulation
from backend.app.services.seed_data import seed_demo_data

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/monthly")
async def get_monthly_analytics(
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")
    return await get_monthly_summary(db, user_id, month)

@router.get("/forecast")
async def get_forecast(
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")
    return await forecast_monthly_spending(db, user_id, month)

@router.post("/what-if")
async def simulate_what_if(
    payload: WhatIfRequest,
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")
    return await run_what_if_simulation(
        db=db,
        user_id=user_id,
        month_str=month,
        category=payload.category,
        percent_reduction=payload.percent_reduction or 0.0,
        amount_reduction=payload.amount_reduction or 0.0,
        upcoming_purchase_amount=payload.upcoming_purchase_amount or 0.0,
        upcoming_purchase_category=payload.upcoming_purchase_category or "General"
    )

@router.get("/alerts", response_model=List[AlertOut])
async def list_alerts(
    unread_only: bool = Query(False),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query: dict = {"user_id": user_id}
    if unread_only:
        query["is_read"] = False
        
    cursor = db.alerts.find(query).sort("created_at", -1).limit(20)
    records = await cursor.to_list(length=20)
    return serialize_docs(records)

@router.post("/alerts/{alert_id}/read")
async def mark_alert_read(
    alert_id: str,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query = {"$and": [{"user_id": user_id}, build_id_query(alert_id)]}
    alert = await db.alerts.find_one(query)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    await db.alerts.update_one(query, {"$set": {"is_read": True}})
    return {"status": "success"}

@router.post("/seed-demo")
async def seed_data_endpoint(
    user_id: str = "user_default",
    db = Depends(get_db)
):
    count = await seed_demo_data(db, user_id)
    return {"status": "success", "expenses_seeded": count, "message": "Demo data populated with realistic expenses, budget, and goals in MongoDB Atlas!"}
