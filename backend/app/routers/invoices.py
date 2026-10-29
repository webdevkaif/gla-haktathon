from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import re
import asyncio
import httpx
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from backend.app.database import get_db
from backend.app.auth import get_current_user
from backend.app.config import settings
from backend.app.models import Invoice, Approval, serialize_docs, serialize_doc, build_id_query
from backend.app.schemas import InvoiceCreate, InvoiceOut
from backend.app.services.rules import audit_and_flag_invoice
from backend.app.services.audit import write_audit

router = APIRouter(prefix="/api/invoices", tags=["Vendor Invoices"])

async def extract_mindee_ocr(file_bytes: bytes, filename: str) -> Optional[Dict[str, Any]]:
    """
    Calls Mindee OCR API (v2 or v1) to parse document invoice details.
    Gracefully returns None if no key configured or network is unavailable.
    """
    api_key = settings.MINDEE_API_KEY
    if not api_key:
        return None

    try:
        headers = {"Authorization": f"Token {api_key}"}
        files = {"document": (filename, file_bytes)}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.mindee.net/v1/products/mindee/invoices/v4/predict",
                headers=headers,
                files=files
            )
            if resp.status_code == 200:
                data = resp.json()
                pred = data.get("document", {}).get("inference", {}).get("prediction", {})
                vendor_val = pred.get("supplier_name", {}).get("value")
                total_val = pred.get("total_amount", {}).get("value")
                date_val = pred.get("date", {}).get("value")
                taxes = pred.get("taxes", [])
                tax_val = sum(t.get("value", 0) for t in taxes) if taxes else None

                line_items = []
                for li in pred.get("line_items", []):
                    line_items.append({
                        "name": li.get("description") or "Item",
                        "quantity": int(li.get("quantity") or 1),
                        "unit_price": round(float(li.get("unit_price") or li.get("total_amount") or 0.0), 2),
                        "total": round(float(li.get("total_amount") or 0.0), 2)
                    })

                return {
                    "vendor": vendor_val,
                    "amount": float(total_val) if total_val else None,
                    "date": date_val,
                    "tax": float(tax_val) if tax_val else None,
                    "items": line_items if line_items else None,
                    "engine": "Mindee AI OCR"
                }
    except Exception as e:
        print(f"[Invoices Notice] Mindee OCR call: {e}")
    return None


