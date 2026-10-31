"""
Daily Financial Entries API
============================
Customers log their own income / expense / savings entries.
After each entry, the user's credit score is recomputed from their data.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database.connection import get_db
from database import models
from database.schemas import DailyEntryCreate, DailyEntryOut

router = APIRouter(prefix="/entries", tags=["Daily Entries"])


# ── helpers ───────────────────────────────────────────────────────────────────

VALID_TYPES = {"income", "expense", "savings"}

INCOME_CATEGORIES = [
    "Salary", "Freelance", "Business Profit", "Rental Income",
    "Investment Return", "Dividend", "Bonus", "Gift / Reward", "Other Income",
]
EXPENSE_CATEGORIES = [
    "Groceries", "Rent / EMI", "Utilities", "Transport", "Medical",
    "Education", "Entertainment", "Clothing", "Dining Out",
    "Insurance Premium", "Loan Repayment", "Shopping", "Other Expense",
]
SAVINGS_CATEGORIES = [
    "Bank Savings", "Fixed Deposit", "Recurring Deposit",
    "Gold / Jewellery", "Cash Savings", "Provident Fund",
    "Mutual Fund SIP", "Other Savings",
]

PAYMENT_METHODS = [
    "Cash", "UPI", "Credit Card", "Debit Card", "Net Banking", "Other",
]


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _customer_or_404(db: Session, customer_id: str):
    c = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


def _recompute_credit_score(db: Session, customer_id: str) -> int:
    """
    Compute a dynamic credit score (300–900) from the user's entry history.

    Components (total 100 pts → scaled to 300–900 range):
      Income Stability  20 pts  — has consistent income entries (≥3 months)
      Savings Ratio     25 pts  — avg_savings / avg_income
      Spending Control  20 pts  — avg_expense / avg_income (lower is better)
      Loan/EMI Burden   15 pts  — no Loan Repayment / Rent EMI overload
      Payment Method    10 pts  — using Credit Card (builds credit) vs cash only
      Entry Consistency 10 pts  — logging entries regularly (activity signal)

    Scaled: score = 300 + (raw_pts / 100) * 600  →  range 300–900
    """
    # Aggregate per month and type
    rows = (
        db.query(
            func.substr(models.DailyEntry.entry_date, 1, 7).label("month"),
            models.DailyEntry.entry_type,
            func.sum(models.DailyEntry.amount),
            func.count(models.DailyEntry.id),
        )
        .filter_by(customer_id=customer_id)
        .group_by(
            func.substr(models.DailyEntry.entry_date, 1, 7),
            models.DailyEntry.entry_type,
        )
        .all()
    )

    month_inc: dict = {}   # month → income total
    month_exp: dict = {}   # month → expense total
    month_sav: dict = {}   # month → savings total

    for month, etype, total, _cnt in rows:
        val = float(total)
        if etype == "income":
            month_inc[month] = month_inc.get(month, 0) + val
        elif etype == "expense":
            month_exp[month] = month_exp.get(month, 0) + val
        elif etype == "savings":
            month_sav[month] = month_sav.get(month, 0) + val

    all_months = sorted(set(month_inc) | set(month_exp) | set(month_sav))
    n_months = len(all_months)

    if n_months == 0:
        # No data — return neutral default
        return 650

    n_recent = min(n_months, 6)
    recent = all_months[-n_recent:]

    avg_inc = sum(month_inc.get(m, 0) for m in recent) / n_recent
    avg_exp = sum(month_exp.get(m, 0) for m in recent) / n_recent
    avg_sav = sum(month_sav.get(m, 0) for m in recent) / n_recent

    # ── Component 1: Income Stability (20 pts) ───────────────────────────────
    # Full marks for ≥6 months of income data
    stability = min(20.0, (n_months / 6.0) * 20.0)

    # ── Component 2: Savings Ratio (25 pts) ──────────────────────────────────
    if avg_inc > 0:
        sav_ratio = avg_sav / avg_inc
        savings_pts = min(25.0, sav_ratio * 100.0)   # 25% savings → full marks
    else:
        savings_pts = 0.0

    # ── Component 3: Spending Control (20 pts) ───────────────────────────────
    # spending ≤ 50% of income → full marks; ≥ 90% → 0
    if avg_inc > 0:
        spend_ratio = avg_exp / avg_inc
        spending_pts = max(0.0, 20.0 - max(0.0, (spend_ratio - 0.5)) * 50.0)
    else:
        spending_pts = 10.0   # neutral when no income logged

    # ── Component 4: Loan / EMI Burden (15 pts) ──────────────────────────────
    loan_rows = (
        db.query(func.sum(models.DailyEntry.amount))
        .filter(
            models.DailyEntry.customer_id == customer_id,
            models.DailyEntry.entry_type == "expense",
            models.DailyEntry.category.in_(["Loan Repayment", "Rent / EMI"]),
        )
        .scalar()
    ) or 0.0
    total_exp_all = (
        db.query(func.sum(models.DailyEntry.amount))
        .filter_by(customer_id=customer_id, entry_type="expense")
        .scalar()
    ) or 1.0
    loan_pct = float(loan_rows) / float(total_exp_all)
    loan_pts = max(0.0, 15.0 - loan_pct * 30.0)   # >50% loan/EMI → 0 pts

    # ── Component 5: Payment Method (10 pts) ─────────────────────────────────
    # Using Credit Card or Debit Card signals formal banking behaviour
    card_rows = (
        db.query(func.count(models.DailyEntry.id))
        .filter(
            models.DailyEntry.customer_id == customer_id,
            models.DailyEntry.payment_method.in_(["Credit Card", "Debit Card", "Net Banking", "UPI"]),
        )
        .scalar()
    ) or 0
    total_entries = (
        db.query(func.count(models.DailyEntry.id))
        .filter_by(customer_id=customer_id)
        .scalar()
    ) or 1
    digital_ratio = card_rows / total_entries
    payment_pts = min(10.0, digital_ratio * 10.0)

    # ── Component 6: Entry Consistency (10 pts) ───────────────────────────────
    # Logging ≥12 entries per month on average shows good financial discipline
    total_count = (
        db.query(func.count(models.DailyEntry.id))
        .filter_by(customer_id=customer_id)
        .scalar()
    ) or 0
    avg_entries_per_month = total_count / max(n_months, 1)
    consistency_pts = min(10.0, (avg_entries_per_month / 12.0) * 10.0)

    raw = stability + savings_pts + spending_pts + loan_pts + payment_pts + consistency_pts
    # Scale to 300–900
    score = int(round(300 + (raw / 100.0) * 600))
    score = max(300, min(900, score))
    return score


# ── meta ──────────────────────────────────────────────────────────────────────

@router.get("/categories")
def list_categories():
    """Return categorised lists for the entry form dropdowns."""
    return {
        "income":          INCOME_CATEGORIES,
        "expense":         EXPENSE_CATEGORIES,
        "savings":         SAVINGS_CATEGORIES,
        "payment_methods": PAYMENT_METHODS,
    }


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("/{customer_id}", response_model=DailyEntryOut, status_code=201)
def add_entry(
    customer_id: str,
    body: DailyEntryCreate,
    db: Session = Depends(get_db),
):
    """Add a daily financial entry and recompute the user's credit score."""
    customer = _customer_or_404(db, customer_id)

    if body.entry_type not in VALID_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"entry_type must be one of {sorted(VALID_TYPES)}",
        )
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="amount must be positive")

    if body.payment_method and body.payment_method not in PAYMENT_METHODS:
        raise HTTPException(
            status_code=422,
            detail=f"payment_method must be one of {PAYMENT_METHODS}",
        )

    entry = models.DailyEntry(
        customer_id=customer_id,
        entry_date=body.entry_date,
        entry_type=body.entry_type,
        category=body.category,
        amount=body.amount,
        payment_method=body.payment_method,
        note=body.note,
        created_at=_now_str(),
    )
    db.add(entry)
    db.flush()   # write entry so _recompute sees it

    # Auto-update credit score from all entry data
    new_score = _recompute_credit_score(db, customer_id)
    customer.credit_score = new_score

    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{customer_id}", response_model=None)
