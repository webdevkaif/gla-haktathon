import numpy as np
from typing import Tuple, Optional, List, Dict, Any
from backend.app.models import Alert

async def check_expense_anomaly(
    db,
    user_id: str,
    amount: float,
    category: str
) -> Tuple[bool, Optional[str]]:
    """
    Evaluates whether an expense is statistically unusual.
    Returns (is_unusual, explanation).
    """
    # Fetch historical expenses in the same category from MongoDB
    cursor = db.expenses.find(
        {"user_id": user_id, "category": category},
        {"amount": 1}
    )
    docs = await cursor.to_list(length=1000)
    amounts = [float(d.get("amount", 0.0)) for d in docs]

    if len(amounts) >= 3:
        arr = np.array(amounts)
        mean = float(np.mean(arr))
        std = float(np.std(arr))

        # Check z-score threshold (mean + 2*std) with minimum multiplier of 2x
        threshold = max(mean + 2.0 * std, mean * 2.0)
        if amount > threshold:
            reason = (
                f"This ₹{amount:,.0f} {category} expense is {round(amount/mean, 1)}x higher "
                f"than your category average of ₹{mean:,.0f} (typical range: ₹{max(0, mean - std):,.0f}–₹{mean + std:,.0f})."
            )
            return True, reason

    # Fallback sanity check against monthly budget
    first_b = await db.budgets.find_one({"user_id": user_id}, sort=[("created_at", -1)])
    if first_b and "total_budget" in first_b:
        tot = float(first_b["total_budget"])
        if tot > 0 and amount >= (tot * 0.40):
            reason = f"This single expense of ₹{amount:,.0f} represents over 40% of your total monthly budget (₹{tot:,.0f})."
            return True, reason

    return False, None


async def audit_and_generate_alerts(db, user_id: str, month_str: str):
    """
    Runs automated health check and produces explainable alerts in the MongoDB alerts collection.
    """
    from backend.app.services.analytics import get_monthly_summary
    summary = await get_monthly_summary(db, user_id, month_str)

    alerts_to_add: List[Dict[str, Any]] = []
    pct_used = summary["percentage_used"]
    spent = summary["total_spent"]
    budget = summary["total_budget"]
    days_left = summary["days_remaining"]
    days_elapsed = summary["days_elapsed"]

    # 1. Budget Pace Alert
    expected_pace = (days_elapsed / summary["total_days"]) * 100 if summary["total_days"] > 0 else 50
    if pct_used > expected_pace + 15 and pct_used < 100:
        top_cat = summary["top_category"]
        top_amt = summary["top_category_amount"]
        actions = [
            f"Cap {top_cat} spending to ₹{max(100, int(top_amt * 0.2))} for the remaining {days_left} days",
            f"Limit daily discretionary spend to ₹{int(summary['daily_budget_remaining'])}/day",
            "Review recent subscriptions and delivery orders"
        ]
        alerts_to_add.append(Alert.create(
            user_id=user_id,
            type="pace_alert",
            severity="warning",
            title=f"⚠️ Accelerated Spending Pace ({pct_used}% used)",
            message=(
                f"You have consumed {pct_used}% of your monthly budget (₹{spent:,.0f} of ₹{budget:,.0f}) "
                f"with {days_left} days remaining. Your pace is ahead of schedule, largely driven by "
                f"{top_cat} (₹{top_amt:,.0f})."
            ),
            action_options=actions
        ))
    elif pct_used >= 100:
        over_by = spent - budget
        actions = [
            "Freeze non-essential purchases for the rest of this month",
            "Reallocate funds from planned savings",
            "Adjust next month's budget ceiling"
        ]
        alerts_to_add.append(Alert.create(
            user_id=user_id,
            type="budget_warning",
            severity="danger",
            title=f"🚨 Monthly Budget Exceeded by ₹{over_by:,.0f}",
            message=f"Total spending has reached ₹{spent:,.0f}, exceeding your ₹{budget:,.0f} target.",
            action_options=actions
        ))

    # 2. Check for unusual transactions in the month
    start_date = f"{month_str}-01"
    end_date = f"{month_str}-31"
    ue_cursor = db.expenses.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lte": end_date},
        "is_unusual": True
    }).limit(2)
    unusual_expenses = await ue_cursor.to_list(length=2)
    
    for ue in unusual_expenses:
        actions = [
            "Confirm as legitimate one-time expense",
            "Split into shared or business expense",
            "Update category"
        ]
        cat = ue.get("category", "General")
        amt = float(ue.get("amount", 0.0))
        desc = ue.get("description", "Transaction")
        reason = ue.get("anomaly_reason", "Significantly higher than category baseline.")
        alerts_to_add.append(Alert.create(
            user_id=user_id,
            type="unusual_expense",
            severity="warning",
            title=f"🔍 Unusual Transaction: ₹{amt:,.0f} ({cat})",
            message=f"{desc}: {reason}",
            action_options=actions
        ))

    # Commit any new alerts (avoiding duplicate unread alerts with same title)
    for a in alerts_to_add:
        chk = await db.alerts.find_one({
            "user_id": user_id,
            "title": a["title"],
            "is_read": False
        })
        if not chk:
            res = await db.alerts.insert_one(a)
            await db.alerts.update_one({"_id": res.inserted_id}, {"$set": {"id": str(res.inserted_id)}})
