from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from backend.app.models import Expense, SavingGoal, serialize_docs
from backend.app.services.analytics import get_monthly_summary
from backend.app.services.anomaly import check_expense_anomaly, audit_and_generate_alerts
from backend.app.services.forecasting import forecast_monthly_spending
from backend.app.services.simulator import run_what_if_simulation

CATEGORY_KEYWORD_MAP = {
    "food": ["food", "lunch", "dinner", "breakfast", "cafe", "restaurant", "burger", "pizza", "coffee", "tea", "swiggy", "zomato", "snacks", "momos", "dosa", "biryani", "drinks"],
    "transportation": ["transport", "transportation", "petrol", "diesel", "fuel", "uber", "ola", "auto", "metro", "cab", "bus", "train", "flight", "taxi", "toll", "parking"],
    "groceries": ["grocery", "groceries", "supermarket", "blinkit", "zepto", "instamart", "milk", "vegetables", "fruits", "bread", "ration", "pantry"],
    "shopping": ["shopping", "clothes", "shoes", "amazon", "flipkart", "myntra", "zara", "electronics", "gadget", "watch", "shirt", "pants", "dress"],
    "entertainment": ["entertainment", "movie", "cinema", "theatre", "netflix", "spotify", "prime", "concert", "game", "hotstar"],
    "utilities": ["utilities", "utility", "wifi", "broadband", "electricity", "water", "gas", "cylinder", "recharge", "phone bill"],
    "healthcare": ["healthcare", "health", "medicine", "pharmacy", "doctor", "hospital", "clinic", "tests", "meds", "dental"],
    "education": ["books", "course", "tuition", "stationery", "udemy", "class"]
}

def auto_categorize(text: str) -> str:
    """Classifies expense text into standard categories with keyword heuristics."""
    lowered = text.lower()
    for cat, keywords in CATEGORY_KEYWORD_MAP.items():
        if any(kw in lowered for kw in keywords):
            return cat.capitalize()
    return "Miscellaneous"

async def tool_add_expense(
    db,
    user_id: str,
    amount: float,
    category: Optional[str],
    description: str,
    date_str: Optional[str] = None,
    payment_method: Optional[str] = "Unknown"
) -> Dict[str, Any]:
    """Adds a validated expense record to MongoDB and checks for anomalies."""
    if not date_str or date_str.lower() in ["today", "now"]:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
    elif date_str.lower() == "yesterday":
        date_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")

    cat = (category.capitalize() if category and category.strip() else auto_categorize(description))

    # Anomaly detection
    is_unusual, reason = await check_expense_anomaly(db, user_id, amount, cat)

    doc = Expense.create(
        user_id=user_id,
        amount=round(float(amount), 2),
        category=cat,
        description=description,
        date=date_str,
        payment_method=payment_method or "Unknown",
        is_unusual=is_unusual,
        anomaly_reason=reason
    )
    res = await db.expenses.insert_one(doc)
    doc_id = str(res.inserted_id)
    await db.expenses.update_one({"_id": res.inserted_id}, {"$set": {"id": doc_id}})

    # Re-audit alerts
    month_str = date_str[:7]
    await audit_and_generate_alerts(db, user_id, month_str)

    return {
        "id": doc_id,
        "amount": doc["amount"],
        "category": doc["category"],
        "description": doc["description"],
        "date": doc["date"],
        "payment_method": doc["payment_method"],
        "is_unusual": doc["is_unusual"],
        "anomaly_reason": doc["anomaly_reason"]
    }

async def tool_get_monthly_spending(db, user_id: str, month_str: Optional[str] = None) -> Dict[str, Any]:
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    summary = await get_monthly_summary(db, user_id, month_str)
    return summary

async def tool_get_category_breakdown(db, user_id: str, month_str: Optional[str] = None) -> Dict[str, Any]:
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    summary = await get_monthly_summary(db, user_id, month_str)
    return {
        "month": month_str,
        "categories": summary["categories"],
        "top_category": summary["top_category"],
        "top_category_amount": summary["top_category_amount"],
        "total_spent": summary["total_spent"]
    }

