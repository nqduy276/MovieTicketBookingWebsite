from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.cinema import TheaterComplex, Auditorium
from app.models.showtime import Showtime
from app.schemas.cinema import CinemaOut, CinemaCreate, complex_to_out
from app.core.deps import require_admin

router = APIRouter(prefix="/api/cinemas", tags=["cinemas"])


@router.get("", response_model=List[CinemaOut])
def list_cinemas(db: Session = Depends(get_db)):
    return [complex_to_out(c) for c in db.query(TheaterComplex).all()]


@router.get("/by-movie/{movie_id}", response_model=List[CinemaOut])
def list_cinemas_for_movie(movie_id: int, db: Session = Depends(get_db)):
    """Theaters that have at least one upcoming showtime for this movie."""
    complexes = (
        db.query(TheaterComplex)
        .join(Auditorium, Auditorium.Complex_ID == TheaterComplex.Complex_ID)
        .join(Showtime, Showtime.Room_ID == Auditorium.Room_ID)
        .filter(
            Showtime.Movie_ID == movie_id,
            Showtime.Start_Time > func.current_timestamp(),
        )
        .distinct()
        .all()
    )
    return [complex_to_out(c) for c in complexes]


@router.post("", response_model=CinemaOut, status_code=201)
def create_cinema(payload: CinemaCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    c = TheaterComplex(
        Name=payload.name, Street=payload.street,
        District=payload.district, City=payload.city,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return complex_to_out(c)
