import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from . import models, schemas
from .database import get_db

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Patients
# ---------------------------------------------------------------------------
@router.get("/patients", response_model=list[schemas.PatientOut])
def list_patients(db: Session = Depends(get_db)):
    return db.query(models.Patient).order_by(models.Patient.created_at.desc()).all()


@router.post("/patients", response_model=schemas.PatientOut)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(get_db)):
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
def get_patient(patient_id: str, db: Session = Depends(get_db)):
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
def list_patient_images(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(
        models.Patient.patient_id == patient_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return db.query(models.Image).filter(
        models.Image.patient_id == patient_id
    ).order_by(models.Image.upload_time.desc()).all()


@router.get("/images", response_model=list[schemas.ImageOut])
def list_all_images(db: Session = Depends(get_db)):
    return db.query(models.Image).order_by(models.Image.upload_time.desc()).all()


@router.post("/patients/{patient_id}/images", response_model=schemas.ImageOut)
def upload_image(
    patient_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    patient = db.query(models.Patient).filter(
        models.Patient.patient_id == patient_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    image_id = str(uuid.uuid4())

    # Persist the uploaded file to disk so it can be retrieved/displayed later.
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
# DR prediction
# ---------------------------------------------------------------------------
@router.post("/images/{image_id}/predict", response_model=schemas.PredictionOut)
def predict_dr(image_id: str, db: Session = Depends(get_db)):
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
def get_predictions(image_id: str, db: Session = Depends(get_db)):
    return db.query(models.Prediction).filter(
        models.Prediction.image_id == image_id
    ).all()


@router.get("/predictions", response_model=list[schemas.PredictionOut])
def list_all_predictions(db: Session = Depends(get_db)):
    return db.query(models.Prediction).order_by(
        models.Prediction.created_at.desc()
    ).all()
