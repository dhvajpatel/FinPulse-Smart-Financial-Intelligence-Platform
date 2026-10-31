"""
Finance Intelligence service — entries-driven.

All data comes from daily_entries logged by the user.
No synthetic transaction data is used.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import models


def _aggregate_entries(db: Session, customer_id: str, months: int = 3) -> dict:
    """
    Aggregate the last `months` months of daily_entries into per-month buckets.
    Returns:
        avg_income, avg_expense, avg_savings, month_data list
    """
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
        month_map[month][etype] = float(total)

    all_months = sorted(month_map.values(), key=lambda x: x["month"])
    recent = all_months[-months:] if len(all_months) >= months else all_months
    n = len(recent) or 1

    avg_income  = sum(m["income"]  for m in recent) / n
    avg_expense = sum(m["expense"] for m in recent) / n
    avg_savings = sum(m["savings"] for m in recent) / n

    return {
        "avg_income": round(avg_income, 2),
        "avg_expense": round(avg_expense, 2),
        "avg_savings": round(avg_savings, 2),
        "month_data": recent,
        "has_data": len(recent) > 0,
    }


def get_financial_health(db: Session, customer_id: str):
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        return None

    agg = _aggregate_entries(db, customer_id, months=3)

    # Use entry-aggregated income if available, fall back to profile
    income   = agg["avg_income"] if agg["has_data"] else (customer.monthly_income or 0.0)
    spending = agg["avg_expense"]
    savings  = agg["avg_savings"] if agg["has_data"] else max(income - spending, 0.0)

    savings_ratio = savings / income if income else 0.0

    # Debt comes from profile field (user sets it manually)
    existing_debt = 0.0  # no synthetic loans table — user can set via profile/loan form
    dti = existing_debt / income if income else 0.0

    emp_years = customer.employment_years or 0.0
    credit    = customer.credit_score or 650

    # Weighted scoring
    income_stability_score  = min(100.0, (emp_years / 15.0) * 100.0)
    savings_score           = min(100.0, savings_ratio * 200.0)
    debt_score              = max(0.0, 100.0 - dti * 300.0)
    spending_score          = (
        max(0.0, 100.0 - max(0.0, (spending / income - 0.6)) * 250.0)
        if income else 50.0
    )
    credit_score_component  = min(100.0, max(0.0, (credit - 300.0) / 6.0))
    balance_score           = min(100.0, (savings / max(income, 1.0)) * 100.0)

    score = (
        0.20 * income_stability_score
        + 0.20 * savings_score
        + 0.20 * debt_score
        + 0.15 * spending_score
        + 0.15 * credit_score_component
        + 0.10 * balance_score
    )
    score = round(max(0, min(100, score)))

    if score >= 80:
        rating = "Excellent"
    elif score >= 65:
        rating = "Good"
    elif score >= 45:
        rating = "Fair"
    else:
        rating = "Needs Attention"

    return {
        "customer_id": customer_id,
        "monthly_income": round(income, 2),
        "monthly_spending": round(spending, 2),
        "savings": round(savings, 2),
        "savings_ratio": round(savings_ratio, 4),
        "debt_to_income": round(dti, 4),
        "financial_health_score": score,
        "rating": rating,
        "data_source": "daily_entries" if agg["has_data"] else "profile_fallback",
    }


def get_spend_analysis(db: Session, customer_id: str, months: int = 3):
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        return None

    # Build a date cutoff so the period selector actually filters data
    from datetime import date, timedelta
    today = date.today()
    # Go back `months` full calendar months from today
    # e.g. months=3 → cutoff = first day of the month 3 months ago
    cutoff_month = today.month - months
    cutoff_year  = today.year
    while cutoff_month <= 0:
        cutoff_month += 12
        cutoff_year  -= 1
    cutoff = date(cutoff_year, cutoff_month, 1).isoformat()

    # Expense entries in the selected period, grouped by category
    rows = (
        db.query(
            models.DailyEntry.category,
            func.sum(models.DailyEntry.amount).label("total"),
            func.count(models.DailyEntry.id).label("cnt"),
        )
        .filter(
            models.DailyEntry.customer_id == customer_id,
            models.DailyEntry.entry_type  == "expense",
            models.DailyEntry.entry_date  >= cutoff,
        )
        .group_by(models.DailyEntry.category)
        .order_by(func.sum(models.DailyEntry.amount).desc())
        .all()
    )

    grand_total = sum(float(r.total) for r in rows)
    total_for_pct = grand_total or 1.0   # avoid division by zero in pct calc

    breakdown = [
        {
            "category":     r.category,
            "amount":       round(float(r.total), 2),
            "pct_of_total": round(float(r.total) / total_for_pct * 100.0, 1),
        }
        for r in rows
    ]

    insights = _generate_insights(breakdown, grand_total)

    return {
        "customer_id":  customer_id,
        "period_months": months,
        "total_spent":  round(grand_total, 2),
        "breakdown":    breakdown,
        "insights":     insights,
    }


def _generate_insights(breakdown: list, total: float) -> list:
    """Simple rule-based insights from expense breakdown."""
    insights = []
    if not breakdown or total <= 0:
        insights.append("No expense entries for this period. Add daily entries to see spending insights.")
        return insights

    top = breakdown[0]
    if top["pct_of_total"] > 40:
        insights.append(
            f"{top['category']} is your largest expense at {top['pct_of_total']}% of total spending."
        )

    for b in breakdown:
        if b["category"] in ("Rent / EMI", "Loan Repayment") and b["pct_of_total"] > 35:
            insights.append(
                f"Housing/loan costs are {b['pct_of_total']}% of your spending — above the recommended 30%."
            )
        if b["category"] == "Dining Out" and b["pct_of_total"] > 15:
            insights.append(
                f"Dining out accounts for {b['pct_of_total']}% of spending. Consider meal-prepping to save."
            )
        if b["category"] == "Entertainment" and b["pct_of_total"] > 10:
            insights.append(
                f"Entertainment spending is {b['pct_of_total']}% — review subscriptions."
            )

    if not insights:
        insights.append(f"Spending spread across {len(breakdown)} categories — looking balanced.")

    return insights[:3]
