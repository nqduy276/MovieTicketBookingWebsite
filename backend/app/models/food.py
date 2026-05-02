"""FANDB_ITEM — strict to /create_tables.sql, extended with operational columns."""
from sqlalchemy import Column, Integer, String, Numeric, Boolean, Text
from app.database import Base


class FandbItem(Base):
    __tablename__ = "FANDB_ITEM"

    Item_ID = Column("Item_ID", Integer, primary_key=True, index=True)
    Name = Column("Name", String(255), nullable=False)
    Price = Column("Price", Numeric(10, 2), nullable=False)
    Category = Column("Category", String(100), nullable=False)

    @property
    def id(self):
        return self.Item_ID
