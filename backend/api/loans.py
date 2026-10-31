import traceback
from fastapi import APIRouter, HTTPException
from database.schemas import LoanPredictRequest, LoanPredictResponse
from services import loan_service

router = APIRouter(prefix="/loans", tags=["Loans"])


@router.post("/predict", response_model=LoanPredictResponse)
def predict_loan(payload: LoanPredictRequest):
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
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}\n{traceback.format_exc()}")


@router.get("/health")
def loans_health():
    """Check model loading status without running a full prediction."""
    from pathlib import Path
    import sys
    ROOT = Path(__file__).resolve().parents[2]
    model_dir = ROOT / "ai" / "models"
    loan_pred_dir = ROOT / "ai" / "loan_prediction"
    return {
        "root": str(ROOT),
        "model_dir_exists": model_dir.exists(),
        "loan_pred_dir_exists": loan_pred_dir.exists(),
        "files": [f.name for f in model_dir.iterdir()] if model_dir.exists() else [],
        "sys_path": sys.path[:5],
    }
