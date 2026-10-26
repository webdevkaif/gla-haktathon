from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.app.config import settings

client: Optional[AsyncIOMotorClient] = None
db: Optional[AsyncIOMotorDatabase] = None

async def init_db():
    global client, db
    if not settings.has_valid_mongo_credentials:
        print("\n" + "=" * 70)
        print("[ExpensePilot AI] ⚠️  ATTENTION: MongoDB Atlas password placeholder detected!")
        print("Please open 'backend/.env' and replace <db_password> with your actual MongoDB password.")
        print(f"Current URL: {settings.MONGODB_URL}")
        print("=" * 70 + "\n")

    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=4000
        )
        db = client[settings.MONGODB_DB_NAME]
        
        # Test connection / create indexes if connected
        if settings.has_valid_mongo_credentials:
            await db.expenses.create_index([("user_id", 1), ("date", -1)])
            await db.expenses.create_index([("user_id", 1), ("category", 1)])
            await db.expenses.create_index([("user_id", 1), ("is_unusual", 1)])
            await db.budgets.create_index([("user_id", 1), ("month", 1)], unique=True)
            await db.alerts.create_index([("user_id", 1), ("created_at", -1)])
            await db.saving_goals.create_index([("user_id", 1), ("created_at", -1)])
            print(f"[ExpensePilot AI] ✅ MongoDB Atlas connected successfully to database: '{settings.MONGODB_DB_NAME}'")
    except Exception as e:
        print(f"[ExpensePilot AI] ⚠️ MongoDB initialization notice: {e}")

async def close_db():
    global client
    if client:
        client.close()

def get_database() -> AsyncIOMotorDatabase:
    global db
    return db

async def get_db():
    """FastAPI dependency yielding the async MongoDB database instance."""
    global db
    if db is None:
        await init_db()
    yield db
