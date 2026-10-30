import asyncio
import sys
import importlib

async def run_all():
    print("=================================================================")
    print("EXPENSE PILOT — UNIFIED MASTER VERIFICATION SUITE")
    print("Hackathon Problem Statement DEV-C04 (Meridian Finance & Procurement)")
    print("=================================================================\n")

    suites = [
        ("STAGE 3 & 4: WORKFLOW, ESCALATIONS & CRYPTOGRAPHIC AUDIT TRAIL", "backend.app.tests.test_stage3_stage4"),
        ("STAGE 5: AGENT ENGINE, TOOLS, GUARDRAILS & HINGLISH", "backend.app.tests.test_stage5_agent"),
        ("STAGE 6: ROLE-AWARE ENTERPRISE API ROUTERS & DASHBOARD", "backend.app.tests.test_stage6_routers")
    ]

    passed = 0
    failed = 0

    for title, mod_name in suites:
        print(f"\n>>> EXECUTING SUITE: {title} <<<")
        try:
            mod = importlib.import_module(mod_name)
            await mod.run_tests()
            passed += 1
            print(f"✅ PASSED: {title}\n")
        except Exception as e:
            failed += 1
            print(f"❌ FAILED: {title} -> {e}\n")

    print("=================================================================")
    print(f"TEST EXECUTION SUMMARY: {passed} PASSED | {failed} FAILED")
    print("=================================================================")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_all())

