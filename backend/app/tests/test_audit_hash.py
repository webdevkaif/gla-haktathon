import asyncio
import pytest
from backend.app.database import init_db, get_database
from backend.app.services.seed_data import seed_enterprise_data
from backend.app.services.audit import write_audit, verify_chain, compute_audit_hash

@pytest.fixture(autouse=True)
async def setup_test_db():
    await init_db()
    db = get_database()
    # Reset collections
    await db.audit_log.delete_many({})
    yield db

@pytest.mark.asyncio
async def test_audit_hash_canonical_json(setup_test_db):
    """Verifies that compute_audit_hash is deterministic regardless of key order."""
    db = setup_test_db
    entry_1 = {
        "ts": "2026-10-29T12:00:00Z",
        "actor_id": "emp_john",
        "actor_role": "employee",
        "action": "SUBMIT_CLAIM",
        "entity_type": "claim",
        "entity_id": "CLM-001",
        "rule_id": "POLICY_LIMIT",
        "input_data": {"amount": 2500, "category": "Meals"},
        "result": {"status": "FLAGGED", "severity": "medium"},
        "status": "SUCCESS"
    }
    entry_2 = {
        "status": "SUCCESS",
        "result": {"severity": "medium", "status": "FLAGGED"},
        "input_data": {"category": "Meals", "amount": 2500},
        "rule_id": "POLICY_LIMIT",
        "entity_id": "CLM-001",
        "entity_type": "claim",
        "action": "SUBMIT_CLAIM",
        "actor_role": "employee",
        "actor_id": "emp_john",
        "ts": "2026-10-29T12:00:00Z"
    }
    prev_hash = "0" * 64
    hash1 = compute_audit_hash(prev_hash, entry_1)
    hash2 = compute_audit_hash(prev_hash, entry_2)
    assert hash1 == hash2, "Canonical JSON hashing must be invariant to dict key ordering"

@pytest.mark.asyncio
async def test_audit_concurrent_writes(setup_test_db):
    """Verifies that write_audit is safe against concurrent writes via asyncio.Lock."""
    db = setup_test_db

    # Launch 20 concurrent write_audit operations
    async def write_entry(i):
        return await write_audit(
            db=db,
            actor_id=f"user_{i}",
            actor_role="employee",
            action="CONCURRENT_ACTION",
            entity_type="invoice",
            entity_id=f"INV-{i:03d}",
            input_data={"seq": i, "data": f"payload_{i}"},
            rule_id="RULE_TEST",
            result={"status": "processed", "index": i}
        )

    tasks = [write_entry(i) for i in range(20)]
    results = await asyncio.gather(*tasks)
    assert len(results) == 20

    # Verify the entire chain is valid and unbroken
    chain_res = await verify_chain(db)
    assert chain_res["valid"] is True, f"Chain should be valid after concurrent writes: {chain_res}"
    assert chain_res["total"] == 20

@pytest.mark.asyncio
async def test_tamper_detection_middle_entry_result(setup_test_db):
    """Tampering with 'result' in a middle entry must cause verify_chain to return invalid."""
    db = setup_test_db
    for i in range(5):
        await write_audit(
            db=db,
            actor_id=f"emp_{i}",
            actor_role="employee",
            action="ACTION_X",
            entity_type="claim",
            entity_id=f"CLM-{i}",
            input_data={"idx": i},
            rule_id="R_ORIGINAL",
            result={"approved": True, "amount": 100 * (i + 1)}
        )

    # Initial check: chain valid
    assert (await verify_chain(db))["valid"] is True

    # Tamper with entry at index 2 (middle entry): alter result
    logs = await db.audit_log.find().sort([("_id", 1)]).to_list(10)
    target_id = logs[2]["_id"]
    await db.audit_log.update_one(
        {"_id": target_id},
        {"$set": {"result.amount": 999999}}
    )

    tampered_res = await verify_chain(db)
    assert tampered_res["valid"] is False
    assert tampered_res["broken_at_index"] == 2

@pytest.mark.asyncio
async def test_tamper_detection_middle_entry_input_data(setup_test_db):
    """Tampering with 'input_data' in a middle entry must cause verify_chain to return invalid."""
    db = setup_test_db
    for i in range(5):
        await write_audit(
            db=db,
            actor_id=f"emp_{i}",
            actor_role="employee",
            action="ACTION_Y",
            entity_type="claim",
            entity_id=f"CLM-{i}",
            input_data={"idx": i, "claimed_amount": 500},
            rule_id="R_TEST",
            result={"status": "ok"}
        )

    logs = await db.audit_log.find().sort([("_id", 1)]).to_list(10)
    target_id = logs[2]["_id"]
    await db.audit_log.update_one(
        {"_id": target_id},
        {"$set": {"input_data.claimed_amount": 15000}}
    )

    tampered_res = await verify_chain(db)
    assert tampered_res["valid"] is False
    assert tampered_res["broken_at_index"] == 2

@pytest.mark.asyncio
async def test_tamper_detection_middle_entry_rule_id(setup_test_db):
    """Tampering with 'rule_id' in a middle entry must cause verify_chain to return invalid."""
    db = setup_test_db
    for i in range(5):
        await write_audit(
            db=db,
            actor_id=f"emp_{i}",
            actor_role="employee",
            action="ACTION_Z",
            entity_type="claim",
            entity_id=f"CLM-{i}",
            input_data={"idx": i},
            rule_id="RULE_A",
            result={"status": "ok"}
        )

    logs = await db.audit_log.find().sort([("_id", 1)]).to_list(10)
    target_id = logs[2]["_id"]
    await db.audit_log.update_one(
        {"_id": target_id},
        {"$set": {"rule_id": "TAMPERED_RULE_B"}}
    )

    tampered_res = await verify_chain(db)
    assert tampered_res["valid"] is False
    assert tampered_res["broken_at_index"] == 2

@pytest.mark.asyncio
async def test_tamper_detection_middle_entry_actor_role(setup_test_db):
    """Tampering with 'actor_role' in a middle entry must cause verify_chain to return invalid."""
    db = setup_test_db
    for i in range(5):
        await write_audit(
            db=db,
            actor_id=f"emp_{i}",
            actor_role="employee",
            action="ACTION_W",
            entity_type="claim",
            entity_id=f"CLM-{i}",
            input_data={"idx": i},
            rule_id="RULE_A",
            result={"status": "ok"}
        )

    logs = await db.audit_log.find().sort([("_id", 1)]).to_list(10)
    target_id = logs[2]["_id"]
    await db.audit_log.update_one(
        {"_id": target_id},
        {"$set": {"actor_role": "admin"}}
    )

    tampered_res = await verify_chain(db)
    assert tampered_res["valid"] is False
    assert tampered_res["broken_at_index"] == 2
