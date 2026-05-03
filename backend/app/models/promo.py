"""PROMOTION + PROMOTION_WALLET — strict to /create_tables.sql.

PROMOTION is the *catalog* (template). PROMOTION_WALLET is per-user codes
the user can apply at checkout. BOOKING_PROMO.Code FKs to wallet, not the
catalog.

Per the original Calculate_Valid_Discount() convention:
  Discount_Value <= 100   → percentage off
  Discount_Value > 100    → flat VND off
"""
from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Promotion(Base):
    __tablename__ = "PROMOTION"

    Promotion_ID = Column("Promotion_ID", Integer, primary_key=True, index=True)
    Promotion_Name = Column("Promotion_Name", String(255), nullable=False)
    Price = Column("Price", Integer, nullable=True)
    Discount_Value = Column("Discount_Value", Numeric(10, 2), nullable=False, default=0)
    Expiration_Date = Column("Expiration_Date", Date, nullable=False)

    wallet_entries = relationship(
        "PromotionWallet", back_populates="promotion", cascade="all, delete-orphan"
    )

    @property
    def id(self):
        return self.Promotion_ID


class PromotionWallet(Base):
    __tablename__ = "PROMOTION_WALLET"

    Code = Column("Code", String(50), primary_key=True)
    Promotion_ID = Column(
        "Promotion_ID",
        Integer,
        ForeignKey("PROMOTION.Promotion_ID", ondelete="CASCADE"),
        nullable=False,
    )
    Owner_ID = Column(
        "Owner_ID",
        Integer,
        ForeignKey("CINEUSER.User_ID", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    promotion = relationship("Promotion", back_populates="wallet_entries")
    owner = relationship("CineUser")
