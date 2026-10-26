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
    return AgentChatResponse(
        reply=result["reply"],
        tool_called=result.get("tool_called"),
        tool_result=result.get("tool_result"),
        structured_expenses_added=result.get("structured_expenses_added"),
        suggested_actions=result.get("suggested_actions")
    )
