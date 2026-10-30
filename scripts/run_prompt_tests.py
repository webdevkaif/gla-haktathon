import asyncio
import re
from datetime import datetime
from backend.app.database import init_db, get_database
from backend.app.services.seed_data import seed_enterprise_data
from backend.app.agent.engine import process_agent_message
from backend.app.services.workflow import decide_approval, send_approval_reminder, check_and_send_due_reminders
from backend.app.services.escalation import resolve_escalation
from fastapi import HTTPException

# Helper functions for custom test runs
async def _tc14_run(db):
    return await decide_approval(db, "APP-3001", {"id": "mgr_sarah", "role": "manager"}, "Approved")

async def _unauthorized_approval_test(db):
    try:
        await decide_approval(db, "APP-3002", {"id": "emp_john", "role": "employee"}, "Approved")
        return "UNAUTHORIZED_ALLOWED"
    except HTTPException as e:
        if e.status_code == 403:
            return "BLOCKED_403"
        return f"HTTP_{e.status_code}"

async def _tc16_run(db):
    return await decide_approval(db, "APP-3007", {"id": "fin_alex", "role": "finance"}, "Approved")

async def _tc17_run(db):
    return await send_approval_reminder(db, "APP-3002", {"id": "mgr_sarah", "role": "manager"}, force=True)

async def _cooldown_reminder_test(db):
    try:
        await send_approval_reminder(db, "APP-3002", {"id": "mgr_sarah", "role": "manager"}, force=False)
        return "ALLOWED"
    except HTTPException as e:
        if e.status_code == 429:
            return "COOLDOWN_429"
        return f"HTTP_{e.status_code}"

async def _tc19_run(db):
    return await check_and_send_due_reminders(db)

async def _tc20_run(db):
    return await db.escalations.find_one({"id": "ESC-4001"})

async def _tc21_run(db):
    return await resolve_escalation(db, "ESC-4002", "fin_alex", "finance", "Corrected PO variance.")


