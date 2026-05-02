"""THEATER_COMPLEX + AUDITORIUM — strict to /create_tables.sql."""
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class TheaterComplex(Base):
    __tablename__ = "THEATER_COMPLEX"

    Complex_ID = Column("Complex_ID", Integer, primary_key=True, index=True)
    Name = Column("Name", String(255), nullable=False, index=True)
    Street = Column("Street", String(255), nullable=False)
    District = Column("District", String(100), nullable=False)
    City = Column("City", String(100), nullable=False)
    Manager_ID = Column("Manager_ID", Integer,
                        ForeignKey("STAFF.User_ID", ondelete="SET NULL"),
                        unique=True, nullable=True)

    auditoriums = relationship("Auditorium", back_populates="complex", cascade="all, delete-orphan")

    @property
    def id(self):
        return self.Complex_ID

    @property
    def address(self) -> str:
        return f"{self.Street}, {self.District}"


class Auditorium(Base):
    __tablename__ = "AUDITORIUM"

    Room_ID = Column("Room_ID", Integer, primary_key=True, index=True)
    Room_Name = Column("Room_Name", String(100), nullable=False)
    Screen_Type = Column("Screen_Type", String(50), nullable=False)
    Complex_ID = Column("Complex_ID", Integer,
                        ForeignKey("THEATER_COMPLEX.Complex_ID", ondelete="CASCADE"), nullable=False)

    complex = relationship("TheaterComplex", back_populates="auditoriums")
    seats = relationship("Seat", back_populates="auditorium", cascade="all, delete-orphan")
    showtimes = relationship("Showtime", back_populates="auditorium", cascade="all, delete-orphan")
