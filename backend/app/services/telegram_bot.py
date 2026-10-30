import asyncio
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
import httpx
from backend.app.config import settings

async def get_telegram_bot_info() -> Dict[str, Any]:
    """Retrieves live bot profile info from Telegram API."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        return {
            "configured": False,
            "username": settings.TELEGRAM_BOT_USERNAME,
            "bot_name": "Expense Pilot AI",
            "bot_url": f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}"
        }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            if resp.status_code == 200:
                data = resp.json()
                result = data.get("result", {})
                return {
                    "configured": True,
                    "id": result.get("id"),
                    "username": result.get("username", settings.TELEGRAM_BOT_USERNAME),
                    "bot_name": result.get("first_name", "Expense Pilot AI"),
                    "bot_url": f"https://t.me/{result.get('username', settings.TELEGRAM_BOT_USERNAME)}"
                }
    except Exception as e:
        print(f"[Telegram Bot Notice]: {e}")

    return {
        "configured": bool(token),
        "username": settings.TELEGRAM_BOT_USERNAME,
        "bot_name": "Expense Pilot AI",
        "bot_url": f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}"
    }

async def fetch_latest_telegram_chat_id() -> Optional[Dict[str, Any]]:
    """Fetches the latest incoming chat ID from recent Telegram updates to auto-pair devices."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        return None
    try:
        url = f"https://api.telegram.org/bot{token}/getUpdates"
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params={"offset": -5})
            if resp.status_code == 200:
                updates = resp.json().get("result", [])
                for up in reversed(updates):
                    msg = up.get("message") or up.get("channel_post")
                    if msg and "chat" in msg:
                        return {
                            "chat_id": str(msg["chat"]["id"]),
                            "sender_name": msg.get("from", {}).get("first_name", "User"),
                            "username": msg.get("from", {}).get("username")
                        }
    except Exception as e:
        print(f"[Fetch Telegram Chat ID Notice]: {e}")
    return None

