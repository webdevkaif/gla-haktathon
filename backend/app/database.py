from typing import Optional, Union
import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.app.config import settings

client = None
db = None
is_fallback_mode: bool = False

async def init_db():
    global client, db, is_fallback_mode
    if not settings.has_valid_mongo_credentials:
        print("\n" + "=" * 70)
        print("[ExpensePilot AI] ⚠️  ATTENTION: MongoDB Atlas password placeholder detected!")
        print("Please open 'backend/.env' and replace <db_password> with your actual MongoDB password.")
        print(f"Current URL: {settings.MONGODB_URL}")
        print("=" * 70 + "\n")

    connected_to_atlas = False
    if settings.has_valid_mongo_credentials:
        try:
            print("[ExpensePilot AI] 🔄 Connecting to MongoDB Atlas...")
            atlas_client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=3000
            )
            # Verify connectivity with ping
            await atlas_client.admin.command('ping')
            client = atlas_client
            db = client[settings.MONGODB_DB_NAME]
            is_fallback_mode = False
            connected_to_atlas = True
            print(f"[ExpensePilot AI] ✅ MongoDB Atlas connected successfully to database: '{settings.MONGODB_DB_NAME}'")
        except Exception as e:
            print(f"[ExpensePilot AI] ⚠️ Atlas connection notice (IP whitelist or network): {e}")

    if not connected_to_atlas:
        print("[ExpensePilot AI] 🚀 Activating local async database engine (mongomock-motor)...")
        from mongomock_motor import AsyncMongoMockClient
        client = AsyncMongoMockClient()
        db = client[settings.MONGODB_DB_NAME]
        is_fallback_mode = True
        print("[ExpensePilot AI] ✅ Local fallback database is active and ready!")

    try:
        # Enterprise Collection Indexes
        await db.users.create_index("id", unique=True)
        await db.policies.create_index([("doc_name", 1), ("section_id", 1)], unique=True)
        await db.claims.create_index("claim_no", unique=True)
        await db.claims.create_index([("employee_id", 1), ("status", 1)])
        await db.invoices.create_index("invoice_no")
        await db.invoices.create_index([("vendor_id", 1), ("status", 1)])
        await db.purchase_orders.create_index("po_no", unique=True)
        await db.approvals.create_index([("entity_id", 1), ("approver_id", 1), ("state", 1)])
        await db.escalations.create_index([("entity_id", 1), ("status", 1)])
        await db.audit_log.create_index([("ts", -1), ("actor_id", 1)])

        # Legacy Indexes
        await db.expenses.create_index([("user_id", 1), ("date", -1)])
        await db.expenses.create_index([("user_id", 1), ("category", 1)])
        await db.expenses.create_index([("user_id", 1), ("is_unusual", 1)])
        await db.budgets.create_index([("user_id", 1), ("month", 1)], unique=True)
        await db.alerts.create_index([("user_id", 1), ("created_at", -1)])
        await db.saving_goals.create_index([("user_id", 1), ("created_at", -1)])
    except Exception as e:
        print(f"[Expense Pilot] Index setup notice: {e}")

async def close_db():
    global client
    if client:
        try:
            client.close()
        except Exception:
            pass

def get_database():
    global db
    return db

async def get_db():
    """FastAPI dependency yielding the async database instance."""
    global db
    if db is None:
        await init_db()
    yield db
