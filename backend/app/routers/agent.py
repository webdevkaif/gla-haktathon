import re
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from backend.app.database import get_db
from backend.app.auth import get_current_user
from backend.app.schemas import AgentChatRequest, AgentChatResponse, AgentFileUploadResponse
from backend.app.agent.engine import process_agent_message
from backend.app.services.file_extractor import extract_tabular_data

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
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    active_user_id = payload.user_id or current_user.get("id") or "emp_john"
    result = await process_agent_message(
        db=db,
        user_id=active_user_id,
        message=payload.message,
        language=payload.language or "en",
        file_context=payload.file_context
    )
    reply_text = result.get("reply", "")
    voice_txt = result.get("voice_text")
    if not voice_txt:
        cleaned = re.sub(r'[*_#`~]', '', reply_text)
        cleaned = re.sub(r'\[.*?\]\(.*?\)', '', cleaned)
        cleaned = re.sub(r'[•\-–—]', ' ', cleaned)
        cleaned = re.sub(r'₹', 'rupees ', cleaned)
        voice_txt = re.sub(r'\s+', ' ', cleaned).strip()[:280]

    return AgentChatResponse(
        reply=reply_text,
        citations=result.get("citations", []),
        tool_called=result.get("tool_called"),
        tool_result=result.get("tool_result"),
        escalated=result.get("escalated", False),
        suggested_actions=result.get("suggested_actions", []),
        voice_text=voice_txt
    )
