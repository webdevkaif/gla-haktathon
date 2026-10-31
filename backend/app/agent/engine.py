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
    tool_get_finance_summary,
    tool_generate_pdf_report,
    tool_generate_visual_card,
    tool_detect_anomalies,
    tool_detect_unusual_expenses,
    tool_add_expense,
    tool_create_saving_plan,
    tool_predict_monthly_spending,
    tool_read_webpage,
    tool_call_device,
    tool_get_monthly_spending,
    tool_get_category_breakdown,
    tool_calculate_remaining_budget,
    tool_simulate_what_if,
    auto_categorize
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

    q_lower = query.lower()
    direct_answers = []
    if any(k in q_lower for k in ["total", "sum", "expenditure", "cost", "overall", "kitna", "how much"]):
        if total_sum is not None:
            direct_answers.append(f"💰 **Total Expenditure in `{filename}`**: **₹{total_sum:,.2f} INR** across {row_count} item(s).")
    if any(k in q_lower for k in ["duplicate", "repeat", "copied", "match"]):
        if dup_rows:
            direct_answers.append(f"🔍 **Duplicate Detection**: Found **{len(dup_rows)} duplicate entry(ies)** flagged for investigation.")
        else:
            direct_answers.append("🔍 **Duplicate Detection**: ✅ No duplicate rows detected in this file.")
    if any(k in q_lower for k in ["violation", "flag", "high", "policy", "anomaly", "sec-107", "rule", "unusual"]):
        if high_items:
            direct_answers.append(f"⚠️ **Policy Anomaly**: Found **{len(high_items)} line item(s)** exceeding ₹10,000 requiring secondary approval.")
        else:
            direct_answers.append("✅ **Policy Compliance**: All transactions comply with standard single-tier manager limits.")
    if any(k in q_lower for k in ["max", "highest", "biggest", "largest"]):
        max_amt = summary.get("max_amount")
        if max_amt is not None:
            direct_answers.append(f"📈 **Highest Single Expense**: **₹{max_amt:,.2f} INR**.")
    if any(k in q_lower for k in ["average", "avg", "mean"]):
        if avg_amt is not None:
            direct_answers.append(f"📊 **Average Expense**: **₹{avg_amt:,.2f} INR** per transaction.")

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

    lines = []
    if direct_answers:
        lines.extend(direct_answers)
        lines.append("")

    lines.extend([
        f"📊 **AI Data Extraction & Audit Analysis: `{filename}`** ({file_type})",
        f"• **Dataset Dimensions**: {row_count} rows across {col_count} columns",
        f"• **Extracted Headers**: {', '.join([f'`{h}`' for h in headers[:8]])}"
    ])

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

