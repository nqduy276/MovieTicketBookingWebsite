"""
Booking router — strict /create_tables.sql schema only.

Booking creation calls the MakeBooking stored procedure (database_logic_P4.sql),
which already:
  * Validates the showtime exists.
  * Sums seat prices + F&B totals.
  * Calls Calculate_Valid_Discount(p_User_ID, p_Promo_Code) and *applies* the
    discount before INSERT — so BOOKING.Total_Amount stored is already the
    final price.
  * Inserts TICKET, BOOKING_FANDB, BOOKING_PROMO rows.
  * Awards loyalty points to customers via Calc_Loyalty_Points_For_Booking.

Promo validation (ownership / expiry / used) lives in the SQL function — we
pre-check here only to surface clean error messages before invoking the SP.
Booking status (UPCOMING/CANCELLED/EXPIRED) and the booking code (BK########)
are derived on read since the strict schema doesn't store them.
"""
import json
import secrets
from datetime import datetime, timedelta, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import CineUser, UserRole
from app.models.booking import Booking, Ticket, BookingFandb, BookingPromo
from app.models.seat import Seat, SeatStatus
from app.models.showtime import Showtime
from app.models.cinema import Auditorium, TheaterComplex
from app.models.food import FandbItem
from app.models.promo import Promotion, PromotionWallet
from app.schemas.booking import BookingCreate, BookingOut, BookingFoodOut
from app.schemas.seat import SeatOut
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


def _decode_seat_id(syn_id: int) -> Optional[tuple[str, int]]:
    """Decode synthetic FE seat id (row*100+number) → (row, number)."""
    if syn_id <= 0:
        return None
    row_idx, num = divmod(syn_id, 100)
    if row_idx < 1 or num < 1:
        return None
    return chr(64 + row_idx), num


def _seat_no_from_id(syn_id: int) -> Optional[str]:
    decoded = _decode_seat_id(syn_id)
    return f"{decoded[0]}{decoded[1]}" if decoded else None


def _booking_code(b: Booking) -> str:
    return f"BK{b.Booking_ID:08d}"


