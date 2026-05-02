"""
Auth router — uses your stored procedures.

* POST /api/auth/register  → CALL CreateCustomer / CreateStaff
* POST /api/auth/login     → SELECT + bcrypt verify (the LoginUser proc compares
                              plain text and is kept in the DB only as a demo)

The BeforeInsertUser trigger normalises email/names and rejects passwords < 6 chars.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, OperationalError

from app.database import get_db
from app.models.user import CineUser, UserRole
from app.schemas.user import (
    UserCreate, UserOut, LoginRequest, Token, UserUpdate, cineuser_to_out,
)
from app.core.security import create_access_token
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _split_full_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or "").strip().split()
    if not parts: return ("", "")
    if len(parts) == 1: return (parts[0], "")
    return (" ".join(parts[:-1]), parts[-1])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    # Accept either (first_name, last_name) directly OR full_name from older FE.
    first = payload.first_name
    last = payload.last_name
    if (not first or not last) and payload.full_name:
        first, last = _split_full_name(payload.full_name)
    first = first or "User"
    last = last or ""

    # Do not hash the password to match SQL trigger logic (LENGTH >= 6 check) and LoginUser procedure.
    plaintext_password = payload.password

    try:
        if payload.role == UserRole.EMPLOYEE:
            db.execute(
                text("CALL CreateStaff(:e, :p, :fn, :ln, :role, :mgr)"),
                {"e": payload.email, "p": plaintext_password, "fn": first, "ln": last,
                 "role": payload.job_role or "Staff", "mgr": None},
            )
        else:
            db.execute(
                text("CALL CreateCustomer(:e, :p, :fn, :ln, :dob)"),
                {"e": payload.email, "p": plaintext_password, "fn": first, "ln": last,
                 "dob": payload.date_of_birth},
            )
        db.commit()
    except OperationalError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e.orig) if hasattr(e, "orig") else str(e))
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e.orig))

    if payload.phone:
        try:
            db.execute(text("CALL AddPhoneByEmail(:e, :p)"),
                       {"e": payload.email, "p": payload.phone})
            db.commit()
        except Exception:
            db.rollback()

    user = db.query(CineUser).filter(CineUser.Email == payload.email.lower()).first()
    if not user:
        raise HTTPException(500, "Registration succeeded but user not found")
    return cineuser_to_out(user)


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Login takes email + password. Username (if sent) is ignored."""
    try:
        result = db.execute(
            text("CALL LoginUser(:e, :p)"),
            {"e": payload.email.lower(), "p": payload.password}
        ).fetchone()
        user_id = result[0]
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = db.query(CineUser).filter(CineUser.User_ID == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    token = create_access_token(subject=user.Email, role=user.role.value)
    return Token(access_token=token, user=cineuser_to_out(user))


@router.get("/me", response_model=UserOut)
def me(current: CineUser = Depends(get_current_user)):
    return cineuser_to_out(current)


@router.put("/me", response_model=UserOut)
def update_profile(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current: CineUser = Depends(get_current_user),
):
    if payload.first_name is not None:
        current.First_Name = payload.first_name
    if payload.last_name is not None:
        current.Last_Name = payload.last_name
    if payload.phone is not None:
        db.execute(text("DELETE FROM USER_PHONE WHERE User_ID = :uid"),
                   {"uid": current.User_ID})
        if payload.phone.strip():
            db.execute(
                text("INSERT INTO USER_PHONE (User_ID, Phone_Number) VALUES (:uid, :ph)"),
                {"uid": current.User_ID, "ph": payload.phone.strip()},
            )
    db.commit()
    db.refresh(current)
    return cineuser_to_out(current)
