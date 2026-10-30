from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from backend.app.database import get_db
from backend.app.models import serialize_doc, serialize_docs, build_id_query
from backend.app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseOut
from backend.app.agent.tools import tool_add_expense, auto_categorize
from backend.app.services.anomaly import audit_and_generate_alerts

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])

@router.get("", response_model=List[ExpenseOut])
@router.get("/", response_model=List[ExpenseOut])
async def list_expenses(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format"),
    category: Optional[str] = Query(None),
    is_unusual: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query: dict = {"user_id": user_id}
    if month:
        start_date = f"{month}-01"
        end_date = f"{month}-31"
        query["date"] = {"$gte": start_date, "$lte": end_date}
    if category and category.lower() != "all":
        query["category"] = category
    if is_unusual is not None:
        query["is_unusual"] = is_unusual
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}}
        ]

    cursor = db.expenses.find(query).sort([("date", -1), ("_id", -1)]).limit(limit)
    docs = await cursor.to_list(length=limit)
    return serialize_docs(docs)

@router.post("", response_model=ExpenseOut)
async def create_expense(
    payload: ExpenseCreate,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    res = await tool_add_expense(
        db=db,
        user_id=user_id,
        amount=payload.amount,
        category=payload.category,
        description=payload.description,
        date_str=payload.date,
        payment_method=payload.payment_method
    )
    query = {"$and": [{"user_id": user_id}, build_id_query(res["id"])]}
    if payload.payload_hash:
        await db.expenses.update_one(query, {"$set": {"payload_hash": payload.payload_hash}})
    obj = await db.expenses.find_one(query)
    return serialize_doc(obj)

@router.put("/{expense_id}", response_model=ExpenseOut)
async def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query = {"$and": [{"user_id": user_id}, build_id_query(expense_id)]}
    exp = await db.expenses.find_one(query)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_fields = {}
    if payload.amount is not None:
        update_fields["amount"] = payload.amount
    if payload.category is not None:
        update_fields["category"] = payload.category
    if payload.description is not None:
        update_fields["description"] = payload.description
    if payload.date is not None:
        update_fields["date"] = payload.date
    if payload.payment_method is not None:
        update_fields["payment_method"] = payload.payment_method
    if payload.is_unusual is not None:
        update_fields["is_unusual"] = payload.is_unusual
    if payload.anomaly_reason is not None:
        update_fields["anomaly_reason"] = payload.anomaly_reason

    if update_fields:
        await db.expenses.update_one(query, {"$set": update_fields})
    
    updated_exp = await db.expenses.find_one(query)
    
    # Re-audit
    if updated_exp and "date" in updated_exp:
        await audit_and_generate_alerts(db, user_id, updated_exp["date"][:7])
        
    return serialize_doc(updated_exp)

@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query = {"$and": [{"user_id": user_id}, build_id_query(expense_id)]}
    exp = await db.expenses.find_one(query)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    month_str = exp.get("date", "")[:7]
    await db.expenses.delete_one(query)

    # Re-audit
    if month_str:
        await audit_and_generate_alerts(db, user_id, month_str)
        
    return {"status": "success", "message": "Expense deleted"}

@router.post("/confirm-unusual/{expense_id}")
async def confirm_unusual(
    expense_id: str,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query = {"$and": [{"user_id": user_id}, build_id_query(expense_id)]}
    exp = await db.expenses.find_one(query)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    await db.expenses.update_one(
        query,
        {"$set": {"is_unusual": False, "anomaly_reason": "Verified & confirmed by user"}}
    )
    return {"status": "success", "message": "Expense confirmed"}


@router.post("/upload-csv")
async def upload_expenses_csv(
    file: UploadFile = File(...),
    user_id: str = "user_default",
    db = Depends(get_db)
):
    """
    Bulk-import expenses from a CSV or Excel (.xlsx / .xls) file.
    Supports auto-encoding detection, flexible delimiter sniffing,
    fuzzy date parsing, and fuzzy column resolution.
    """
    import csv
    import io
    import re
    from datetime import datetime
    from dateutil import parser as date_parser
    import charset_normalizer

    filename = file.filename or "expenses.csv"
    raw_bytes = await file.read()
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=422, detail="The uploaded file is completely empty.")

    # ── Parse rows into dicts ──────────────────────────────────────────────
    rows: list[dict] = []
    parse_error: str | None = None

    if filename.lower().endswith((".xlsx", ".xls")):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), data_only=True)
            ws = wb.active
            header_cells = next(ws.iter_rows(min_row=1, max_row=1), None)
            if header_cells:
                headers = [str(c.value).strip().lower() if c.value is not None else f"col_{i}" for i, c in enumerate(header_cells)]
                for row in ws.iter_rows(min_row=2, values_only=True):
                    if any(v is not None and str(v).strip() != "" for v in row):
                        row_dict = {}
                        for i, v in enumerate(row):
                            h_key = headers[i] if i < len(headers) else f"col_{i}"
                            # If v is a datetime object, format it cleanly
                            if isinstance(v, (datetime, )):
                                row_dict[h_key] = v.strftime("%Y-%m-%d")
                            else:
                                row_dict[h_key] = str(v).strip() if v is not None else ""
                        rows.append(row_dict)
        except Exception as e:
            # Fallback: Many .xls files exported by systems are actually CSV, TSV or HTML tables
            try:
                detected = charset_normalizer.from_bytes(raw_bytes).best()
                text = raw_bytes.decode(detected.encoding if detected else "utf-8", errors="replace")
                sample = text[:2048]
                delimiter = "\t" if "\t" in sample else (";" if ";" in sample else ",")
                reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
                for r in reader:
                    if any(v and v.strip() for v in r.values()):
                        rows.append({(k.strip().lower() if k else f"col_{i}"): (v.strip() if v else "") for i, (k, v) in enumerate(r.items())})
            except Exception:
                parse_error = f"Excel parse error: {e}"

    if not rows and not parse_error:
        try:
            # Robust text decoding
            text = ""
            try:
                text = raw_bytes.decode("utf-8-sig")
            except UnicodeDecodeError:
                detected = charset_normalizer.from_bytes(raw_bytes).best()
                text = raw_bytes.decode(detected.encoding if detected else "latin-1", errors="replace")

            # Sniff delimiter
            sample = text[:2048]
            delimiter = ","
            try:
                sniffed = csv.Sniffer().sniff(sample)
                delimiter = sniffed.delimiter
            except Exception:
                if "\t" in sample:
                    delimiter = "\t"
                elif ";" in sample:
                    delimiter = ";"
                elif "|" in sample:
                    delimiter = "|"

            reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
            for r in reader:
                if any(v and v.strip() for v in r.values()):
                    rows.append({(k.strip().lower() if k else f"col_{i}"): (v.strip() if v else "") for i, (k, v) in enumerate(r.items())})
        except Exception as e:
            parse_error = f"CSV parse error: {e}"

    if parse_error and not rows:
        raise HTTPException(status_code=422, detail=parse_error)
    if not rows:
        raise HTTPException(status_code=422, detail="No readable transaction rows found in file.")

    # ── Normalise column aliases ───────────────────────────────────────────
    ALIAS = {
        "amount": ["amount", "amt", "price", "cost", "total", "value", "debit", "spent", "dr", "outflow", "net amount", "grand total", "sum"],
        "description": ["description", "desc", "details", "name", "title", "item", "narration", "particulars", "remarks", "merchant", "vendor", "payee", "note"],
        "date": ["date", "txn date", "transaction date", "expense date", "bill date", "invoice date", "time", "timestamp"],
        "category": ["category", "cat", "type", "expense type", "head", "account", "department"],
        "payment_method": ["payment_method", "payment", "mode", "payment mode", "method", "channel"],
    }

    def resolve(row: dict, field: str) -> str:
        for alias in ALIAS[field]:
            for k, val in row.items():
                if k and (alias == k or alias in k):
                    if val and str(val).strip():
                        return str(val).strip()
        return ""

    # ── Import each row ────────────────────────────────────────────────────
    imported: list[dict] = []
    skipped: list[dict] = []
    affected_months: set[str] = set()
    today_str = datetime.now().strftime("%Y-%m-%d")

    for idx, row in enumerate(rows, start=2):
        date_raw = resolve(row, "date")
        amount_raw = resolve(row, "amount")
        desc = resolve(row, "description")
        cat = resolve(row, "category")
        payment = resolve(row, "payment_method") or "UPI"

        # Fallback: if description is empty, use any available text column
        if not desc:
            for k, v in row.items():
                if v and not re.match(r'^\d+(\.\d+)?$', v) and len(v) > 2:
                    desc = v
                    break
        desc = desc or f"Transaction #{idx}"

        # Parse date with fuzzy fallback
        parsed_date: str = today_str
        if date_raw:
            try:
                dt = date_parser.parse(date_raw, fuzzy=True, dayfirst=True)
                parsed_date = dt.strftime("%Y-%m-%d")
            except Exception:
                parsed_date = today_str

        # Validate amount with robust symbol stripping
        amount = 0.0
        if not amount_raw:
            # Fallback: search row values for any numeric amount
            for v in row.values():
                cleaned = re.sub(r'[^\d.-]', '', str(v))
                try:
                    cand = float(cleaned)
                    if cand > 0:
                        amount = cand
                        break
                except ValueError:
                    continue
        else:
            try:
                cleaned = re.sub(r'[^\d.-]', '', str(amount_raw))
                amount = abs(float(cleaned))
            except (ValueError, AttributeError):
                amount = 0.0

        if amount <= 0:
            skipped.append({"row": idx, "reason": f"No valid amount in row: '{amount_raw}'"})
            continue

        # Auto-categorise if blank
        if not cat:
            cat = auto_categorize(desc)

        result = await tool_add_expense(
            db=db,
            user_id=user_id,
            amount=amount,
            category=cat,
            description=desc,
            date_str=parsed_date,
            payment_method=payment,
        )
        imported.append(result)
        affected_months.add(parsed_date[:7])

    # Final audit pass for all touched months
    for month_str in affected_months:
        await audit_and_generate_alerts(db, user_id, month_str)

    return {
        "status": "success",
        "imported": len(imported),
        "skipped": len(skipped),
        "skipped_details": skipped,
        "expenses": imported,
        "message": f"✅ Imported {len(imported)} expense(s) from '{filename}'" + (
            f". Skipped {len(skipped)} invalid row(s)." if skipped else "."
        )
    }
