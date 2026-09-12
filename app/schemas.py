from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PatientCreate(BaseModel):
    patient_id: str
    age: Optional[int] = None
    gender: Optional[str] = None


class PatientOut(PatientCreate):
    created_at: datetime

    model_config = {"from_attributes": True}


class ImageOut(BaseModel):
    image_id: str
    patient_id: str
    filename: str
    upload_time: datetime
    quality_status: Optional[str] = None

    model_config = {"from_attributes": True}


class PredictionOut(BaseModel):
    prediction_id: int
    image_id: str
    dr_level: Optional[int] = None
    dr_label: Optional[str] = None
    confidence: Optional[float] = None
    referable: Optional[bool] = None
    created_at: datetime

    model_config = {"from_attributes": True}