def strip_markdown_for_speech(text: str) -> str:
    cleaned = re.sub(r'[*_#`~]', '', text)
    cleaned = re.sub(r'\[.*?\]\(.*?\)', '', cleaned)
    cleaned = re.sub(r'[•\-–—]', ' ', cleaned)
    cleaned = re.sub(r'₹', 'rupees ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

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

    # 0b. User Greeting & Identity Intent (Always greet by real user name)
    current_name = user.get("name") or "Team Member"
    greeting_patterns = [
        r'^\s*(?:hi|hello|hey|namaste|greetings|hola|bonjour|salam)\b',
        r'\b(?:introduce\s+yourself|who\s+are\s+you|who\s+am\s+i|what\s+is\s+my\s+name|my\s+name|kya\s+naam\s+hai)\b'
    ]
    if any(re.search(p, msg_lower) for p in greeting_patterns):
        first_name = current_name.split()[0]
        role_label = user.get("role", "employee").capitalize()
        greet_text = (
            f"👋 **Hello {current_name}!** Welcome back to **ExpensePilot AI**.\n\n"
            f"You are authenticated as **{current_name}** ({role_label}).\n"
            f"I am your autonomous corporate finance and intelligence copilot. Here is what I can do for you right now:\n\n"
            f"• 🎨 **Generate Custom Images**: Describe any visual, diagram, or scene (e.g. *\"generate image of a futuristic city\"*).\n"
            f"• 📄 **Synthesize Executive PDFs**: Request detailed PDF reports on any project, budget, or audit.\n"
            f"• 🔍 **Audit & OCR Invoices**: Drag-and-drop receipts or query policy compliance.\n"
            f"• 📊 **Predict Outflow & Anomalies**: Inspect forecast graphs and check budget limits.\n\n"
            f"How can I assist you today, {first_name}?"
        )
        return {
            "reply": localize_text(greet_text, language),
            "citations": [],
            "tool_called": "user_greeting",
            "escalated": False,
            "suggested_actions": [
                "Generate PDF for GLA Hackathon Presentation",
                "Generate image of a red sports car",
                "What is my monthly spending?",
                "Check pending approval requests"
            ]
        }

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

    # 5b. Machine Learning Anomaly Detection Intent (PyOD Isolation Forest)
    anomaly_patterns = [
        r'\b(?:anomal(?:y|ies)|unusual\s+expense|suspicious|spending\s+spike|flagged\s+expense|pyod|isolation\s+forest)\b',
        r'\b(?:audit\s+(?:spending|expenses)|check\s+anomalies|detect\s+anomalies|any\s+anomalies|find\s+anomalies)\b'
    ]
    if any(re.search(p, msg_lower) for p in anomaly_patterns):
        tool_res = await tool_detect_anomalies(db, user)
        return {
            "reply": localize_text(tool_res.get("reply", ""), language),
            "citations": [],
            "tool_called": "detect_anomalies",
            "tool_result": tool_res,
            "escalated": False,
            "suggested_actions": ["View Forecast & Anomalies tab", "Audit high-value claims", "Push anomalies to Telegram"]
        }

    # 5c. Device Calling Intent (Direct Voice Call to Personal Device)
    call_patterns = [
        r'\b(?:call\s+(?:my\s+)?(?:device|phone|mobile|number|cell|handset)|call\s+me|make\s+a\s+call|voice\s+call|phone\s+call|dial\s+(?:my\s+)?number|ring\s+my\s+phone)\b',
        r'\b(?:mujhe\s+call\s+karo|call\s+lagao|phone\s+mila\s+do|call\s+karo)\b'
    ]
    if any(re.search(p, msg_lower) for p in call_patterns):
        # Extract optional phone number if user specified one (e.g. "call 9997534798")
        num_match = re.search(r'\b(?:\+?91[\s-]?)?[6789]\d{9}\b', message)
        target_num = num_match.group(0).replace(" ", "").replace("-", "") if num_match else None
        
        # Extract optional custom topic/reason
        m_reason = re.search(r'(?:about|regarding|for|saying)\s+([^.!?]+)', message, re.IGNORECASE)
        call_reason = m_reason.group(1).strip() if m_reason else "Financial & Expense Telemetry Alert"

        tool_res = await tool_call_device(db, user, reason=call_reason, phone_number=target_num)
        return {
            "reply": localize_text(tool_res.get("reply", ""), language),
            "citations": [],
            "tool_called": "call_device",
            "tool_result": tool_res,
            "call_info": tool_res.get("call_info"),
            "voice_text": tool_res.get("spoken_message"),
            "escalated": False,
            "suggested_actions": [
                f"Call {tool_res.get('phone_number', 'device')} again",
                "Send daily SMS recap",
                "Check anomaly alerts",
                "View pending approvals"
            ]
        }

    # 5d. Monthly Spending & Budget Query Intent
    spending_patterns = [
        r'\b(?:how\s+much\s+(?:did\s+i|have\s+i)\s+spend|monthly\s+spending|total\s+spending|my\s+spending|spending\s+this\s+month|kitna\s+spend\s+kiya|mera\s+kharcha)\b',
        r'\b(?:expenses?\s+this\s+month|monthly\s+expenses?|spending\s+summary|budget\s+status)\b'
    ]
    if any(re.search(p, msg_lower) for p in spending_patterns):
        tool_res = await tool_get_monthly_spending(db, user_id)
        spent = tool_res.get("total_spent", 0.0)
        budget = tool_res.get("total_budget", 50000.0)
        remaining = tool_res.get("remaining_budget", max(0.0, budget - spent))
        pct = tool_res.get("percentage_used", round((spent / max(1.0, budget)) * 100, 1))
        
        reply_lines = [
            f"📊 **Monthly Spending & Budget Overview (October 2026)**:",
            f"━━━━━━━━━━━━━━━━━━━",
            f"• 💰 **Total Spent**: ₹{spent:,.2f} INR",
            f"• 🎯 **Monthly Budget**: ₹{budget:,.2f} INR",
            f"• 💵 **Remaining Surplus**: ₹{remaining:,.2f} INR ({100 - pct:.1f}% remaining)",
            f"• 📈 **Budget Utilization**: {pct}% used"
        ]
        cats = tool_res.get("categories", [])
        if cats:
            reply_lines.append("\n🏷️ **Top Spending Categories**:")
            for c in cats[:3]:
                reply_lines.append(f"  - **{c['category']}**: ₹{c['amount']:,.2f} ({c.get('percentage', 0):.1f}%)")
        
        return {
            "reply": localize_text("\n".join(reply_lines), language),
            "citations": [],
            "tool_called": "get_monthly_spending",
            "tool_result": tool_res,
            "escalated": False,
            "suggested_actions": [
                "Where did most of my money go?",
                "Can I afford a ₹1,200 purchase?",
                "What if I reduce shopping expenses by 20%?",
                "Generate spending visual card"
            ]
        }

    # 5e. Category Breakdown Intent
    breakdown_patterns = [
        r'\b(?:where\s+did\s+(?:most\s+of\s+)?my\s+money\s+go|category\s+breakdown|breakdown\s+by\s+category|spending\s+breakdown|kaha\s+kharch\s+hua|top\s+spending\s+categor(?:y|ies))\b'
    ]
    if any(re.search(p, msg_lower) for p in breakdown_patterns):
        tool_res = await tool_get_category_breakdown(db, user_id)
        cats = tool_res.get("categories", [])
        total = tool_res.get("total_spent", 0.0)
        top_cat = tool_res.get("top_category") or (cats[0]["category"] if cats else "General")
        top_amt = tool_res.get("top_category_amount") or (cats[0]["amount"] if cats else 0.0)
        
        reply_lines = [
            f"📈 **Category Breakdown of Your Spending**:",
            f"━━━━━━━━━━━━━━━━━━━",
            f"• 🥇 **Highest Outflow**: **{top_cat}** at **₹{top_amt:,.2f} INR**",
            f"• 💳 **Total Expenditure**: **₹{total:,.2f} INR**\n",
            "📊 **Distribution by Category**:"
        ]
        for c in cats:
            reply_lines.append(f"• **{c['category']}**: ₹{c['amount']:,.2f} ({c.get('percentage', 0):.1f}%)")
            
        return {
            "reply": localize_text("\n".join(reply_lines), language),
            "citations": [],
            "tool_called": "get_category_breakdown",
            "tool_result": tool_res,
            "escalated": False,
            "suggested_actions": [
                f"What if I reduce {top_cat} by 20%?",
                "How much did I spend this month?",
                "Detect unusual expenses",
                "Generate PDF Report"
            ]
        }

    # 5f. Affordability Evaluation Intent
    afford_patterns = [
        r'\b(?:can\s+i\s+afford|kya\s+mai\s+khareed\s+sakta\s+hu|should\s+i\s+buy|is\s+it\s+in\s+my\s+budget)\b'
    ]
    if any(re.search(p, msg_lower) for p in afford_patterns):
        amt_m = re.search(r'(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+)', message, re.IGNORECASE)
        amount = 1200.0
        if amt_m:
            try:
                amount = float(amt_m.group(1).replace(",", ""))
            except:
                amount = 1200.0
                
        budget_info = await tool_calculate_remaining_budget(db, user_id)
        rem = budget_info.get("remaining_budget", 0.0)
        
        if amount <= rem:
            after_spend = rem - amount
            reply = (
                f"✅ **Yes, You Can Afford This Purchase!**\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"• 🏷️ **Requested Item Amount**: **₹{amount:,.2f} INR**\n"
                f"• 💰 **Current Remaining Budget**: **₹{rem:,.2f} INR**\n"
                f"• 💵 **Surplus After Purchase**: **₹{after_spend:,.2f} INR**\n\n"
                f"Your cash flow easily accommodates this expense without breaching your monthly budget limit."
            )
        else:
            deficit = amount - rem
            reply = (
                f"⚠️ **Budget Caution: Exceeds Remaining Surplus!**\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"• 🏷️ **Requested Item Amount**: **₹{amount:,.2f} INR**\n"
                f"• 💰 **Current Available Surplus**: **₹{rem:,.2f} INR**\n"
                f"• 🚨 **Budget Deficit**: **₹{deficit:,.2f} INR**\n\n"
                f"Making this purchase now will exceed your target budget. Consider deferring to next month or trimming non-essential categories."
            )
            
        return {
            "reply": localize_text(reply, language),
            "citations": [],
            "tool_called": "calculate_remaining_budget",
            "tool_result": {"requested_amount": amount, "budget_info": budget_info},
            "escalated": False,
            "suggested_actions": [
                "What if I reduce shopping expenses by 20%?",
                "How much did I spend this month?",
                "Where did most of my money go?"
            ]
        }

    # 5g. What-If Budget Simulation Intent
    whatif_patterns = [
        r'\b(?:what\s+if|what-if|agar\s+mai|simulate|reduce\s+(\w+)\s+(?:expenses?\s+)?by\s+(\d+)%?)\b'
    ]
    if any(re.search(p, msg_lower) for p in whatif_patterns):
        cat_match = re.search(r'\b(shopping|travel|food|meals|entertainment|groceries|utilities)\b', msg_lower)
        target_cat = cat_match.group(1).capitalize() if cat_match else "Shopping"
        
        pct_match = re.search(r'(\d+)\s*%', message)
        pct = float(pct_match.group(1)) if pct_match else 20.0
        
        tool_res = await tool_simulate_what_if(db, user_id, category=target_cat, percent_reduction=pct)
        sim_res = tool_res.get("result", {})
        
        savings = sim_res.get("monthly_savings", 0.0)
        new_total = sim_res.get("simulated_total_spent", 0.0)
        curr_total = sim_res.get("current_total_spent", 0.0)
        
        reply = (
            f"🔮 **What-If Financial Simulation**: Reducing **{target_cat}** by **{pct:.0f}%**\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"• 💰 **Estimated Monthly Savings**: **₹{savings:,.2f} INR**\n"
            f"• 📉 **New Projected Outflow**: ₹{new_total:,.2f} INR (down from ₹{curr_total:,.2f})\n"
            f"• 📈 **Annualized Wealth Impact**: You will accumulate **₹{savings * 12:,.2f} INR** in extra annual savings!\n\n"
            f"💡 *Actionable Recommendation:* Adjust your daily discretionary allowance for {target_cat} by ₹{savings / 30:,.0f}/day to reach this target easily."
        )
        return {
            "reply": localize_text(reply, language),
            "citations": [],
            "tool_called": "simulate_what_if",
            "tool_result": tool_res,
            "escalated": False,
            "suggested_actions": [
                "Can I afford a ₹1,200 purchase?",
                "Generate PDF for GLA Hackathon Presentation",
                "How much did I spend this month?"
            ]
        }

    # 5h. Uploaded Invoices Overview Intent
    invoice_overview_patterns = [
        r'\b(?:talk\s+about\s+(?:my\s+)?uploaded\s+invoices|my\s+invoices|show\s+invoices|list\s+invoices|uploaded\s+invoices|all\s+invoices)\b'
    ]
    if any(re.search(p, msg_lower) for p in invoice_overview_patterns):
        invoices = await db.invoices.find({}).to_list(10)
        if not invoices:
            from backend.app.services.seed_data import SAMPLE_INVOICES
            invoices = SAMPLE_INVOICES
            
        total_inv = sum(float(i.get("amount", 0.0)) for i in invoices)
        reply_lines = [
            f"📄 **Uploaded & Registered Corporate Invoices**:",
            f"━━━━━━━━━━━━━━━━━━━",
            f"Found **{len(invoices)} invoices** totaling **₹{total_inv:,.2f} INR** in the enterprise ledger:\n"
        ]
        for inv in invoices[:5]:
            status_emoji = "🟢" if inv.get("status") == "Paid" else ("🟡" if inv.get("status") == "Pending" else "🔴")
            reply_lines.append(
                f"• {status_emoji} **{inv.get('invoice_number', inv.get('id'))}** ({inv.get('vendor_name', inv.get('vendor_id'))}): "
                f"**₹{float(inv.get('amount', 0)):,.2f} INR** — Status: `{inv.get('status', 'Pending')}`"
            )
        reply_lines.append("\n💡 You can ask about any specific invoice ID (e.g. *\"status of INV-2004\"*) or trigger OCR audit verification!")
        return {
            "reply": localize_text("\n".join(reply_lines), language),
            "citations": [],
            "tool_called": "invoice_overview",
            "tool_result": {"count": len(invoices), "total": total_inv},
            "escalated": False,
            "suggested_actions": [
                "Status of INV-2004",
                "View overdue invoices",
                "Executive finance summary",
                "Generate PDF Report"
            ]
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

    # 8. Capability Inquiries for Image & PDF Generation (e.g. 'kya mai kesi bhi image genraete kara sakta hu or pdf bhi')
    cap_inquiry_patterns = [
        r'kya\s+mai\s+.*(?:image|pdf|photo)',
        r'can\s+i\s+(?:generate|create|make)\s+(?:any|any\s+type\s+of)\s+(?:image|pdf)',
        r'kya\s+.*(?:koi\s+bhi|kesi\s+bhi|kisi\s+bhi).*(?:image|pdf|photo)',
        r'what\s+(?:type\s+of\s+)?(?:images?|pdfs?)\s+can\s+you\s+(?:generate|create|make)',
        r'can\s+you\s+(?:generate|create|make)\s+any\s+(?:image|pdf)'
    ]
    if any(re.search(p, msg_lower) for p in cap_inquiry_patterns):
        cap_reply = (
            "✨ **Yes, Absolutely!** You can generate **ANY custom image and ANY executive PDF report** according to any prompt you give!\n\n"
            "━━━━━━━━━━━━━━━━━━━\n"
            "🎨 **For Any Custom Image:**\n"
            "Just type what you would like to see:\n"
            "• *\"generate image of a red sports car\"*\n"
            "• *\"create an image of a futuristic cyberpunk city\"*\n"
            "• *\"make an image of a cat playing piano in space\"*\n"
            "• *\"draw a sunset over snow mountains\"*\n"
            "• *\"generate image with text 'ExpensePilot Winner 2026'\"*\n"
            "• *\"visual card of spending and cashflow telemetry\"*\n\n"
            "📄 **For Any Custom PDF Report:**\n"
            "Simply specify your topic or presentation title:\n"
            "• *\"generate pdf for GLA Hackathon Presentation\"*\n"
            "• *\"create a pdf report on Q3 expenses & audit\"*\n"
            "• *\"generate pdf about 90-day wealth roadmap\"*\n"
            "• *\"export pdf report for Tech Team Budget\"*\n\n"
            "⚡ **Both engines are live!** Images render in 1200x675 HD with instant inline display, and PDFs generate vector print-ready documents with one-click download."
        )
        return {
            "reply": localize_text(cap_reply, language),
            "citations": [],
            "tool_called": "capability_info",
            "escalated": False,
            "suggested_actions": [
                "generate image of a red sports car",
                "generate pdf for GLA Hackathon Presentation",
                "create an image of a futuristic city",
                "download roadmap pdf"
            ]
        }

    # 9. PDF Generation Intent (Custom Title & Memo Extraction)
    pdf_intent_patterns = [
        r'\b(generate|create|make|export|download|banao|chahiye)\b.*\bpdf\b',
        r'\bpdf\b.*\b(generate|create|make|banao|chahiye|download|export)\b',
        r'^pdf\b',
        r'\bpdf report\b',
        r'\broadmap pdf\b',
        r'\bpdf for\b',
        r'\bpdf of\b',
        r'\bka pdf\b'
    ]
    if any(re.search(p, msg_lower) for p in pdf_intent_patterns):
        # Extract custom title and notes from message
        custom_title = None
        custom_notes = None

        m_quote = re.search(r'["\'\u201c\u201d]([^"\'\u201c\u201d]{3,})["\'\u201c\u201d]', message)
        if m_quote:
            custom_title = m_quote.group(1).strip()[:50]
            custom_notes = f"Custom Report: {m_quote.group(1).strip()}"
        else:
            m_topic = re.search(r'(?:for|about|titled|on|regarding|topic\s*[:=]|title\s*[:=])\s*[:"\'\s]*(.+?)(?:["\'\s]*$)', message, re.IGNORECASE)
            if m_topic:
                t = m_topic.group(1).strip()
                t_clean = re.sub(r'^(?:the\s+|a\s+|an\s+)', '', t, flags=re.IGNORECASE)
                custom_title = t_clean[:45].upper()
                custom_notes = f"Custom Directive: {t}"
            else:
                pat = r'^(?:can\s+you\s+|please\s+)?(?:generate|create|make|export|download|give\s+me)\s+(?:an?\s+)?(?:pdf|report|roadmap|audit|document)?(?:\s+(?:of|for|about|on|regarding))?\s*'
                sub = re.sub(pat, '', message, flags=re.IGNORECASE).strip()
                sub = re.sub(r'(?:\s+please|\s+now|\s+banao|\s+generate\s+karo|[.!?]+)$', '', sub, flags=re.IGNORECASE).strip()
                if sub and len(sub) > 2 and sub.lower() not in ["pdf", "report", "roadmap", "document"]:
                    custom_title = sub[:45].upper()
                    custom_notes = f"Executive Report on {sub}"

        tool_res = await tool_generate_pdf_report(db, user, custom_title=custom_title, custom_notes=custom_notes)
        return {
            "reply": localize_text(tool_res.get("reply", ""), language),
            "citations": [],
            "tool_called": "generate_pdf_report",
            "tool_result": tool_res,
            "pdf_download_url": tool_res.get("pdf_url", "/api/analytics/roadmap/pdf"),
            "escalated": False,
            "suggested_actions": ["Download PDF Report", "View Financial Analytics", "Ask Agent for Breakdown"]
        }

    # 10. Visual / Image Generation Intent (Creative Prompts & Financial Cards)
    image_intent_patterns = [
        r'\b(generate|create|make|draw|paint|sketch|render|show)\b.*\b(image|picture|photo|card|visual|graphic|illustration)\b',
        r'\b(image|picture|photo|card|visual)\b.*\b(generate|create|make|draw|banao|chahiye|render)\b',
        r'^(?:image|photo|picture)\s+(?:of|for|with|saying)\b',
        r'^\s*(?:draw|paint|sketch)\b',
        r'\b(ki\s+image|ki\s+photo|ka\s+photo|ka\s+image)\b',
        r'\b(wright\s+text|write\s+text)\b',
        r'\bvisual card\b',
        r'\bspending card\b'
    ]
    if any(re.search(p, msg_lower) for p in image_intent_patterns):
        # Extract custom prompt / subject / directive
        custom_directive = None

        m_quote = re.search(r'["\'\u201c\u201d]([^"\'\u201c\u201d]{3,})["\'\u201c\u201d]', message)
        if m_quote:
            custom_directive = m_quote.group(1).strip()
        else:
            m_text = re.search(r'(?:with\s+text|saying|titled|with\s+title|write\s+text|text\s*[:=]|note\s*[:=]|wright\s+text)\s*[:"\'\s]*(.+?)(?:["\'\s]*$)', message, re.IGNORECASE)
            if m_text:
                custom_directive = m_text.group(1).strip()
            else:
                m_hinglish = re.search(r'(.+?)\s*(?:ki\s+image|ki\s+photo|ka\s+photo|ka\s+image)\s*(?:banao|generate\s+karo|bana\s+do|chahiye|create\s+karo)?', message, re.IGNORECASE)
                if m_hinglish and len(m_hinglish.group(1).strip()) > 2 and not any(kw in m_hinglish.group(1).lower() for kw in ["kya", "kaise", "can"]):
                    sub = re.sub(r'^(?:mujhe\s+|ek\s+|kripya\s+)', '', m_hinglish.group(1).strip(), flags=re.IGNORECASE)
                    if len(sub) > 2:
                        custom_directive = sub
                else:
                    pat = r'^(?:can\s+you\s+|please\s+)?(?:generate|create|make|draw|paint|sketch|render|show\s+me|give\s+me|build)\s+(?:an?\s+)?(?:image|card|visual|graphic|photo|picture|diagram|chart|illustration|drawing)?(?:\s+(?:of|for|about|with|showing|depicting|saying|titled|on))?\s*'
                    sub = re.sub(pat, '', message, flags=re.IGNORECASE).strip()
                    sub = re.sub(r'^(?:image|picture|photo|card|visual)\s+(?:of|for|about|with|showing|depicting|saying)\s+', '', sub, flags=re.IGNORECASE).strip()
                    sub = re.sub(r'(?:\s+please|\s+now|\s+banao|\s+generate\s+karo|\s+bana\s+do|[.!?]+)$', '', sub, flags=re.IGNORECASE).strip()
                    if sub and len(sub) > 1 and sub.lower() not in ["image", "photo", "picture", "card", "visual", "chart"]:
                        custom_directive = sub

        tool_res = await tool_generate_visual_card(db, user, custom_text=custom_directive)
        return {
            "reply": localize_text(tool_res.get("reply", ""), language),
            "citations": [],
            "tool_called": "generate_visual_card",
            "tool_result": tool_res,
            "image_url": tool_res.get("image_url", "/generated_reports/spending_card.png"),
            "escalated": False,
            "suggested_actions": ["Generate PDF Report", "View Cashflow Charts", "Simulate What-If"]
        }

    # 10b. Webpage Reading & Scraping Intent (Jina AI Reader r.jina.ai)
    url_match = re.search(r'https?://[^\s<>"]+|www\.[^\s<>"]+', message)
    is_web_intent = bool(url_match) or any(k in msg_lower for k in [
        "jina", "read url", "scrape url", "fetch url", "read link", "read webpage",
        "scrape webpage", "fetch webpage", "read website", "scrape website"
    ])
    if is_web_intent and url_match:
        target_url = url_match.group(0).rstrip(".,;!?'\"")
        tool_res = await tool_read_webpage(target_url, user)
        return {
            "reply": localize_text(tool_res.get("reply", ""), language),
            "citations": [tool_res.get("url")] if tool_res.get("url") else [],
            "tool_called": "read_webpage",
            "tool_result": tool_res,
            "escalated": False,
            "suggested_actions": [
                f"Summarize {tool_res.get('title', 'page')}",
                "Extract tables or financial figures",
                "Audit policy compliance against this link"
            ]
        }

    # 11. Policy Q&A with Mandatory Citations (Default fallback for all policy queries)
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
7. IDENTITY & ADDRESSING RULE: Always address the user directly by their actual authenticated name ({user_name}). Never call them by default placeholder names (such as John Doe) unless that is their actual name.
"""

async def call_llm_authentically(
    system_instruction: str,
    user_prompt: str,
    temperature: float = 0.35,
    max_tokens: int = 1000
) -> Optional[str]:
    """Calls Gemini or Groq LLM with dual-fallback architecture to produce authentic, grounded text."""
    
    # 1. Try Google Gemini API if configured
    if settings.GEMINI_API_KEY:
        chosen_gemini_model = getattr(settings, "GEMINI_MODEL", None) or "gemini-3.5-flash-lite"
        gemini_models_to_try = [chosen_gemini_model, "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"]
        seen_models = set()
        for g_model in gemini_models_to_try:
            if g_model in seen_models:
                continue
            seen_models.add(g_model)
            try:
                async with httpx.AsyncClient(timeout=20.0) as client:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{g_model}:generateContent?key={settings.GEMINI_API_KEY}"
                    payload = {
                        "contents": [{"role": "user", "parts": [{"text": f"{system_instruction}\n\nUser Question: {user_prompt}"}]}]
                    }
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
                        if text and text.strip():
                            return text.strip()
                    elif resp.status_code == 404:
                        continue
                    else:
                        print(f"[ExpensePilot AI] Gemini ({g_model}) status {resp.status_code}: {resp.text[:150]}")
            except Exception as e:
                print(f"[ExpensePilot AI] Gemini connection notice: {e}")

    # 2. Try Groq LLM if configured (or as fallback)
    if settings.GROQ_API_KEY:
        chosen_model = settings.GROQ_MODEL or "qwen/qwen3.8-27b"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": chosen_model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        try:
            async with httpx.AsyncClient(timeout=18.0) as client:
                resp = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    if content and content.strip():
                        return content.strip()
                elif resp.status_code in (404, 429):
                    fallback_model = "openai/gpt-oss-120b" if chosen_model != "openai/gpt-oss-120b" else "openai/gpt-oss-20b"
                    payload["model"] = fallback_model
                    resp_fallback = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                    if resp_fallback.status_code == 200:
                        content = resp_fallback.json()["choices"][0]["message"]["content"]
                        if content and content.strip():
                            return content.strip()
        except Exception as e:
            print(f"[ExpensePilot AI] Groq LLM notice: {e}")

    return None

async def build_financial_context(db: Any, user_id: str, curr_month: str) -> str:
    summary = await tool_get_monthly_spending(db, user_id, curr_month)
    b_info = await tool_calculate_remaining_budget(db, user_id, curr_month)
    
    # Category limits from budget document
    budget_doc = await db.budgets.find_one({"user_id": user_id, "month": curr_month})
    category_limits = budget_doc.get("category_limits", {}) if budget_doc else {}
    
    # Complete category breakdown
    cat_lines = []
    total_spent = summary.get("total_spent", 0.0)
    for idx, c in enumerate(summary.get("categories", []), start=1):
        cname = c["category"]
        camt = float(c["amount"])
        ccnt = c["count"]
        pct = round((camt / total_spent * 100), 1) if total_spent > 0 else 0.0
        limit = category_limits.get(cname)
        if limit:
            diff = camt - float(limit)
            status = f"Over by ₹{diff:,.2f}" if diff > 0 else f"Under by ₹{abs(diff):,.2f}"
            cat_lines.append(f"| {idx}. {cname} | ₹{camt:,.2f} | {pct}% | {ccnt} | ₹{float(limit):,.2f} | {status} |")
        else:
            cat_lines.append(f"| {idx}. {cname} | ₹{camt:,.2f} | {pct}% | {ccnt} | Uncapped | Within bounds |")
    
    categories_table_str = "\n".join(cat_lines) if cat_lines else "No categorized spending recorded."

    # Anomalies
    anomalies = await tool_detect_unusual_expenses(db, user_id, curr_month)
    anom_lines = []
    for a in anomalies:
        anom_lines.append(f"• {a['date']} | {a['description']} | ₹{float(a['amount']):,.2f} ({a['category']}) | Reason: {a['reason']}")
    anom_str = "\n".join(anom_lines) if anom_lines else "None (All spending is within normal baselines)"

    # Recent 15 transactions
    cursor = db.expenses.find({"user_id": user_id}).sort("date", -1).limit(15)
    recent = await cursor.to_list(length=15)
    recent_lines = []
    for r in recent:
        recent_lines.append(f"• {r.get('date')} | {r.get('description')} | ₹{float(r.get('amount', 0)):,.2f} | {r.get('category')} | {r.get('payment_method', 'UPI')}")
    recent_str = "\n".join(recent_lines) if recent_lines else "No transactions recorded yet."

    over_budget_amt = max(0.0, total_spent - summary['total_budget'])
    budget_status = f"OVER BUDGET by ₹{over_budget_amt:,.2f}" if over_budget_amt > 0 else f"Within Budget (₹{summary['remaining_budget']:,.2f} remaining)"

    ctx = f"""LIVE DATABASE GROUND TRUTH ({curr_month}):
• Total Spent: ₹{total_spent:,.2f}
• Monthly Budget: ₹{summary['total_budget']:,.2f}
• Budget Status: {budget_status}
• Percentage Used: {summary['percentage_used']}%
• Days Elapsed: {summary.get('days_elapsed', 29)} / {summary.get('total_days', 31)} (Days Remaining: {summary.get('days_remaining', 2)})
• Daily Average Spent So Far: ₹{summary.get('daily_avg_spent', 0):,.2f}/day
• Safe Daily Remaining Allowance: ₹{b_info.get('daily_budget_remaining', 0):,.2f}/day
• Total Recorded Transactions Count: {summary.get('expense_count', len(recent))}

COMPLETE CATEGORY-BY-CATEGORY BREAKDOWN (ALL CATEGORIES):
| Category | Spent | % of Total | Txn Count | Limit | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
{categories_table_str}

FLAGGED UNUSUAL TRANSACTIONS / ANOMALIES:
{anom_str}

RECENT RECORDED TRANSACTIONS (Latest 15):
{recent_str}
"""
    return ctx

SYSTEM_PERSONA = """You are ExpensePilot AI, a genuine, warm, and highly authentic personal financial mentor and AI copilot.

MANDATORY RULES FOR DATA ACCURACY & COMPLETENESS:
1. 100% COMPLETE & EXACT DATA:
   - When the user asks about their spending, budget, category breakdown, or transactions (e.g. "pura data sahi do", "actual me complete data shi de", "show breakdown", "all expenses", "kitna kharcha hua"), YOU MUST PROVIDE THE COMPLETE, EXACT NUMBERS from the LIVE DATABASE GROUND TRUTH above.
   - Do NOT omit any categories. Present ALL categories with their exact ₹ amounts, percentages, and transaction counts.
   - Present category breakdowns and summaries in clear, scannable Markdown tables or well-structured bullet lists with exact amounts in ₹.
   - Accurately state whether the user is over budget (and by how much in ₹) or under budget.
2. EMPATHETIC & AUTHENTIC MENTORSHIP:
   - Speak with warmth, honesty, and genuine care. Never be robotic, dismissive, or vague.
   - Understand real-world Indian budgeting: UPI payments, Swiggy/Zomato, Blinkit, groceries, metro, fuel, EMIs.
3. LANGUAGE MATCHING:
   - If the user writes or speaks in Hindi or Hinglish (e.g. 'kitna bacha hai', 'kya karu', 'bhai pura data sahi de', 'kaha gaya paisa'), reply in natural, fluent, friendly Hinglish.
   - If the user writes in English, reply in clean, engaging, articulate English.
4. STRICT TRUTH:
   - Never invent or hallucinate figures or dates. All numbers must strictly align with the ground truth data above.
"""

def extract_natural_language_expenses(message: str) -> List[Dict[str, Any]]:
    """
    Extracts structured expense items from natural language text
    (e.g., 'Spent ₹450 on lunch today', 'paid 1200 for groceries').
    """
    msg = message.strip()
    msg_l = msg.lower()

    if any(q in msg_l for q in [
        "what is", "how much", "tell me", "show me", "can i afford",
        "who are you", "predict", "forecast", "introduce", "suggest", "simulate"
    ]):
        return []

    pattern = re.compile(r'(?:(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*(?:₹|rs\.?|inr|rupees?))', re.IGNORECASE)
    matches = list(pattern.finditer(msg))

    results = []
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    yesterday_str = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
    date_str = yesterday_str if "yesterday" in msg_l or "kal" in msg_l else today_str

    if matches:
        for m in matches:
            amt_str = m.group(1) or m.group(2)
            try:
                amt = float(amt_str)
                if amt <= 0:
                    continue
                desc = re.sub(r'(?:spent|paid|bought|kharcha|record|add|on|for|yesterday|today|₹|rs\.?|inr|rupees?)', '', msg, flags=re.IGNORECASE)
                desc = re.sub(r'\b' + re.escape(amt_str) + r'\b', '', desc)
                desc = re.sub(r'\s+', ' ', desc).strip(' -:,')
                if not desc:
                    desc = "Expense"
                category = auto_categorize(desc)
                results.append({
                    "amount": amt,
                    "category": category,
                    "description": desc.title(),
                    "date": date_str
                })
            except (ValueError, TypeError):
                continue
    else:
        bare_match = re.search(r'\b(?:spent|paid|bought|add)\s+([0-9]+(?:\.[0-9]+)?)\s+(?:on|for)\s+(.+)', msg, re.IGNORECASE)
        if bare_match:
            try:
                amt = float(bare_match.group(1))
                desc = bare_match.group(2).strip()
                desc = re.sub(r'\b(?:yesterday|today)\b', '', desc, flags=re.IGNORECASE).strip()
                category = auto_categorize(desc)
                results.append({
                    "amount": amt,
                    "category": category,
                    "description": desc.title() if desc else "Expense",
                    "date": date_str
                })
            except (ValueError, TypeError):
                pass

    return results

async def process_agent_message(
    db: Any,
    user_id: str,
    message: str,
    language: str = "en",
    file_context: Optional[Dict[str, Any]] = None,
    user_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Core AI Agent reasoning loop with authentic, empathetic intelligence.
    """
    msg_lower = message.lower().strip()
    curr_month = datetime.utcnow().strftime("%Y-%m")
    fin_context = await build_financial_context(db, user_id, curr_month)

    # ─────────────────────────────────────────────────────────────────────────
    # 0a. Check for Self-Introduction / Identity
    # ─────────────────────────────────────────────────────────────────────────
    if any(q in msg_lower for q in [
        "introduce yourself", "who are you", "what can you do", "tell me about yourself", 
        "introduce", "hello voice agent", "hi voice agent", "voice agent", "your capabilities"
    ]):
        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user asked you to introduce yourself.
Introduce yourself warmly as ExpensePilot AI. Give a genuine, engaging overview of your capabilities (voice interaction, live expense tracking, invoice auditing, roadmap PDF generation, what-if budget simulations). Mention their current month spending status naturally with exact figures. Keep it warm, concise, and authentic."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            summary = await tool_get_monthly_spending(db, user_id, curr_month)
            ai_reply = (
                "🎙️ **Hello! I'm ExpensePilot Voice AI** — Your Autonomous Financial Copilot 🚀\n\n"
                f"I'm here to actively protect your money and guide your spending. For **{curr_month}**, you've spent ₹{summary['total_spent']:,.0f} of your ₹{summary['total_budget']:,.0f} budget.\n\n"
                "• 🗣️ **Voice & Natural Chat**: Speak or text me your daily expenses\n"
                "• 📑 **Invoice Auditing**: Upload receipts via the paperclip for automatic audit\n"
                "• 🗺️ **PDF Roadmap**: Generate an executive 90-day financial roadmap\n"
                "• 🔮 **What-If Simulations**: Test big purchases before making them\n\n"
                "How can I assist you right now?"
            )
        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "agent_self_introduction",
            "tool_result": {"status": "active"},
            "suggested_actions": [
                "Talk about my uploaded invoices",
                "Create PDF roadmap and give it to me",
                "How much can I spend per day?",
                "Predict my monthly spending"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 0b. Spreadsheet / Excel Upload Guidance & Troubleshooting
    # ─────────────────────────────────────────────────────────────────────────
    if any(q in msg_lower for q in [
        "failed to import", "import error", "excel sheet", "excel import", "excel error",
        "upload csv", "upload excel", "import csv", "import excel", "spreadsheet", 
        "upload file", "how to upload", "upload expenses", "import expenses",
        "not taking excel", "not accepting excel", "excel files", "excel file", 
        "excel upload", "excel nahi", "file nahi le raha"
    ]):
        prompt = f"""{SYSTEM_PERSONA}
The user is asking about or troubleshooting an Excel / CSV spreadsheet upload (e.g. reporting that it's not taking excel files, or asking how to import).
Respond warmly, authentically, and clearly in the user's language (Hindi/Hinglish if they asked in Hindi/Hinglish, otherwise English):
1. Reassure them that Excel (.xlsx, .xls, .xlsm) and CSV files are 100% fully supported.
2. Explain that the system now features automatic smart-detection:
   - Bank statements (SBI, HDFC, ICICI, Axis, Paytm, etc.) are automatically parsed, even with bank headers at the top and separate Debit/Credit columns!
   - Indian currency signs (₹, Rs., /-), commas, and negative debits are auto-cleaned.
   - Excel dates (serial numbers, DD/MM/YYYY, YYYY-MM-DD, timestamps) are auto-converted.
   - Column order does not matter; it automatically infers Date, Amount, and Description.
3. Tell them how to upload right now:
   - Click the Paperclip (📎) icon right here at the bottom of this chat.
   - Or drag and drop the Excel file directly into this chat window.
   - Or go to the Expenses / Transactions tab and click 'Import CSV'.
Keep your reply structured, respectful, and genuinely helpful."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = (
                "📊 **Excel & CSV Spreadsheet Upload Guide:**\n\n"
                "Aapki Excel file bilkul support hoti hai! System mein ab **Smart Auto-Detection** active hai:\n\n"
                "1. 📎 **Directly in this Chat**: Click the **Paperclip (📎)** icon below or drag & drop your `.xlsx`, `.xls`, or `.csv` file directly into this chat.\n"
                "2. 📋 **From Expenses Tab**: Go to the **Expenses** tab and click the **'Import CSV'** button.\n\n"
                "✨ **Ab sab kuch automatically handle hota hai:**\n"
                "• **Bank Statements**: SBI, HDFC, ICICI, Axis ke statements automatically parse ho jayenge (chahe Debit aur Credit separate columns mein ho).\n"
                "• **Currency**: ₹ symbols, commas (`1,500`), aur `/-` automatically clean ho jayenge.\n"
                "• **Dates**: `DD/MM/YYYY`, `YYYY-MM-DD`, ya Excel date numbers sab detect ho jate hain.\n"
                "• **Columns**: Bas Date, Amount (ya Debit), aur Description hone chahiye (kisi bhi order mein).\n\n"
                "Kripya apni Excel file dobara attach karein, main turant import karke aapke transactions add kar dunga! 🚀"
            )
        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "agent_upload_guidance",
            "tool_result": {"status": "ready", "supported_formats": [".xlsx", ".xls", ".xlsm", ".csv"]},
            "suggested_actions": [
                "How much did I spend this month?",
                "Detect unusual expenses",
                "Create PDF roadmap and give it to me"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 0c. Uploaded Invoices Discussion
    # ─────────────────────────────────────────────────────────────────────────
    if any(q in msg_lower for q in [
        "invoice", "invoices", "uploaded invoice", "receipt", "receipts", "audit invoice",
        "talk about my invoices", "discuss invoices", "show my invoices", "bills"
    ]):
        from backend.app.routers.invoices import ensure_demo_invoices
        await ensure_demo_invoices(db, user_id)
        cursor = db.invoices.find({"user_id": user_id}).sort("date", -1)
        invoices = await cursor.to_list(length=50)

        total_inv_amt = sum(float(inv.get("amount", 0.0)) for inv in invoices)
        anomalous_invoices = [inv for inv in invoices if inv.get("is_anomaly")]
        inv_summary = "\n".join([f"- {inv.get('vendor')}: ₹{inv.get('amount', 0):,.2f} on {inv.get('date')} [{inv.get('category')}]{' (FLAGGED ANOMALY: ' + inv.get('anomaly_reason') + ')' if inv.get('is_anomaly') else ''}" for inv in invoices[:5]])

        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user wants to discuss their uploaded invoices and receipts.
Here is the real invoice data from the database:
Total recorded invoices: {len(invoices)}, totaling ₹{total_inv_amt:,.2f}.
Recent invoices:
{inv_summary}

Anomalies flagged: {len(anomalous_invoices)} invoice(s).
Give an authentic, sharp invoice audit recap with exact figures. Highlight any anomalies (e.g. high price flags) and explain whether their business/personal expenses look sound and tax-deductible."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            reply_lines = [
                f"📑 **Uploaded Invoices & Liabilities Audit**",
                f"Found **{len(invoices)} recorded invoices** totaling **₹{total_inv_amt:,.2f}** for your account.\n"
            ]
            for inv in invoices[:5]:
                status_emoji = "⚠️" if inv.get("is_anomaly") else "✅"
                reply_lines.append(f"{status_emoji} **{inv.get('vendor', 'Merchant')}**: ₹{inv.get('amount', 0):,.2f} on {inv.get('date')} [{inv.get('category')}]")
                if inv.get("is_anomaly"):
                    reply_lines.append(f"   └ 🚨 *Audit Flag*: {inv.get('anomaly_reason')}")
            ai_reply = "\n".join(reply_lines)

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "audit_uploaded_invoices",
            "tool_result": {
                "total_invoices": len(invoices),
                "total_amount": total_inv_amt,
                "anomalies_count": len(anomalous_invoices)
            },
            "suggested_actions": [
                "Create PDF roadmap and give it to me",
                "Where did most of my money go?",
                "Can I afford a ₹1,500 purchase?",
                "Predict my monthly spending"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 0d. Financial Roadmap & PDF Generation
    # ─────────────────────────────────────────────────────────────────────────
    if any(q in msg_lower for q in [
        "roadmap", "pdf roadmap", "create pdf", "give roadmap", "financial roadmap",
        "download roadmap", "create pdf roadmap and give you", "give me roadmap", 
        "generate roadmap", "download pdf", "give you roadmap", "financial plan"
    ]):
        from backend.app.services.analytics import get_monthly_summary
        from backend.app.routers.invoices import ensure_demo_invoices
        await ensure_demo_invoices(db, user_id)
        
        summary = await get_monthly_summary(db, user_id, curr_month)
        budget_doc = await db.budgets.find_one({"user_id": user_id, "month": curr_month})
        total_budget = budget_doc.get("total_budget", 18000.0) if budget_doc else 18000.0
        total_spent = summary.get("total_spent", 0.0)
        ratio = total_spent / total_budget if total_budget > 0 else 0.8
        health_score = max(15, min(95, int(100 - (ratio - 0.7) * 80))) if ratio > 0.7 else 92

        download_url = f"http://127.0.0.1:8000/api/analytics/roadmap/pdf?month={curr_month}&user_id={user_id}"

        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user asked for their 90-day Financial Roadmap and PDF report.
Their current financial health score is {health_score}/100.
Current Outflow: ₹{total_spent:,.2f} of ₹{total_budget:,.2f}.
Briefly outline the 3 phases:
- Phase 1 (Days 1-30): Runway defense and tightening discretionary leaks
- Phase 2 (Days 31-60): Run-rate realignment and emergency reserves
- Phase 3 (Days 61-90): Wealth acceleration towards target savings
Reassure them that the official printable PDF report has been compiled and is ready for download right below."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = (
                f"🗺️ **ExpensePilot 90-Day Financial Roadmap**\n\n"
                f"• **Financial Health Score**: **{health_score}/100**\n"
                f"• **Current Outflow**: ₹{total_spent:,.0f} of ₹{total_budget:,.0f}\n"
                f"• **Projected 90-Day Capital Preserved**: **+₹15,000**\n\n"
                f"**Execution Phases:**\n"
                f"1. **Phase 1 (Days 1–30)**: Cap discretionary velocity to ₹150/day and enforce 48-hour cool-off.\n"
                f"2. **Phase 2 (Days 31–60)**: Envelope budgeting on Food & Groceries; build ₹9,500 emergency buffer.\n"
                f"3. **Phase 3 (Days 61–90)**: Accelerate savings goal and maintain burn rate <85%.\n\n"
                f"📄 **Your PDF Document is Ready!** Tap the download button below:"
            )

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "pdf_download_url": download_url,
            "tool_called": "generate_financial_roadmap_pdf",
            "tool_result": {
                "health_score": health_score,
                "projected_savings_90_days": 15000.0,
                "download_url": download_url
            },
            "suggested_actions": [
                "Talk about my uploaded invoices",
                "How much can I spend per day?",
                "What if I reduce food spending by 20%?",
                "Predict my monthly spending"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 0e. AI Spending Risk Prediction & Runway Assessment
    # ─────────────────────────────────────────────────────────────────────────
    if any(q in msg_lower for q in [
        "risk", "risk predictor", "risk analysis", "risk score", "predict risk",
        "kab tak chalega", "runway", "exhaustion", "burn velocity", "khatam ho jayega",
        "spending risk", "financial risk", "risk prediction"
    ]):
        from backend.app.services.risk_predictor import calculate_ai_risk_prediction
        risk_data = await calculate_ai_risk_prediction(db, user_id, curr_month)
        ai_assess = risk_data.get("ai_assessment", {})
        
        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user is asking about their Financial Spending Risk Prediction and budget runway.
Ground Truth Multi-Factor Risk Assessment Metrics:
- Calculated Risk Score: {risk_data.get('risk_score')}/100 ({risk_data.get('risk_level')} Risk)
- Burn Velocity: {risk_data.get('velocity_ratio')}x safe linear burn rate
- Exhaustion Runway Status: {risk_data.get('exhaustion_status')}
- Safe Daily Remaining Target: ₹{risk_data.get('safe_daily_allowance'):,.2f}/day
- Actual Daily Average Burn: ₹{risk_data.get('actual_daily_avg'):,.2f}/day
- Projected Month-End Overrun: ₹{risk_data.get('projected_overrun'):,.2f}
- Key Risk Factors: {', '.join([f['factor'] + ' (' + f['impact'] + ')' for f in risk_data.get('risk_factors', [])])}
- AI Recommendations: {'; '.join(ai_assess.get('top_recommendations', []))}

Present an authoritative, empathetic, and scannable breakdown:
1. State the exact Risk Score ({risk_data.get('risk_score')}/100) and Level.
2. Clearly explain the exhaustion runway (e.g. will the budget last or when it runs out).
3. Compare their current daily burn (₹{risk_data.get('actual_daily_avg'):,.0f}/day) against safe daily allowance (₹{risk_data.get('safe_daily_allowance'):,.0f}/day).
4. Give 3 concrete, realistic action steps to de-risk their finances immediately.
Match the user's language (natural Hinglish if they spoke in Hindi/Hinglish, otherwise English)."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = (
                f"🚨 **ExpensePilot AI Spending Risk Assessment**\n\n"
                f"• **Risk Score**: **{risk_data.get('risk_score')}/100** ({risk_data.get('risk_level')} Risk)\n"
                f"• **Burn Velocity**: **{risk_data.get('velocity_ratio')}x** of safe pace\n"
                f"• **Runway Status**: {risk_data.get('exhaustion_status')}\n"
                f"• **Safe Daily Target**: **₹{risk_data.get('safe_daily_allowance'):,.0f}/day** (Current: ₹{risk_data.get('actual_daily_avg'):,.0f}/day)\n\n"
                f"🎯 **Actionable Mitigation Countermeasures:**\n"
                + "\n".join([f"• {r}" for r in ai_assess.get('top_recommendations', [
                    f"Cap daily spend to ₹{risk_data.get('safe_daily_allowance'):,.0f}/day",
                    "Freeze discretionary dining & entertainment orders",
                    "Audit top expense categories"
                ])])
            )

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "predict_spending_risk",
            "tool_result": {
                "risk_score": risk_data.get("risk_score"),
                "risk_level": risk_data.get("risk_level"),
                "exhaustion_status": risk_data.get("exhaustion_status"),
                "safe_daily_allowance": risk_data.get("safe_daily_allowance")
            },
            "suggested_actions": [
                "How much did I spend this month?",
                "Simulate what-if purchase",
                "Create PDF roadmap and give it to me",
                "Detect unusual expenses"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 0f. Phone Number Connection / Dispatch
    # ─────────────────────────────────────────────────────────────────────────
    is_phone_add = any(q in msg_lower for q in [
        "add my number", "add number", "connect my phone", "connect phone", "connect my number",
        "pair my phone", "pair phone", "register my phone", "register phone", "save my number",
        "save phone", "my number is", "my phone number is", "update my phone", "set my phone"
    ]) or (any(w in msg_lower for w in ["phone", "number"]) and any(w in msg_lower for w in ["add", "connect", "pair", "register", "save", "update", "set"]))
    
    phone_match = re.search(r'(\+?\d[\d\s\-]{8,14}\d)', message)
    if is_phone_add and phone_match:
        from backend.app.services.messaging import update_phone_settings, dispatch_phone_message
        raw_num = phone_match.group(1).strip()
        clean_digits = re.sub(r'\D', '', raw_num)
        formatted_phone = f"+91 {clean_digits[:5]} {clean_digits[5:]}" if len(clean_digits) == 10 and not raw_num.startswith('+') else raw_num

        await update_phone_settings(db, user_id, {"phone_number": formatted_phone})
        welcome_text = f"ExpensePilot AI Connected! Your phone ({formatted_phone}) is paired with your autonomous financial copilot."
        dispatched = await dispatch_phone_message(
            db=db, user_id=user_id, phone_number=formatted_phone,
            message_type="PHONE_CONNECTED", channel="SMS", content=welcome_text
        )

        reply = (
            f"✅ **Phone Number Paired & Connected!**\n\n"
            f"• **Mobile**: `{formatted_phone}`\n"
            f"• **Channel**: **SMS & WhatsApp**\n"
            f"• **Status**: Active (Dispatch ID: `{dispatched['dispatch_id']}`)\n\n"
            f"You will now receive automatic evening spending digests, anomaly alerts, and roadmap links on your phone."
        )
        return {
            "reply": reply,
            "voice_text": f"Your phone number {formatted_phone} has been paired successfully.",
            "tool_called": "connect_phone_number",
            "tool_result": {"phone_number": formatted_phone, "status": "connected"},
            "suggested_actions": [
                "Send daily summary to my phone",
                "Create PDF roadmap and give it to me",
                "How much can I spend per day?"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Natural Language Expense Addition
    # ─────────────────────────────────────────────────────────────────────────
    extracted_items = extract_natural_language_expenses(message)
    if extracted_items and any(w in msg_lower for w in ["spent", "bought", "paid", "record", "add", "yesterday", "today", "₹", "kharch", "diye"]):
        added_records = []
        for item in extracted_items:
            rec = await tool_add_expense(
                db=db, user_id=user_id,
                amount=item["amount"], category=item["category"],
                description=item["description"], date_str=item["date"]
            )
            added_records.append(rec)

        b_info = await tool_calculate_remaining_budget(db, user_id, curr_month)
        added_txt = ", ".join([f"₹{r['amount']:,.2f} for {r['description']} ({r['category']})" for r in added_records])

        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

ACTION TAKEN BY SYSTEM:
Successfully recorded {len(added_records)} expense(s): {added_txt}.
Updated Budget Status: Total spent is now ₹{b_info['total_spent']:,.2f} of ₹{b_info['total_budget']:,.2f} ({b_info['percentage_used']}% consumed). Remaining budget: ₹{b_info['remaining_budget']:,.2f} with {b_info['days_remaining']} days left in {curr_month}.

Confirm the recorded transaction with exact amounts. State the new exact total spent and remaining budget clearly. Give candid, practical advice on remaining days."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = (
                f"✅ **Recorded {len(added_records)} expense(s) successfully!**\n\n"
                f"• {added_txt}\n\n"
                f"📊 **Updated Status**: ₹{b_info['total_spent']:,.2f} spent of ₹{b_info['total_budget']:,.2f} budget ({b_info['percentage_used']}% used).\n"
                f"💡 Remaining safe allowance: **₹{b_info['remaining_budget']:,.2f}** (₹{b_info['daily_budget_remaining']:,.2f}/day for remaining {b_info['days_remaining']} days)."
            )

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "add_expense",
            "tool_result": added_records,
            "structured_expenses_added": added_records,
            "suggested_actions": [
                "How much can I spend per day?",
                "Predict my monthly spending",
                "Where did most of my money go?"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Purchase Affordability ("Can I afford ₹...", "What if I spend...")
    # ─────────────────────────────────────────────────────────────────────────
    afford_match = re.search(r'(?:can i afford|what if i spend|what happens if i spend|kya me le sakta hu|kya me afford kar sakta hu)\s*(?:a|an)?\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)\s*(?:on\s+([a-zA-Z\s]+))?', msg_lower)
    if afford_match:
        amt = float(afford_match.group(1))
        cat = afford_match.group(2) or "General"
        sim_res = await tool_simulate_what_if(
            db=db, user_id=user_id,
            upcoming_purchase_amount=amt, month_str=curr_month
        )
        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user is asking: Can I afford a purchase of ₹{amt:,.2f} on {cat}?
Mathematical simulation result:
- Current spend: ₹{sim_res['current_total_spend']:,.2f}
- Spend after purchase: ₹{sim_res['projected_new_total']:,.2f} of budget ₹{sim_res['monthly_budget']:,.2f}
- Revised remaining budget: ₹{sim_res['new_remaining_budget']:,.2f}
- Revised daily allowance: ₹{sim_res['new_daily_safe_target']:,.2f}/day
- Can comfortably afford: {sim_res.get('can_afford')}

Give a candid, authentic, and empathetic answer. Directly answer Yes or No first with warmth, explain the exact math and numbers, and give a realistic recommendation."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = sim_res["advice"]

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "simulate_what_if",
            "tool_result": sim_res,
            "suggested_actions": [
                "What if I reduce shopping expenses by 20%?",
                "How much did I spend this month?",
                "Predict my monthly spending"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Category Reduction Simulation ("reduce shopping by 20%")
    # ─────────────────────────────────────────────────────────────────────────
    whatif_match = re.search(r'reduce\s+([a-zA-Z]+)(?:\s+spending|\s+expenses)?\s+by\s+(\d+(?:\.\d{1,2})?)%', msg_lower)
    if whatif_match:
        cat_name = whatif_match.group(1).capitalize()
        pct = float(whatif_match.group(2))
        sim_res = await tool_simulate_what_if(
            db=db, user_id=user_id,
            category=cat_name, percent_reduction=pct, month_str=curr_month
        )
        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user wants to simulate reducing {cat_name} expenses by {pct}%.
Simulation calculations:
- Historical {cat_name} spend: ₹{sim_res.get('category_spend', 0):,.2f}
- Estimated monthly savings: ₹{sim_res.get('monthly_savings', 0):,.2f}
- Annualized savings: ₹{sim_res.get('annualized_savings', 0):,.2f}
Explain these exact savings numbers in an authentic, motivating way with real-world examples."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = sim_res["advice"]

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "simulate_what_if",
            "tool_result": sim_res,
            "suggested_actions": [
                "I want to save ₹5,000 in the next 3 months",
                "Can I afford a ₹1,500 purchase?",
                "Where did most of my money go?"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 4. Savings Goal Planning ("save 5000 in 3 months")
    # ─────────────────────────────────────────────────────────────────────────
    save_match = re.search(r'save\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)\s*(?:in|over)?\s*(?:the next)?\s*(\d+)?\s*(?:months)?', msg_lower)
    if save_match and "save" in msg_lower and any(c.isdigit() for c in msg_lower):
        target = float(save_match.group(1))
        months = int(save_match.group(2)) if save_match.group(2) else 3
        plan = await tool_create_saving_plan(
            db=db, user_id=user_id,
            target_amount=target, months=months,
            title=f"Goal: ₹{target:,.0f} in {months}m"
        )
        prompt = f"""{SYSTEM_PERSONA}
{fin_context}

The user set a savings goal: Target ₹{target:,.2f} over {months} months.
Monthly savings target: ₹{plan['monthly_target']:,.2f}/month (~₹{plan['daily_target']:,.2f}/day).
Specific suggestions generated: {json.dumps(plan['suggestions'])}.

Give an encouraging, structured, and realistic roadmap on how they can hit this goal by trimming discretionary spend."""
        ai_reply = await call_llm_authentically(prompt, message)
        if not ai_reply:
            ai_reply = (
                f"🎯 **Personalized Saving Plan Created!**\n\n"
                f"To accumulate **₹{target:,.2f}** over **{months} months**, your target is **₹{plan['monthly_target']:,.2f}/month** (approx. ₹{plan['daily_target']:,.2f}/day).\n\n"
                f"I have registered this goal in your Savings Planner!"
            )

        return {
            "reply": ai_reply,
            "voice_text": strip_markdown_for_speech(ai_reply)[:280],
            "tool_called": "create_saving_plan",
            "tool_result": plan,
            "suggested_actions": [
                "How much can I spend per day?",
                "Where did most of my money go?",
                "Predict my monthly spending"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Core Financial Diagnostics & Dynamic LLM Response Loop
    # ─────────────────────────────────────────────────────────────────────────
    # Identify diagnostic tool to run in parallel
    tool_called = "financial_advisor"
    tool_result = None

    is_complete_data_req = any(q in msg_lower for q in [
        "complete data", "pura data", "poora data", "sahi data", "all data", "full report",
        "detailed data", "breakdown", "all expenses", "saare kharche", "complete breakdown"
    ])

    if any(q in msg_lower for q in ["where did most of my money go", "biggest expense", "category breakdown", "top category", "highest expense", "kaha gaya paisa", "categories", "breakdown"]):
        tool_called = "get_category_breakdown"
        tool_result = await tool_get_category_breakdown(db, user_id, curr_month)
    elif any(q in msg_lower for q in ["how much did i spend", "how much spent", "total spend", "spending this month", "my expenses", "kitna kharcha", "kitna bacha", "budget status"]):
        tool_called = "get_monthly_spending"
        tool_result = await tool_get_monthly_spending(db, user_id, curr_month)
    elif any(q in msg_lower for q in ["how much can i spend per day", "daily budget", "daily limit", "spend per day", "daily allowance", "roz ka kharcha"]):
        tool_called = "calculate_remaining_budget"
        tool_result = await tool_calculate_remaining_budget(db, user_id, curr_month)
    elif any(q in msg_lower for q in ["predict", "forecast", "future expense", "projection", "estimated month-end", "aage ka kharcha"]):
        tool_called = "predict_monthly_spending"
        tool_result = await tool_predict_monthly_spending(db, user_id, curr_month)
    elif any(q in msg_lower for q in ["unusual", "suspicious", "anomal", "outlier", "high expense", "weird"]):
        tool_called = "detect_unusual_expenses"
        tool_result = await tool_detect_unusual_expenses(db, user_id, curr_month)
    elif is_complete_data_req:
        tool_called = "get_monthly_spending"
        tool_result = await tool_get_monthly_spending(db, user_id, curr_month)

    # Prompt Groq LLM with full financial ground truth
    completeness_instruction = ""
    if is_complete_data_req or tool_called in ("get_category_breakdown", "get_monthly_spending"):
        completeness_instruction = """
CRITICAL REQUIREMENT:
The user wants COMPLETE, EXACT, UNCOMPROMISED DATA.
- You MUST render a clear, organized Markdown Table displaying EVERY SINGLE CATEGORY from the context with exact Spent amounts, %, Txn count, Budget limit, and Over/Under status.
- State the exact Total Spent, Total Budget, whether they are Over/Under budget (and by exactly how much in ₹), Days Remaining, and Daily Average.
- Mention any flagged anomalies clearly.
- Do NOT skip or abbreviate any categories."""

    prompt = f"""{SYSTEM_PERSONA}
{fin_context}

{completeness_instruction}

Specific Diagnostic Data ({tool_called}):
{json.dumps(tool_result, default=str) if tool_result else 'General financial query'}

User Question: "{message}".
Respond with complete, 100% accurate, and authentic figures matching the ground truth above."""

    ai_reply = await call_llm_authentically(prompt, message, temperature=0.35, max_tokens=1000)

    if not ai_reply:
        # Graceful template fallback if network/LLM is temporarily offline
        summary = await tool_get_monthly_spending(db, user_id, curr_month)
        b_info = await tool_calculate_remaining_budget(db, user_id, curr_month)
        ai_reply = (
            f"📊 **Monthly Status for {curr_month}:**\n\n"
            f"• **Total Spent**: ₹{summary['total_spent']:,.2f}\n"
            f"• **Monthly Budget**: ₹{summary['total_budget']:,.2f}\n"
            f"• **Remaining**: ₹{summary['remaining_budget']:,.2f} ({summary['percentage_used']}% used)\n"
            f"• **Safe Daily Target**: ₹{b_info['daily_budget_remaining']:,.2f}/day ({b_info['days_remaining']} days left)\n"
            f"• **Top Category**: {summary['top_category']} (₹{summary['top_category_amount']:,.2f})\n"
        )

    res = {
        "reply": ai_reply,
        "voice_text": strip_markdown_for_speech(ai_reply)[:280],
        "tool_called": tool_called,
        "tool_result": tool_result,
        "suggested_actions": [
            "How much did I spend this month?",
            "Where did most of my money go?",
            "Can I afford a ₹1,000 purchase?",
            "Predict my monthly spending"
        ]
    }
    if db is not None:
        try:
            await write_audit(
                db=db,
                actor_id=user_id,
                actor_role="employee",
                action="AGENT_QUERY",
                entity_type="agent",
                entity_id=tool_called or "conversation",
                input_data={"message": message, "language": language},
                result={"tool_called": tool_called},
                status="SUCCESS"
            )
        except Exception:
            pass
    return res

