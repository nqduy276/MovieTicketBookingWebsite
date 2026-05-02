from typing import Optional
from pydantic import BaseModel


class CinemaCreate(BaseModel):
    name: str
    street: str
    district: str
    city: str


class CinemaOut(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    street: Optional[str] = None
    district: Optional[str] = None


def complex_to_out(c) -> CinemaOut:
    return CinemaOut(
        id=c.Complex_ID,
        name=c.Name,
        address=f"{c.Street}, {c.District}",
        street=c.Street,
        district=c.District,
        city=c.City,
    )