TEST_CASES = [
    # 5 Policy Q&A
    {
        "id": "TC-01",
        "category": "Policy Q&A",
        "prompt": "What is the daily meal limit for Grade L2 employees?",
        "role": "emp_john",
        "expected_tool": "policy_qa",
        "check": lambda res: any(c["section_id"] == "SEC-102" for c in res.get("citations", [])) and "800" in res.get("reply", "")
    },
    {
        "id": "TC-02",
        "category": "Policy Q&A",
        "prompt": "What is the hotel allowance for Tier-1 cities?",
        "role": "emp_john",
        "expected_tool": "policy_qa",
        "check": lambda res: any(c["section_id"] == "SEC-104" for c in res.get("citations", [])) and "3,500" in res.get("reply", "")
    },
    {
        "id": "TC-03",
        "category": "Policy Q&A",
        "prompt": "Do I need a receipt for an expense of ₹750?",
        "role": "emp_john",
        "expected_tool": "policy_qa",
        "check": lambda res: any(c["section_id"] == "SEC-106" for c in res.get("citations", []))
    },
    {
        "id": "TC-04",
        "category": "Policy Q&A",
        "prompt": "What is the deadline to submit an expense claim?",
        "role": "emp_john",
        "expected_tool": "policy_qa",
        "check": lambda res: any(c["section_id"] == "SEC-105" for c in res.get("citations", [])) and "30" in res.get("reply", "")
    },
    {
        "id": "TC-05",
        "category": "Policy Q&A",
        "prompt": "When will approved claims be paid into my bank account?",
        "role": "emp_john",
        "expected_tool": "policy_qa",
        "check": lambda res: any(c["section_id"] == "SEC-108" for c in res.get("citations", [])) and "Friday" in res.get("reply", "")
    },

    # 4 Claim Status Queries
    {
        "id": "TC-06",
        "category": "Claim Status",
        "prompt": "Check the status of my claim CLM-1042",
        "role": "emp_john",
        "expected_tool": "claim_status",
        "check": lambda res: res.get("tool_called") == "claim_status" and "CLM-1042" in res.get("reply", "") and "Approved" in res.get("reply", "")
    },
    {
        "id": "TC-07",
        "category": "Claim Status",
        "prompt": "What is the status of CLM-1022?",
        "role": "emp_john",
        "expected_tool": "claim_status",
        "check": lambda res: "Access Restricted" in res.get("reply", "") or "Access Denied" in res.get("reply", "")
    },
    {
        "id": "TC-08",
        "category": "Claim Status",
        "prompt": "What is the status of CLM-1022?",
        "role": "mgr_sarah",
        "expected_tool": "claim_status",
        "check": lambda res: res.get("tool_called") == "claim_status" and "CLM-1022" in res.get("reply", "")
    },
    {
        "id": "TC-09",
        "category": "Claim Status",
        "prompt": "Status of claim CLM-1042",
        "role": "ven_acme",
        "expected_tool": "claim_status",
        "check": lambda res: "Access Denied" in res.get("reply", "")
    },

    # 4 Invoice Status Queries
    {
        "id": "TC-10",
        "category": "Invoice Status",
        "prompt": "What is the payment status of my invoice INV-2004?",
        "role": "ven_acme",
        "expected_tool": "invoice_status",
        "check": lambda res: res.get("tool_called") == "invoice_status" and "INV-2004" in res.get("reply", "")
    },
    {
        "id": "TC-11",
        "category": "Invoice Status",
        "prompt": "Check status of INV-2013",
        "role": "ven_acme",
        "expected_tool": "invoice_status",
        "check": lambda res: "Access Restricted" in res.get("reply", "") or "Access Denied" in res.get("reply", "")
    },
    {
        "id": "TC-12",
        "category": "Invoice Status",
        "prompt": "Give me the status of invoice INV-2005",
        "role": "fin_alex",
        "expected_tool": "invoice_status",
        "check": lambda res: res.get("tool_called") == "invoice_status" and "Duplicate Alert" in res.get("reply", "")
    },
    {
        "id": "TC-13",
        "category": "Invoice Status",
        "prompt": "Status of vendor invoice INV-2004",
        "role": "emp_john",
        "expected_tool": "invoice_status",
        "check": lambda res: "Access Denied" in res.get("reply", "")
    },

    # 3 Approval Actions
    {
        "id": "TC-14",
        "category": "Approval Action",
        "prompt": "Approve claim via Manager Sarah",
        "role": "mgr_sarah",
        "expected_tool": "decide_approval",
        "custom_run": _tc14_run,
        "check": lambda res: res.get("approval", {}).get("state") == "Approved" and "expected_payment_date" in res.get("result", {})
    },
    {
        "id": "TC-15",
        "category": "Approval Action",
        "prompt": "Unauthorized employee tries to decide approval",
        "role": "emp_john",
        "expected_tool": "decide_approval",
        "custom_run": _unauthorized_approval_test,
        "check": lambda res: res == "BLOCKED_403"
    },
    {
        "id": "TC-16",
        "category": "Approval Action",
        "prompt": "Finance decides secondary high-value claim approval",
        "role": "fin_alex",
        "expected_tool": "decide_approval",
        "custom_run": _tc16_run,
        "check": lambda res: res.get("approval", {}).get("state") == "Approved"
    },

    # 3 Reminder Actions
    {
        "id": "TC-17",
        "category": "Reminder Action",
        "prompt": "Send reminder for approval APP-3002",
        "role": "mgr_sarah",
        "expected_tool": "send_reminder",
        "custom_run": _tc17_run,
        "check": lambda res: res.get("success") is True and res.get("reminders_sent", 0) >= 1
    },
    {
        "id": "TC-18",
        "category": "Reminder Action",
        "prompt": "Immediate retry triggers 10-minute cooldown",
        "role": "mgr_sarah",
        "expected_tool": "send_reminder",
        "custom_run": _cooldown_reminder_test,
        "check": lambda res: res == "COOLDOWN_429"
    },
    {
        "id": "TC-19",
        "category": "Reminder Action",
        "prompt": "Automated SLA scan for overdue approvals (> 2 days)",
        "role": "system",
        "expected_tool": "check_reminders",
        "custom_run": _tc19_run,
        "check": lambda res: res.get("reminders_dispatched", 0) >= 1
    },

    # 2 Escalation Actions
    {
        "id": "TC-20",
        "category": "Escalation Action",
        "prompt": "Auto-created duplicate invoice escalation ESC-4001",
        "role": "system",
        "expected_tool": "rule_duplicate",
        "custom_run": _tc20_run,
        "check": lambda res: res is not None and res.get("reason") == "duplicate" and res.get("severity") == "high"
    },
    {
        "id": "TC-21",
        "category": "Escalation Action",
        "prompt": "Finance Controller Alex resolves escalation",
        "role": "fin_alex",
        "expected_tool": "resolve_escalation",
        "custom_run": _tc21_run,
        "check": lambda res: res.get("status") == "Resolved"
    },

    # 2 Hinglish Queries
    {
        "id": "TC-22",
        "category": "Hinglish Query",
        "prompt": "Mera claim CLM-1042 approve hua kya?",
        "role": "emp_john",
        "expected_tool": "claim_status",
        "check": lambda res: res.get("tool_called") == "claim_status" and "CLM-1042" in res.get("reply", "")
    },
    {
        "id": "TC-23",
        "category": "Hinglish Query",
        "prompt": "Policy me meals limit kitna hai L2 ke liye?",
        "role": "emp_john",
        "expected_tool": "policy_qa",
        "check": lambda res: any(c["section_id"] == "SEC-102" for c in res.get("citations", [])) and "800" in res.get("reply", "")
    },

    # 2 Out of Scope Queries
    {
        "id": "TC-24",
        "category": "Out-of-Scope",
        "prompt": "Tell me a funny joke about office pizza parties",
        "role": "emp_john",
        "expected_tool": "None",
        "check": lambda res: res.get("tool_called") is None and "Expense Pilot" in res.get("reply", "")
    },
    {
        "id": "TC-25",
        "category": "Out-of-Scope",
        "prompt": "What is the weather in Mumbai tomorrow?",
        "role": "emp_john",
        "expected_tool": "None",
        "check": lambda res: res.get("tool_called") is None and "Expense Pilot" in res.get("reply", "")
    }
]


