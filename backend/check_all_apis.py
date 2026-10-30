import asyncio
import os
import sys
import time
import httpx
from dotenv import load_dotenv

# Ensure root directory is in pythonpath
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv("backend/.env")

RESULTS = []

def record(category: str, name: str, status: str, latency_ms: float, details: str = ""):
    RESULTS.append({
        "category": category,
        "name": name,
        "status": status,
        "latency_ms": latency_ms,
        "details": details
    })

async def check_mongodb():
    start = time.perf_counter()
    url = os.getenv("MONGODB_URL", "")
    if not url:
        record("Database", "MongoDB Atlas", "SKIPPED", 0, "No MONGODB_URL configured")
        return
    
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=4000)
        res = await client.admin.command("ping")
        elapsed = (time.perf_counter() - start) * 1000
        record("Database", "MongoDB Atlas Cloud", "CONNECTED", round(elapsed, 1), f"Atlas Ping OK: {res.get('ok')}")
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        record("Database", "MongoDB Atlas Cloud", "OFFLINE/BLOCKED", round(elapsed, 1), str(e)[:120])

async def check_groq():
    start = time.perf_counter()
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        record("LLM API", "Groq Cloud API", "SKIPPED", 0, "No GROQ_API_KEY configured")
        return
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            elapsed = (time.perf_counter() - start) * 1000
            if resp.status_code == 200:
                models = resp.json().get("data", [])
                record("LLM API", "Groq Cloud API", "CONNECTED", round(elapsed, 1), f"Status 200 OK ({len(models)} models available)")
            else:
                record("LLM API", "Groq Cloud API", "AUTH_ERROR", round(elapsed, 1), f"HTTP {resp.status_code}: {resp.text[:100]}")
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        record("LLM API", "Groq Cloud API", "NETWORK_ERROR", round(elapsed, 1), str(e)[:120])

async def check_gemini():
    start = time.perf_counter()
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        record("LLM API", "Google Gemini API", "SKIPPED", 0, "No GEMINI_API_KEY configured")
        return
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}")
            elapsed = (time.perf_counter() - start) * 1000
            if resp.status_code == 200:
                models = resp.json().get("models", [])
                record("LLM API", "Google Gemini API", "CONNECTED", round(elapsed, 1), f"Status 200 OK ({len(models)} models)")
            else:
                record("LLM API", "Google Gemini API", "AUTH_ERROR", round(elapsed, 1), f"HTTP {resp.status_code}: {resp.text[:100]}")
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        record("LLM API", "Google Gemini API", "NETWORK_ERROR", round(elapsed, 1), str(e)[:120])

async def check_telegram():
    start = time.perf_counter()
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not token:
        record("Messaging", "Telegram Bot API", "SKIPPED", 0, "No TELEGRAM_BOT_TOKEN configured")
        return
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(f"https://api.telegram.org/bot{token}/getMe")
            elapsed = (time.perf_counter() - start) * 1000
            if resp.status_code == 200 and resp.json().get("ok"):
                bot_user = resp.json().get("result", {}).get("username", "")
                record("Messaging", "Telegram Bot API", "CONNECTED", round(elapsed, 1), f"Bot @{bot_user} is ONLINE")
            else:
                record("Messaging", "Telegram Bot API", "ERROR", round(elapsed, 1), f"HTTP {resp.status_code}: {resp.text[:100]}")
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        record("Messaging", "Telegram Bot API", "NETWORK_ERROR", round(elapsed, 1), str(e)[:120])

async def check_mindee():
    start = time.perf_counter()
    api_key = os.getenv("MINDEE_API_KEY", "")
    if not api_key:
        record("OCR API", "Mindee Invoice OCR", "SKIPPED", 0, "No MINDEE_API_KEY configured")
        return
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://api.mindee.net/v1/products",
                headers={"Authorization": f"Token {api_key}"}
            )
            elapsed = (time.perf_counter() - start) * 1000
            if resp.status_code in (200, 404, 403, 401):
                # Check status
                status = "CONNECTED" if resp.status_code == 200 else ("AUTH_ERROR" if resp.status_code == 401 else "REACHABLE")
                record("OCR API", "Mindee Invoice OCR", status, round(elapsed, 1), f"HTTP {resp.status_code}")
            else:
                record("OCR API", "Mindee Invoice OCR", "RESPONSE_ERROR", round(elapsed, 1), f"HTTP {resp.status_code}")
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        record("OCR API", "Mindee Invoice OCR", "NETWORK_ERROR", round(elapsed, 1), str(e)[:120])

