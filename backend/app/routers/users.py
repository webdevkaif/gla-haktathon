from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from backend.app.database import get_db
from backend.app.schemas import UserOut
from backend.app.models import serialize_docs, serialize_doc
from backend.app.auth import get_current_user, DEMO_USERS
from backend.app.services.seed_data import seed_enterprise_data

router = APIRouter(prefix="/api", tags=["Users & Admin"])

@router.get("/users", response_model=List[UserOut])
async def list_users(db = Depends(get_db)):
    """Returns list of available demo users for role switcher."""
    users_cursor = db.users.find({}).sort("id", 1)
    users = await users_cursor.to_list(length=20)
    if not users:
        return [UserOut(**u) for u in DEMO_USERS.values()]
    return serialize_docs(users)

@router.get("/users/me", response_model=UserOut)
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns profile and role of current caller based on X-User-Id header."""
    return serialize_doc(current_user)

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

