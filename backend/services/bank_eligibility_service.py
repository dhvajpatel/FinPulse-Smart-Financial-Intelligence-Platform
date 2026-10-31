"""
Indian Bank Loan Eligibility Service
======================================
Evaluates a customer's eligibility across all major Indian banks
using their daily-entry history (avg monthly income / expense / savings)
plus their stored credit score.

Banks covered (28 public + private + small-finance + cooperative):
  Public Sector: SBI, PNB, Bank of Baroda, Bank of India, Canara Bank,
                 Union Bank, Indian Bank, Central Bank, UCO Bank,
                 Bank of Maharashtra, Punjab & Sind Bank, Indian Overseas Bank
  Private Sector: HDFC Bank, ICICI Bank, Axis Bank, Kotak Mahindra Bank,
                  Yes Bank, IDFC First Bank, IndusInd Bank, Federal Bank,
                  South Indian Bank, RBL Bank, Bandhan Bank
  Small Finance:  AU Small Finance Bank, Jana Small Finance Bank,
                  Ujjivan Small Finance Bank, Equitas Small Finance Bank
  Cooperative:    Saraswat Bank
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional


# ── Bank catalogue ─────────────────────────────────────────────────────────────

@dataclass
class BankProduct:
    bank_name: str
    bank_type: str            # Public / Private / Small Finance / Cooperative
    loan_types: List[str]     # which loan types this bank offers
    min_income: float         # minimum avg monthly income (₹)
    min_credit_score: int
    max_loan_multiplier: float  # max_loan = avg_monthly_income × multiplier
    max_cap: float              # hard ceiling (₹)
    interest_rate_min: float    # % p.a.
    interest_rate_max: float
    max_tenure_months: int
    processing_fee_pct: float   # % of loan amount
    notes: str = ""


BANK_CATALOGUE: List[BankProduct] = [
    # ── Public Sector ──────────────────────────────────────────────────────────
    BankProduct(
        bank_name="State Bank of India (SBI)",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Education Loan", "Vehicle Loan", "Business Loan"],
        min_income=15000, min_credit_score=650,
        max_loan_multiplier=60, max_cap=10_000_000,
        interest_rate_min=7.9, interest_rate_max=14.5,
        max_tenure_months=360,
        processing_fee_pct=0.5,
        notes="India's largest bank. Preferential rates for govt employees.",
    ),
    BankProduct(
        bank_name="Punjab National Bank (PNB)",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Education Loan", "Vehicle Loan"],
        min_income=12000, min_credit_score=640,
        max_loan_multiplier=48, max_cap=7_500_000,
        interest_rate_min=8.15, interest_rate_max=15.0,
        max_tenure_months=300,
        processing_fee_pct=0.45,
    ),
    BankProduct(
        bank_name="Bank of Baroda",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Education Loan", "Vehicle Loan", "Business Loan"],
        min_income=15000, min_credit_score=650,
        max_loan_multiplier=54, max_cap=8_000_000,
        interest_rate_min=8.1, interest_rate_max=14.9,
        max_tenure_months=360,
        processing_fee_pct=0.5,
    ),
    BankProduct(
        bank_name="Bank of India",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Vehicle Loan", "Business Loan"],
        min_income=12000, min_credit_score=635,
        max_loan_multiplier=48, max_cap=7_500_000,
        interest_rate_min=8.3, interest_rate_max=15.2,
        max_tenure_months=300,
        processing_fee_pct=0.5,
    ),
    BankProduct(
        bank_name="Canara Bank",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Education Loan", "Vehicle Loan"],
        min_income=14000, min_credit_score=645,
        max_loan_multiplier=50, max_cap=7_500_000,
        interest_rate_min=8.25, interest_rate_max=15.0,
        max_tenure_months=300,
        processing_fee_pct=0.5,
    ),
    BankProduct(
        bank_name="Union Bank of India",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Education Loan", "Vehicle Loan"],
        min_income=12000, min_credit_score=635,
        max_loan_multiplier=48, max_cap=7_000_000,
        interest_rate_min=8.35, interest_rate_max=15.5,
        max_tenure_months=300,
        processing_fee_pct=0.5,
    ),
    BankProduct(
        bank_name="Indian Bank",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Education Loan", "Vehicle Loan"],
        min_income=10000, min_credit_score=630,
        max_loan_multiplier=45, max_cap=6_000_000,
        interest_rate_min=8.4, interest_rate_max=15.5,
        max_tenure_months=240,
        processing_fee_pct=0.5,
    ),
    BankProduct(
        bank_name="Central Bank of India",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Education Loan"],
        min_income=10000, min_credit_score=620,
        max_loan_multiplier=42, max_cap=5_000_000,
        interest_rate_min=8.5, interest_rate_max=16.0,
        max_tenure_months=240,
        processing_fee_pct=0.5,
    ),
    BankProduct(
        bank_name="UCO Bank",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Education Loan"],
        min_income=10000, min_credit_score=620,
        max_loan_multiplier=40, max_cap=5_000_000,
        interest_rate_min=8.45, interest_rate_max=15.9,
        max_tenure_months=240,
        processing_fee_pct=0.5,
    ),
    BankProduct(
        bank_name="Bank of Maharashtra",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Vehicle Loan"],
        min_income=10000, min_credit_score=620,
        max_loan_multiplier=40, max_cap=5_000_000,
        interest_rate_min=8.6, interest_rate_max=15.8,
        max_tenure_months=240,
        processing_fee_pct=0.5,
    ),
    BankProduct(
        bank_name="Punjab & Sind Bank",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Education Loan"],
        min_income=10000, min_credit_score=620,
        max_loan_multiplier=40, max_cap=5_000_000,
        interest_rate_min=8.5, interest_rate_max=15.5,
        max_tenure_months=240,
        processing_fee_pct=0.5,
    ),
    BankProduct(
        bank_name="Indian Overseas Bank",
        bank_type="Public",
        loan_types=["Home Loan", "Personal Loan", "Education Loan", "Vehicle Loan"],
        min_income=10000, min_credit_score=625,
        max_loan_multiplier=42, max_cap=5_000_000,
        interest_rate_min=8.45, interest_rate_max=15.7,
        max_tenure_months=240,
        processing_fee_pct=0.5,
    ),
    # ── Private Sector ─────────────────────────────────────────────────────────
    BankProduct(
        bank_name="HDFC Bank",
        bank_type="Private",
        loan_types=["Home Loan", "Personal Loan", "Vehicle Loan", "Business Loan", "Education Loan"],
        min_income=25000, min_credit_score=700,
        max_loan_multiplier=60, max_cap=15_000_000,
        interest_rate_min=8.5, interest_rate_max=21.0,
        max_tenure_months=360,
        processing_fee_pct=1.0,
        notes="Instant digital approval for existing customers.",
    ),
    BankProduct(
        bank_name="ICICI Bank",
        bank_type="Private",
        loan_types=["Home Loan", "Personal Loan", "Vehicle Loan", "Business Loan", "Education Loan"],
        min_income=25000, min_credit_score=700,
        max_loan_multiplier=60, max_cap=15_000_000,
        interest_rate_min=8.75, interest_rate_max=20.0,
        max_tenure_months=360,
        processing_fee_pct=1.0,
        notes="Pre-approved offers available via iMobile.",
    ),
    BankProduct(
        bank_name="Axis Bank",
        bank_type="Private",
        loan_types=["Home Loan", "Personal Loan", "Vehicle Loan", "Business Loan"],
        min_income=20000, min_credit_score=680,
        max_loan_multiplier=54, max_cap=12_000_000,
        interest_rate_min=9.0, interest_rate_max=21.0,
        max_tenure_months=360,
        processing_fee_pct=1.0,
    ),
    BankProduct(
        bank_name="Kotak Mahindra Bank",
        bank_type="Private",
        loan_types=["Home Loan", "Personal Loan", "Vehicle Loan"],
        min_income=20000, min_credit_score=700,
        max_loan_multiplier=54, max_cap=10_000_000,
        interest_rate_min=8.7, interest_rate_max=20.0,
        max_tenure_months=360,
        processing_fee_pct=1.0,
    ),
    BankProduct(
        bank_name="Yes Bank",
        bank_type="Private",
        loan_types=["Home Loan", "Personal Loan", "Business Loan"],
        min_income=20000, min_credit_score=680,
        max_loan_multiplier=50, max_cap=8_000_000,
        interest_rate_min=9.4, interest_rate_max=22.0,
        max_tenure_months=300,
        processing_fee_pct=1.25,
    ),
    BankProduct(
        bank_name="IDFC First Bank",
        bank_type="Private",
        loan_types=["Home Loan", "Personal Loan", "Vehicle Loan"],
        min_income=18000, min_credit_score=680,
        max_loan_multiplier=48, max_cap=8_000_000,
        interest_rate_min=9.5, interest_rate_max=23.0,
        max_tenure_months=300,
        processing_fee_pct=1.0,
    ),
    BankProduct(
        bank_name="IndusInd Bank",
        bank_type="Private",
        loan_types=["Personal Loan", "Vehicle Loan", "Business Loan"],
        min_income=18000, min_credit_score=680,
        max_loan_multiplier=48, max_cap=7_500_000,
        interest_rate_min=10.49, interest_rate_max=26.0,
        max_tenure_months=240,
        processing_fee_pct=1.0,
    ),
    BankProduct(
        bank_name="Federal Bank",
        bank_type="Private",
        loan_types=["Home Loan", "Personal Loan", "Vehicle Loan", "Education Loan"],
        min_income=15000, min_credit_score=660,
        max_loan_multiplier=48, max_cap=7_500_000,
        interest_rate_min=9.0, interest_rate_max=18.0,
        max_tenure_months=300,
        processing_fee_pct=0.75,
    ),
    BankProduct(
        bank_name="South Indian Bank",
        bank_type="Private",
        loan_types=["Home Loan", "Personal Loan", "Vehicle Loan", "Education Loan"],
        min_income=12000, min_credit_score=650,
        max_loan_multiplier=45, max_cap=6_000_000,
        interest_rate_min=9.25, interest_rate_max=17.5,
        max_tenure_months=300,
        processing_fee_pct=0.75,
    ),
    BankProduct(
        bank_name="RBL Bank",
        bank_type="Private",
        loan_types=["Personal Loan", "Business Loan"],
        min_income=20000, min_credit_score=700,
        max_loan_multiplier=40, max_cap=5_000_000,
        interest_rate_min=13.0, interest_rate_max=25.0,
        max_tenure_months=120,
        processing_fee_pct=2.0,
    ),
    BankProduct(
        bank_name="Bandhan Bank",
        bank_type="Private",
        loan_types=["Home Loan", "Personal Loan", "Business Loan"],
        min_income=10000, min_credit_score=620,
        max_loan_multiplier=36, max_cap=5_000_000,
        interest_rate_min=9.15, interest_rate_max=19.0,
        max_tenure_months=240,
        processing_fee_pct=1.0,
        notes="Strong focus on small-business and rural borrowers.",
    ),
    # ── Small Finance Banks ────────────────────────────────────────────────────
    BankProduct(
        bank_name="AU Small Finance Bank",
        bank_type="Small Finance",
        loan_types=["Personal Loan", "Vehicle Loan", "Business Loan"],
        min_income=10000, min_credit_score=600,
        max_loan_multiplier=30, max_cap=2_500_000,
        interest_rate_min=12.0, interest_rate_max=28.0,
        max_tenure_months=120,
        processing_fee_pct=2.0,
    ),
    BankProduct(
        bank_name="Jana Small Finance Bank",
        bank_type="Small Finance",
        loan_types=["Personal Loan", "Business Loan"],
        min_income=8000, min_credit_score=580,
        max_loan_multiplier=24, max_cap=2_000_000,
        interest_rate_min=13.5, interest_rate_max=30.0,
        max_tenure_months=84,
        processing_fee_pct=2.0,
        notes="Serves underbanked and rural customers.",
    ),
    BankProduct(
        bank_name="Ujjivan Small Finance Bank",
        bank_type="Small Finance",
        loan_types=["Personal Loan", "Business Loan"],
        min_income=8000, min_credit_score=580,
        max_loan_multiplier=24, max_cap=2_000_000,
        interest_rate_min=14.0, interest_rate_max=28.0,
        max_tenure_months=60,
        processing_fee_pct=2.0,
    ),
    BankProduct(
        bank_name="Equitas Small Finance Bank",
        bank_type="Small Finance",
        loan_types=["Personal Loan", "Vehicle Loan", "Business Loan"],
        min_income=8000, min_credit_score=580,
        max_loan_multiplier=24, max_cap=1_500_000,
        interest_rate_min=13.0, interest_rate_max=29.0,
        max_tenure_months=84,
        processing_fee_pct=2.0,
    ),
    # ── Cooperative ───────────────────────────────────────────────────────────
    BankProduct(
        bank_name="Saraswat Bank",
        bank_type="Cooperative",
        loan_types=["Home Loan", "Personal Loan", "Vehicle Loan", "Education Loan"],
        min_income=12000, min_credit_score=640,
        max_loan_multiplier=40, max_cap=5_000_000,
        interest_rate_min=9.0, interest_rate_max=16.0,
        max_tenure_months=240,
        processing_fee_pct=0.75,
        notes="Largest urban cooperative bank in India.",
    ),
]


# ── Eligibility engine ─────────────────────────────────────────────────────────

def _emi(principal: float, annual_rate: float, months: int) -> float:
    """Standard EMI formula."""
    r = annual_rate / 100 / 12
    if r == 0 or months == 0:
        return principal / months if months else 0
    return principal * r * (1 + r) ** months / ((1 + r) ** months - 1)


def compute_eligibility(
    avg_monthly_income: float,
    avg_monthly_expense: float,
    avg_monthly_savings: float,
    credit_score: int,
    loan_type: str = "Personal Loan",
    requested_amount: Optional[float] = None,
    tenure_months: Optional[int] = None,
) -> List[dict]:
    """
    Return a list of bank eligibility records sorted by eligible amount descending.

    Logic:
    - Disposable income = income - expense  (floor: 0)
    - EMI capacity = 50% of disposable income  (conservative limit)
    - Max loan from this bank = min(income × multiplier, cap)
    - Approved if: income >= min_income AND credit_score >= min_credit AND loan_type offered
    - Eligible amount = min(max_loan_from_bank, requested_amount or max_loan_from_bank)
    """
    disposable    = max(avg_monthly_income - avg_monthly_expense, 0)
    emi_capacity  = disposable * 0.50   # 50 % FOIR rule (Fixed Obligation to Income)

    results = []

    for bank in BANK_CATALOGUE:
        # Basic eligibility gates
        eligible = (
            avg_monthly_income >= bank.min_income
            and credit_score >= bank.min_credit_score
            and loan_type in bank.loan_types
        )

        if not eligible:
            reason = []
            if avg_monthly_income < bank.min_income:
                reason.append(
                    f"Income ₹{avg_monthly_income:,.0f} < min ₹{bank.min_income:,.0f}"
                )
            if credit_score < bank.min_credit_score:
                reason.append(
                    f"Credit score {credit_score} < min {bank.min_credit_score}"
                )
            if loan_type not in bank.loan_types:
                reason.append(f"{loan_type} not offered by this bank")

            results.append({
                "bank_name": bank.bank_name,
                "bank_type": bank.bank_type,
                "eligible": False,
                "reasons_not_eligible": reason,
                "eligible_amount": 0,
                "interest_rate_min": bank.interest_rate_min,
                "interest_rate_max": bank.interest_rate_max,
                "max_tenure_months": bank.max_tenure_months,
                "processing_fee_pct": bank.processing_fee_pct,
                "est_emi": None,
                "loan_types_offered": bank.loan_types,
                "notes": bank.notes,
            })
            continue

        # Eligible — compute amount
        max_by_income = avg_monthly_income * bank.max_loan_multiplier
        max_by_cap    = bank.max_cap
        bank_max      = min(max_by_income, max_by_cap)

        eligible_amount = bank_max
        if requested_amount:
            eligible_amount = min(bank_max, requested_amount)

        eligible_amount = round(eligible_amount / 1000) * 1000   # round to nearest ₹1000

        # EMI affordability check — downgrade if EMI exceeds capacity
        t = tenure_months or bank.max_tenure_months
        t = min(t, bank.max_tenure_months)
        mid_rate = (bank.interest_rate_min + bank.interest_rate_max) / 2
        est_emi  = _emi(eligible_amount, mid_rate, t)

        emi_ok = est_emi <= emi_capacity

        # Build savings / affordability note
        afford_note = (
            f"Est. EMI ₹{est_emi:,.0f}/mo on mid-rate {mid_rate:.1f}% — "
            + ("within your repayment capacity." if emi_ok
               else f"exceeds 50% of disposable income ₹{disposable:,.0f}. Consider lower amount or longer tenure.")
        )

        results.append({
            "bank_name": bank.bank_name,
            "bank_type": bank.bank_type,
            "eligible": True,
            "eligible_amount": eligible_amount,
            "interest_rate_min": bank.interest_rate_min,
            "interest_rate_max": bank.interest_rate_max,
            "max_tenure_months": bank.max_tenure_months,
            "processing_fee_pct": bank.processing_fee_pct,
            "est_emi": round(est_emi, 0),
            "emi_within_capacity": emi_ok,
            "emi_capacity": round(emi_capacity, 0),
            "loan_types_offered": bank.loan_types,
            "notes": (bank.notes + "  " + afford_note).strip() if bank.notes else afford_note,
        })

    # Sort: eligible first (by amount desc), then ineligible
    eligible_banks   = sorted([r for r in results if r["eligible"]],
                               key=lambda x: -x["eligible_amount"])
    ineligible_banks = [r for r in results if not r["eligible"]]

    return eligible_banks + ineligible_banks
