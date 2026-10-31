"""
Bank Loan Eligibility API
==========================
Evaluates a customer (or anonymous user) against all major Indian banks
using their daily-entry derived income / expense / savings averages.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database.connection import get_db
from database import models
from services.bank_eligibility_service import compute_eligibility

router = APIRouter(prefix="/bank-eligibility", tags=["Bank Loan Eligibility"])


# ── Request schema (for manual / anonymous call) ──────────────────────────────

class EligibilityRequest(BaseModel):
    avg_monthly_income: float
    avg_monthly_expense: float
    avg_monthly_savings: float = 0.0
    credit_score: int
    loan_type: str = "Personal Loan"
    requested_amount: Optional[float] = None
    tenure_months: Optional[int] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/calculate")
def calculate_eligibility(body: EligibilityRequest):
    """
    Anonymous / manual eligibility calculation.
    Pass raw income, expense and credit score — no customer record needed.
    """
    results = compute_eligibility(
        avg_monthly_income=body.avg_monthly_income,
        avg_monthly_expense=body.avg_monthly_expense,
        avg_monthly_savings=body.avg_monthly_savings,
        credit_score=body.credit_score,
        loan_type=body.loan_type,
        requested_amount=body.requested_amount,
        tenure_months=body.tenure_months,
    )
    eligible_count = sum(1 for r in results if r["eligible"])
    return {
        "total_banks": len(results),
        "eligible_banks": eligible_count,
        "results": results,
    }


@router.get("/{customer_id}")
def customer_eligibility(
    customer_id: str,
    loan_type: str = Query("Personal Loan"),
    requested_amount: Optional[float] = Query(None),
    tenure_months: Optional[int] = Query(None),
    history_months: int = Query(3, ge=1, le=12,
                                description="How many months of daily entries to average"),
    db: Session = Depends(get_db),
):
    """
    Compute loan eligibility for an existing customer using their
    daily-entry history as the income/expense source.
    Falls back to their stored monthly_income if no entries exist.
    """
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # ── Aggregate from DailyEntry ──────────────────────────────────────────────
    from sqlalchemy import func

    rows = (
        db.query(
            func.substr(models.DailyEntry.entry_date, 1, 7).label("month"),
            models.DailyEntry.entry_type,
            func.sum(models.DailyEntry.amount).label("total"),
        )
        .filter_by(customer_id=customer_id)
        .group_by("month", models.DailyEntry.entry_type)
        .order_by("month")
        .all()
    )

    # Collapse into per-month buckets
    month_map: dict = {}
    for month, etype, total in rows:
        if month not in month_map:
            month_map[month] = {"income": 0.0, "expense": 0.0, "savings": 0.0}
        month_map[month][etype] = float(total)

    recent_months = sorted(month_map.keys())[-history_months:]

    if recent_months:
        n = len(recent_months)
        avg_income  = sum(month_map[m]["income"]  for m in recent_months) / n
        avg_expense = sum(month_map[m]["expense"] for m in recent_months) / n
        avg_savings = sum(month_map[m]["savings"] for m in recent_months) / n
        data_source = "daily_entries"
    else:
        # Fallback to stored profile
        avg_income  = customer.monthly_income or 0
        avg_expense = avg_income * 0.6          # assume 60% expense
        avg_savings = avg_income * 0.1
        data_source = "profile_fallback"

    credit_score = customer.credit_score or 650

    results = compute_eligibility(
        avg_monthly_income=avg_income,
        avg_monthly_expense=avg_expense,
        avg_monthly_savings=avg_savings,
        credit_score=credit_score,
        loan_type=loan_type,
        requested_amount=requested_amount,
        tenure_months=tenure_months,
    )

    eligible_count = sum(1 for r in results if r["eligible"])

    return {
        "customer_id": customer_id,
        "data_source": data_source,
        "avg_monthly_income": round(avg_income, 2),
        "avg_monthly_expense": round(avg_expense, 2),
        "avg_monthly_savings": round(avg_savings, 2),
        "credit_score": credit_score,
        "loan_type": loan_type,
        "total_banks": len(results),
        "eligible_banks": eligible_count,
        "results": results,
    }
