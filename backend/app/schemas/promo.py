"""Pydantic schemas for PROMOTION (strict /create_tables.sql).

Per Calculate_Valid_Discount(): Discount_Value <= 100 means percentage.
"""
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class PromoCreate(BaseModel):
    code: str
    discount_value: float          # <=100 → percent, >100 → flat VND
    expiration_date: Optional[date] = None
    expires_at: Optional[date] = None       # alias accepted by FE
    note: Optional[str] = None              # ignored (no column)
    discount_amount: Optional[float] = None  # legacy
    discount_percent: Optional[float] = None  # legacy
    is_employee_only: bool = False           # ignored


class PromoOut(BaseModel):
    id: str                          # Code is the PK
    code: str
    discount_value: float
    expiration_date: Optional[datetime] = None
    discount_amount: Optional[float] = None
    discount_percent: Optional[float] = None
    is_used: bool = False                    # always False — no column
    is_employee_only: bool = False           # derived from code prefix
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    note: Optional[str] = None


class PromoCheckResponse(BaseModel):
    valid: bool
    message: str
    discount_amount: float = 0.0


def promo_to_out(p) -> PromoOut:
    expires_dt = None
    if p.Expiration_Date:
        expires_dt = datetime.combine(p.Expiration_Date, datetime.min.time())
    val = float(p.Discount_Value or 0)
    is_percent = val <= 100
    return PromoOut(
        id=p.Code,
        code=p.Code,
        discount_value=val,
        expiration_date=expires_dt,
        discount_percent=val if is_percent else None,
        discount_amount=val if not is_percent else None,
        is_used=False,
        is_employee_only=p.Code.upper().startswith("STAFF"),
        expires_at=expires_dt,
        created_at=None,
        note=None,
    )
