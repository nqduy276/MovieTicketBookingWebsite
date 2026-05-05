from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.food import FandbItem
from app.models.booking import BookingFandb
from app.schemas.food import FoodOut, FoodCreate, FoodUpdate, fandb_to_out
from app.core.deps import require_admin

router = APIRouter(prefix="/api/food", tags=["food"])


@router.get("", response_model=List[FoodOut])
def list_food(db: Session = Depends(get_db)):
    items = db.query(FandbItem).all()
    return [fandb_to_out(i) for i in items]


@router.post("", response_model=FoodOut, status_code=201)
def create_food(payload: FoodCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if not payload.name.strip():
        raise HTTPException(400, "Name is required.")
    if payload.price < 0:
        raise HTTPException(400, "Price must be >= 0.")
    item = FandbItem(
        Name=payload.name.strip(),
        Price=payload.price,
        Category=(payload.category or "Combo").strip() or "Combo",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return fandb_to_out(item)


@router.put("/{item_id}", response_model=FoodOut)
def update_food(item_id: int, payload: FoodUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    item = db.query(FandbItem).filter(FandbItem.Item_ID == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found.")
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(400, "Name cannot be empty.")
        item.Name = payload.name.strip()
    if payload.price is not None:
        if payload.price < 0:
            raise HTTPException(400, "Price must be >= 0.")
        item.Price = payload.price
    if payload.category is not None:
        item.Category = payload.category.strip() or item.Category
    db.commit()
    db.refresh(item)
    return fandb_to_out(item)


@router.delete("/{item_id}", status_code=204)
def delete_food(item_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    item = db.query(FandbItem).filter(FandbItem.Item_ID == item_id).first()
    if not item:
        raise HTTPException(404, "Item not found.")
    in_use = db.query(BookingFandb).filter(BookingFandb.Item_ID == item_id).first() is not None
    if in_use:
        raise HTTPException(409, "Cannot delete: item is referenced by existing bookings.")
    db.delete(item)
    db.commit()
