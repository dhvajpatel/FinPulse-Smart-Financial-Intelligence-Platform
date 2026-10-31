"""
AI Product Recommendation Engine — entries-driven.

Scores are computed from the user's own daily_entries data.
No synthetic credit_cards or transactions tables needed.
"""
from sqlalchemy.orm import Session
from database import models
from services.finance_service import get_spend_analysis, get_financial_health

PRODUCT_RULES = {
    "Travel Credit Card":          {"trigger_category": "Transport",    "min_income": 30000, "min_credit": 680},
    "Fuel Credit Card":            {"trigger_category": "Transport",    "min_income": 20000, "min_credit": 650},
    "Cashback Credit Card":        {"trigger_category": "Groceries",    "min_income": 20000, "min_credit": 650},
    "Premium Banking Account":     {"trigger_category": None,           "min_income": 150000, "min_credit": 750},
    "Personal Loan":               {"trigger_category": None,           "min_income": 25000, "min_credit": 600},
    "Fixed Deposit":               {"trigger_category": None,           "min_income": 0,     "min_credit": 0,  "needs_high_savings": True},
    "Investment Plan (Mutual Fund SIP)": {"trigger_category": None,    "min_income": 40000, "min_credit": 0,  "needs_high_savings": True},
    "Term Insurance":              {"trigger_category": None,           "min_income": 25000, "min_credit": 0},
}


def get_recommendations(db: Session, customer_id: str, top_k: int = 4):
    customer = db.query(models.Customer).filter_by(customer_id=customer_id).first()
    if not customer:
        return None

    spend  = get_spend_analysis(db, customer_id, months=3)
    health = get_financial_health(db, customer_id)

    spend_by_cat = {b["category"]: b["amount"] for b in (spend["breakdown"] if spend else [])}
    total_spend  = (spend["total_spent"] or 1) if spend else 1

    income       = customer.monthly_income or (health["monthly_income"] if health else 0)
    credit       = customer.credit_score or 650
    savings_ratio = health["savings_ratio"] if health else 0.0

    results = []
    for product, rule in PRODUCT_RULES.items():
        # Hard eligibility gate
        if income < rule["min_income"] * 0.7:
            continue
        if credit < rule["min_credit"] * 0.7:
            continue

        income_match = min(1.0, income / max(rule["min_income"], 1)) if rule["min_income"] else 1.0
        income_match = min(income_match, 1.5) / 1.5

        credit_eligibility = (
            1.0 if credit >= rule["min_credit"]
            else max(0.0, (credit - 300) / max(rule["min_credit"] - 300, 1))
        )

        cat = rule.get("trigger_category")
        spending_match = (
            min(1.0, (spend_by_cat.get(cat, 0) / total_spend) * 3)
            if cat else 0.3
        )

        savings_match = (
            min(1.0, savings_ratio * 2) if rule.get("needs_high_savings") else 0.5
        )

        health_norm = (health["financial_health_score"] / 100.0) if health else 0.5

        score = (
            0.25 * spending_match
            + 0.20 * income_match
            + 0.20 * credit_eligibility
            + 0.15 * savings_match
            + 0.10 * health_norm
            + 0.10 * 0.5   # reserved for segment signal
        )

        reasons = []
        if cat and spend_by_cat.get(cat, 0) > 0:
            pct = round(spend_by_cat[cat] / total_spend * 100)
            reasons.append(f"High {cat.lower()} spending ({pct}% of monthly spend)")
        if credit >= rule["min_credit"]:
            reasons.append("Credit score meets product eligibility")
        if health and health["financial_health_score"] >= 70:
            reasons.append("Strong overall financial health")
        if rule.get("needs_high_savings") and savings_ratio > 0.2:
            reasons.append("Healthy savings ratio")
        if not reasons:
            reasons.append("Meets baseline eligibility criteria")

        results.append({
            "product": product,
            "score": round(min(score, 0.99), 4),
            "reason": reasons,
        })

    results.sort(key=lambda r: -r["score"])
    return {"customer_id": customer_id, "recommendations": results[:top_k]}
