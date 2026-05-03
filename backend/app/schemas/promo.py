"""Pydantic schemas for PROMOTION + PROMOTION_WALLET (strict schema).

`PromoOut` is built from a (PromotionWallet, Promotion) pair: Code + Owner_ID
come from the wallet, the discount/expiration/name come from the catalog.

Convention:
  Discount_Value <= 100 → percentage off
  Discount_Value > 100  → flat VND off
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class PromoCreate(BaseModel):
    """Create a PROMOTION (catalog template). Employee-only."""
    name: Optional[str] = None
    discount_value: float                    # <=100 → percent, >100 → flat VND
    expiration_date: Optional[date] = None
    expires_at: Optional[date] = None        # alias accepted by FE
    price: Optional[int] = None
    # Optional: if provided, immediately issues a wallet entry with this code
    # to the given owner. Otherwise the catalog row is created standalone and
    # codes get issued via POST /api/promo/issue.
    code: Optional[str] = None
    owner_id: Optional[int] = None
    # Legacy/aliases the FE may send:
    discount_amount: Optional[float] = None
    discount_percent: Optional[float] = None
    is_employee_only: bool = False           # ignored — encoded via prefix


class PromoIssue(BaseModel):
    """Issue a PROMOTION_WALLET row tying a code → catalog promotion → owner."""
    code: str
    promotion_id: int
    owner_id: int


class PromoOut(BaseModel):
    """Stable JSON shape — code is the wallet-side PK; promotion_id is the catalog FK."""
    id: str                                  # = wallet Code (FE treats as id)
    code: str
    promotion_id: Optional[int] = None
    name: Optional[str] = None
    owner_id: Optional[int] = None
    discount_value: float
    expiration_date: Optional[datetime] = None
    discount_amount: Optional[float] = None
    discount_percent: Optional[float] = None
    is_used: bool = False
    is_employee_only: bool = False
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    note: Optional[str] = None


class PromoCheckResponse(BaseModel):
    valid: bool
    message: str
    discount_amount: float = 0.0


def promo_to_out(wallet, promotion=None, *, is_used: bool = False) -> PromoOut:
    """`wallet` is a PromotionWallet; `promotion` defaults to wallet.promotion."""
    p = promotion or wallet.promotion
    expires_dt = None
    if p and p.Expiration_Date:
        expires_dt = datetime.combine(p.Expiration_Date, datetime.min.time())
    val = float(p.Discount_Value or 0) if p else 0.0
    is_percent = val <= 100
    code = wallet.Code
    return PromoOut(
        id=code,
        code=code,
        promotion_id=p.Promotion_ID if p else None,
        name=p.Promotion_Name if p else None,
        owner_id=wallet.Owner_ID,
        discount_value=val,
        expiration_date=expires_dt,
        discount_percent=val if is_percent else None,
        discount_amount=val if not is_percent else None,
        is_used=is_used,
        is_employee_only=code.upper().startswith("STAFF"),
        expires_at=expires_dt,
        created_at=None,
        note=None,
    )
