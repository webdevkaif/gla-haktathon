import csv
import io
import re
import json
from typing import Dict, Any, List, Optional
import charset_normalizer

def extract_tabular_data(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Extracts structured data, summary statistics, and policy checks
    from CSV, XLSX, XLS, PDF, TXT, or JSON files for consumption by the AI Agent.
    """
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    rows: List[List[Any]] = []
    sheet_names: List[str] = ["Default"]
    raw_text_summary: str = ""

    # ── 1. CSV / TSV / TXT / MD ──────────────────────────────────────────────
    if ext in ["csv", "tsv", "txt", "md"]:
        sheet_names = [filename]
        text_content = ""
        try:
            text_content = file_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            try:
                detected = charset_normalizer.from_bytes(file_bytes).best()
                text_content = file_bytes.decode(detected.encoding if detected else "latin-1", errors="replace")
            except Exception:
                text_content = file_bytes.decode("latin-1", errors="replace")

        sample = text_content[:2048]
        delimiter = "\t" if "\t" in sample and ext != "csv" else (";" if ";" in sample else ("," if "," in sample else None))
        if not delimiter:
            try:
                dialect = csv.Sniffer().sniff(sample)
                delimiter = dialect.delimiter
            except Exception:
                delimiter = ","

        reader = csv.reader(io.StringIO(text_content), delimiter=delimiter)
        for r in reader:
            if any(cell.strip() for cell in r):
                rows.append([cell.strip() for cell in r])

        if not rows and text_content.strip():
            raw_text_summary = text_content[:3000]

    # ── 2. Excel Spreadsheets (.xlsx, .xls) ──────────────────────────────────
    elif ext in ["xlsx", "xls"]:
        parsed_via_openpyxl = False
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            sheet_names = wb.sheetnames
            ws = wb.active
            for row in ws.iter_rows(values_only=True):
                if any(cell is not None and str(cell).strip() != "" for cell in row):
                    rows.append([str(c).strip() if c is not None else "" for c in row])
            parsed_via_openpyxl = True
        except Exception:
            pass

        # Fallback for .xls files that are actually HTML, XML, or tab-delimited text
        if not parsed_via_openpyxl or not rows:
            try:
                detected = charset_normalizer.from_bytes(file_bytes).best()
                text_content = file_bytes.decode(detected.encoding if detected else "utf-8", errors="replace")
                sample = text_content[:2048]
                delimiter = "\t" if "\t" in sample else (";" if ";" in sample else ",")
                reader = csv.reader(io.StringIO(text_content), delimiter=delimiter)
                for r in reader:
                    if any(c.strip() for c in r):
                        rows.append([c.strip() for c in r])
            except Exception:
                pass

    # ── 3. PDF Invoices and Documents (.pdf) ──────────────────────────────────
    elif ext == "pdf":
        sheet_names = ["PDF Pages"]
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pdf_lines: List[str] = []
            for p_idx, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                if txt.strip():
                    pdf_lines.extend([line.strip() for line in txt.split("\n") if line.strip()])
            raw_text_summary = "\n".join(pdf_lines[:50])

            # Try to extract key-value or tabular items from PDF
            for line in pdf_lines:
                # Look for lines with currency amounts
                parts = [p.strip() for p in re.split(r'\s{2,}|\t', line) if p.strip()]
                if len(parts) >= 2:
                    rows.append(parts)
            if rows:
                rows.insert(0, ["Item / Description", "Amount / Value", "Detail"])
        except Exception as e:
            raw_text_summary = f"PDF content read notice: {e}"

    # ── 4. JSON Files (.json) ────────────────────────────────────────────────
    elif ext == "json":
        sheet_names = ["JSON"]
        try:
            data = json.loads(file_bytes.decode("utf-8", errors="replace"))
            if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                headers = list(data[0].keys())
                rows.append(headers)
                for item in data:
                    rows.append([str(item.get(h, "")) for h in headers])
            else:
                raw_text_summary = json.dumps(data, indent=2)[:3000]
        except Exception:
            pass

    # ── 5. Images (.png, .jpg, .jpeg) ────────────────────────────────────────
    elif ext in ["png", "jpg", "jpeg", "webp"]:
        sheet_names = ["Receipt Scan"]
        raw_text_summary = f"Uploaded invoice/receipt image: {filename}. Optical document intelligence ready for verification."

    # If no structured rows but we have text, return textual extraction
    if not rows:
        return {
            "filename": filename,
            "file_type": ext.upper() or "DOCUMENT",
            "sheet_names": sheet_names,
            "row_count": 0,
            "column_count": 0,
            "headers": ["Document Text"],
            "sample_rows": [{"text_snippet": raw_text_summary[:500]}],
            "summary": {
                "total_rows": 0,
                "text_summary": raw_text_summary[:1000] or f"File '{filename}' received and registered.",
                "total_sum": None
            },
            "markdown_preview": f"```\n{raw_text_summary[:800] or 'Uploaded document processed.'}\n```"
        }

    # Normalize headers
    headers = [h if h else f"Column_{i+1}" for i, h in enumerate(rows[0])]
    data_rows = []
    for r in rows[1:]:
        # Reconcile unquoted comma numbers if row is wider than headers
        if len(r) > len(headers):
            reconciled = []
            i = 0
            while i < len(r):
                if i < len(r) - 1 and re.search(r'\d{1,3}$', str(r[i])) and re.match(r'^\d{2,3}(\.\d+)?$', str(r[i+1])):
                    reconciled.append(f"{r[i]},{r[i+1]}")
                    i += 2
                else:
                    reconciled.append(r[i])
                    i += 1
            if len(reconciled) == len(headers):
                r = reconciled
        data_rows.append(r)

    # Map sample rows as dicts (up to 15 rows)
    sample_records: List[Dict[str, Any]] = []
    for r in data_rows[:15]:
        rec = {}
        for i, h in enumerate(headers):
            rec[h] = r[i] if i < len(r) else ""
        sample_records.append(rec)

    # Detect numerical columns and sum them
    amount_col = None
    for h in headers:
        h_lower = h.lower()
        if any(term in h_lower for term in ["amount", "total", "price", "cost", "sum", "reimbursement", "value", "debit", "spent"]):
            amount_col = h
            break

    total_amount = 0.0
    detected_amounts: List[float] = []
    flagged_high_expenses: List[Dict[str, Any]] = []
    
    if amount_col:
        col_idx = headers.index(amount_col)
        for idx, r in enumerate(data_rows):
            if col_idx < len(r):
                val_clean = re.sub(r'[^\d.-]', '', str(r[col_idx]))
                try:
                    num = abs(float(val_clean))
                    if num > 0:
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

