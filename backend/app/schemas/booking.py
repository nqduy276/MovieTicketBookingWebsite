from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.seat import SeatOut


class FoodOrderItem(BaseModel):
    food_id: int
    quantity: int = 1


class BookingCreate(BaseModel):
    showtime_id: int
    seat_ids: List[int]                 # encoded ints from SeatOut.id
    food_items: List[FoodOrderItem] = []
    promo_code: Optional[str] = None


class BookingFoodOut(BaseModel):
    food_id: int
    quantity: int
    unit_price: float
    name: Optional[str] = None


class BookingOut(BaseModel):
    id: int
    user_id: int
    showtime_id: int
    seat_total: float
    food_total: float
    discount: float
    total: float
    promo_code: Optional[str] = None
    loyalty_points_awarded: float = 0.0
    created_at: datetime
    seats: List[SeatOut] = []
    foods: List[BookingFoodOut] = []
    movie_title: Optional[str] = None
    cinema_name: Optional[str] = None
    showtime_start: Optional[datetime] = None
    code: str = ""
    status: str = "UPCOMING"
    cancelled_at: Optional[datetime] = None
