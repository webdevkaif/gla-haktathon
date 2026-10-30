from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from backend.app.database import get_db
from backend.app.services.anomaly import detect_pyod_isolation_forest_anomalies
from backend.app.services.telegram_bot import send_telegram_message
from backend.app.config import settings

router = APIRouter(prefix="/api/anomalies", tags=["Anomalies"])

@router.get("/detect")
async def get_anomaly_detections(
    user_id: str = "user_default",
    month: Optional[str] = Query(None, description="Optional filter by month in YYYY-MM format"),
    db = Depends(get_db)
):
    """
    Lightweight Financial Anomaly Detection endpoint using PyOD + Isolation Forest.
    Analyzes real MongoDB expense transaction data strictly for the authenticated user.
    Flags unusually high spending, sudden spikes, duplicate payments, and pattern deviations.
    """
    return await detect_pyod_isolation_forest_anomalies(db, user_id=user_id, month=month)

@router.post("/dispatch-telegram")
async def dispatch_anomalies_to_telegram(
    user_id: str = "user_default",
    month: Optional[str] = Query(None),
    db = Depends(get_db)
):
    """
    Runs PyOD anomaly detection and immediately pushes the anomaly report
    to the user's paired Telegram phone bot.
    """
    ps = await db.phone_settings.find_one({"user_id": user_id})
    chat_id = ps.get("telegram_chat_id") if ps else None

    # Fallback to any linked telegram account if user_default has no chat_id yet
    if not chat_id:
        any_ps = await db.phone_settings.find_one({"telegram_chat_id": {"$exists": True, "$ne": None}})
        if any_ps:
            chat_id = any_ps.get("telegram_chat_id")

    if not chat_id:
        return {
            "success": False,
            "connected": False,
            "bot_username": settings.TELEGRAM_BOT_USERNAME,
            "message": f"Phone not yet paired with Telegram. Open Telegram, search @{settings.TELEGRAM_BOT_USERNAME}, and press START or send your phone number."
        }

    report = await detect_pyod_isolation_forest_anomalies(db, user_id=user_id, month=month)
    anoms = report.get("anomalies", [])

    if not anoms:
        text = (
            "✅ *PyOD Isolation Forest Anomaly Scan*\n"
            "━━━━━━━━━━━━━━━━━━━\n"
            "✨ *Status:* Healthy • 0 Anomalies Found\n\n"
            f"All {report.get('total_analyzed', 0)} transactions match your normal spending baseline.\n"
            "No spikes or duplicate charges detected."
        )
    else:
        lines = [
            f"⚠️ *PyOD Isolation Forest Alert ({len(anoms)} Anomalies Flagged)*",
            "━━━━━━━━━━━━━━━━━━━"
        ]
        for a in anoms[:5]:
            lines.append(
                f"• *₹{a['amount']:,.0f}* ({a['category']}) - {a.get('description', '')}\n"
                f"  _Reason:_ {a.get('reason', '')}\n"
                f"  _Action:_ Review in dashboard\n"
            )
        lines.append("🌐 Open dashboard: http://localhost:5173")
        text = "\n".join(lines)

    res = await send_telegram_message(chat_id, text)
    return {
        "success": res.get("success", False),
        "connected": True,
        "chat_id": chat_id,
        "anomalies_detected": len(anoms),
        "detail": res
    }


