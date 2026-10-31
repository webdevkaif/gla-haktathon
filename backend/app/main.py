import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import init_db, close_db, get_database
from backend.app.routers import (
    users, claims, invoices, approvals, escalations,
    audit, policies, dashboard, agent, notifications,
    expenses, analytics, budgets, goals, anomalies
)
from backend.app.services.seed_data import seed_enterprise_data, seed_demo_data
from backend.app.services.workflow import check_and_send_due_reminders
from backend.app.services.telegram_bot import telegram_polling_worker

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
    telegram_task = None

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

    # Start Telegram Bot Polling Worker if token is configured
    if settings.TELEGRAM_BOT_TOKEN:
        telegram_task = asyncio.create_task(telegram_polling_worker(get_database))

    yield

    if reminder_task:
        reminder_task.cancel()
        try:
            await reminder_task
        except asyncio.CancelledError:
            pass

    if telegram_task:
        telegram_task.cancel()
        try:
            await telegram_task
        except asyncio.CancelledError:
            pass

    await close_db()

app = FastAPI(
    title="Expense Pilot API",
    version=settings.VERSION,
    description="Enterprise Expense and Invoice Query Agent for Meridian Finance & Procurement (Hackathon DEV-C04)",
    lifespan=lifespan
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
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
app.include_router(anomalies.router)

@app.get("/api/system/db-status")
async def get_system_database_status():
    from backend.app.database import get_db_status_info
    return await get_db_status_info()

@app.post("/api/system/reconnect")
async def trigger_atlas_reconnect():
    from backend.app.database import reconnect_atlas_db
    return await reconnect_atlas_db()

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import HTTPException

@app.get("/api")
async def api_info():
    from backend.app.database import is_fallback_mode
    db_mode = "Local Fast-Engine (MongoDB API)" if is_fallback_mode else "MongoDB Atlas"
    db_status = "local_active" if is_fallback_mode else "atlas_connected"
    return {
        "app": "Expense Pilot API",
        "description": "Corporate Expense & Invoice Query Agent (Meridian Dev-C04)",
        "version": settings.VERSION,
        "status": "online",
        "database": db_mode,
        "database_name": settings.MONGODB_DB_NAME,
        "database_status": db_status,
        "currency": settings.DEFAULT_CURRENCY
    }

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    if (frontend_dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="static_assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path in ("api", "docs", "redoc", "openapi.json"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = frontend_dist / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
else:
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
