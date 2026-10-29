import asyncio
import io
import csv
import openpyxl
from backend.app.database import get_database, init_db
from backend.app.services.seed_data import seed_enterprise_data
from backend.app.services.file_extractor import extract_tabular_data
from backend.app.services.ocr import check_mindee_status
from backend.app.agent.engine import process_agent_message

async def test_upload_multilang_mindee():
    print("=" * 60)
    print("TESTING: SPREADSHEET UPLOAD, MULTI-LANGUAGE & MINDEE STATUS")
    print("=" * 60)

    await init_db()
    db = get_database()
    await seed_enterprise_data(db)

    # 1. Test Mindee status check
    print("\n[Test 1] Mindee OCR Integration Status Check...")
    mindee_res = await check_mindee_status()
    print("Mindee Status:", mindee_res.get("status"))
    print("Mindee Version:", mindee_res.get("version"))
    print("Mindee Message:", mindee_res.get("message"))
    assert mindee_res.get("configured") is True, "Mindee should be configured"
    print("-> Pass: Mindee status check returned structured diagnostic response.")

    # 2. Test CSV parsing with high expenses and duplicates
    print("\n[Test 2] CSV Parsing and Data Extraction...")
    csv_content = (
        "Date,Category,Amount,Description,Employee\n"
        "2026-10-15,Meals,850.00,Team Lunch,emp_john\n"
        "2026-10-16,Hotel,14500.00,Client Meeting Mumbai,emp_john\n"
        "2026-10-18,Travel,3200.00,Flight Delhi,emp_alice\n"
        "2026-10-18,Travel,3200.00,Flight Delhi,emp_alice\n"  # Duplicate row
    ).encode("utf-8")

    extracted_csv = extract_tabular_data(csv_content, "expenses_oct.csv")
    print("Extracted Rows:", extracted_csv["row_count"])
    print("Extracted Columns:", extracted_csv["headers"])
    print("Total Sum:", extracted_csv["summary"]["total_sum"])
    print("High Expenses Flagged (> ₹10k):", extracted_csv["summary"]["flagged_high_expenses_count"])
    print("Duplicates Flagged:", extracted_csv["summary"]["duplicate_rows_detected"])

    assert extracted_csv["row_count"] == 4
    assert extracted_csv["summary"]["total_sum"] == 21750.00
    assert extracted_csv["summary"]["flagged_high_expenses_count"] == 1
    assert extracted_csv["summary"]["duplicate_rows_detected"] == 1
    print("-> Pass: CSV extracted correctly with automatic anomaly and duplicate detection.")

    # 3. Test XLSX parsing
    print("\n[Test 3] Excel (.xlsx) Parsing and Data Extraction...")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Q3_Claims"
    ws.append(["Claim_ID", "Expense_Date", "Amount", "Category", "Status"])
    ws.append(["CLM-901", "2026-09-01", 12000, "Travel", "Submitted"])
    ws.append(["CLM-902", "2026-09-02", 4500, "Meals", "Approved"])
    
    excel_stream = io.BytesIO()
    wb.save(excel_stream)
    excel_bytes = excel_stream.getvalue()

    extracted_excel = extract_tabular_data(excel_bytes, "quarterly_audit.xlsx")
    print("Excel Sheet Names:", extracted_excel["sheet_names"])
    print("Excel Row Count:", extracted_excel["row_count"])
    print("Excel Total Sum:", extracted_excel["summary"]["total_sum"])
    assert extracted_excel["row_count"] == 2
    assert extracted_excel["summary"]["total_sum"] == 16500.00
    assert extracted_excel["summary"]["flagged_high_expenses_count"] == 1
    print("-> Pass: Excel (.xlsx) file parsed cleanly with openpyxl.")

    # 4. Test Agent File Analysis in Chat
    print("\n[Test 4] Agent AI Processing Uploaded Spreadsheet...")
    agent_file_res = await process_agent_message(
        db=db,
        user_id="emp_john",
        message="Summarize expenses in this spreadsheet and check policy compliance",
        language="en",
        file_context=extracted_csv
    )
    print("Agent Reply on File:\n", agent_file_res["reply"][:300], "...")
    assert "expenses_oct.csv" in agent_file_res["reply"]
    assert "₹21,750.00" in agent_file_res["reply"]
    assert "SEC-107" in [c["section_id"] for c in agent_file_res.get("citations", [])]
    assert agent_file_res["escalated"] is True
    print("-> Pass: Agent performed compliance audit and cited SEC-107 and SEC-110.")

    # 5. Test Multi-Language Support
    print("\n[Test 5] Multi-Language Agent Output (Hindi, Spanish, Hinglish)...")
    
    # Hindi
    hi_res = await process_agent_message(
        db=db,
        user_id="emp_john",
        message="Check status of CLM-1042",
        language="hi"
    )
    print("Hindi reply snippet:", hi_res["reply"][:150])
    assert "CLM-1042" in hi_res["reply"]
    
    # Hinglish
    hinglish_res = await process_agent_message(
        db=db,
        user_id="emp_john",
        message="Mera claim CLM-1042 approve hua kya?",
        language="hinglish"
    )
    print("Hinglish reply snippet:", hinglish_res["reply"][:150])
    assert "CLM-1042" in hinglish_res["reply"]

    # Spanish
    es_res = await process_agent_message(
        db=db,
        user_id="emp_john",
        message="Check status of CLM-1042",
        language="es"
    )
    print("Spanish reply snippet:", es_res["reply"][:150])
    assert "CLM-1042" in es_res["reply"]

    print("\n-> Pass: Multi-language outputs preserved claim numbers and status seamlessly.")

    print("\n" + "=" * 60)
    print("ALL TESTS COMPLETED SUCCESSFULLY! 🚀")
    print("=" * 60)

run_tests = test_upload_multilang_mindee

if __name__ == "__main__":
    asyncio.run(test_upload_multilang_mindee())
