"""Showtimes router — strict /create_tables.sql.

base_price is *derived* from the cheapest seat in the room (no Base_Price
column). is_archived is always False (no column either) but kept for FE
compatibility.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.showtime import Showtime
from app.models.cinema import Auditorium
from app.models.seat import Seat
from app.models.booking import Ticket
from app.schemas.showtime import ShowtimeOut, ShowtimeCreate
from app.core.deps import require_employee

router = APIRouter(prefix="/api/showtimes", tags=["showtimes"])


def _to_out(s: Showtime, db: Session) -> ShowtimeOut:
    auditorium = s.auditorium
    complex_ = auditorium.complex if auditorium else None
    movie = s.movie
    total_seats = (
        db.query(Seat).filter(Seat.Room_ID == s.Room_ID).count() if auditorium else 0
    )
    sold = db.query(Ticket).filter(Ticket.Showtime_ID == s.Showtime_ID).count()
    cheapest = (
        db.query(func.min(Seat.Price)).filter(Seat.Room_ID == s.Room_ID).scalar()
    ) if auditorium else 0
    return ShowtimeOut(
        id=s.Showtime_ID,
        movie_id=s.Movie_ID,
        cinema_id=complex_.Complex_ID if complex_ else 0,
        room=auditorium.Room_Name if auditorium else None,
        start_time=s.Start_Time,
        end_time=s.End_Time,
        base_price=float(cheapest or 0),
        is_archived=False,
        available_seats=max(0, total_seats - sold),
        cinema_name=complex_.Name if complex_ else None,
        movie_title=movie.Title if movie else None,
        type=auditorium.Screen_Type if auditorium else "2D",
    )


@router.get("", response_model=List[ShowtimeOut])
def list_showtimes(
    movie_id: Optional[int] = None,
    cinema_id: Optional[int] = None,
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    q = db.query(Showtime).filter(Showtime.Start_Time > func.current_timestamp())
    if movie_id is not None:
        q = q.filter(Showtime.Movie_ID == movie_id)
    if cinema_id is not None:
        q = q.join(Auditorium, Auditorium.Room_ID == Showtime.Room_ID).filter(Auditorium.Complex_ID == cinema_id)
    if date:
        try:
            d = datetime.strptime(date, "%Y-%m-%d")
            day_start = d.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            q = q.filter(Showtime.Start_Time >= day_start, Showtime.Start_Time < day_end)
        except ValueError:
            raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD.")
    return [_to_out(s, db) for s in q.order_by(Showtime.Start_Time.asc()).all()]


@router.get("/{showtime_id}", response_model=ShowtimeOut)
def get_showtime(showtime_id: int, db: Session = Depends(get_db)):
    s = db.query(Showtime).filter(Showtime.Showtime_ID == showtime_id).first()
    if not s:
        raise HTTPException(404, "Showtime not found")
    return _to_out(s, db)


@router.post("", response_model=ShowtimeOut, status_code=201)
def create_showtime(payload: ShowtimeCreate, db: Session = Depends(get_db), _=Depends(require_employee)):
    room_id = payload.room_id
    if room_id is None:
        a = db.query(Auditorium).filter(Auditorium.Complex_ID == payload.cinema_id).first()
        if not a:
            raise HTTPException(400, "No auditorium in this complex")
        room_id = a.Room_ID
    end_time = payload.end_time or (payload.start_time + timedelta(minutes=120))
    s = Showtime(
        Movie_ID=payload.movie_id,
        Room_ID=room_id,
        Start_Time=payload.start_time,
        End_Time=end_time,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _to_out(s, db)


@router.delete("/{showtime_id}", status_code=204)
def delete_showtime(showtime_id: int, db: Session = Depends(get_db), _=Depends(require_employee)):
    s = db.query(Showtime).filter(Showtime.Showtime_ID == showtime_id).first()
    if not s:
        raise HTTPException(404, "Showtime not found")
    db.delete(s)
    db.commit()
