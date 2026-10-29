import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure backend directory is in python path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir.parent))

from backend.app.config import settings

def main():
    print("=" * 65)
    print("🔍 Testing Mindee OCR API Connection for ExpensePilot AI...")
    print("=" * 65)

    api_key = (settings.MINDEE_API_KEY or "").strip()
    if not api_key:
        print("❌ MINDEE_API_KEY is not set in backend/.env!")
        print("Please add MINDEE_API_KEY=<your_key> to backend/.env and re-run.")
        sys.exit(1)

    masked_key = api_key[:6] + "..." + api_key[-4:] if len(api_key) > 10 else "******"
    is_v2 = api_key.startswith("md_")
    api_version = "v2 (Modern Platform)" if is_v2 else "v1 (Legacy Platform)"

    print(f"API Key       : {masked_key}")
    print(f"Detected Spec : Mindee {api_version}")
    if is_v2:
        model_id = (settings.MINDEE_MODEL_ID or "").strip()
        print(f"Model ID      : {model_id if model_id else 'None configured (auto-discovery mode)'}")
    print("-" * 65)

    try:
        import httpx
    except ImportError:
        print("❌ 'httpx' library is not installed in the current environment.")
        sys.exit(1)

    with httpx.Client(timeout=15.0) as client:
        if is_v2:
            print("📡 Connecting to Mindee V2 API (https://api-v2.mindee.net)...")
            headers = {"Authorization": api_key}
            
            # 1. Test authentication via /v2/search/models
            try:
                resp = client.get("https://api-v2.mindee.net/v2/search/models", headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    models = data.get("models", [])
                    print("✅ Authentication Status : SUCCESS (Your API key is active and verified!)")
                    print(f"📁 Workspace Models Found: {len(models)}")
                    if models:
                        for idx, m in enumerate(models, 1):
                            m_id = m.get("id") or m.get("model_id")
                            m_name = m.get("name") or "Unnamed Model"
                            print(f"   [{idx}] {m_name} (ID: {m_id})")
                    else:
                        print("   ℹ️  No models created yet in your Mindee V2 workspace.")
                        print("\n👉 Next Step to enable invoice parsing:")
                        print("1. Go to https://app.mindee.com")
                        print("2. In the Catalog, click 'Create your document AI model' and select 'Invoice'.")
                        print("3. Copy the generated Model ID.")
                        print("4. Add MINDEE_MODEL_ID=<your_model_id> to backend/.env.")
                elif resp.status_code == 401:
                    print("❌ Authentication Status : FAILED (Invalid API key)")
                    print(f"Response: {resp.text}")
                else:
                    print(f"⚠️  Unexpected response ({resp.status_code}): {resp.text}")
            except Exception as ex:
                print(f"❌ Network/Connection error: {ex}")

        else:
            print("📡 Connecting to Mindee V1 API (https://api.mindee.net)...")
            headers = {"Authorization": f"Token {api_key}"}
            try:
                resp = client.post(
                    "https://api.mindee.net/v1/products/mindee/invoices/v4/predict",
                    headers=headers
                )
                if resp.status_code == 400:
                    print("✅ Authentication Status : SUCCESS (Key accepted; missing document parameter as expected on dry-run)")
                elif resp.status_code == 401:
                    print("❌ Authentication Status : FAILED (Invalid or mismatched token)")
                    print(f"Response: {resp.text}")
                else:
                    print(f"Response ({resp.status_code}): {resp.text[:200]}")
            except Exception as ex:
                print(f"❌ Network/Connection error: {ex}")

    print("=" * 65)

if __name__ == "__main__":
    main()

