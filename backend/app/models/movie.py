"""MOVIE + MOVIE_GENRE — strict to /create_tables.sql."""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Movie(Base):
    __tablename__ = "MOVIE"

    Movie_ID = Column("Movie_ID", Integer, primary_key=True, index=True)
    Title = Column("Title", String(255), nullable=False, index=True)
    Duration = Column("Duration", Integer, nullable=False)
    Age_Restriction = Column("Age_Restriction", Integer, nullable=False)

    showtimes = relationship("Showtime", back_populates="movie", cascade="all, delete-orphan")
    genres = relationship("MovieGenre", back_populates="movie", cascade="all, delete-orphan")

    @property
    def id(self):
        return self.Movie_ID


class MovieGenre(Base):
    __tablename__ = "MOVIE_GENRE"

    Movie_ID = Column("Movie_ID", Integer, ForeignKey("MOVIE.Movie_ID", ondelete="CASCADE"), primary_key=True)
    Genre = Column("Genre", String(50), primary_key=True)

    movie = relationship("Movie", back_populates="genres")
