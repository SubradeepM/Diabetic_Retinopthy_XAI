# Retinova — Diabetic Retinopathy Screening Backend

**Smart India Hackathon 2026 — Problem Statement SIH26038**
Explainable AI for Diabetic Retinopathy Screening in Rural India

Backend API for AI-assisted diabetic retinopathy (DR) screening: patients
upload fundus images, the pipeline assesses image quality, runs DR severity
classification (0–4), and returns an explainable, referral-ready result.

## Tech stack

- **FastAPI** — REST API framework
- **SQLAlchemy** — ORM / database layer
- **SQLite** (dev) / **PostgreSQL** (recommended for production)
- (Planned) MATLAB / Python CV pipeline for image quality, lesion detection,
  DR classification, and Grad-CAM explainability

## Project structure

```
retinova-backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app entrypoint, CORS, static file mount
│   ├── database.py      # SQLAlchemy engine/session setup
│   ├── models.py        # ORM models: Patient, Image, Prediction
│   ├── schemas.py        # Pydantic request/response schemas
│   └── routes.py         # API endpoints
├── frontend/
│   ├── index.html        # App shell (sidebar + routed content area)
│   ├── css/style.css     # All styling (design tokens at the top)
│   └── js/
│       ├── api.js         # fetch wrapper for every backend endpoint
│       └── app.js         # hash router + page rendering + interactions
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## Backend setup

1. Clone the repo and enter it:
   ```bash
   git clone <your-repo-url>
   cd retinova-backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate      # Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template and adjust if needed:
   ```bash
   cp .env.example .env
   ```
5. Run the API:
   ```bash
   uvicorn app.main:app --reload
   ```
6. Open the interactive docs at `http://127.0.0.1:8000/docs`.

## Frontend setup

The frontend is plain HTML/CSS/JS — no build step, no npm install required.

1. With the backend running on `http://127.0.0.1:8000` (step above), open a
   second terminal and serve the frontend folder as static files:
   ```bash
   cd frontend
   python -m http.server 8080
   ```
2. Open `http://127.0.0.1:8080` in your browser.
3. If your backend runs on a different host/port, set it before the page
   loads by adding this line above the `<script src="js/api.js">` tag in
   `index.html`:
   ```html
   <script>window.RETINOVA_API_BASE = "http://your-backend-host:8000";</script>
   ```

### What's in the UI

- **Dashboard** — patient/screening counts and the most recent results
- **Register patient** — add a patient before screening them
- **Screen a patient** — pick a patient, upload a fundus image, check its
  quality status, then run DR classification and see the severity result,
  confidence meter, and referral outcome
- **Records** — every screening result across all patients

The classification result panel is honest about the current backend state:
since `predict_dr` in `app/routes.py` is still a stub, the UI shows a note
that Grad-CAM/clinical evidence will appear once the real model is wired in.

## API overview

| Method | Endpoint                              | Description                        |
|--------|----------------------------------------|-------------------------------------|
| GET    | `/`                                    | Root health message                 |
| GET    | `/health`                              | Health check                        |
| POST   | `/patients`                            | Register a patient                  |
| GET    | `/patients/{patient_id}`               | Get patient details                 |
| POST   | `/patients/{patient_id}/images`        | Upload a fundus image               |
| POST   | `/images/{image_id}/predict`           | Run DR classification on an image   |
| GET    | `/images/{image_id}/predictions`       | Retrieve predictions for an image   |
| GET    | `/patients/{patient_id}/images`        | List a patient's uploaded images    |
| GET    | `/images`                              | List all uploaded images            |
| GET    | `/predictions`                         | List all predictions                |
| GET    | `/uploads/{filename}`                  | Fetch a stored fundus image file    |

> The prediction endpoint is currently stubbed (`app/routes.py`) — plug in
> the trained model in place of the `TODO` markers.

## Data model

- **Patient** — `patient_id`, `age`, `gender`, `created_at`
- **Image** — `image_id`, `patient_id`, `filename`, `upload_time`, `quality_status`
- **Prediction** — `prediction_id`, `image_id`, `dr_level` (0–4), `dr_label`,
  `confidence`, `referable`, `created_at`

## Roadmap

- [ ] Wire in real image-quality assessment (blur/illumination scoring)
- [ ] Wire in trained DR classification model (transfer learning CNN)
- [ ] Add Grad-CAM explainability output
- [ ] Add automated PDF report generation
- [ ] Containerize with Docker
- [ ] Add authentication for clinician-facing endpoints

## License

TBD
