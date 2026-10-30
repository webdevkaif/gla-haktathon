#!/usr/bin/env python3
"""
ExpensePilot AI - Standalone MongoDB Atlas Data Seeder & Health Check
Populates real-time enterprise and personal financial data directly into MongoDB Atlas.
"""

import sys
import os
import asyncio
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from backend.app.config import settings
from backend.app.services.seed_data import seed_enterprise_data, seed_demo_data
from backend.app.database import setup_indexes

async def run_seeder():
    print("=" * 70)
    print(" 🚀 ExpensePilot AI - MongoDB Atlas Real-Time Data Seeder")
    print("=" * 70)
    print(f"Database Target: {settings.MONGODB_DB_NAME}")
    print(f"Cluster Host   : cluster0.cllnh1c.mongodb.net")
    print(f"Connecting to MongoDB Atlas...")

    try:
        atlas_client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=7000
        )
        # Test connection ping
        await atlas_client.admin.command('ping')
        print(" ✅ SUCCESS: Connected to MongoDB Atlas cloud cluster!\n")
    except Exception as err:
        print("\n" + "❌" * 35)
        print(" ⚠️  MONGODB ATLAS CONNECTION BLOCKED BY IP ACCESS LIST")
        print("❌" * 35)
        print("\nMongoDB Atlas default security blocks connections until your IP is whitelisted.")
        print(f"Error Details: {err}\n")
        print("👉 QUICK 30-SECOND FIX:")
        print(" 1. Open: https://cloud.mongodb.com")
        print(" 2. In left sidebar, click 'Network Access' (under Security)")
        print(" 3. Click the green '+ ADD IP ADDRESS' button")
        print(" 4. Click 'ALLOW ACCESS FROM ANYWHERE' (entry: 0.0.0.0/0)")
        print(" 5. Click 'Confirm' and wait ~15 seconds for status to turn active")
        print(" 6. Re-run: python backend/seed_mongo.py\n")
        print("=" * 70)
        return False

    db = atlas_client[settings.MONGODB_DB_NAME]

    print("📦 Seeding Enterprise HQ Real-Time Data (Policies, Claims, Invoices, Approvals, Audit)...")
    await seed_enterprise_data(db)

    print("💰 Seeding Real-Time Expenses, Budgets, Saving Goals & Anomaly Alerts...")
    count_demo = await seed_demo_data(db, user_id="demo_user_1")
    count_default = await seed_demo_data(db, user_id="user_default")

    print("⚙️  Configuring database indexes and performance constraints...")
    # Inject db into global database module so setup_indexes works
    import backend.app.database as db_mod
    db_mod.db = db
    await setup_indexes()

    print("\n" + "=" * 70)
    print(" ✅ REAL-TIME MONGODB ATLAS SEEDING COMPLETED SUCCESSFULLY!")
    print("=" * 70)
    
    collections = [
        "users", "policies", "invoices", "purchase_orders", 
        "claims", "approvals", "escalations", "audit_log", 
        "expenses", "budgets", "alerts", "saving_goals"
    ]
    
    print(f"{'Collection':<22} | {'Document Count':<15}")
    print("-" * 40)
    for col in collections:
        try:
            cnt = await db[col].count_documents({})
            print(f"{col:<22} | {cnt:<15}")
        except Exception:
            pass
    print("=" * 70)
    print("🎉 Your MongoDB Atlas database is now fully armed with live real-time data!")
    print("Start the backend server with: python -m uvicorn backend.app.main:app --reload")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = asyncio.run(run_seeder())
    sys.exit(0 if success else 1)