def _booking_to_out(b: Booking, db: Session) -> BookingOut:
    # Status derivation — strict schema has no Status column.
    showtime = b.tickets[0].showtime if b.tickets else None
    has_tickets = len(b.tickets) > 0
    if not has_tickets and float(b.Total_Amount or 0) > 0:
        live_status = "CANCELLED"
    elif showtime and showtime.Start_Time < datetime.utcnow():
        live_status = "EXPIRED"
    else:
        live_status = "UPCOMING"

    # Seat lines (TICKET joined to SEAT)
    seat_total = 0.0
    seats_out: List[SeatOut] = []
    for t in b.tickets:
        s = t.seat
        if not s:
            continue
        try:
            num = int(t.Seat_No[1:])
        except (ValueError, TypeError):
            num = 0
        try:
            syn_id = (ord(t.Seat_No[0].upper()) - 64) * 100 + num
        except (ValueError, TypeError, IndexError):
            syn_id = 0
        price = float(s.Price)
        seat_total += price
        seats_out.append(SeatOut(
            id=syn_id, showtime_id=t.Showtime_ID,
            seat_no=t.Seat_No,
            row=t.Seat_No[0] if t.Seat_No else "",
            number=num, type=str(s.Seat_Type),
            price=price, status=SeatStatus.BOOKED,
        ))

    # F&B lines
    food_total = 0.0
    foods_out: List[BookingFoodOut] = []
    for f in b.foods:
        unit = float(f.item.Price) if f.item else 0.0
        food_total += unit * (f.Quantity or 0)
        foods_out.append(BookingFoodOut(
            food_id=f.Item_ID, quantity=f.Quantity,
            unit_price=unit,
            name=f.item.Name if f.item else None,
        ))

    # Discount: MakeBooking has already subtracted it from Total_Amount, so
    # discount = subtotal - stored_total (clamped at 0).
    promo_code = b.promos[0].Code if b.promos else None
    subtotal = seat_total + food_total
    stored_total = float(b.Total_Amount or 0)
    discount = max(0.0, subtotal - stored_total)
    total_after = stored_total

    # Loyalty points awarded (via SQL function, customers only)
    points = 0.0
    try:
        row = db.execute(
            text("SELECT Calc_Loyalty_Points_For_Booking(:bid) AS p"),
            {"bid": b.Booking_ID},
        ).mappings().first()
        if row and row["p"] is not None:
            points = float(row["p"])
            if points < 0:
                points = 0.0
    except Exception:
        db.rollback()

    movie_title = None
    cinema_name = None
    showtime_start = None
    if showtime:
        showtime_start = showtime.Start_Time
        if showtime.movie:
            movie_title = showtime.movie.Title
        if showtime.auditorium and showtime.auditorium.complex:
            cinema_name = showtime.auditorium.complex.Name

    return BookingOut(
        id=b.Booking_ID,
        code=_booking_code(b),
        user_id=b.User_ID,
        showtime_id=showtime.Showtime_ID if showtime else 0,
        seat_total=seat_total,
        food_total=food_total,
        discount=discount,
        total=total_after,
        promo_code=promo_code,
        loyalty_points_awarded=points,
        status=live_status,
        created_at=b.Booking_Date or datetime.utcnow(),
        cancelled_at=None,
        seats=seats_out,
        foods=foods_out,
        movie_title=movie_title,
        cinema_name=cinema_name,
        showtime_start=showtime_start,
    )


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current: CineUser = Depends(get_current_user),
):
    # 1. Validate showtime is in the future
    showtime = db.query(Showtime).filter(Showtime.Showtime_ID == payload.showtime_id).first()
    if not showtime or showtime.Start_Time <= datetime.utcnow():
        raise HTTPException(400, "Showtime is not available")

    if not payload.seat_ids:
        raise HTTPException(400, "At least one seat must be selected")

    # 2. Decode synthetic seat ids → seat_no strings, validate they exist in the room
    seat_nos: List[str] = []
    for sid in payload.seat_ids:
        sn = _seat_no_from_id(sid)
        if not sn:
            raise HTTPException(400, f"Invalid seat id {sid}")
        seat_nos.append(sn)

    valid = (
        db.query(Seat.Seat_No)
        .filter(Seat.Room_ID == showtime.Room_ID, Seat.Seat_No.in_(seat_nos))
        .all()
    )
    valid_set = {v[0] for v in valid}
    missing = [s for s in seat_nos if s not in valid_set]
    if missing:
        raise HTTPException(400, f"Seats not in this room: {', '.join(missing)}")

    # 3. None already in TICKET for this showtime (the SP would also fail if so,
    # but we want a 409 with a clean message).
    taken = (
        db.query(Ticket.Seat_No)
        .filter(Ticket.Showtime_ID == showtime.Showtime_ID, Ticket.Seat_No.in_(seat_nos))
        .first()
    )
    if taken:
        raise HTTPException(409, f"Seat {taken[0]} is already booked")

    # 4. Promo eligibility — pre-check against PROMOTION_WALLET so we surface a
    # clean 400 before invoking MakeBooking. The SP will also call
    # Calculate_Valid_Discount which re-validates ownership / expiry / used.
    promo_code = (payload.promo_code or "").strip() or None
    if promo_code:
        wallet = (
            db.query(PromotionWallet)
            .filter(PromotionWallet.Code == promo_code)
            .first()
        )
        if not wallet:
            raise HTTPException(400, "Promo code not found")
        if wallet.Owner_ID != current.User_ID:
            raise HTTPException(400, "Promo code does not belong to you")
        # STAFF prefix → employee-only (regardless of Owner_ID)
        if promo_code.upper().startswith("STAFF") and current.role != UserRole.EMPLOYEE:
            raise HTTPException(403, "Mã này chỉ dành cho nhân viên")
        # One-time vouchers — fail if already attached to a previous booking
        used = db.query(BookingPromo).filter(BookingPromo.Code == promo_code).first()
        if used:
            raise HTTPException(400, "Promo code already used")
        promotion = wallet.promotion
        if promotion and promotion.Expiration_Date and promotion.Expiration_Date < date.today():
            raise HTTPException(400, "Promo code expired")

    # 5. Call MakeBooking. It computes Total_Amount (with discount already applied),
    # inserts TICKET / BOOKING_FANDB / BOOKING_PROMO, and awards loyalty points.
    seats_json = json.dumps(seat_nos)
    fandb_json = json.dumps([{"id": fi.food_id, "qty": fi.quantity} for fi in payload.food_items])
    try:
        cur = db.execute(
            text("CALL MakeBooking(:uid, :sid, :seats, :fandb, :promo)"),
            {
                "uid": current.User_ID,
                "sid": showtime.Showtime_ID,
                "seats": seats_json,
                "fandb": fandb_json,
                "promo": promo_code,
            },
        )
        result = cur.mappings().first()
        # consume any remaining result sets so the connection is clean
        try:
            while cur.cursor.nextset():
                pass
        except Exception:
            pass
        db.commit()
    except Exception as e:
        db.rollback()
        # MySQL signals from MakeBooking arrive as 1644
        msg = str(getattr(e, "orig", e))
        raise HTTPException(400, msg)

    booking_id = int(result["Booking_ID"]) if result else None
    if not booking_id:
        # Fallback — find latest for this user
        b = (
            db.query(Booking)
            .filter(Booking.User_ID == current.User_ID)
            .order_by(Booking.Booking_ID.desc())
            .first()
        )
        if not b:
            raise HTTPException(500, "Booking created but could not be retrieved")
        booking_id = b.Booking_ID

    booking = db.query(Booking).filter(Booking.Booking_ID == booking_id).first()
    if not booking:
        raise HTTPException(500, "Booking not found after creation")
    return _booking_to_out(booking, db)