async def check_jina_reader():
    start = time.perf_counter()
    base_url = os.getenv("JINA_READER_BASE_URL", "https://r.jina.ai")
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(f"{base_url}/https://example.com")
            elapsed = (time.perf_counter() - start) * 1000
            if resp.status_code == 200:
                record("Web Scraping", "Jina AI Reader API", "CONNECTED", round(elapsed, 1), f"HTTP 200 ({len(resp.text)} bytes parsed)")
            else:
                record("Web Scraping", "Jina AI Reader API", "ERROR", round(elapsed, 1), f"HTTP {resp.status_code}")
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        record("Web Scraping", "Jina AI Reader API", "NETWORK_ERROR", round(elapsed, 1), str(e)[:120])

async def check_craftmypdf():
    start = time.perf_counter()
    api_key = os.getenv("CRAFTMYPDF_API_KEY", "")
    if not api_key:
        record("PDF API", "CraftMyPDF API", "SKIPPED", 0, "No CRAFTMYPDF_API_KEY")
        return
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://api.craftmypdf.com/v1/list-templates",
                headers={"X-API-KEY": api_key}
            )
            elapsed = (time.perf_counter() - start) * 1000
            if resp.status_code == 200:
                record("PDF API", "CraftMyPDF API", "CONNECTED", round(elapsed, 1), f"HTTP 200 (Templates listed)")
            elif resp.status_code in (401, 403):
                record("PDF API", "CraftMyPDF API", "AUTH_ERROR", round(elapsed, 1), f"HTTP {resp.status_code}")
            else:
                record("PDF API", "CraftMyPDF API", "REACHABLE", round(elapsed, 1), f"HTTP {resp.status_code}")
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        record("PDF API", "CraftMyPDF API", "NETWORK_ERROR", round(elapsed, 1), str(e)[:120])

async def check_templated():
    start = time.perf_counter()
    api_key = os.getenv("TEMPLATED_API_KEY", "")
    if not api_key:
        record("Visual API", "Templated.io API", "SKIPPED", 0, "No TEMPLATED_API_KEY")
        return
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://api.templated.io/v1/templates",
                headers={"Authorization": f"Bearer {api_key}"}
            )
            elapsed = (time.perf_counter() - start) * 1000
            if resp.status_code == 200:
                record("Visual API", "Templated.io API", "CONNECTED", round(elapsed, 1), "HTTP 200 OK")
            elif resp.status_code in (401, 403):
                record("Visual API", "Templated.io API", "AUTH_ERROR", round(elapsed, 1), f"HTTP {resp.status_code}")
            else:
                record("Visual API", "Templated.io API", "REACHABLE", round(elapsed, 1), f"HTTP {resp.status_code}")
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        record("Visual API", "Templated.io API", "NETWORK_ERROR", round(elapsed, 1), str(e)[:120])

async def check_msg91():
    start = time.perf_counter()
    api_key = os.getenv("MSG91_AUTH_KEY", "")
    if not api_key:
        record("Telephony", "MSG91 Voice/SMS API", "SKIPPED", 0, "No MSG91_AUTH_KEY")
        return
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://control.msg91.com/api/v5/balance",
                headers={"authkey": api_key}
            )
            elapsed = (time.perf_counter() - start) * 1000
            if resp.status_code == 200:
                record("Telephony", "MSG91 Voice/SMS API", "CONNECTED", round(elapsed, 1), "HTTP 200 (Account active)")
            elif resp.status_code in (401, 403):
                record("Telephony", "MSG91 Voice/SMS API", "AUTH_ERROR", round(elapsed, 1), f"HTTP {resp.status_code}")
            else:
                record("Telephony", "MSG91 Voice/SMS API", "REACHABLE", round(elapsed, 1), f"HTTP {resp.status_code}")
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        record("Telephony", "MSG91 Voice/SMS API", "NETWORK_ERROR", round(elapsed, 1), str(e)[:120])

