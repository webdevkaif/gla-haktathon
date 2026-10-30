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
    tool_read_webpage,
    tool_call_device,
    tool_get_monthly_spending,
    tool_get_category_breakdown,
    tool_calculate_remaining_budget,
    tool_simulate_what_if
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

async def process_agent_message(
    db: Any,
    user_id: str,
    message: str,
    language: str = "en",
    file_context: Optional[Dict[str, Any]] = None,
    user_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main entry point for processing agent queries:
    1. Loads current user profile and role, prioritizing actual user name.
    2. Masks personal data (PII).
    3. Handles spreadsheet context if provided.
    4. Executes query via LLM or deterministic fallback engine with multi-language output.
    5. Records immutable audit trail entry.
    6. Returns structured AgentChatResponse payload.
    """
    # 1. Load user profile
    user_doc = None
    if db is not None:
        user_doc = await db.users.find_one({"$or": [{"id": user_id}, {"user_id": user_id}]})
    if not user_doc:
        from backend.app.auth import DEMO_USERS
        user_doc = DEMO_USERS.get(user_id, DEMO_USERS.get("user_kaif", DEMO_USERS["emp_john"])).copy()
    else:
        user_doc = dict(user_doc)

    # Respect dynamically passed user name
    if user_name and user_name.strip():
        user_doc["name"] = user_name.strip()
    elif user_id == "user_kaif" or "kaif" in str(user_id).lower():
        user_doc["name"] = "Mohammad Kaif"

    # 2. Mask PII in input
    masked_message, had_pii = mask_pii(message)

    # Build contextual file attachment prompt if a file was provided
    file_prompt_addon = ""
    if file_context:
        file_prompt_addon = (
            f"\n\n[USER ATTACHED FILE CONTEXT]\n"
            f"Filename: {file_context.get('filename')} (Type: {file_context.get('file_type')})\n"
            f"Dimensions: {file_context.get('row_count')} rows, {file_context.get('column_count')} columns\n"
            f"Headers: {', '.join(file_context.get('headers', [])[:10])}\n"
            f"Financial Summary: {json.dumps(file_context.get('summary', {}))}\n"
            f"Data Preview:\n{file_context.get('markdown_preview', '')}\n"
            f"Sample Rows: {json.dumps(file_context.get('sample_rows', [])[:8])}\n"
            f"Instructions: The user has attached this file to the conversation. Answer their questions accurately using the numbers, line items, and data from this attached file.\n"
        )

    # 3. Fast-path: Check explicit tool execution (PDF, Images, Claim/Invoice Status, Reminders, Escalations)
    result = None
    direct_tool_res = await parse_and_route_deterministic(db, user_doc, masked_message, language, file_context)
    if direct_tool_res.get("tool_called") and direct_tool_res.get("tool_called") not in ["policy_qa", "out_of_scope"]:
        result = direct_tool_res

    # 4. Query LLM (Groq, xAI Grok, or Gemini) if API key configured, otherwise use deterministic engine
    # Option A: Groq (Ultra-fast LPU inference)
    if not result and settings.GROQ_API_KEY:
        try:
            lang_instruction = f"Respond in {language.upper()} language." if language and language != "en" else ""
            model_to_use = settings.GROQ_MODEL or "qwen/qwen3.8-27b"
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    json={
                        "model": model_to_use,
                        "messages": [
                            {"role": "system", "content": f"{SYSTEM_PROMPT}\n{lang_instruction}\nCurrent User: {user_doc.get('name')} (Role: {user_doc.get('role')}, ID: {user_doc.get('id')}, Grade: {user_doc.get('grade')}){file_prompt_addon}"},
                            {"role": "user", "content": masked_message}
                        ],
                        "temperature": 0.1,
                        "max_tokens": 600
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
                        "tool_called": "file_analyzer" if file_context else ("policy_qa" if citations else None),
                        "tool_result": file_context.get("summary") if file_context else None,
                        "escalated": False,
                        "suggested_actions": [
                            f"Summarize {file_context.get('filename')}" if file_context else "Check claim status",
                            "Are there any policy violations?",
                            "What is the total expenditure?"
                        ]
                    }
        except Exception as e:
            print(f"[Agent Notice] Groq inference fallback: {e}")

    # Option B: xAI Grok
    if not result and getattr(settings, 'GROK_API_KEY', None):
        try:
            lang_instruction = f"Respond in {language.upper()} language." if language and language != "en" else ""
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.GROK_API_KEY}"},
                    json={
                        "model": "grok-2-latest",
                        "messages": [
                            {"role": "system", "content": f"{SYSTEM_PROMPT}\n{lang_instruction}\nCurrent User: {user_doc.get('name')} (Role: {user_doc.get('role')}){file_prompt_addon}"},
                            {"role": "user", "content": masked_message}
                        ],
                        "temperature": 0.2,
                        "max_tokens": 600
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
                        "tool_called": "file_analyzer" if file_context else ("policy_qa" if citations else None),
                        "tool_result": file_context.get("summary") if file_context else None,
                        "escalated": False,
                        "suggested_actions": ["Check claim status", "View policy limits"]
                    }
        except Exception as e:
            print(f"[Agent Notice] xAI Grok inference fallback: {e}")

    # Option C: Google Gemini
    if not result and settings.GEMINI_API_KEY:
        try:
            lang_instruction = f"Respond in {language.upper()} language." if language and language != "en" else ""
            gemini_model = getattr(settings, "GEMINI_MODEL", "gemini-flash-lite-latest") or "gemini-flash-lite-latest"
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={settings.GEMINI_API_KEY}"
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    gemini_url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{
                            "parts": [{
                                "text": f"{SYSTEM_PROMPT}\n{lang_instruction}\nCurrent User: {user_doc.get('name')} (Role: {user_doc.get('role')}, ID: {user_doc.get('id')}, Grade: {user_doc.get('grade')}){file_prompt_addon}\nUser Query: {masked_message}"
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
                            "tool_called": "file_analyzer" if file_context else ("policy_qa" if citations else None),
                            "tool_result": file_context.get("summary") if file_context else None,
                            "escalated": False,
                            "suggested_actions": ["Check claim status", "View policy limits"]
                        }
        except Exception as e:
            print(f"[Agent Notice] Gemini API fallback: {e}")

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
    if db is not None:
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
