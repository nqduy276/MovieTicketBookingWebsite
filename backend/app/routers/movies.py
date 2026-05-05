from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.movie import Movie, MovieGenre
from app.models.showtime import Showtime
from app.schemas.movie import MovieOut, MovieCreate, MovieUpdate, movie_to_out
from app.core.deps import require_admin

router = APIRouter(prefix="/api/movies", tags=["movies"])


@router.get("", response_model=List[MovieOut])
def list_movies(db: Session = Depends(get_db)):
    """List all movies (the strict schema has no Is_Active flag)."""
    return [movie_to_out(m) for m in db.query(Movie).all()]


@router.get("/{movie_id}", response_model=MovieOut)
def get_movie(movie_id: int, db: Session = Depends(get_db)):
    m = db.query(Movie).filter(Movie.Movie_ID == movie_id).first()
    if not m:
        raise HTTPException(404, "Movie not found")
    return movie_to_out(m)


def _validate_movie_payload(title=None, duration=None, age_restriction=None):
    if title is not None:
        if not title.strip():
            raise HTTPException(400, "Title cannot be empty.")
        if len(title) > 255:
            raise HTTPException(400, "Title must be 255 characters or fewer.")
    if duration is not None and duration <= 0:
        raise HTTPException(400, "Duration must be a positive number of minutes.")
    if age_restriction is not None and age_restriction < 0:
        raise HTTPException(400, "Age restriction cannot be negative.")


@router.post("", response_model=MovieOut, status_code=201)
def create_movie(payload: MovieCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    _validate_movie_payload(payload.title, payload.duration, payload.age_restriction)
    movie = Movie(
        Title=payload.title.strip(),
        Duration=payload.duration,
        Age_Restriction=payload.age_restriction,
    )
    db.add(movie)
    db.flush()
    seen = set()
    for g in payload.genres:
        g = (g or "").strip()
        if g and g not in seen:
            seen.add(g)
            db.add(MovieGenre(Movie_ID=movie.Movie_ID, Genre=g))
    db.commit()
    db.refresh(movie)
    return movie_to_out(movie)


@router.put("/{movie_id}", response_model=MovieOut)
def update_movie(
    movie_id: int,
    payload: MovieUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    m = db.query(Movie).filter(Movie.Movie_ID == movie_id).first()
    if not m:
        raise HTTPException(404, "Movie not found")

    _validate_movie_payload(payload.title, payload.duration, payload.age_restriction)

    if payload.title is not None:
        m.Title = payload.title.strip()
    if payload.duration is not None:
        m.Duration = payload.duration
    if payload.age_restriction is not None:
        m.Age_Restriction = payload.age_restriction

    if payload.genres is not None:
        db.query(MovieGenre).filter(MovieGenre.Movie_ID == movie_id).delete()
        seen = set()
        for g in payload.genres:
            g = (g or "").strip()
            if g and g not in seen:
                seen.add(g)
                db.add(MovieGenre(Movie_ID=movie_id, Genre=g))

    db.commit()
    db.refresh(m)
    return movie_to_out(m)


@router.delete("/{movie_id}", status_code=204)
def delete_movie(movie_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    m = db.query(Movie).filter(Movie.Movie_ID == movie_id).first()
    if not m:
        raise HTTPException(404, "Movie not found")
    has_showtimes = db.query(Showtime).filter(Showtime.Movie_ID == movie_id).first() is not None
    if has_showtimes:
        raise HTTPException(
            409,
            "Cannot delete: this movie still has scheduled showtimes. Delete the showtimes first.",
        )
    db.delete(m)
    db.commit()
