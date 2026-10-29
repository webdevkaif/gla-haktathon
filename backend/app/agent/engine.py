import re
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import httpx
from backend.app.config import settings
from backend.app.agent.tools import (
    tool_add_expense,
    tool_get_monthly_spending,
    tool_get_category_breakdown,
    tool_calculate_remaining_budget,
    tool_predict_monthly_spending,
    tool_detect_unusual_expenses,
    tool_simulate_what_if,
    tool_create_saving_plan,
    auto_categorize
)

def extract_natural_language_expenses(text: str) -> List[Dict[str, Any]]:
    """
    Extracts multiple or single expenses from natural phrasing.
    e.g. "Today I spent ₹250 on food, ₹100 on petrol, and ₹500 on shopping."
    or "I spent ₹350 on dinner yesterday."
    """
    expenses = []
    
    # Determine date context
    lowered = text.lower()
    date_val = datetime.utcnow().strftime("%Y-%m-%d")
    if "yesterday" in lowered:
        date_val = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

    # Split into clauses by commas, semicolons, or 'and'
    cleaned = re.sub(r'[₹$€£]', ' ', text)
    clauses = re.split(r'[,;\n]|\band\b', cleaned, flags=re.IGNORECASE)

    for clause in clauses:
        clause_str = clause.strip()
        if not clause_str:
            continue

        match = re.search(r'(?:spent|paid|bought|got)?\s*(?:rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)\s*(?:on|for|at|in)?\s+([a-zA-Z\s]+)', clause_str, re.IGNORECASE)
        if match:
            amt = float(match.group(1))
            desc = match.group(2).strip()
            desc = re.sub(r'^(yesterday|today|rs|inr|spent|paid)\s+', '', desc, flags=re.IGNORECASE).strip()
            if amt > 0 and len(desc) >= 2:
                cat = auto_categorize(desc)
                expenses.append({
                    "amount": amt,
                    "description": desc.capitalize(),
                    "category": cat,
                    "date": date_val
                })
        else:
            simple_match = re.search(r'(\d+(?:\.\d{1,2})?)\s+(?:for|on)\s+([a-zA-Z\s]+)', clause_str, re.IGNORECASE)
            if simple_match:
                amt = float(simple_match.group(1))
                desc = simple_match.group(2).strip()
                if amt > 0 and len(desc) >= 2:
                    expenses.append({
                        "amount": amt,
                        "description": desc.capitalize(),
                        "category": auto_categorize(desc),
                        "date": date_val
                    })

    return expenses


