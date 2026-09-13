import os
import time

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import models
from .database import get_db

# In production, set JWT_SECRET_KEY to a long random value via an environment
# variable (never commit a real secret to source control).
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me-before-deploying")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 60 * 60 * 24 * 7  # 7 days

# A stand-in for real medical-credential verification: anyone registering as
# a doctor must supply this code. Distribute it only to genuine clinicians.
# Set your own value via the DOCTOR_SIGNUP_CODE environment variable.
DOCTOR_SIGNUP_CODE = os.getenv("DOCTOR_SIGNUP_CODE", "RETINOVA-DOC-2026")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = int(time.time()) + ACCESS_TOKEN_EXPIRE_SECONDS
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session, please log in again",
        )


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_doctor(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access required")
    return current_user


def ensure_can_access_patient(patient_id: str, current_user: models.User, db: Session):
    """Doctors can access any patient. Patients can only access their own record."""
    if current_user.role == "doctor":
        return
    patient = db.query(models.Patient).filter(
        models.Patient.patient_id == patient_id
    ).first()
    if not patient or patient.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to access this patient's data"
        )
