"""
Activity feed API.

Returns the N most-recent meaningful events for a user, derived
from their daily_entries and profile data.  No separate event table
is needed — we synthesise the feed from existing data.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database import models

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("/{customer_id}")
def get_activity(
    customer_id: str,
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Returns recent activity for a user as a list of notification-style events.
    Each event has: id, type, title, body, time (ISO string), read (always False
    from the server — the frontend tracks read state locally).
    """
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        return {"events": []}

    events = []

    # ── 1. Recent daily entries (last 20) ────────────────────────────────────
    entries = (
        db.query(models.DailyEntry)
        .filter_by(customer_id=customer_id)
        .order_by(models.DailyEntry.created_at.desc())
        .limit(20)
        .all()
    )

    type_icon = {"income": "💰", "expense": "💸", "savings": "🏦"}
    type_label = {"income": "Income entry", "expense": "Expense entry", "savings": "Savings entry"}

    for e in entries:
        icon  = type_icon.get(e.entry_type, "📌")
        label = type_label.get(e.entry_type, "Entry")
        events.append({
            "id":    f"entry_{e.id}",
            "type":  e.entry_type,
            "title": f"{icon} {label} added",
            "body":  f"₹{e.amount:,.0f} · {e.category} · {e.entry_date}",
            "time":  e.created_at,
            "read":  False,
        })

    # ── 2. Profile completeness nudges ────────────────────────────────────────
    missing = []
    if not customer.monthly_income or customer.monthly_income <= 0:
        missing.append("monthly income")
    if not customer.credit_score or customer.credit_score == 650:
        missing.append("credit score")
    if not customer.employment_years or customer.employment_years <= 0:
        missing.append("employment years")
    if not customer.occupation:
        missing.append("occupation")

    if missing:
        events.append({
            "id":    "profile_nudge",
            "type":  "profile",
            "title": "📋 Complete your profile",
            "body":  f"Add your {', '.join(missing[:2])} for better AI accuracy.",
            "time":  customer.created_at,
            "read":  False,
        })

    # ── 3. Monthly summary if entries exist ───────────────────────────────────
    monthly = (
        db.query(
            func.substr(models.DailyEntry.entry_date, 1, 7).label("month"),
            models.DailyEntry.entry_type,
            func.sum(models.DailyEntry.amount).label("total"),
        )
        .filter_by(customer_id=customer_id)
        .group_by("month", models.DailyEntry.entry_type)
        .order_by(func.substr(models.DailyEntry.entry_date, 1, 7).desc())
        .limit(10)
        .all()
    )

    month_map: dict = {}
    for month, etype, total in monthly:
        if month not in month_map:
            month_map[month] = {"month": month, "income": 0.0, "expense": 0.0}
        month_map[month][etype] = float(total)

    if month_map:
        latest = sorted(month_map.values(), key=lambda x: x["month"], reverse=True)[0]
        inc = latest.get("income", 0)
        exp = latest.get("expense", 0)
        net = inc - exp
        sign = "+" if net >= 0 else ""
        events.append({
            "id":    f"monthly_{latest['month']}",
            "type":  "summary",
            "title": f"📊 {latest['month']} summary ready",
            "body":  f"Income ₹{inc:,.0f} · Expense ₹{exp:,.0f} · Net {sign}₹{net:,.0f}",
            "time":  latest["month"] + "-01 00:00:00",
            "read":  False,
        })

    # ── 4. Account created event ──────────────────────────────────────────────
    events.append({
        "id":    "account_created",
        "type":  "account",
        "title": "🎉 Account created",
        "body":  f"Welcome to FinPulse, {customer.name.split()[0]}! Start by adding daily entries.",
        "time":  customer.created_at,
        "read":  True,   # always pre-read
    })

    # Sort by time descending, take limit
    events.sort(key=lambda x: x["time"] or "", reverse=True)
    return {"events": events[:limit]}
