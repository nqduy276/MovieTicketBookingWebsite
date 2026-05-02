"""PROMOTION — strict to /create_tables.sql.

Per Calculate_Valid_Discount() in database_logic_P4.sql:
  Discount_Value <= 100   → percentage off the booking total
  Discount_Value > 100    → flat VND amount off
"""
from sqlalchemy import Column, String, Numeric, Date
from app.database import Base


class Promotion(Base):
    __tablename__ = "PROMOTION"

    Code = Column("Code", String(50), primary_key=True)
    Discount_Value = Column("Discount_Value", Numeric(10, 2), nullable=False, default=0)
    Expiration_Date = Column("Expiration_Date", Date, nullable=False)
