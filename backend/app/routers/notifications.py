from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from backend.app.database import get_db
from backend.app.schemas import (
    PhoneSettingsUpdate, 
    PhoneSettingsOut, 
    SendMessageRequest, 
    DispatchedMessageOut
)
from backend.app.services.messaging import (
    get_or_create_phone_settings, 
    update_phone_settings, 
    dispatch_phone_message, 
    list_dispatched_messages
)
from backend.app.services.analytics import get_monthly_summary

router = APIRouter(prefix="/api/notifications", tags=["Phone Notifications & Messaging"])

@router.get("/settings", response_model=PhoneSettingsOut)
async def get_settings(
    user_id: str = "user_default",
    db = Depends(get_db)
):
    return await get_or_create_phone_settings(db, user_id)

@router.post("/settings", response_model=PhoneSettingsOut)
async def save_settings(
    payload: PhoneSettingsUpdate,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    settings = await update_phone_settings(db, user_id, payload.dict())
    
    # Auto-dispatch a confirmation greeting SMS to verify phone connection
    confirm_text = (
        f"🚀 ExpensePilot AI Connected! Your phone ({payload.phone_number}) is successfully paired with your autonomous financial copilot. "
        "You will receive daily budget allowances, invoice audits, and anomaly alerts."
    )
    await dispatch_phone_message(
        db=db,
        user_id=user_id,
        phone_number=payload.phone_number,
        message_type="PHONE_CONNECTED",
        channel="SMS",
        content=confirm_text
    )
    return settings

@router.get("/history", response_model=List[DispatchedMessageOut])
async def get_history(
    user_id: str = "user_default",
    limit: int = Query(50),
    db = Depends(get_db)
):
    return await list_dispatched_messages(db, user_id, limit)

@router.post("/send-test", response_model=DispatchedMessageOut)
async def send_test_message(
    payload: SendMessageRequest,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    settings = await get_or_create_phone_settings(db, user_id)
    target_phone = payload.phone_number or settings.get("phone_number") or "+91 98765 43210"
    channel = payload.channel or "SMS"
    
    content = payload.custom_text or (
        f"⚡ ExpensePilot AI Live Test: Phone link established for {target_phone}. "
        "Current balance safe daily allowance: ₹185/day. All systems autonomous."
    )

    return await dispatch_phone_message(
        db=db,
        user_id=user_id,
        phone_number=target_phone,
        message_type="TEST_ALERT",
        channel=channel,
        content=content
    )

@router.post("/dispatch-summary", response_model=DispatchedMessageOut)
async def dispatch_daily_summary(
    month: Optional[str] = Query(None),
    channel: str = Query("SMS"),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    summary = await get_monthly_summary(db, user_id, month)
    budget_doc = await db.budgets.find_one({"user_id": user_id, "month": month})
    total_budget = budget_doc.get("total_budget", 18000.0) if budget_doc else 18000.0
    settings = await get_or_create_phone_settings(db, user_id)
    target_phone = settings.get("phone_number") or "+91 98765 43210"

    content = (
        f"📊 ExpensePilot Daily Financial Recap ({month}): "
        f"Total Spent: ₹{summary.get('total_spent', 0):,.0f} of ₹{total_budget:,.0f} ({summary.get('percentage_used', 0):.1f}%). "
        f"Safe Allowance: ₹{summary.get('daily_budget_remaining', 0):,.0f}/day for {summary.get('days_remaining', 4)} remaining days. "
        f"Top Expense Driver: {summary.get('top_category', 'Food')} (₹{summary.get('top_category_amount', 0):,.0f})."
    )

    return await dispatch_phone_message(
        db=db,
        user_id=user_id,
        phone_number=target_phone,
        message_type="DAILY_SUMMARY",
        channel=channel,
        content=content
    )

@router.post("/dispatch-roadmap", response_model=DispatchedMessageOut)
async def dispatch_roadmap_link(
    month: Optional[str] = Query(None),
    channel: str = Query("SMS"),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    settings = await get_or_create_phone_settings(db, user_id)
    target_phone = settings.get("phone_number") or "+91 98765 43210"
    pdf_link = f"http://localhost:8000/api/analytics/roadmap/pdf?month={month}&user_id={user_id}"

    content = (
        f"🗺️ ExpensePilot AI: Your 90-Day Financial Optimization Roadmap is generated! "
        f"Health Score: 74/100. Target Preserved Capital: +₹15,000. "
        f"Download your official PDF report here: {pdf_link}"
    )

    return await dispatch_phone_message(
        db=db,
        user_id=user_id,
        phone_number=target_phone,
        message_type="ROADMAP_LINK",
        channel=channel,
        content=content
    )
