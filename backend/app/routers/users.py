from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.database import get_db
from backend.app.schemas import UserOut, LoginRequest, TokenResponse, DemoAccountOut
from backend.app.models import serialize_docs, serialize_doc
from backend.app.auth import (
    get_current_user, 
    DEMO_USERS, 
    verify_password, 
    create_access_token,
    DEFAULT_DEMO_PASSWORD
)
from backend.app.services.seed_data import seed_enterprise_data

router = APIRouter(prefix="/api", tags=["Users & Authentication"])

@router.post("/auth/login", response_model=TokenResponse)
@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db = Depends(get_db)):
    """
    Real JWT authentication endpoint:
    Validates username/email and password against users collection (or demo accounts),
    and issues an RFC 7519 signed JWT access token.
    """
    ident = payload.username.strip()
    user_doc = await db.users.find_one({"$or": [{"email": ident}, {"id": ident}]})

    if not user_doc:
        # Check static demo map
        if ident in DEMO_USERS:
            user_doc = dict(DEMO_USERS[ident])
        else:
            for u in DEMO_USERS.values():
                if u.get("email") == ident:
                    user_doc = dict(u)
                    break

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. User not found."
        )

    pwd_hash = user_doc.get("password_hash")
    if not verify_password(payload.password, pwd_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Password verification failed."
        )

    # Issue JWT token
    token_claims = {
        "sub": user_doc.get("id"),
        "id": user_doc.get("id"),
        "name": user_doc.get("name"),
        "role": user_doc.get("role", "employee"),
        "email": user_doc.get("email"),
        "grade": user_doc.get("grade"),
        "vendor_id": user_doc.get("vendor_id")
    }
    access_token = create_access_token(token_claims)

    clean_user = serialize_doc(user_doc)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserOut(**clean_user)
    )

@router.get("/auth/me", response_model=UserOut)
@router.get("/users/me", response_model=UserOut)
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns profile and role of current caller based on JWT Bearer token or X-User-Id header."""
    return serialize_doc(current_user)

@router.get("/auth/demo-accounts", response_model=List[DemoAccountOut])
async def list_demo_accounts():
    """
    Returns the 7 pre-configured demo accounts specifically for hackathon judges
    with their roles, credentials, and descriptions clearly labelled.
    """
    descriptions = {
        "emp_john": "Employee (Sales, Grade L2) — submits travel/meal claims; cannot access vendor invoices.",
        "emp_alice": "Employee (Product, Grade L3) — submits equipment/hotel claims.",
        "ven_acme": "External Vendor (Acme Supplies) — views Acme invoices; cannot access internal employee claims.",
        "ven_techcorp": "External Vendor (TechCorp Solutions) — views TechCorp invoices; isolated vendor scope.",
        "mgr_sarah": "Line Manager (Grade L4) — reviews team claims, approves/rejects, delegates.",
        "fin_alex": "Finance Controller (Grade L5) — full executive access, resolves escalations, secondary approvals.",
        "admin_rachel": "System Administrator (Grade L5) — comprehensive auditing and data governance."
    }

    results = []
    for uid, u in DEMO_USERS.items():
        results.append(DemoAccountOut(
            id=u["id"],
            name=u["name"],
            email=u["email"],
            role=u["role"],
            grade=u.get("grade"),
            vendor_id=u.get("vendor_id"),
            password=DEFAULT_DEMO_PASSWORD,
            description=descriptions.get(uid, f"{u['role'].title()} account")
        ))
    return results

@router.get("/users", response_model=List[UserOut])
async def list_users(db = Depends(get_db)):
    """Returns list of available demo users."""
    users_cursor = db.users.find({}).sort("id", 1)
    users = await users_cursor.to_list(length=20)
    if not users:
        return [UserOut(**u) for u in DEMO_USERS.values()]
    return serialize_docs(users)

@router.post("/admin/seed")
async def reseed_database(db = Depends(get_db)):
    """Reseeds fresh Meridian enterprise sample data."""
    counts = await seed_enterprise_data(db)
    return {
        "status": "success",
        "message": "Enterprise sample data successfully seeded",
        "counts": counts,
        "sample_data_badge": True
    }
