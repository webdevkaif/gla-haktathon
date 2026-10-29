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
        "vendor", "audit", "clm-", "inv-", "app-", "sec-", "file", "csv",
        "excel", "spreadsheet", "sheet", "summary"
    ]
    if any(fk in lowered for fk in finance_keywords):
        return False

    for pat in OUT_OF_SCOPE_PATTERNS:
        if re.search(pat, lowered):
            return True

    return False


# ─────────────────────────────────────────────────────────────────────────────
# Multi-Language Localization Engine
# ─────────────────────────────────────────────────────────────────────────────

LOCALIZATION_DICT = {
    "hi": {
        "greeting": "मैं **एक्सपेंस पायलट** (Expense Pilot) हूँ, मेरिडियन का आधिकारिक व्यय एवं चालान पूछताछ सहायक।",
        "scope_refusal": "मैं केवल कॉर्पोरेट व्यय नीतियों, प्रतिपूर्ति दावों, विक्रेता चालान, अनुमोदन अनुरोधों और वित्तीय खुफिया जानकारी में सहायता कर सकता हूँ।",
        "claim_details": "दावा {id} का विवरण:",
        "status": "स्थिति:",
        "category": "श्रेणी:",
        "amount": "राशि:",
        "date": "दिनांक:",
        "approver": "स्वीकर्ता:",
        "payment_date": "अपेक्षित भुगतान तिथि:",
        "access_denied": "अनुमति अस्वीकृत (Access Denied):",
        "policy_intro": "मेरिडियन व्यय एवं खरीद नीति 2026 के अनुसार:",
        "finance_summary": "📊 **मेरिडियन कार्यकारी वित्त सारांश (Executive Finance Summary)**:"
    },
    "hinglish": {
        "greeting": "Main **Expense Pilot** hoon, Meridian ka Expense aur Invoice Query Assistant.",
        "scope_refusal": "Main sirf corporate expense policies, claim reimbursement, vendor invoices, aur approval requests me madad kar sakta hoon.",
        "claim_details": "Claim {id} ka Details:",
        "status": "Status:",
        "category": "Category:",
        "amount": "Amount:",
        "date": "Date:",
        "approver": "Approver:",
        "payment_date": "Expected Payment Date:",
        "access_denied": "Access Denied (Ijazat nahi hai):",
        "policy_intro": "Meridian Expense & Procurement Policy 2026 ke mutabiq:",
        "finance_summary": "📊 **Meridian Executive Finance Summary**:"
    },
    "es": {
        "greeting": "Soy **Expense Pilot**, el Asistente Oficial de Consultas de Gastos y Facturas de Meridian.",
        "scope_refusal": "Solo puedo asistir con políticas de gastos corporativos, reembolsos, facturas de proveedores y aprobaciones.",
        "claim_details": "Detalles del Reclamo {id}:",
        "status": "Estado:",
        "category": "Categoría:",
        "amount": "Monto:",
        "date": "Fecha:",
        "approver": "Aprobador:",
        "payment_date": "Fecha Prevista de Pago:",
        "access_denied": "Acceso Denegado:",
        "policy_intro": "Según la Política de Gastos y Adquisiciones de Meridian 2026:",
        "finance_summary": "📊 **Resumen Financiero Ejecutivo de Meridian**:"
    },
    "fr": {
        "greeting": "Je suis **Expense Pilot**, l'Assistant Officiel de Dépenses et Factures de Meridian.",
        "scope_refusal": "Je ne peux vous aider qu'avec les politiques de dépenses, les remboursements, les factures et les approbations.",
        "claim_details": "Détails de la Réclamation {id}:",
        "status": "Statut:",
        "category": "Catégorie:",
        "amount": "Montant:",
        "date": "Date:",
        "approver": "Approbateur:",
        "payment_date": "Date de Paiement Prévue:",
        "access_denied": "Accès Refusé:",
        "policy_intro": "Selon la Politique de Dépenses et Achats Meridian 2026:",
        "finance_summary": "📊 **Résumé Financier Exécutif de Meridian**:"
    },
    "de": {
        "greeting": "Ich bin **Expense Pilot**, Meridians offizieller Assistent für Spesen- und Rechnungsanfragen.",
        "scope_refusal": "Ich kann nur bei Unternehmensrichtlinien, Erstattungen, Lieferantenrechnungen und Genehmigungen helfen.",
        "claim_details": "Details zum Anspruch {id}:",
        "status": "Status:",
        "category": "Kategorie:",
        "amount": "Betrag:",
        "date": "Datum:",
        "approver": "Genehmiger:",
        "payment_date": "Voraussichtliches Zahlungsdatum:",
        "access_denied": "Zugriff Verweigert:",
        "policy_intro": "Gemäß der Meridian Ausgaben- und Beschaffungsrichtlinie 2026:",
        "finance_summary": "📊 **Meridian Geschäftsleitungs-Finanzbericht**:"
    }
}

def localize_text(text: str, language: str) -> str:
    """
    Applies multi-language localization to system replies while strictly
    preserving policy citation IDs (SEC-101), Claim numbers (CLM-1042), and numeric values.
    """
    lang = (language or "en").lower().strip()
    if lang in ["en", "english"]:
        return text

    ld = LOCALIZATION_DICT.get(lang)
    if not ld:
        return text

    localized = text
    if "According to the **Meridian Expense & Procurement Policy 2026**" in localized:
        localized = localized.replace(
            "According to the **Meridian Expense & Procurement Policy 2026**",
            ld.get("policy_intro", "According to the **Meridian Expense & Procurement Policy 2026**")
        )
    if "Access Denied:" in localized:
        localized = localized.replace("Access Denied:", ld.get("access_denied", "Access Denied:"))
    if "Access Restricted:" in localized:
        localized = localized.replace("Access Restricted:", ld.get("access_denied", "Access Restricted:"))
    if "📊 **Meridian Executive Finance Summary**:" in localized:
        localized = localized.replace("📊 **Meridian Executive Finance Summary**:", ld.get("finance_summary", "📊 **Meridian Executive Finance Summary**:"))

    return localized


# ─────────────────────────────────────────────────────────────────────────────
# Tabular & File Analysis Engine
# ─────────────────────────────────────────────────────────────────────────────

