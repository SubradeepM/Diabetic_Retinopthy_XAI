from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str  # "patient" or "doctor"
    doctor_code: Optional[str] = None
    # Only used when role == "patient":
    age: Optional[int] = None
    gender: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: Optional[str] = None
    patient_id: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str

    model_config = {"from_attributes": True}


class ChatTurn(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[list[ChatTurn]] = None


class ChatResponse(BaseModel):
    reply: str


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
