from pydantic import BaseModel, EmailStr
from typing import List, Optional


# ── Auth ───────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer_id: str
    name: str
    email: str
    is_admin: bool


# ── Daily Entry ────────────────────────────────────────────────────────────────

class DailyEntryCreate(BaseModel):
    entry_date: str                  # YYYY-MM-DD
    entry_type: str                  # income / expense / savings
    category: str
    amount: float
    payment_method: Optional[str] = None   # Cash / UPI / Credit Card / Debit Card / Net Banking / Other
    note: Optional[str] = None


class DailyEntryOut(BaseModel):
    id: int
    customer_id: str
    entry_date: str
    entry_type: str
    category: str
    amount: float
    payment_method: Optional[str] = None
    note: Optional[str] = None
    created_at: str


# ── Customer Profile Update ────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None            # YYYY-MM-DD
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    occupation: Optional[str] = None
    monthly_income: Optional[float] = None
    credit_score: Optional[int] = None
    employment_years: Optional[float] = None
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    village: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_last4: Optional[str] = None


# ── Analytics ─────────────────────────────────────────────────────────────────

class FinancialHealthResponse(BaseModel):
    customer_id: str
    monthly_income: float
    monthly_spending: float
    savings: float
    savings_ratio: float
    debt_to_income: float
    financial_health_score: int
    rating: str


class SpendCategoryBreakdown(BaseModel):
    category: str
    amount: float
    pct_of_total: float


class SpendAnalysisResponse(BaseModel):
    customer_id: str
    period_months: int
    total_spent: float
    breakdown: List[SpendCategoryBreakdown]
    insights: List[str]


# ── Loans ─────────────────────────────────────────────────────────────────────

class LoanPredictRequest(BaseModel):
    customer_id: Optional[str] = None
    loan_type: Optional[str] = None
    monthly_income: float
    credit_score: int
    employment_years: float
    requested_amount: float
    tenure_months: int
    existing_debt: float


class LoanPredictResponse(BaseModel):
    approval_probability: float
    default_probability: float
    risk_level: str
    recommended_amount: float
    recommended_tenure: int
    explanation: List[str]


# ── Recommendations ───────────────────────────────────────────────────────────

class RecommendationItem(BaseModel):
    product: str
    score: float
    reason: List[str]


class RecommendationResponse(BaseModel):
    customer_id: str
    recommendations: List[RecommendationItem]
