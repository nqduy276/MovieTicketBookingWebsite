"""User mappings — CINEUSER + CUSTOMER + STAFF + USER_PHONE."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    EMPLOYEE = "employee"


class CineUser(Base):
    __tablename__ = "CINEUSER"

    User_ID = Column("User_ID", Integer, primary_key=True, index=True)
    Email = Column("Email", String(255), unique=True, index=True, nullable=False)
    Password = Column("Password", String(255), nullable=False)
    First_Name = Column("First_Name", String(100), nullable=False)
    Last_Name = Column("Last_Name", String(100), nullable=False)
    Registration_Date = Column("Registration_Date", DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="user", uselist=False, cascade="all, delete-orphan")
    staff = relationship("Staff", back_populates="user", uselist=False, cascade="all, delete-orphan",
                         foreign_keys="Staff.User_ID")
    phones = relationship("UserPhone", back_populates="user", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")

    @property
    def id(self):
        return self.User_ID

    @property
    def role(self) -> UserRole:
        if self.staff is not None:
            return UserRole.EMPLOYEE
        return UserRole.CUSTOMER

    @property
    def full_name(self) -> str:
        return f"{self.First_Name} {self.Last_Name}".strip()

    @property
    def loyalty_points(self) -> float:
        return float(self.customer.Loyalty_Points) if self.customer else 0.0

    @property
    def phone(self):
        return self.phones[0].Phone_Number if self.phones else None


class UserPhone(Base):
    __tablename__ = "USER_PHONE"

    User_ID = Column("User_ID", Integer, ForeignKey("CINEUSER.User_ID", ondelete="CASCADE"), primary_key=True)
    Phone_Number = Column("Phone_Number", String(15), primary_key=True)

    user = relationship("CineUser", back_populates="phones")


class Customer(Base):
    __tablename__ = "CUSTOMER"

    User_ID = Column("User_ID", Integer, ForeignKey("CINEUSER.User_ID", ondelete="CASCADE"), primary_key=True)
    Date_of_Birth = Column("Date_of_Birth", Date, nullable=False)
    Loyalty_Points = Column("Loyalty_Points", Integer, default=0, nullable=False)

    user = relationship("CineUser", back_populates="customer")


class Staff(Base):
    __tablename__ = "STAFF"

    User_ID = Column("User_ID", Integer, ForeignKey("CINEUSER.User_ID", ondelete="CASCADE"), primary_key=True)
    Job_Role = Column("Job_Role", String(100), nullable=False)
    Manager_ID = Column("Manager_ID", Integer, ForeignKey("STAFF.User_ID", ondelete="SET NULL"), nullable=True)

    user = relationship("CineUser", back_populates="staff", foreign_keys=[User_ID])
    manager = relationship("Staff", remote_side=[User_ID], foreign_keys=[Manager_ID])
