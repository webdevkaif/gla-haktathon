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
        f"🚀 Expense Pilot Connected! Your phone ({payload.phone_number}) is successfully paired with your corporate copilot. "
        "You will receive approval reminders and escalation alerts."
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
        f"⚡ Expense Pilot Live Test: Phone link established for {target_phone}. "
        "Approval and audit notifications active."
    )

    return await dispatch_phone_message(
        db=db,
        user_id=user_id,
        phone_number=target_phone,
        message_type="TEST_ALERT",
        channel=channel,
        content=content
    )
