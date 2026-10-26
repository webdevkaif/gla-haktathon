import asyncio
import sys
import os
from pathlib import Path

# Ensure backend directory is in python path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir.parent))

from backend.app.config import settings
from backend.app.database import init_db, close_db, get_database
from backend.app.services.seed_data import seed_demo_data

async def main():
    print("=" * 60)
    print("🔍 Testing MongoDB Atlas Connection for ExpensePilot AI...")
    print("=" * 60)
    
    # Hide password in displayed URL
    masked_url = settings.MONGODB_URL
    if "@" in masked_url and ":" in masked_url.split("@")[0]:
        prefix, rest = masked_url.split("@", 1)
        proto_user, _ = prefix.rsplit(":", 1)
        masked_url = f"{proto_user}:******@{rest}"
        
    print(f"Cluster URI : {masked_url}")
    print(f"Database    : {settings.MONGODB_DB_NAME}")
    print("-" * 60)

    try:
        await init_db()
        db = get_database()
        
        # Ping command
        ping_res = await db.client.admin.command('ping')
        print(f"✅ Connection Status : SUCCESS (Ping response: {ping_res})")
        
        # Check / list collections
        cols = await db.list_collection_names()
        print(f"📁 Collections Found : {cols if cols else 'None yet (empty database)'}")
        
        # Count documents
        expenses_cnt = await db.expenses.count_documents({})
        budgets_cnt = await db.budgets.count_documents({})
        alerts_cnt = await db.alerts.count_documents({})
        goals_cnt = await db.saving_goals.count_documents({})
        
        print(f"   • Expenses     : {expenses_cnt} records")
        print(f"   • Budgets      : {budgets_cnt} records")
        print(f"   • Alerts       : {alerts_cnt} records")
        print(f"   • Saving Goals : {goals_cnt} records")

        # Auto-seed if empty
        if expenses_cnt == 0:
            print("\n🌱 Database is empty. Seeding initial realistic demo data...")
            seeded_count = await seed_demo_data(db, settings.DEFAULT_USER_ID)
            print(f"✅ Successfully seeded {seeded_count} demo expenses and starting budget!")
            
        print("=" * 60)
        print("🎉 Your MongoDB Atlas database is 100% CONNECTED and READY!")
        print("=" * 60)

    except Exception as e:
        print(f"❌ Connection Status : FAILED")
        print(f"Error Details       : {e}")
        print("\nTroubleshooting Tips:")
        print("1. Check that your IP address is allowed in MongoDB Atlas (Network Access -> Add 0.0.0.0/0).")
        print("2. Ensure username & password in backend/.env are correct without angle brackets '<>'.")
    finally:
        await close_db()

if __name__ == "__main__":
    asyncio.run(main())
