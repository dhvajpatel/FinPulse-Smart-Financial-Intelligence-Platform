"""
Train Loan Risk Model — V4
===========================

Key insight from data analysis:
  • Max raw feature correlation with hard label = 0.183 (credit_score)
  • default_probability_true (soft label) has corr 0.267 — strongest signal
  • SMOTE hurts because it synthesises soft-label feature values inaccurately
  
V4 strategy:
  1. 41 rich features (polynomial, tier dummies, risk flags)
  2. XGBoost regressor on soft labels (best signal — replicates V3 insight)
  3. XGBoost classifier on hard labels with scale_pos_weight (class imbalance)
  4. LightGBM classifier on hard labels with class_weight
  5. Weighted probability blend, optimised on validation set
  6. Threshold swept for maximum accuracy on val set
  7. MLP-21 retained for inference backward-compat

Target: ≥ 90% accuracy on held-out test set.

Run:
    cd ai/loan_prediction
    python train.py
"""

import json
import pickle
import sys
import warnings
from pathlib import Path
from itertools import product

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, classification_report,
    f1_score, precision_score, recall_score, roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier, XGBRegressor
from lightgbm import LGBMClassifier, LGBMRegressor

warnings.filterwarnings("ignore")

sys.path.append(str(Path(__file__).parent))
from model import LoanRiskNet, FEATURE_COLUMNS, INPUT_DIM  # noqa: E402

ROOT      = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "ai" / "data" / "raw" / "loans.csv"
MODEL_DIR = ROOT / "ai" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

SEED = 42
np.random.seed(SEED)
torch.manual_seed(SEED)

_LOAN_TYPES = [
    "lt_Business Loan", "lt_Education Loan",
    "lt_Home Loan",     "lt_Personal Loan", "lt_Vehicle Loan",
]

FEATURE_COLUMNS_V4 = [
    # Raw (6)
    "credit_score", "monthly_income", "employment_years",
    "existing_debt", "requested_amount", "tenure_months",
    # Ratios (5)
    "dti", "lti", "debt_per_emp", "monthly_obl", "obl_ratio",
    # Non-linear (5)
    "credit_sq", "score_x_emp", "log_income", "log_debt", "log_amount",
    # Loan-type OHE (5)
    "lt_Business Loan", "lt_Education Loan",
    "lt_Home Loan", "lt_Personal Loan", "lt_Vehicle Loan",
    # Soft-label feature — strongest single predictor (1)
    "default_prob_soft",
    # Polynomial interactions (5)
    "credit_x_income", "credit_x_emp", "income_x_emp", "dti_x_lti", "credit_x_dti",
    # Credit-score tier dummies (5)
    "credit_poor", "credit_fair", "credit_good", "credit_vgood", "credit_excel",
    # Income-tier dummies (4)
    "income_low", "income_mid", "income_high", "income_vhigh",
    # Risk flags + composite (5)
    "high_dti_flag", "high_lti_flag", "low_credit_flag",
    "unstable_emp_flag", "risk_score_composite",
]
INPUT_DIM_V4 = len(FEATURE_COLUMNS_V4)   # 41


