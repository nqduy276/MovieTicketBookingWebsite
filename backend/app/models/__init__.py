"""Re-export all models so SQLAlchemy is aware of them at import time."""
from app.models.user import CineUser, Customer, Staff, UserPhone, UserRole
from app.models.movie import Movie, MovieGenre
from app.models.cinema import TheaterComplex, Auditorium
from app.models.showtime import Showtime
from app.models.seat import Seat, SeatStatus
from app.models.booking import Booking, Ticket, BookingFandb, BookingPromo
from app.models.food import FandbItem
from app.models.promo import Promotion, PromotionWallet

__all__ = [
    "CineUser", "Customer", "Staff", "UserPhone", "UserRole",
    "Movie", "MovieGenre",
    "TheaterComplex", "Auditorium",
    "Showtime",
    "Seat", "SeatStatus",
    "Booking", "Ticket", "BookingFandb", "BookingPromo",
    "FandbItem",
    "Promotion", "PromotionWallet",
]