@router.get("/me", response_model=List[BookingOut])
def my_bookings(db: Session = Depends(get_db), current: CineUser = Depends(get_current_user)):
    bookings = (
        db.query(Booking)
        .filter(Booking.User_ID == current.User_ID)
        .order_by(Booking.Booking_Date.desc())
        .all()
    )
    return [_booking_to_out(b, db) for b in bookings]


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current: CineUser = Depends(get_current_user),
):
    b = db.query(Booking).filter(Booking.Booking_ID == booking_id).first()
    if not b:
        raise HTTPException(404, "Booking not found")
    if b.User_ID != current.User_ID and current.role != UserRole.EMPLOYEE:
        raise HTTPException(403, "Forbidden")
    return _booking_to_out(b, db)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current: CineUser = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.Booking_ID == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.User_ID != current.User_ID:
        raise HTTPException(403, "Forbidden")

    if not booking.tickets:
        raise HTTPException(400, "Booking already cancelled")

    showtime = booking.tickets[0].showtime
    if showtime and showtime.Start_Time < datetime.utcnow():
        raise HTTPException(400, "Cannot cancel a past/expired booking")

    # Snapshot total before deleting tickets (used for the refund voucher).
    total = float(booking.Total_Amount or 0)

    # 1. Remove TICKET rows — frees the seats. Strict schema has no Status column,
    # so the booking row stays in BOOKING with its Total_Amount intact.
    for t in list(booking.tickets):
        db.delete(t)

    # 2. Refund voucher — create a Promotion (catalog) + PromotionWallet (per-user code).
    if total > 0:
        voucher_code = f"VC{current.User_ID}-{secrets.token_hex(4).upper()}"
        promotion = Promotion(
            Promotion_Name=f"Refund voucher (booking #{booking.Booking_ID})",
            Discount_Value=total,           # > 100 → flat amount per discount convention
            Expiration_Date=date.today() + timedelta(days=180),
        )
        db.add(promotion)
        db.flush()
        wallet = PromotionWallet(
            Code=voucher_code,
            Promotion_ID=promotion.Promotion_ID,
            Owner_ID=current.User_ID,
        )
        db.add(wallet)

    db.commit()
    db.refresh(booking)
    return _booking_to_out(booking, db)
