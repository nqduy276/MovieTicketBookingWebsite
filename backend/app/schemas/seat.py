from pydantic import BaseModel
from app.models.seat import SeatStatus


class SeatOut(BaseModel):
    """In strict mode there is no Seat_ID surrogate; we expose Seat_No directly.
    The `id` field is a synthetic encoding so the FE can keep its existing shape:
       id = (ord(row) - 64) * 100 + number       e.g. "A1" -> 101, "H10" -> 810
    The booking endpoint decodes this back to a Seat_No string."""
    id: int
    showtime_id: int
    seat_no: str               # "A1", "H10", …
    row: str
    number: int
    type: str                  # Standard / VIP / Couple
    price: float
    status: SeatStatus
