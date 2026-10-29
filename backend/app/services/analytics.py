from datetime import datetime
import calendar
from typing import Dict, Any, List

async def get_month_dates(month_str: str):
    """month_str format: YYYY-MM"""
    year, month = map(int, month_str.split("-"))
    num_days = calendar.monthrange(year, month)[1]
    start_date = f"{month_str}-01"
    end_date = f"{month_str}-{num_days:02d}"
    return start_date, end_date, num_days

async def get_monthly_summary(db, user_id: str, month_str: str) -> Dict[str, Any]:
    start_date, end_date, num_days = await get_month_dates(month_str)
    
    # Query current month expenses from MongoDB
    cursor = db.expenses.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }).sort("date", -1)
    expenses = await cursor.to_list(length=2000)

    total_spent = sum(float(e.get("amount", 0.0)) for e in expenses)

    # Category breakdown
    category_totals: Dict[str, float] = {}
    category_counts: Dict[str, int] = {}
    for e in expenses:
        cat = e.get("category", "Miscellaneous")
        amt = float(e.get("amount", 0.0))
        category_totals[cat] = category_totals.get(cat, 0.0) + amt
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # Daily breakdown
    daily_totals: Dict[str, float] = {}
    for e in expenses:
        d = e.get("date", "")
        amt = float(e.get("amount", 0.0))
        daily_totals[d] = daily_totals.get(d, 0.0) + amt

    # Current budget for this month
    budget = await db.budgets.find_one({"user_id": user_id, "month": month_str})
    total_budget = float(budget.get("total_budget", 15000.0)) if budget else 15000.0

    # Calculate days elapsed in the month (capped at total days in month)
    today = datetime.utcnow()
    current_year_month = today.strftime("%Y-%m")
    
    if month_str == current_year_month:
        day_of_month = min(today.day, num_days)
    elif month_str < current_year_month:
        day_of_month = num_days
    else:
        day_of_month = 1

    days_remaining = max(0, num_days - day_of_month)
    daily_avg_so_far = total_spent / max(1, day_of_month)
    remaining_budget = max(0.0, total_budget - total_spent)
    daily_budget_remaining = remaining_budget / max(1, days_remaining) if days_remaining > 0 else 0.0
    percentage_used = round((total_spent / total_budget) * 100, 1) if total_budget > 0 else 0.0

    # Previous month comparison for explainable alerts
    prev_year = year = int(month_str.split("-")[0])
    prev_month = int(month_str.split("-")[1]) - 1
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1
    prev_month_str = f"{prev_year:04d}-{prev_month:02d}"
    prev_start, prev_end, _ = await get_month_dates(prev_month_str)

    prev_cursor = db.expenses.find({
        "user_id": user_id,
        "date": {"$gte": prev_start, "$lte": prev_end}
    })
    prev_expenses = await prev_cursor.to_list(length=2000)
    prev_total_spent = sum(float(e.get("amount", 0.0)) for e in prev_expenses)
    
    prev_cat_totals: Dict[str, float] = {}
    for e in prev_expenses:
        cat = e.get("category", "Miscellaneous")
        prev_cat_totals[cat] = prev_cat_totals.get(cat, 0.0) + float(e.get("amount", 0.0))

    # Category changes (MoM diff)
    category_diffs: List[Dict[str, Any]] = []
    for cat, curr_amt in sorted(category_totals.items(), key=lambda x: x[1], reverse=True):
        prev_amt = prev_cat_totals.get(cat, 0.0)
        diff = curr_amt - prev_amt
        pct_change = round((diff / prev_amt * 100), 1) if prev_amt > 0 else 100.0
        category_diffs.append({
            "category": cat,
            "current": curr_amt,
            "previous": prev_amt,
            "diff": round(diff, 2),
            "pct_change": pct_change
        })

    # Sort categories by spending
    sorted_categories = sorted(
        [{"category": k, "amount": round(v, 2), "count": category_counts[k]} for k, v in category_totals.items()],
        key=lambda x: x["amount"],
        reverse=True
    )

    top_category = sorted_categories[0]["category"] if sorted_categories else "None"
    top_category_amount = sorted_categories[0]["amount"] if sorted_categories else 0.0

    return {
        "month": month_str,
        "total_spent": round(total_spent, 2),
        "total_budget": round(total_budget, 2),
        "remaining_budget": round(remaining_budget, 2),
        "percentage_used": percentage_used,
        "days_elapsed": day_of_month,
        "days_remaining": days_remaining,
        "total_days": num_days,
        "daily_avg_spent": round(daily_avg_so_far, 2),
        "daily_budget_remaining": round(daily_budget_remaining, 2),
        "categories": sorted_categories,
        "top_category": top_category,
        "top_category_amount": top_category_amount,
        "previous_month": {
            "month": prev_month_str,
            "total_spent": round(prev_total_spent, 2),
            "diff_from_previous": round(total_spent - prev_total_spent, 2)
        },
        "category_diffs": category_diffs,
        "expense_count": len(expenses)
    }
