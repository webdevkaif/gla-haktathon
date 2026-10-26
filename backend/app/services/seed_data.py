from datetime import datetime
from backend.app.models import Expense, Budget, SavingGoal

DEMO_EXPENSES = [
    # Early month
    {"date": "2026-10-01", "category": "Groceries", "amount": 1850.0, "description": "Monthly pantry & supermarket essentials", "payment_method": "UPI"},
    {"date": "2026-10-02", "category": "Transportation", "amount": 350.0, "description": "Metro card recharge", "payment_method": "Card"},
    {"date": "2026-10-03", "category": "Food", "amount": 280.0, "description": "Lunch at cafe", "payment_method": "UPI"},
    {"date": "2026-10-04", "category": "Utilities", "amount": 1200.0, "description": "High-speed broadband bill", "payment_method": "NetBanking"},
    {"date": "2026-10-05", "category": "Food", "amount": 180.0, "description": "Coffee and sandwich", "payment_method": "UPI"},
    {"date": "2026-10-06", "category": "Entertainment", "amount": 650.0, "description": "Cinema IMAX tickets", "payment_method": "Card"},
    {"date": "2026-10-07", "category": "Transportation", "amount": 500.0, "description": "Cab to client meeting", "payment_method": "UPI"},
    {"date": "2026-10-08", "category": "Groceries", "amount": 420.0, "description": "Fresh vegetables and dairy", "payment_method": "Cash"},
    {"date": "2026-10-09", "category": "Food", "amount": 340.0, "description": "Dinner takeaway noodles", "payment_method": "UPI"},
    {"date": "2026-10-10", "category": "Shopping", "amount": 1499.0, "description": "Autumn sneakers on sale", "payment_method": "Card"},
    {"date": "2026-10-11", "category": "Food", "amount": 120.0, "description": "Tea and bakery puffs", "payment_method": "UPI"},
    {"date": "2026-10-12", "category": "Transportation", "amount": 800.0, "description": "Petrol refill for bike", "payment_method": "UPI"},
    {"date": "2026-10-13", "category": "Healthcare", "amount": 450.0, "description": "Multivitamins and first aid kit", "payment_method": "Card"},
    {"date": "2026-10-14", "category": "Food", "amount": 520.0, "description": "Family lunch thali", "payment_method": "UPI"},
    {"date": "2026-10-15", "category": "Entertainment", "amount": 299.0, "description": "OTT media streaming subscription", "payment_method": "Card"},
    {"date": "2026-10-16", "category": "Food", "amount": 210.0, "description": "Breakfast dosas", "payment_method": "UPI"},
    {"date": "2026-10-17", "category": "Shopping", "amount": 850.0, "description": "Desk organizer & cable management", "payment_method": "UPI"},
    {"date": "2026-10-18", "category": "Groceries", "amount": 680.0, "description": "Organic fruits and nuts", "payment_method": "UPI"},
    {"date": "2026-10-19", "category": "Food", "amount": 310.0, "description": "Work lunch bowl", "payment_method": "UPI"},
    {"date": "2026-10-20", "category": "Transportation", "amount": 160.0, "description": "Auto rickshaw commute", "payment_method": "Cash"},
    # Anomaly transaction for hackathon showcase!
    {"date": "2026-10-21", "category": "Food", "amount": 4200.0, "description": "Luxury rooftop fine dining celebration", "payment_method": "Card", "force_unusual": True, "reason": "Statistical Outlier: ₹4,200 is 14x your median food expense (₹300)."},
    {"date": "2026-10-22", "category": "Groceries", "amount": 380.0, "description": "Weekly milk & bread supplies", "payment_method": "UPI"},
    {"date": "2026-10-23", "category": "Utilities", "amount": 650.0, "description": "Mobile postpaid recharge", "payment_method": "UPI"},
    {"date": "2026-10-24", "category": "Shopping", "amount": 1200.0, "description": "Casual shirts weekend sale", "payment_method": "Card"},
    {"date": "2026-10-25", "category": "Food", "amount": 290.0, "description": "Evening snacks & momos", "payment_method": "UPI"},
]

async def seed_demo_data(db, user_id: str = "user_default") -> int:
    """Clears and seeds realistic data for demo and hackathon presentation in MongoDB."""
    # Clear existing data for user
    await db.expenses.delete_many({"user_id": user_id})
    await db.budgets.delete_many({"user_id": user_id})
    await db.alerts.delete_many({"user_id": user_id})
    await db.saving_goals.delete_many({"user_id": user_id})

    # Add Budget
    budget_doc = Budget.create(
        user_id=user_id,
        month="2026-10",
        total_budget=18000.0,
        category_limits={
            "Food": 5000.0,
            "Shopping": 3500.0,
            "Groceries": 3500.0,
            "Transportation": 2500.0,
            "Utilities": 2000.0,
            "Entertainment": 1500.0
        }
    )
    b_res = await db.budgets.insert_one(budget_doc)
    await db.budgets.update_one({"_id": b_res.inserted_id}, {"$set": {"id": str(b_res.inserted_id)}})

    # Add Expenses
    expense_docs = []
    for item in DEMO_EXPENSES:
        force_unusual = item.get("force_unusual", False)
        reason = item.get("reason", None)
        doc = Expense.create(
            user_id=user_id,
            amount=item["amount"],
            category=item["category"],
            description=item["description"],
            date=item["date"],
            payment_method=item["payment_method"],
            is_unusual=force_unusual,
            anomaly_reason=reason
        )
        expense_docs.append(doc)

    if expense_docs:
        exp_res = await db.expenses.insert_many(expense_docs)
        for obj_id in exp_res.inserted_ids:
            await db.expenses.update_one({"_id": obj_id}, {"$set": {"id": str(obj_id)}})

    # Add Saving Goals
    g1 = SavingGoal.create(
        user_id=user_id,
        title="Emergency Safety Fund",
        target_amount=30000.0,
        current_saved=8500.0,
        target_months=6,
        monthly_target=5000.0,
        category_suggestions=[
            {"category": "Food", "monthly_cut": 1200.0, "tip": "Limit luxury weekend dining to once per month"},
            {"category": "Shopping", "monthly_cut": 800.0, "tip": "Use a 48-hour rule before buying clothes online"}
        ]
    )
    g2 = SavingGoal.create(
        user_id=user_id,
        title="Diwali Travel & Gifts",
        target_amount=15000.0,
        current_saved=9200.0,
        target_months=2,
        monthly_target=7500.0,
        category_suggestions=[
            {"category": "Entertainment", "monthly_cut": 600.0, "tip": "Opt for home movie nights instead of multiplex concessions"}
        ]
    )
    g1_res = await db.saving_goals.insert_one(g1)
    await db.saving_goals.update_one({"_id": g1_res.inserted_id}, {"$set": {"id": str(g1_res.inserted_id)}})
    g2_res = await db.saving_goals.insert_one(g2)
    await db.saving_goals.update_one({"_id": g2_res.inserted_id}, {"$set": {"id": str(g2_res.inserted_id)}})

    # Generate initial alerts
    from backend.app.services.anomaly import audit_and_generate_alerts
    await audit_and_generate_alerts(db, user_id, "2026-10")

    return len(DEMO_EXPENSES)
