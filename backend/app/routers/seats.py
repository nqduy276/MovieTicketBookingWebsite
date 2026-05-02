"""
Seat map endpoint — combines GetBookedSeats + GetAvailableSeats from
database_logic_P2.sql.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.models.showtime import Showtime
from app.models.seat import SeatStatus
from app.schemas.seat import SeatOut

router = APIRouter(prefix="/api/seats", tags=["seats"])


def _syn_id(seat_no: str) -> int:
    try:
        return (ord(seat_no[0].upper()) - 64) * 100 + int(seat_no[1:])
    except (ValueError, TypeError, IndexError):
        return 0


@router.get("/showtime/{showtime_id}", response_model=List[SeatOut])
def get_seat_map(showtime_id: int, db: Session = Depends(get_db)):
    showtime = db.query(Showtime).filter(Showtime.Showtime_ID == showtime_id).first()
    if not showtime:
        raise HTTPException(404, "Showtime not found")

    # 1. Available seats (procedure from database_logic_P2.sql)
    available_rows = db.execute(
        text("CALL GetAvailableSeats(:sid)"), {"sid": showtime_id}
    ).mappings().all()
    out: List[SeatOut] = []
    for r in available_rows:
        seat_no = r["Seat_No"]
        try:
            num = int(seat_no[1:])
        except (ValueError, TypeError):
            num = 0
        out.append(SeatOut(
            id=_syn_id(seat_no),
            showtime_id=showtime_id,
            seat_no=seat_no,
            row=seat_no[0] if seat_no else "",
            number=num,
            type=str(r["Seat_Type"]),
            price=float(r["Price"]),
            status=SeatStatus.AVAILABLE,
        ))

    # 2. Booked seats (separate procedure call — needs a fresh cursor)
    booked_rows = db.execute(
        text("CALL GetBookedSeats(:sid)"), {"sid": showtime_id}
    ).mappings().all()
    for r in booked_rows:
        seat_no = r["Seat_No"]
        try:
            num = int(seat_no[1:])
        except (ValueError, TypeError):
            num = 0
        out.append(SeatOut(
            id=_syn_id(seat_no),
            showtime_id=showtime_id,
            seat_no=seat_no,
            row=seat_no[0] if seat_no else "",
            number=num,
            type=str(r["Seat_Type"]),
            price=float(r["Price"]),
            status=SeatStatus.BOOKED,
        ))

    out.sort(key=lambda s: (s.row, s.number))
    return out
