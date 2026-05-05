from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.food import FandbItem
from app.schemas.food import FoodOut, FoodCreate, fandb_to_out
from app.core.deps import require_admin

router = APIRouter(prefix="/api/food", tags=["food"])


@router.get("", response_model=List[FoodOut])
def list_food(db: Session = Depends(get_db)):
    items = db.query(FandbItem).all()
    return [fandb_to_out(i) for i in items]


@router.post("", response_model=FoodOut, status_code=201)
def create_food(payload: FoodCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    item = FandbItem(
        Name=payload.name,
        Price=payload.price,
        Category=payload.category or "Combo",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return fandb_to_out(item)
