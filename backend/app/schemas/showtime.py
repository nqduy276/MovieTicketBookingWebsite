from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ShowtimeCreate(BaseModel):
    movie_id: int
    cinema_id: int
    room_id: Optional[int] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    base_price: float = 80000.0


class ShowtimeOut(BaseModel):
    id: int
    movie_id: int
    cinema_id: int               # = Complex_ID resolved via auditorium
    room: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    base_price: float = 0.0       # derived from cheapest seat in the room
    is_archived: bool = False     # always False in strict mode
    available_seats: Optional[int] = None
    cinema_name: Optional[str] = None
    movie_title: Optional[str] = None
    type: Optional[str] = None
