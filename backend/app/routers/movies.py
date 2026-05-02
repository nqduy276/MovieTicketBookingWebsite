from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.movie import Movie, MovieGenre
from app.schemas.movie import MovieOut, MovieCreate, movie_to_out
from app.core.deps import require_employee

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


@router.post("", response_model=MovieOut, status_code=201)
def create_movie(payload: MovieCreate, db: Session = Depends(get_db), _=Depends(require_employee)):
    movie = Movie(
        Title=payload.title,
        Duration=payload.duration,
        Age_Restriction=payload.age_restriction,
    )
    db.add(movie)
    db.flush()
    for g in payload.genres:
        db.add(MovieGenre(Movie_ID=movie.Movie_ID, Genre=g))
    db.commit()
    db.refresh(movie)
    return movie_to_out(movie)


@router.delete("/{movie_id}", status_code=204)
def delete_movie(movie_id: int, db: Session = Depends(get_db), _=Depends(require_employee)):
    m = db.query(Movie).filter(Movie.Movie_ID == movie_id).first()
    if not m:
        raise HTTPException(404, "Movie not found")
    db.delete(m)
    db.commit()
