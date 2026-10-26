from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import init_db, close_db, get_database
from backend.app.routers import expenses, budgets, analytics, goals, agent
from backend.app.services.seed_data import seed_demo_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize MongoDB database client and indexes
    await init_db()
    
    # Auto-seed demo data if expenses collection is empty
    if settings.has_valid_mongo_credentials:
        try:
            db = get_database()
            if db is not None:
                count = await db.expenses.count_documents({})
                if count == 0:
                    print("[ExpensePilot AI] Initializing demo data in MongoDB Atlas...")
                    await seed_demo_data(db, settings.DEFAULT_USER_ID)
                    print("[ExpensePilot AI] Ready with MongoDB seed data!")
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

@app.get("/")
async def root():
    mongo_status = "connected" if settings.has_valid_mongo_credentials else "needs_db_password"
    return {
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "online",
        "database": "MongoDB Atlas",
        "database_name": settings.MONGODB_DB_NAME,
        "database_status": mongo_status,
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
    mongo_status = "configured" if settings.has_valid_mongo_credentials else "needs_db_password"
    return {
        "status": "ok",
        "database": "MongoDB Atlas",
        "mongodb_status": mongo_status
    }
