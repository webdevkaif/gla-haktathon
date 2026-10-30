import re
from typing import Dict, Any, Optional
import httpx
from backend.app.config import settings

async def fetch_url_markdown(url: str, timeout: float = 15.0) -> Dict[str, Any]:
    """
    Fetches any webpage and converts it into clean, LLM-ready Markdown using Jina AI Reader API (r.jina.ai).
    Works with or without a JINA_API_KEY (supports rate-limited free tier and authenticated plans).
    """
    clean_url = url.strip()
    # Strip redundant r.jina.ai prefix if present in the target url (e.g. from curl examples)
    clean_url = re.sub(r'^https?://r\.jina\.ai/', '', clean_url).strip()
    if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
        clean_url = f"https://{clean_url}"

    base_reader = (settings.JINA_READER_BASE_URL or "https://r.jina.ai").rstrip("/")
    target_endpoint = f"{base_reader}/{clean_url}"

    headers = {
        "Accept": "text/markdown, text/plain",
        "User-Agent": "ExpensePilot-AI-Agent/2.0"
    }
    if getattr(settings, "JINA_API_KEY", None) and settings.JINA_API_KEY.strip():
        headers["Authorization"] = f"Bearer {settings.JINA_API_KEY.strip()}"

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(target_endpoint, headers=headers)
            if resp.status_code == 200:
                raw_text = resp.text
                
                # Extract title if present
                title = "Webpage Content"
                title_match = re.search(r'^Title:\s*(.+)$', raw_text, re.MULTILINE)
                if title_match:
                    title = title_match.group(1).strip()
                
                # Extract markdown body after header markers if formatted by Jina
                body = raw_text
                if "Markdown Content:" in raw_text:
                    parts = raw_text.split("Markdown Content:", 1)
                    body = parts[1].strip()

                return {
                    "success": True,
                    "url": clean_url,
                    "title": title,
                    "markdown": body[:12000],  # Guardrail max length for LLM context
                    "raw_length": len(raw_text),
                    "status_code": 200
                }
            else:
                return {
                    "success": False,
                    "url": clean_url,
                    "error": f"Jina Reader returned status {resp.status_code}: {resp.text[:200]}",
                    "status_code": resp.status_code
                }
    except Exception as e:
        return {
            "success": False,
            "url": clean_url,
            "error": str(e),
            "status_code": 500
        }
