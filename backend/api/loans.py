import json
import traceback
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from database import models
from database.schemas import LoanPredictRequest, LoanPredictResponse, LoanPredictionHistory
from services import loan_service

router = APIRouter(prefix="/loans", tags=["Loans"])


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


@router.post("/predict", response_model=LoanPredictResponse)
def predict_loan(payload: LoanPredictRequest, db: Session = Depends(get_db)):
    """Run AI loan risk prediction and optionally persist the result."""
    try:
        result = loan_service.predict_loan_risk(
            monthly_income=payload.monthly_income,
            credit_score=payload.credit_score,
            employment_years=payload.employment_years,
            requested_amount=payload.requested_amount,
            tenure_months=payload.tenure_months,
            existing_debt=payload.existing_debt,
            loan_type=payload.loan_type or "",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"{type(e).__name__}: {e}\n{traceback.format_exc()}"
        )

    # Persist to DB if a customer_id was provided
    row_id = None
    if payload.customer_id:
        customer = db.query(models.Customer).filter_by(
            customer_id=payload.customer_id
        ).first()
        if customer:
            record = models.LoanPrediction(
                customer_id=payload.customer_id,
                loan_type=payload.loan_type,
                monthly_income=payload.monthly_income,
                credit_score=payload.credit_score,
                employment_years=payload.employment_years,
                requested_amount=payload.requested_amount,
                tenure_months=payload.tenure_months,
                existing_debt=payload.existing_debt,
                approval_probability=result["approval_probability"],
                default_probability=result["default_probability"],
                risk_level=result["risk_level"],
                recommended_amount=result["recommended_amount"],
                recommended_tenure=result["recommended_tenure"],
                explanation=json.dumps(result["explanation"]),
                created_at=_now(),
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            row_id = record.id

    return {**result, "id": row_id}


@router.get("/history/{customer_id}", response_model=list[LoanPredictionHistory])
def loan_history(customer_id: str, limit: int = 20, db: Session = Depends(get_db)):
    """Return saved loan predictions for a customer, newest first."""
    rows = (
        db.query(models.LoanPrediction)
        .filter_by(customer_id=customer_id)
        .order_by(models.LoanPrediction.id.desc())
        .limit(limit)
        .all()
    )
    out = []
    for r in rows:
        out.append({
            "id": r.id,
            "customer_id": r.customer_id,
            "loan_type": r.loan_type,
            "monthly_income": r.monthly_income,
            "credit_score": r.credit_score,
            "employment_years": r.employment_years,
            "requested_amount": r.requested_amount,
            "tenure_months": r.tenure_months,
            "existing_debt": r.existing_debt,
            "approval_probability": r.approval_probability,
            "default_probability": r.default_probability,
            "risk_level": r.risk_level,
            "recommended_amount": r.recommended_amount,
            "recommended_tenure": r.recommended_tenure,
            "explanation": json.loads(r.explanation or "[]"),
            "created_at": r.created_at,
        })
    return out


@router.get("/health")
def loans_health():
    """Check model file presence and path resolution."""
    from pathlib import Path
    ROOT = Path(__file__).resolve().parents[2]
    model_dir = ROOT / "ai" / "models"
    return {
        "root": str(ROOT),
        "model_dir_exists": model_dir.exists(),
        "files": [f.name for f in model_dir.iterdir()] if model_dir.exists() else [],
    }
