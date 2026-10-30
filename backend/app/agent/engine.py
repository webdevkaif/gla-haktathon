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
    lowered = text.lower()
    date_val = datetime.utcnow().strftime("%Y-%m-%d")
    if "yesterday" in lowered:
        date_val = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

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

async def call_llm_authentically(
    system_instruction: str,
    user_prompt: str,
    temperature: float = 0.35,
    max_tokens: int = 1000
) -> Optional[str]:
    """Calls Groq LLM (with secondary fallback) to produce authentic, empathetic, grounded text."""
    if settings.GROQ_API_KEY:
        chosen_model = settings.GROQ_MODEL or "qwen/qwen3.8-27b"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": chosen_model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        try:
            async with httpx.AsyncClient(timeout=18.0) as client:
                resp = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    if content and content.strip():
                        return content.strip()
                elif resp.status_code in (404, 429):
                    fallback_model = "openai/gpt-oss-120b" if chosen_model != "openai/gpt-oss-120b" else "openai/gpt-oss-20b"
                    payload["model"] = fallback_model
                    resp_fallback = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                    if resp_fallback.status_code == 200:
                        content = resp_fallback.json()["choices"][0]["message"]["content"]
                        if content and content.strip():
                            return content.strip()
        except Exception as e:
            print(f"[ExpensePilot AI] LLM error: {e}")

    if settings.GEMINI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=14.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{"role": "user", "parts": [{"text": f"{system_instruction}\n\nUser Question: {user_prompt}"}]}]
                }
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                    if text and text.strip():
                        return text.strip()
        except Exception:
            pass

    return None

async def build_financial_context(db: Any, user_id: str, curr_month: str) -> str:
    summary = await tool_get_monthly_spending(db, user_id, curr_month)
    b_info = await tool_calculate_remaining_budget(db, user_id, curr_month)
    
    # Category limits from budget document
    budget_doc = await db.budgets.find_one({"user_id": user_id, "month": curr_month})
    category_limits = budget_doc.get("category_limits", {}) if budget_doc else {}
    
    # Complete category breakdown
    cat_lines = []
    total_spent = summary.get("total_spent", 0.0)
    for idx, c in enumerate(summary.get("categories", []), start=1):
        cname = c["category"]
        camt = float(c["amount"])
        ccnt = c["count"]
        pct = round((camt / total_spent * 100), 1) if total_spent > 0 else 0.0
        limit = category_limits.get(cname)
        if limit:
            diff = camt - float(limit)
            status = f"Over by ₹{diff:,.2f}" if diff > 0 else f"Under by ₹{abs(diff):,.2f}"
            cat_lines.append(f"| {idx}. {cname} | ₹{camt:,.2f} | {pct}% | {ccnt} | ₹{float(limit):,.2f} | {status} |")
        else:
            cat_lines.append(f"| {idx}. {cname} | ₹{camt:,.2f} | {pct}% | {ccnt} | Uncapped | Within bounds |")
    
    categories_table_str = "\n".join(cat_lines) if cat_lines else "No categorized spending recorded."

    # Anomalies
    anomalies = await tool_detect_unusual_expenses(db, user_id, curr_month)
    anom_lines = []
    for a in anomalies:
        anom_lines.append(f"• {a['date']} | {a['description']} | ₹{float(a['amount']):,.2f} ({a['category']}) | Reason: {a['reason']}")
    anom_str = "\n".join(anom_lines) if anom_lines else "None (All spending is within normal baselines)"

    # Recent 15 transactions
    cursor = db.expenses.find({"user_id": user_id}).sort("date", -1).limit(15)
    recent = await cursor.to_list(length=15)
    recent_lines = []
    for r in recent:
        recent_lines.append(f"• {r.get('date')} | {r.get('description')} | ₹{float(r.get('amount', 0)):,.2f} | {r.get('category')} | {r.get('payment_method', 'UPI')}")
    recent_str = "\n".join(recent_lines) if recent_lines else "No transactions recorded yet."

    over_budget_amt = max(0.0, total_spent - summary['total_budget'])
    budget_status = f"OVER BUDGET by ₹{over_budget_amt:,.2f}" if over_budget_amt > 0 else f"Within Budget (₹{summary['remaining_budget']:,.2f} remaining)"

    ctx = f"""LIVE DATABASE GROUND TRUTH ({curr_month}):
• Total Spent: ₹{total_spent:,.2f}
• Monthly Budget: ₹{summary['total_budget']:,.2f}
• Budget Status: {budget_status}
• Percentage Used: {summary['percentage_used']}%
• Days Elapsed: {summary.get('days_elapsed', 29)} / {summary.get('total_days', 31)} (Days Remaining: {summary.get('days_remaining', 2)})
• Daily Average Spent So Far: ₹{summary.get('daily_avg_spent', 0):,.2f}/day
• Safe Daily Remaining Allowance: ₹{b_info.get('daily_budget_remaining', 0):,.2f}/day
• Total Recorded Transactions Count: {summary.get('expense_count', len(recent))}

COMPLETE CATEGORY-BY-CATEGORY BREAKDOWN (ALL CATEGORIES):
| Category | Spent | % of Total | Txn Count | Limit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
{categories_table_str}

FLAGGED UNUSUAL TRANSACTIONS / ANOMALIES:
{anom_str}

RECENT RECORDED TRANSACTIONS (Latest 15):
{recent_str}
"""
    return ctx

