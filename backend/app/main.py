import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import init_db, close_db, get_database
from backend.app.routers import (
    users, claims, invoices, approvals, escalations,
    audit, policies, dashboard, agent, notifications,
    expenses, analytics, budgets, goals
)
from backend.app.services.seed_data import seed_enterprise_data, seed_demo_data
from backend.app.services.workflow import check_and_send_due_reminders

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize MongoDB database client and indexes
    await init_db()
    
    # Auto-seed demo enterprise & real-time expense data if empty
    try:
        db = get_database()
        if db is not None:
            policy_count = await db.policies.count_documents({})
            if policy_count == 0:
                print("[Expense Pilot] Initializing realistic corporate enterprise data (Meridian Dev-C04)...")
                await seed_enterprise_data(db)
                print("[Expense Pilot] Enterprise sample data ready!")
            
            expense_count = await db.expenses.count_documents({})
            if expense_count == 0:
                print("[Expense Pilot] Initializing realistic real-time expense data...")
                await seed_demo_data(db, "user_default")
                await seed_demo_data(db, "demo_user_1")
                print("[Expense Pilot] Real-time expense & budget data ready!")
    except Exception as e:
        print(f"[Expense Pilot] Notice checking seed data: {e}")

    # Start periodic reminder background worker (runs every 60s)
    reminder_task = None
    async def periodic_reminder_worker():
        while True:
            try:
                await asyncio.sleep(60)
                cur_db = get_database()
                if cur_db is not None:
                    await check_and_send_due_reminders(cur_db)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[Expense Pilot Reminder Scheduler] {e}")

    reminder_task = asyncio.create_task(periodic_reminder_worker())

    yield

    if reminder_task:
        reminder_task.cancel()
        try:
            await reminder_task
        except asyncio.CancelledError:
            pass

    await close_db()

app = FastAPI(
    title="Expense Pilot API",
    version=settings.VERSION,
    description="Enterprise Expense and Invoice Query Agent for Meridian Finance & Procurement (Hackathon DEV-C04)",
    lifespan=lifespan
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enterprise Meridian Dev-C04 Routers
app.include_router(users.router)
app.include_router(claims.router)
app.include_router(invoices.router)
app.include_router(approvals.router)
app.include_router(escalations.router)
app.include_router(audit.router)
app.include_router(policies.router)
app.include_router(dashboard.router)
app.include_router(agent.router)
app.include_router(notifications.router)
app.include_router(expenses.router)
app.include_router(analytics.router)
app.include_router(budgets.router)
app.include_router(goals.router)

@app.get("/api/system/db-status")
async def get_system_database_status():
    from backend.app.database import get_db_status_info
    return await get_db_status_info()

@app.post("/api/system/reconnect")
async def trigger_atlas_reconnect():
    from backend.app.database import reconnect_atlas_db
    return await reconnect_atlas_db()

@app.get("/")
async def root():
    from backend.app.database import is_fallback_mode
    db_mode = "Local Fast-Engine (MongoDB API)" if is_fallback_mode else "MongoDB Atlas"
    db_status = "local_active" if is_fallback_mode else "atlas_connected"
    return {
        "app": "Expense Pilot",
        "description": "Corporate Expense & Invoice Query Agent (Meridian Dev-C04)",
        "version": settings.VERSION,
        "status": "online",
        "database": db_mode,
        "database_name": settings.MONGODB_DB_NAME,
        "database_status": db_status,
        "currency": settings.DEFAULT_CURRENCY,
        "endpoints": [
            "/api/users",
            "/api/claims",
            "/api/invoices",
            "/api/approvals",
            "/api/escalations",
            "/api/audit",
            "/api/audit/verify",
            "/api/policies",
            "/api/dashboard/summary",
            "/api/agent/chat"
        ]
    }