def analyze_uploaded_file_context(
    file_context: Dict[str, Any],
    query: str,
    user: Dict[str, Any],
    language: str = "en"
) -> Dict[str, Any]:
    """
    Analyzes an uploaded CSV or Excel spreadsheet, performing financial summarization,
    detecting potential policy violations, identifying duplicates, and answering queries.
    """
    filename = file_context.get("filename", "spreadsheet.csv")
    file_type = file_context.get("file_type", "FILE")
    row_count = file_context.get("row_count", 0)
    col_count = file_context.get("column_count", 0)
    headers = file_context.get("headers", [])
    summary = file_context.get("summary", {})
    markdown_table = file_context.get("markdown_preview", "")

    total_sum = summary.get("total_sum")
    avg_amt = summary.get("average_amount")
    high_items = summary.get("flagged_high_expenses", [])
    dup_rows = summary.get("duplicate_rows", [])

    citations = [
        {
            "doc_name": "Meridian Expense & Procurement Policy 2026",
            "section_id": "SEC-107",
            "title": "Approval Matrix & Thresholds",
            "relevant_snippet": "Claims exceeding ₹10,000 require secondary approval from the Finance Controller before disbursement."
        },
        {
            "doc_name": "Meridian Expense & Procurement Policy 2026",
            "section_id": "SEC-110",
            "title": "Duplicate Claim & Invoice Detection",
            "relevant_snippet": "Duplicate submissions for the same expense or invoice are strictly prohibited and immediately flagged for investigation."
        }
    ]

    lines = [
        f"📊 **AI Data Extraction & Audit Analysis: `{filename}`** ({file_type})",
        f"• **Dataset Dimensions**: {row_count} rows across {col_count} columns",
        f"• **Extracted Headers**: {', '.join([f'`{h}`' for h in headers[:8]])}"
    ]

    if total_sum is not None:
        lines.append(f"• **Total Expenditure**: ₹{total_sum:,.2f} INR (Average per line item: ₹{avg_amt:,.2f})")

    lines.append("\n🔍 **Policy Compliance & Anomaly Flags**:")
    if high_items:
        lines.append(f"• ⚠️ **High-Value Expenses (> ₹10,000)**: Found {len(high_items)} item(s). Under **SEC-107**, these require secondary approval from Finance Controller Alex Morgan:")
        for hi in high_items[:3]:
            lines.append(f"  - Row {hi.get('row')}: ₹{hi.get('amount', 0):,.2f} — {hi.get('description')}")
    else:
        lines.append("• ✅ **Value Thresholds**: All line items are within standard single-tier manager limits (under ₹10,000).")

    if dup_rows:
        lines.append(f"• ⚠️ **Potential Duplicates**: Detected {len(dup_rows)} duplicate row(s) in this file. Under **SEC-110**, identical claims are flagged for audit review:")
        for dr in dup_rows[:2]:
            lines.append(f"  - Row {dr.get('duplicate_row')} matches Row {dr.get('original_row')}")
    else:
        lines.append("• ✅ **Duplicate Check**: No identical duplicate expense rows detected.")

    if markdown_table:
        lines.append("\n📋 **Data Preview (First 5 Rows)**:")
        lines.append(markdown_table)

    reply = "\n".join(lines)
    reply = localize_text(reply, language)

    return {
        "reply": reply,
        "citations": citations,
        "tool_called": "spreadsheet_data_extractor",
        "tool_result": {
            "filename": filename,
            "row_count": row_count,
            "total_sum": total_sum,
            "high_items_count": len(high_items),
            "duplicates_count": len(dup_rows)
        },
        "escalated": len(high_items) > 0 or len(dup_rows) > 0,
        "suggested_actions": [
            f"Are all receipts attached in {filename}?",
            f"Escalate high-value rows in {filename} to finance",
            "Check reimbursement timeline under SEC-108"
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# Deterministic Intent Parser (Hinglish & English Pattern Matcher)
# ─────────────────────────────────────────────────────────────────────────────

async def parse_and_route_deterministic(
    db: Any,
    user: Dict[str, Any],
    message: str,
    language: str = "en",
    file_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Rule-based deterministic engine that parses user intent (English, Hindi, Hinglish),
    extracts identifiers, performs role authorization, and dispatches whitelisted tools.
    """
    msg_lower = message.lower()
    user_role = user.get("role", "employee")
    user_id = user.get("id") or user.get("user_id", "")

    # 0. Check if user is asking about an uploaded file
    if file_context and (
        any(k in msg_lower for k in ["file", "csv", "excel", "sheet", "spreadsheet", "summarize", "extract", "rows", "columns", "table", "upload"])
        or len(message.strip()) < 25
    ):
        return analyze_uploaded_file_context(file_context, message, user, language)

    # 1. Out of scope check
    if is_out_of_scope(message):
        ld = LOCALIZATION_DICT.get(language, {})
        greeting = ld.get("greeting", "I am **Expense Pilot**, Meridian's Expense and Invoice Query Assistant.")
        refusal = ld.get("scope_refusal", "I can only help with corporate expense policies, claim reimbursements, vendor invoices, approval requests, and finance intelligence.")
        return {
            "reply": f"{greeting} {refusal}",
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

        raw_reply = tool_res.get("reply", "")
        return {
            "reply": localize_text(raw_reply, language),
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
            if inv.get("flags") or inv.get("duplicate_of"):
                suggested.append(f"Escalate {norm_inv} to finance")
            suggested.append("Check vendor Net-30 payment policy")

        raw_reply = tool_res.get("reply", "")
        return {
            "reply": localize_text(raw_reply, language),
            "citations": [],
            "tool_called": "invoice_status",
            "tool_result": tool_res,
            "escalated": bool(tool_res.get("invoice", {}).get("flags")),
            "suggested_actions": suggested or ["Check payment terms", "View all vendor invoices"]
        }

    # 4. Reminder Intent
    reminder_keywords = ["remind", "reminder", "pending approval", "approve karo", "send reminder"]
    if any(k in msg_lower for k in reminder_keywords):
        app_match = re.search(r'\b(app-?\d+)\b', msg_lower)
        app_id = app_match.group(1).upper() if app_match else None
        if not app_id:
            due_app = await db.approvals.find_one({"state": "Pending"})
            if due_app:
                app_id = due_app.get("id") or due_app.get("approval_id")

        if app_id:
            tool_res = await tool_send_reminder(db, app_id, user)
            return {
                "reply": localize_text(tool_res.get("reply", ""), language),
                "citations": [],
                "tool_called": "send_reminder",
                "tool_result": tool_res,
                "escalated": False,
                "suggested_actions": ["Check approval SLA under SEC-107", "View pending approvals"]
            }

    # 5. Executive Finance Summary Intent
    finance_keywords = ["finance summary", "executive summary", "kpi", "overdue", "cash flow", "audit report", "finance metrics"]
    if any(k in msg_lower for k in finance_keywords):
        tool_res = await tool_get_finance_summary(db, user)
        return {
            "reply": localize_text(tool_res.get("reply", ""), language),
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
            "reply": localize_text(tool_res.get("reply", ""), language),
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
                "reply": localize_text(tool_res.get("reply", ""), language),
                "citations": [],
                "tool_called": "start_approval",
                "tool_result": tool_res,
                "escalated": False,
                "suggested_actions": ["Check approval workflow policy", "Send reminder to approver"]
            }

    # 8. Policy Q&A with Mandatory Citations (Default fallback for all policy queries)
    policy_res = await tool_policy_qa(db, message, user)
    return {
        "reply": localize_text(policy_res.get("reply", ""), language),
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
# LLM Integration (Groq / Gemini) with Fallback & Language Adaptation
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are Expense Pilot, the official AI query assistant for Meridian's Finance & Procurement team.
You assist employees, vendors, managers, and finance staff strictly within company policy guidelines.

RULES:
1. ONLY use whitelisted tools: policy_qa, claim_status, invoice_status, start_approval, send_reminder, escalate_to_finance, get_finance_summary, spreadsheet_data_extractor.
2. ALWAYS cite the exact document and section (e.g. SEC-104) when answering policy questions. NEVER answer a policy question without citations.
3. Enforce role permissions:
   - employee: can only query their own claims; cannot access vendor invoices or executive finance metrics.
   - vendor: can only query their own invoices; cannot access employee claims.
   - manager: can query team claims and assigned approvals.
   - finance: full access.
4. Refuse out-of-scope non-finance requests politely.
5. All sensitive PII must remain masked.
6. When a target language is specified, write your complete reply in that language, but keep numbers, currency amounts (₹...), and policy citations (like SEC-104) exactly intact.
"""

async def process_agent_message(
    db: Any,
    user_id: str,
    message: str,
    language: str = "en",
    file_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main entry point for processing agent queries:
    1. Loads current user profile and role.
    2. Masks personal data (PII).
    3. Handles spreadsheet context if provided.
    4. Executes query via LLM or deterministic fallback engine with multi-language output.
    5. Records immutable audit trail entry.
    6. Returns structured AgentChatResponse payload.
    """
    # 1. Load user profile
    user_doc = await db.users.find_one({"$or": [{"id": user_id}, {"user_id": user_id}]})
    if not user_doc:
        from backend.app.auth import DEMO_USERS
        user_doc = DEMO_USERS.get(user_id, DEMO_USERS["emp_john"])

    # 2. Mask PII in input
    masked_message, had_pii = mask_pii(message)

    # 3. Query LLM (Gemini or Groq) if API key configured and network is open, otherwise use deterministic engine
    result = None
    if settings.GEMINI_API_KEY and not file_context:
        try:
            lang_instruction = f"Respond in {language.upper()} language." if language and language != "en" else ""
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(
                    gemini_url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{
                            "parts": [{
                                "text": f"{SYSTEM_PROMPT}\n{lang_instruction}\nCurrent User: {user_doc.get('name')} (Role: {user_doc.get('role')}, ID: {user_doc.get('id')}, Grade: {user_doc.get('grade')})\nUser Query: {masked_message}"
                            }]
                        }],
                        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 600}
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        raw_reply = candidates[0]["content"]["parts"][0]["text"]
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
            print(f"[Agent Notice] Gemini API fallback: {e}")

    if not result and settings.GROQ_API_KEY and not file_context:
        try:
            lang_instruction = f"Respond in {language.upper()} language." if language and language != "en" else ""
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    json={
                        "model": settings.GROQ_MODEL or "openai/gpt-oss-120b",
                        "messages": [
                            {"role": "system", "content": f"{SYSTEM_PROMPT}\n{lang_instruction}\nCurrent User: {user_doc.get('name')} (Role: {user_doc.get('role')}, ID: {user_doc.get('id')}, Grade: {user_doc.get('grade')})"},
                            {"role": "user", "content": masked_message}
                        ],
                        "temperature": 0.1,
                        "max_tokens": 500
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    raw_reply = data["choices"][0]["message"]["content"]
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
            print(f"[Agent Notice] Groq LLM fallback active: {e}")

    # Fallback to deterministic engine with multi-language and spreadsheet support
    if not result:
        result = await parse_and_route_deterministic(
            db=db,
            user=user_doc,
            message=masked_message,
            language=language,
            file_context=file_context
        )

    # 4. Write immutable audit log for the agent query
    await write_audit(
        db=db,
        actor_id=user_doc.get("id", user_id),
        actor_role=user_doc.get("role", "employee"),
        action="AGENT_QUERY",
        entity_type="agent",
        entity_id=result.get("tool_called") or "conversation",
        input_data={"masked_message": masked_message, "had_pii": had_pii, "language": language, "has_file": bool(file_context)},
        result={
            "tool_called": result.get("tool_called"),
            "citations_count": len(result.get("citations", [])),
            "escalated": result.get("escalated", False)
        },
        status="SUCCESS"
    )

    return result