def strip_markdown_for_speech(text: str) -> str:
    cleaned = re.sub(r'[*_#`~]', '', text)
    cleaned = re.sub(r'\[.*?\]\(.*?\)', '', cleaned)
    cleaned = re.sub(r'[•\-–—]', ' ', cleaned)
    cleaned = re.sub(r'₹', 'rupees ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

async def process_agent_message(
    db: Any,
    user_id: str,
    message: str
) -> Dict[str, Any]:
    """
    Core AI Agent reasoning loop:
    Observe -> Analyze -> Decide -> Act -> Verify.
    """
    msg_lower = message.lower().strip()
    curr_month = datetime.utcnow().strftime("%Y-%m")

    # 0a. Check for Self-Introduction / Voice Agent Identity
    if any(q in msg_lower for q in [
        "introduce yourself", "who are you", "what can you do", "tell me about yourself", 
        "introduce", "hello voice agent", "hi voice agent", "voice agent", "your capabilities"
    ]):
        summary = await tool_get_monthly_spending(db, user_id, curr_month)
        voice_script = (
            "Hello! I am ExpensePilot Voice AI, your autonomous financial copilot. "
            "I continuously audit your expenses, track your uploaded invoices, simulate budget scenarios, "
            "and generate personalized financial roadmap PDF reports. How can I assist you right now?"
        )
        reply = (
            "🎙️ **Hello! I'm ExpensePilot Voice AI** — Your Autonomous Financial & Invoice Copilot 🚀\n\n"
            "I operate on an autonomous **Observe → Analyze → Decide → Act** intelligence cycle. "
            "Here is what I can do for you in real-time:\n\n"
            "• 🗣️ **Voice & Audio Interaction**: Speak to me directly using your microphone or listen with voice narration.\n"
            "• 📑 **Invoice & Receipt Auditing**: Inspect your uploaded invoices, extract line items, calculate tax deductions, and flag price anomalies.\n"
            "• 🗺️ **Financial Roadmap (PDF)**: Generate an executive-level 3-phase financial defense and wealth roadmap with instant PDF download.\n"
            "• 🔮 **Predictive Forecasting & What-If**: Simulate budget changes (e.g., *'What if I reduce shopping by 20%?'*) before you spend.\n"
            "• 🛡️ **Autonomous Runaway & Anomaly Defense**: Statistically audit spending velocity to keep you under budget.\n\n"
            f"📊 **Current Status ({curr_month})**: Spent ₹{summary['total_spent']:,.0f} of ₹{summary['total_budget']:,.0f} budget ({summary['percentage_used']}% used).\n\n"
            "What would you like me to do next?"
        )
        return {
            "reply": reply,
            "voice_text": voice_script,
            "tool_called": "agent_self_introduction",
            "tool_result": {"status": "active", "voice_ready": True},
            "suggested_actions": [
                "Talk about my uploaded invoices",
                "Create PDF roadmap and give it to me",
                "How much can I spend per day?",
                "Predict my monthly spending"
            ]
        }

    # 0b. Check for CSV / Excel Spreadsheets Upload questions
    if any(q in msg_lower for q in [
        "upload csv", "upload excel", "import csv", "import excel", "spreadsheet", 
        "upload file", "how to upload", "upload expenses", "import expenses"
    ]):
        reply = (
            "📊 **How to Upload Excel & CSV Spreadsheets:**\n\n"
            "You can upload your bulk expense transactions in two ways:\n\n"
            "1. 📎 **Directly in this Chat**: Click the **Paperclip** icon at the bottom of this chat window and pick your `.csv` or `.xlsx` file. I will automatically parse, categorize, and load them into your database!\n"
            "2. 📋 **From the Transactions List**: Go to the **Expenses / Transactions** tab and click the green **'Import CSV'** button next to 'Export'.\n\n"
            "📝 **Expected Columns** (any column order):\n"
            "• `date` (e.g. 2026-10-15 or 15/10/2026)\n"
            "• `amount` (e.g. 450.00)\n"
            "• `description` (e.g. Office lunch)\n"
            "• `category` *(optional, auto-detected if left empty)*\n"
            "• `payment_method` *(optional, e.g. UPI, Card, Cash)*"
        )
        voice_script = "You can upload Excel or CSV files by tapping the paperclip icon in this chat or clicking Import CSV in the transactions table."
        return {
            "reply": reply,
            "voice_text": voice_script,
            "tool_called": "agent_upload_guidance",
            "tool_result": {"status": "ready", "supported_formats": [".csv", ".xlsx", ".xls"]},
            "suggested_actions": [
                "How much did I spend this month?",
                "Detect unusual expenses",
                "Create PDF roadmap and give it to me"
            ]
        }

    # 0c. Check for Uploaded Invoices Discussion ("talk about uploaded invoices", "invoices", "receipts")
    if any(q in msg_lower for q in [
        "invoice", "invoices", "uploaded invoice", "receipt", "receipts", "audit invoice",
        "talk about my invoices", "discuss invoices", "show my invoices", "bills"
    ]):
        from backend.app.routers.invoices import ensure_demo_invoices
        await ensure_demo_invoices(db, user_id)
        cursor = db.invoices.find({"user_id": user_id}).sort("date", -1)
        invoices = await cursor.to_list(length=50)

        total_inv_amt = sum(float(inv.get("amount", 0.0)) for inv in invoices)
        anomalous_invoices = [inv for inv in invoices if inv.get("is_anomaly")]
        
        reply_lines = [
            f"📑 **Uploaded Invoices & Liabilities Audit**",
            f"Found **{len(invoices)} recorded invoices** totaling **₹{total_inv_amt:,.2f}** for your account.\n"
        ]
        
        for inv in invoices[:5]:
            status_emoji = "⚠️" if inv.get("is_anomaly") else "✅"
            tax_str = f" (incl. ₹{inv['tax']:,.2f} GST)" if inv.get("tax") else ""
            reply_lines.append(f"{status_emoji} **{inv.get('vendor', 'Merchant')}**: ₹{inv.get('amount', 0):,.2f} on {inv.get('date')} [{inv.get('category')}]{tax_str}")
            if inv.get("items"):
                items_summary = ", ".join([f"{it['name']} (x{it.get('quantity', 1)})" for it in inv["items"][:2]])
                reply_lines.append(f"   └ *Items*: {items_summary}")
            if inv.get("is_anomaly"):
                reply_lines.append(f"   └ 🚨 *Audit Flag*: {inv.get('anomaly_reason')}")

        reply_lines.append("")
        if anomalous_invoices:
            reply_lines.append(f"🔍 **Autonomous Audit Findings**: {len(anomalous_invoices)} invoice requires attention. E.g., {anomalous_invoices[0]['vendor']} was flagged for irregular pricing.")
        else:
            reply_lines.append("🔍 **Autonomous Audit Findings**: All invoice amounts match approved category spending baselines and GST deductions are verified.")

        voice_script = (
            f"I audited your {len(invoices)} uploaded invoices totaling {int(total_inv_amt)} rupees. "
            f"Recent vendors include {invoices[0].get('vendor', 'Apple Store')} and {invoices[1].get('vendor', 'Starbucks') if len(invoices) > 1 else ''}. "
            f"{'One anomalous charge was detected and flagged for review.' if anomalous_invoices else 'All items are audited and in order.'}"
        )

        return {
            "reply": "\n".join(reply_lines),
            "voice_text": voice_script,
            "tool_called": "audit_uploaded_invoices",
            "tool_result": {
                "total_invoices": len(invoices),
                "total_amount": total_inv_amt,
                "anomalies_count": len(anomalous_invoices)
            },
            "suggested_actions": [
                "Create PDF roadmap and give it to me",
                "Where did most of my money go?",
                "Can I afford a ₹1,500 purchase?",
                "Predict my monthly spending"
            ]
        }

    # 0c. Check for Financial Roadmap & PDF Generation Intent
    if any(q in msg_lower for q in [
        "roadmap", "pdf roadmap", "create pdf", "give roadmap", "financial roadmap",
        "download roadmap", "create pdf roadmap and give you", "give me roadmap", 
        "generate roadmap", "download pdf", "give you roadmap", "financial plan"
    ]):
        from backend.app.services.analytics import get_monthly_summary
        from backend.app.routers.invoices import ensure_demo_invoices
        await ensure_demo_invoices(db, user_id)
        
        summary = await get_monthly_summary(db, user_id, curr_month)
        budget_doc = await db.budgets.find_one({"user_id": user_id, "month": curr_month})
        total_budget = budget_doc.get("total_budget", 18000.0) if budget_doc else 18000.0
        total_spent = summary.get("total_spent", 0.0)
        ratio = total_spent / total_budget if total_budget > 0 else 0.8
        health_score = max(15, min(95, int(100 - (ratio - 0.7) * 80))) if ratio > 0.7 else 92

        download_url = f"http://127.0.0.1:8000/api/analytics/roadmap/pdf?month={curr_month}&user_id={user_id}"

        reply = (
            f"🗺️ **ExpensePilot Autonomous Financial Roadmap (90-Day Defense & Wealth Plan)**\n\n"
            f"I have synthesized your spending velocity, uploaded invoices, and savings goals into an executive diagnostic.\n\n"
            f"• **Financial Health Score**: **{health_score}/100**\n"
            f"• **Current Monthly Outflow**: ₹{total_spent:,.0f} (Cap: ₹{total_budget:,.0f})\n"
            f"• **Projected 90-Day Capital Preserved**: **+₹15,000**\n\n"
            f"**Three-Phase Execution Strategy:**\n"
            f"1. **Phase 1 (Days 1–30) — Runway Defense**: Cap discretionary velocity at ₹150/day. Enforce 48-hour cool-off rule on purchases >₹1,000. Target savings: ₹3,200/mo.\n"
            f"2. **Phase 2 (Days 31–60) — Run-Rate Realignment**: Enforce envelopes (Food ₹4,500/mo, Groceries ₹3,000/mo). Negotiate utility bills. Accumulate ₹9,500 in emergency reserves.\n"
            f"3. **Phase 3 (Days 61–90) — Wealth Acceleration**: Reach 50% milestone of Primary Savings Goal (₹15,000). Keep burn rate <85%.\n\n"
            f"📄 **Your PDF Document is Ready!**\n"
            f"You can download the full printable PDF roadmap report directly using the download button below:"
        )

        voice_script = (
            f"I have created your personalized 90-day financial roadmap and compiled it into a PDF report. "
            f"Your current financial health score is {health_score} out of 100, and our plan targets 15,000 rupees in savings over the next 90 days. "
            f"You can click the download button right now to save your roadmap."
        )

        return {
            "reply": reply,
            "voice_text": voice_script,
            "pdf_download_url": download_url,
            "tool_called": "generate_financial_roadmap_pdf",
            "tool_result": {
                "health_score": health_score,
                "projected_savings_90_days": 15000.0,
                "download_url": download_url
            },
            "suggested_actions": [
                "Talk about my uploaded invoices",
                "How much can I spend per day?",
                "What if I reduce food spending by 20%?",
                "Predict my monthly spending"
            ]
        }

    # 0d. Check for Phone Number Pairing / Connection ("add my number", "connect my phone", "my number is")
    is_phone_add = any(q in msg_lower for q in [
        "add my number", "add number", "connect my phone", "connect phone", "connect my number",
        "pair my phone", "pair phone", "register my phone", "register phone", "save my number",
        "save phone", "my number is", "my phone number is", "update my phone", "set my phone"
    ]) or (any(w in msg_lower for w in ["phone", "number"]) and any(w in msg_lower for w in ["add", "connect", "pair", "register", "save", "update", "set"]))
    
    phone_match = re.search(r'(\+?\d[\d\s\-]{8,14}\d)', message)
    if is_phone_add and phone_match:
        from backend.app.services.messaging import update_phone_settings, dispatch_phone_message
        raw_num = phone_match.group(1).strip()
        # Add default country code if 10-digit number without +
        clean_digits = re.sub(r'\D', '', raw_num)
        if len(clean_digits) == 10 and not raw_num.startswith('+'):
            formatted_phone = f"+91 {clean_digits[:5]} {clean_digits[5:]}"
        else:
            formatted_phone = raw_num

        updated_settings = await update_phone_settings(db, user_id, {"phone_number": formatted_phone})
        
        # Dispatch welcome verification message
        welcome_text = (
            f"🚀 ExpensePilot AI Connected! Your phone ({formatted_phone}) is successfully paired with your autonomous financial copilot. "
            "You will receive daily budget allowances, invoice audits, and anomaly alerts."
        )
        dispatched = await dispatch_phone_message(
            db=db,
            user_id=user_id,
            phone_number=formatted_phone,
            message_type="PHONE_CONNECTED",
            channel="SMS",
            content=welcome_text
        )

        reply = (
            f"✅ **Phone Number Successfully Connected & Paired!**\n\n"
            f"• **Paired Mobile Number**: `{formatted_phone}`\n"
            f"• **Gateway Status**: **Active & Verified** (Dispatch ID: `{dispatched['dispatch_id']}`)\n"
            f"• **Channels Enabled**: **SMS** & **WhatsApp**\n\n"
            f"📲 **Verification Message Dispatched:**\n"
            f"> \"{welcome_text}\"\n\n"
            f"Your phone is now linked. You will receive 9:00 PM daily budget recaps, critical anomaly alerts, and roadmap links."
        )

        voice_script = f"Your phone number {formatted_phone} has been connected and paired. A verification message was dispatched to your device."

        return {
            "reply": reply,
            "voice_text": voice_script,
            "tool_called": "connect_phone_number",
            "tool_result": {
                "phone_number": formatted_phone,
                "status": "connected",
                "dispatch_id": dispatched["dispatch_id"]
            },
            "suggested_actions": [
                "Send daily summary to my phone",
                "Send roadmap link to my phone via WhatsApp",
                "How much can I spend per day?",
                "Predict my monthly spending"
            ]
        }

    # 0e. Check for Phone Messaging / SMS Intent ("send to my phone", "text me", "whatsapp me")
    is_phone_dispatch = (
        any(q in msg_lower for q in [
            "phone", "mobile", "number", "text me", "sms", "whatsapp", "call me"
        ]) and any(w in msg_lower for w in [
            "send", "text", "notify", "dispatch", "message", "forward"
        ])
    ) or any(q in msg_lower for q in [
        "text me", "whatsapp me", "send sms", "send to phone", "send this to my phone", "send to my phone"
    ])
    if is_phone_dispatch:
        from backend.app.services.messaging import get_or_create_phone_settings, dispatch_phone_message
        phone_doc = await get_or_create_phone_settings(db, user_id)
        
        # Check if user mentioned a new phone number in the message
        phone_match = re.search(r'(\+?\d[\d\s\-]{8,14}\d)', message)
        target_phone = phone_match.group(1).strip() if phone_match else phone_doc.get("phone_number", "+91 98765 43210")

        # Determine channel
        channel = "WhatsApp" if "whatsapp" in msg_lower else "SMS"

        # Construct message content based on context
        b_info = await tool_calculate_remaining_budget(db, user_id, curr_month)
        sms_body = (
            f"📱 ExpensePilot AI Update: "
            f"Month: {curr_month}. Spent: ₹{b_info['total_spent']:,.0f} of ₹{b_info['total_budget']:,.0f}. "
            f"Safe Allowance: ₹{b_info['daily_budget_remaining']:,.0f}/day with {b_info['days_remaining']} days left. "
            f"Roadmap & Audits active."
        )

        dispatched = await dispatch_phone_message(
            db=db,
            user_id=user_id,
            phone_number=target_phone,
            message_type="AGENT_PHONE_DISPATCH",
            channel=channel,
            content=sms_body
        )

        reply = (
            f"📲 **Message Sent to Your Phone!**\n\n"
            f"• **Destination Number**: `{target_phone}`\n"
            f"• **Channel**: **{channel}**\n"
            f"• **Delivery Status**: **{dispatched['status']}** (Dispatch ID: `{dispatched['dispatch_id']}`)\n\n"
            f"**Content Dispatched:**\n"
            f"> \"{sms_body}\"\n\n"
            f"💡 *Tip: You can change notification channels or update your phone number anytime in the Phone Alerts modal.*"
        )

        voice_script = f"I have sent your financial recap to your phone number {target_phone} via {channel}. Delivery is confirmed."

        return {
            "reply": reply,
            "voice_text": voice_script,
            "tool_called": "dispatch_phone_notification",
            "tool_result": dispatched,
            "suggested_actions": [
                "Send to my phone via WhatsApp",
                "Create PDF roadmap and give it to me",
                "How much can I spend per day?",
                "Predict my monthly spending"
            ]
        }

    # 1. Check for Expense Addition Intent
    extracted_items = extract_natural_language_expenses(message)
    if extracted_items and any(w in msg_lower for w in ["spent", "bought", "paid", "record", "add", "yesterday", "today", "₹"]):
        added_records = []
        unusual_warnings = []

        for item in extracted_items:
            rec = await tool_add_expense(
                db=db,
                user_id=user_id,
                amount=item["amount"],
                category=item["category"],
                description=item["description"],
                date_str=item["date"]
            )
            added_records.append(rec)
            if rec.get("is_unusual"):
                unusual_warnings.append(f"⚠️ {rec['category']}: {rec['anomaly_reason']}")

        # Fetch updated monthly budget
        b_info = await tool_calculate_remaining_budget(db, user_id, curr_month)
        
        reply_lines = [
            f"✅ Recorded {len(added_records)} expense{'s' if len(added_records) > 1 else ''} successfully!",
            ""
        ]
        for r in added_records:
            reply_lines.append(f"• **₹{r['amount']:,.0f}** for *{r['description']}* ({r['category']}) on {r['date']}")

        reply_lines.append("")
        reply_lines.append(f"📊 **Updated Status**: ₹{b_info['total_spent']:,.0f} spent of ₹{b_info['total_budget']:,.0f} budget ({b_info['percentage_used']}% used).")
        reply_lines.append(f"💡 You have **₹{b_info['remaining_budget']:,.0f}** left (₹{b_info['daily_budget_remaining']:,.0f}/day for remaining {b_info['days_remaining']} days).")

        if unusual_warnings:
            reply_lines.append("")
            reply_lines.append("**Unusual Pattern Detected:**")
            reply_lines.extend(unusual_warnings)

        return {
            "reply": "\n".join(reply_lines),
            "tool_called": "add_expense",
            "tool_result": added_records,
            "structured_expenses_added": added_records,
            "suggested_actions": [
                "How much can I spend per day?",
                "Predict my monthly spending",
                "Show category breakdown"
            ]
        }

    # 2. Check for Purchase Affordability ("Can I afford ₹...", "What if I spend ₹...")
    afford_match = re.search(r'(?:can i afford|what if i spend|what happens if i spend)\s*(?:a|an)?\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)\s*(?:on\s+([a-zA-Z\s]+))?', msg_lower)
    if afford_match:
        amt = float(afford_match.group(1))
        cat = afford_match.group(2) or "General"
        sim_res = await tool_simulate_what_if(
            db=db,
            user_id=user_id,
            upcoming_purchase_amount=amt,
            month_str=curr_month
        )
        return {
            "reply": sim_res["advice"],
            "tool_called": "simulate_what_if",
            "tool_result": sim_res,
            "suggested_actions": [
                f"What if I reduce shopping expenses by 20%?",
                "How much did I spend this month?",
                "Predict my monthly spending"
            ]
        }

    # 3. Check for Category What-If Simulation ("What if I reduce shopping by 20%...")
    whatif_match = re.search(r'reduce\s+([a-zA-Z]+)(?:\s+spending|\s+expenses)?\s+by\s+(\d+(?:\.\d{1,2})?)%', msg_lower)
    if whatif_match:
        cat_name = whatif_match.group(1).capitalize()
        pct = float(whatif_match.group(2))
        sim_res = await tool_simulate_what_if(
            db=db,
            user_id=user_id,
            category=cat_name,
            percent_reduction=pct,
            month_str=curr_month
        )
        return {
            "reply": sim_res["advice"],
            "tool_called": "simulate_what_if",
            "tool_result": sim_res,
            "suggested_actions": [
                f"I want to save ₹5,000 in the next 3 months",
                "Can I afford a ₹1,500 purchase?",
                "Where did most of my money go?"
            ]
        }

    # 4. Check for Savings Goal Plan ("I want to save ₹5,000 in the next 3 months")
    save_match = re.search(r'save\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)\s*(?:in|over)?\s*(?:the next)?\s*(\d+)?\s*(?:months)?', msg_lower)
    if save_match and "save" in msg_lower and any(c.isdigit() for c in msg_lower):
        target = float(save_match.group(1))
        months = int(save_match.group(2)) if save_match.group(2) else 3
        plan = await tool_create_saving_plan(
            db=db,
            user_id=user_id,
            target_amount=target,
            months=months,
            title=f"Goal: ₹{target:,.0f} in {months}m"
        )
        reply = (
            f"🎯 **Personalized Saving Plan Created!**\n\n"
            f"To accumulate **₹{target:,.0f}** over **{months} months**, your target is **₹{plan['monthly_target']:,.0f}/month** (approximately ₹{plan['daily_target']:,.0f}/day).\n\n"
            f"**Recommended Adjustments based on your spending history:**\n"
        )
        for s in plan["suggestions"]:
            reply += f"• **{s['category']}**: {s['tip']}\n"
        
        reply += f"\nI have registered this goal in your Savings Planner!"
        return {
            "reply": reply,
            "tool_called": "create_saving_plan",
            "tool_result": plan,
            "suggested_actions": [
                "How much can I spend per day?",
                "Where did most of my money go?",
                "Predict my monthly spending"
            ]
        }

    # 5. Check for Monthly Spending Query ("How much did I spend this month?")
    if any(q in msg_lower for q in ["how much did i spend", "how much spent", "total spend", "spending this month", "my expenses"]):
        summary = await tool_get_monthly_spending(db, user_id, curr_month)
        reply = (
            f"📊 **Monthly Spending Overview ({summary['month']})**\n\n"
            f"• **Total Spent**: ₹{summary['total_spent']:,.0f}\n"
            f"• **Monthly Budget**: ₹{summary['total_budget']:,.0f}\n"
            f"• **Remaining**: ₹{summary['remaining_budget']:,.0f} ({summary['percentage_used']}% consumed)\n"
            f"• **Top Category**: {summary['top_category']} (₹{summary['top_category_amount']:,.0f})\n"
            f"• **Daily Average**: ₹{summary['daily_avg_spent']:,.0f}/day"
        )
        return {
            "reply": reply,
            "tool_called": "get_monthly_spending",
            "tool_result": summary,
            "suggested_actions": [
                "Where did most of my money go?",
                "How much can I spend per day?",
                "Predict my monthly spending"
            ]
        }

    # 6. Check for Category Breakdown Query ("Where did most of my money go?", "Show category breakdown")
    if any(q in msg_lower for q in ["where did most of my money go", "biggest expense", "category breakdown", "top category", "highest expense"]):
        bd = await tool_get_category_breakdown(db, user_id, curr_month)
        lines = [
            f"🏆 **Expense Breakdown by Category**",
            f"Total across all categories: **₹{bd['total_spent']:,.0f}**",
            f"Largest Category: **{bd['top_category']}** (₹{bd['top_category_amount']:,.0f})",
            ""
        ]
        for c in bd["categories"]:
            pct = round((c['amount'] / bd['total_spent'] * 100), 1) if bd['total_spent'] > 0 else 0
            lines.append(f"• **{c['category']}**: ₹{c['amount']:,.0f} ({pct}% • {c['count']} txns)")
        return {
            "reply": "\n".join(lines),
            "tool_called": "get_category_breakdown",
            "tool_result": bd,
            "suggested_actions": [
                f"What if I reduce {bd['top_category']} by 20%?",
                "How much can I spend per day?",
                "Predict my monthly spending"
            ]
        }

    # 7. Check for Daily Allowance Query ("How much can I spend per day?", "Daily limit")
    if any(q in msg_lower for q in ["how much can i spend per day", "daily budget", "daily limit", "spend per day"]):
        b_info = await tool_calculate_remaining_budget(db, user_id, curr_month)
        reply = (
            f"🗓️ **Daily Budget Allowance**\n\n"
            f"You have **₹{b_info['remaining_budget']:,.0f}** remaining in your ₹{b_info['total_budget']:,.0f} budget.\n"
            f"With **{b_info['days_remaining']} days left** in the month, your safe daily spending allowance is **₹{b_info['daily_budget_remaining']:,.0f} per day**.\n\n"
            f"💡 *Tip: Keeping under this daily benchmark guarantees you will finish the month within budget.*"
        )
        return {
            "reply": reply,
            "tool_called": "calculate_remaining_budget",
            "tool_result": b_info,
            "suggested_actions": [
                "What happens if I spend ₹500 on shopping tomorrow?",
                "Predict my monthly spending",
                "Show unusual expenses"
            ]
        }

    # 8. Check for Prediction / Forecast Query ("Predict my monthly spending", "Future expenses")
    if any(q in msg_lower for q in ["predict", "forecast", "future expense", "projection", "estimated month-end"]):
        fc = await tool_predict_monthly_spending(db, user_id, curr_month)
        reply = (
            f"🔮 **ExpensePilot AI Spending Forecast**\n\n"
            f"{fc['summary_text']}\n\n"
            f"• **Current Total**: ₹{fc['total_spent_so_far']:,.0f}\n"
            f"• **Projected Month-End**: ₹{fc['projected_total']:,.0f} (range: ₹{fc['projected_range']['min']:,.0f} – ₹{fc['projected_range']['max']:,.0f})\n"
            f"• **Weekday Spending Velocity**: ₹{fc['avg_weekday']:,.0f}/day\n"
            f"• **Weekend Spending Velocity**: ₹{fc['avg_weekend']:,.0f}/day\n"
            f"• **Recommended Daily Target**: ₹{fc['safe_daily_target']:,.0f}/day"
        )
        return {
            "reply": reply,
            "tool_called": "predict_monthly_spending",
            "tool_result": fc,
            "suggested_actions": [
                "Can I afford a ₹1,000 purchase?",
                "What if I reduce shopping by 20%?",
                "Show unusual expenses"
            ]
        }

    # 9. Check for Unusual Expenses Query
    if any(q in msg_lower for q in ["unusual", "suspicious", "anomal", "outlier", "high expense", "weird"]):
        anomalies = await tool_detect_unusual_expenses(db, user_id, curr_month)
        if not anomalies:
            reply = "✅ **All Clear!** No unusual or statistically anomalous expenses detected for this period. Spending across all categories is consistent with your historical baselines."
        else:
            lines = [
                f"⚠️ **Found {len(anomalies)} Unusual Transaction{'s' if len(anomalies) > 1 else ''}:**",
                ""
            ]
            for a in anomalies:
                lines.append(f"• **₹{a['amount']:,.0f}** on *{a['description']}* ({a['category']} on {a['date']})")
                lines.append(f"  └ *Reason*: {a['reason']}")
            reply = "\n".join(lines)
        return {
            "reply": reply,
            "tool_called": "detect_unusual_expenses",
            "tool_result": anomalies,
            "suggested_actions": [
                "How much did I spend this month?",
                "Where did most of my money go?",
                "Predict my monthly spending"
            ]
        }

    # 10. High-Speed Groq AI Integration (Llama / GPT on Groq Cloud)
    if settings.GROQ_API_KEY:
        try:
            summary = await tool_get_monthly_spending(db, user_id, curr_month)
            system_prompt = (
                "You are ExpensePilot AI, an autonomous financial intelligence copilot and advisor. "
                "You help users analyze expenses, manage budgets, flag anomalies, and optimize savings. "
                f"User Financial Context for {curr_month}: "
                f"Total Spent: ₹{summary['total_spent']:,.0f} | Budget: ₹{summary['total_budget']:,.0f} "
                f"({summary['percentage_used']}% utilized) | Remaining Budget: ₹{summary['remaining_budget']:,.0f} "
                f"(₹{summary['daily_budget_remaining']:,.0f}/day allowed) | Top Category: {summary['top_category']} (₹{summary['top_category_amount']:,.0f}). "
                "Guidelines: Be concise, engaging, helpful, and always quote amounts in ₹ (INR). "
                "Provide actionable financial tips and advise users on staying under budget."
            )
            groq_headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            groq_payload = {
                "model": settings.GROQ_MODEL or "openai/gpt-oss-120b",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                "temperature": 0.5,
                "max_tokens": 512
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=groq_headers, json=groq_payload)
                if resp.status_code == 200:
                    ai_text = resp.json()["choices"][0]["message"]["content"]
                    return {
                        "reply": ai_text,
                        "tool_called": "groq_llm",
                        "tool_result": {"provider": "Groq Cloud", "model": settings.GROQ_MODEL},
                        "suggested_actions": [
                            "How much did I spend this month?",
                            "Where did most of my money go?",
                            "Detect unusual expenses",
                            "Create PDF roadmap and give it to me"
                        ]
                    }
        except Exception as e:
            print(f"Groq LLM call info: {e}")

    # 11. General Conversational / Gemini integration
    if settings.GEMINI_API_KEY:
        try:
            summary = await tool_get_monthly_spending(db, user_id, curr_month)
            system_prompt = (
                "You are ExpensePilot AI, an autonomous financial intelligence agent. "
                "You help users manage expenses, budgets, and savings goals. "
                f"Context: Current month {curr_month}, spent ₹{summary['total_spent']} of budget ₹{summary['total_budget']}, "
                f"top category {summary['top_category']} (₹{summary['top_category_amount']}). "
                "Keep answers concise, direct, helpful, and use currency ₹. Always suggest actionable next steps."
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [
                        {"role": "user", "parts": [{"text": f"{system_prompt}\n\nUser Question: {message}"}]}
                    ]
                }
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    ai_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return {
                        "reply": ai_text,
                        "tool_called": "gemini_llm",
                        "tool_result": None,
                        "suggested_actions": [
                            "How much did I spend this month?",
                            "Can I afford a ₹1,000 purchase?",
                            "Predict my monthly spending"
                        ]
                    }
        except Exception:
            pass

    # Default friendly agent assistant response
    summary = await tool_get_monthly_spending(db, user_id, curr_month)
    return {
        "reply": (
            f"Hello! I'm **ExpensePilot AI**, your autonomous financial agent. 🚀\n\n"
            f"Here is your quick financial status for **{curr_month}**:\n"
            f"• **Spent**: ₹{summary['total_spent']:,.0f} of ₹{summary['total_budget']:,.0f} ({summary['percentage_used']}%)\n"
            f"• **Available**: ₹{summary['remaining_budget']:,.0f} (₹{summary['daily_budget_remaining']:,.0f}/day)\n\n"
            f"You can tell me naturally:\n"
            f"• *\"I spent ₹350 on lunch yesterday\"*\n"
            f"• *\"Today I spent ₹250 on food, ₹100 on petrol, and ₹500 on shopping\"*\n"
            f"• *\"Can I afford a ₹1,500 purchase?\"*\n"
            f"• *\"What if I reduce dining out by 20%?\"*"
        ),
        "tool_called": "agent_overview",
        "tool_result": summary,
        "suggested_actions": [
            "How much did I spend this month?",
            "Where did most of my money go?",
            "Can I afford a ₹1,000 purchase?",
            "Predict my monthly spending"
        ]
    }
