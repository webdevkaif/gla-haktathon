import random
import math
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
import httpx
from backend.app.config import settings
from backend.app.services.analytics import get_month_dates, get_monthly_summary
from backend.app.services.forecasting import forecast_monthly_spending

async def generate_ai_risk_assessment(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calls Groq LLM (Qwen/GPT) to synthesize mathematical risk metrics
    into authoritative, authentic financial risk commentary and actionable mitigation steps.
    """
    groq_api_key = settings.GROQ_API_KEY
    if not groq_api_key or groq_api_key.strip() in ("", "your_groq_api_key_here"):
        # Fallback heuristic advice
        level = metrics.get("risk_level", "MODERATE")
        diff = metrics.get("projected_overrun", 0.0)
        daily = metrics.get("safe_daily_allowance", 0.0)
        
        if level in ("HIGH", "CRITICAL"):
            headline = f"⚠️ High Spending Acceleration Detected — Projected Overrun of ₹{diff:,.0f}"
            verdict = f"Your daily burn rate is {metrics.get('velocity_ratio', 1.0):.1f}x higher than safe allowance. Without immediate calibration, budget will deplete early."
            recs = [
                f"Cap non-essential daily spending to ₹{daily:,.0f}/day for remaining {metrics.get('days_remaining', 1)} days.",
                "Halt online discretionary shopping & entertainment orders until month end.",
                "Audit top spending categories to freeze recurring micro-transactions."
            ]
        elif level == "MODERATE":
            headline = f"⚡ Elevated Spending Velocity — Monitor Category Caps"
            verdict = f"Spending is slightly elevated ({metrics.get('velocity_ratio', 1.0):.1f}x velocity). Safe buffer exists if daily limit of ₹{daily:,.0f}/day is respected."
            recs = [
                f"Maintain daily spend below ₹{daily:,.0f}/day to preserve surplus.",
                "Review weekend dining expenses to prevent secondary spikes.",
                "Allocate remaining capital towards high-priority utility essentials."
            ]
        else:
            headline = f"✅ Healthy Financial Trajectory — Low Risk"
            verdict = f"Spending velocity is optimal at {metrics.get('velocity_ratio', 1.0):.1f}x. Projected to finish comfortably within budget."
            recs = [
                "Continue current spending discipline.",
                "Transfer anticipated surplus into savings goals at month-end.",
                "Maintain active receipt logging to keep data synchronized."
            ]
        return {
            "headline": headline,
            "verdict": verdict,
            "top_recommendations": recs,
            "worst_case_estimate": round(metrics.get("total_spent", 0.0) + (metrics.get("days_remaining", 0) * metrics.get("actual_daily_avg", 0.0) * 1.3), 2),
            "best_case_estimate": round(metrics.get("total_spent", 0.0) + (metrics.get("days_remaining", 0) * daily * 0.75), 2),
            "sms_alert_summary": f"ExpensePilot Risk Alert: Score {metrics.get('risk_score', 50)}/100 ({level}). Safe daily target: ₹{daily:,.0f}/day."
        }

    prompt = f"""You are the Chief Financial Risk Auditor for ExpensePilot AI.
Analyze the following live financial metrics for this user:
- Month: {metrics.get('month')}
- Total Budget: ₹{metrics.get('monthly_budget', 0):,.2f}
- Spent So Far: ₹{metrics.get('total_spent', 0):,.2f} ({metrics.get('percent_used', 0):.1f}%)
- Remaining Days: {metrics.get('days_remaining', 0)} of {metrics.get('num_days', 31)}
- Current Daily Burn Rate: ₹{metrics.get('actual_daily_avg', 0):,.2f}/day
- Safe Target Burn Rate: ₹{metrics.get('safe_daily_allowance', 0):,.2f}/day
- Velocity Ratio: {metrics.get('velocity_ratio', 1.0):.2f}x
- Calculated Risk Score: {metrics.get('risk_score', 50)}/100 ({metrics.get('risk_level', 'MODERATE')})
- Budget Depletion Projected: {metrics.get('exhaustion_status', 'Safe')}
- Top Spending Categories: {metrics.get('top_categories_str', 'None')}

Output a JSON object with EXACTLY this structure:
{{
  "headline": "A short, impactful 1-sentence risk assessment headline with emoji",
  "verdict": "2 concise sentences explaining why the user is in this risk category and the primary driver.",
  "top_recommendations": [
    "Specific cut recommendation with exact Rupee figures",
    "Specific behavioral adjustment",
    "Target daily limit adjustment"
  ],
  "worst_case_estimate": <number>,
  "best_case_estimate": <number>,
  "sms_alert_summary": "1 concise sentence suitable for an emergency mobile SMS notification"
}}
Return ONLY raw JSON, without markdown formatting or code blocks."""

    risk_api_key = getattr(settings, "AI_RISK_API_KEY", "") or getattr(settings, "OPENAI_API_KEY", "")
    risk_base_url = getattr(settings, "AI_RISK_BASE_URL", "")

    # Path 1: If custom AI_RISK_BASE_URL / Gateway is configured
    if risk_api_key and risk_base_url:
        try:
            headers = {
                "Authorization": f"Bearer {risk_api_key.strip()}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-4o-mini" if "openai" in risk_base_url else "default",
                "messages": [
                    {"role": "system", "content": "You are a professional financial risk analytics engine that outputs valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 500
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(f"{risk_base_url.rstrip('/')}/chat/completions", headers=headers, json=payload)
                if resp.status_code == 200:
                    import json
                    content = resp.json()["choices"][0]["message"]["content"].strip()
                    content_clean = content.replace("```json", "").replace("```", "").strip()
                    res_dict = json.loads(content_clean)
                    res_dict["provider"] = "Dedicated AI Risk Gateway"
                    return res_dict
        except Exception as e:
            print(f"[Dedicated AI Risk API Notice]: {e}")

    # Path 2: Groq Cloud LLM (qwen/qwen3.8-27b / gpt-oss-120b)
    try:
        chosen_model = settings.GROQ_MODEL or "qwen/qwen3.8-27b"
        headers = {
            "Authorization": f"Bearer {groq_api_key.strip()}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": chosen_model,
            "messages": [
                {"role": "system", "content": "You are a professional financial risk analytics engine that outputs valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 500
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"].strip()
                import json
                content_clean = content.replace("```json", "").replace("```", "").strip()
                return json.loads(content_clean)
    except Exception as e:
        print(f"[Risk Predictor AI Notice]: {e}")

    # Fallback to heuristic
    daily = metrics.get("safe_daily_allowance", 0.0)
    level = metrics.get("risk_level", "MODERATE")
    return {
        "headline": f"⚡ Financial Risk Analysis ({metrics.get('risk_score', 50)}/100) — {level}",
        "verdict": f"Current burn velocity is {metrics.get('velocity_ratio', 1.0):.1f}x. Safe daily allowance is ₹{daily:,.0f}/day.",
        "top_recommendations": [
            f"Cap daily expenditures to ₹{daily:,.0f}/day.",
            "Review discretionary food & entertainment spending.",
            "Pause unnecessary online subscription renewals."
        ],
        "worst_case_estimate": round(metrics.get("total_spent", 0.0) * 1.25, 2),
        "best_case_estimate": round(metrics.get("monthly_budget", 0.0) * 0.95, 2),
        "sms_alert_summary": f"ExpensePilot Risk Alert: Score {metrics.get('risk_score', 50)}/100 ({level}). Safe daily limit: ₹{daily:,.0f}."
    }

async def calculate_ai_risk_prediction(db: Any, user_id: str, month_str: str) -> Dict[str, Any]:
    """
    Computes a comprehensive Multi-Factor AI Spending Risk Assessment:
    - Burn velocity ratio (actual burn vs allowable linear speed)
    - Budget exhaustion runway (date and days until zero balance)
    - Category concentration & breach risk
    - Daily spending volatility (standard deviation)
    - Groq LLM synthesis for mitigation strategy
    """
    start_date, end_date, num_days = await get_month_dates(month_str)

    # 1. Fetch budget & actuals
    budget_doc = await db.budgets.find_one({"user_id": user_id, "month": month_str})
    monthly_budget = float(budget_doc.get("total_budget", 18000.0)) if budget_doc else 18000.0
    category_limits = budget_doc.get("category_limits", {}) if budget_doc else {}

    cursor = db.expenses.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }).sort("date", 1)
    expenses = await cursor.to_list(length=3000)

    today = datetime.utcnow()
    curr_ym = today.strftime("%Y-%m")
    
    if month_str == curr_ym:
        days_elapsed = min(today.day, num_days)
    elif month_str < curr_ym:
        days_elapsed = num_days
    else:
        days_elapsed = 1

    days_remaining = max(0, num_days - days_elapsed)
    total_spent = sum(float(e.get("amount", 0.0)) for e in expenses)
    remaining_budget = max(0.0, monthly_budget - total_spent)
    percent_used = round((total_spent / max(1.0, monthly_budget)) * 100, 1)

    # 2. Daily Burn Analysis & Volatility
    daily_spend_map: Dict[str, float] = {}
    cat_spend_map: Dict[str, float] = {}
    year, month = map(int, month_str.split("-"))

    for e in expenses:
        d = e.get("date", "")
        amt = float(e.get("amount", 0.0))
        cat = e.get("category", "Other")
        daily_spend_map[d] = daily_spend_map.get(d, 0.0) + amt
        cat_spend_map[cat] = cat_spend_map.get(cat, 0.0) + amt

    daily_amounts = []
    for d in range(1, days_elapsed + 1):
        d_str = f"{year:04d}-{month:02d}-{d:02d}"
        daily_amounts.append(daily_spend_map.get(d_str, 0.0))

    actual_daily_avg = (total_spent / max(1, days_elapsed)) if days_elapsed > 0 else 0.0
    target_daily_budget = monthly_budget / max(1, num_days)
    safe_daily_allowance = (remaining_budget / max(1, days_remaining)) if days_remaining > 0 else 0.0
    
    # Velocity Ratio (Burn Rate Speed)
    velocity_ratio = actual_daily_avg / max(1.0, target_daily_budget)

    # Daily Spending Standard Deviation (Volatility)
    mean_spend = actual_daily_avg
    variance = sum((x - mean_spend) ** 2 for x in daily_amounts) / max(1, len(daily_amounts))
    std_dev = math.sqrt(variance)
    volatility_ratio = std_dev / max(1.0, mean_spend)

    # 3. Budget Exhaustion Runway Calculation
    is_exhausted = total_spent >= monthly_budget
    exhaustion_date = None
    days_until_exhaustion = None

    if is_exhausted:
        days_until_exhaustion = 0
        exhaustion_date = today.strftime("%Y-%m-%d")
        exhaustion_status = "Budget Already Depleted"
    elif actual_daily_avg > 0:
        days_float = remaining_budget / actual_daily_avg
        days_until_exhaustion = int(round(days_float))
        exh_day = days_elapsed + days_until_exhaustion
        if exh_day <= num_days:
            exh_date_obj = date(year, month, min(num_days, max(1, exh_day)))
            exhaustion_date = exh_date_obj.strftime("%Y-%m-%d")
            exhaustion_status = f"Depletion Projected by {exhaustion_date} ({days_until_exhaustion} days remaining)"
        else:
            exhaustion_status = "Safe Runway Through Month-End"
    else:
        exhaustion_status = "Zero Burn (Safe)"

    # 4. Multi-Factor Risk Score (0 to 100)
    risk_factors: List[Dict[str, Any]] = []
    
    # a. Velocity Factor (Weight: 40 pts)
    velocity_risk_score = 0.0
    if velocity_ratio > 1.8:
        velocity_risk_score = 40.0
        risk_factors.append({
            "factor": "Severe Burn Velocity",
            "severity": "critical",
            "impact": f"{velocity_ratio:.1f}x Safe Pace",
            "description": f"Burning ₹{actual_daily_avg:,.0f}/day vs ₹{target_daily_budget:,.0f}/day target."
        })
    elif velocity_ratio > 1.3:
        velocity_risk_score = 30.0
        risk_factors.append({
            "factor": "High Spending Velocity",
            "severity": "high",
            "impact": f"{velocity_ratio:.1f}x Target",
            "description": "Spending pace is trending significantly above allocated linear baseline."
        })
    elif velocity_ratio > 1.05:
        velocity_risk_score = 18.0
        risk_factors.append({
            "factor": "Elevated Burn Velocity",
            "severity": "medium",
            "impact": f"{velocity_ratio:.1f}x Pace",
            "description": "Slightly above baseline. Discretionary spending requires calibration."
        })
    else:
        velocity_risk_score = 5.0

    # b. Exhaustion Runway Factor (Weight: 30 pts)
    runway_risk_score = 0.0
    if is_exhausted:
        runway_risk_score = 30.0
        risk_factors.append({
            "factor": "Budget Exceeded",
            "severity": "critical",
            "impact": f"-₹{(total_spent - monthly_budget):,.0f} Deficit",
            "description": "Total monthly budget allocation is fully depleted."
        })
    elif days_until_exhaustion is not None and days_until_exhaustion < days_remaining:
        shortfall_days = days_remaining - days_until_exhaustion
        runway_risk_score = min(30.0, 15.0 + (shortfall_days * 3.0))
        risk_factors.append({
            "factor": "Premature Budget Depletion",
            "severity": "high",
            "impact": f"{days_until_exhaustion} Days Runway",
            "description": f"Budget will run out approximately {shortfall_days} days before month-end."
        })
    else:
        runway_risk_score = 3.0

    # c. Category Overrun Factor (Weight: 20 pts)
    cat_risk_score = 0.0
    category_risks = []
    breached_cats = 0

    for cat_name, cat_spent in cat_spend_map.items():
        limit = float(category_limits.get(cat_name, 0.0))
        cat_pct = round((cat_spent / max(1.0, total_spent)) * 100, 1)
        is_breached = (limit > 0 and cat_spent > limit)
        if is_breached:
            breached_cats += 1

        cat_status = "Breached" if is_breached else ("High Burn" if cat_pct > 30 else "Normal")
        category_risks.append({
            "category": cat_name,
            "spent": round(cat_spent, 2),
            "limit": limit if limit > 0 else None,
            "share_pct": cat_pct,
            "status": cat_status
        })

    if breached_cats > 0:
        cat_risk_score = min(20.0, breached_cats * 8.0)
        risk_factors.append({
            "factor": "Category Limit Breaches",
            "severity": "high" if breached_cats >= 2 else "medium",
            "impact": f"{breached_cats} Category Breaches",
            "description": f"{breached_cats} category limits have already been exceeded this month."
        })
    elif any(c["share_pct"] > 40 for c in category_risks):
        cat_risk_score = 12.0
        top_cat = max(category_risks, key=lambda x: x["share_pct"])
        risk_factors.append({
            "factor": "High Category Concentration",
            "severity": "medium",
            "impact": f"{top_cat['share_pct']}% in {top_cat['category']}",
            "description": f"Over 40% of all expenses are concentrated in {top_cat['category']}."
        })
    else:
        cat_risk_score = 3.0

    # d. Volatility Factor (Weight: 10 pts)
    volatility_risk_score = 0.0
    if volatility_ratio > 1.2:
        volatility_risk_score = 10.0
        risk_factors.append({
            "factor": "High Daily Volatility",
            "severity": "medium",
            "impact": f"±₹{std_dev:,.0f} Variance",
            "description": "Erratic daily spending patterns with frequent large spikes."
        })
    else:
        volatility_risk_score = 3.0

    # Total Composite Risk Score (0-100)
    raw_risk = velocity_risk_score + runway_risk_score + cat_risk_score + volatility_risk_score
    risk_score = int(min(100, max(5, round(raw_risk))))

    if risk_score >= 80:
        risk_level = "CRITICAL"
        risk_color = "rose"
        burn_status = "Critical Overburn"
    elif risk_score >= 60:
        risk_level = "HIGH"
        risk_color = "orange"
        burn_status = "Accelerated Burn"
    elif risk_score >= 35:
        risk_level = "MODERATE"
        risk_color = "amber"
        burn_status = "Elevated Spend"
    else:
        risk_level = "LOW"
        risk_color = "emerald"
        burn_status = "Optimal Trajectory"

    # Forecasting comparison
    forecast_data = await forecast_monthly_spending(db, user_id, month_str)
    projected_total = forecast_data.get("projected_total", total_spent)
    projected_overrun = max(0.0, projected_total - monthly_budget)

    # 5. Monte Carlo Probabilistic Simulation (250 runs)
    runs = 250
    overrun_count = 0
    sim_totals = []
    
    for _ in range(runs):
        sim_val = total_spent
        for d in range(days_elapsed + 1, num_days + 1):
            dt = date(year, month, d)
            mult = 1.35 if dt.weekday() >= 5 else 0.95
            sampled_daily = max(0.0, random.gauss(actual_daily_avg * mult, max(10.0, std_dev * 0.65)))
            sim_val += sampled_daily
        sim_totals.append(sim_val)
        if sim_val > monthly_budget:
            overrun_count += 1

    overrun_prob = round((overrun_count / runs) * 100, 1)
    sim_totals.sort()
    mc_p10 = round(sim_totals[int(runs * 0.10)], 2)
    mc_p50 = round(sim_totals[int(runs * 0.50)], 2)
    mc_p90 = round(sim_totals[int(runs * 0.90)], 2)

    # 6. Category Threat & Opportunity Matrix
    enhanced_category_risks = []
    avg_cat_spent = (total_spent / max(1, len(cat_spend_map))) if cat_spend_map else 1.0
    
    for c in category_risks:
        c_spent = c["spent"]
        c_share = c["share_pct"]
        c_limit = c["limit"]
        c_velocity = round(c_spent / max(1.0, avg_cat_spent), 2)

        if c["status"] == "Breached" or c_share > 35:
            threat = "CRITICAL ACCELERATOR"
            threat_color = "rose"
        elif c_share > 20:
            threat = "ELEVATED"
            threat_color = "amber"
        else:
            threat = "CONTROLLED"
            threat_color = "emerald"

        savings_20 = round(c_spent * 0.20, 2)
        enhanced_category_risks.append({
            **c,
            "burn_velocity": c_velocity,
            "threat_level": threat,
            "threat_color": threat_color,
            "savings_opportunity_20pct": savings_20
        })

    # Top categories string for LLM
    sorted_cats = sorted(enhanced_category_risks, key=lambda x: x["spent"], reverse=True)[:3]
    top_cats_str = ", ".join([f"{c['category']}: ₹{c['spent']:,.0f} ({c['share_pct']}%)" for c in sorted_cats])

    metrics_for_ai = {
        "month": month_str,
        "monthly_budget": monthly_budget,
        "total_spent": total_spent,
        "percent_used": percent_used,
        "days_remaining": days_remaining,
        "num_days": num_days,
        "actual_daily_avg": actual_daily_avg,
        "safe_daily_allowance": safe_daily_allowance,
        "velocity_ratio": velocity_ratio,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "exhaustion_status": exhaustion_status,
        "projected_overrun": projected_overrun,
        "top_categories_str": top_cats_str
    }

    ai_assessment = await generate_ai_risk_assessment(metrics_for_ai)

    return {
        "month": month_str,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "burn_status": burn_status,
        "velocity_ratio": round(velocity_ratio, 2),
        "total_spent": round(total_spent, 2),
        "monthly_budget": round(monthly_budget, 2),
        "remaining_budget": round(remaining_budget, 2),
        "safe_daily_allowance": round(safe_daily_allowance, 2),
        "actual_daily_avg": round(actual_daily_avg, 2),
        "days_elapsed": days_elapsed,
        "days_remaining": days_remaining,
        "is_exhausted": is_exhausted,
        "exhaustion_date": exhaustion_date,
        "days_until_exhaustion": days_until_exhaustion,
        "exhaustion_status": exhaustion_status,
        "projected_total": projected_total,
        "projected_overrun": round(projected_overrun, 2),
        "volatility_std_dev": round(std_dev, 2),
        "monte_carlo": {
            "overrun_probability_pct": overrun_prob,
            "simulations_count": runs,
            "optimistic_p10": mc_p10,
            "expected_p50": mc_p50,
            "stress_test_p90": mc_p90,
            "variance_spread": round(mc_p90 - mc_p10, 2)
        },
        "risk_factors": risk_factors,
        "category_risks": sorted(enhanced_category_risks, key=lambda x: x["spent"], reverse=True),
        "ai_assessment": ai_assessment
    }

def simulate_risk_scenario(
    current_risk: Dict[str, Any],
    spend_cut_percent: float = 0.0,
    upcoming_expense: float = 0.0
) -> Dict[str, Any]:
    """
    Interactive simulation helper:
    Calculates adjusted risk score and runway when user tests cuts or upcoming purchases.
    """
    base_score = current_risk.get("risk_score", 50)
    monthly_budget = current_risk.get("monthly_budget", 18000.0)
    total_spent = current_risk.get("total_spent", 0.0)
    days_rem = max(1, current_risk.get("days_remaining", 1))
    daily_avg = current_risk.get("actual_daily_avg", 0.0)

    # Apply cut to daily rate
    cut_multiplier = max(0.1, 1.0 - (spend_cut_percent / 100.0))
    adjusted_daily = daily_avg * cut_multiplier
    
    # New projected total
    adjusted_projected = total_spent + (days_rem * adjusted_daily) + upcoming_expense
    adjusted_overrun = max(0.0, adjusted_projected - monthly_budget)
    
    # Delta score
    cut_reduction = min(40, spend_cut_percent * 0.7)
    expense_increase = min(35, (upcoming_expense / max(1.0, monthly_budget)) * 100)
    adjusted_score = int(min(100, max(5, round(base_score - cut_reduction + expense_increase))))

    if adjusted_score >= 80:
        adj_level = "CRITICAL"
    elif adjusted_score >= 60:
        adj_level = "HIGH"
    elif adjusted_score >= 35:
        adj_level = "MODERATE"
    else:
        adj_level = "LOW"

    # Savings relative to baseline
    orig_proj = current_risk.get("projected_total", total_spent)
    savings = round(max(0.0, orig_proj - adjusted_projected), 2)

    return {
        "original_risk_score": base_score,
        "adjusted_risk_score": adjusted_score,
        "score_delta": adjusted_score - base_score,
        "adjusted_risk_level": adj_level,
        "adjusted_projected_total": round(adjusted_projected, 2),
        "adjusted_overrun": round(adjusted_overrun, 2),
        "projected_savings": savings,
        "adjusted_daily_burn": round(adjusted_daily, 2),
        "intervention_summary": (
            f"Applying a {spend_cut_percent:.0f}% discretionary cut "
            f"{f'with +₹{upcoming_expense:,.0f} purchase' if upcoming_expense > 0 else ''} "
            f"shifts risk from {base_score} down to {adjusted_score} ({adj_level}). "
            f"Estimated capital preserved: ₹{savings:,.0f}."
        )
    }


