from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from backend.app.database import get_db
from backend.app.models import serialize_docs, build_id_query
from backend.app.schemas import AlertOut, WhatIfRequest, FinancialRoadmapOut, RoadmapPhase
from backend.app.services.analytics import get_monthly_summary
from backend.app.services.forecasting import forecast_monthly_spending
from backend.app.services.simulator import run_what_if_simulation
from backend.app.services.seed_data import seed_demo_data
from backend.app.services.pdf_generator import generate_roadmap_pdf_bytes

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

@router.get("/roadmap", response_model=FinancialRoadmapOut)
async def get_financial_roadmap(
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")
        
    summary = await get_monthly_summary(db, user_id, month)
    budget_doc = await db.budgets.find_one({"user_id": user_id, "month": month})
    budget = budget_doc or {"total_budget": 18000.0, "month": month}
    
    total_spent = summary.get("total_spent", 0.0)
    total_budget = budget.get("total_budget", 18000.0)
    ratio = total_spent / total_budget if total_budget > 0 else 0.8
    health_score = max(15, min(95, int(100 - (ratio - 0.7) * 80))) if ratio > 0.7 else 92

    phases = [
        RoadmapPhase(
            phase=1,
            title="Immediate Runway Defense",
            timeline="Days 1 – 30",
            focus="Stabilize burn-rate & enforce daily allowances",
            monthly_savings_target=3200.0,
            action_items=[
                "Cap daily discretionary spending at ₹150/day across food delivery & impulse buys",
                "Apply 48-hour cool-off rule before any purchase exceeding ₹1,000",
                "Audit recurring subscriptions and cancel inactive services"
            ],
            status="In Progress"
        ),
        RoadmapPhase(
            phase=2,
            title="Run-Rate Realignment & Category Envelopes",
            timeline="Days 31 – 60",
            focus="Establish strict category boundaries & negotiate utility plans",
            monthly_savings_target=5000.0,
            action_items=[
                "Enforce category caps: Food ₹4,500/mo, Groceries ₹3,000/mo, Shopping ₹2,000/mo",
                "Shift shopping to scheduled discount windows",
                "Deposit first ₹5,000 into High-Yield Emergency Safety Reserve"
            ],
            status="Planned"
        ),
        RoadmapPhase(
            phase=3,
            title="Autonomous Wealth Acceleration",
            timeline="Days 61 – 90",
            focus="Goal automation, high-yield reserve & zero overdraft rate",
            monthly_savings_target=6800.0,
            action_items=[
                "Fund 50% milestone of Primary Savings Goal (₹15,000 achieved)",
                "Lock in monthly spending velocity below 85% of incoming earnings",
                "Set automated sweep of surplus capital at month-end"
            ],
            status="Planned"
        )
    ]

    return FinancialRoadmapOut(
        month=month,
        generated_at=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        health_score=health_score,
        current_burn_rate=total_spent,
        monthly_budget=total_budget,
        projected_savings_90_days=15000.0,
        phases=phases,
        key_recommendations=[
            f"Primary spending driver is {summary.get('top_category', 'Food')} (₹{summary.get('top_category_amount', 0):,.0f}).",
            "Trimming discretionary weekend velocity frees ₹3,200/month immediately.",
            "Full 90-day plan yields ₹15,000 in preserved capital."
        ],
        download_url=f"/api/analytics/roadmap/pdf?month={month}&user_id={user_id}"
    )

@router.get("/roadmap/pdf")
async def download_financial_roadmap_pdf(
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    summary = await get_monthly_summary(db, user_id, month)
    budget_doc = await db.budgets.find_one({"user_id": user_id, "month": month})
    budget = budget_doc or {"total_budget": 18000.0, "month": month}
    
    # Fetch recent invoices if available
    cursor = db.invoices.find({"user_id": user_id}).sort("date", -1).limit(5)
    invoices = await cursor.to_list(length=5)

    pdf_bytes = generate_roadmap_pdf_bytes(
        user_id=user_id,
        month=month,
        summary=summary,
        budget=budget,
        invoices=invoices
    )

    filename = f"ExpensePilot_Financial_Roadmap_{month}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )

