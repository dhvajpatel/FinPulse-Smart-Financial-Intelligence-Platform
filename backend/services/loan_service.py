"""
Loan Risk Inference Service — V4
==================================
Supports both V3 (GBR-only) and V4 (XGB+LGBM+GBM stacking) ensembles.
Detects the ensemble version from the pickle and routes accordingly.

V4 ensemble dict keys:
  "xgb", "lgbm", "gbm"  — calibrated base classifiers
  "meta"                 — LogisticRegression stacking meta-learner
  "threshold"            — accuracy-optimised classification threshold
  "version"              — "v4"

V3 ensemble dict keys (legacy, still supported):
  "gbr" / "gbt"          — GradientBoostingRegressor
  "threshold", "gbr_w", "mlp_w"
"""
import pickle
import sys
from pathlib import Path

import numpy as np
import torch

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT / "ai" / "loan_prediction"))
from model import LoanRiskNet, FEATURE_COLUMNS, INPUT_DIM   # noqa: E402

MODEL_DIR = ROOT / "ai" / "models"

# ── Lazily-loaded singletons ──────────────────────────────────────────────────
_mlp      = None
_scaler   = None
_ensemble = None


def _load():
    global _mlp, _scaler, _ensemble

    if _scaler is None:
        with open(MODEL_DIR / "loan_scaler.pkl", "rb") as f:
            _scaler = pickle.load(f)

    if _mlp is None:
        _mlp = LoanRiskNet(input_dim=INPUT_DIM)
        _mlp.load_state_dict(
            torch.load(MODEL_DIR / "loan_model.pt", map_location="cpu",
                       weights_only=True)
        )
        _mlp.eval()

    ens_path = MODEL_DIR / "loan_ensemble.pkl"
    if _ensemble is None and ens_path.exists():
        with open(ens_path, "rb") as f:
            _ensemble = pickle.load(f)
        # Normalise legacy V3 key
        if "gbt" in _ensemble and "gbr" not in _ensemble:
            _ensemble["gbr"] = _ensemble.pop("gbt")

    return _mlp, _scaler, _ensemble


# ── Loan type categories (must match training) ────────────────────────────────
_LOAN_TYPES = [
    "lt_Business Loan", "lt_Education Loan",
    "lt_Home Loan",     "lt_Personal Loan", "lt_Vehicle Loan",
]

# V4 feature columns (42 total — must match train.py FEATURE_COLUMNS_V4)
_FEATURE_COLUMNS_V4 = [
    "credit_score", "monthly_income", "employment_years",
    "existing_debt", "requested_amount", "tenure_months",
    "dti", "lti", "debt_per_emp", "monthly_obl", "obl_ratio",
    "credit_sq", "score_x_emp", "log_income", "log_debt", "log_amount",
    "lt_Business Loan", "lt_Education Loan",
    "lt_Home Loan", "lt_Personal Loan", "lt_Vehicle Loan",
    "default_prob_soft",
    "credit_x_income", "credit_x_emp", "income_x_emp",
    "dti_x_lti", "credit_x_dti",
    "credit_poor", "credit_fair", "credit_good", "credit_vgood", "credit_excel",
    "income_low", "income_mid", "income_high", "income_vhigh",
    "high_dti_flag", "high_lti_flag", "low_credit_flag", "unstable_emp_flag",
    "risk_score_composite",
]


def _build_features_v3(
    monthly_income, credit_score, employment_years,
    requested_amount, tenure_months, existing_debt, loan_type="",
) -> np.ndarray:
    """21-feature vector for V3 / MLP inference."""
    inc = max(monthly_income, 1.0)
    ten = max(tenure_months, 1)
    emp = max(employment_years, 0.1)

    dti          = existing_debt / inc
    lti          = requested_amount / (inc * ten)
    debt_per_emp = existing_debt / emp
    monthly_obl  = requested_amount / ten
    obl_ratio    = monthly_obl / inc
    credit_sq    = credit_score ** 2 / 1000.0
    score_x_emp  = credit_score * employment_years / 100.0
    log_income   = float(np.log1p(monthly_income))
    log_debt     = float(np.log1p(existing_debt))
    log_amount   = float(np.log1p(requested_amount))

    lt_key  = f"lt_{loan_type}" if loan_type else ""
    lt_vals = [1.0 if col == lt_key else 0.0 for col in _LOAN_TYPES]

    row = [
        credit_score, monthly_income, employment_years,
        existing_debt, requested_amount, tenure_months,
        dti, lti, debt_per_emp, monthly_obl, obl_ratio,
        credit_sq, score_x_emp, log_income, log_debt, log_amount,
        *lt_vals,
    ]
    return np.array([row], dtype=np.float32)


def _build_features_v4(
    monthly_income, credit_score, employment_years,
    requested_amount, tenure_months, existing_debt, loan_type="",
) -> np.ndarray:
    """42-feature vector for V4 stacking ensemble."""
    inc = max(monthly_income, 1.0)
    ten = max(tenure_months, 1)
    emp = max(employment_years, 0.1)
    cs  = float(credit_score)

    dti          = existing_debt / inc
    lti          = requested_amount / (inc * ten)
    debt_per_emp = existing_debt / emp
    monthly_obl  = requested_amount / ten
    obl_ratio    = monthly_obl / inc
    credit_sq    = cs ** 2 / 1000.0
    score_x_emp  = cs * employment_years / 100.0
    log_income   = float(np.log1p(monthly_income))
    log_debt     = float(np.log1p(existing_debt))
    log_amount   = float(np.log1p(requested_amount))

    lt_key  = f"lt_{loan_type}" if loan_type else ""
    lt_vals = [1.0 if col == lt_key else 0.0 for col in _LOAN_TYPES]

    # Soft-label proxy (not available at inference — use MLP output as proxy)
    default_prob_soft = 0.15  # dataset mean default rate as neutral prior

    # Polynomial interactions
    credit_x_income = (cs / 1000.0) * (monthly_income / 100000.0)
    credit_x_emp    = (cs / 1000.0) * employment_years
    income_x_emp    = (monthly_income / 100000.0) * employment_years
    dti_x_lti       = dti * lti
    credit_x_dti    = (cs / 1000.0) * dti

    # Credit tier dummies
    credit_poor  = 1.0 if cs < 550  else 0.0
    credit_fair  = 1.0 if 550 <= cs < 650  else 0.0
    credit_good  = 1.0 if 650 <= cs < 750  else 0.0
    credit_vgood = 1.0 if 750 <= cs < 850  else 0.0
    credit_excel = 1.0 if cs >= 850 else 0.0

    # Income tier dummies
    income_low   = 1.0 if monthly_income < 20000  else 0.0
    income_mid   = 1.0 if 20000 <= monthly_income < 60000  else 0.0
    income_high  = 1.0 if 60000 <= monthly_income < 120000 else 0.0
    income_vhigh = 1.0 if monthly_income >= 120000 else 0.0

    # Risk flags
    high_dti_flag     = 1.0 if dti > 0.4 else 0.0
    high_lti_flag     = 1.0 if lti > 0.5 else 0.0
    low_credit_flag   = 1.0 if cs < 600  else 0.0
    unstable_emp_flag = 1.0 if employment_years < 2 else 0.0
    risk_composite    = (high_dti_flag * 1.0 + high_lti_flag * 1.0 +
                         low_credit_flag * 1.5 + unstable_emp_flag * 0.5)

    row = [
        cs, monthly_income, employment_years,
        existing_debt, requested_amount, tenure_months,
        dti, lti, debt_per_emp, monthly_obl, obl_ratio,
        credit_sq, score_x_emp, log_income, log_debt, log_amount,
        *lt_vals,
        default_prob_soft,
        credit_x_income, credit_x_emp, income_x_emp,
        dti_x_lti, credit_x_dti,
        credit_poor, credit_fair, credit_good, credit_vgood, credit_excel,
        income_low, income_mid, income_high, income_vhigh,
        high_dti_flag, high_lti_flag, low_credit_flag, unstable_emp_flag,
        risk_composite,
    ]
    return np.array([row], dtype=np.float32)


