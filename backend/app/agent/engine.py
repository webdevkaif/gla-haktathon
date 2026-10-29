import re
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
import httpx
from backend.app.config import settings
from backend.app.agent.tools import (
    tool_policy_qa,
    tool_claim_status,
    tool_invoice_status,
    tool_start_approval,
    tool_send_reminder,
    tool_escalate_to_finance,
    tool_get_finance_summary
)
from backend.app.services.audit import write_audit

# ─────────────────────────────────────────────────────────────────────────────
# Guardrails: PII Masking
# ─────────────────────────────────────────────────────────────────────────────

def mask_pii(text: str) -> Tuple[str, bool]:
    """
    Masks personal phone numbers, bank accounts, and credit card numbers
    before logging or sending to an LLM provider.
    """
    masked = text
    has_pii = False

    # Credit / Debit Cards (Formatted 16-digit cards with dashes/spaces or standard issuer ranges)
    card_pattern = r'\b(?:\d{4}[-\s]){3}\d{4}\b|\b(?:4[0-9]{15}|5[1-5][0-9]{14}|3[47][0-9]{13})\b'
    if re.search(card_pattern, masked):
        masked = re.sub(card_pattern, '[REDACTED_CARD_NUMBER]', masked)
        has_pii = True

    # Bank Account numbers (11 to 18 consecutive digits)
    acct_pattern = r'(?<![A-Za-z0-9\-])\b\d{11,18}\b'
    if re.search(acct_pattern, masked):
        masked = re.sub(acct_pattern, '[REDACTED_ACCOUNT_NUMBER]', masked)
        has_pii = True

    # Indian Mobile Numbers / Standard Phone Numbers (10 digits)
    phone_pattern = r'(?:\+?91[\s-]?)?\b[6789]\d{4}[\s-]?\d{5}\b'
    if re.search(phone_pattern, masked):
        masked = re.sub(phone_pattern, '[REDACTED_PHONE_NUMBER]', masked)
        has_pii = True

    return masked, has_pii


# ─────────────────────────────────────────────────────────────────────────────
# Guardrails: Out of Scope Refusal
# ─────────────────────────────────────────────────────────────────────────────

OUT_OF_SCOPE_PATTERNS = [
    r'\bjoke\b', r'\bweather\b', r'\bpoem\b', r'\bpoetry\b', r'\brecipe\b',
    r'\bcook\b', r'\bmovie\b', r'\bcricket\b', r'\bfootball\b', r'\bhoroscope\b',
    r'\bsong\b', r'\bdating\b', r'\bgaming\b', r'\bpolitics\b'
]

def is_out_of_scope(text: str) -> bool:
    lowered = text.lower()
    finance_keywords = [
        "claim", "invoice", "policy", "reimbursement", "po", "expense",
        "budget", "payment", "due", "approval", "remind", "escalate",
        "vendor", "audit", "clm-", "inv-", "app-", "sec-"
    ]
    if any(fk in lowered for fk in finance_keywords):
        return False

    for pat in OUT_OF_SCOPE_PATTERNS:
        if re.search(pat, lowered):
            return True

    return False


# ─────────────────────────────────────────────────────────────────────────────
# Deterministic Intent Parser (Hinglish & English Pattern Matcher)
# ─────────────────────────────────────────────────────────────────────────────