def list_entries(
    customer_id: str,
    entry_type: str = Query(None, description="Filter by income/expense/savings"),
    start_date: str = Query(None, description="YYYY-MM-DD"),
    end_date: str = Query(None, description="YYYY-MM-DD"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Paginated entries for a customer with optional filters."""
    _customer_or_404(db, customer_id)

    q = db.query(models.DailyEntry).filter_by(customer_id=customer_id)
    if entry_type:
        q = q.filter(models.DailyEntry.entry_type == entry_type)
    if start_date:
        q = q.filter(models.DailyEntry.entry_date >= start_date)
    if end_date:
        q = q.filter(models.DailyEntry.entry_date <= end_date)

    total = q.count()
    entries = (
        q.order_by(
            models.DailyEntry.entry_date.desc(),
            models.DailyEntry.id.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "id":             e.id,
                "customer_id":    e.customer_id,
                "entry_date":     e.entry_date,
                "entry_type":     e.entry_type,
                "category":       e.category,
                "amount":         e.amount,
                "payment_method": e.payment_method,
                "note":           e.note,
                "created_at":     e.created_at,
            }
            for e in entries
        ],
        "total":  total,
        "limit":  limit,
        "offset": offset,
    }


@router.delete("/{customer_id}/{entry_id}", status_code=204)
def delete_entry(
    customer_id: str,
    entry_id: int,
    db: Session = Depends(get_db),
):
    """Delete a single entry and recompute credit score."""
    customer = _customer_or_404(db, customer_id)
    entry = (
        db.query(models.DailyEntry)
        .filter_by(id=entry_id, customer_id=customer_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.flush()

    # Recompute after deletion
    new_score = _recompute_credit_score(db, customer_id)
    customer.credit_score = new_score

    db.commit()


# ── Summary / Analytics ───────────────────────────────────────────────────────

@router.get("/{customer_id}/summary/monthly")
def monthly_summary(
    customer_id: str,
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
):
    """Returns last N months of aggregated income / expense / savings."""
    _customer_or_404(db, customer_id)

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

    sorted_months = sorted(month_map.values(), key=lambda x: x["month"])
    result = sorted_months[-months:] if len(sorted_months) > months else sorted_months

    total_income  = sum(m["income"]  for m in result)
    total_expense = sum(m["expense"] for m in result)
    total_savings = sum(m["savings"] for m in result)
    n = len(result) or 1

    return {
        "customer_id":    customer_id,
        "months_covered": len(result),
        "monthly":        result,
        "totals": {
            "income":  round(total_income,  2),
            "expense": round(total_expense, 2),
            "savings": round(total_savings, 2),
        },
        "averages": {
            "monthly_income":  round(total_income  / n, 2),
            "monthly_expense": round(total_expense / n, 2),
            "monthly_savings": round(total_savings / n, 2),
        },
    }


@router.get("/{customer_id}/summary/category")
def category_summary(
    customer_id: str,
    entry_type: str = Query("expense", description="income / expense / savings"),
    db: Session = Depends(get_db),
):
    """Category-level breakdown for a given entry type (default: expense)."""
    _customer_or_404(db, customer_id)

    rows = (
        db.query(
            models.DailyEntry.category,
            func.sum(models.DailyEntry.amount).label("total"),
            func.count(models.DailyEntry.id).label("count"),
        )
        .filter_by(customer_id=customer_id, entry_type=entry_type)
        .group_by(models.DailyEntry.category)
        .order_by(func.sum(models.DailyEntry.amount).desc())
        .all()
    )

    grand_total = sum(float(r.total) for r in rows) or 1.0
    return {
        "customer_id": customer_id,
        "entry_type":  entry_type,
        "breakdown": [
            {
                "category":     r.category,
                "total":        round(float(r.total), 2),
                "count":        r.count,
                "pct":          round(float(r.total) / grand_total * 100, 1),
                "pct_of_total": round(float(r.total) / grand_total * 100, 1),  # alias for compatibility
            }
            for r in rows
        ],
    }


@router.get("/{customer_id}/summary/payment-method")
def payment_method_summary(
    customer_id: str,
    entry_type: str = Query("expense", description="income / expense / savings"),
    db: Session = Depends(get_db),
):
    """Breakdown of total amounts by payment method."""
    _customer_or_404(db, customer_id)

    rows = (
        db.query(
            models.DailyEntry.payment_method,
            func.sum(models.DailyEntry.amount).label("total"),
            func.count(models.DailyEntry.id).label("count"),
        )
        .filter_by(customer_id=customer_id, entry_type=entry_type)
        .filter(models.DailyEntry.payment_method.isnot(None))
        .group_by(models.DailyEntry.payment_method)
        .order_by(func.sum(models.DailyEntry.amount).desc())
        .all()
    )

    grand_total = sum(float(r.total) for r in rows) or 1.0
    return {
        "customer_id": customer_id,
        "entry_type":  entry_type,
        "breakdown": [
            {
                "payment_method": r.payment_method,
                "total":          round(float(r.total), 2),
                "count":          r.count,
                "pct":            round(float(r.total) / grand_total * 100, 1),
            }
            for r in rows
        ],
    }