async def send_telegram_message(chat_id: Any, text: str, parse_mode: Optional[str] = "Markdown") -> Dict[str, Any]:
    """Sends a message to a Telegram chat or user with auto-fallback for markdown parsing errors."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token or not chat_id:
        return {"success": False, "error": "Missing token or chat_id"}

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": str(chat_id),
        "text": text
    }
    if parse_mode:
        payload["parse_mode"] = parse_mode

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                return {"success": True, "data": resp.json()}

            # If Markdown parsing fails due to unescaped characters, automatically retry as clean plain text
            if parse_mode and (resp.status_code == 400 or "parse" in resp.text.lower()):
                payload.pop("parse_mode", None)
                retry_resp = await client.post(url, json=payload)
                if retry_resp.status_code == 200:
                    return {"success": True, "data": retry_resp.json()}
                return {"success": False, "error": retry_resp.text, "status_code": retry_resp.status_code}

            return {"success": False, "error": resp.text, "status_code": resp.status_code}
    except Exception as e:
        return {"success": False, "error": str(e)}

async def handle_telegram_command(db: Any, chat_id: Any, text: str, sender_name: str) -> None:
    """Processes incoming Telegram bot commands and natural language expenses."""
    text_clean = text.strip()
    user_id = "user_default"

    # Try to find user associated with this telegram_chat_id
    if db is not None:
        try:
            link = await db.phone_settings.find_one({"telegram_chat_id": str(chat_id)})
            if link and "user_id" in link:
                user_id = link["user_id"]
        except Exception:
            pass

    # 1. Command: /start [optional_user_id]
    if text_clean.startswith("/start"):
        parts = text_clean.split()
        if len(parts) > 1 and parts[1].strip():
            user_id = parts[1].strip()

        # Link chat_id to user in MongoDB
        if db is not None:
            try:
                await db.phone_settings.update_one(
                    {"user_id": user_id},
                    {
                        "$set": {
                            "telegram_chat_id": str(chat_id),
                            "channel_telegram": True,
                            "alert_anomaly": True,
                            "telegram_linked_at": datetime.utcnow()
                        }
                    },
                    upsert=True
                )
            except Exception as e:
                print(f"[Telegram Link Error]: {e}")

        greeting = (
            f"👋 *Hello {sender_name}! Welcome to ExpensePilot AI.*\n\n"
            f"✅ *Phone & Project Connected!* Your Telegram (Chat ID `{chat_id}`) is paired with ExpensePilot AI.\n\n"
            "🚨 *Autonomous Protection is ACTIVE:*\n"
            "Whenever our PyOD Isolation Forest engine detects an unusual transaction, budget breach, or anomaly, an instant alert will be sent right here to your phone.\n\n"
            "Here is what you can do right now:\n"
            "⚠️ `/anomalies` — Run AI financial anomaly detector\n"
            "📊 `/summary` or `/balance` — Check monthly budget pace\n"
            "🧾 `/recent` — View last 5 transactions\n\n"
            "💡 *Log Expenses Instantly:*\n"
            "Simply send me a message like:\n"
            "• `Spent ₹450 on lunch with team`\n"
            "• `Uber to office ₹280`\n"
            "• `₹1,200 groceries at supermarket`"
        )
        await send_telegram_message(chat_id, greeting)
        return

    # 1B. Phone Number Pairing (e.g. user sends '9997534798' or '+91 9997534798')
    digits_only = re.sub(r"[^\d]", "", text_clean)
    if (len(digits_only) == 10 or (len(digits_only) == 12 and digits_only.startswith("91"))) and not any(kw in text_clean.lower() for kw in ["spent", "paid", "bought", "₹", "rs"]):
        ten_digit = digits_only[-10:]
        if db is not None:
            try:
                matched = await db.phone_settings.find_one({"phone_number": {"$regex": ten_digit}})
                target_uid = matched.get("user_id", "user_default") if matched else "user_default"
                await db.phone_settings.update_one(
                    {"user_id": target_uid},
                    {
                        "$set": {
                            "telegram_chat_id": str(chat_id),
                            "phone_number": f"+91 {ten_digit}",
                            "channel_telegram": True,
                            "alert_anomaly": True,
                            "telegram_linked_at": datetime.utcnow()
                        }
                    },
                    upsert=True
                )
            except Exception as e:
                print(f"[Telegram Phone Link Error]: {e}")

        reply = (
            f"📱 *Phone Number Paired!* (`+91 {ten_digit}`)\n\n"
            f"✅ Your mobile phone (Chat ID `{chat_id}`) is now successfully linked to ExpensePilot AI!\n\n"
            "🛡️ *What this enables:*\n"
            "• Instant lock-screen push notification when any financial anomaly is detected.\n"
            "• Over-budget & accelerated spending warnings.\n"
            "• Real-time expense tracking directly from Telegram."
        )
        await send_telegram_message(chat_id, reply)
        return

    # 2. Command: /summary or /balance
    if text_clean.startswith(("/summary", "/balance")):
        if db is not None:
            from backend.app.services.analytics import get_monthly_summary
            month = datetime.utcnow().strftime("%Y-%m")
            summary = await get_monthly_summary(db, user_id, month)
            spent = summary.get("total_spent", 0.0)
            budget = summary.get("total_budget", 0.0)
            pct = summary.get("percentage_used", 0.0)
            rem = summary.get("remaining_budget", 0.0)
            top_cat = summary.get("top_category", "N/A")
            top_amt = summary.get("top_category_amount", 0.0)

            reply = (
                f"📊 *ExpensePilot Financial Summary ({month})*\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"💰 *Total Spent:* ₹{spent:,.2f}\n"
                f"🎯 *Monthly Budget:* ₹{budget:,.2f}\n"
                f"📈 *Budget Consumed:* {pct}%\n"
                f"💵 *Remaining:* ₹{rem:,.2f}\n"
                f"🏷️ *Top Category:* {top_cat} (₹{top_amt:,.2f})\n\n"
                f"🌐 View interactive charts: http://localhost:5173"
            )
            await send_telegram_message(chat_id, reply)
        return

    # 3. Command: /anomalies
    if text_clean.startswith("/anomalies"):
        if db is not None:
            from backend.app.services.anomaly import detect_pyod_isolation_forest_anomalies
            month = datetime.utcnow().strftime("%Y-%m")
            rep = await detect_pyod_isolation_forest_anomalies(db, user_id=user_id, month=month)
            anoms = rep.get("anomalies", [])
            
            if not anoms:
                reply = "✅ *No Anomalies Detected!* All your transactions align with expected statistical baselines."
            else:
                lines = [f"⚠️ *PyOD Isolation Forest Anomaly Scan ({len(anoms)} Flagged)*\n━━━━━━━━━━━━━━━━━━━"]
                for a in anoms[:5]:
                    lines.append(f"• *₹{a['amount']:,.0f}* ({a['category']}) - {a.get('description', '')}\n  _Reason:_ {a.get('reason', '')}\n  _Status:_ Review Recommended\n")
                reply = "\n".join(lines)
            await send_telegram_message(chat_id, reply)
        return

    # 4. Command: /recent
    if text_clean.startswith("/recent"):
        if db is not None:
            cursor = db.expenses.find({"user_id": user_id}).sort("date", -1).limit(5)
            docs = await cursor.to_list(length=5)
            if not docs:
                reply = "No transactions found yet. Add one by typing `Spent ₹150 coffee`!"
            else:
                lines = ["🧾 *Recent Transactions (Last 5):*\n━━━━━━━━━━━━━━━━━━━"]
                for d in docs:
                    lines.append(f"• *₹{float(d.get('amount', 0)):,.2f}* - {d.get('description')} ({d.get('category')}) on {d.get('date')}")
                reply = "\n".join(lines)
            await send_telegram_message(chat_id, reply)
        return

    # 5. Natural Language Expense Ingestion
    # Try parsing amount from natural text
    amt_match = re.search(r'(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)', text_clean, re.IGNORECASE)
    if amt_match and db is not None:
        try:
            raw_num = amt_match.group(1).replace(",", "")
            amount_val = float(raw_num)

            # Auto-categorize
            from backend.app.agent.tools import auto_categorize, tool_add_expense
            category = auto_categorize(text_clean)
            desc = text_clean

            # Clean description
            cleaned_desc = re.sub(r'(?:spent|paid|bought|added|for|on|₹|rs\.?|inr|\b' + raw_num + r'\b)', '', text_clean, flags=re.IGNORECASE).strip()
            if cleaned_desc:
                desc = cleaned_desc[:80].capitalize()

            date_str = datetime.utcnow().strftime("%Y-%m") + f"-{datetime.utcnow().day:02d}"

            res = await tool_add_expense(
                db=db,
                user_id=user_id,
                amount=amount_val,
                category=category,
                description=desc,
                date_str=date_str,
                payment_method="Telegram Bot"
            )

            anomaly_warning = ""
            if res.get("is_unusual"):
                anomaly_warning = (
                    f"\n\n🚨 *FINANCIAL ANOMALY WARNING!*\n"
                    f"⚠️ _{res.get('anomaly_reason')}_\n"
                    f"This purchase is significantly higher than your normal patterns."
                )

            reply = (
                f"✅ *Expense Logged Successfully!*\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"💰 *Amount:* ₹{amount_val:,.2f}\n"
                f"🏷️ *Category:* {category}\n"
                f"📝 *Description:* {desc}\n"
                f"📅 *Date:* {date_str}"
                f"{anomaly_warning}\n\n"
                f"⚡ Real-time synced to your MongoDB dashboard!"
            )
            await send_telegram_message(chat_id, reply)
            return
        except Exception as e:
            print(f"[Telegram Ingestion Notice]: {e}")

    # Fallback response
    fallback = (
        f"🤖 I received your message: *\"{text_clean}\"*\n\n"
        "Try sending:\n"
        "• `/summary` for monthly budget status\n"
        "• `/anomalies` for AI anomaly detection\n"
        "• Or an expense like `Spent ₹300 on breakfast`"
    )
    await send_telegram_message(chat_id, fallback)

async def telegram_polling_worker(get_db_func):
    """Background async worker that listens for Telegram messages via getUpdates."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        print("[Telegram Bot Worker] ⚠️ No TELEGRAM_BOT_TOKEN configured. Polling inactive.")
        return

    offset = 0
    print(f"[Telegram Bot Worker] 🤖 Started polling for @{settings.TELEGRAM_BOT_USERNAME}...")

    async with httpx.AsyncClient(timeout=25.0) as client:
        while True:
            try:
                url = f"https://api.telegram.org/bot{token}/getUpdates"
                params = {"offset": offset, "timeout": 8}
                resp = await client.get(url, params=params)

                if resp.status_code == 200:
                    data = resp.json()
                    updates = data.get("result", [])
                    for up in updates:
                        up_id = up.get("update_id", 0)
                        offset = max(offset, up_id + 1)

                        msg = up.get("message") or up.get("channel_post")
                        if msg:
                            chat = msg.get("chat", {})
                            chat_id = chat.get("id")
                            text = msg.get("text", "")
                            sender = msg.get("from", {}).get("first_name", "Explorer")

                            if chat_id and text:
                                print(f"[Telegram Bot Worker] 📩 Incoming from {sender} (Chat ID: {chat_id}): '{text}'")
                                db = get_db_func()
                                asyncio.create_task(handle_telegram_command(db, chat_id, text, sender))
                else:
                    if resp.status_code != 409:
                        print(f"[Telegram Bot Notice]: getUpdates returned status {resp.status_code}")
                    await asyncio.sleep(3)
            except asyncio.CancelledError:
                print("[Telegram Bot Worker] Stopped polling.")
                break
            except Exception as err:
                print(f"[Telegram Bot Worker Error]: {err}")
                await asyncio.sleep(3)

            await asyncio.sleep(0.5)