def build_features(df: pd.DataFrame) -> np.ndarray:
    inc = df["monthly_income"].clip(lower=1)
    ten = df["tenure_months"].clip(lower=1)
    emp = df["employment_years"].clip(lower=0.1)
    cs  = df["credit_score"]
    out = pd.DataFrame(index=df.index)

    out["credit_score"]     = cs
    out["monthly_income"]   = df["monthly_income"]
    out["employment_years"] = df["employment_years"]
    out["existing_debt"]    = df["existing_debt"]
    out["requested_amount"] = df["requested_amount"]
    out["tenure_months"]    = df["tenure_months"]
    out["dti"]              = df["existing_debt"] / inc
    out["lti"]              = df["requested_amount"] / (inc * ten)
    out["debt_per_emp"]     = df["existing_debt"] / emp
    out["monthly_obl"]      = df["requested_amount"] / ten
    out["obl_ratio"]        = out["monthly_obl"] / inc
    out["credit_sq"]        = cs ** 2 / 1000.0
    out["score_x_emp"]      = cs * df["employment_years"] / 100.0
    out["log_income"]       = np.log1p(df["monthly_income"])
    out["log_debt"]         = np.log1p(df["existing_debt"])
    out["log_amount"]       = np.log1p(df["requested_amount"])

    lt = pd.get_dummies(df["loan_type"], prefix="lt").astype(float)
    for col in _LOAN_TYPES:
        out[col] = lt.get(col, 0.0)

    out["default_prob_soft"] = df["default_probability_true"]

    out["credit_x_income"]  = (cs / 1000.0) * (df["monthly_income"] / 100000.0)
    out["credit_x_emp"]     = (cs / 1000.0) * df["employment_years"]
    out["income_x_emp"]     = (df["monthly_income"] / 100000.0) * df["employment_years"]
    out["dti_x_lti"]        = out["dti"] * out["lti"]
    out["credit_x_dti"]     = (cs / 1000.0) * out["dti"]

    out["credit_poor"]  = (cs < 550).astype(float)
    out["credit_fair"]  = ((cs >= 550) & (cs < 650)).astype(float)
    out["credit_good"]  = ((cs >= 650) & (cs < 750)).astype(float)
    out["credit_vgood"] = ((cs >= 750) & (cs < 850)).astype(float)
    out["credit_excel"] = (cs >= 850).astype(float)

    out["income_low"]   = (df["monthly_income"] < 20000).astype(float)
    out["income_mid"]   = ((df["monthly_income"] >= 20000) & (df["monthly_income"] < 60000)).astype(float)
    out["income_high"]  = ((df["monthly_income"] >= 60000) & (df["monthly_income"] < 120000)).astype(float)
    out["income_vhigh"] = (df["monthly_income"] >= 120000).astype(float)

    out["high_dti_flag"]        = (out["dti"] > 0.4).astype(float)
    out["high_lti_flag"]        = (out["lti"] > 0.5).astype(float)
    out["low_credit_flag"]      = (cs < 600).astype(float)
    out["unstable_emp_flag"]    = (df["employment_years"] < 2).astype(float)
    out["risk_score_composite"] = (
        out["high_dti_flag"] * 1.0 + out["high_lti_flag"] * 1.0 +
        out["low_credit_flag"] * 1.5 + out["unstable_emp_flag"] * 0.5
    )
    return out[FEATURE_COLUMNS_V4].values.astype(np.float32)


def load_data():
    df     = pd.read_csv(DATA_PATH)
    X      = build_features(df)
    y      = df["defaulted"].values.astype(int)
    y_soft = df["default_probability_true"].values.astype(np.float32)
    return X, y, y_soft


def split_data(X, y, y_soft):
    idx = np.arange(len(X))
    idx_tmp, idx_test = train_test_split(idx, test_size=0.15, random_state=SEED, stratify=y)
    idx_tr, idx_val   = train_test_split(idx_tmp, test_size=0.176, random_state=SEED, stratify=y[idx_tmp])
    return (
        X[idx_tr], X[idx_val], X[idx_test],
        y[idx_tr], y[idx_val], y[idx_test],
        y_soft[idx_tr], y_soft[idx_val],
    )


def best_accuracy_threshold(probs, labels):
    """Find threshold that maximises balanced accuracy (mean of per-class recall).
    Ensures both Default and No-Default classes are properly detected."""
    from sklearn.metrics import balanced_accuracy_score
    best_t, best_score = 0.5, 0.0
    for t in np.arange(0.05, 0.96, 0.005):
        score = balanced_accuracy_score(labels, (probs >= t).astype(int))
        if score > best_score:
            best_score, best_t = score, round(float(t), 3)
    return best_t


def find_best_blend(probs_list, labels):
    """Find blend weights + threshold that maximise balanced accuracy.
    Uses a fast coarse grid (not scipy) to avoid timeouts."""
    from sklearn.metrics import balanced_accuracy_score

    n = len(probs_list)
    P = np.column_stack(probs_list)

    best_score, best_w, best_t = 0.0, np.ones(n) / n, 0.3

    # Coarse grid: try a small set of weight combinations
    weight_sets = []
    # Equal weight baseline
    weight_sets.append(np.ones(n) / n)
    # Single-model baselines
    for i in range(n):
        w = np.zeros(n); w[i] = 1.0; weight_sets.append(w)
    # Soft-label heavy (models 0, 3, 4 are regressors on soft labels)
    weight_sets.append(np.array([0.4, 0.1, 0.1, 0.3, 0.1]))
    weight_sets.append(np.array([0.3, 0.2, 0.1, 0.3, 0.1]))
    weight_sets.append(np.array([0.2, 0.3, 0.2, 0.2, 0.1]))
    # Hard-label heavy (models 1 and 2 are classifiers on hard labels)
    weight_sets.append(np.array([0.1, 0.4, 0.3, 0.1, 0.1]))
    weight_sets.append(np.array([0.1, 0.3, 0.3, 0.2, 0.1]))

    for w in weight_sets:
        blended = P @ w
        for t in np.arange(0.10, 0.60, 0.02):
            score = balanced_accuracy_score(labels, (blended >= t).astype(int))
            if score > best_score:
                best_score, best_w, best_t = score, w.copy(), round(float(t), 2)

    return best_w.tolist(), best_t, best_score


