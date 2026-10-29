from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import init_db, close_db, get_database
from backend.app.routers import expenses, budgets, analytics, goals, agent, invoices, notifications
from backend.app.services.seed_data import seed_demo_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize MongoDB database client and indexes
    await init_db()
    
    # Auto-seed demo data if expenses collection is empty
    try:
        db = get_database()
        if db is not None:
            count = await db.expenses.count_documents({})
            if count == 0:
                print("[ExpensePilot AI] Initializing realistic demo financial data...")
                await seed_demo_data(db, settings.DEFAULT_USER_ID)
                print("[ExpensePilot AI] Ready with seed data!")
    except Exception as e:
        print(f"[ExpensePilot AI] Notice checking seed data: {e}")
            
    yield
    await close_db()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Autonomous Expense Management Agent API (MongoDB Atlas)",
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

# Register routers
app.include_router(expenses.router)
app.include_router(budgets.router)
app.include_router(analytics.router)
app.include_router(goals.router)
app.include_router(agent.router)
app.include_router(invoices.router)
app.include_router(notifications.router)

@app.get("/")
async def root():
    from backend.app.database import is_fallback_mode
    db_mode = "Local Fast-Engine (MongoDB API)" if is_fallback_mode else "MongoDB Atlas"
    db_status = "local_active" if is_fallback_mode else "atlas_connected"
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "online",
        "database": db_mode,
        "database_name": settings.MONGODB_DB_NAME,
        "database_status": db_status,
        "currency": settings.DEFAULT_CURRENCY,
        "endpoints": [
            "/api/expenses",
            "/api/budgets/current",
            "/api/analytics/monthly",
            "/api/analytics/forecast",
            "/api/analytics/what-if",
            "/api/analytics/alerts",
            "/api/goals",
            "/api/agent/chat"
        ]
    }

@app.get("/health")
async def health():
    from backend.app.database import is_fallback_mode
    db_mode = "Local Fast-Engine (MongoDB API)" if is_fallback_mode else "MongoDB Atlas"
    return {
        "status": "ok",
        "database": db_mode,
        "mongodb_status": "ready"
    }
