from typing import Dict, Any, Optional
from backend.app.services.analytics import get_monthly_summary

async def run_what_if_simulation(
    db,
    user_id: str,
    month_str: str,
    category: Optional[str] = None,
    percent_reduction: float = 0.0,
    amount_reduction: float = 0.0,
    upcoming_purchase_amount: float = 0.0,
    upcoming_purchase_category: str = "General"
) -> Dict[str, Any]:
    summary = await get_monthly_summary(db, user_id, month_str)
    total_spent = summary["total_spent"]
    total_budget = summary["total_budget"]
    remaining_budget = summary["remaining_budget"]
    days_left = max(1, summary["days_remaining"])

    # 1. Purchase Affordability Simulation
    if upcoming_purchase_amount > 0:
        new_remaining = remaining_budget - upcoming_purchase_amount
        new_daily = max(0.0, new_remaining / days_left) if days_left > 0 else 0.0
        can_afford = new_remaining >= 0

        if can_afford:
            impact_status = "affordable"
            advice = (
                f"Yes, you can afford this ₹{upcoming_purchase_amount:,.0f} purchase within your ₹{total_budget:,.0f} budget. "
                f"Your remaining funds will reduce from ₹{remaining_budget:,.0f} to ₹{new_remaining:,.0f}. "
                f"To stay safely within budget, your daily limit for the remaining {days_left} days will adjust to ₹{new_daily:,.0f}/day."
            )
        else:
            deficit = abs(new_remaining)
            impact_status = "over_budget"
            advice = (
                f"⚠️ Caution: A purchase of ₹{upcoming_purchase_amount:,.0f} would exceed your remaining monthly budget "
                f"(₹{remaining_budget:,.0f}) by ₹{deficit:,.0f}. "
                f"Consider deferring to next month or trimming ₹{deficit:,.0f} from discretionary categories like Shopping or Dining."
            )

        return {
            "type": "purchase_affordability",
            "purchase_amount": upcoming_purchase_amount,
            "purchase_category": upcoming_purchase_category,
            "can_afford": can_afford,
            "remaining_budget_before": remaining_budget,
            "remaining_budget_after": round(new_remaining, 2),
            "new_daily_budget": round(new_daily, 2),
            "days_left": days_left,
            "impact_status": impact_status,
            "advice": advice
        }

    # 2. Category Spending Reduction Simulation
    target_cat = category or summary["top_category"]
    cat_item = next((c for c in summary["categories"] if c["category"].lower() == target_cat.lower()), None)
    historical_amount = cat_item["amount"] if cat_item else 0.0

    if percent_reduction > 0:
        savings = (percent_reduction / 100.0) * historical_amount
    elif amount_reduction > 0:
        savings = min(amount_reduction, historical_amount)
    else:
        # Default 20% demo
        percent_reduction = 20.0
        savings = 0.20 * historical_amount

    new_cat_spend = max(0.0, historical_amount - savings)
    new_total_spent = max(0.0, total_spent - savings)
    annualized_savings = savings * 12

    advice = (
        f"If you reduce your {target_cat} spending by {percent_reduction:.0f}% (from ₹{historical_amount:,.0f} down to ₹{new_cat_spend:,.0f}), "
        f"you will save approximately ₹{savings:,.0f} this month (₹{annualized_savings:,.0f} annualized!). "
        f"Your revised monthly total would drop from ₹{total_spent:,.0f} to ₹{new_total_spent:,.0f}."
    )

    return {
        "type": "category_reduction",
        "category": target_cat,
        "percent_reduction": percent_reduction,
        "historical_amount": round(historical_amount, 2),
        "projected_monthly_savings": round(savings, 2),
        "annualized_savings": round(annualized_savings, 2),
        "new_category_spending": round(new_cat_spend, 2),
        "new_total_spent": round(new_total_spent, 2),
        "advice": advice
    }
