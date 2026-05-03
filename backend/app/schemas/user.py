from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


class UserCreate(BaseModel):
    """Registration payload — matches CALL CreateCustomer / CreateStaff."""
    email: EmailStr
    password: str = Field(..., min_length=6)
    first_name: str
    last_name: str
    date_of_birth: date
    role: UserRole = UserRole.CUSTOMER
    job_role: Optional[str] = "Staff"     # only used when role == EMPLOYEE
    # Extras the FE may send but DB doesn't store; ignored:
    username: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None


class UserOut(BaseModel):
    """Stable JSON shape for the FE — fields we don't have are sent as null/empty."""
    id: int
    email: EmailStr
    full_name: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    role: UserRole
    loyalty_points: float
    created_at: datetime
    date_of_birth: Optional[date] = None      # from CUSTOMER.Date_of_Birth (null for staff)
    age: Optional[int] = None                 # computed from date_of_birth
    # Kept for FE compatibility but always None now:
    username: Optional[str] = None


class LoginRequest(BaseModel):
    """Login takes email + password (matches CALL LoginUser).
    The FE may also send `username` — it is ignored."""
    email: EmailStr
    password: str
    username: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


def _compute_age(dob: Optional[date]) -> Optional[int]:
    if not dob:
        return None
    today = date.today()
    years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return max(0, years)


def cineuser_to_out(u) -> UserOut:
    dob = u.customer.Date_of_Birth if u.customer else None
    return UserOut(
        id=u.User_ID,
        email=u.Email,
        full_name=u.full_name,
        first_name=u.First_Name,
        last_name=u.Last_Name,
        phone=u.phone,
        role=u.role,
        loyalty_points=u.loyalty_points,
        created_at=u.Registration_Date or datetime.utcnow(),
        date_of_birth=dob,
        age=_compute_age(dob),
    )