SYSTEM_PERSONA = """You are ExpensePilot AI, a genuine, warm, and highly authentic personal financial mentor and AI copilot.

MANDATORY RULES FOR DATA ACCURACY & COMPLETENESS:
1. 100% COMPLETE & EXACT DATA:
   - When the user asks about their spending, budget, category breakdown, or transactions (e.g. "pura data sahi do", "actual me complete data shi de", "show breakdown", "all expenses", "kitna kharcha hua"), YOU MUST PROVIDE THE COMPLETE, EXACT NUMBERS from the LIVE DATABASE GROUND TRUTH above.
   - Do NOT omit any categories. Present ALL categories with their exact ₹ amounts, percentages, and transaction counts.
   - Present category breakdowns and summaries in clear, scannable Markdown tables or well-structured bullet lists with exact amounts in ₹.
   - Accurately state whether the user is over budget (and by how much in ₹) or under budget.
2. EMPATHETIC & AUTHENTIC MENTORSHIP:
   - Speak with warmth, honesty, and genuine care. Never be robotic, dismissive, or vague.
   - Understand real-world Indian budgeting: UPI payments, Swiggy/Zomato, Blinkit, groceries, metro, fuel, EMIs.
3. LANGUAGE MATCHING:
   - If the user writes or speaks in Hindi or Hinglish (e.g. 'kitna bacha hai', 'kya karu', 'bhai pura data sahi de', 'kaha gaya paisa'), reply in natural, fluent, friendly Hinglish.
   - If the user writes in English, reply in clean, engaging, articulate English.
4. STRICT TRUTH:
   - Never invent or hallucinate figures or dates. All numbers must strictly align with the ground truth data above.
"""

async def process_agent_message(
    db: Any,
    user_id: str,
    message: str
) -> Dict[str, Any]:
    """
    Core AI Agent reasoning loop with authentic, empathetic intelligence.
    """
    msg_lower = message.lower().strip()
    curr_month = datetime.utcnow().strftime("%Y-%m")
    fin_context = await build_financial_context(db, user_id, curr_month)

    # ─────────────────────────────────────────────────────────────────────────
    # 0a. Check for Self-Introduction / Identity
    # ─────────────────────────────────────────────────────────────────────────
    if any(q in msg_lower for q in [
        "introduce yourself", "who are you", "what can you do", "tell me about yourself", 
        "introduce", "hello voice agent", "hi voice agent", "voice agent", "your capabilities"
    ]):
        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user asked you to introduce yourself.
