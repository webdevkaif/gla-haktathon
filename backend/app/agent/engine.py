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

    # 10. General Conversational / Gemini integration
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
