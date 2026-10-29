import asyncio
from backend.app.database import init_db, get_database
from backend.app.services.seed_data import seed_enterprise_data
from backend.app.agent.engine import process_agent_message, mask_pii, is_out_of_scope

async def test_stage5_agent():
    print("==================================================")
    print("Testing Stage 5: Enterprise Agent Engine, Whitelisted Tools & Guardrails")
    print("==================================================")

    await init_db()
    db = get_database()
    await seed_enterprise_data(db)

    # TEST 1: PII Masking
    print("\n[Test 1] PII Masking Guardrails...")
    raw_text = "Here is my credit card 4532-1234-5678-9010 and my phone +91 98765 43210 and bank account 9876543210123"
    masked, had_pii = mask_pii(raw_text)
    assert had_pii is True
    assert "4532" not in masked
    assert "REDACTED_CARD_NUMBER" in masked
    assert "REDACTED_PHONE_NUMBER" in masked
    assert "REDACTED_ACCOUNT_NUMBER" in masked
    print(f"-> Pass: PII successfully masked: {masked}")

    # TEST 2: Out of Scope Refusal
    print("\n[Test 2] Out of Scope Refusal...")
    assert is_out_of_scope("Tell me a funny joke about birds") is True
    assert is_out_of_scope("What is the weather in Delhi?") is True
    assert is_out_of_scope("What is the hotel allowance under policy?") is False

    res_oos = await process_agent_message(db, user_id="emp_john", message="Tell me a joke about pizza")
    assert "Expense Pilot" in res_oos["reply"]
    assert res_oos["tool_called"] is None
    print(f"-> Pass: Out of scope request politely refused: {res_oos['reply'][:80]}...")

    # TEST 3: Policy Q&A with Strict Citations
    print("\n[Test 3] Policy Q&A with Citations...")
    res_policy = await process_agent_message(db, user_id="emp_john", message="What is the hotel allowance for Grade L2?")
    assert len(res_policy["citations"]) > 0
    assert any(c["section_id"] == "SEC-104" for c in res_policy["citations"])
    assert "3,500" in res_policy["reply"] or "SEC-104" in res_policy["reply"]
    print(f"-> Pass: Policy Q&A returned citations: {[c['section_id'] for c in res_policy['citations']]}")
    print(f"   Excerpt: {res_policy['reply'][:120]}...")

    # TEST 4: Policy Q&A for Unknown Clause (Never Hallucinate without Citation)
    print("\n[Test 4] Policy Q&A with No Match...")
    res_nomatch = await process_agent_message(db, user_id="emp_john", message="Can I claim space rocket fuel reimbursement?")
    assert len(res_nomatch["citations"]) == 0
    assert "no matching section" in res_nomatch["reply"].lower() or "consult" in res_nomatch["reply"].lower()
    print("-> Pass: No hallucinated policy without citations when clause does not exist.")

    # TEST 5: Claim Status (Authorized vs Unauthorized)
    print("\n[Test 5] Claim Status Role Enforcement...")
    # John Doe queries his own claim CLM-1042
    res_john_own = await process_agent_message(db, user_id="emp_john", message="What is the status of CLM-1042?")
    assert res_john_own["tool_called"] == "claim_status"
    assert "CLM-1042" in res_john_own["reply"]
    print(f"-> Pass: Employee allowed to query own claim: {res_john_own['reply'][:80]}...")

    # John Doe tries to query Alice's claim CLM-1022
    res_john_alice = await process_agent_message(db, user_id="emp_john", message="Check status of CLM-1022")
    assert "Access Restricted" in res_john_alice["reply"] or "Access Denied" in res_john_alice["reply"]
    print(f"-> Pass: Employee blocked from querying peer's claim: {res_john_alice['reply'][:80]}...")

    # Vendor Acme tries to query employee claim CLM-1042
    res_vendor_clm = await process_agent_message(db, user_id="ven_acme", message="Status of CLM-1042")
    assert "Access Denied" in res_vendor_clm["reply"]
    print(f"-> Pass: Vendor blocked from querying employee claim: {res_vendor_clm['reply'][:80]}...")

    # TEST 6: Invoice Status Role Enforcement
    print("\n[Test 6] Invoice Status Role Enforcement...")
    # Acme queries its own invoice INV-2004
    res_acme_own = await process_agent_message(db, user_id="ven_acme", message="What is the status of INV-2004?")
    assert res_acme_own["tool_called"] == "invoice_status"
    assert "INV-2004" in res_acme_own["reply"]
    print(f"-> Pass: Vendor allowed to query own invoice: {res_acme_own['reply'][:80]}...")

    # Acme queries TechCorp invoice INV-2013
    res_acme_other = await process_agent_message(db, user_id="ven_acme", message="Status of INV-2013")
    assert "Access Restricted" in res_acme_other["reply"] or "Access Denied" in res_acme_other["reply"]
    print(f"-> Pass: Vendor blocked from querying other vendor's invoice: {res_acme_other['reply'][:80]}...")

    # Employee queries invoice INV-2004
    res_emp_inv = await process_agent_message(db, user_id="emp_john", message="Status of INV-2004")
    assert "Access Denied" in res_emp_inv["reply"]
    print(f"-> Pass: Employee blocked from querying vendor invoice: {res_emp_inv['reply'][:80]}...")

    # TEST 7: Hinglish Support
    print("\n[Test 7] Hinglish Query Support...")
    res_hinglish1 = await process_agent_message(db, user_id="emp_john", message="Mera claim CLM-1042 approve hua kya?")
    assert res_hinglish1["tool_called"] == "claim_status"
    assert "CLM-1042" in res_hinglish1["reply"]
    print(f"-> Pass: Hinglish claim status handled: {res_hinglish1['reply'][:80]}...")

    res_hinglish2 = await process_agent_message(db, user_id="emp_john", message="Policy me meals limit kitna hai L2 ke liye?")
    assert res_hinglish2["tool_called"] == "policy_qa"
    assert any(c["section_id"] == "SEC-102" for c in res_hinglish2["citations"])
    print(f"-> Pass: Hinglish policy query handled with citations: {[c['section_id'] for c in res_hinglish2['citations']]}")

    # TEST 8: Finance Summary Role Enforcement
    print("\n[Test 8] Finance Summary Role Check...")
    # Alex Morgan (Finance) queries executive summary
    res_fin_alex = await process_agent_message(db, user_id="fin_alex", message="Give me the executive finance summary")
    assert res_fin_alex["tool_called"] == "get_finance_summary"
    assert "Meridian Executive Finance Summary" in res_fin_alex["reply"]
    print(f"-> Pass: Finance role granted executive summary: {res_fin_alex['reply'][:100]}...")

    # John Doe (Employee) tries to query executive summary
    res_emp_summary = await process_agent_message(db, user_id="emp_john", message="Give me the executive finance summary")
    assert "Access Denied" in res_emp_summary["reply"]
    print(f"-> Pass: Employee denied executive summary: {res_emp_summary['reply'][:80]}...")

    # TEST 9: Audit Trail Logging for Agent Interactions
    print("\n[Test 9] Audit Trail for Agent Interactions...")
    agent_logs = await db.audit_log.find({"action": "AGENT_QUERY"}).to_list(10)
    assert len(agent_logs) >= 8
    print(f"-> Pass: {len(agent_logs)} agent queries recorded into immutable audit log.")

    from backend.app.services.audit import verify_chain
    chain_check = await verify_chain(db)
    assert chain_check["valid"] is True
    print(f"-> Pass: Cryptographic chain intact across all {chain_check['total']} entries.")

    print("\nALL STAGE 5 AGENT TESTS PASSED SUCCESSFULLY! 🚀")

run_tests = test_stage5_agent

if __name__ == "__main__":
    asyncio.run(test_stage5_agent())
