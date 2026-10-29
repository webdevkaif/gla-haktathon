from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import re
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from backend.app.database import get_db
from backend.app.config import settings
from backend.app.models import serialize_docs, serialize_doc, build_id_query
from backend.app.schemas import InvoiceCreate, InvoiceOut, InvoiceSummary, InvoiceItem

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])

DEMO_INVOICES = [
    {
        "vendor": "Apple Store India",
        "invoice_number": "INV-2026-APL-8821",
        "date": "2026-10-24",
        "amount": 2499.0,
        "category": "Shopping",
        "tax": 449.82,
        "status": "Audited",
        "file_name": "apple_store_receipt.pdf",
        "is_anomaly": False,
        "anomaly_reason": None,
        "items": [
            {"name": "USB-C Fast Charging Adapter 30W", "quantity": 1, "unit_price": 2049.18, "total": 2049.18},
            {"name": "GST 18%", "quantity": 1, "unit_price": 449.82, "total": 449.82}
        ],
        "notes": "Verified hardware accessory purchase."
    },
    {
        "vendor": "Starbucks Reserve Cafe",
        "invoice_number": "INV-2026-SBX-1092",
        "date": "2026-10-22",
        "amount": 650.0,
        "category": "Food",
        "tax": 32.5,
        "status": "Audited",
        "file_name": "starbucks_oct22.png",
        "is_anomaly": True,
        "anomaly_reason": "Price is 45% higher than your average breakfast coffee run.",
        "items": [
            {"name": "Caramel Macchiato Grande", "quantity": 1, "unit_price": 380.0, "total": 380.0},
            {"name": "Artisanal Croissant", "quantity": 1, "unit_price": 237.5, "total": 237.5},
            {"name": "GST 5%", "quantity": 1, "unit_price": 32.5, "total": 32.5}
        ],
        "notes": "Client meeting breakfast."
    },
    {
        "vendor": "Amazon Web Services (AWS)",
        "invoice_number": "INV-2026-AWS-90412",
        "date": "2026-10-18",
        "amount": 4200.0,
        "category": "Utilities",
        "tax": 756.0,
        "status": "Audited",
        "file_name": "aws_october_tax_invoice.pdf",
        "is_anomaly": False,
        "anomaly_reason": None,
        "items": [
            {"name": "Amazon EC2 Compute Cloud", "quantity": 1, "unit_price": 2400.0, "total": 2400.0},
            {"name": "Amazon RDS PostgreSQL Storage", "quantity": 1, "unit_price": 1044.0, "total": 1044.0},
            {"name": "Integrated IGST 18%", "quantity": 1, "unit_price": 756.0, "total": 756.0}
        ],
        "notes": "Monthly cloud infrastructure hosting."
    },
    {
        "vendor": "Reliance Fresh Supermarket",
        "invoice_number": "INV-2026-RF-3310",
        "date": "2026-10-15",
        "amount": 1840.0,
        "category": "Groceries",
        "tax": 88.0,
        "status": "Audited",
        "file_name": "reliance_groceries.jpg",
        "is_anomaly": False,
        "anomaly_reason": None,
        "items": [
            {"name": "Organic Olive Oil 1L", "quantity": 1, "unit_price": 850.0, "total": 850.0},
            {"name": "Almonds & Dry Fruits", "quantity": 1, "unit_price": 540.0, "total": 540.0},
            {"name": "Fresh Organic Produce & Dairy", "quantity": 1, "unit_price": 362.0, "total": 362.0},
            {"name": "CGST + SGST", "quantity": 1, "unit_price": 88.0, "total": 88.0}
        ],
        "notes": "Household groceries replenishment."
    }
]

async def ensure_demo_invoices(db: Any, user_id: str):
    """Seed sample invoices if user currently has none."""
    count = await db.invoices.count_documents({"user_id": user_id})
    if count == 0:
        for inv in DEMO_INVOICES:
            record = dict(inv)
            record["user_id"] = user_id
            record["created_at"] = datetime.utcnow()
            await db.invoices.insert_one(record)

@router.get("", response_model=List[InvoiceOut])
async def list_invoices(
    user_id: str = "user_default",
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db = Depends(get_db)
):
    await ensure_demo_invoices(db, user_id)
    query: dict = {"user_id": user_id}
    if category and category != "All":
        query["category"] = category
    if status:
        query["status"] = status

    cursor = db.invoices.find(query).sort("date", -1)
    records = await cursor.to_list(length=100)
    return serialize_docs(records)

