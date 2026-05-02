"""SEAT — composite PK (Room_ID, Seat_No), strict to /create_tables.sql."""
import enum
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SeatStatus(str, enum.Enum):
    """Status is *derived* per-showtime from TICKET; not stored on SEAT."""
    AVAILABLE = "available"
    BOOKED = "booked"
    HELD = "held"


class Seat(Base):
    __tablename__ = "SEAT"

    Room_ID = Column("Room_ID", Integer, ForeignKey("AUDITORIUM.Room_ID", ondelete="CASCADE"), primary_key=True)
    Seat_No = Column("Seat_No", String(10), primary_key=True)
    Seat_Type = Column("Seat_Type", String(50), nullable=False)
    Price = Column("Price", Numeric(10, 2), nullable=False)

    auditorium = relationship("Auditorium", back_populates="seats")

    @property
    def row(self) -> str:
        return self.Seat_No[0] if self.Seat_No else ""

    @property
    def number(self) -> int:
        try:
            return int(self.Seat_No[1:])
        except (ValueError, TypeError):
            return 0
