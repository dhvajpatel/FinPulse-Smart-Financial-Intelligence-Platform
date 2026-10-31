"""
Admin API — platform-wide statistics from registered user data.
All analytics are computed from the customers and daily_entries tables.
"""
import json
from pathlib import Path
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database import models
from services import recommendation_service
from services.loan_service import predict_loan_risk
from services.bank_eligibility_service import compute_eligibility

router = APIRouter(prefix="/admin", tags=["Admin"])

ROOT = Path(__file__).resolve().parents[2]
MODEL_METRICS_PATH = ROOT / "ai" / "models" / "loan_metrics.json"


def _risk_band(score) -> str:
    s = score or 650
    if s >= 750: return "Low"
    if s >= 650: return "Medium"
    if s >= 550: return "Elevated"
    return "High"


@router.get("/statistics")
def statistics(db: Session = Depends(get_db)):
    total_customers = db.query(func.count(models.Customer.customer_id)).scalar() or 0
    total_entries   = db.query(func.count(models.DailyEntry.id)).scalar() or 0
    total_income    = (
        db.query(func.sum(models.DailyEntry.amount))
        .filter_by(entry_type="income").scalar()
    ) or 0.0
    total_expense   = (
        db.query(func.sum(models.DailyEntry.amount))
        .filter_by(entry_type="expense").scalar()
    ) or 0.0
    avg_credit_score = db.query(func.avg(models.Customer.credit_score)).scalar()
    high_risk = db.query(func.count(models.Customer.customer_id)).filter(
        models.Customer.credit_score < 550
    ).scalar() or 0

    return {
        "total_customers":  total_customers,
        "total_entries":    total_entries,
        "total_income":     round(total_income, 2),
        "total_expense":    round(total_expense, 2),
        "avg_credit_score": round(avg_credit_score, 1) if avg_credit_score else None,
        "high_risk_users":  high_risk,
    }


@router.get("/marketing-segments")
def marketing_segments(db: Session = Depends(get_db)):
    high_value = db.query(func.count(models.Customer.customer_id)).filter(
        models.Customer.monthly_income > 100000
    ).scalar() or 0
    credit_card_prospects = db.query(func.count(models.Customer.customer_id)).filter(
        models.Customer.credit_score >= 700
    ).scalar() or 0
    active_savers = (
        db.query(func.count(func.distinct(models.DailyEntry.customer_id)))
        .filter_by(entry_type="savings").scalar()
    ) or 0

    return {
        "high_value_customers":  high_value,
        "credit_card_prospects": credit_card_prospects,
        "active_savers":         active_savers,
    }


@router.get("/customer-analytics")
def customer_analytics(db: Session = Depends(get_db)):
    """Distributions for the Analytics page charts."""
    total = db.query(func.count(models.Customer.customer_id)).scalar() or 0

    # Credit score distribution
    score_rows = db.query(models.Customer.credit_score).all()
    score_bins = {"300-499": 0, "500-599": 0, "600-699": 0, "700-749": 0, "750-900": 0}
    for (s,) in score_rows:
        s = s or 650
        if   s < 500: score_bins["300-499"] += 1
        elif s < 600: score_bins["500-599"] += 1
        elif s < 700: score_bins["600-699"] += 1
        elif s < 750: score_bins["700-749"] += 1
        else:         score_bins["750-900"] += 1
    credit_score_dist = [{"range": k, "count": v} for k, v in score_bins.items()]

    # Income distribution (from profile)
    income_rows = db.query(models.Customer.monthly_income).filter(
        models.Customer.monthly_income != None,
        models.Customer.monthly_income > 0,
    ).all()
    income_bins = {"<20k": 0, "20-50k": 0, "50-100k": 0, "100-200k": 0, "200k+": 0}
    for (inc,) in income_rows:
        if   inc < 20000:  income_bins["<20k"]     += 1
        elif inc < 50000:  income_bins["20-50k"]   += 1
        elif inc < 100000: income_bins["50-100k"]  += 1
        elif inc < 200000: income_bins["100-200k"] += 1
        else:              income_bins["200k+"]    += 1
    income_dist = [{"range": k, "count": v} for k, v in income_bins.items()]

    # Age distribution
    age_rows = db.query(models.Customer.age).filter(models.Customer.age != None).all()
    age_bins = {"<21": 0, "21-30": 0, "31-40": 0, "41-50": 0, "51+": 0}
    for (a,) in age_rows:
        if   a < 21:  age_bins["<21"]   += 1
        elif a <= 30: age_bins["21-30"] += 1
        elif a <= 40: age_bins["31-40"] += 1
        elif a <= 50: age_bins["41-50"] += 1
        else:         age_bins["51+"]   += 1
    age_dist = [{"range": k, "count": v} for k, v in age_bins.items()]

    # Top cities
    city_rows = (
        db.query(models.Customer.city, func.count(models.Customer.customer_id))
        .filter(models.Customer.city != None)
        .group_by(models.Customer.city)
        .order_by(func.count(models.Customer.customer_id).desc())
        .limit(8).all()
    )
    top_cities = [{"city": c, "count": n} for c, n in city_rows]

    # Occupation split
    occ_rows = (
        db.query(models.Customer.occupation, func.count(models.Customer.customer_id))
        .filter(models.Customer.occupation != None)
        .group_by(models.Customer.occupation)
        .order_by(func.count(models.Customer.customer_id).desc())
        .all()
    )
    occ_dist = [{"occupation": o, "count": n} for o, n in occ_rows]

    return {
        "total_customers":           total,
        "credit_score_distribution": credit_score_dist,
        "income_distribution":       income_dist,
        "age_distribution":          age_dist,
        "top_cities":                top_cities,
        "occupation_distribution":   occ_dist,
    }