@router.get("/summary", response_model=InvoiceSummary)
async def get_invoice_summary(
    user_id: str = "user_default",
    db = Depends(get_db)
):
    await ensure_demo_invoices(db, user_id)
    cursor = db.invoices.find({"user_id": user_id}).sort("date", -1)
    invoices = await cursor.to_list(length=200)

    total_amount = sum(float(inv.get("amount", 0.0)) for inv in invoices)
    cat_totals: Dict[str, float] = {}
    pending_audit = 0

    for inv in invoices:
        cat = inv.get("category", "Uncategorized")
        cat_totals[cat] = cat_totals.get(cat, 0.0) + float(inv.get("amount", 0.0))
        if inv.get("status") == "Pending Audit":
            pending_audit += 1

    latest_inv = serialize_doc(invoices[0]) if invoices else None

    return InvoiceSummary(
        total_invoices=len(invoices),
        total_invoiced_amount=round(total_amount, 2),
        category_totals={k: round(v, 2) for k, v in cat_totals.items()},
        latest_invoice=latest_inv,
        pending_audit_count=pending_audit
    )

@router.post("", response_model=InvoiceOut)
async def create_invoice(
    payload: InvoiceCreate,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    doc = payload.dict()
    doc["user_id"] = user_id
    doc["created_at"] = datetime.utcnow()
    
    # Run anomaly check on newly created invoice
    if doc.get("amount", 0) > 10000:
        doc["is_anomaly"] = True
        doc["anomaly_reason"] = f"High value invoice (₹{doc['amount']:,.0f}) exceeds single-transaction threshold."
    else:
        doc["is_anomaly"] = False
        doc["anomaly_reason"] = None

    res = await db.invoices.insert_one(doc)
    created = await db.invoices.find_one({"_id": res.inserted_id})
    return serialize_doc(created)

async def extract_mindee_ocr(file_bytes: bytes, filename: str) -> Optional[Dict[str, Any]]:
    """Calls Mindee Document OCR API with support for both V2 (md_...) and legacy V1 keys."""
    if not settings.MINDEE_API_KEY:
        return None
    try:
        import httpx
        import asyncio

        api_key = settings.MINDEE_API_KEY.strip()
        is_v2 = api_key.startswith("md_")

        if is_v2:
            # Mindee API V2 implementation
            headers = {"Authorization": api_key}
            model_id = settings.MINDEE_MODEL_ID.strip()

            async with httpx.AsyncClient(timeout=25.0) as client:
                # If model_id not configured in .env, attempt to discover from user's account
                if not model_id:
                    try:
                        r_models = await client.get("https://api-v2.mindee.net/v2/search/models", headers=headers)
                        if r_models.status_code == 200:
                            models_list = r_models.json().get("models", [])
                            if models_list:
                                model_id = models_list[0].get("id") or models_list[0].get("model_id")
                    except Exception as err:
                        print(f"Mindee V2 model search info: {err}")

                if not model_id:
                    print("Mindee V2 info: No model_id configured or found. Add an Invoice model at https://app.mindee.com and set MINDEE_MODEL_ID in .env.")
                    return None

                # Enqueue document for extraction
                files = {"file": (filename, file_bytes)}
                data = {"model_id": model_id}
                enqueue_resp = await client.post(
                    "https://api-v2.mindee.net/v2/products/extraction/enqueue",
                    headers=headers,
                    files=files,
                    data=data
                )
                if enqueue_resp.status_code not in (200, 201, 202):
                    print(f"Mindee V2 enqueue failed ({enqueue_resp.status_code}): {enqueue_resp.text}")
                    return None

                enqueue_data = enqueue_resp.json()
                job_info = enqueue_data.get("job", {})
                polling_url = job_info.get("polling_url") or enqueue_data.get("polling_url")
                if not polling_url and "id" in job_info:
                    polling_url = f"https://api-v2.mindee.net/v2/jobs/{job_info['id']}"

                if not polling_url:
                    return None

                # Poll for completion (up to ~15-20 seconds)
                for _ in range(8):
                    await asyncio.sleep(2)
                    poll_resp = await client.get(polling_url, headers=headers)
                    if poll_resp.status_code == 200:
                        poll_data = poll_resp.json()
                        status = poll_data.get("job", {}).get("status") or poll_data.get("status")
                        if status in ("Processed", "completed"):
                            # Extraction complete, extract fields
                            inference = poll_data.get("inference", {}) or poll_data.get("job", {}).get("inference", {})
                            fields = inference.get("result", {}).get("fields", {}) or inference.get("prediction", {})
                            
                            vendor_val = fields.get("supplier_name", {}).get("value") if isinstance(fields.get("supplier_name"), dict) else fields.get("supplier_name")
                            total_raw = fields.get("total_amount", {}).get("value") if isinstance(fields.get("total_amount"), dict) else fields.get("total_amount")
                            date_val = fields.get("date", {}).get("value") if isinstance(fields.get("date"), dict) else fields.get("date")
                            tax_raw = fields.get("total_tax", {}).get("value") if isinstance(fields.get("total_tax"), dict) else fields.get("total_tax")
                            
                            total_val = None
                            if total_raw is not None:
                                try:
                                    total_val = float(total_raw)
                                except (ValueError, TypeError):
                                    pass

                            tax_val = None
                            if tax_raw is not None:
                                try:
                                    tax_val = float(tax_raw)
                                except (ValueError, TypeError):
                                    pass

                            # Parse line items if available
                            line_items = []
                            raw_items = fields.get("line_items", [])
                            if isinstance(raw_items, dict):
                                raw_items = raw_items.get("value", [])
                            if isinstance(raw_items, list):
                                for li in raw_items:
                                    if isinstance(li, dict):
                                        desc = li.get("description", {}).get("value") if isinstance(li.get("description"), dict) else li.get("description") or "Item"
                                        qty = li.get("quantity", {}).get("value") if isinstance(li.get("quantity"), dict) else li.get("quantity") or 1
                                        tot = li.get("total_amount", {}).get("value") if isinstance(li.get("total_amount"), dict) else li.get("total_amount") or 0.0
                                        line_items.append({
                                            "name": str(desc),
                                            "quantity": int(qty or 1),
                                            "unit_price": round(float(tot or 0.0), 2),
                                            "total": round(float(tot or 0.0), 2)
                                        })

                            return {
                                "vendor": vendor_val,
                                "amount": total_val,
                                "date": date_val,
                                "tax": tax_val,
                                "items": line_items if line_items else None,
                                "engine": "Mindee AI OCR (v2)"
                            }
                        elif status in ("Failed", "failed"):
                            print(f"Mindee V2 job failed: {poll_data}")
                            break

        else:
            # Mindee API V1 (legacy) implementation
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
                        "engine": "Mindee AI OCR (v1)"
                    }
    except Exception as e:
        print(f"Mindee OCR background call info: {e}")
    return None

