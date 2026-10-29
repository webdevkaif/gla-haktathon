from typing import List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from backend.app.database import get_db
from backend.app.models import serialize_doc, serialize_docs, build_id_query
from backend.app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseOut
from backend.app.agent.tools import tool_add_expense, auto_categorize
from backend.app.services.anomaly import audit_and_generate_alerts

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])

@router.get("", response_model=List[ExpenseOut])
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
    Bulk-import expenses from a CSV or Excel (.xlsx) file.

    Accepted column names (case-insensitive, any order):
      date        – YYYY-MM-DD  (required)
      amount      – numeric     (required)
      description – text        (required)
      category    – text        (auto-detected if missing)
      payment_method / payment – text (optional)

    Returns a summary: rows imported, rows skipped, and any errors.
    """
    import csv
    import io
    from datetime import datetime

    filename = file.filename or ""
    raw_bytes = await file.read()

    # ── Parse rows into dicts ──────────────────────────────────────────────
    rows: list[dict] = []
    parse_error: str | None = None

    if filename.lower().endswith((".xlsx", ".xls")):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), data_only=True)
            ws = wb.active
            headers = [str(c.value).strip().lower() if c.value else "" for c in next(ws.iter_rows(min_row=1, max_row=1))]
            for row in ws.iter_rows(min_row=2, values_only=True):
                rows.append({headers[i]: (str(v).strip() if v is not None else "") for i, v in enumerate(row)})
        except Exception as e:
            parse_error = f"Excel parse error: {e}"
    elif filename.lower().endswith(".csv") or True:  # fallback: treat anything else as CSV
        try:
            text = raw_bytes.decode("utf-8-sig")  # handle BOM
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                rows.append({k.strip().lower(): (v.strip() if v else "") for k, v in row.items()})
        except Exception as e:
            parse_error = f"CSV parse error: {e}"

    if parse_error:
        raise HTTPException(status_code=422, detail=parse_error)
    if not rows:
        raise HTTPException(status_code=422, detail="File is empty or has no data rows.")

    # ── Normalise column aliases ───────────────────────────────────────────
    ALIAS = {
        "amount": ["amount", "amt", "price", "cost", "total", "value"],
        "description": ["description", "desc", "details", "name", "title", "item", "narration", "particulars"],
        "date": ["date", "txn date", "transaction date", "expense date"],
        "category": ["category", "cat", "type", "expense type"],
        "payment_method": ["payment_method", "payment", "mode", "payment mode", "method"],
    }

    def resolve(row: dict, field: str) -> str:
        for alias in ALIAS[field]:
            if alias in row and row[alias]:
                return row[alias]
        return ""

    # ── Import each row ────────────────────────────────────────────────────
    imported: list[dict] = []
    skipped: list[dict] = []
    affected_months: set[str] = set()

    for idx, row in enumerate(rows, start=2):
        date_raw = resolve(row, "date")
        amount_raw = resolve(row, "amount")
        desc = resolve(row, "description") or "Imported expense"
        cat = resolve(row, "category")
        payment = resolve(row, "payment_method") or "Unknown"

        # Validate date
        parsed_date: str | None = None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%d %b %Y", "%d %B %Y"):
            try:
                parsed_date = datetime.strptime(date_raw, fmt).strftime("%Y-%m-%d")
                break
            except ValueError:
                continue
        if not parsed_date:
            skipped.append({"row": idx, "reason": f"Invalid/missing date: '{date_raw}'"})
            continue

        # Validate amount
        try:
            amount = float(amount_raw.replace(",", "").replace("₹", "").replace("$", "").strip())
            if amount <= 0:
                raise ValueError("non-positive")
        except (ValueError, AttributeError):
            skipped.append({"row": idx, "reason": f"Invalid/missing amount: '{amount_raw}'"})
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
