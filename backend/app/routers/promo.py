"""Promotion router — strict /create_tables.sql.

Two tables:
  * PROMOTION         — catalog template (Promotion_ID, Name, Discount_Value, Expiration_Date)
  * PROMOTION_WALLET  — per-user codes (Code, Promotion_ID, Owner_ID)

A user "owns" a code via PROMOTION_WALLET.Owner_ID. Codes prefixed with STAFF*
are restricted to employees (regardless of Owner_ID).

The SQL function Calculate_Valid_Discount(p_User_ID, p_Code) is the
authoritative validator (ownership / expiry / used) — invoked inside
MakeBooking. We mirror its checks in Python here so the /check endpoint can
return a clean PromoCheckResponse without throwing through SIGNAL.
"""
from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.promo import Promotion, PromotionWallet
from app.models.booking import BookingPromo
from app.models.user import CineUser, UserRole
from app.schemas.promo import (
    PromoOut, PromoCreate, PromoIssue, PromoCheckResponse, promo_to_out,
)
from app.core.deps import get_current_user, require_admin

router = APIRouter(prefix="/api/promo", tags=["promo"])


def calculate_discount(promotion: Promotion, subtotal: float) -> float:
    val = float(promotion.Discount_Value or 0)
    if val <= 0:
        return 0.0
    if val <= 100:
        return round(subtotal * val / 100.0, 2)
    return min(val, subtotal)


def _is_expired(promotion: Promotion) -> bool:
    return bool(promotion.Expiration_Date and promotion.Expiration_Date < date.today())


def _is_used(db: Session, code: str) -> bool:
    """A wallet code is single-use — once attached to a booking it's consumed."""
    return db.query(BookingPromo).filter(BookingPromo.Code == code).first() is not None


@router.get("/me", response_model=List[PromoOut])
def my_promos(current: CineUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """Wallet entries owned by the current user, excluding used / expired codes."""
    rows = (
        db.query(PromotionWallet)
        .options(joinedload(PromotionWallet.promotion))
        .filter(PromotionWallet.Owner_ID == current.User_ID)
        .all()
    )
    out: List[PromoOut] = []
    for w in rows:
        if not w.promotion or _is_expired(w.promotion):
            continue
        if _is_used(db, w.Code):
            continue
        out.append(promo_to_out(w))
    return out


@router.get("/check/{code}", response_model=PromoCheckResponse)
def check_promo(
    code: str,
    subtotal: float = 0.0,
    db: Session = Depends(get_db),
    current: CineUser = Depends(get_current_user),
):
    wallet = (
        db.query(PromotionWallet)
        .options(joinedload(PromotionWallet.promotion))
        .filter(PromotionWallet.Code == code)
        .first()
    )
    if not wallet or not wallet.promotion:
        return PromoCheckResponse(valid=False, message="Promo code not found")
    if _is_expired(wallet.promotion):
        return PromoCheckResponse(valid=False, message="Promo code expired")
    if _is_used(db, wallet.Code):
        return PromoCheckResponse(valid=False, message="Promo code already used")

    if code.upper().startswith("STAFF") and current.role != UserRole.EMPLOYEE:
        return PromoCheckResponse(valid=False, message="Mã này chỉ dành cho nhân viên")

    if wallet.Owner_ID != current.User_ID:
        return PromoCheckResponse(valid=False, message="This promo code does not belong to you")

    return PromoCheckResponse(
        valid=True, message="OK",
        discount_amount=calculate_discount(wallet.promotion, subtotal),
    )


@router.post("", response_model=PromoOut, status_code=201)
def create_promo(payload: PromoCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Create a PROMOTION (catalog). Optionally also issue one wallet entry."""
    val = payload.discount_value
    if val is None:
        val = payload.discount_amount or payload.discount_percent or 0

    promotion = Promotion(
        Promotion_Name=payload.name or "Promotion",
        Price=payload.price,
        Discount_Value=val,
        Expiration_Date=payload.expiration_date or payload.expires_at or date(2099, 12, 31),
    )
    db.add(promotion)
    db.flush()

    # If FE supplies code+owner_id, also issue a wallet entry.
    wallet = None
    if payload.code:
        if not payload.owner_id:
            raise HTTPException(400, "owner_id is required when issuing a code")
        if db.query(PromotionWallet).filter(PromotionWallet.Code == payload.code).first():
            raise HTTPException(400, "Promo code already exists")
        wallet = PromotionWallet(
            Code=payload.code,
            Promotion_ID=promotion.Promotion_ID,
            Owner_ID=payload.owner_id,
        )
        db.add(wallet)

    db.commit()
    if wallet:
        db.refresh(wallet)
        return promo_to_out(wallet, promotion)

    # No wallet entry — return a synthetic PromoOut (id = "PROMO{id}").
    db.refresh(promotion)
    return PromoOut(
        id=f"PROMO{promotion.Promotion_ID}",
        code=f"PROMO{promotion.Promotion_ID}",
        promotion_id=promotion.Promotion_ID,
        name=promotion.Promotion_Name,
        owner_id=None,
        discount_value=float(promotion.Discount_Value or 0),
        is_employee_only=False,
    )


@router.post("/issue", response_model=PromoOut, status_code=201)
def issue_wallet_code(
    payload: PromoIssue,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Issue a PROMOTION_WALLET row (Code + Promotion_ID + Owner_ID)."""
    promotion = db.query(Promotion).filter(Promotion.Promotion_ID == payload.promotion_id).first()
    if not promotion:
        raise HTTPException(404, "Promotion not found")
    if db.query(PromotionWallet).filter(PromotionWallet.Code == payload.code).first():
        raise HTTPException(400, "Promo code already exists")
    wallet = PromotionWallet(
        Code=payload.code,
        Promotion_ID=payload.promotion_id,
        Owner_ID=payload.owner_id,
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return promo_to_out(wallet, promotion)