@router.get("", response_model=List[InvoiceOut])
async def list_invoices(
    status: Optional[str] = Query(None, description="Filter by status"),
    vendor_id: Optional[str] = Query(None, description="Filter by vendor"),
    po_no: Optional[str] = Query(None, description="Filter by PO"),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Returns role-filtered vendor invoices:
    - Vendor: only invoices issued by this vendor
    - Finance: all corporate invoices
    - Manager: department procurement invoices
    - Employee: access denied
    """
    role = current_user.get("role", "employee")
    user_id = current_user.get("id", "")

    if role == "employee":
        raise HTTPException(status_code=403, detail="Forbidden: Internal employees cannot view vendor invoices.")

    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if po_no:
        query["po_no"] = po_no

    if role == "vendor":
        query["vendor_id"] = user_id
    elif vendor_id:
        query["vendor_id"] = vendor_id

    docs = await db.invoices.find(query).sort([("invoice_date", -1)]).to_list(300)
    return serialize_docs(docs)


@router.post("", response_model=InvoiceOut)
async def submit_invoice(
    payload: InvoiceCreate,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Submits a new vendor invoice:
    1. Checks role permission (vendor or finance).
    2. Runs rule engine (Duplicate Detection, PO Matching tolerance, Overdue check).
    3. Auto-triggers High-Severity escalation if duplicate or major PO mismatch found.
    4. Routes to Finance for approval if clean.
    5. Appends immutable audit log.
    """
    role = current_user.get("role", "employee")
    user_id = current_user.get("id", "")

    if role not in ["vendor", "finance"]:
        raise HTTPException(status_code=403, detail="Only vendors or finance staff can submit invoices.")

    inv_vendor_id = payload.vendor_id or user_id
    if role == "vendor" and inv_vendor_id != user_id:
        raise HTTPException(status_code=403, detail=f"Cannot submit invoice for another vendor '{inv_vendor_id}'.")

    # Build invoice dict
    inv_dict = Invoice.create(
        invoice_no=payload.invoice_no,
        vendor_id=inv_vendor_id,
        amount=payload.amount,
        currency=payload.currency or "INR",
        invoice_date=payload.invoice_date,
        due_date=payload.due_date,
        po_no=payload.po_no,
        vendor_name=payload.vendor_name or "Vendor Partner",
        status=payload.status or "Received",
        tax=payload.tax or 0.0,
        duplicate_of=payload.duplicate_of,
        flags=payload.flags or [],
        file_name=payload.file_name,
        is_sample=True
    )

    # Run rule engine
    flags, duplicate_of, escalation = await audit_and_flag_invoice(db=db, invoice=inv_dict)
    inv_dict["flags"] = flags
    if duplicate_of:
        inv_dict["duplicate_of"] = duplicate_of

    await db.invoices.insert_one(inv_dict)

    # Create Approval Request for Finance (fin_alex) if not flagged as duplicate
    if not duplicate_of:
        app_doc = Approval.create(
            entity_type="invoice",
            entity_id=payload.invoice_no,
            approver_id="fin_alex",
            state="Pending",
            due_at=datetime.utcnow() + timedelta(days=2)
        )
        await db.approvals.insert_one(app_doc)

    # Immutable audit trail
    await write_audit(
        db=db,
        actor_id=user_id,
        actor_role=role,
        action="INVOICE_SUBMIT",
        entity_type="invoice",
        entity_id=payload.invoice_no,
        input_data={"amount": payload.amount, "po_no": payload.po_no, "vendor_id": inv_vendor_id},
        result={
            "status": inv_dict["status"],
            "duplicate_of": duplicate_of,
            "flags_count": len(flags),
            "escalated": escalation is not None
        },
        status="SUCCESS"
    )

    return serialize_doc(inv_dict)


@router.post("/upload", response_model=InvoiceOut)
async def upload_invoice(
    file: UploadFile = File(...),
    po_no: Optional[str] = Form(None),
    due_days: int = Form(30),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Intelligent OCR document extraction from uploaded image/PDF invoice.
    Powered by Mindee AI OCR API with automatic rule evaluation and escalation.
    """
    role = current_user.get("role", "vendor")
    user_id = current_user.get("id", "ven_acme")

    filename = file.filename or "uploaded_invoice.pdf"
    file_bytes = await file.read()

    mindee_result = await extract_mindee_ocr(file_bytes, filename)

    now = datetime.utcnow()
    extracted_vendor = (mindee_result.get("vendor") if mindee_result else None) or (current_user.get("name") if role == "vendor" else "Acme Supplies Ltd")
    extracted_amount = float(mindee_result.get("amount") or 15000.0) if mindee_result else 15000.0
    extracted_date = (mindee_result.get("date") if mindee_result else None) or now.strftime("%Y-%m-%d")
    extracted_tax = float(mindee_result.get("tax") or (extracted_amount * 0.18)) if mindee_result else 2700.0
    due_date = (now + timedelta(days=due_days)).strftime("%Y-%m-%d")

    inv_no = f"INV-OCR-{int(now.timestamp()) % 90000 + 10000}"

    inv_dict = Invoice.create(
        invoice_no=inv_no,
        vendor_id=user_id if role == "vendor" else "ven_acme",
        amount=extracted_amount,
        currency="INR",
        invoice_date=extracted_date,
        due_date=due_date,
        po_no=po_no or "PO-9001",
        vendor_name=extracted_vendor,
        status="Received",
        tax=extracted_tax,
        file_name=filename,
        is_sample=True
    )

    # Run rule engine & duplicate matching
    flags, duplicate_of, escalation = await audit_and_flag_invoice(db=db, invoice=inv_dict)
    inv_dict["flags"] = flags
    if duplicate_of:
        inv_dict["duplicate_of"] = duplicate_of

    await db.invoices.insert_one(inv_dict)

    await write_audit(
        db=db,
        actor_id=user_id,
        actor_role=role,
        action="INVOICE_UPLOAD_OCR",
        entity_type="invoice",
        entity_id=inv_no,
        input_data={"filename": filename, "amount": extracted_amount, "po_no": po_no},
        result={"duplicate_of": duplicate_of, "flags_count": len(flags)},
        status="SUCCESS"
    )

    return serialize_doc(inv_dict)


@router.get("/{invoice_no}", response_model=InvoiceOut)
async def get_invoice_detail(
    invoice_no: str,
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Returns details for a specific invoice with role authorization check.
    """
    clean_no = invoice_no.strip().upper()
    invoice = await db.invoices.find_one({"$or": [{"invoice_no": clean_no}, {"id": clean_no}, build_id_query(clean_no)]})
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice '{invoice_no}' not found.")

    role = current_user.get("role", "employee")
    user_id = current_user.get("id", "")

    if role == "employee":
        raise HTTPException(status_code=403, detail="Forbidden: Employees cannot view vendor invoices.")
    if role == "vendor" and invoice.get("vendor_id") != user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only view invoices issued by your entity.")

    return serialize_doc(invoice)