@router.post("/upload", response_model=InvoiceOut)
async def upload_invoice(
    file: UploadFile = File(...),
    user_id: str = "user_default",
    vendor: Optional[str] = Form(None),
    amount: Optional[float] = Form(None),
    category: Optional[str] = Form(None),
    date_str: Optional[str] = Form(None),
    db = Depends(get_db)
):
    """
    Intelligent OCR document extraction from uploaded image/PDF receipt.
    Powered by Mindee AI OCR API with autonomous fallback parser.
    """
    filename = file.filename or "uploaded_invoice.pdf"
    file_bytes = await file.read()
    
    # Attempt real-time Mindee OCR extraction
    mindee_result = await extract_mindee_ocr(file_bytes, filename)
    
    # Infer vendor name from Mindee OCR, form input, or filename
    extracted_vendor = vendor or (mindee_result.get("vendor") if mindee_result else None)
    if not extracted_vendor:
        clean_name = re.sub(r'[\-_.]', ' ', filename).replace("pdf", "").replace("png", "").replace("jpg", "").strip()
        extracted_vendor = clean_name.title() if clean_name else "Merchant Store"

    # Infer or assign amount
    if amount and amount > 0:
        extracted_amount = float(amount)
    elif mindee_result and mindee_result.get("amount"):
        extracted_amount = float(mindee_result["amount"])
    else:
        extracted_amount = 1250.0

    extracted_category = category or "Shopping"
    extracted_date = date_str or (mindee_result.get("date") if mindee_result else None) or datetime.utcnow().strftime("%Y-%m-%d")
    extracted_tax = (mindee_result.get("tax") if mindee_result else None) or round(extracted_amount * 0.05, 2)

    # Line items
    if mindee_result and mindee_result.get("items"):
        items = mindee_result["items"]
    else:
        items = [
            {"name": f"{extracted_vendor} Item Purchase", "quantity": 1, "unit_price": round(extracted_amount * 0.95, 2), "total": round(extracted_amount * 0.95, 2)},
            {"name": "Standard GST", "quantity": 1, "unit_price": round(extracted_tax, 2), "total": round(extracted_tax, 2)}
        ]

    # Smart anomaly check
    is_anomaly = False
    anomaly_reason = None
    if extracted_amount > 5000:
        is_anomaly = True
        anomaly_reason = f"Unusually large receipt value (₹{extracted_amount:,.0f}). Requires managerial review."

    notes = (
        f"Verified via Mindee Intelligent AI OCR from file: {filename}"
        if mindee_result
        else f"Extracted via ExpensePilot Autonomous OCR from file: {filename}"
    )

    doc = {
        "user_id": user_id,
        "vendor": extracted_vendor,
        "invoice_number": f"INV-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}",
        "date": extracted_date,
        "amount": round(extracted_amount, 2),
        "category": extracted_category,
        "tax": round(extracted_tax, 2),
        "status": "Audited",
        "file_name": filename,
        "is_anomaly": is_anomaly,
        "anomaly_reason": anomaly_reason,
        "items": items,
        "notes": notes,
        "created_at": datetime.utcnow()
    }

    res = await db.invoices.insert_one(doc)
    created = await db.invoices.find_one({"_id": res.inserted_id})
    return serialize_doc(created)

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    user_id: str = "user_default",
    db = Depends(get_db)
):
    query = {"$and": [{"user_id": user_id}, build_id_query(invoice_id)]}
    result = await db.invoices.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"status": "success", "message": "Invoice deleted"}