@router.get("/loan-analytics")
def loan_analytics(db: Session = Depends(get_db)):
    """Entry-based loan analytics — uses loan prediction records if stored, else returns zeros."""
    # Since we no longer pre-load synthetic loans, this returns platform-wide entry stats
    total_entries = db.query(func.count(models.DailyEntry.id)).scalar() or 0
    total_income  = (
        db.query(func.sum(models.DailyEntry.amount)).filter_by(entry_type="income").scalar()
    ) or 0.0
    total_expense = (
        db.query(func.sum(models.DailyEntry.amount)).filter_by(entry_type="expense").scalar()
    ) or 0.0
    total_savings = (
        db.query(func.sum(models.DailyEntry.amount)).filter_by(entry_type="savings").scalar()
    ) or 0.0

    # Top expense categories across all users
    cat_rows = (
        db.query(
            models.DailyEntry.category,
            func.sum(models.DailyEntry.amount).label("total"),
        )
        .filter_by(entry_type="expense")
        .group_by(models.DailyEntry.category)
        .order_by(func.sum(models.DailyEntry.amount).desc())
        .limit(8).all()
    )
    top_categories = [{"category": c, "total": round(float(t), 2)} for c, t in cat_rows]

    return {
        "total_entries":    total_entries,
        "total_income":     round(total_income, 2),
        "total_expense":    round(total_expense, 2),
        "total_savings":    round(total_savings, 2),
        "top_expense_categories": top_categories,
    }


