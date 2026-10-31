"""
FinPulse - FastAPI backend entrypoint.

Run:
    cd backend
    uvicorn main:app --reload

The database is created automatically on first startup.
No CSV loading needed — users register and enter their own data.

Open http://127.0.0.1:8000/docs for interactive Swagger docs.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.connection import engine, Base
from api import auth, customers, analytics, loans, recommendations, admin, entries, bank_eligibility, activity

# Auto-create all tables on startup (safe — does nothing if they exist)
import database.models  # noqa: F401 — registers models on Base
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FinPulse",
    description="AI-Powered Personal Finance Platform — Daily Entry Tracking, "
                "Bank Loan Eligibility, Spend Analysis & Personalized Recommendations.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(analytics.router)
app.include_router(loans.router)
app.include_router(recommendations.router)
app.include_router(admin.router)
app.include_router(entries.router)
app.include_router(bank_eligibility.router)
app.include_router(activity.router)


@app.get("/")
def root():
    return {
        "message": "FinPulse backend is running.",
        "docs": "/docs",
        "version": "3.0.0",
    }
