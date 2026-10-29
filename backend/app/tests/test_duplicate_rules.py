import pytest
from backend.app.services.rules import (
    normalize_invoice_no,
    amounts_match_with_tolerance,
    vendor_matches,
    rule_duplicate_invoice,
    rule_repeated_claim
)

def test_normalize_invoice_numbers():
    """Validates invoice number normalization across various formats."""
    # All these variations should normalize to 'INV2004'
    assert normalize_invoice_no("INV 2004") == "INV2004"
    assert normalize_invoice_no("INV2004") == "INV2004"
    assert normalize_invoice_no("INV-02004") == "INV2004"
    assert normalize_invoice_no("INV 002004") == "INV2004"
    assert normalize_invoice_no("inv-2004") == "INV2004"
    assert normalize_invoice_no("INV_0002004") == "INV2004"
    assert normalize_invoice_no("  inv - # 02004 ") == "INV2004"

    # Multi-digit segment normalization
    assert normalize_invoice_no("ACME-001-0042") == "ACME142"

def test_amounts_match_tolerance():
    """Validates 0.5% tolerance matching."""
    base = 10000.0
    # Exactly within 0.5% tolerance: up to +/- 50.0
    assert amounts_match_with_tolerance(base, 10050.0, tolerance_pct=0.005) is True
    assert amounts_match_with_tolerance(base, 9950.0, tolerance_pct=0.005) is True
    assert amounts_match_with_tolerance(base, 10025.0, tolerance_pct=0.005) is True

    # Exceeding 0.5% tolerance (> 50.0 difference)
    assert amounts_match_with_tolerance(base, 10055.0, tolerance_pct=0.005) is False
    assert amounts_match_with_tolerance(base, 9940.0, tolerance_pct=0.005) is False

def test_fuzzy_vendor_matches():
    """Validates vendor matching via ID equality and fuzzy name similarity."""
    # Exact ID match
    assert vendor_matches("ven_acme", "Acme", "ven_acme", "Different Name") is True
    # Fuzzy name match (similarity >= 0.8)
    assert vendor_matches("", "Acme Supplies Ltd", "", "Acme Supplies Inc") is True
    assert vendor_matches("ven_1", "TechCorp Solutions Pvt Ltd", "ven_2", "TechCorp Solutions") is True
    # Non-matching vendors
    assert vendor_matches("ven_1", "Acme Supplies", "ven_2", "Global Logistics") is False

def test_rule_duplicate_invoice_positive_normalized_no():
    """Case A positive: Same vendor, different invoice string but same normalized number."""
    existing = [
        {"id": "inv_1", "invoice_no": "INV-02004", "vendor_id": "ven_acme", "amount": 50000.0, "invoice_date": "2026-10-15"}
    ]
    new_inv = {
        "id": "inv_2", "invoice_no": "INV 2004", "vendor_id": "ven_acme", "amount": 50000.0, "invoice_date": "2026-10-25"
    }
    result = rule_duplicate_invoice(new_inv, existing)
    assert result["triggered"] is True
    assert result["severity"] == "high"
    assert "INV-02004" in result["reason"]

def test_rule_duplicate_invoice_negative_different_vendor():
    """Negative: Same normalized number but different vendor."""
    existing = [
        {"id": "inv_1", "invoice_no": "INV-2004", "vendor_id": "ven_acme", "amount": 50000.0, "invoice_date": "2026-10-15"}
    ]
    new_inv = {
        "id": "inv_2", "invoice_no": "INV 2004", "vendor_id": "ven_other_vendor", "amount": 50000.0, "invoice_date": "2026-10-15"
    }
    result = rule_duplicate_invoice(new_inv, existing)
    assert result["triggered"] is False

