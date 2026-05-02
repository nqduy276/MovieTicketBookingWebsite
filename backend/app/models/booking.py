"""BOOKING + TICKET + BOOKING_FANDB + BOOKING_PROMO — strict to /create_tables.sql."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Booking(Base):
    __tablename__ = "BOOKING"

    Booking_ID = Column("Booking_ID", Integer, primary_key=True, index=True)
    Booking_Date = Column("Booking_Date", DateTime, default=datetime.utcnow)
    Total_Amount = Column("Total_Amount", Numeric(10, 2), default=0)
    User_ID = Column("User_ID", Integer, ForeignKey("CINEUSER.User_ID", ondelete="CASCADE"), nullable=False, index=True)

    user = relationship("CineUser", back_populates="bookings")
    tickets = relationship("Ticket", back_populates="booking", cascade="all, delete-orphan")
    foods = relationship("BookingFandb", back_populates="booking", cascade="all, delete-orphan")
    promos = relationship("BookingPromo", back_populates="booking", cascade="all, delete-orphan")

    @property
    def id(self):
        return self.Booking_ID


class Ticket(Base):
    """Ternary: Booking + Showtime + Seat (Room_ID, Seat_No)."""
    __tablename__ = "TICKET"

    Booking_ID = Column("Booking_ID", Integer, ForeignKey("BOOKING.Booking_ID", ondelete="CASCADE"), primary_key=True)
    Showtime_ID = Column("Showtime_ID", Integer, ForeignKey("SHOWTIME.Showtime_ID", ondelete="CASCADE"), primary_key=True)
    Room_ID = Column("Room_ID", Integer, primary_key=True)
    Seat_No = Column("Seat_No", String(10), primary_key=True)

    __table_args__ = (
        ForeignKeyConstraint(["Room_ID", "Seat_No"], ["SEAT.Room_ID", "SEAT.Seat_No"], ondelete="CASCADE"),
    )

    booking = relationship("Booking", back_populates="tickets")
    showtime = relationship("Showtime", back_populates="tickets")
    seat = relationship(
        "Seat",
        primaryjoin="and_(Ticket.Room_ID==Seat.Room_ID, Ticket.Seat_No==Seat.Seat_No)",
        foreign_keys=[Room_ID, Seat_No],
        viewonly=True,
    )


class BookingFandb(Base):
    __tablename__ = "BOOKING_FANDB"

    Booking_ID = Column("Booking_ID", Integer, ForeignKey("BOOKING.Booking_ID", ondelete="CASCADE"), primary_key=True)
    Item_ID = Column("Item_ID", Integer, ForeignKey("FANDB_ITEM.Item_ID", ondelete="CASCADE"), primary_key=True)
    Quantity = Column("Quantity", Integer, nullable=False, default=1)

    booking = relationship("Booking", back_populates="foods")
    item = relationship("FandbItem")


class BookingPromo(Base):
    __tablename__ = "BOOKING_PROMO"

    Booking_ID = Column("Booking_ID", Integer, ForeignKey("BOOKING.Booking_ID", ondelete="CASCADE"), primary_key=True)
    Code = Column("Code", String(50), ForeignKey("PROMOTION.Code", ondelete="CASCADE"), primary_key=True)

    booking = relationship("Booking", back_populates="promos")
    promotion = relationship("Promotion")
