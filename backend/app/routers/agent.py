import re
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from backend.app.database import get_db
from backend.app.auth import get_current_user, get_optional_current_user
from backend.app.schemas import AgentChatRequest, AgentChatResponse, AgentFileUploadResponse
from backend.app.agent.engine import process_agent_message
from backend.app.services.file_extractor import extract_tabular_data
from backend.app.services.jina_reader import fetch_url_markdown

router = APIRouter(prefix="/api/agent", tags=["AI Agent"])

@router.post("/upload-file", response_model=AgentFileUploadResponse)
async def upload_file_for_agent(
    file: UploadFile = File(...)
):
    """
    Parses and extracts structured data from uploaded CSV, Excel (.xlsx, .xls),
    PDF, TXT, JSON, or image files.
    Calculates summary statistics, flags policy anomalies, and returns structured context
    for AI conversation and compliance auditing.
    """
    filename = file.filename or "uploaded_file.csv"
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        extracted = extract_tabular_data(file_bytes=file_bytes, filename=filename)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to process file '{filename}': {str(e)}")

    suggested_prompts = [
        f"Summarize everything in {filename}",
        f"What is the total expenditure in this file?",
        f"Are there any policy violations or high expenses?",
        f"Did you find any duplicate rows or anomalies?"
    ]

    return AgentFileUploadResponse(
        filename=extracted["filename"],
        file_type=extracted["file_type"],
        sheet_names=extracted.get("sheet_names", []),
        row_count=extracted["row_count"],
        column_count=extracted["column_count"],
        headers=extracted["headers"],
        sample_rows=extracted["sample_rows"],
        summary=extracted["summary"],
        markdown_preview=extracted["markdown_preview"],
        suggested_prompts=suggested_prompts
    )


@router.post("/chat", response_model=AgentChatResponse)
async def chat_with_agent(
    payload: AgentChatRequest,
    current_user = Depends(get_optional_current_user),
    db = Depends(get_db)
):
    active_user_id = payload.user_id or current_user.get("id") or "user_kaif"
    result = await process_agent_message(
        db=db,
        user_id=active_user_id,
        message=payload.message,
        language=payload.language or "en",
        file_context=payload.file_context,
        user_name=payload.user_name
    )
    reply_text = result.get("reply", "")
    voice_txt = result.get("voice_text")
    if not voice_txt:
        cleaned = re.sub(r'[*_#`~]', '', reply_text)
        cleaned = re.sub(r'\[.*?\]\(.*?\)', '', cleaned)
        cleaned = re.sub(r'[•\-–—]', ' ', cleaned)
        cleaned = re.sub(r'₹', 'rupees ', cleaned)
        voice_txt = re.sub(r'\s+', ' ', cleaned).strip()[:280]

    tool_res = result.get("tool_result") or {}
    pdf_url = result.get("pdf_download_url") or (tool_res.get("pdf_url") if isinstance(tool_res, dict) else None)
    img_url = result.get("image_url") or (tool_res.get("image_url") if isinstance(tool_res, dict) else None)
    call_obj = result.get("call_info") or (tool_res.get("call_info") if isinstance(tool_res, dict) else None)

    return AgentChatResponse(
        reply=reply_text,
        citations=result.get("citations", []),
        tool_called=result.get("tool_called"),
        tool_result=result.get("tool_result"),
        escalated=result.get("escalated", False),
        suggested_actions=result.get("suggested_actions", []),
        voice_text=voice_txt,
        pdf_download_url=pdf_url,
        image_url=img_url,
        call_info=call_obj
    )


class ReadUrlPayload(BaseModel):
    url: str = Field(..., description="Target webpage URL to scrape and convert to Markdown via Jina Reader")


class CallDeviceRequest(BaseModel):
    phone_number: Optional[str] = None
    reason: Optional[str] = "Financial & Anomaly Alert"
    custom_message: Optional[str] = None
    user_id: Optional[str] = "user_kaif"


@router.post("/call-device")
async def trigger_agent_call_device(
    payload: CallDeviceRequest,
    current_user = Depends(get_optional_current_user),
    db = Depends(get_db)
):
    """
    Directly triggers the AI Agent's Device Calling function.
    Dispatches a voice phone call to user's device, generates tel: dialer link,
    and logs call in the audit trail.
    """
    from backend.app.agent.tools import tool_call_device
    active_user = current_user or {"id": payload.user_id or "user_kaif", "name": "Mohammad Kaif"}
    return await tool_call_device(
        db=db,
        user=active_user,
        reason=payload.reason,
        phone_number=payload.phone_number,
        custom_message=payload.custom_message
    )


@router.get("/read-url")
async def read_url_get(url: str = Query(..., description="Webpage URL to fetch")):
    """
    Fetches any webpage and converts it into clean, LLM-ready Markdown using Jina AI Reader API (r.jina.ai).
    Example: GET /api/agent/read-url?url=https://www.example.com
    """
    if not url or not url.strip():
        raise HTTPException(status_code=400, detail="URL parameter cannot be empty.")
    res = await fetch_url_markdown(url)
    return res


@router.post("/read-url")
async def read_url_post(payload: ReadUrlPayload):
    """
    Fetches any webpage and converts it into clean, LLM-ready Markdown using Jina AI Reader API (r.jina.ai).
    Example: POST /api/agent/read-url with body {"url": "https://www.example.com"}
    """
    if not payload.url or not payload.url.strip():
        raise HTTPException(status_code=400, detail="URL field cannot be empty.")
    res = await fetch_url_markdown(payload.url)
    return res
