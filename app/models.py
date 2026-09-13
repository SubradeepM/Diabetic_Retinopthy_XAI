from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from datetime import datetime

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, nullable=False)  # "patient" or "doctor"
    created_at = Column(DateTime, default=datetime.utcnow)


class Patient(Base):
    __tablename__ = "patients"

    patient_id = Column(String, primary_key=True, index=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Image(Base):
    __tablename__ = "images"

    image_id = Column(String, primary_key=True, index=True)
    patient_id = Column(String, ForeignKey("patients.patient_id"))
    filename = Column(String, nullable=False)
    upload_time = Column(DateTime, default=datetime.utcnow)
    quality_status = Column(String, nullable=True)


class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    image_id = Column(String, ForeignKey("images.image_id"))

    dr_level = Column(Integer, nullable=True)
    dr_label = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    referable = Column(Boolean, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)