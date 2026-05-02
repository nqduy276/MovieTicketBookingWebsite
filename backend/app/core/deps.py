"""FastAPI dependency utilities — current user lookup + role gating."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jwt import PyJWTError

from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import CineUser, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> CineUser:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(token)
    except PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token subject")

    user = db.query(CineUser).filter(CineUser.Email == email.lower()).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_employee(current: CineUser = Depends(get_current_user)) -> CineUser:
    if current.role != UserRole.EMPLOYEE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Employee access required")
    return current