@router.get("/marketing-prospects")
def marketing_prospects(
    segment: str = Query("high_value"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Return customers for a segment with their top AI recommendation."""
    query = db.query(models.Customer)
    if segment == "high_value":
        query = query.filter(models.Customer.monthly_income > 100000)
    elif segment == "credit_card":
        query = query.filter(models.Customer.credit_score >= 700)
    elif segment == "savers":
        saver_ids = (
            db.query(func.distinct(models.DailyEntry.customer_id))
            .filter_by(entry_type="savings")
            .subquery()
        )
        query = query.filter(models.Customer.customer_id.in_(saver_ids))

    customers = query.limit(limit).all()

    prospects = []
    for c in customers:
        recs = recommendation_service.get_recommendations(db, c.customer_id)
        top  = recs["recommendations"][0] if recs and recs["recommendations"] else None
        prospects.append({
            "customer_id":         c.customer_id,
            "name":                c.name,
            "city":                c.city,
            "credit_score":        c.credit_score or 650,
            "monthly_income":      c.monthly_income or 0,
            "recommended_product": top["product"] if top else None,
            "confidence":          round(top["score"] * 100, 1) if top else None,
        })

    return {"segment": segment, "total": len(prospects), "prospects": prospects}


@router.get("/loan-portfolio")
def loan_portfolio(
    loan_type: str    = Query("Personal Loan"),
    amount:    float  = Query(500000.0, ge=1000),
    tenure:    int    = Query(60, ge=6, le=360),
    limit:     int    = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Run AI loan risk + bank eligibility for every registered user and return
    a per-user portfolio view.  Results are computed on-the-fly (no stored loans).
    """
    customers = db.query(models.Customer).limit(limit).all()

    LOAN_TYPES = ["Personal Loan", "Home Loan", "Vehicle Loan", "Education Loan", "Business Loan"]
    if loan_type not in LOAN_TYPES:
        loan_type = "Personal Loan"

    # Helper: aggregate avg monthly income / expense / savings from daily_entries
    def _agg(customer_id: str):
        rows = (
            db.query(
                models.DailyEntry.entry_type,
                func.sum(models.DailyEntry.amount),
                func.count(models.DailyEntry.id),
            )
            .filter_by(customer_id=customer_id)
            .group_by(models.DailyEntry.entry_type)
            .all()
        )
        # Use positional access (index) to avoid SQLAlchemy label aliasing issues
        m = {r[0]: float(r[1]) / max(int(r[2]), 1) for r in rows}
        return (
            m.get("income",  0.0),
            m.get("expense", 0.0),
            m.get("savings", 0.0),
        )

    portfolio = []
    summary = {
        "total_users":      0,
        "approved":         0,  # LOW or MEDIUM risk
        "high_risk":        0,
        "avg_approval_pct": 0.0,
        "total_eligible_amount": 0.0,
        "banks_by_user": {},    # bank_name → count of users approved
    }

    approval_sum = 0.0

    for c in customers:
        avg_inc, avg_exp, avg_sav = _agg(c.customer_id)

        # Use entry-derived income where available, fall back to profile
        income  = avg_inc  if avg_inc > 0  else (c.monthly_income  or 0.0)
        expense = avg_exp
        credit  = c.credit_score    or 650
        emp_yrs = c.employment_years or 0.0

        # ── AI prediction ──────────────────────────────────────────────────────
        try:
            ai = predict_loan_risk(
                monthly_income    = income,
                credit_score      = credit,
                employment_years  = emp_yrs,
                requested_amount  = amount,
                tenure_months     = tenure,
                existing_debt     = expense * 0.2,  # rough proxy
                loan_type         = loan_type,
            )
        except Exception:
            ai = {
                "approval_probability": 0.5,
                "default_probability":  0.5,
                "risk_level":           "MEDIUM",
                "recommended_amount":   amount,
                "recommended_tenure":   tenure,
                "explanation":          [],
            }

        # ── Bank eligibility ───────────────────────────────────────────────────
        bank_results = compute_eligibility(
            avg_monthly_income  = income,
            avg_monthly_expense = expense,
            avg_monthly_savings = avg_sav,
            credit_score        = credit,
            loan_type           = loan_type,
            requested_amount    = amount,
            tenure_months       = tenure,
        )

        eligible_banks   = [b for b in bank_results if b["eligible"]]
        ineligible_banks = [b for b in bank_results if not b["eligible"]]
        top_bank         = eligible_banks[0] if eligible_banks else None

        # ── Aggregate summary ──────────────────────────────────────────────────
        summary["total_users"] += 1
        approval_sum += ai["approval_probability"]

        if ai["risk_level"] in ("LOW", "MEDIUM"):
            summary["approved"] += 1
        else:
            summary["high_risk"] += 1

        if top_bank:
            summary["total_eligible_amount"] += top_bank["eligible_amount"]
            bname = top_bank["bank_name"]
            summary["banks_by_user"][bname] = summary["banks_by_user"].get(bname, 0) + 1

        portfolio.append({
            "customer_id":         c.customer_id,
            "name":                c.name,
            "email":               c.email,
            "city":                c.city,
            "credit_score":        credit,
            "monthly_income":      round(income, 2),
            "risk_level":          ai["risk_level"],
            "approval_probability":round(ai["approval_probability"] * 100, 1),
            "default_probability": round(ai["default_probability"]  * 100, 1),
            "recommended_amount":  ai["recommended_amount"],
            "recommended_tenure":  ai["recommended_tenure"],
            "eligible_banks_count": len(eligible_banks),
            "total_banks":         len(bank_results),
            "top_bank":            top_bank["bank_name"]            if top_bank else None,
            "top_bank_amount":     top_bank["eligible_amount"]      if top_bank else 0,
            "top_bank_rate_min":   top_bank["interest_rate_min"]    if top_bank else None,
            "top_bank_rate_max":   top_bank["interest_rate_max"]    if top_bank else None,
            "top_bank_emi":        top_bank["est_emi"]              if top_bank else None,
            "explanation":         ai["explanation"],
            "eligible_banks":      eligible_banks[:5],    # top 5 for detail view
            "ineligible_count":    len(ineligible_banks),
        })

    if summary["total_users"] > 0:
        summary["avg_approval_pct"] = round(approval_sum / summary["total_users"] * 100, 1)
        summary["total_eligible_amount"] = round(summary["total_eligible_amount"], 2)

    # Top banks by user count
    top_banks = sorted(
        [{"bank": k, "count": v} for k, v in summary["banks_by_user"].items()],
        key=lambda x: -x["count"],
    )[:8]

    return {
        "loan_type":  loan_type,
        "amount":     amount,
        "tenure":     tenure,
        "summary":    summary,
        "top_banks":  top_banks,
        "portfolio":  portfolio,
    }


@router.get("/model-metrics")
def model_metrics():
    """Return the saved loan model evaluation metrics."""
    if not MODEL_METRICS_PATH.exists():
        return {
            "available": False,
            "detail": "Model not trained yet. Run ai/loan_prediction/train.py",
        }
    with open(MODEL_METRICS_PATH) as f:
        metrics = json.load(f)

    eval_keys = {"accuracy", "precision", "recall", "f1", "roc_auc"}
    return {
        "available": True,
        "model":    "LoanRiskNet V3 (GBR + PyTorch MLP Ensemble)",
        "version":  metrics.get("version", "v3"),
        "n_train":  metrics.get("n_train"),
        "n_test":   metrics.get("n_test"),
        "metrics":  {k: v for k, v in metrics.items() if k in eval_keys},
    }
