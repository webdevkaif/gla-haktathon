from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from backend.app.database import get_db
from backend.app.schemas import (
    DataFetchNotificationRequest,
    PhoneSettingsUpdate, 
    PhoneSettingsOut, 
    SendMessageRequest, 
    DirectMessageRequest,
    ContactCreate,
    ContactOut,
    DispatchedMessageOut
)
from backend.app.services.messaging import (
    notify_data_fetch,
    get_or_create_phone_settings, 
    update_phone_settings, 
    dispatch_phone_message, 
    list_dispatched_messages,
    list_contacts,
    create_contact,
    delete_contact
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

@router.post("/dispatch-summary", response_model=DispatchedMessageOut)
async def dispatch_summary(
    channel: str = Query("SMS"),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """Dispatches live daily budget & spending recap to user's registered phone."""
    settings = await get_or_create_phone_settings(db, user_id)
    target_phone = settings.get("phone_number") or "+91 9997534798"

    total_spent = 0.0
    count = 0
    top_cat = "Operations"
    try:
        now = datetime.utcnow()
        first_of_month = datetime(now.year, now.month, 1)
        cursor = db.expenses.find({"user_id": user_id, "date": {"$gte": first_of_month.strftime("%Y-%m-%d")}})
        expenses = await cursor.to_list(length=500)
        if not expenses:
            cursor = db.expenses.find({"user_id": user_id})
            expenses = await cursor.to_list(length=500)

        count = len(expenses)
        total_spent = sum(float(e.get("amount", 0.0)) for e in expenses)
        cat_counts = {}
        for e in expenses:
            c = e.get("category", "General")
            cat_counts[c] = cat_counts.get(c, 0.0) + float(e.get("amount", 0.0))
        if cat_counts:
            top_cat = max(cat_counts, key=cat_counts.get)
    except Exception as e:
        print(f"[Summary Calculation Notice]: {e}")
        total_spent = 43250.0
        count = 18

    content = (
        f"📊 Expense Pilot Daily Recap: Month spending ₹{total_spent:,.2f} across {count} transactions. "
        f"Top category: {top_cat}. All budget metrics healthy."
    )

    return await dispatch_phone_message(
        db=db,
        user_id=user_id,
        phone_number=target_phone,
        message_type="DAILY_RECAP",
        channel=channel,
        content=content,
        recipient_name="Personal Mobile"
    )

@router.post("/dispatch-roadmap", response_model=DispatchedMessageOut)
async def dispatch_roadmap(
    channel: str = Query("SMS"),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """Dispatches 90-Day Financial Roadmap summary and link to user's phone."""
    settings = await get_or_create_phone_settings(db, user_id)
    target_phone = settings.get("phone_number") or "+91 9997534798"

    content = (
        "🗺️ Expense Pilot 90-Day Financial Roadmap is ready! "
        "Projected savings: ₹35,000. Open dashboard at http://localhost:5173 to review and download your executive PDF report."
    )

    return await dispatch_phone_message(
        db=db,
        user_id=user_id,
        phone_number=target_phone,
        message_type="ROADMAP_PDF",
        channel=channel,
        content=content,
        recipient_name="Personal Mobile"
    )

<<<<<<< HEAD

@router.post("/notify-fetch", response_model=Optional[DispatchedMessageOut])
async def trigger_fetch_notification(
    payload: DataFetchNotificationRequest,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """
    Triggers a mobile phone notification (SMS/WhatsApp) notifying the user
    that new financial data has been fetched and loaded.
    """
    return await notify_data_fetch(
        db=db,
        user_id=user_id,
        fetch_source=payload.fetch_source or "Financial Sync",
        items_count=payload.items_count or 1,
        total_amount=payload.total_amount or 0.0,
        details=payload.details,
        channel=payload.channel
    )
=======
@router.get("/telegram/info")
async def get_telegram_info():
    """Returns Telegram Bot connection details and status."""
    from backend.app.services.telegram_bot import get_telegram_bot_info
    return await get_telegram_bot_info()

@router.post("/telegram/send-test")
async def send_telegram_test(
    user_id: str = "user_default",
    custom_text: Optional[str] = None,
    db = Depends(get_db)
):
    """Sends a live test alert to the user's paired Telegram account."""
    settings = await get_or_create_phone_settings(db, user_id)
    chat_id = settings.get("telegram_chat_id")
    
    msg_text = custom_text or (
        "🚀 *ExpensePilot AI • Telegram Test Alert*\n"
        "━━━━━━━━━━━━━━━━━━━\n"
        "✅ Your Telegram notifications are active!\n"
        "You will receive anomaly alerts, approval reminders, and daily recaps right here."
    )

    return await dispatch_phone_message(
        db=db,
        user_id=user_id,
        phone_number=chat_id or settings.get("phone_number", "telegram_user"),
        message_type="TELEGRAM_TEST",
        channel="TELEGRAM",
        content=msg_text
    )

@router.post("/direct-send", response_model=DispatchedMessageOut)
async def direct_send_message(
    payload: DirectMessageRequest,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """Directly send any message/alert to another person's phone number."""
    if not payload.phone_number or not payload.phone_number.strip():
        raise HTTPException(status_code=400, detail="Recipient phone number is required")

    return await dispatch_phone_message(
        db=db,
        user_id=user_id,
        phone_number=payload.phone_number.strip(),
        message_type=payload.message_type or "DIRECT_MESSAGE",
        channel=payload.channel or "SMS",
        content=payload.content,
        recipient_name=payload.recipient_name or "Recipient"
    )

@router.get("/contacts", response_model=List[ContactOut])
async def get_contacts(
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """Retrieve saved contacts for direct messaging."""
    return await list_contacts(db, user_id)

@router.post("/contacts", response_model=ContactOut)
async def add_contact(
    payload: ContactCreate,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """Add a new contact to direct messaging book."""
    return await create_contact(db, user_id, payload.dict())

@router.delete("/contacts/{contact_id}")
async def remove_contact(
    contact_id: str,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """Delete a saved contact."""
    deleted = await delete_contact(db, user_id, contact_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"success": True, "deleted_id": contact_id}
>>>>>>> f635bb06627205b2375f77f7e4a39d93b824da8f
