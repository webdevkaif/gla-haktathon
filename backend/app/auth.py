import os
import hmac
import hashlib
import base64
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import Header, HTTPException, Depends
from backend.app.config import settings
from backend.app.database import get_db

# ─────────────────────────────────────────────────────────────────────────────
# Password Hashing via PBKDF2-HMAC-SHA256 (Standard, Zero External C-Dependencies)
# ─────────────────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hashes a password with a cryptographically secure random salt using PBKDF2-HMAC-SHA256."""
    salt = os.urandom(16)
    iterations = 100000
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    salt_hex = salt.hex()
    hash_hex = derived.hex()
    return f"pbkdf2_sha256${iterations}${salt_hex}${hash_hex}"

def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verifies a plain password against an encoded PBKDF2-HMAC-SHA256 hash."""
    if not password_hash or not password_hash.startswith("pbkdf2_sha256$"):
        # Direct comparison fallback for unhashed demo legacy strings
        return plain_password == password_hash

    try:
        parts = password_hash.split("$")
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_hash = parts[3]
        derived = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(derived.hex(), expected_hash)
    except Exception:
        return False

# ─────────────────────────────────────────────────────────────────────────────
# JSON Web Token (JWT) Implementation via HMAC-SHA256 (RFC 7519 / RFC 7515)
# ─────────────────────────────────────────────────────────────────────────────

JWT_SECRET = os.getenv("JWT_SECRET", "meridian-expense-pilot-hackathon-2026-secret-key-32bytes")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

def _b64url_decode(encoded: str) -> bytes:
    padding = "=" * ((4 - len(encoded) % 4) % 4)
    return base64.urlsafe_b64decode(encoded + padding)

def create_access_token(payload: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generates a standard HS256 signed JSON Web Token."""
    exp = datetime.utcnow() + (expires_delta or timedelta(hours=JWT_EXPIRATION_HOURS))
    token_payload = dict(payload)
    token_payload["exp"] = int(exp.timestamp())
    token_payload["iat"] = int(datetime.utcnow().timestamp())

    header = {"alg": JWT_ALGORITHM, "typ": "JWT"}
    header_b64 = _b64url_encode(json.dumps(header, separators=(',', ':')).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(token_payload, separators=(',', ':')).encode("utf-8"))

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"

def decode_access_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a standard HS256 signed JSON Web Token."""
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            raise ValueError("Malformed token")

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()

        if not hmac.compare_digest(expected_sig, _b64url_decode(sig_b64)):
            raise ValueError("Invalid signature")

        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if "exp" in payload and datetime.utcnow().timestamp() > payload["exp"]:
            raise ValueError("Token has expired")

        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {str(e)}")

# ─────────────────────────────────────────────────────────────────────────────
# Demo Accounts (7 Users covering all roles and demo stories)
# ─────────────────────────────────────────────────────────────────────────────

DEFAULT_DEMO_PASSWORD = "password123"
DEFAULT_DEMO_HASH = hash_password(DEFAULT_DEMO_PASSWORD)

DEMO_USERS: Dict[str, Dict[str, Any]] = {
    "emp_john": {
        "id": "emp_john",
        "name": "John Doe",
        "email": "john.doe@meridian.com",
        "role": "employee",
        "grade": "L2",
        "manager_id": "mgr_sarah",
        "vendor_id": None,
        "password_hash": DEFAULT_DEMO_HASH,
        "is_sample": True
    },
    "emp_alice": {
        "id": "emp_alice",
        "name": "Alice Smith",
        "email": "alice.smith@meridian.com",
        "role": "employee",
        "grade": "L3",
        "manager_id": "mgr_sarah",
        "vendor_id": None,
        "password_hash": DEFAULT_DEMO_HASH,
        "is_sample": True
    },
    "ven_acme": {
        "id": "ven_acme",
        "name": "Acme Supplies Ltd",
        "email": "billing@acmesupplies.com",
        "role": "vendor",
        "grade": None,
        "manager_id": None,
        "vendor_id": "ven_acme",
        "password_hash": DEFAULT_DEMO_HASH,
        "is_sample": True
    },
    "ven_techcorp": {
        "id": "ven_techcorp",
        "name": "TechCorp Solutions",
        "email": "orders@techcorp.com",
        "role": "vendor",
        "grade": None,
        "manager_id": None,
        "vendor_id": "ven_techcorp",
        "password_hash": DEFAULT_DEMO_HASH,
        "is_sample": True
    },
    "mgr_sarah": {
        "id": "mgr_sarah",
        "name": "Sarah Connor",
        "email": "sarah.connor@meridian.com",
        "role": "manager",
        "grade": "L4",
        "manager_id": "fin_alex",
        "vendor_id": None,
        "password_hash": DEFAULT_DEMO_HASH,
        "is_sample": True
    },
    "fin_alex": {
        "id": "fin_alex",
        "name": "Alex Morgan",
        "email": "finance@meridian.com",
        "role": "finance",
        "grade": "L5",
        "manager_id": None,
        "vendor_id": None,
        "password_hash": DEFAULT_DEMO_HASH,
        "is_sample": True
    },
    "admin_rachel": {
        "id": "admin_rachel",
        "name": "Rachel Green",
        "email": "admin@meridian.com",
        "role": "admin",
        "grade": "L5",
        "manager_id": None,
        "vendor_id": None,
        "password_hash": DEFAULT_DEMO_HASH,
        "is_sample": True
    }
}

DEFAULT_USER_ID = "emp_john"

# ─────────────────────────────────────────────────────────────────────────────
# FastAPI Dependencies: get_current_user & require_role
# ─────────────────────────────────────────────────────────────────────────────

async def get_current_user(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db = Depends(get_db)
) -> Dict[str, Any]:
    """
    Extracts the authenticated user:
    1. Validates standard 'Authorization: Bearer <jwt>' header if present.
    2. Falls back to 'X-User-Id' header for seamless demo user switcher.
    3. Resolves user from MongoDB 'users' collection with fallback to DEMO_USERS.
    """
    user_id = None

    # 1. Bearer Token Check
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub") or payload.get("id")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid Authorization header: {str(e)}")

    # 2. Header Fallback Check
    if not user_id:
        user_id = (x_user_id or DEFAULT_USER_ID).strip()
    if not user_id:
        user_id = DEFAULT_USER_ID

    # 3. Database Lookup
    user_doc = await db.users.find_one({"$or": [{"id": user_id}, {"email": user_id}]})
    if user_doc:
        doc = dict(user_doc)
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    # 4. Fallback to static demo user map
    if user_id in DEMO_USERS:
        return dict(DEMO_USERS[user_id])

    for u in DEMO_USERS.values():
        if u.get("email") == user_id:
            return dict(u)

    # 5. Safe default user
    return {
        "id": user_id,
        "name": user_id.replace("_", " ").title(),
        "role": "employee",
        "grade": "L2",
        "email": f"{user_id}@meridian.com",
        "manager_id": "mgr_sarah",
        "vendor_id": None,
        "is_sample": True
    }

def require_role(allowed_roles: List[str]):
    """FastAPI dependency factory enforcing role-based access control."""
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role", "employee").lower()
        if "all" in [r.lower() for r in allowed_roles]:
            return user
        if user_role not in [r.lower() for r in allowed_roles]:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: Role '{user_role}' is not authorized. Allowed roles: {allowed_roles}"
            )
        return user
    return role_checker