Introduce yourself warmly as ExpensePilot AI. Give a genuine, engaging overview of your capabilities (voice interaction, live expense tracking, invoice auditing, roadmap PDF generation, what-if budget simulations). Mention their current month spending status naturally with exact figures. Keep it warm, concise, and authentic."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            summary = await tool_get_monthly_spending(db, user_id, curr_month)
            ai_reply = (
                "🎙️ **Hello! I'm ExpensePilot Voice AI** — Your Autonomous Financial Copilot 🚀\n\n"
                f"I'm here to actively protect your money and guide your spending. For **{curr_month}**, you've spent ₹{summary['total_spent']:,.0f} of your ₹{summary['total_budget']:,.0f} budget.\n\n"
                "• 🗣️ **Voice & Natural Chat**: Speak or text me your daily expenses\n"
                "• 📑 **Invoice Auditing**: Upload receipts via the paperclip for automatic audit\n"
                "• 🗺️ **PDF Roadmap**: Generate an executive 90-day financial roadmap\n"
                "• 🔮 **What-If Simulations**: Test big purchases before making them\n\n"
                "How can I assist you right now?"
            )
        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "agent_self_introduction",
            "tool_result": {"status": "active"},
            "suggested_actions": [
                "Talk about my uploaded invoices",
                "Create PDF roadmap and give it to me",
                "How much can I spend per day?",
                "Predict my monthly spending"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 0b. Spreadsheet / Excel Upload Guidance & Troubleshooting
    # ─────────────────────────────────────────────────────────────────────────
    if any(q in msg_lower for q in [
        "failed to import", "import error", "excel sheet", "excel import", "excel error",
        "upload csv", "upload excel", "import csv", "import excel", "spreadsheet", 
        "upload file", "how to upload", "upload expenses", "import expenses",
        "not taking excel", "not accepting excel", "excel files", "excel file", 
        "excel upload", "excel nahi", "file nahi le raha"
    ]):
        prompt = f"""{SYSTEM_PERSONA}
The user is asking about or troubleshooting an Excel / CSV spreadsheet upload (e.g. reporting that it's not taking excel files, or asking how to import).
Respond warmly, authentically, and clearly in the user's language (Hindi/Hinglish if they asked in Hindi/Hinglish, otherwise English):
1. Reassure them that Excel (.xlsx, .xls, .xlsm) and CSV files are 100% fully supported.
2. Explain that the system now features automatic smart-detection:
   - Bank statements (SBI, HDFC, ICICI, Axis, Paytm, etc.) are automatically parsed, even with bank headers at the top and separate Debit/Credit columns!
   - Indian currency signs (₹, Rs., /-), commas, and negative debits are auto-cleaned.
   - Excel dates (serial numbers, DD/MM/YYYY, YYYY-MM-DD, timestamps) are auto-converted.
   - Column order does not matter; it automatically infers Date, Amount, and Description.
3. Tell them how to upload right now:
   - Click the Paperclip (📎) icon right here at the bottom of this chat.
   - Or drag and drop the Excel file directly into this chat window.
   - Or go to the Expenses / Transactions tab and click 'Import CSV'.
Keep your reply structured, respectful, and genuinely helpful."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = (
                "📊 **Excel & CSV Spreadsheet Upload Guide:**\n\n"
                "Aapki Excel file bilkul support hoti hai! System mein ab **Smart Auto-Detection** active hai:\n\n"
                "1. 📎 **Directly in this Chat**: Click the **Paperclip (📎)** icon below or drag & drop your `.xlsx`, `.xls`, or `.csv` file directly into this chat.\n"
                "2. 📋 **From Expenses Tab**: Go to the **Expenses** tab and click the **'Import CSV'** button.\n\n"
                "✨ **Ab sab kuch automatically handle hota hai:**\n"
                "• **Bank Statements**: SBI, HDFC, ICICI, Axis ke statements automatically parse ho jayenge (chahe Debit aur Credit separate columns mein ho).\n"
                "• **Currency**: ₹ symbols, commas (`1,500`), aur `/-` automatically clean ho jayenge.\n"
                "• **Dates**: `DD/MM/YYYY`, `YYYY-MM-DD`, ya Excel date numbers sab detect ho jate hain.\n"
                "• **Columns**: Bas Date, Amount (ya Debit), aur Description hone chahiye (kisi bhi order mein).\n\n"
                "Kripya apni Excel file dobara attach karein, main turant import karke aapke transactions add kar dunga! 🚀"
            )
        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "agent_upload_guidance",
            "tool_result": {"status": "ready", "supported_formats": [".xlsx", ".xls", ".xlsm", ".csv"]},
            "suggested_actions": [
                "How much did I spend this month?",
                "Detect unusual expenses",
                "Create PDF roadmap and give it to me"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 0c. Uploaded Invoices Discussion
    # ─────────────────────────────────────────────────────────────────────────
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
        inv_summary = "\n".join([f"- {inv.get('vendor')}: ₹{inv.get('amount', 0):,.2f} on {inv.get('date')} [{inv.get('category')}]{' (FLAGGED ANOMALY: ' + inv.get('anomaly_reason') + ')' if inv.get('is_anomaly') else ''}" for inv in invoices[:5]])

        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user wants to discuss their uploaded invoices and receipts.
Here is the real invoice data from the database:
Total recorded invoices: {len(invoices)}, totaling ₹{total_inv_amt:,.2f}.
Recent invoices:
{inv_summary}

Anomalies flagged: {len(anomalous_invoices)} invoice(s).
Give an authentic, sharp invoice audit recap with exact figures. Highlight any anomalies (e.g. high price flags) and explain whether their business/personal expenses look sound and tax-deductible."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            reply_lines = [
                f"📑 **Uploaded Invoices & Liabilities Audit**",
                f"Found **{len(invoices)} recorded invoices** totaling **₹{total_inv_amt:,.2f}** for your account.\n"
            ]
            for inv in invoices[:5]:
                status_emoji = "⚠️" if inv.get("is_anomaly") else "✅"
                reply_lines.append(f"{status_emoji} **{inv.get('vendor', 'Merchant')}**: ₹{inv.get('amount', 0):,.2f} on {inv.get('date')} [{inv.get('category')}]")
                if inv.get("is_anomaly"):
                    reply_lines.append(f"   └ 🚨 *Audit Flag*: {inv.get('anomaly_reason')}")
            ai_reply = "\n".join(reply_lines)

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
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

    # ─────────────────────────────────────────────────────────────────────────
    # 0d. Financial Roadmap & PDF Generation
    # ─────────────────────────────────────────────────────────────────────────
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

        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user asked for their 90-day Financial Roadmap and PDF report.
Their current financial health score is {health_score}/100.
Current Outflow: ₹{total_spent:,.2f} of ₹{total_budget:,.2f}.
Briefly outline the 3 phases:
- Phase 1 (Days 1-30): Runway defense and tightening discretionary leaks
- Phase 2 (Days 31-60): Run-rate realignment and emergency reserves
- Phase 3 (Days 61-90): Wealth acceleration towards target savings
Reassure them that the official printable PDF report has been compiled and is ready for download right below."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = (
                f"🗺️ **ExpensePilot 90-Day Financial Roadmap**\n\n"
                f"• **Financial Health Score**: **{health_score}/100**\n"
                f"• **Current Outflow**: ₹{total_spent:,.0f} of ₹{total_budget:,.0f}\n"
                f"• **Projected 90-Day Capital Preserved**: **+₹15,000**\n\n"
                f"**Execution Phases:**\n"
                f"1. **Phase 1 (Days 1–30)**: Cap discretionary velocity to ₹150/day and enforce 48-hour cool-off.\n"
                f"2. **Phase 2 (Days 31–60)**: Envelope budgeting on Food & Groceries; build ₹9,500 emergency buffer.\n"
                f"3. **Phase 3 (Days 61–90)**: Accelerate savings goal and maintain burn rate <85%.\n\n"
                f"📄 **Your PDF Document is Ready!** Tap the download button below:"
            )

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
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

    # ─────────────────────────────────────────────────────────────────────────
    # 0e. AI Spending Risk Prediction & Runway Assessment
    # ─────────────────────────────────────────────────────────────────────────
    if any(q in msg_lower for q in [
        "risk", "risk predictor", "risk analysis", "risk score", "predict risk",
        "kab tak chalega", "runway", "exhaustion", "burn velocity", "khatam ho jayega",
        "spending risk", "financial risk", "risk prediction"
    ]):
        from backend.app.services.risk_predictor import calculate_ai_risk_prediction
        risk_data = await calculate_ai_risk_prediction(db, user_id, curr_month)
        ai_assess = risk_data.get("ai_assessment", {})
        
        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user is asking about their Financial Spending Risk Prediction and budget runway.
Ground Truth Multi-Factor Risk Assessment Metrics:
- Calculated Risk Score: {risk_data.get('risk_score')}/100 ({risk_data.get('risk_level')} Risk)
- Burn Velocity: {risk_data.get('velocity_ratio')}x safe linear burn rate
- Exhaustion Runway Status: {risk_data.get('exhaustion_status')}
- Safe Daily Remaining Target: ₹{risk_data.get('safe_daily_allowance'):,.2f}/day
- Actual Daily Average Burn: ₹{risk_data.get('actual_daily_avg'):,.2f}/day
- Projected Month-End Overrun: ₹{risk_data.get('projected_overrun'):,.2f}
- Key Risk Factors: {', '.join([f['factor'] + ' (' + f['impact'] + ')' for f in risk_data.get('risk_factors', [])])}
- AI Recommendations: {'; '.join(ai_assess.get('top_recommendations', []))}

Present an authoritative, empathetic, and scannable breakdown:
1. State the exact Risk Score ({risk_data.get('risk_score')}/100) and Level.
2. Clearly explain the exhaustion runway (e.g. will the budget last or when it runs out).
3. Compare their current daily burn (₹{risk_data.get('actual_daily_avg'):,.0f}/day) against safe daily allowance (₹{risk_data.get('safe_daily_allowance'):,.0f}/day).
4. Give 3 concrete, realistic action steps to de-risk their finances immediately.
Match the user's language (natural Hinglish if they spoke in Hindi/Hinglish, otherwise English)."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = (
                f"🚨 **ExpensePilot AI Spending Risk Assessment**\n\n"
                f"• **Risk Score**: **{risk_data.get('risk_score')}/100** ({risk_data.get('risk_level')} Risk)\n"
                f"• **Burn Velocity**: **{risk_data.get('velocity_ratio')}x** of safe pace\n"
                f"• **Runway Status**: {risk_data.get('exhaustion_status')}\n"
                f"• **Safe Daily Target**: **₹{risk_data.get('safe_daily_allowance'):,.0f}/day** (Current: ₹{risk_data.get('actual_daily_avg'):,.0f}/day)\n\n"
                f"🎯 **Actionable Mitigation Countermeasures:**\n"
                + "\n".join([f"• {r}" for r in ai_assess.get('top_recommendations', [
                    f"Cap daily spend to ₹{risk_data.get('safe_daily_allowance'):,.0f}/day",
                    "Freeze discretionary dining & entertainment orders",
                    "Audit top expense categories"
                ])])
            )

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "predict_spending_risk",
            "tool_result": {
                "risk_score": risk_data.get("risk_score"),
                "risk_level": risk_data.get("risk_level"),
                "exhaustion_status": risk_data.get("exhaustion_status"),
                "safe_daily_allowance": risk_data.get("safe_daily_allowance")
            },
            "suggested_actions": [
                "How much did I spend this month?",
                "Simulate what-if purchase",
                "Create PDF roadmap and give it to me",
                "Detect unusual expenses"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 0f. Phone Number Connection / Dispatch
    # ─────────────────────────────────────────────────────────────────────────
    is_phone_add = any(q in msg_lower for q in [
        "add my number", "add number", "connect my phone", "connect phone", "connect my number",
        "pair my phone", "pair phone", "register my phone", "register phone", "save my number",
        "save phone", "my number is", "my phone number is", "update my phone", "set my phone"
    ]) or (any(w in msg_lower for w in ["phone", "number"]) and any(w in msg_lower for w in ["add", "connect", "pair", "register", "save", "update", "set"]))
    
    phone_match = re.search(r'(\+?\d[\d\s\-]{8,14}\d)', message)
    if is_phone_add and phone_match:
        from backend.app.services.messaging import update_phone_settings, dispatch_phone_message
        raw_num = phone_match.group(1).strip()
        clean_digits = re.sub(r'\D', '', raw_num)
        formatted_phone = f"+91 {clean_digits[:5]} {clean_digits[5:]}" if len(clean_digits) == 10 and not raw_num.startswith('+') else raw_num

        await update_phone_settings(db, user_id, {"phone_number": formatted_phone})
        welcome_text = f"ExpensePilot AI Connected! Your phone ({formatted_phone}) is paired with your autonomous financial copilot."
        dispatched = await dispatch_phone_message(
            db=db, user_id=user_id, phone_number=formatted_phone,
            message_type="PHONE_CONNECTED", channel="SMS", content=welcome_text
        )

        reply = (
            f"✅ **Phone Number Paired & Connected!**\n\n"
            f"• **Mobile**: `{formatted_phone}`\n"
            f"• **Channel**: **SMS & WhatsApp**\n"
            f"• **Status**: Active (Dispatch ID: `{dispatched['dispatch_id']}`)\n\n"
            f"You will now receive automatic evening spending digests, anomaly alerts, and roadmap links on your phone."
        )
        return {
            "reply": reply,
            "voice_text": f"Your phone number {formatted_phone} has been paired successfully.",
            "tool_called": "connect_phone_number",
            "tool_result": {"phone_number": formatted_phone, "status": "connected"},
            "suggested_actions": [
                "Send daily summary to my phone",
                "Create PDF roadmap and give it to me",
                "How much can I spend per day?"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Natural Language Expense Addition
    # ─────────────────────────────────────────────────────────────────────────
    extracted_items = extract_natural_language_expenses(message)
    if extracted_items and any(w in msg_lower for w in ["spent", "bought", "paid", "record", "add", "yesterday", "today", "₹", "kharch", "diye"]):
        added_records = []
        for item in extracted_items:
            rec = await tool_add_expense(
                db=db, user_id=user_id,
                amount=item["amount"], category=item["category"],
                description=item["description"], date_str=item["date"]
            )
            added_records.append(rec)

        b_info = await tool_calculate_remaining_budget(db, user_id, curr_month)
        added_txt = ", ".join([f"₹{r['amount']:,.2f} for {r['description']} ({r['category']})" for r in added_records])

        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

ACTION TAKEN BY SYSTEM:
Successfully recorded {len(added_records)} expense(s): {added_txt}.
Updated Budget Status: Total spent is now ₹{b_info['total_spent']:,.2f} of ₹{b_info['total_budget']:,.2f} ({b_info['percentage_used']}% consumed). Remaining budget: ₹{b_info['remaining_budget']:,.2f} with {b_info['days_remaining']} days left in {curr_month}.

Confirm the recorded transaction with exact amounts. State the new exact total spent and remaining budget clearly. Give candid, practical advice on remaining days."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = (
                f"✅ **Recorded {len(added_records)} expense(s) successfully!**\n\n"
                f"• {added_txt}\n\n"
                f"📊 **Updated Status**: ₹{b_info['total_spent']:,.2f} spent of ₹{b_info['total_budget']:,.2f} budget ({b_info['percentage_used']}% used).\n"
                f"💡 Remaining safe allowance: **₹{b_info['remaining_budget']:,.2f}** (₹{b_info['daily_budget_remaining']:,.2f}/day for remaining {b_info['days_remaining']} days)."
            )

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "add_expense",
            "tool_result": added_records,
            "structured_expenses_added": added_records,
            "suggested_actions": [
                "How much can I spend per day?",
                "Predict my monthly spending",
                "Where did most of my money go?"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Purchase Affordability ("Can I afford ₹...", "What if I spend...")
    # ─────────────────────────────────────────────────────────────────────────
    afford_match = re.search(r'(?:can i afford|what if i spend|what happens if i spend|kya me le sakta hu|kya me afford kar sakta hu)\s*(?:a|an)?\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)\s*(?:on\s+([a-zA-Z\s]+))?', msg_lower)
    if afford_match:
        amt = float(afford_match.group(1))
        cat = afford_match.group(2) or "General"
        sim_res = await tool_simulate_what_if(
            db=db, user_id=user_id,
            upcoming_purchase_amount=amt, month_str=curr_month
        )
        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user is asking: Can I afford a purchase of ₹{amt:,.2f} on {cat}?
Mathematical simulation result:
- Current spend: ₹{sim_res['current_total_spend']:,.2f}
- Spend after purchase: ₹{sim_res['projected_new_total']:,.2f} of budget ₹{sim_res['monthly_budget']:,.2f}
- Revised remaining budget: ₹{sim_res['new_remaining_budget']:,.2f}
- Revised daily allowance: ₹{sim_res['new_daily_safe_target']:,.2f}/day
- Can comfortably afford: {sim_res.get('can_afford')}

Give a candid, authentic, and empathetic answer. Directly answer Yes or No first with warmth, explain the exact math and numbers, and give a realistic recommendation."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = sim_res["advice"]

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "simulate_what_if",
            "tool_result": sim_res,
            "suggested_actions": [
                "What if I reduce shopping expenses by 20%?",
                "How much did I spend this month?",
                "Predict my monthly spending"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Category Reduction Simulation ("reduce shopping by 20%")
    # ─────────────────────────────────────────────────────────────────────────
    whatif_match = re.search(r'reduce\s+([a-zA-Z]+)(?:\s+spending|\s+expenses)?\s+by\s+(\d+(?:\.\d{1,2})?)%', msg_lower)
    if whatif_match:
        cat_name = whatif_match.group(1).capitalize()
        pct = float(whatif_match.group(2))
        sim_res = await tool_simulate_what_if(
            db=db, user_id=user_id,
            category=cat_name, percent_reduction=pct, month_str=curr_month
        )
        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user wants to simulate reducing {cat_name} expenses by {pct}%.
Simulation calculations:
- Historical {cat_name} spend: ₹{sim_res.get('category_spend', 0):,.2f}
- Estimated monthly savings: ₹{sim_res.get('monthly_savings', 0):,.2f}
- Annualized savings: ₹{sim_res.get('annualized_savings', 0):,.2f}
Explain these exact savings numbers in an authentic, motivating way with real-world examples."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = sim_res["advice"]

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "simulate_what_if",
            "tool_result": sim_res,
            "suggested_actions": [
                "I want to save ₹5,000 in the next 3 months",
                "Can I afford a ₹1,500 purchase?",
                "Where did most of my money go?"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Savings Goal Planning ("save 5000 in 3 months")
    # ─────────────────────────────────────────────────────────────────────────
    save_match = re.search(r'save\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)\s*(?:in|over)?\s*(?:the next)?\s*(\d+)?\s*(?:months)?', msg_lower)
    if save_match and "save" in msg_lower and any(c.isdigit() for c in msg_lower):
        target = float(save_match.group(1))
        months = int(save_match.group(2)) if save_match.group(2) else 3
        plan = await tool_create_saving_plan(
            db=db, user_id=user_id,
            target_amount=target, months=months,
            title=f"Goal: ₹{target:,.0f} in {months}m"
        )
        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user set a savings goal: Target ₹{target:,.2f} over {months} months.
Monthly savings target: ₹{plan['monthly_target']:,.2f}/month (~₹{plan['daily_target']:,.2f}/day).
Specific suggestions generated: {json.dumps(plan['suggestions'])}.

Give an encouraging, structured, and realistic roadmap on how they can hit this goal by trimming discretionary spend."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = (
                f"🎯 **Personalized Saving Plan Created!**\n\n"
                f"To accumulate **₹{target:,.2f}** over **{months} months**, your target is **₹{plan['monthly_target']:,.2f}/month** (approx. ₹{plan['daily_target']:,.2f}/day).\n\n"
                f"I have registered this goal in your Savings Planner!"
            )

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "create_saving_plan",
            "tool_result": plan,
            "suggested_actions": [
                "How much can I spend per day?",
                "Where did most of my money go?",
                "Predict my monthly spending"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Core Financial Diagnostics & Dynamic LLM Response Loop
    # ─────────────────────────────────────────────────────────────────────────
    # Identify diagnostic tool to run in parallel
    tool_called = "financial_advisor"
    tool_result = None

    is_complete_data_req = any(q in msg_lower for q in [
        "complete data", "pura data", "poora data", "sahi data", "all data", "full report",
        "detailed data", "breakdown", "all expenses", "saare kharche", "complete breakdown"
    ])

    if any(q in msg_lower for q in ["where did most of my money go", "biggest expense", "category breakdown", "top category", "highest expense", "kaha gaya paisa", "categories", "breakdown"]):
        tool_called = "get_category_breakdown"
        tool_result = await tool_get_category_breakdown(db, user_id, curr_month)
    elif any(q in msg_lower for q in ["how much did i spend", "how much spent", "total spend", "spending this month", "my expenses", "kitna kharcha", "kitna bacha", "budget status"]):
        tool_called = "get_monthly_spending"
        tool_result = await tool_get_monthly_spending(db, user_id, curr_month)
    elif any(q in msg_lower for q in ["how much can i spend per day", "daily budget", "daily limit", "spend per day", "daily allowance", "roz ka kharcha"]):
        tool_called = "calculate_remaining_budget"
        tool_result = await tool_calculate_remaining_budget(db, user_id, curr_month)
    elif any(q in msg_lower for q in ["predict", "forecast", "future expense", "projection", "estimated month-end", "aage ka kharcha"]):
        tool_called = "predict_monthly_spending"
        tool_result = await tool_predict_monthly_spending(db, user_id, curr_month)
    elif any(q in msg_lower for q in ["unusual", "suspicious", "anomal", "outlier", "high expense", "weird"]):
        tool_called = "detect_unusual_expenses"
        tool_result = await tool_detect_unusual_expenses(db, user_id, curr_month)
    elif is_complete_data_req:
        tool_called = "get_monthly_spending"
        tool_result = await tool_get_monthly_spending(db, user_id, curr_month)

    # Prompt Groq LLM with full financial ground truth
    completeness_instruction = ""
    if is_complete_data_req or tool_called in ("get_category_breakdown", "get_monthly_spending"):
        completeness_instruction = """
CRITICAL REQUIREMENT:
The user wants COMPLETE, EXACT, UNCOMPROMISED DATA.
- You MUST render a clear, organized Markdown Table displaying EVERY SINGLE CATEGORY from the context with exact Spent amounts, %, Txn count, Budget limit, and Over/Under status.
- State the exact Total Spent, Total Budget, whether they are Over/Under budget (and by exactly how much in ₹), Days Remaining, and Daily Average.
- Mention any flagged anomalies clearly.
- Do NOT skip or abbreviate any categories."""

    prompt = f"""{SYSTEM_PERSONA}
{fin_context}

{completeness_instruction}

Specific Diagnostic Data ({tool_called}):
{json.dumps(tool_result, default=str) if tool_result else 'General financial query'}

User Question: "{message}".
Respond with complete, 100% accurate, and authentic figures matching the ground truth above."""

    ai_reply = await call_llm_authentically(prompt, message, temperature=0.35, max_tokens=1000)

    if not ai_reply:
        # Graceful template fallback if network/LLM is temporarily offline
        summary = await tool_get_monthly_spending(db, user_id, curr_month)
        b_info = await tool_calculate_remaining_budget(db, user_id, curr_month)
        ai_reply = (
            f"📊 **Monthly Status for {curr_month}:**\n\n"
            f"• **Total Spent**: ₹{summary['total_spent']:,.2f}\n"
            f"• **Monthly Budget**: ₹{summary['total_budget']:,.2f}\n"
            f"• **Remaining**: ₹{summary['remaining_budget']:,.2f} ({summary['percentage_used']}% used)\n"
            f"• **Safe Daily Target**: ₹{b_info['daily_budget_remaining']:,.2f}/day ({b_info['days_remaining']} days left)\n"
            f"• **Top Category**: {summary['top_category']} (₹{summary['top_category_amount']:,.2f})\n"
        )

    return {
        "reply": ai_reply,
        "voice_text": strip_markdown_for_speech(ai_reply)[:280],
        "tool_called": tool_called,
        "tool_result": tool_result,
        "suggested_actions": [
            "How much did I spend this month?",
            "Where did most of my money go?",
            "Can I afford a ₹1,000 purchase?",
            "Predict my monthly spending"
        ]
    }