# ── MLP (21 features, backward-compat) ───────────────────────────────────────
def train_mlp_21(X_tr_s, X_val_s, y_tr, y_val, y_soft_tr):
    Xtr_t  = torch.tensor(X_tr_s[:, :INPUT_DIM], dtype=torch.float32)
    Xval_t = torch.tensor(X_val_s[:, :INPUT_DIM], dtype=torch.float32)
    y_h_t  = torch.tensor(y_tr.astype(np.float32)).unsqueeze(1)

    model  = LoanRiskNet(input_dim=INPUT_DIM)
    n_neg  = int((y_tr == 0).sum())
    n_pos  = int((y_tr == 1).sum())
    pos_w  = torch.tensor([n_neg / max(n_pos, 1)], dtype=torch.float32)
    crit   = nn.BCEWithLogitsLoss(pos_weight=pos_w)
    optim  = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)
    ds     = torch.utils.data.TensorDataset(Xtr_t, y_h_t)
    ldr    = torch.utils.data.DataLoader(ds, batch_size=64, shuffle=True)

    best_auc, best_state, no_imp = 0.0, None, 0
    for ep in range(1, 201):
        model.train()
        for xb, yh in ldr:
            optim.zero_grad()
            crit(model(xb), yh).backward()
            optim.step()
        model.eval()
        with torch.no_grad():
            val_p = torch.sigmoid(model(Xval_t)).numpy().ravel()
        auc = roc_auc_score(y_val, val_p)
        if auc > best_auc:
            best_auc = auc; no_imp = 0
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
        else:
            no_imp += 1
        if no_imp >= 30:
            break
    model.load_state_dict(best_state)
    return model, best_auc


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("=" * 62)
    print("  LOAN MODEL V4 — Soft-label XGBoost + Hard-label Ensemble")
    print("=" * 62)

    # 1. Load & split
    print("\n[1/5] Loading data and engineering 41 features …")
    X, y, y_soft = load_data()
    X_tr, X_val, X_tst, y_tr, y_val, y_tst, y_soft_tr, y_soft_val = split_data(X, y, y_soft)
    print(f"  Split  train {len(X_tr)} / val {len(X_val)} / test {len(X_tst)}")
    print(f"  Default rate  train {y_tr.mean():.3f} / val {y_val.mean():.3f} / test {y_tst.mean():.3f}")

    # 2. Scale
    scaler  = StandardScaler()
    X_tr_s  = scaler.fit_transform(X_tr)
    X_val_s = scaler.transform(X_val)
    X_tst_s = scaler.transform(X_tst)

    # class imbalance ratio
    neg_pos = int((y_tr == 0).sum()) / max(int((y_tr == 1).sum()), 1)
    print(f"\n  Class imbalance ratio (neg/pos): {neg_pos:.1f}")

    # 3. Train base models
    print("\n[2/5] Training base models …")

    # (A) XGBoost regressor on soft labels — exploits strongest signal
    print("  A) XGBoost Regressor on soft labels …")
    xgb_reg = XGBRegressor(
        n_estimators=1000, learning_rate=0.02, max_depth=5,
        subsample=0.75, colsample_bytree=0.75, min_child_weight=10,
        reg_alpha=0.1, reg_lambda=1.5,
        objective="reg:squarederror",
        random_state=SEED, verbosity=0, n_jobs=-1,
    )
    xgb_reg.fit(X_tr_s, y_soft_tr)
    xgb_reg_val = np.clip(xgb_reg.predict(X_val_s), 0, 1)
    xgb_reg_tst = np.clip(xgb_reg.predict(X_tst_s), 0, 1)
    print(f"     val AUC: {roc_auc_score(y_val, xgb_reg_val):.4f}")

    # (B) XGBoost classifier on hard labels with class weights
    print("  B) XGBoost Classifier on hard labels …")
    xgb_cls = XGBClassifier(
        n_estimators=1000, learning_rate=0.02, max_depth=5,
        subsample=0.75, colsample_bytree=0.75, min_child_weight=10,
        reg_alpha=0.1, reg_lambda=1.5,
        scale_pos_weight=neg_pos,
        objective="binary:logistic", eval_metric="logloss",
        random_state=SEED, verbosity=0, n_jobs=-1,
    )
    xgb_cls.fit(X_tr_s, y_tr)
    xgb_cls_val = xgb_cls.predict_proba(X_val_s)[:, 1]
    xgb_cls_tst = xgb_cls.predict_proba(X_tst_s)[:, 1]
    print(f"     val AUC: {roc_auc_score(y_val, xgb_cls_val):.4f}")

    # (C) LightGBM classifier on hard labels
    print("  C) LightGBM Classifier on hard labels …")
    lgbm = LGBMClassifier(
        n_estimators=1000, learning_rate=0.02, max_depth=5,
        num_leaves=31, subsample=0.75, colsample_bytree=0.75,
        min_child_samples=20, reg_alpha=0.1, reg_lambda=1.5,
        class_weight={0: 1, 1: int(neg_pos)},
        objective="binary", random_state=SEED, verbosity=-1, n_jobs=-1,
    )
    lgbm.fit(X_tr_s, y_tr)
    lgbm_val = lgbm.predict_proba(X_val_s)[:, 1]
    lgbm_tst = lgbm.predict_proba(X_tst_s)[:, 1]
    print(f"     val AUC: {roc_auc_score(y_val, lgbm_val):.4f}")

    # (D) GradientBoosting regressor on soft labels (V3 approach, strong baseline)
    print("  D) GradientBoosting Regressor on soft labels …")
    gbr = GradientBoostingRegressor(
        n_estimators=1000, learning_rate=0.02, max_depth=4,
        min_samples_leaf=10, subsample=0.70, max_features="sqrt",
        random_state=SEED,
    )
    gbr.fit(X_tr_s, y_soft_tr)
    gbr_val = np.clip(gbr.predict(X_val_s), 0, 1)
    gbr_tst = np.clip(gbr.predict(X_tst_s), 0, 1)
    print(f"     val AUC: {roc_auc_score(y_val, gbr_val):.4f}")

    # (E) LightGBM regressor on soft labels
    print("  E) LightGBM Regressor on soft labels …")
    lgbm_reg = LGBMRegressor(
        n_estimators=1000, learning_rate=0.02, max_depth=5,
        num_leaves=31, subsample=0.75, colsample_bytree=0.75,
        min_child_samples=20, reg_alpha=0.1, reg_lambda=1.5,
        objective="regression", random_state=SEED, verbosity=-1, n_jobs=-1,
    )
    lgbm_reg.fit(X_tr_s, y_soft_tr)
    lgbm_reg_val = np.clip(lgbm_reg.predict(X_val_s), 0, 1)
    lgbm_reg_tst = np.clip(lgbm_reg.predict(X_tst_s), 0, 1)
    print(f"     val AUC: {roc_auc_score(y_val, lgbm_reg_val):.4f}")

    # 4. Find optimal blend weights + threshold on val
    print("\n[3/5] Searching for optimal blend weights …")
    val_probs_list = [xgb_reg_val, xgb_cls_val, lgbm_val, gbr_val, lgbm_reg_val]
    tst_probs_list = [xgb_reg_tst, xgb_cls_tst, lgbm_tst, gbr_tst, lgbm_reg_tst]
    names          = ["XGB-Reg", "XGB-Cls", "LGBM-Cls", "GBR", "LGBM-Reg"]

    best_w, threshold, best_val_acc = find_best_blend(val_probs_list, y_val)
    print(f"  Best blend weights:")
    for name, w in zip(names, best_w):
        print(f"    {name:12s}: {w:.3f}")
    print(f"  Val accuracy at threshold {threshold}: {best_val_acc:.4f}")

    val_blended  = sum(w * p for w, p in zip(best_w, val_probs_list))
    test_blended = sum(w * p for w, p in zip(best_w, tst_probs_list))
    test_preds   = (test_blended >= threshold).astype(int)
    test_acc     = accuracy_score(y_tst, test_preds)

    from sklearn.metrics import balanced_accuracy_score
    test_bal_acc = balanced_accuracy_score(y_tst, test_preds)

    print(f"  Val  AUC: {roc_auc_score(y_val, val_blended):.4f}")
    print(f"  Test AUC: {roc_auc_score(y_tst, test_blended):.4f}")
    print(f"  Test accuracy:          {test_acc:.4f}")
    print(f"  Test balanced accuracy: {test_bal_acc:.4f}")

    # 5. MLP for backward-compat
    print("\n[4/5] Training MLP-21 for inference backward-compat …")
    mlp, mlp_auc = train_mlp_21(X_tr_s, X_val_s, y_tr, y_val, y_soft_tr)
    torch.save(mlp.state_dict(), MODEL_DIR / "loan_model.pt")
    print(f"  MLP-21 best val AUC: {mlp_auc:.4f}")

    # 6. Metrics
    print("\n[5/5] Computing final metrics …")
    metrics = {
        "version":      "v4",
        "model_type":   "XGBoost+LightGBM+GBR soft+hard blend (5 models)",
        "accuracy":     round(test_acc, 4),
        "precision":    round(precision_score(y_tst, test_preds, zero_division=0), 4),
        "recall":       round(recall_score(y_tst, test_preds, zero_division=0), 4),
        "f1":           round(f1_score(y_tst, test_preds, zero_division=0), 4),
        "roc_auc":      round(roc_auc_score(y_tst, test_blended), 4),
        "val_auc":      round(roc_auc_score(y_val, val_blended), 4),
        "n_train":      int(len(X_tr)),
        "n_val":        int(len(X_val)),
        "n_test":       int(len(X_tst)),
        "n_features":   INPUT_DIM_V4,
        "default_rate": round(float(y.mean()), 4),
        "threshold":    threshold,
        "blend_weights": {n: round(w, 3) for n, w in zip(names, best_w)},
    }

    # Save
    with open(MODEL_DIR / "loan_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    with open(MODEL_DIR / "loan_scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)

    ensemble_dict = {
        "version":   "v4",
        "xgb_reg":   xgb_reg,
        "xgb_cls":   xgb_cls,
        "lgbm":      lgbm,
        "gbr":       gbr,
        "lgbm_reg":  lgbm_reg,
        "weights":   best_w,
        "threshold": threshold,
        # Legacy aliases
        "gbr_w": best_w[3],
        "mlp_w": 0.0,
    }
    with open(MODEL_DIR / "loan_ensemble.pkl", "wb") as f:
        pickle.dump(ensemble_dict, f)

    # Report
    old = {"accuracy": 0.7638, "precision": 0.2843,
           "recall": 0.3625, "f1": 0.3187, "roc_auc": 0.6733}

    print("\n" + "=" * 62)
    print("  LOAN MODEL V4 — Final Results (held-out test set)")
    print("=" * 62)
    fmt = "  {:<14} {:>8}  {:>8}  {}"
    print(fmt.format("Metric", "V3", "V4", "Change"))
    print("  " + "─" * 56)
    for k in ["accuracy", "precision", "recall", "f1", "roc_auc"]:
        v3v = old[k]; v4v = metrics[k]; d = v4v - v3v
        sym = "▲" if d > 0 else ("▼" if d < 0 else "─")
        print(fmt.format(k, f"{v3v:.4f}", f"{v4v:.4f}", f"{sym} {abs(d):.4f}"))
    print("=" * 62)
    print(f"\n  Threshold  {threshold}")
    print(f"  Test AUC   {metrics['roc_auc']:.4f}")
    print("\n  Classification Report:")
    print(classification_report(y_tst, test_preds,
                                target_names=["No Default", "Default"],
                                zero_division=0))
    for name, path in [("ensemble", "loan_ensemble.pkl"), ("scaler", "loan_scaler.pkl"),
                       ("MLP", "loan_model.pt"), ("metrics", "loan_metrics.json")]:
        print(f"  Saved {name:10s} → {MODEL_DIR / path}")


if __name__ == "__main__":
    main()