def test_rule_duplicate_invoice_positive_amount_tolerance_and_date_window():
    """Case B positive: Fuzzy vendor, amount within 0.5% tolerance, date within 7 days."""
    existing = [
        {
            "id": "inv_1",
            "invoice_no": "PO-9001",
            "vendor_id": "ven_techcorp",
            "vendor_name": "TechCorp Solutions",
            "amount": 20000.0,
            "invoice_date": "2026-10-10"
        }
    ]
    # Amount 20080 is within 0.5% of 20080/20000 (0.4% delta), date 2026-10-14 is 4 days apart (<= 7)
    new_inv = {
        "id": "inv_2",
        "invoice_no": "TXN-8821",
        "vendor_id": "ven_techcorp",
        "vendor_name": "TechCorp Solutions Ltd",
        "amount": 20080.0,
        "invoice_date": "2026-10-14"
    }
    result = rule_duplicate_invoice(new_inv, existing)
    assert result["triggered"] is True
    assert result["severity"] == "high"

def test_rule_duplicate_invoice_negative_outside_window():
    """Negative: Same vendor and amount, but date is > 7 days apart."""
    existing = [
        {
            "id": "inv_1",
            "invoice_no": "PO-9001",
            "vendor_id": "ven_acme",
            "amount": 10000.0,
            "invoice_date": "2026-10-01"
        }
    ]
    new_inv = {
        "id": "inv_2",
        "invoice_no": "PO-9002",
        "vendor_id": "ven_acme",
        "amount": 10000.0,
        "invoice_date": "2026-10-15"  # 14 days later
    }
    result = rule_duplicate_invoice(new_inv, existing)
    assert result["triggered"] is False

def test_rule_repeated_claim_positive():
    """Positive: Same employee + category + amount within 0.5% + date triggers REPEATED_CLAIM."""
    existing = [
        {
            "id": "clm_1",
            "claim_no": "CLM-101",
            "employee_id": "emp_john",
            "category": "Meals",
            "amount": 1200.0,
            "date": "2026-10-20"
        }
    ]
    new_claim = {
        "id": "clm_2",
        "claim_no": "CLM-102",
        "employee_id": "emp_john",
        "category": "Meals",
        "amount": 1205.0,  # within 0.5% tolerance (5 / 1205 = 0.4%)
        "date": "2026-10-20"
    }
    result = rule_repeated_claim(new_claim, existing)
    assert result["triggered"] is True
    assert result["rule_id"] == "REPEATED_CLAIM"
    assert result["severity"] == "high"
    assert "CLM-101" in result["reason"]

def test_rule_repeated_claim_negative_diff_date():
    """Negative: Same employee + category + amount, but different date."""
    existing = [
        {
            "id": "clm_1",
            "claim_no": "CLM-101",
            "employee_id": "emp_john",
            "category": "Meals",
            "amount": 1200.0,
            "date": "2026-10-20"
        }
    ]
    new_claim = {
        "id": "clm_2",
        "claim_no": "CLM-102",
        "employee_id": "emp_john",
        "category": "Meals",
        "amount": 1200.0,
        "date": "2026-10-21"  # Different date
    }
    result = rule_repeated_claim(new_claim, existing)
    assert result["triggered"] is False

def test_rule_repeated_claim_negative_diff_employee():
    """Negative: Same category + amount + date, but different employee."""
    existing = [
        {
            "id": "clm_1",
            "claim_no": "CLM-101",
            "employee_id": "emp_john",
            "category": "Meals",
            "amount": 1200.0,
            "date": "2026-10-20"
        }
    ]
    new_claim = {
        "id": "clm_2",
        "claim_no": "CLM-102",
        "employee_id": "emp_alice",  # Different employee
        "category": "Meals",
        "amount": 1200.0,
        "date": "2026-10-20"
    }
    result = rule_repeated_claim(new_claim, existing)
    assert result["triggered"] is False

def test_rule_repeated_claim_negative_diff_amount():
    """Negative: Same employee + category + date, but amount differs > 0.5%."""
    existing = [
        {
            "id": "clm_1",
            "claim_no": "CLM-101",
            "employee_id": "emp_john",
            "category": "Meals",
            "amount": 1200.0,
            "date": "2026-10-20"
        }
    ]
    new_claim = {
        "id": "clm_2",
        "claim_no": "CLM-102",
        "employee_id": "emp_john",
        "category": "Meals",
        "amount": 1400.0,  # > 0.5% difference
        "date": "2026-10-20"
    }
    result = rule_repeated_claim(new_claim, existing)
    assert result["triggered"] is False
