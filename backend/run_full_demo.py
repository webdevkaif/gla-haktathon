import asyncio
import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import time
import json
import httpx
from backend.app.main import app
from backend.app.database import init_db, get_database
from backend.app.services.seed_data import seed_enterprise_data, seed_demo_data
from backend.app.auth import create_demo_token

def get_auth_headers(user_id: str = "user_kaif"):
    token = create_demo_token(user_id)
    return {
        "Authorization": f"Bearer {token}",
        "X-User-Id": user_id,
        "Content-Type": "application/json"
    }

async def run_full_api_demo():
    print("\n" + "═" * 78)
    print(" 🚀  EXPENSEPILOT AI — COMPREHENSIVE LIVE API TEST & DEMONSTRATION")
    print("═" * 78)

    # 1. Initialize DB and Seed Data
    await init_db()
    db = get_database()
    if db is not None:
        await seed_enterprise_data(db)
        await seed_demo_data(db, "user_kaif")
        await seed_demo_data(db, "emp_john")

    transport = httpx.ASGITransport(app=app)
    results = []

    async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=30.0) as client:

        async def call_api(category: str, name: str, method: str, url: str, headers=None, json_body=None, params=None):
            t0 = time.perf_counter()
            try:
                if method.upper() == "GET":
                    resp = await client.get(url, headers=headers, params=params)
                elif method.upper() == "POST":
                    resp = await client.post(url, headers=headers, json=json_body, params=params)
                elif method.upper() == "PUT":
                    resp = await client.put(url, headers=headers, json=json_body)
                elif method.upper() == "DELETE":
                    resp = await client.delete(url, headers=headers)
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                duration_ms = (time.perf_counter() - t0) * 1000
                is_ok = 200 <= resp.status_code < 300
                
                try:
                    data = resp.json()
                except Exception:
                    data = resp.text

                results.append({
                    "category": category,
                    "name": name,
                    "method": method.upper(),
                    "url": url,
                    "status": resp.status_code,
                    "duration_ms": duration_ms,
                    "ok": is_ok,
                    "data": data
                })
                
                status_icon = "✔" if is_ok else "✖"
                status_color = "\033[92m" if is_ok else "\033[91m"
                reset_color = "\033[0m"
                print(f" {status_color}[{status_icon}] {resp.status_code}\033[0m │ {method.upper():<5} {url:<38} │ {duration_ms:>6.1f} ms │ {name}")
                return data
            except Exception as e:
                duration_ms = (time.perf_counter() - t0) * 1000
                print(f" \033[91m[✖] ERR\033[0m │ {method.upper():<5} {url:<38} │ {duration_ms:>6.1f} ms │ {name} -> {e}")
                results.append({
                    "category": category,
                    "name": name,
                    "method": method.upper(),
                    "url": url,
                    "status": 500,
                    "duration_ms": duration_ms,
                    "ok": False,
                    "data": str(e)
                })
                return None

        # -------------------------------------------------------------
        print("\n── [1] SYSTEM & DATABASE HEALTH CHECK ──────────────────────────")
        await call_api("System", "Root Health & Version Info", "GET", "/")
        await call_api("System", "MongoDB Atlas Live Connection Status", "GET", "/api/system/db-status")

        # -------------------------------------------------------------
        print("\n── [2] AUTHENTICATION & USER RBAC ──────────────────────────────")
        await call_api("Auth", "List Enterprise Demo Profiles", "GET", "/api/users")
        auth_h = get_auth_headers("user_kaif")
        await call_api("Auth", "Current User Profile (Mohammad Kaif)", "GET", "/api/users/me", headers=auth_h)

        # -------------------------------------------------------------
        print("\n── [3] CORPORATE EXPENSES & INVOICES ───────────────────────────")
        await call_api("Invoices", "Fetch Vendor Invoices", "GET", "/api/invoices", headers=auth_h)
        await call_api("Invoices", "Vendor Invoices KPI Summary", "GET", "/api/invoices/summary", headers=auth_h)
        await call_api("Claims", "Role-based Claims Listing", "GET", "/api/claims", headers=auth_h)
        await call_api("Expenses", "Personal Real-time Expenses", "GET", "/api/expenses", headers=auth_h)

        # -------------------------------------------------------------
        print("\n── [4] APPROVAL WORKFLOWS & ESCALATIONS ─────────────────────────")
        await call_api("Approvals", "Pending Approvals & SLAs", "GET", "/api/approvals", headers=auth_h)
        await call_api("Escalations", "Finance Escalation Queue", "GET", "/api/escalations", headers=auth_h)

        # -------------------------------------------------------------
        print("\n── [5] COMPLIANCE POLICIES & Q&A ───────────────────────────────")
        await call_api("Policies", "Corporate Policy Knowledge Base", "GET", "/api/policies", headers=auth_h)
        await call_api("Policies", "Policy Q&A: Hotel City Limits", "GET", "/api/policies/qa", headers=auth_h, params={"q": "hotel room limit Tier-1"})

        # -------------------------------------------------------------
        print("\n── [6] MACHINE LEARNING ANOMALY DETECTION (PyOD) ───────────────")
        await call_api("ML", "PyOD Isolation Forest Anomaly Detection", "GET", "/api/anomalies", headers=auth_h)
        await call_api("ML", "Trigger Live Anomaly Scan", "POST", "/api/anomalies/detect", headers=auth_h)

        # -------------------------------------------------------------
        print("\n── [7] FINANCIAL ANALYTICS & FORECASTING ────────────────────────")
        await call_api("Analytics", "Category Breakdown Distribution", "GET", "/api/analytics/category-breakdown", headers=auth_h)
        await call_api("Analytics", "Monthly Spending Pace vs Budget", "GET", "/api/analytics/spending-pace", headers=auth_h)
        await call_api("Analytics", "Cumulative Daily Spending Trajectory", "GET", "/api/analytics/cumulative-daily", headers=auth_h)

        # -------------------------------------------------------------
        print("\n── [8] DOCUMENT SYNTHESIS: VECTOR PDF & HD VISUAL CARDS ─────────")
        await call_api("Synthesis", "Roadmap Executive PDF Endpoint", "GET", "/api/analytics/roadmap/pdf", headers=auth_h)
        await call_api("Synthesis", "Custom Title PDF Generator", "POST", "/api/analytics/pdf/generate", headers=auth_h, json_body={
            "title": "GLA University Hackathon Financial Audit 2026",
            "notes": "Audited via PyOD ML Anomaly Detection engine."
        })
        await call_api("Synthesis", "Spending Visual Card PNG", "GET", "/api/analytics/spending-card/image", headers=auth_h)

        # -------------------------------------------------------------
        print("\n── [9] JINA AI WEB READER (r.jina.ai) ──────────────────────────")
        await call_api("Jina Reader", "Webpage Markdown Extraction (GET)", "GET", "/api/agent/read-url", params={"url": "https://www.example.com"})
        await call_api("Jina Reader", "Webpage Markdown Extraction (POST)", "POST", "/api/agent/read-url", json_body={"url": "https://www.example.com"})

        # -------------------------------------------------------------
        print("\n── [10] TELEGRAM BOT & NOTIFICATIONS ───────────────────────────")
        await call_api("Notifications", "Telegram Bot Status & Paired Devices", "GET", "/api/notifications/telegram/status")
        await call_api("Notifications", "Pair Telegram Device ID", "POST", "/api/notifications/telegram/pair", json_body={"device_id": "999753479"})

        # -------------------------------------------------------------
        print("\n── [11] AI AGENT, DEVICE CALLING & AUDIT LEDGER ──────────────")
        chat_res = await call_api("AI Agent", "Agent Chat Query (Greeting & Name)", "POST", "/api/agent/chat", headers=auth_h, json_body={
            "message": "Hi, who am I and what can you do?",
            "user_id": "user_kaif",
            "user_name": "Mohammad Kaif"
        })
        await call_api("AI Agent", "Agent Autonomous Device Calling", "POST", "/api/agent/call-device", headers=auth_h, json_body={
            "phone_number": "+919997534798",
            "reason": "Test Device Calling API from Full Demo",
            "voice_message": "Hello Mohammad Kaif! Your ExpensePilot AI device calling integration is 100% operational."
        })
        await call_api("Budgets", "Departmental Budgets Listing", "GET", "/api/budgets", headers=auth_h)
        await call_api("Audit", "Tamper-evident SHA-256 Audit Trail", "GET", "/api/audit", headers=auth_h)
        await call_api("Audit", "Cryptographic Audit Chain Verification", "GET", "/api/audit/verify", headers=auth_h)

    # Summary Statistics
    total_apis = len(results)
    passed_apis = sum(1 for r in results if r["ok"])
    failed_apis = total_apis - passed_apis
    avg_latency = sum(r["duration_ms"] for r in results) / total_apis if total_apis else 0

    print("\n" + "═" * 78)
    print(f" 📊 TEST & DEMO SUMMARY: {passed_apis}/{total_apis} APIs PASSED ({passed_apis/total_apis*100:.1f}%)")
    print(f" ⚡ Average Response Latency: {avg_latency:.1f} ms")
    if failed_apis > 0:
        print(f" ✖ Failed APIs: {failed_apis}")
    else:
        print(" 🌟 ALL ENTERPRISE & AGENT APIS VERIFIED 100% OPERATIONAL")
    print("═" * 78 + "\n")

    # Sample detailed outputs for key capabilities
    if chat_res:
        print("💬 [LIVE AGENT RESPONSE DEMO]:")
        print("─" * 40)
        print(chat_res.get("reply", "")[:350] + ("..." if len(chat_res.get("reply", "")) > 350 else ""))
        print("─" * 40)

if __name__ == "__main__":
    asyncio.run(run_full_api_demo())
