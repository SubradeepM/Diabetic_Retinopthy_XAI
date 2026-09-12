import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import engine, Base
from . import models
from .routes import router, UPLOAD_DIR


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Diabetic Retinopathy Screening API",
    description="Backend API for AI-assisted diabetic retinopathy screening",
    version="1.0.0"
)

# Allow the frontend (served from a different origin/port during development)
# to call this API. Tighten allow_origins to your real frontend URL in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API routes
app.include_router(router)

# Serve uploaded fundus images at /uploads/<filename>
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {
        "message": "Diabetic Retinopathy Screening API is running",
        "status": "success"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }