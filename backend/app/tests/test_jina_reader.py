import pytest
from unittest.mock import patch, AsyncMock
from backend.app.services.jina_reader import fetch_url_markdown
from backend.app.agent.tools import tool_read_webpage
from backend.app.agent.engine import parse_and_route_deterministic

@pytest.mark.asyncio
async def test_jina_reader_url_handling():
    # Test prefix stripping and endpoint formatting
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.text = "Title: Example Domain\n\nMarkdown Content:\n# Example Domain\nThis domain is for use in illustrative examples."
        mock_get.return_value = mock_response

        # Test with raw URL
        res = await fetch_url_markdown("https://www.example.com")
        assert res["success"] is True
        assert res["title"] == "Example Domain"
        assert "illustrative examples" in res["markdown"]

        # Test with redundant r.jina.ai prefix
        res2 = await fetch_url_markdown("https://r.jina.ai/https://www.example.com")
        assert res2["success"] is True
        assert res2["url"] == "https://www.example.com"

@pytest.mark.asyncio
async def test_tool_read_webpage():
    with patch("backend.app.services.jina_reader.fetch_url_markdown") as mock_fetch:
        mock_fetch.return_value = {
            "success": True,
            "url": "https://www.example.com",
            "title": "Example Domain",
            "markdown": "# Example Domain\nTest Content",
            "status_code": 200
        }
        tool_res = await tool_read_webpage("https://www.example.com")
        assert tool_res["success"] is True
        assert "Jina AI Web Reader" in tool_res["reply"]
        assert "Example Domain" in tool_res["reply"]

@pytest.mark.asyncio
async def test_agent_routes_url_to_jina():
    dummy_user = {"id": "user_kaif", "name": "Mohammad Kaif", "role": "employee"}
    with patch("backend.app.agent.engine.tool_read_webpage") as mock_tool:
        mock_tool.return_value = {
            "success": True,
            "url": "https://www.example.com",
            "title": "Example Domain",
            "markdown": "Content",
            "reply": "Scraped Successfully"
        }
        res = await parse_and_route_deterministic(
            db=None,
            user=dummy_user,
            message="Please read this webpage https://www.example.com and tell me what is there"
        )
        assert res["tool_called"] == "read_webpage"
        assert res["reply"] == "Scraped Successfully"

