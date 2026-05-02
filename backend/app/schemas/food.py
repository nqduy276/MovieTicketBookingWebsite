from typing import Optional
from pydantic import BaseModel


class FoodCreate(BaseModel):
    name: str
    price: float
    category: str = "Combo"


class FoodOut(BaseModel):
    id: int
    name: str
    price: float
    category: str
    description: Optional[str] = None    # always None — no column
    image: Optional[str] = None          # always None — no column
    is_available: bool = True            # always True — no column


def fandb_to_out(f) -> FoodOut:
    return FoodOut(
        id=f.Item_ID,
        name=f.Name,
        price=float(f.Price),
        category=f.Category,
    )
