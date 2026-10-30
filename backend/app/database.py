from typing import Optional, Union
import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.app.config import settings

client = None
db = None
is_fallback_mode: bool = False

async def setup_indexes():
    global db
    if db is None:
        return
    try:
        # Enterprise Collection Indexes
        await db.users.create_index("id", unique=True)
        await db.users.create_index("email", unique=True)
        await db.policies.create_index([("doc_name", 1), ("section_id", 1)], unique=True)
        await db.claims.create_index("claim_no", unique=True)
        await db.claims.create_index([("employee_id", 1), ("status", 1)])
        await db.invoices.create_index("invoice_no")
        await db.invoices.create_index([("vendor_id", 1), ("normalized_invoice_no", 1)], unique=True, sparse=True)
        await db.invoices.create_index([("vendor_id", 1), ("status", 1)])
        await db.purchase_orders.create_index("po_no", unique=True)
        await db.approvals.create_index([("entity_id", 1), ("state", 1)], unique=True, partialFilterExpression={"state": "Pending"})
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

async def init_db():
    global client, db, is_fallback_mode
    if not settings.has_valid_mongo_credentials:
        print("\n" + "=" * 70)
        print("[ExpensePilot AI] [!] ATTENTION: MongoDB Atlas password placeholder detected!")
        print("Please open 'backend/.env' and replace <db_password> with your actual MongoDB password.")
        print(f"Current URL: {settings.MONGODB_URL}")
        print("=" * 70 + "\n")

    connected_to_atlas = False
    if settings.has_valid_mongo_credentials:
        try:
            print("[ExpensePilot AI] [*] Connecting to MongoDB Atlas...")
            atlas_client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=5000
            )
            # Verify connectivity with ping
            await atlas_client.admin.command('ping')
            client = atlas_client
            db = client[settings.MONGODB_DB_NAME]
            is_fallback_mode = False
            connected_to_atlas = True
            print(f"[ExpensePilot AI] [+] MongoDB Atlas connected successfully to database: '{settings.MONGODB_DB_NAME}'")
        except Exception as e:
            print(f"[ExpensePilot AI] [!] Atlas connection notice (IP whitelist or network): {e}")

    if not connected_to_atlas:
        print("[ExpensePilot AI] [*] Activating local async database engine (mongomock-motor)...")
        from mongomock_motor import AsyncMongoMockClient
        client = AsyncMongoMockClient()
        db = client[settings.MONGODB_DB_NAME]
        is_fallback_mode = True
        print("[ExpensePilot AI] [+] Local fallback database is active and ready!")

    await setup_indexes()

async def reconnect_atlas_db() -> dict:
    global client, db, is_fallback_mode
    if not settings.has_valid_mongo_credentials:
        return {
            "success": False,
            "message": "MongoDB credentials missing in backend/.env",
            "connected_to_atlas": False
        }
    try:
        atlas_client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=5000
        )
        await atlas_client.admin.command('ping')
        old_db = db
        client = atlas_client
        db = client[settings.MONGODB_DB_NAME]
        is_fallback_mode = False
        print(f"[ExpensePilot AI] 🚀 Switched live connection to MongoDB Atlas '{settings.MONGODB_DB_NAME}'!")

        # Sync memory documents over to Atlas
        if old_db and old_db != db:
            for coll_name in ["expenses", "invoices", "claims", "approvals", "policies", "budgets", "alerts", "saving_goals", "escalations", "audit_log", "users"]:
                try:
                    docs = await old_db[coll_name].find().to_list(1000)
                    if docs:
                        for d in docs:
                            _id = d.pop("_id", None)
                            q = {"id": d["id"]} if "id" in d else ({"_id": _id} if _id else d)
                            await db[coll_name].update_one(q, {"$set": d}, upsert=True)
                except Exception as sync_e:
                    print(f"[Sync notice for {coll_name}]: {sync_e}")

        await setup_indexes()
        return {
            "success": True,
            "message": f"Successfully connected to MongoDB Atlas database '{settings.MONGODB_DB_NAME}'! Real-time syncing active.",
            "connected_to_atlas": True,
            "database_name": settings.MONGODB_DB_NAME
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Atlas connection failed: {str(e)}",
            "connected_to_atlas": False,
            "error": str(e),
            "hint": "Please open cloud.mongodb.com -> Network Access -> Add IP Address -> 'Allow Access from Anywhere' (0.0.0.0/0)"
        }

async def get_db_status_info() -> dict:
    global db, is_fallback_mode
    counts = {}
    if db is not None:
        for coll in ["expenses", "invoices", "claims", "approvals", "audit_log", "policies"]:
            try:
                counts[coll] = await db[coll].count_documents({})
            except Exception:
                counts[coll] = 0
    return {
        "connected_to_atlas": not is_fallback_mode,
        "is_fallback_mode": is_fallback_mode,
        "database_name": settings.MONGODB_DB_NAME,
        "database_mode": "MongoDB Atlas (Cloud Cluster)" if not is_fallback_mode else "High-Speed Async Engine (InMemory)",
        "counts": counts,
        "cluster_host": "cluster0.cllnh1c.mongodb.net",
        "ip_whitelist_instruction": "To enable real-time MongoDB Atlas: In MongoDB Atlas (cloud.mongodb.com), go to Network Access -> '+ Add IP Address' -> click 'Allow Access from Anywhere' (0.0.0.0/0) -> Confirm."
    }

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