async def parse_and_route_deterministic(
    db: Any,
    user: Dict[str, Any],
    message: str
) -> Dict[str, Any]:
    """
    Rule-based deterministic engine that parses user intent (English & Hinglish),
    extracts identifiers, performs role authorization, and dispatches whitelisted tools.
    """
    msg_lower = message.lower()
    user_role = user.get("role", "employee")
    user_id = user.get("id") or user.get("user_id", "")

    # 1. Out of scope check
    if is_out_of_scope(message):
        return {
            "reply": (
                "I am **Expense Pilot**, Meridian's Expense and Invoice Query Assistant. "
                "I can only help with corporate expense policies, claim reimbursements, vendor invoices, "
                "approval requests, and finance intelligence."
            ),
            "citations": [],
            "tool_called": None,
            "tool_result": None,
            "escalated": False,
            "suggested_actions": ["Ask about hotel per-diem limits", "Check claim status", "View overdue invoices"]
        }

    # 2. Extract Claim ID (e.g. CLM-1042, CLM1042)
    claim_match = re.search(r'\b(clm-?\d+)\b', msg_lower)
    if claim_match:
        raw_clm = claim_match.group(1).upper()
        norm_clm = raw_clm if "-" in raw_clm else f"CLM-{raw_clm[3:]}"
        tool_res = await tool_claim_status(db, norm_clm, user)

        suggested = []
        if tool_res.get("found"):
            claim = tool_res.get("claim", {})
            st = claim.get("status")
            if st in ["Submitted", "Pending Manager"]:
                suggested.append(f"Send reminder for {norm_clm}")
            if claim.get("policy_flags"):
                suggested.append(f"Escalate {norm_clm} to finance")
            suggested.append("Check reimbursement timeline policy")

        return {
            "reply": tool_res.get("reply", ""),
            "citations": [],
            "tool_called": "claim_status",
            "tool_result": tool_res,
            "escalated": False,
            "suggested_actions": suggested or ["Ask another policy question", "View your claims"]
        }

    # 3. Extract Invoice ID (e.g. INV-2004, INV2004)
    invoice_match = re.search(r'\b(inv-?\d+)\b', msg_lower)
    if invoice_match:
        raw_inv = invoice_match.group(1).upper()
        norm_inv = raw_inv if "-" in raw_inv else f"INV-{raw_inv[3:]}"
        tool_res = await tool_invoice_status(db, norm_inv, user)

        suggested = []
        if tool_res.get("found"):
            inv = tool_res.get("invoice", {})
            if inv.get("duplicate_of") or inv.get("flags"):
                suggested.append(f"Escalate {norm_inv} to finance")
            suggested.append("Check Net-30 payment terms")

        return {
            "reply": tool_res.get("reply", ""),
            "citations": [],
            "tool_called": "invoice_status",
            "tool_result": tool_res,
            "escalated": bool(tool_res.get("invoice", {}).get("duplicate_of")),
            "suggested_actions": suggested or ["View all vendor invoices", "Check PO terms"]
        }

    # 4. Extract Approval ID or Remind Intent (e.g. APP-3001, "send reminder", "reminder bhej do")
    app_match = re.search(r'\b(app-?[a-z0-9]+)\b', msg_lower)
    is_remind = any(k in msg_lower for k in ["remind", "reminder", "bhej do", "yad dila", "nudge"])

    if is_remind:
        target_app_id = None
        if app_match:
            target_app_id = app_match.group(1).upper()
        else:
            # Find the most urgent pending approval accessible to the user
            q = {"state": "Pending"}
            if user_role == "manager":
                q["approver_id"] = user_id
            pending = await db.approvals.find(q).sort([("created_at", 1)]).to_list(1)
            if pending:
                target_app_id = pending[0].get("id")

        if target_app_id:
            tool_res = await tool_send_reminder(db, target_app_id, user)
            return {
                "reply": tool_res.get("reply", ""),
                "citations": [],
                "tool_called": "send_reminder",
                "tool_result": tool_res,
                "escalated": False,
                "suggested_actions": ["Check approval SLA policy", "View pending approvals"]
            }
        else:
            return {
                "reply": "No pending approval was specified or found. Please provide an Approval ID (e.g. `APP-3002`).",
                "citations": [],
                "tool_called": None,
                "tool_result": None,
                "escalated": False,
                "suggested_actions": ["View pending approvals", "Check policy SLA"]
            }

    # 5. Executive Finance Summary Intent (Finance role only)
    finance_summary_keywords = ["finance summary", "kpi", "overdue count", "pending count", "dashboard summary", "how many overdue", "kya chal raha hai finance"]
    if any(k in msg_lower for k in finance_summary_keywords):
        tool_res = await tool_get_finance_summary(db, user)
        return {
            "reply": tool_res.get("reply", ""),
            "citations": [],
            "tool_called": "get_finance_summary",
            "tool_result": tool_res,
            "escalated": False,
            "suggested_actions": ["View open escalations", "Review overdue invoices", "Run reminder scheduler"]
        }

    # 6. Manual Escalation Intent
    escalate_keywords = ["escalate", "fraud", "scam", "violation", "investigate", "discrepancy"]
    if any(k in msg_lower for k in escalate_keywords) and ("claim" in msg_lower or "invoice" in msg_lower):
        entity_type = "invoice" if "invoice" in msg_lower else "claim"
        ent_id = norm_inv if "norm_inv" in locals() else (norm_clm if "norm_clm" in locals() else "UNKNOWN")
        tool_res = await tool_escalate_to_finance(
            db=db,
            entity_type=entity_type,
            entity_id=ent_id,
            reason="policy_violation" if entity_type == "claim" else "discrepancy",
            summary=f"User requested escalation: {message[:120]}",
            user=user
        )
        return {
            "reply": tool_res.get("reply", ""),
            "citations": [],
            "tool_called": "escalate_to_finance",
            "tool_result": tool_res,
            "escalated": True,
            "suggested_actions": ["View open escalations", "Contact Finance Controller"]
        }

    # 7. Start Approval Intent
    if any(k in msg_lower for k in ["submit for approval", "start approval", "approve kar do", "request approval"]):
        target_id = norm_clm if "norm_clm" in locals() else (norm_inv if "norm_inv" in locals() else None)
        if target_id:
            ent_type = "invoice" if target_id.startswith("INV") else "claim"
            tool_res = await tool_start_approval(db, ent_type, target_id, user)
            return {
                "reply": tool_res.get("reply", ""),
                "citations": [],
                "tool_called": "start_approval",
                "tool_result": tool_res,
                "escalated": False,
                "suggested_actions": ["Check approval workflow policy", "Send reminder to approver"]
            }

    # 8. Policy Q&A with Mandatory Citations (Default fallback for all policy queries)
    policy_res = await tool_policy_qa(db, message, user)
    return {
        "reply": policy_res.get("reply", ""),
        "citations": policy_res.get("citations", []),
        "tool_called": "policy_qa",
        "tool_result": policy_res,
        "escalated": False,
        "suggested_actions": [
            "What is the meal allowance for Grade L2?",
            "What are the hotel room limits for Tier-1 cities?",
            "What is the claim submission deadline?",
            "What are vendor Net-30 payment terms?"
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# LLM Integration (Groq / Gemini) with Fallback
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Expense Pilot, the official AI query assistant for Meridian's Finance & Procurement team.
You assist employees, vendors, managers, and finance staff strictly within company policy guidelines.

RULES:
1. ONLY use whitelisted tools: policy_qa, claim_status, invoice_status, start_approval, send_reminder, escalate_to_finance, get_finance_summary.
2. ALWAYS cite the exact document and section (e.g. SEC-104) when answering policy questions. NEVER answer a policy question without citations.
3. Enforce role permissions:
   - employee: can only query their own claims; cannot access vendor invoices or executive finance metrics.
   - vendor: can only query their own invoices; cannot access employee claims.
   - manager: can query team claims and assigned approvals.
   - finance: full access.
4. Refuse out-of-scope non-finance requests politely.
5. All sensitive PII must remain masked.
"""

async def process_agent_message(
    db: Any,
    user_id: str,
    message: str
) -> Dict[str, Any]:
    """
    Main entry point for processing agent queries:
    1. Loads current user profile and role.
    2. Masks personal data (PII).
    3. Executes query via LLM or deterministic fallback engine.
    4. Records immutable audit trail entry.
    5. Returns structured AgentChatResponse payload.
    """
    # 1. Load user profile
    user_doc = await db.users.find_one({"$or": [{"id": user_id}, {"user_id": user_id}]})
    if not user_doc:
        from backend.app.auth import DEMO_USERS
        user_doc = DEMO_USERS.get(user_id, DEMO_USERS["emp_john"])

    # 2. Mask PII in input
    masked_message, had_pii = mask_pii(message)

    # 3. Query LLM if API key configured, otherwise use deterministic pattern engine
    result = None
    if settings.GROQ_API_KEY:
        try:
            # We can attempt Groq API call, falling back seamlessly if any failure
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": [
                            {"role": "system", "content": f"{SYSTEM_PROMPT}\nCurrent User: {user_doc.get('name')} (Role: {user_doc.get('role')}, ID: {user_doc.get('id')}, Grade: {user_doc.get('grade')})"},
                            {"role": "user", "content": masked_message}
                        ],
                        "temperature": 0.1,
                        "max_tokens": 500
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    raw_reply = data["choices"][0]["message"]["content"]
                    # If LLM answered a policy question, cross-reference policy tool for citations
                    citations = []
                    if any(k in masked_message.lower() for k in ["policy", "limit", "hotel", "meal", "travel", "receipt", "rule"]):
                        p_qa = await tool_policy_qa(db, masked_message, user_doc)
                        citations = p_qa.get("citations", [])

                    result = {
                        "reply": raw_reply,
                        "citations": citations,
                        "tool_called": "policy_qa" if citations else None,
                        "tool_result": None,
                        "escalated": False,
                        "suggested_actions": ["Check claim status", "View policy limits"]
                    }
        except Exception as e:
            print(f"[Agent Notice] LLM fallback active: {e}")

    # Fallback to deterministic engine
    if not result:
        result = await parse_and_route_deterministic(db, user_doc, masked_message)

    # 4. Write immutable audit log for the agent query
    await write_audit(
        db=db,
        actor_id=user_doc.get("id", user_id),
        actor_role=user_doc.get("role", "employee"),
        action="AGENT_QUERY",
        entity_type="agent",
        entity_id=result.get("tool_called") or "conversation",
        input_data={"masked_message": masked_message, "had_pii": had_pii},
        result={
            "tool_called": result.get("tool_called"),
            "citations_count": len(result.get("citations", [])),
            "escalated": result.get("escalated", False)
        },
        status="SUCCESS"
    )

    return result
