"""Loyalty router — strict schema (PROMOTION + PROMOTION_WALLET).

CUSTOMER.Loyalty_Points already exists. There is no LOYALTY_TRANSACTION table
in the strict schema, so the transaction history is *derived* from BOOKING +
Calc_Loyalty_Points_For_Booking().

Redeeming points creates a row in PROMOTION (catalog) plus a row in
PROMOTION_WALLET (per-user code) — owned by the customer. The wallet code
is encoded as 'LP{user_id}-{rand}' for backward compatibility / display,
but ownership is now enforced by PROMOTION_WALLET.Owner_ID, not the prefix.
Per the original convention, Discount_Value <= 100 means percentage off.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta, date
import secrets

from app.database import get_db
from app.models.booking import Booking
from app.models.promo import Promotion, PromotionWallet
from app.models.user import CineUser
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/loyalty", tags=["loyalty"])


class LoyaltyTxnOut(BaseModel):
    id: int
    points: float
    reason: Optional[str] = None
    booking_id: Optional[int] = None
    created_at: datetime


class LoyaltySummary(BaseModel):
    balance: float
    transactions: List[LoyaltyTxnOut]


class RedeemRequest(BaseModel):
    points: int


class RedeemResponse(BaseModel):
    promo_code: str
    discount_percent: float
    expires_at: datetime
    remaining_points: float


@router.get("/me", response_model=LoyaltySummary)
def my_loyalty(current: CineUser = Depends(get_current_user), db: Session = Depends(get_db)):
    txns: List[LoyaltyTxnOut] = []
    bookings = (
        db.query(Booking)
        .filter(Booking.User_ID == current.User_ID)
        .order_by(Booking.Booking_Date.desc())
        .all()
    )
    for b in bookings:
        try:
            row = db.execute(
                text("SELECT Calc_Loyalty_Points_For_Booking(:bid) AS p"),
                {"bid": b.Booking_ID},
            ).mappings().first()
            pts = float(row["p"]) if row and row["p"] is not None else 0.0
        except Exception:
            db.rollback()
            pts = 0.0
        if pts <= 0 or not b.tickets:
            # Cancelled bookings have no tickets — skip; their reversal is
            # already reflected in CUSTOMER.Loyalty_Points.
            continue
        txns.append(LoyaltyTxnOut(
            id=b.Booking_ID,
            points=pts,
            reason="Booking",
            booking_id=b.Booking_ID,
            created_at=b.Booking_Date or datetime.utcnow(),
        ))
    return LoyaltySummary(balance=current.loyalty_points, transactions=txns)


@router.post("/redeem", response_model=RedeemResponse)
def redeem_points(
    payload: RedeemRequest,
    db: Session = Depends(get_db),
    current: CineUser = Depends(get_current_user),
):
    pts = payload.points
    if pts <= 0 or pts % 500 != 0:
        raise HTTPException(400, "Số điểm phải là bội số của 500")
    if not current.customer or current.customer.Loyalty_Points < pts:
        raise HTTPException(400, "Không đủ điểm thưởng")

    discount_percent = (pts / 500) * 10
    if discount_percent > 100:
        raise HTTPException(400, "Giảm giá tối đa là 100%")

    expires = date.today() + timedelta(days=30)
    code = f"LP{current.User_ID}-{secrets.token_hex(4).upper()}"

    # 1) Catalog row — defines the discount value & expiration.
    promotion = Promotion(
        Promotion_Name=f"Loyalty {int(discount_percent)}% off",
        Discount_Value=discount_percent,   # <= 100 → percent
        Expiration_Date=expires,
    )
    db.add(promotion)
    db.flush()                              # need Promotion_ID for the wallet row

    # 2) Wallet row — code owned by this customer.
    wallet = PromotionWallet(
        Code=code,
        Promotion_ID=promotion.Promotion_ID,
        Owner_ID=current.User_ID,
    )
    db.add(wallet)

    current.customer.Loyalty_Points = max(0, int(current.customer.Loyalty_Points) - pts)

    db.commit()

    return RedeemResponse(
        promo_code=code,
        discount_percent=discount_percent,
        expires_at=datetime.combine(expires, datetime.min.time()),
        remaining_points=current.loyalty_points,
    )
