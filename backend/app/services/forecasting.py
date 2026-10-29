from datetime import datetime, date
from typing import Dict, Any, List
from backend.app.services.analytics import get_month_dates

async def forecast_monthly_spending(db, user_id: str, month_str: str) -> Dict[str, Any]:
    start_date, end_date, num_days = await get_month_dates(month_str)

    cursor = db.expenses.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }).sort("date", 1)
    expenses = await cursor.to_list(length=2000)

    # Get budget
    budget_obj = await db.budgets.find_one({"user_id": user_id, "month": month_str})
    monthly_budget = float(budget_obj.get("total_budget", 15000.0)) if budget_obj else 15000.0

    today = datetime.utcnow()
    curr_ym = today.strftime("%Y-%m")
    
    if month_str == curr_ym:
        days_elapsed = min(today.day, num_days)
    elif month_str < curr_ym:
        days_elapsed = num_days
    else:
        days_elapsed = 1

    days_remaining = max(0, num_days - days_elapsed)
    total_spent_so_far = sum(float(e.get("amount", 0.0)) for e in expenses)

    # Breakdown weekday vs weekend
    weekday_amounts = []
    weekend_amounts = []
    daily_spend_map: Dict[str, float] = {}

    for e in expenses:
        d = e.get("date", "")
        daily_spend_map[d] = daily_spend_map.get(d, 0.0) + float(e.get("amount", 0.0))

    year, month = map(int, month_str.split("-"))
    for d in range(1, days_elapsed + 1):
        d_str = f"{year:04d}-{month:02d}-{d:02d}"
        amt = daily_spend_map.get(d_str, 0.0)
        dt = date(year, month, d)
        if dt.weekday() >= 5:  # Saturday or Sunday
            weekend_amounts.append(amt)
        else:
            weekday_amounts.append(amt)

    avg_weekday = sum(weekday_amounts) / max(1, len(weekday_amounts)) if weekday_amounts else (total_spent_so_far / max(1, days_elapsed))
    avg_weekend = sum(weekend_amounts) / max(1, len(weekend_amounts)) if weekend_amounts else (avg_weekday * 1.35)

    # Count remaining weekdays and weekend days
    remaining_weekdays = 0
    remaining_weekends = 0
    for d in range(days_elapsed + 1, num_days + 1):
        dt = date(year, month, d)
        if dt.weekday() >= 5:
            remaining_weekends += 1
        else:
            remaining_weekdays += 1

    # Weighted projection considering weekday vs weekend patterns
    projected_additional = (remaining_weekdays * avg_weekday) + (remaining_weekends * avg_weekend)
    projected_total = round(total_spent_so_far + projected_additional, 2)
    
    # Confidence range (±10%)
    lower_estimate = round(projected_total * 0.92, 2)
    upper_estimate = round(projected_total * 1.08, 2)

    diff_from_budget = projected_total - monthly_budget
    is_projected_over = diff_from_budget > 0
    safe_daily_target = (monthly_budget - total_spent_so_far) / max(1, days_remaining) if days_remaining > 0 else 0.0

    # Trajectory chart points (day 1 to num_days)
    cumulative_actual = 0.0
    trajectory = []
    
    for d in range(1, num_days + 1):
        d_str = f"{year:04d}-{month:02d}-{d:02d}"
        dt = date(year, month, d)
        is_past_or_today = (d <= days_elapsed)
        
        if is_past_or_today:
            cumulative_actual += daily_spend_map.get(d_str, 0.0)
            trajectory.append({
                "day": d,
                "date": d_str,
                "actual": round(cumulative_actual, 2),
                "projected": round(cumulative_actual, 2),
                "budget_linear": round((monthly_budget / num_days) * d, 2),
            })
        else:
            # extrapolate
            step_rate = avg_weekend if dt.weekday() >= 5 else avg_weekday
            cumulative_actual += step_rate
            trajectory.append({
                "day": d,
                "date": d_str,
                "actual": None,
                "projected": round(cumulative_actual, 2),
                "budget_linear": round((monthly_budget / num_days) * d, 2),
            })

    status = "exceeded" if total_spent_so_far > monthly_budget else ("warning" if is_projected_over else "healthy")

    summary_text = (
        f"Based on your daily average of ₹{round(total_spent_so_far / max(1, days_elapsed), 0):,.0f} "
        f"(weekdays: ₹{round(avg_weekday, 0):,.0f}, weekends: ₹{round(avg_weekend, 0):,.0f}), "
        f"your estimated month-end spending is ₹{projected_total:,.0f}."
    )
    if is_projected_over:
        summary_text += f" ⚠️ You may exceed your ₹{monthly_budget:,.0f} budget by approximately ₹{diff_from_budget:,.0f}."
    else:
        summary_text += f" ✅ You are projected to finish with ₹{abs(diff_from_budget):,.0f} under budget."

    return {
        "month": month_str,
        "monthly_budget": monthly_budget,
        "total_spent_so_far": round(total_spent_so_far, 2),
        "projected_total": projected_total,
        "projected_range": {"min": lower_estimate, "max": upper_estimate},
        "diff_from_budget": round(diff_from_budget, 2),
        "is_projected_over": is_projected_over,
        "safe_daily_target": max(0.0, round(safe_daily_target, 2)),
        "current_daily_avg": round(total_spent_so_far / max(1, days_elapsed), 2),
        "avg_weekday": round(avg_weekday, 2),
        "avg_weekend": round(avg_weekend, 2),
        "days_elapsed": days_elapsed,
        "days_remaining": days_remaining,
        "status": status,
        "trajectory": trajectory,
        "summary_text": summary_text
    }
