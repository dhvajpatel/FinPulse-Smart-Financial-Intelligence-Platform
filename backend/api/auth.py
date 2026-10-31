"""
Auth API — register, login, reset-password.

All password hashing uses bcrypt via passlib.
Tokens are signed JWTs (HS256) via python-jose.
"""
import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt
import bcrypt

from database.connection import get_db
from database import models
from database.schemas import RegisterRequest, LoginRequest, ResetPasswordRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── config ────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "finpulse-dev-secret-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 72          # 3 days


# ── helpers ───────────────────────────────────────────────────────────────────

def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _make_token(user_id: int, email: str, is_admin: bool) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "email": email, "admin": is_admin, "exp": exp}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _customer_id(user_id: int) -> str:
    return f"U{user_id}"


# ── routes ────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new account. Returns a JWT on success."""
    if not body.name.strip():
        raise HTTPException(status_code=422, detail="Name cannot be empty.")
    if not body.email.strip() or "@" not in body.email:
        raise HTTPException(status_code=422, detail="Invalid email address.")
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")

    existing = db.query(models.User).filter_by(email=body.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = models.User(
        email=body.email.lower().strip(),
        hashed_password=_hash(body.password),
        name=body.name.strip(),
        is_admin=False,
        created_at=_now_str(),
    )
    db.add(user)
    db.flush()  # get the auto-generated id before commit

    # Create the matching Customer profile row
    cid = _customer_id(user.id)
    customer = models.Customer(
        customer_id=cid,
        name=body.name.strip(),
        email=body.email.lower().strip(),
        created_at=_now_str(),
        # Sensible defaults — user fills these in from Profile page
        credit_score=650,
        monthly_income=0.0,
        employment_years=0.0,
    )
    db.add(customer)
    db.commit()
    db.refresh(user)

    token = _make_token(user.id, user.email, user.is_admin)
    return TokenResponse(
        access_token=token,
        customer_id=cid,
        name=user.name,
        email=user.email,
        is_admin=user.is_admin,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email + password. Returns a JWT."""
    email = body.email.lower().strip()

    # ── Admin shortcut ────────────────────────────────────────────────────────
    # A hardcoded admin account that does NOT require a DB entry.
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@finpulse.app")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
    if email == ADMIN_EMAIL.lower() and body.password == ADMIN_PASSWORD:
        token = _make_token(0, email, is_admin=True)
        return TokenResponse(
            access_token=token,
            customer_id="admin",
            name="Admin",
            email=email,
            is_admin=True,
        )

    user = db.query(models.User).filter_by(email=email).first()
    if not user or not _verify(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = _make_token(user.id, user.email, user.is_admin)
    return TokenResponse(
        access_token=token,
        customer_id=_customer_id(user.id),
        name=user.name,
        email=user.email,
        is_admin=user.is_admin,
    )


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset a user's password by email (no email verification — demo only)."""
    if len(body.new_password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters.")

    user = db.query(models.User).filter_by(email=body.email.lower().strip()).first()
    if not user:
        # Return 200 regardless to avoid user-enumeration
        return {"message": "If that email exists, the password has been updated."}

    user.hashed_password = _hash(body.new_password)
    db.commit()
    return {"message": "Password updated successfully. You can now log in."}