async def check_internal_endpoints():
    from backend.app.main import app
    from backend.app.database import init_db
    await init_db()
    
    internal_endpoints = [
        ("GET", "/"),
        ("GET", "/api/system/db-status"),
        ("GET", "/api/users"),
        ("GET", "/api/users/me"),
        ("GET", "/api/invoices"),
        ("GET", "/api/invoices/summary"),
        ("GET", "/api/claims"),
        ("GET", "/api/expenses"),
        ("GET", "/api/budgets"),
        ("GET", "/api/approvals"),
        ("GET", "/api/escalations"),
        ("GET", "/api/policies"),
        ("GET", "/api/policies/qa?query=hotel"),
        ("GET", "/api/anomalies"),
        ("GET", "/api/analytics/category-breakdown"),
        ("GET", "/api/analytics/spending-pace"),
        ("GET", "/api/analytics/cumulative-daily"),
        ("GET", "/api/analytics/roadmap/pdf"),
        ("GET", "/api/analytics/spending-card/image"),
        ("GET", "/api/agent/read-url?url=https://example.com"),
        ("GET", "/api/notifications/telegram/status"),
        ("GET", "/api/audit"),
        ("GET", "/api/audit/verify"),
    ]
    
    from backend.app.auth import create_access_token
    token = create_access_token({"sub": "user_kaif", "role": "admin", "name": "Mohammad Kaif"})
    headers = {"Authorization": f"Bearer {token}"}
    
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        for method, path in internal_endpoints:
            start = time.perf_counter()
            try:
                resp = await client.request(method, path, headers=headers)
                elapsed = (time.perf_counter() - start) * 1000
                st = "CONNECTED" if resp.status_code == 200 else f"HTTP_{resp.status_code}"
                record("Internal Service", f"{method} {path.split('?')[0]}", st, round(elapsed, 1), f"Status {resp.status_code}")
            except Exception as e:
                elapsed = (time.perf_counter() - start) * 1000
                record("Internal Service", f"{method} {path.split('?')[0]}", "ERROR", round(elapsed, 1), str(e)[:80])

async def main():
    print("\n" + "=" * 80)
    print(" 📡 EXPENSEPILOT AI — COMPREHENSIVE MULTI-CLOUD API CONNECTIVITY AUDIT")
    print("=" * 80)
    
    print("\n🔍 Phase 1: Checking External Cloud Services & Provider APIs...")
    await check_mongodb()
    await check_groq()
    await check_gemini()
    await check_telegram()
    await check_mindee()
    await check_jina_reader()
    await check_craftmypdf()
    await check_templated()
    await check_msg91()
    
    print("\n🔍 Phase 2: Checking Internal Application & Enterprise Microservices...")
    await check_internal_endpoints()
    
    print("\n" + "=" * 80)
    print(f"{'CATEGORY':<18} | {'SERVICE / API NAME':<32} | {'STATUS':<15} | {'LATENCY':<9} | {'DETAILS'}")
    print("-" * 80)
    for r in RESULTS:
        color_sym = "🟢" if r["status"] == "CONNECTED" else ("🟡" if "REACHABLE" in r["status"] or "HTTP" in r["status"] else "🔴")
        print(f"{r['category']:<18} | {r['name']:<32} | {color_sym} {r['status']:<13} | {r['latency_ms']:>6.1f}ms | {r['details']}")
    
    total = len(RESULTS)
    connected = sum(1 for r in RESULTS if r["status"] == "CONNECTED")
    print("=" * 80)
    print(f"Audit Complete: {connected}/{total} APIs Fully Connected & Responsive.")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
