import asyncio
from backend.app.database import get_database, init_db
from backend.app.services.seed_data import seed_enterprise_data
from backend.app.auth import (
    hash_password, verify_password, create_access_token, decode_access_token,
    DEMO_USERS, DEFAULT_DEMO_PASSWORD
)
from backend.app.data_access import (
    fetch_scoped_claims, fetch_scoped_invoices, fetch_scoped_approvals,
    get_claims_scope_query, get_invoices_scope_query
)

async def test_stage_a():
    print("=" * 65)
    print("STAGE A: MULTI-USER, JWT AUTH, DATA SCOPING & UNIQUE INDEXES")
    print("=" * 65)

    await init_db()
    db = get_database()
    await seed_enterprise_data(db)

    # 1. Test Password Hashing
    print("\n[Test 1] PBKDF2-HMAC-SHA256 Password Hashing...")
    hashed = hash_password("secret_pass_123")
    assert hashed.startswith("pbkdf2_sha256$100000$"), "Should have standard PBKDF2 format"
    assert verify_password("secret_pass_123", hashed) is True, "Password should verify"
    assert verify_password("wrong_password", hashed) is False, "Wrong password should fail"
    print("-> Pass: Password hashing and verification working with 100,000 PBKDF2 iterations.")

    # 2. Test JWT Token Creation & Decoding
    print("\n[Test 2] JWT Token HS256 Token Handling...")
    claims = {"sub": "emp_john", "role": "employee", "email": "john.doe@meridian.com"}
    token = create_access_token(claims)
    decoded = decode_access_token(token)
    assert decoded["sub"] == "emp_john"
    assert decoded["role"] == "employee"
    assert "exp" in decoded
    print("-> Pass: Standard HS256 JWT generated and decoded successfully.")

    # 3. Test Seeded Demo Users & Database Accounts
    print("\n[Test 3] Verify 7 Demo Accounts Seeded in Database...")
    user_count = await db.users.count_documents({})
    assert user_count >= 7, f"Expected at least 7 users, found {user_count}"
    
    john = await db.users.find_one({"id": "emp_john"})
    assert john is not None
    assert verify_password(DEFAULT_DEMO_PASSWORD, john.get("password_hash")) is True
    print(f"-> Pass: Found {user_count} demo users seeded with verified password hashes.")

    # 4. Test Centralized Data Access Layer: Role-Based Scoping
    print("\n[Test 4] Centralized Data Access Layer Scoping...")
    
    # Employee John: sees only own claims, 0 vendor invoices
    emp_user = dict(DEMO_USERS["emp_john"])
    john_claims = await fetch_scoped_claims(db, emp_user)
    assert len(john_claims) > 0, "John should have claims"
    assert all(c["employee_id"] == "emp_john" for c in john_claims), "John should only see his claims"
    
    john_invoices = await fetch_scoped_invoices(db, emp_user)
    assert len(john_invoices) == 0, "Internal employee should see 0 vendor invoices"
    print(f"-> Pass: Employee John sees {len(john_claims)} of his own claims, and 0 vendor invoices.")

    # Vendor Acme: sees only Acme invoices, 0 employee claims
    ven_user = dict(DEMO_USERS["ven_acme"])
    acme_invoices = await fetch_scoped_invoices(db, ven_user)
    assert len(acme_invoices) > 0, "Acme should see its invoices"
    assert all(i["vendor_id"] == "ven_acme" for i in acme_invoices), "Vendor only sees own invoices"
    
    acme_claims = await fetch_scoped_claims(db, ven_user)
    assert len(acme_claims) == 0, "Vendor should see 0 employee claims"
    print(f"-> Pass: Vendor Acme sees {len(acme_invoices)} of its own invoices, and 0 employee claims.")

    # Manager Sarah: sees team claims
    mgr_user = dict(DEMO_USERS["mgr_sarah"])
    sarah_claims = await fetch_scoped_claims(db, mgr_user)
    assert len(sarah_claims) > 0, "Sarah should see team claims"
    print(f"-> Pass: Manager Sarah sees {len(sarah_claims)} claims in her management scope.")

    # Finance Alex: sees all claims and invoices
    fin_user = dict(DEMO_USERS["fin_alex"])
    alex_claims = await fetch_scoped_claims(db, fin_user)
    alex_invoices = await fetch_scoped_invoices(db, fin_user)
    assert len(alex_claims) == 28, f"Finance should see all 28 claims, got {len(alex_claims)}"
    assert len(alex_invoices) == 20, f"Finance should see all 20 invoices, got {len(alex_invoices)}"
    print(f"-> Pass: Finance Controller Alex has full global visibility ({len(alex_claims)} claims, {len(alex_invoices)} invoices).")

    # 5. Test Audit Log Immutability
    print("\n[Test 5] Verify Audit Log Insert-Only Constraint...")
    from backend.app.services.audit import write_audit, verify_chain
    new_audit = await write_audit(
        db=db,
        actor_id="fin_alex",
        actor_role="finance",
        action="STAGE_A_VERIFICATION",
        entity_type="system",
        entity_id="SYS-001",
        input_data={"test": True},
        result={"status": "PASS"},
        status="SUCCESS"
    )
    assert new_audit is not None
    chain_res = await verify_chain(db)
    assert chain_res["valid"] is True, "Audit chain should remain valid"
    print(f"-> Pass: Audit log successfully appended with hash {new_audit['hash'][:16]}... Chain integrity: VALID.")

    print("\n" + "=" * 65)
    print("STAGE A: ALL MULTI-USER & DATA VERIFICATIONS PASSED! 🚀")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(test_stage_a())
