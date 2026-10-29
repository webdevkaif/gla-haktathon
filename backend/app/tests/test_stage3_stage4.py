import asyncio
from datetime import datetime, timedelta
from backend.app.database import init_db, get_database
from backend.app.services.seed_data import seed_enterprise_data
from backend.app.services.audit import write_audit, verify_chain, get_audit_logs, compute_audit_hash
from backend.app.services.workflow import (
    decide_approval, send_approval_reminder, check_and_send_due_reminders,
    calculate_next_reimbursement_friday
)
from backend.app.services.escalation import create_escalation, resolve_escalation, get_escalations
from fastapi import HTTPException

async def test_stage3_stage4():
    print("==================================================")
    print("Testing Stage 3 (Workflow & Escalation) & Stage 4 (Audit Trail)")
    print("==================================================")

    await init_db()
    db = get_database()
    counts = await seed_enterprise_data(db)
    print(f"Seed complete: {counts}")

    # TEST 1: verify_chain on freshly seeded database
    print("\n[Test 1] Verify hash chain on freshly seeded database...")
    res = await verify_chain(db)
    assert res["valid"] is True, f"Fresh chain was not valid: {res}"
    print(f"-> Pass: Chain is valid with {res['total']} blocks intact.")

    # TEST 2: write_audit appends properly chained records
    print("\n[Test 2] Write new audit entry and verify chain...")
    new_entry = await write_audit(
        db=db,
        actor_id="emp_john",
        actor_role="employee",
        action="TEST_ACTION",
        entity_type="test",
        entity_id="TST-001",
        input_data={"foo": "bar"},
        result={"status": "ok"}
    )
    assert new_entry["id"].startswith("AUD-")
    res2 = await verify_chain(db)
    assert res2["valid"] is True
    assert res2["total"] == res["total"] + 1
    print(f"-> Pass: New entry {new_entry['id']} appended. Chain now has {res2['total']} valid blocks.")

    # TEST 3: Tampering detection
    print("\n[Test 3] Tampering detection...")
    target_entry = await db.audit_log.find_one({"action": "POLICY_SEED"})
    assert target_entry is not None
    original_action = target_entry["action"]

    # Artificially tamper with the record in DB
    await db.audit_log.update_one({"_id": target_entry["_id"]}, {"$set": {"action": "TAMPERED_ACTION"}})
    tampered_res = await verify_chain(db)
    assert tampered_res["valid"] is False, "Tampered chain falsely verified as valid!"
    assert tampered_res["broken_at"] == target_entry["id"]
    print(f"-> Pass: Tampering correctly detected at {tampered_res['broken_at']}! Message: {tampered_res['message']}")

    # Restore record
    await db.audit_log.update_one({"_id": target_entry["_id"]}, {"$set": {"action": original_action}})
    restored_res = await verify_chain(db)
    assert restored_res["valid"] is True
    print("-> Pass: Restored record verified as valid.")

    # TEST 4: Approver Authority Check (Unauthorized approval decision)
    print("\n[Test 4] Approver Authority Check (Unauthorized access)...")
    pending_app = await db.approvals.find_one({"state": "Pending", "approver_id": "mgr_sarah"})
    assert pending_app is not None
    app_id = pending_app["id"]

    # John Doe (Employee) tries to decide Sarah's approval -> must be rejected with 403
    unauthorized_user = {"id": "emp_john", "user_id": "emp_john", "role": "employee"}
    try:
        await decide_approval(db, approval_id=app_id, user=unauthorized_user, decision="Approved")
        assert False, "Unauthorized user should not be able to decide approval!"
    except HTTPException as e:
        assert e.status_code == 403
        print(f"-> Pass: Unauthorized user blocked with HTTP 403: {e.detail}")

    # TEST 5: Authorized Manager Decision on Claim
    print("\n[Test 5] Authorized Manager Approval...")
    manager_user = {"id": "mgr_sarah", "user_id": "mgr_sarah", "role": "manager"}
    decision_res = await decide_approval(db, approval_id=app_id, user=manager_user, decision="Approved", notes="Approved via unit test")
    assert decision_res["approval"]["state"] == "Approved"
    print(f"-> Pass: Approved by manager! Result: {decision_res['result']}")

    # TEST 6: Secondary Approval routing for claims > ₹10,000
    print("\n[Test 6] Secondary Approval for high-value claim...")
    # Create or update a test claim with amount > ₹10,000
    high_claim_no = "CLM-TEST-HIGH-100"
    await db.claims.delete_one({"claim_no": high_claim_no})
    await db.claims.insert_one({
        "id": high_claim_no,
        "claim_no": high_claim_no,
        "employee_id": "emp_john",
        "category": "Travel",
        "amount": 15000.0,
        "currency": "INR",
        "status": "Pending Manager",
        "approver_id": "mgr_sarah",
        "created_at": datetime.utcnow()
    })
    # Create a fresh pending approval for Sarah
    test_high_app = {
        "id": "APP-TEST-HIGH",
        "approval_id": "APP-TEST-HIGH",
        "entity_type": "claim",
        "entity_id": high_claim_no,
        "approver_id": "mgr_sarah",
        "state": "Pending",
        "created_at": datetime.utcnow(),
        "due_at": datetime.utcnow() + timedelta(days=2),
        "reminders_sent": 0
    }
    await db.approvals.insert_one(test_high_app)

    # Manager approves high claim -> must route to Pending Finance with secondary approval
    high_dec = await decide_approval(db, approval_id="APP-TEST-HIGH", user=manager_user, decision="Approved")
    assert high_dec["result"]["claim_status"] == "Pending Finance"
    sec_app_id = high_dec["result"]["secondary_approval_id"]
    sec_app = await db.approvals.find_one({"id": sec_app_id})
    assert sec_app is not None
    assert sec_app["approver_id"] == "fin_alex"
    print(f"-> Pass: Claim routed to Pending Finance. Secondary approval created: {sec_app_id}")

    # Finance Controller Alex approves secondary approval
    finance_user = {"id": "fin_alex", "user_id": "fin_alex", "role": "finance"}
    fin_dec = await decide_approval(db, approval_id=sec_app_id, user=finance_user, decision="Approved")
    assert fin_dec["result"]["claim_status"] == "Approved"
    assert "expected_payment_date" in fin_dec["result"]
    print(f"-> Pass: Finance approved! Scheduled payment date: {fin_dec['result']['expected_payment_date']}")

    # TEST 7: Reminder Dispatch and Cooldown
    print("\n[Test 7] Reminder dispatch and cooldown...")
    # Pick a pending approval
    pending_for_reminder = await db.approvals.find_one({"state": "Pending"})
    assert pending_for_reminder is not None
    rem_app_id = pending_for_reminder["id"]

    rem_res1 = await send_approval_reminder(db, approval_id=rem_app_id, user=finance_user, force=True)
    assert rem_res1["success"] is True
    assert rem_res1["reminders_sent"] >= 1
    print(f"-> Pass: First reminder dispatched: {rem_res1['message']}")

    # Attempt to send again immediately without force -> must trigger 429
    try:
        await send_approval_reminder(db, approval_id=rem_app_id, user=finance_user, force=False)
        assert False, "Should have triggered rate limit 429"
    except HTTPException as e:
        assert e.status_code == 429
        print(f"-> Pass: Cooldown enforced: {e.detail}")

    # TEST 8: Automated due reminder check
    print("\n[Test 8] Automated due reminder check...")
    auto_rem_res = await check_and_send_due_reminders(db)
    print(f"-> Pass: Automated reminder scan complete: {auto_rem_res}")

    # TEST 9: Escalation creation and resolution
    print("\n[Test 9] Escalation service...")
    new_esc = await create_escalation(
        db=db,
        entity_type="invoice",
        entity_id="INV-TEST-999",
        reason="discrepancy",
        summary="Test escalation for Stage 3 validation",
        severity="high"
    )
    assert new_esc["id"].startswith("ESC-")
    print(f"-> Pass: Escalation created: {new_esc['id']}")

    # Employee tries to resolve -> 403 Forbidden
    try:
        await resolve_escalation(db, escalation_id=new_esc["id"], actor_id="emp_john", actor_role="employee")
        assert False, "Employee should not be allowed to resolve escalation"
    except HTTPException as e:
        assert e.status_code == 403
        print(f"-> Pass: Employee resolve blocked with 403: {e.detail}")

    # Finance resolves -> Success
    res_esc = await resolve_escalation(
        db,
        escalation_id=new_esc["id"],
        actor_id="fin_alex",
        actor_role="finance",
        resolution_note="Verified with vendor and corrected."
    )
    assert res_esc["status"] == "Resolved"
    print(f"-> Pass: Escalation resolved by finance: {res_esc['status']}")

    # Final verify chain check
    final_chain = await verify_chain(db)
    assert final_chain["valid"] is True
    print(f"\nFinal Audit Chain Integrity: VALID ({final_chain['total']} blocks intact)")
    print("\nALL STAGE 3 & STAGE 4 TESTS PASSED SUCCESSFULLY! 🚀")

run_tests = test_stage3_stage4

if __name__ == "__main__":
    asyncio.run(test_stage3_stage4())
