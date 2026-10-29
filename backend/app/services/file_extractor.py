import csv
import io
from typing import Dict, Any, List, Optional
import openpyxl

def extract_tabular_data(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Extracts structured tabular data, summary statistics, and policy checks
    from CSV, XLSX, or XLS files for consumption by the AI Agent.
    """
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    rows: List[List[Any]] = []
    sheet_names: List[str] = []

    if ext == "csv":
        sheet_names = ["Sheet1"]
        # Try UTF-8 first, fallback to latin-1
        text_content = ""
        try:
            text_content = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text_content = file_bytes.decode("latin-1", errors="replace")

        # Sniff delimiter or default to comma
        sample = text_content[:2048]
        delimiter = ","
        try:
            dialect = csv.Sniffer().sniff(sample)
            delimiter = dialect.delimiter
        except Exception:
            if "\t" in sample:
                delimiter = "\t"
            elif ";" in sample:
                delimiter = ";"

        reader = csv.reader(io.StringIO(text_content), delimiter=delimiter)
        for r in reader:
            if any(cell.strip() for cell in r):
                rows.append([cell.strip() for cell in r])

    elif ext in ["xlsx", "xls"]:
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        sheet_names = wb.sheetnames
        ws = wb.active
        for row in ws.iter_rows(values_only=True):
            if any(cell is not None and str(cell).strip() != "" for cell in row):
                rows.append([str(c).strip() if c is not None else "" for c in row])
    else:
        raise ValueError(f"Unsupported file format '.{ext}'. Please upload a .csv, .xlsx, or .xls file.")

    if not rows:
        return {
            "filename": filename,
            "file_type": ext.upper(),
            "sheet_names": sheet_names,
            "row_count": 0,
            "column_count": 0,
            "headers": [],
            "sample_rows": [],
            "summary": {"error": "File is empty or contains no readable rows."},
            "markdown_preview": "_Empty file_"
        }

    # Normalize headers
    headers = [h if h else f"Column_{i+1}" for i, h in enumerate(rows[0])]
    data_rows = rows[1:]

    # Map sample rows as dicts (up to 15 rows)
    sample_records: List[Dict[str, Any]] = []
    for r in data_rows[:15]:
        rec = {}
        for i, h in enumerate(headers):
            rec[h] = r[i] if i < len(r) else ""
        sample_records.append(rec)

    # Detect numerical columns and sum them
    col_sums: Dict[str, float] = {}
    amount_col = None
    for h in headers:
        h_lower = h.lower()
        if any(term in h_lower for term in ["amount", "total", "price", "cost", "sum", "reimbursement", "value"]):
            amount_col = h
            break

    total_amount = 0.0
    detected_amounts: List[float] = []
    flagged_high_expenses: List[Dict[str, Any]] = []
    
    if amount_col:
        col_idx = headers.index(amount_col)
        for idx, r in enumerate(data_rows):
            if col_idx < len(r):
                val_str = str(r[col_idx]).replace(",", "").replace("₹", "").replace("$", "").replace("INR", "").strip()
                try:
                    num = float(val_str)
                    detected_amounts.append(num)
                    total_amount += num
                    # Flag high expenses > 10,000 for policy check
                    if num > 10000.0:
                        desc = r[headers.index("Description")] if "Description" in headers and headers.index("Description") < len(r) else f"Row {idx+2}"
                        flagged_high_expenses.append({
                            "row": idx + 2,
                            "amount": num,
                            "description": desc,
                            "reason": "Amount exceeds ₹10,000 requiring secondary Finance Controller approval under SEC-107."
                        })
                except ValueError:
                    pass

    # Check for potential duplicates within the sheet
    seen_keys: Dict[str, int] = {}
    duplicate_rows: List[Dict[str, Any]] = []
    for idx, r in enumerate(data_rows):
        key = " | ".join(str(c).lower().strip() for c in r if c)
        if key:
            if key in seen_keys:
                duplicate_rows.append({
                    "original_row": seen_keys[key] + 2,
                    "duplicate_row": idx + 2,
                    "sample": r[:4]
                })
            else:
                seen_keys[key] = idx

    # Build Markdown table preview (first 5 rows)
    preview_headers = headers[:6]
    md_lines = ["| " + " | ".join(preview_headers) + " |", "| " + " | ".join(["---"] * len(preview_headers)) + " |"]
    for r in data_rows[:5]:
        row_cells = [str(r[i]) if i < len(r) else "" for i in range(len(preview_headers))]
        md_lines.append("| " + " | ".join(row_cells) + " |")
    markdown_table = "\n".join(md_lines)

    summary = {
        "total_rows": len(data_rows),
        "total_columns": len(headers),
        "primary_amount_column": amount_col,
        "total_sum": round(total_amount, 2) if detected_amounts else None,
        "average_amount": round(total_amount / len(detected_amounts), 2) if detected_amounts else None,
        "max_amount": max(detected_amounts) if detected_amounts else None,
        "min_amount": min(detected_amounts) if detected_amounts else None,
        "flagged_high_expenses_count": len(flagged_high_expenses),
        "flagged_high_expenses": flagged_high_expenses[:5],
        "duplicate_rows_detected": len(duplicate_rows),
        "duplicate_rows": duplicate_rows[:5]
    }

    return {
        "filename": filename,
        "file_type": ext.upper(),
        "sheet_names": sheet_names,
        "row_count": len(data_rows),
        "column_count": len(headers),
        "headers": headers,
        "sample_rows": sample_records,
        "summary": summary,
        "markdown_preview": markdown_table
    }