async def tool_calculate_remaining_budget(db, user_id: str, month_str: Optional[str] = None) -> Dict[str, Any]:
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    summary = await get_monthly_summary(db, user_id, month_str)
    return {
        "month": month_str,
        "total_budget": summary["total_budget"],
        "total_spent": summary["total_spent"],
        "remaining_budget": summary["remaining_budget"],
        "percentage_used": summary["percentage_used"],
        "days_remaining": summary["days_remaining"],
        "daily_budget_remaining": summary["daily_budget_remaining"]
    }

async def tool_predict_monthly_spending(db, user_id: str, month_str: Optional[str] = None) -> Dict[str, Any]:
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    return await forecast_monthly_spending(db, user_id, month_str)

async def tool_detect_unusual_expenses(db, user_id: str, month_str: Optional[str] = None) -> List[Dict[str, Any]]:
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    start_date = f"{month_str}-01"
    end_date = f"{month_str}-31"
    cursor = db.expenses.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lte": end_date},
        "is_unusual": True
    })
    records = await cursor.to_list(length=100)
    return [{
        "id": r.get("id", str(r.get("_id", ""))),
        "amount": r.get("amount", 0.0),
        "category": r.get("category", "General"),
        "description": r.get("description", ""),
        "date": r.get("date", ""),
        "reason": r.get("anomaly_reason", "Outlier")
    } for r in records]

async def tool_simulate_what_if(
    db,
    user_id: str,
    category: Optional[str] = None,
    percent_reduction: float = 0.0,
    upcoming_purchase_amount: float = 0.0,
    month_str: Optional[str] = None
) -> Dict[str, Any]:
    if not month_str:
        month_str = datetime.utcnow().strftime("%Y-%m")
    return await run_what_if_simulation(
        db=db,
        user_id=user_id,
        month_str=month_str,
        category=category,
        percent_reduction=percent_reduction,
        upcoming_purchase_amount=upcoming_purchase_amount
    )

async def tool_create_saving_plan(
    db,
    user_id: str,
    target_amount: float,
    months: int = 3,
    title: str = "Custom Savings Plan"
) -> Dict[str, Any]:
    month_str = datetime.utcnow().strftime("%Y-%m")
    summary = await get_monthly_summary(db, user_id, month_str)

    monthly_needed = round(target_amount / max(1, months), 2)
    daily_needed = round(monthly_needed / 30.0, 2)

    # Suggest trims from discretionary categories
    discretionary = ["shopping", "entertainment", "food"]
    suggestions = []
    
    total_trim_found = 0.0
    for cat_item in summary["categories"]:
        cat_name = cat_item["category"]
        amt = cat_item["amount"]
        if cat_name.lower() in discretionary and amt > 500:
            suggested_cut = min(amt * 0.25, monthly_needed * 0.5)
            suggestions.append({
                "category": cat_name,
                "current_spending": amt,
                "monthly_cut": round(suggested_cut, 2),
                "tip": f"Trim {cat_name} by 25% to free up ₹{suggested_cut:,.0f}/month"
            })
            total_trim_found += suggested_cut

    goal_doc = SavingGoal.create(
        user_id=user_id,
        title=title,
        target_amount=float(target_amount),
        current_saved=0.0,
        target_months=months,
        monthly_target=monthly_needed,
        category_suggestions=suggestions
    )
    res = await db.saving_goals.insert_one(goal_doc)
    goal_id = str(res.inserted_id)
    await db.saving_goals.update_one({"_id": res.inserted_id}, {"$set": {"id": goal_id}})

    return {
        "goal_id": goal_id,
        "title": title,
        "target_amount": target_amount,
        "months": months,
        "monthly_target": monthly_needed,
        "daily_target": daily_needed,
        "suggestions": suggestions,
        "plan_viable": total_trim_found >= (monthly_needed * 0.6)
    }
