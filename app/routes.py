import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from . import models, schemas
from .database import get_db
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_doctor,
    ensure_can_access_patient,
    DOCTOR_SIGNUP_CODE,
)

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@router.post("/auth/register", response_model=schemas.TokenOut)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if payload.role not in ("patient", "doctor"):
        raise HTTPException(status_code=400, detail="Role must be 'patient' or 'doctor'")

    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    if payload.role == "doctor" and payload.doctor_code != DOCTOR_SIGNUP_CODE:
        raise HTTPException(status_code=403, detail="Invalid doctor access code")

    user_id = str(uuid.uuid4())
    user = models.User(
        id=user_id,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)

    patient_id = None
    if payload.role == "patient":
        patient_id = f"P-{user_id[:8]}"
        db.add(models.Patient(
            patient_id=patient_id,
            age=payload.age,
            gender=payload.gender,
            user_id=user_id,
        ))

    db.commit()

    token = create_access_token({"sub": user_id, "role": payload.role})
    return schemas.TokenOut(
        access_token=token, role=payload.role, full_name=payload.full_name, patient_id=patient_id
    )


@router.post("/auth/login", response_model=schemas.TokenOut)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    patient_id = None
    if user.role == "patient":
        patient = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
        patient_id = patient.patient_id if patient else None

    token = create_access_token({"sub": user.id, "role": user.role})
    return schemas.TokenOut(
        access_token=token, role=user.role, full_name=user.full_name, patient_id=patient_id
    )


@router.get("/auth/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ---------------------------------------------------------------------------
# Patient's own dashboard (patient role only)
# ---------------------------------------------------------------------------
@router.get("/me/summary")
def my_summary(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="This endpoint is for patient accounts")

    patient = db.query(models.Patient).filter(
        models.Patient.user_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    images = db.query(models.Image).filter(
        models.Image.patient_id == patient.patient_id
    ).order_by(models.Image.upload_time.desc()).all()

    image_ids = [i.image_id for i in images]
    predictions = (
        db.query(models.Prediction)
        .filter(models.Prediction.image_id.in_(image_ids))
        .order_by(models.Prediction.created_at.desc())
        .all()
        if image_ids else []
    )

    return {
        "patient": schemas.PatientOut.model_validate(patient),
        "images": [schemas.ImageOut.model_validate(i) for i in images],
        "predictions": [schemas.PredictionOut.model_validate(p) for p in predictions],
    }


# ---------------------------------------------------------------------------
# Patients (doctor-facing)
# ---------------------------------------------------------------------------
@router.get("/patients", response_model=list[schemas.PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    _doctor: models.User = Depends(require_doctor),
):
    return db.query(models.Patient).order_by(models.Patient.created_at.desc()).all()


@router.post("/patients", response_model=schemas.PatientOut)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(get_db),
    _doctor: models.User = Depends(require_doctor),
):
    """Lets a doctor manually add a walk-in patient who doesn't have their own account."""
    existing = db.query(models.Patient).filter(
        models.Patient.patient_id == patient.patient_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient already exists")

    db_patient = models.Patient(**patient.dict())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient


@router.get("/patients/{patient_id}", response_model=schemas.PatientOut)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ensure_can_access_patient(patient_id, current_user, db)
    patient = db.query(models.Patient).filter(
        models.Patient.patient_id == patient_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


# ---------------------------------------------------------------------------
# Image upload
# ---------------------------------------------------------------------------
@router.get("/patients/{patient_id}/images", response_model=list[schemas.ImageOut])
def list_patient_images(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ensure_can_access_patient(patient_id, current_user, db)
    patient = db.query(models.Patient).filter(
        models.Patient.patient_id == patient_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return db.query(models.Image).filter(
        models.Image.patient_id == patient_id
    ).order_by(models.Image.upload_time.desc()).all()


@router.get("/images", response_model=list[schemas.ImageOut])
def list_all_images(
    db: Session = Depends(get_db),
    _doctor: models.User = Depends(require_doctor),
):
    return db.query(models.Image).order_by(models.Image.upload_time.desc()).all()


@router.post("/patients/{patient_id}/images", response_model=schemas.ImageOut)
def upload_image(
    patient_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ensure_can_access_patient(patient_id, current_user, db)

    patient = db.query(models.Patient).filter(
        models.Patient.patient_id == patient_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    image_id = str(uuid.uuid4())

    _, ext = os.path.splitext(file.filename or "")
    stored_name = f"{image_id}{ext}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)
    with open(stored_path, "wb") as f:
        f.write(file.file.read())

    # TODO: plug in the real quality-assessment step (blur/illumination scoring)
    # from your MATLAB/Python image pipeline. Placeholder result for now:
    quality_status = "acceptable"

    db_image = models.Image(
        image_id=image_id,
        patient_id=patient_id,
        filename=stored_name,
        quality_status=quality_status,
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image


# ---------------------------------------------------------------------------
# DR prediction (doctor only)
# ---------------------------------------------------------------------------
@router.post("/images/{image_id}/predict", response_model=schemas.PredictionOut)
def predict_dr(
    image_id: str,
    db: Session = Depends(get_db),
    _doctor: models.User = Depends(require_doctor),
):
    image = db.query(models.Image).filter(
        models.Image.image_id == image_id
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # TODO: replace this stub with a call into your DR classification model
    # (e.g. load the trained CNN, run inference, run Grad-CAM, return the
    # severity level 0-4 and a calibrated confidence score).
    dr_level = 0
    dr_label = "No DR"
    confidence = 0.0
    referable = False

    db_prediction = models.Prediction(
        image_id=image_id,
        dr_level=dr_level,
        dr_label=dr_label,
        confidence=confidence,
        referable=referable,
    )
    db.add(db_prediction)
    db.commit()
    db.refresh(db_prediction)
    return db_prediction


@router.get("/images/{image_id}/predictions", response_model=list[schemas.PredictionOut])
def get_predictions(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    image = db.query(models.Image).filter(models.Image.image_id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    ensure_can_access_patient(image.patient_id, current_user, db)
    return db.query(models.Prediction).filter(
        models.Prediction.image_id == image_id
    ).all()


@router.get("/predictions", response_model=list[schemas.PredictionOut])
def list_all_predictions(
    db: Session = Depends(get_db),
    _doctor: models.User = Depends(require_doctor),
):
    return db.query(models.Prediction).order_by(
        models.Prediction.created_at.desc()
    ).all()
