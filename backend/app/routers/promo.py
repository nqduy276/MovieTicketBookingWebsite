"""Promotion router — strict /create_tables.sql.

PROMOTION has only Code / Discount_Value / Expiration_Date. Per
Calculate_Valid_Discount(): Discount_Value <= 100 means percentage,
> 100 means flat VND off.

There is no Owner_ID column. We encode user ownership directly in voucher
codes for personal vouchers: 'LP{user_id}-{rand}' or 'VC{user_id}-{rand}'.
'STAFF*' codes are employee-only.
"""
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.promo import Promotion
from app.models.booking import BookingPromo
from app.models.user import CineUser, UserRole
from app.schemas.promo import PromoOut, PromoCreate, PromoCheckResponse, promo_to_out
from app.core.deps import get_current_user, require_employee

router = APIRouter(prefix="/api/promo", tags=["promo"])


def _voucher_owner(code: str) -> Optional[int]:
    if not code or len(code) < 3:
        return None
    if code[:2].upper() not in ("LP", "VC"):
        return None
    body = code[2:]
    if "-" not in body:
        return None
    head = body.split("-", 1)[0]
    try:
        return int(head)
    except ValueError:
        return None


def calculate_discount(promo: Promotion, subtotal: float) -> float:
    val = float(promo.Discount_Value or 0)
    if val <= 0:
        return 0.0
    if val <= 100:
        return round(subtotal * val / 100.0, 2)
    return min(val, subtotal)


def _is_expired(promo: Promotion) -> bool:
    return bool(promo.Expiration_Date and promo.Expiration_Date < date.today())


def _is_used(db: Session, code: str) -> bool:
    """Personal vouchers (LP/VC) are one-time."""
    if not code or code[:2].upper() not in ("LP", "VC"):
        return False
    return db.query(BookingPromo).filter(BookingPromo.Code == code).first() is not None


@router.get("/me", response_model=List[PromoOut])
def my_promos(current: CineUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """Vouchers belonging to the current user (encoded in code prefix)."""
    pattern_lp = f"LP{current.User_ID}-%"
    pattern_vc = f"VC{current.User_ID}-%"
    promos = (
        db.query(Promotion)
        .filter((Promotion.Code.like(pattern_lp)) | (Promotion.Code.like(pattern_vc)))
        .all()
    )
    out = []
    for p in promos:
        if _is_used(db, p.Code):
            continue
        if _is_expired(p):
            continue
        out.append(promo_to_out(p))
    return out


@router.get("/check/{code}", response_model=PromoCheckResponse)
def check_promo(
    code: str,
    subtotal: float = 0.0,
    db: Session = Depends(get_db),
    current: CineUser = Depends(get_current_user),
):
    promo = db.query(Promotion).filter(Promotion.Code == code).first()
    if not promo:
        return PromoCheckResponse(valid=False, message="Promo code not found")
    if _is_expired(promo):
        return PromoCheckResponse(valid=False, message="Promo code expired")
    if _is_used(db, promo.Code):
        return PromoCheckResponse(valid=False, message="Promo code already used")

    if code.upper().startswith("STAFF") and current.role != UserRole.EMPLOYEE:
        return PromoCheckResponse(valid=False, message="Mã này chỉ dành cho nhân viên")

    owner = _voucher_owner(promo.Code)
    if owner is not None and owner != current.User_ID:
        return PromoCheckResponse(valid=False, message="This promo code does not belong to you")

    return PromoCheckResponse(
        valid=True, message="OK",
        discount_amount=calculate_discount(promo, subtotal),
    )


@router.post("", response_model=PromoOut, status_code=201)
def create_promo(payload: PromoCreate, db: Session = Depends(get_db), _=Depends(require_employee)):
    if db.query(Promotion).filter(Promotion.Code == payload.code).first():
        raise HTTPException(400, "Promo code already exists")

    # Resolve discount_value from any of the legacy fields the FE may send.
    val = payload.discount_value
    if val is None:
        val = payload.discount_amount or payload.discount_percent or 0

    p = Promotion(
        Code=payload.code,
        Discount_Value=val,
        Expiration_Date=payload.expiration_date or payload.expires_at or date(2099, 12, 31),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return promo_to_out(p)
