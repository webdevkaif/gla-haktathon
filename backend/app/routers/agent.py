import re
from fastapi import APIRouter, Depends
from backend.app.database import get_db
from backend.app.auth import get_current_user
from backend.app.schemas import AgentChatRequest, AgentChatResponse
from backend.app.agent.engine import process_agent_message

router = APIRouter(prefix="/api/agent", tags=["AI Agent"])

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
        message=payload.message
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
