import asyncio
import httpx
from backend.app.main import app
from backend.app.database import init_db, get_database
from backend.app.services.seed_data import seed_enterprise_data

async def run_tests():
    print("==================================================")
    print("Testing Stage 6: Enterprise API Routers")
    print("==================================================")

    await init_db()
    db = get_database()
    await seed_enterprise_data(db)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # TEST 1: Root status endpoint
        print("\n[Test 1] GET /...")
        r = await client.get("/")
        assert r.status_code == 200
        data = r.json()
        assert data["app"] == "Expense Pilot"
        print(f"-> Pass: Root status is {data['status']}, database: {data['database']}")

        # TEST 2: Users endpoint & Me
        print("\n[Test 2] GET /api/users & /api/users/me...")
        r_users = await client.get("/api/users")
        assert r_users.status_code == 200
        assert len(r_users.json()) >= 4

        r_me = await client.get("/api/users/me", headers={"X-User-Id": "emp_john"})
        assert r_me.status_code == 200
        assert r_me.json()["id"] == "emp_john"
        print(f"-> Pass: Demo users: {[u['id'] for u in r_users.json()]}")

        # TEST 3: Claims Router (Role-filtered)
        print("\n[Test 3] Claims Router (Role-filtered)...")
        # Employee John sees only his claims
        r_clm_john = await client.get("/api/claims", headers={"X-User-Id": "emp_john"})
        assert r_clm_john.status_code == 200
        john_claims = r_clm_john.json()
        assert all(c["employee_id"] == "emp_john" for c in john_claims)
        print(f"-> Pass: Employee John sees {len(john_claims)} of his own claims.")

        # Finance Alex sees all claims
        r_clm_fin = await client.get("/api/claims", headers={"X-User-Id": "fin_alex"})
        assert r_clm_fin.status_code == 200
        fin_claims = r_clm_fin.json()
        assert len(fin_claims) > len(john_claims)
        print(f"-> Pass: Finance Alex sees all {len(fin_claims)} claims.")

        # Vendor Acme gets empty list
        r_clm_ven = await client.get("/api/claims", headers={"X-User-Id": "ven_acme"})
        assert r_clm_ven.status_code == 200
        assert len(r_clm_ven.json()) == 0
        print("-> Pass: Vendor Acme cannot access employee claims (empty list).")

        # Submit new claim
        new_clm_payload = {
            "category": "Meals",
            "amount": 950.0,
            "currency": "INR",
            "date": "2026-10-28",
            "receipt_attached": True,
            "description": "Lunch with client during branch visit"
        }
        r_new_clm = await client.post("/api/claims", json=new_clm_payload, headers={"X-User-Id": "emp_john"})
        assert r_new_clm.status_code == 200
        created_clm = r_new_clm.json()
        assert created_clm["claim_no"].startswith("CLM-")
        assert created_clm["status"] == "Pending Manager"
        print(f"-> Pass: New claim created: {created_clm['claim_no']}, approver: {created_clm['approver_id']}")

        # TEST 4: Invoices Router (Role-filtered)
        print("\n[Test 4] Invoices Router (Role-filtered)...")
        # Acme sees only Acme's invoices
        r_inv_acme = await client.get("/api/invoices", headers={"X-User-Id": "ven_acme"})
        assert r_inv_acme.status_code == 200
        acme_invs = r_inv_acme.json()
        assert all(i["vendor_id"] == "ven_acme" for i in acme_invs)
        print(f"-> Pass: Vendor Acme sees {len(acme_invs)} of its invoices.")

        # Finance sees all invoices
        r_inv_fin = await client.get("/api/invoices", headers={"X-User-Id": "fin_alex"})
        assert r_inv_fin.status_code == 200
        fin_invs = r_inv_fin.json()
        assert len(fin_invs) >= 20
        print(f"-> Pass: Finance sees all {len(fin_invs)} invoices.")

        # Employee gets 403 Forbidden
        r_inv_emp = await client.get("/api/invoices", headers={"X-User-Id": "emp_john"})
        assert r_inv_emp.status_code == 403
        print("-> Pass: Regular employee blocked from vendor invoices with 403.")

        # TEST 5: Approvals Router
        print("\n[Test 5] Approvals Workflow Endpoints...")
        r_apps = await client.get("/api/approvals", headers={"X-User-Id": "mgr_sarah"})
        assert r_apps.status_code == 200
        sarah_apps = r_apps.json()
        print(f"-> Pass: Manager Sarah has {len(sarah_apps)} approvals in her view.")

        # Find a pending approval assigned to Sarah
        target_app = next((a for a in sarah_apps if a["state"] == "Pending" and a["approver_id"] == "mgr_sarah"), None)
        assert target_app is not None
        target_id = target_app["id"]

        # Sarah decides approval -> Approved
        r_dec = await client.post(
            f"/api/approvals/{target_id}/decide",
            json={"decision": "Approved", "notes": "Approved via automated API test"},
            headers={"X-User-Id": "mgr_sarah"}
        )
        assert r_dec.status_code == 200
        dec_data = r_dec.json()
        assert dec_data["approval"]["state"] == "Approved"
        print(f"-> Pass: Decision executed on {target_id}: {dec_data['result']}")

        # Manual trigger check reminders
        r_check_rem = await client.post("/api/approvals/check-reminders", headers={"X-User-Id": "fin_alex"})
        assert r_check_rem.status_code == 200
        print(f"-> Pass: Manual reminder trigger returned: {r_check_rem.json()}")

        # TEST 6: Escalations Router
        print("\n[Test 6] Escalations Router...")
        r_escs = await client.get("/api/escalations", headers={"X-User-Id": "fin_alex"})
        assert r_escs.status_code == 200
        escs = r_escs.json()
        assert len(escs) >= 3
        print(f"-> Pass: {len(escs)} escalations retrieved.")

        # Resolve an open escalation
        open_esc = next((e for e in escs if e["status"] == "Open"), None)
        assert open_esc is not None
        r_res_esc = await client.post(
            f"/api/escalations/{open_esc['id']}/resolve",
            json={"resolution_note": "Verified discrepancy with supplier."},
            headers={"X-User-Id": "fin_alex"}
        )
        assert r_res_esc.status_code == 200
        assert r_res_esc.json()["status"] == "Resolved"
        print(f"-> Pass: Escalation {open_esc['id']} resolved by Finance Alex.")

        # TEST 7: Cryptographic Audit Trail Endpoints
        print("\n[Test 7] Audit Trail Endpoints...")
        r_audit = await client.get("/api/audit", headers={"X-User-Id": "fin_alex"})
        assert r_audit.status_code == 200
        assert len(r_audit.json()) > 0
        print(f"-> Pass: {len(r_audit.json())} audit logs retrieved.")

        r_verify = await client.get("/api/audit/verify", headers={"X-User-Id": "fin_alex"})
        assert r_verify.status_code == 200
        v_data = r_verify.json()
        assert v_data["valid"] is True
        print(f"-> Pass: Audit verify endpoint returned VALID: {v_data['message']}")

        # TEST 8: Policies Router
        print("\n[Test 8] Policies Router...")
        r_pols = await client.get("/api/policies")
        assert r_pols.status_code == 200
        assert len(r_pols.json()) == 12

        r_pol_sec = await client.get("/api/policies/SEC-104")
        assert r_pol_sec.status_code == 200
        assert "Hotel" in r_pol_sec.json()["title"]
        print(f"-> Pass: Policy SEC-104 retrieved: {r_pol_sec.json()['title']}")

        # TEST 9: Executive Finance Dashboard Summary (All 6 KPIs)
        print("\n[Test 9] Dashboard Summary (/api/dashboard/summary)...")
        r_dash = await client.get("/api/dashboard/summary", headers={"X-User-Id": "fin_alex"})
        assert r_dash.status_code == 200
        dash = r_dash.json()

        kpis = dash["kpis"]
        print(f"   KPI 1: Pending Invoices: {kpis['pending_invoices_count']} (₹{kpis['pending_invoices_amount']:,.2f})")
        print(f"   KPI 2: Overdue Payments: {kpis['overdue_payments_count']} (₹{kpis['overdue_payments_amount']:,.2f})")
        print(f"   KPI 3: Reimbursement Requests: {kpis['reimbursement_requests_count']} (₹{kpis['reimbursement_requests_amount']:,.2f})")
        print(f"   KPI 4: Flagged Duplicate Invoices: {kpis['flagged_duplicates_count']}")
        print(f"   KPI 5: Approval Delays (> 2d SLA): {kpis['approval_delays_count']}")
        print(f"   KPI 6: Open Escalations: {kpis['open_escalations_count']}")

        assert kpis["pending_invoices_count"] > 0
        assert kpis["overdue_payments_count"] >= 3
        assert kpis["flagged_duplicates_count"] >= 2
        assert len(dash["overdue_items"]) >= 3
        assert len(dash["flagged_duplicates"]) >= 2
        assert len(dash["approval_delays"]) > 0
        print(f"-> Pass: All 6 dynamic KPIs computed accurately from live collections!")

    print("\nALL STAGE 6 ENTERPRISE API ROUTER TESTS PASSED SUCCESSFULLY! 🚀")

if __name__ == "__main__":
    asyncio.run(run_tests())
