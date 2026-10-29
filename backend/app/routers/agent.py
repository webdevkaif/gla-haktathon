from fastapi import APIRouter, Depends
from backend.app.database import get_db
from backend.app.schemas import AgentChatRequest, AgentChatResponse
from backend.app.agent.engine import process_agent_message

router = APIRouter(prefix="/api/agent", tags=["AI Agent"])

@router.post("/chat", response_model=AgentChatResponse)
async def chat_with_agent(
    payload: AgentChatRequest,
    db = Depends(get_db)
):
    result = await process_agent_message(
        db=db,
        user_id=payload.user_id or "user_default",
        message=payload.message
    )
    reply_text = result["reply"]
    voice_txt = result.get("voice_text")
    if not voice_txt:
        import re
        cleaned = re.sub(r'[*_#`~]', '', reply_text)
        cleaned = re.sub(r'\[.*?\]\(.*?\)', '', cleaned)
        cleaned = re.sub(r'[•\-–—]', ' ', cleaned)
        cleaned = re.sub(r'₹', 'rupees ', cleaned)
        voice_txt = re.sub(r'\s+', ' ', cleaned).strip()[:280]

    return AgentChatResponse(
        reply=reply_text,
        tool_called=result.get("tool_called"),
        tool_result=result.get("tool_result"),
        structured_expenses_added=result.get("structured_expenses_added"),
        suggested_actions=result.get("suggested_actions"),
        pdf_download_url=result.get("pdf_download_url"),
        voice_text=voice_txt
    )
