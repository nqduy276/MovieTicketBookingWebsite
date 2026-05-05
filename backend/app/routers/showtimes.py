"""Showtimes router — strict /create_tables.sql.

base_price is *derived* from the cheapest seat in the room (no Base_Price
column). is_archived is always False (no column either) but kept for FE
compatibility.
"""
from datetime import datetime, timedelta, time as dtime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.database import get_db
from app.models.showtime import Showtime
from app.models.cinema import Auditorium, TheaterComplex
from app.models.movie import Movie
from app.models.seat import Seat
from app.models.booking import Ticket
from app.schemas.showtime import ShowtimeOut, ShowtimeCreate, ShowtimeUpdate
from app.core.deps import require_admin

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


@router.get("/by-procedure")
def list_via_procedure(
    movie_name: str = Query("", description="Substring match on movie title"),
    theater_name: str = Query("", description="Substring match on theater complex name"),
    date: str = Query(..., description="YYYY-MM-DD — required by GetShowtimesByMovieTheaterAndDate"),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """List showtimes via stored procedure GetShowtimesByMovieTheaterAndDate.

    The procedure returns rows without Showtime_ID, so we re-key each row to its
    underlying Showtime_ID so the admin UI can edit/delete by ID.
    """
    try:
        d = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use YYYY-MM-DD.")

    rs = db.execute(
        text("CALL GetShowtimesByMovieTheaterAndDate(:m, :t, :d)"),
        {"m": movie_name or "", "t": theater_name or "", "d": d},
    )
    proc_rows = [dict(r._mapping) for r in rs.fetchall()]
    try:
        rs.close()
    except Exception:
        pass

    if not proc_rows:
        return []

    day_start = datetime.combine(d, dtime.min)
    day_end = day_start + timedelta(days=1)
    candidates = (
        db.query(Showtime, Movie, Auditorium, TheaterComplex)
        .join(Movie, Movie.Movie_ID == Showtime.Movie_ID)
        .join(Auditorium, Auditorium.Room_ID == Showtime.Room_ID)
        .join(TheaterComplex, TheaterComplex.Complex_ID == Auditorium.Complex_ID)
        .filter(Showtime.Start_Time >= day_start, Showtime.Start_Time < day_end)
        .filter(Showtime.Start_Time > func.current_timestamp())
        .all()
    )
    lookup = {}
    for s, m, a, c in candidates:
        key = (m.Title, c.Name, a.Room_Name, s.Start_Time.time())
        lookup[key] = (s, m, a, c)

    out = []
    for r in proc_rows:
        st_val = r.get("Start_Time")
        if isinstance(st_val, timedelta):
            secs = int(st_val.total_seconds())
            t = dtime(secs // 3600, (secs % 3600) // 60, secs % 60)
        elif isinstance(st_val, dtime):
            t = st_val
        else:
            continue
        key = (r.get("Movie_Title"), r.get("Theater_Name"), r.get("Room_Name"), t)
        match = lookup.get(key)
        if not match:
            continue
        s, m, a, c = match
        total_seats = db.query(Seat).filter(Seat.Room_ID == s.Room_ID).count()
        sold = db.query(Ticket).filter(Ticket.Showtime_ID == s.Showtime_ID).count()
        cheapest = (
            db.query(func.min(Seat.Price)).filter(Seat.Room_ID == s.Room_ID).scalar()
        )
        out.append({
            "id": s.Showtime_ID,
            "movie_id": s.Movie_ID,
            "cinema_id": c.Complex_ID,
            "room_id": s.Room_ID,
            "movie_title": r.get("Movie_Title"),
            "theater_name": r.get("Theater_Name"),
            "room_name": r.get("Room_Name"),
            "screen_type": r.get("Screen_Type"),
            "start_time": s.Start_Time.isoformat(),
            "end_time": s.End_Time.isoformat() if s.End_Time else None,
            "base_price": float(cheapest or 0),
            "available_seats": max(0, total_seats - sold),
            "tickets_sold": sold,
        })
    return out


@router.get("/{showtime_id}", response_model=ShowtimeOut)
def get_showtime(showtime_id: int, db: Session = Depends(get_db)):
    s = db.query(Showtime).filter(Showtime.Showtime_ID == showtime_id).first()
    if not s:
        raise HTTPException(404, "Showtime not found")
    return _to_out(s, db)


@router.post("", response_model=ShowtimeOut, status_code=201)
def create_showtime(payload: ShowtimeCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
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


@router.put("/{showtime_id}", response_model=ShowtimeOut)
def update_showtime(
    showtime_id: int,
    payload: ShowtimeUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    s = db.query(Showtime).filter(Showtime.Showtime_ID == showtime_id).first()
    if not s:
        raise HTTPException(404, "Showtime not found")

    has_tickets = (
        db.query(Ticket).filter(Ticket.Showtime_ID == showtime_id).first() is not None
    )
    wants_schedule_change = (
        payload.start_time is not None
        or payload.end_time is not None
        or payload.room_id is not None
        or payload.cinema_id is not None
    )
    if has_tickets and wants_schedule_change:
        raise HTTPException(
            409,
            "Cannot change time or room: tickets have already been booked for this showtime.",
        )

    if payload.movie_id is not None:
        if not db.query(Movie).filter(Movie.Movie_ID == payload.movie_id).first():
            raise HTTPException(400, "Movie not found.")
        s.Movie_ID = payload.movie_id

    if payload.room_id is not None:
        if not db.query(Auditorium).filter(Auditorium.Room_ID == payload.room_id).first():
            raise HTTPException(400, "Auditorium not found.")
        s.Room_ID = payload.room_id
    elif payload.cinema_id is not None:
        a = db.query(Auditorium).filter(Auditorium.Complex_ID == payload.cinema_id).first()
        if not a:
            raise HTTPException(400, "No auditorium in this complex.")
        s.Room_ID = a.Room_ID

    if payload.start_time is not None:
        s.Start_Time = payload.start_time
    if payload.end_time is not None:
        s.End_Time = payload.end_time
    elif payload.start_time is not None:
        s.End_Time = payload.start_time + timedelta(minutes=120)

    if s.End_Time <= s.Start_Time:
        raise HTTPException(400, "End time must be after start time.")

    db.commit()
    db.refresh(s)
    return _to_out(s, db)


@router.delete("/{showtime_id}", status_code=204)
def delete_showtime(showtime_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    s = db.query(Showtime).filter(Showtime.Showtime_ID == showtime_id).first()
    if not s:
        raise HTTPException(404, "Showtime not found")
    has_tickets = (
        db.query(Ticket).filter(Ticket.Showtime_ID == showtime_id).first() is not None
    )
    if has_tickets:
        raise HTTPException(
            409,
            "Cannot delete: tickets have already been booked for this showtime.",
        )
    db.delete(s)
    db.commit()
