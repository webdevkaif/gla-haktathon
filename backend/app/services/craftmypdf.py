import logging
from typing import Dict, Any, Optional
import httpx
from backend.app.config import settings

logger = logging.getLogger("craftmypdf_service")

CRAFTMYPDF_BASE_URL = "https://api.craftmypdf.com/v1"

async def get_craftmypdf_status() -> Dict[str, Any]:
    """Checks live authentication and lists available templates in CraftMyPDF."""
    api_key = getattr(settings, "CRAFTMYPDF_API_KEY", "")
    if not api_key:
        return {
            "configured": False,
            "status": "NOT_CONFIGURED",
            "message": "CRAFTMYPDF_API_KEY is not configured in backend/.env."
        }

    headers = {"X-API-KEY": api_key}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(f"{CRAFTMYPDF_BASE_URL}/list-templates", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                templates = data.get("templates", [])
                return {
                    "configured": True,
                    "status": "ACTIVE_AUTHENTICATED",
                    "http_code": 200,
                    "templates_count": len(templates),
                    "templates": templates,
                    "message": "CraftMyPDF API key is authenticated and active."
                }
            elif resp.status_code == 401:
                return {
                    "configured": True,
                    "status": "UNAUTHORIZED",
                    "http_code": 401,
                    "message": "CraftMyPDF returned 401 Unauthorized. Key is invalid."
                }
            else:
                return {
                    "configured": True,
                    "status": f"HTTP_{resp.status_code}",
                    "message": resp.text
                }
    except Exception as e:
        logger.warning(f"[CraftMyPDF Diagnostic Notice]: {e}")
        return {
            "configured": True,
            "status": "OFFLINE",
            "message": f"Connection notice: {str(e)}"
        }

async def render_craftmypdf_document(
    data_payload: Dict[str, Any],
    template_id: Optional[str] = None,
    output_format: str = "pdf"
) -> Dict[str, Any]:
    """
    Renders a PDF or PNG/JPG image asset using CraftMyPDF cloud service.
    Automatically routes to /create for PDFs and /generate-image for images.
    """
    api_key = getattr(settings, "CRAFTMYPDF_API_KEY", "")
    target_template = template_id or getattr(settings, "CRAFTMYPDF_TEMPLATE_ID", "")

    if not api_key:
        return {
            "success": False,
            "error": "CRAFTMYPDF_API_KEY is not set."
        }

    # If template_id was not explicitly configured, try auto-discovering an active template from the account
    if not target_template:
        account_status = await get_craftmypdf_status()
        active_templates = account_status.get("templates", [])
        if active_templates and len(active_templates) > 0:
            target_template = active_templates[0].get("template_id")

    if not target_template:
        return {
            "success": False,
            "missing_template": True,
            "status": "AUTHENTICATED_NO_TEMPLATE",
            "message": "CraftMyPDF API key is authenticated! To render via CraftMyPDF cloud templates, add a template in your CraftMyPDF dashboard or set CRAFTMYPDF_TEMPLATE_ID in backend/.env."
        }

    is_image = output_format.lower() in ["png", "jpg", "jpeg", "image"]
    endpoint = f"{CRAFTMYPDF_BASE_URL}/generate-image" if is_image else f"{CRAFTMYPDF_BASE_URL}/create"

    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json"
    }

    body = {
        "template_id": target_template,
        "data": data_payload,
        "output_file": f"ExpensePilot_Generated.{'png' if is_image else 'pdf'}"
    }

    if is_image:
        body["export_type"] = "png"
    else:
        body["export_type"] = "json"

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(endpoint, headers=headers, json=body)
            if resp.status_code in [200, 201]:
                res_data = resp.json()
                file_url = res_data.get("file") or res_data.get("file_url") or res_data.get("url")
                return {
                    "success": True,
                    "file_url": file_url,
                    "template_id": target_template,
                    "status": res_data.get("status", "success"),
                    "output_format": output_format
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

