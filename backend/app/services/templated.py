import logging
from typing import Dict, Any, Optional
import httpx
from backend.app.config import settings

logger = logging.getLogger("templated_service")

TEMPLATED_BASE_URL = "https://api.templated.io/v1"

async def get_templated_account_status() -> Dict[str, Any]:
    """Retrieves live account status, quota, and available templates from Templated.io."""
    api_key = getattr(settings, "TEMPLATED_API_KEY", "") or getattr(settings, "IMAGE_PDF_API_KEY", "")
    if not api_key:
        return {
            "configured": False,
            "status": "NOT_CONFIGURED",
            "message": "TEMPLATED_API_KEY is not configured in backend/.env."
        }

    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            acct_resp = await client.get(f"{TEMPLATED_BASE_URL}/account", headers=headers)
            templates_resp = await client.get(f"{TEMPLATED_BASE_URL}/templates", headers=headers)

            if acct_resp.status_code == 200:
                acct = acct_resp.json()
                templates = templates_resp.json() if templates_resp.status_code == 200 else []
                return {
                    "configured": True,
                    "status": "ACTIVE_AUTHENTICATED",
                    "email": acct.get("email"),
                    "name": acct.get("name"),
                    "plan": acct.get("plan"),
                    "api_quota": acct.get("apiQuota", 50),
                    "api_usage": acct.get("apiUsage", 0),
                    "templates_count": len(templates),
                    "templates": templates
                }
            else:
                return {
                    "configured": True,
                    "status": "UNAUTHORIZED",
                    "http_code": acct_resp.status_code,
                    "message": "Templated.io authentication failed. Please check your API key."
                }
    except Exception as e:
        logger.warning(f"[Templated.io Notice]: {e}")
        return {
            "configured": True,
            "status": "OFFLINE",
            "message": f"Connection notice: {str(e)}"
        }

async def render_templated_asset(
    template_id: Optional[str] = None,
    layers: Optional[Dict[str, Any]] = None,
    format_type: str = "pdf"
) -> Dict[str, Any]:
    """
    Renders an image or PDF asset using Templated.io API.
    Falls back gracefully if template_id is not yet created.
    """
    api_key = getattr(settings, "TEMPLATED_API_KEY", "") or getattr(settings, "IMAGE_PDF_API_KEY", "")
    target_template = template_id or getattr(settings, "TEMPLATED_TEMPLATE_ID", "")

    if not api_key:
        return {
            "success": False,
            "error": "TEMPLATED_API_KEY missing in backend/.env"
        }

    if not target_template:
        return {
            "success": False,
            "missing_template": True,
            "message": (
                "Templated.io is connected! To render via Templated.io, create a template at "
                "https://app.templated.io and add TEMPLATED_TEMPLATE_ID=<id> to your backend/.env."
            )
        }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "template": target_template,
        "format": format_type.lower(),
        "layers": layers or {}
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{TEMPLATED_BASE_URL}/render",
                headers=headers,
                json=payload
            )
            if resp.status_code in [200, 201]:
                data = resp.json()
                return {
                    "success": True,
                    "download_url": data.get("download_url"),
                    "render_id": data.get("id"),
                    "format": format_type
                }
            else:
                return {
                    "success": False,
                    "error": resp.text,
                    "status_code": resp.status_code
                }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