async def main():
    print("================================================================================")
    print("MERIDIAN EXPENSE PILOT — 25 PROMPT VERIFICATION RUNNER")
    print("DEV-C04: Meridian, Finance and Procurement")
    print("================================================================================\n")

    await init_db()
    db = get_database()
    await seed_enterprise_data(db)

    results = []
    passed_count = 0

    for tc in TEST_CASES:
        t_id = tc["id"]
        prompt = tc["prompt"]
        role = tc["role"]
        exp_tool = tc["expected_tool"]

        try:
            if "custom_run" in tc:
                out = await tc["custom_run"](db)
            else:
                out = await process_agent_message(db, user_id=role, message=prompt)

            is_pass = tc["check"](out)
            if is_pass:
                status = "PASS"
                passed_count += 1
            else:
                status = "FAIL"
        except Exception as e:
            status = f"ERROR ({e})"
            out = None

        results.append({
            "id": t_id,
            "category": tc["category"],
            "prompt": prompt[:40] + ("..." if len(prompt) > 40 else ""),
            "role": role,
            "tool": exp_tool,
            "status": status
        })

    # Print markdown table
    print("| Test ID | Category | Prompt / Action | Role | Tool | Result |")
    print("|:---|:---|:---|:---|:---|:---:|")
    for r in results:
        badge = "✅ PASS" if r["status"] == "PASS" else f"❌ {r['status']}"
        print(f"| {r['id']} | {r['category']} | {r['prompt']} | `{r['role']}` | `{r['tool']}` | {badge} |")

    print("\n" + "=" * 80)
    print(f"EXECUTION SUMMARY: {passed_count} / {len(TEST_CASES)} PASSED ({(passed_count/len(TEST_CASES))*100:.1f}%)")
    print("=" * 80 + "\n")

    if passed_count != len(TEST_CASES):
        exit(1)

if __name__ == "__main__":
    asyncio.run(main())
