"""
Customers API — profile CRUD and 360° view.
All financial data is derived from daily_entries, not synthetic tables.
"""
from datetime import date as _date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.connection import get_db
from database import models
from database.schemas import ProfileUpdate
from services import finance_service, recommendation_service

router = APIRouter(prefix="/customers", tags=["Customers"])


def _risk_band(credit_score) -> str:
    score = credit_score or 650
    if score >= 750:
        return "Low"
    if score >= 650:
        return "Medium"
    if score >= 550:
        return "Elevated"
    return "High"


@router.get("")
def list_customers(
    limit: int = 20,
    offset: int = 0,
    search: str = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Customer)
    if search:
        term = f"%{search}%"
        query = query.filter(
            models.Customer.customer_id.ilike(term)
            | models.Customer.name.ilike(term)
            | models.Customer.email.ilike(term)
        )
    total = query.count()
    customers = query.order_by(models.Customer.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "items": [
            {
                "customer_id": c.customer_id,
                "name": c.name,
                "age": c.age,
                "occupation": c.occupation,
                "monthly_income": c.monthly_income,
                "credit_score": c.credit_score,
                "employment_years": c.employment_years,
                "city": c.city,
                "email": c.email,
                "risk_band": _risk_band(c.credit_score),
            }
            for c in customers
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# ── All specific sub-routes MUST come before /{customer_id} ──────────────────

@router.get("/{customer_id}/loan-profile")
def customer_loan_profile(customer_id: str, db: Session = Depends(get_db)):
    """Returns fields needed to pre-fill the loan calculator."""
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Derive average income from recent entries if available
    health = finance_service.get_financial_health(db, customer_id)
    income = health["monthly_income"] if health else (customer.monthly_income or 0.0)

    return {
        "customer_id": customer.customer_id,
        "name": customer.name,
        "monthly_income": round(income, 2),
        "credit_score": customer.credit_score or 650,
        "employment_years": customer.employment_years or 0.0,
        "existing_debt": 0.0,  # user enters this manually in the loan form
    }


@router.get("/{customer_id}/360")
def customer_360(customer_id: str, db: Session = Depends(get_db)):
    """Combines finance health + spend breakdown + recommendations — all from daily_entries."""
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    health = finance_service.get_financial_health(db, customer_id)
    spend  = finance_service.get_spend_analysis(db, customer_id, months=3)
    recs   = recommendation_service.get_recommendations(db, customer_id)

    return {
        "customer": {
            "customer_id": customer.customer_id,
            "name": customer.name,
            "age": customer.age,
            "occupation": customer.occupation,
            "credit_score": customer.credit_score or 650,
            "monthly_income": customer.monthly_income or 0.0,
            "city": customer.city,
            "email": customer.email,
            "employment_years": customer.employment_years or 0.0,
            "risk_band": _risk_band(customer.credit_score),
        },
        "financial_health": health,
        "spending": spend,
        "recommendations": recs["recommendations"] if recs else [],
    }


# ── Generic single-customer lookup — MUST be last ────────────────────────────

@router.get("/{customer_id}")
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {
        "customer_id": customer.customer_id,
        "name": customer.name,
        "age": customer.age,
        "occupation": customer.occupation,
        "monthly_income": customer.monthly_income,
        "credit_score": customer.credit_score,
        "employment_years": customer.employment_years,
        "city": customer.city,
        "risk_band": _risk_band(customer.credit_score),
        "dob": customer.dob,
        "gender": customer.gender,
        "phone": customer.phone,
        "email": customer.email,
        "state": customer.state,
        "district": customer.district,
        "village": customer.village,
        "pan_number": customer.pan_number,
        "aadhaar_last4": customer.aadhaar_last4,
    }


# ── Profile update ────────────────────────────────────────────────────────────

@router.patch("/{customer_id}/profile")
def update_profile(
    customer_id: str,
    body: ProfileUpdate,
    db: Session = Depends(get_db),
):
    """Update editable profile fields for a customer."""
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = body.model_dump(exclude_unset=True)

    # Derive age from DOB when DOB is supplied
    if "dob" in update_data and update_data["dob"]:
        try:
            dob_date = _date.fromisoformat(update_data["dob"])
            today = _date.today()
            age = today.year - dob_date.year - (
                (today.month, today.day) < (dob_date.month, dob_date.day)
            )
            customer.age = age
        except ValueError:
            pass

    for field, value in update_data.items():
        if hasattr(customer, field):
            setattr(customer, field, value)

    db.commit()
    db.refresh(customer)

    return {
        "customer_id": customer.customer_id,
        "name": customer.name,
        "age": customer.age,
        "occupation": customer.occupation,
        "monthly_income": customer.monthly_income,
        "credit_score": customer.credit_score,
        "employment_years": customer.employment_years,
        "city": customer.city,
        "risk_band": _risk_band(customer.credit_score),
        "dob": customer.dob,
        "gender": customer.gender,
        "phone": customer.phone,
        "email": customer.email,
        "state": customer.state,
        "district": customer.district,
        "village": customer.village,
        "pan_number": customer.pan_number,
        "aadhaar_last4": customer.aadhaar_last4,
    }
