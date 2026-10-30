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

            # Auto-push autonomous notification to user's paired Telegram phone bot
            try:
                ps = await db.phone_settings.find_one({"user_id": user_id})
                chat_id = ps.get("telegram_chat_id") if ps else None
                if not chat_id and ps is None:
                    any_ps = await db.phone_settings.find_one({"telegram_chat_id": {"$exists": True, "$ne": None}})
                    if any_ps:
                        chat_id = any_ps.get("telegram_chat_id")

                if chat_id:
                    from backend.app.services.telegram_bot import send_telegram_message
                    rec_action = a.get("action_options", ["Review in ExpensePilot"])[0] if a.get("action_options") else "Review in dashboard"
                    tele_msg = (
                        f"{a['title']}\n"
                        f"━━━━━━━━━━━━━━━━━━━\n"
                        f"{a['message']}\n\n"
                        f"💡 *Action:* {rec_action}\n"
                        f"⚡ _ExpensePilot Autonomous Alert_"
                    )
                    await send_telegram_message(chat_id, tele_msg)
            except Exception as e:
                print(f"[Telegram Autonomous Alert Notice]: {e}")


async def detect_pyod_isolation_forest_anomalies(
    db,
    user_id: str,
    month: Optional[str] = None
) -> Dict[str, Any]:
    """
    Financial Anomaly Detection using PyOD (IForest / Isolation Forest).
    Detects:
    - Unusually high expenses
    - Sudden spending spikes
    - Abnormal transaction amounts
    - Potential duplicate transactions
    - Unusual spending patterns

    Connects strictly to MongoDB user records for authenticated privacy.
    Labels anomalies as 'Review Recommended' (statistical flags, not confirmed fraud).
    """
    from collections import defaultdict
    import math

    # 1. Fetch real user expenses from MongoDB
    query = {"user_id": user_id}
    cursor = db.expenses.find(query).sort([("date", 1), ("_id", 1)])
    docs = await cursor.to_list(length=3000)

    total_analyzed = len(docs)
    if total_analyzed < 4:
        return {
            "anomalies_detected": 0,
            "total_analyzed": total_analyzed,
            "has_sufficient_history": False,
            "message": "Insufficient transaction history to detect statistical anomalies. Please add at least 4 transactions to train the Isolation Forest model.",
            "anomalies": []
        }

    # 2. Extract baseline statistical metrics
    category_amounts = defaultdict(list)
    daily_totals = defaultdict(float)
    date_to_items = defaultdict(list)

    for d in docs:
        amt = float(d.get("amount", 0.0))
        cat = d.get("category", "Miscellaneous")
        dt = d.get("date", "")
        category_amounts[cat].append(amt)
        if dt:
            daily_totals[dt] += amt
            date_to_items[dt].append(d)

    category_stats = {}
    for cat, vals in category_amounts.items():
        arr = np.array(vals)
        category_stats[cat] = {
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr)) if len(arr) > 1 else 0.0,
            "max": float(np.max(arr))
        }

    all_daily = list(daily_totals.values())
    avg_daily_spend = float(np.mean(all_daily)) if all_daily else 500.0

    # 3. Build Multi-Feature Matrix for PyOD Isolation Forest
    # Features: [log_amount, category_deviation_ratio, daily_spend_ratio, day_of_month]
    features = []
    for d in docs:
        amt = max(0.01, float(d.get("amount", 0.0)))
        cat = d.get("category", "Miscellaneous")
        dt = d.get("date", "2026-10-15")
        
        cat_mean = category_stats.get(cat, {}).get("mean", amt)
        cat_ratio = amt / (cat_mean + 1e-4)

        day_total = daily_totals.get(dt, amt)
        spike_ratio = day_total / (avg_daily_spend + 1e-4)

        try:
            day_num = int(dt.split("-")[-1]) if "-" in dt else 15
        except Exception:
            day_num = 15

        features.append([
            math.log1p(amt),
            cat_ratio,
            spike_ratio,
            float(day_num)
        ])

    X = np.array(features)

    # 4. Train PyOD Isolation Forest Model
    iforest_flags = [0] * len(docs)
    iforest_scores = [0.0] * len(docs)
    try:
        from pyod.models.iforest import IForest
        contamination = min(0.15, max(0.04, 2.0 / len(docs)))
        clf = IForest(contamination=contamination, random_state=42, n_estimators=100)
        clf.fit(X)
        iforest_flags = clf.labels_
        iforest_scores = [float(s) for s in clf.decision_scores_]
    except Exception as e:
        # Fallback to Scikit-Learn IsolationForest
        try:
            from sklearn.ensemble import IsolationForest
            clf = IsolationForest(contamination=0.1, random_state=42)
            preds = clf.fit_predict(X)
            iforest_flags = [1 if p == -1 else 0 for p in preds]
        except Exception as e2:
            print(f"[Anomaly Detection Notice]: {e2}")

    # 5. Check Duplicates & Synthesize Explainable Anomalies
    detected_anomalies = []
    seen_signatures = {} # (amount, category) -> doc

    for idx, d in enumerate(docs):
        amt = float(d.get("amount", 0.0))
        cat = d.get("category", "Miscellaneous")
        desc = d.get("description", "Expense")
        dt = d.get("date", "")
        doc_id = str(d.get("_id") or d.get("id") or idx)

        is_iforest_anomaly = bool(iforest_flags[idx] == 1)
        anomaly_reason = None
        anomaly_type = None

        # Check A: Potential Duplicate Transactions (same amount, category & description or close date)
        sig = (amt, cat, desc.strip().lower())
        sig_loose = (amt, cat, dt)
        if sig in seen_signatures:
            prev = seen_signatures[sig]
            anomaly_type = "Potential Duplicate"
            anomaly_reason = f"Potential duplicate transaction: Matches another ₹{amt:,.0f} '{desc}' recorded on {prev.get('date', 'recent date')}."
        elif sig_loose in seen_signatures:
            anomaly_type = "Potential Duplicate"
            anomaly_reason = f"Potential duplicate amount: Identical ₹{amt:,.0f} {cat} payment made on the same date."
        else:
            seen_signatures[sig] = d
            seen_signatures[sig_loose] = d

        # Check B: Sudden Daily Spending Spike
        day_total = daily_totals.get(dt, amt)
        if not anomaly_type and day_total >= (avg_daily_spend * 3.0) and amt >= 1000:
            anomaly_type = "Sudden Spending Spike"
            anomaly_reason = f"Sudden daily spending spike: Day total reached ₹{day_total:,.0f} (over 300% of your ₹{avg_daily_spend:,.0f} daily average)."

        # Check C: Unusually High Expense relative to category
        cat_stat = category_stats.get(cat, {})
        cat_mean = cat_stat.get("mean", amt)
        cat_std = cat_stat.get("std", 0.0)
        high_threshold = max(cat_mean + 2.0 * cat_std, cat_mean * 2.2)

        if not anomaly_type and (amt >= high_threshold or (is_iforest_anomaly and amt >= cat_mean * 1.8)):
            anomaly_type = "Unusually High Expense"
            times_higher = round(amt / cat_mean, 1) if cat_mean > 0 else 2.0
            anomaly_reason = f"Unusually high spending compared with historical expenses ({times_higher}x higher than category average of ₹{cat_mean:,.0f})."

        # Check D: Isolation Forest Multi-Feature Statistical Outlier
        if not anomaly_type and is_iforest_anomaly:
            anomaly_type = "Unusual Spending Pattern"
            anomaly_reason = "Isolation Forest detected an unusual multidimensional spending pattern across amount, timing, and category baseline."

        if anomaly_type:
            detected_anomalies.append({
                "id": doc_id,
                "amount": amt,
                "category": cat,
                "description": desc,
                "date": dt,
                "anomaly_type": anomaly_type,
                "reason": anomaly_reason,
                "status": "Review Recommended",
                "score": round(iforest_scores[idx], 3) if idx < len(iforest_scores) else 0.5,
                "created_at": d.get("created_at")
            })

    # Optional month filter for view, while having leveraged full history for model training
    if month:
        filtered = [a for a in detected_anomalies if a.get("date", "").startswith(month)]
    else:
        filtered = detected_anomalies

    # Sort anomalies by amount descending (highest suspicious amounts first)
    filtered.sort(key=lambda x: x["amount"], reverse=True)

    has_anomalies = len(filtered) > 0
    return {
        "anomalies_detected": len(filtered),
        "total_analyzed": total_analyzed,
        "has_sufficient_history": True,
        "message": f"⚠️ {len(filtered)} anomalous transaction(s) flagged for review." if has_anomalies else "✅ No unusual transactions detected.",
        "anomalies": filtered
    }

