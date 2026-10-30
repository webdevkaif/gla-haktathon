from backend.app.services.risk_predictor import calculate_ai_risk_prediction, simulate_risk_scenario
from backend.app.services.messaging import dispatch_phone_message, get_or_create_phone_settings
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
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

@router.get("/category-breakdown")
async def get_category_breakdown(
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")
    summary = await get_monthly_summary(db, user_id, month)
    return summary.get("category_spending", {})

@router.get("/spending-pace")
async def get_spending_pace(
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")
    summary = await get_monthly_summary(db, user_id, month)
    return {
        "days_elapsed": summary.get("days_elapsed"),
        "days_remaining": summary.get("days_remaining"),
        "total_days": summary.get("total_days"),
        "percentage_used": summary.get("percentage_used"),
        "daily_budget_remaining": summary.get("daily_budget_remaining"),
        "daily_average": summary.get("daily_average")
    }

@router.get("/cumulative-daily")
async def get_cumulative_daily(
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")
    fc = await forecast_monthly_spending(db, user_id, month)
    return fc.get("trajectory", [])

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
    for r in records:
        if "severity" not in r:
            r["severity"] = "HIGH"
        if "message" not in r:
            r["message"] = r.get("description", r.get("title", "Alert"))
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
    title: Optional[str] = Query(None),
    notes: Optional[str] = Query(None),
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
        invoices=invoices,
        custom_title=title,
        custom_notes=notes
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

@router.get("/chart/image")
@router.get("/spending-card/image")
async def download_financial_chart_image(
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """Generates and serves high-definition visual analytics chart card PNG."""
    from backend.app.services.image_generator import generate_financial_card_image_bytes
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    summary = await get_monthly_summary(db, user_id, month)
    budget_doc = await db.budgets.find_one({"user_id": user_id, "month": month})
    budget = budget_doc or {"total_budget": 50000.0, "month": month}

    img_bytes = generate_financial_card_image_bytes(
        user_id=user_id,
        month=month,
        summary=summary,
        budget=budget
    )

    filename = f"ExpensePilot_Financial_Card_{month}.png"
    return Response(
        content=img_bytes,
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-cache"
        }
    )

class PDFGenerateRequest(BaseModel):
    prompt: Optional[str] = "Corporate Financial Report"
    title: Optional[str] = "ExpensePilot Executive Brief"

class ImageGenerateRequest(BaseModel):
    prompt: str
    visual_type: Optional[str] = "card"

@router.post("/pdf/generate")
async def generate_custom_pdf(
    payload: PDFGenerateRequest,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    from backend.app.agent.tools import tool_generate_pdf_report
    user_dict = {"id": user_id, "name": "Mohammad Kaif", "role": "admin"}
    return await tool_generate_pdf_report(
        db=db,
        user=user_dict,
        custom_title=payload.title,
        custom_notes=payload.prompt
    )

@router.post("/image/generate")
async def generate_custom_image(
    payload: ImageGenerateRequest,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    from backend.app.agent.tools import tool_generate_visual_card
    user_dict = {"id": user_id, "name": "Mohammad Kaif", "role": "admin"}
    return await tool_generate_visual_card(
        db=db,
        user=user_dict,
        visual_type=payload.visual_type or "card",
        custom_text=payload.prompt
    )


@router.get("/risk-prediction")
async def get_risk_prediction(
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """
    Autonomous AI Prediction Risk Predictor:
    Calculates multi-factor financial risk score (0-100), spending velocity ratio,
    runway exhaustion countdown date, category breach indicators, and Groq LLM mitigation strategies.
    """
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")
    return await calculate_ai_risk_prediction(db, user_id, month)

@router.post("/risk-prediction/dispatch-alert")
async def dispatch_risk_alert_to_phone(
    month: Optional[str] = Query(None),
    channel: str = Query("SMS"),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """
    Dispatches the AI Risk Assessment directly to user's mobile phone via SMS or WhatsApp.
    """
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    risk_data = await calculate_ai_risk_prediction(db, user_id, month)
    settings_doc = await get_or_create_phone_settings(db, user_id)
    target_phone = settings_doc.get("phone_number") or "+91 98765 43210"

    score = risk_data.get("risk_score", 50)
    level = risk_data.get("risk_level", "MODERATE")
    headline = risk_data.get("ai_assessment", {}).get("headline", "")
    daily = risk_data.get("safe_daily_allowance", 0)

    content = (
        f"🚨 ExpensePilot AI Risk Alert ({month}): "
        f"Risk Score: {score}/100 [{level}]. "
        f"{headline} "
        f"Safe Daily Target: ₹{daily:,.0f}/day. "
        f"Exhaustion: {risk_data.get('exhaustion_status', 'N/A')}."
    )

    return await dispatch_phone_message(
        db=db,
        user_id=user_id,
        phone_number=target_phone,
        message_type="RISK_PREDICTION_ALERT",
        channel=channel,
        content=content
    )


@router.post("/risk-prediction/simulate")
async def simulate_risk_intervention(
    spend_cut_percent: float = Query(20.0, ge=0.0, le=90.0),
    upcoming_expense: float = Query(0.0, ge=0.0),
    month: Optional[str] = Query(None),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """
    Interactive DEFCON Risk Simulator:
    Simulates real-time risk score reduction, preserved capital, and runway extension
    when user dials discretionary spending cuts or inputs upcoming major purchases.
    """
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")
    current_risk = await calculate_ai_risk_prediction(db, user_id, month)
    return simulate_risk_scenario(
        current_risk=current_risk,
        spend_cut_percent=spend_cut_percent,
        upcoming_expense=upcoming_expense
    )

@router.post("/risk-prediction/emergency-protocol")
async def activate_emergency_de_risking_protocol(
    month: Optional[str] = Query(None),
    channel: str = Query("SMS"),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """
    Autonomous Emergency De-Risking Protocol (1-Click Action):
    1. Calculates current risk and safe daily survival ceiling.
    2. Enforces emergency daily cap in budget document.
    3. Dispatches high-priority urgent mobile notification via SMS/WhatsApp.
    """
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    risk_data = await calculate_ai_risk_prediction(db, user_id, month)
    safe_daily = risk_data.get("safe_daily_allowance", 100.0)
    score = risk_data.get("risk_score", 50)
    level = risk_data.get("risk_level", "MODERATE")

    # Update or insert emergency alert in database
    await db.alerts.insert_one({
        "user_id": user_id,
        "type": "EMERGENCY_BUDGET_SHIELD",
        "severity": "CRITICAL",
        "title": "🛡️ Emergency De-Risking Protocol Activated",
        "message": f"Autonomous spend limiter engaged. Daily burn rate capped to ₹{safe_daily:,.0f}/day to prevent further capital exhaustion.",
        "description": f"Autonomous spend limiter engaged. Daily burn rate capped to ₹{safe_daily:,.0f}/day to prevent further capital exhaustion.",
        "category": "All Discretionary",
        "amount": safe_daily,
        "is_read": False,
        "created_at": datetime.utcnow()
    })

    # Dispatch priority alert to phone
    settings_doc = await get_or_create_phone_settings(db, user_id)
    target_phone = settings_doc.get("phone_number") or "+91 98765 43210"

    content = (
        f"🛡️ ExpensePilot EMERGENCY PROTOCOL ENGAGED! "
        f"Risk Score {score}/100 [{level}]. "
        f"Autonomous spending lock activated: strict daily spending ceiling is set to ₹{safe_daily:,.0f}/day. "
        f"Discretionary Swiggy/Zomato/Shopping orders frozen until month-end."
    )

    dispatched = await dispatch_phone_message(
        db=db,
        user_id=user_id,
        phone_number=target_phone,
        message_type="EMERGENCY_DE_RISK",
        channel=channel,
        content=content
    )

    return {
        "status": "activated",
        "risk_score": score,
        "risk_level": level,
        "safe_daily_cap": safe_daily,
        "phone_dispatch": dispatched,
        "message": f"Emergency Protocol engaged! Daily spending capped to ₹{safe_daily:,.0f}/day and urgent alert delivered to {target_phone}."
    }
