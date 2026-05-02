"""SHOWTIME — strict to /create_tables.sql."""
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Showtime(Base):
    __tablename__ = "SHOWTIME"

    Showtime_ID = Column("Showtime_ID", Integer, primary_key=True, index=True)
    Start_Time = Column("Start_Time", DateTime, nullable=False, index=True)
    End_Time = Column("End_Time", DateTime, nullable=False)
    Movie_ID = Column("Movie_ID", Integer, ForeignKey("MOVIE.Movie_ID", ondelete="CASCADE"), nullable=False, index=True)
    Room_ID = Column("Room_ID", Integer, ForeignKey("AUDITORIUM.Room_ID", ondelete="CASCADE"), nullable=False, index=True)

    movie = relationship("Movie", back_populates="showtimes")
    auditorium = relationship("Auditorium", back_populates="showtimes")
    tickets = relationship("Ticket", back_populates="showtime", cascade="all, delete-orphan")

    @property
    def id(self):
        return self.Showtime_ID