def predict_loan_risk(
    monthly_income: float,
    credit_score: int,
    employment_years: float,
    requested_amount: float,
    tenure_months: int,
    existing_debt: float,
    loan_type: str = "",
):
    mlp, scaler, ensemble = _load()

    is_v4 = (ensemble is not None and
             ensemble.get("version") == "v4" and
             "xgb_reg" in ensemble)

    if is_v4:
        # ── V4 blended path ──────────────────────────────────────────────────
        raw    = _build_features_v4(monthly_income, credit_score, employment_years,
                                    requested_amount, tenure_months, existing_debt,
                                    loan_type)
        scaled = scaler.transform(raw)
        weights = ensemble["weights"]  # [w_xgb_reg, w_xgb_cls, w_lgbm, w_gbr, w_lgbm_reg]

        probs = []
        probs.append(float(np.clip(ensemble["xgb_reg"].predict(scaled)[0], 0, 1)))
        probs.append(float(ensemble["xgb_cls"].predict_proba(scaled)[0, 1]))
        probs.append(float(ensemble["lgbm"].predict_proba(scaled)[0, 1]))
        probs.append(float(np.clip(ensemble["gbr"].predict(scaled)[0], 0, 1)))
        probs.append(float(np.clip(ensemble["lgbm_reg"].predict(scaled)[0], 0, 1)))

        default_p = sum(w * p for w, p in zip(weights, probs))
        default_p = float(np.clip(default_p, 0, 1))
        threshold = float(ensemble.get("threshold", 0.5))

    else:
        # ── V3 legacy path ───────────────────────────────────────────────────
        raw    = _build_features_v3(monthly_income, credit_score, employment_years,
                                    requested_amount, tenure_months, existing_debt,
                                    loan_type)
        scaled = scaler.transform(raw)

        with torch.no_grad():
            mlp_prob = torch.sigmoid(
                mlp(torch.tensor(scaled, dtype=torch.float32))
            ).item()

        if ensemble is not None:
            gbr = ensemble.get("gbr")
            if gbr is not None:
                if hasattr(gbr, "predict_proba"):
                    gbr_prob = float(gbr.predict_proba(scaled)[0, 1])
                else:
                    gbr_prob = float(np.clip(gbr.predict(scaled)[0], 0.0, 1.0))
                gbr_w     = ensemble.get("gbr_w", 0.65)
                mlp_w     = ensemble.get("mlp_w", 0.35)
                default_p = gbr_w * gbr_prob + mlp_w * mlp_prob
            else:
                default_p = mlp_prob
            threshold = float(ensemble.get("threshold", 0.5))
        else:
            default_p = mlp_prob
            threshold = 0.5

    approval_p = 1.0 - default_p

    # ── Risk banding ──────────────────────────────────────────────────────────
    if default_p < threshold * 0.55:
        risk_level = "LOW"
    elif default_p < threshold * 1.30:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    # ── Recommended terms if risky ────────────────────────────────────────────
    rec_amount = requested_amount
    rec_tenure = tenure_months
    if default_p >= threshold:
        rec_amount = round(requested_amount * 0.65, -3)
        rec_tenure = min(tenure_months + 24, 180)

    # ── Explanation ───────────────────────────────────────────────────────────
    explanation = []
    if credit_score >= 750:
        explanation.append("Strong credit score — low default risk")
    elif credit_score >= 700:
        explanation.append("Good credit score")
    elif credit_score >= 650:
        explanation.append("Fair credit score — moderate risk")
    else:
        explanation.append("Below-average credit score increases risk")

    if employment_years >= 5:
        explanation.append("Stable long-term employment (≥5 years)")
    elif employment_years >= 3:
        explanation.append("Adequate employment history (≥3 years)")
    else:
        explanation.append("Limited employment history raises risk")

    dti = existing_debt / max(monthly_income, 1)
    if dti < 0.20:
        explanation.append("Low existing debt-to-income ratio")
    elif dti < 0.40:
        explanation.append("Moderate existing debt obligations")
    else:
        explanation.append("High debt-to-income ratio increases risk")

    obl = requested_amount / max(monthly_income * tenure_months, 1)
    if obl > 0.50:
        explanation.append("Large loan relative to income and tenure")

    if loan_type:
        explanation.append(f"Loan type: {loan_type}")

    return {
        "approval_probability": round(approval_p,  4),
        "default_probability":  round(default_p,   4),
        "risk_level":           risk_level,
        "recommended_amount":   round(rec_amount,  2),
        "recommended_tenure":   int(rec_tenure),
        "explanation":          explanation,
    }
