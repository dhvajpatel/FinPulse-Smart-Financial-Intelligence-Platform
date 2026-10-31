"""
Analytics API — all data sourced from user's daily_entries.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.schemas import FinancialHealthResponse, SpendAnalysisResponse
from services import finance_service
from database import models

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/financial-health/{customer_id}")
def financial_health(customer_id: str, db: Session = Depends(get_db)):
    result = finance_service.get_financial_health(db, customer_id)
    if not result:
        raise HTTPException(status_code=404, detail="Customer not found")
    return result


@router.get("/spending/{customer_id}")
def spending(
    customer_id: str,
    months: int = Query(3, ge=1, le=24),
    db: Session = Depends(get_db),
):
    result = finance_service.get_spend_analysis(db, customer_id, months=months)
    if not result:
        raise HTTPException(status_code=404, detail="Customer not found")
    return result


@router.get("/spending-trend/{customer_id}")
def spending_trend(
    customer_id: str,
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
):
    """Monthly income/expense/savings totals from daily_entries — used for the trend chart."""
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

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

    month_map: dict = {}
    for month, etype, total in rows:
        if month not in month_map:
            month_map[month] = {"month": month, "income": 0.0, "expense": 0.0, "savings": 0.0}
        month_map[month][etype] = round(float(total), 2)

    all_months = sorted(month_map.values(), key=lambda x: x["month"])
    result = all_months[-months:] if len(all_months) > months else all_months

    # Rename "expense" key to "spending" for the chart
    trend = [
        {
            "month": m["month"],
            "income": m["income"],
            "spending": m["expense"],
            "savings": m["savings"],
        }
        for m in result
    ]
    return {"trend": trend}


@router.get("/risk-distribution")
def risk_distribution(db: Session = Depends(get_db)):
    """Credit score risk band counts across all registered customers."""
    rows = db.query(models.Customer.credit_score).all()
    bands = {"Low": 0, "Medium": 0, "Elevated": 0, "High": 0}
    for (score,) in rows:
        if score is None:
            bands["Elevated"] += 1
        elif score >= 750:
            bands["Low"] += 1
        elif score >= 650:
            bands["Medium"] += 1
        elif score >= 550:
            bands["Elevated"] += 1
        else:
            bands["High"] += 1
    return [{"name": k, "value": v} for k, v in bands.items()]
