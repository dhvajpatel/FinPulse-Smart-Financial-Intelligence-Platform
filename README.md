 <p align="center">
  <img src="assets/finpulse-icon.png" alt="FinPulse App Icon" width="160" />
</p>

<h1 align="center"> FinPulse </h1>

<p align="center">
</p>

# FinPulse — AI-Powered Banking Intelligence Platform
[ FinPulse Are Live On:- https://frontend-seven-wine-u47eoxrzkq.vercel.app/login ]



A full-stack banking intelligence dashboard built with **React 19**, **FastAPI**, **PyTorch**, and **Scikit-Learn**. Combines deep learning loan risk prediction, financial health scoring, spend analysis, and product recommendations — all in one platform with three user roles.

| Module | What it does | Tech |
|--------|-------------|------|
| Loan Risk Prediction | Approval / default probability, risk level, explanation | PyTorch MLP + GBR Ensemble |
| Financial Health Score | 0–100 score across 6 weighted components | Rule-based scoring |
| Spend Analyzer | Category breakdown + period-over-period AI insights | SQL aggregation |
| Product Recommendations | Credit card / loan / investment matching with reasons | Weighted scoring engine |
| Admin Dashboard | Portfolio-wide stats, marketing segments, model metrics | SQL aggregation |

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Tech Stack](#2-tech-stack)
3. [Setup — Local Development](#3-setup--local-development)
4. [Login Credentials](#4-login-credentials)
5. [API Reference](#5-api-reference)
6. [AI Models](#6-ai-models)
7. [Dataset](#7-dataset)
8. [Deployment](#8-deployment)
9. [Project Phases](#9-project-phases)

---

## 1. Project Structure

```
finpulse/
│
├── backend/                    ← FastAPI Python server
│   ├── main.py                 ← App entry point, CORS, router registration
│   ├── load_data.py            ← One-time: loads CSVs into SQLite
│   ├── requirements.txt
│   ├── api/
│   │   ├── customers.py        ← Customer CRUD + 360° view + transactions/loans/cards
│   │   ├── analytics.py        ← Financial health, spending analysis
│   │   ├── loans.py            ← Loan risk prediction endpoint
│   │   ├── recommendations.py  ← Product recommendations
│   │   ├── entries.py          ← Daily income/expense entries
│   │   ├── bank_eligibility.py ← Indian bank offer eligibility
│   │   └── admin.py            ← Statistics, analytics, marketing, model metrics
│   ├── database/
│   │   ├── connection.py       ← SQLAlchemy engine (SQLite default / PostgreSQL via env)
│   │   ├── models.py           ← ORM table definitions
│   │   └── schemas.py          ← Pydantic request/response models
│   └── services/
│       ├── finance_service.py          ← Financial Health Score + Spend Analyzer
│       ├── loan_service.py             ← Model inference (GBR + MLP ensemble)
│       ├── recommendation_service.py   ← Rule-based product recommendation engine
│       └── bank_eligibility_service.py ← Bank offer scoring
│
├── frontend/                   ← React SPA (Vite)
│   ├── index.html
│   ├── package.json
│   ├── .env                    ← Local dev API URL
│   ├── .env.production         ← Production API URL (Render)
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       │   ├── layout/         ← AppShell, Sidebar, Topbar, MobileNav, PageHeader
│       │   ├── cards/          ← StatCard, RecommendationCard, RiskCard
│       │   └── common/         ← Loading, ErrorState, AnimatedPage
│       ├── pages/
│       │   ├── admin/          ← Dashboard, Analytics, LoanAnalytics, Marketing, SystemOverview
│       │   ├── employee/       ← Dashboard, Customers, Customer360, Finance, Spending, LoanPrediction
│       │   ├── customer/       ← CustomerDashboard
│       │   ├── shared/         ← Settings
│       │   └── auth/           ← Login
│       ├── context/
│       │   └── AuthContext.jsx ← User session (role, customer_id, name)
│       └── services/
│           └── api.js          ← All Axios API calls
│
└── ai/                         ← Machine Learning pipeline
    ├── data/
    │   ├── generate_synthetic_data.py  ← Dataset generator
    │   └── raw/                        ← Generated CSVs (10,000 customers)
    ├── loan_prediction/
    │   ├── model.py            ← LoanRiskNet (PyTorch MLP) + FEATURE_COLUMNS
    │   └── train.py            ← Full training pipeline V3
    └── models/                 ← Saved model artefacts
        ├── loan_model.pt       ← MLP weights (PyTorch)
        ├── loan_scaler.pkl     ← StandardScaler (Scikit-Learn)
        ├── loan_ensemble.pkl   ← GBR model + threshold + blend weights
        └── loan_metrics.json   ← Evaluation metrics on held-out test set
```

---

## 2. Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS 4 | Utility-first styling |
| Framer Motion | Page & component animations |
| Recharts | Charts and data visualisations |
| React Router v7 | Client-side routing |
| Axios | HTTP API calls |
| Lucide React | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | REST API framework (Python) |
| SQLAlchemy | ORM — database models & queries |
| SQLite | Default database (`smartbank.db`) |
| Pydantic | Request/response schema validation |
| Uvicorn | ASGI server |

### AI / ML
| Technology | Purpose |
|------------|---------|
| PyTorch | Deep Learning — MLP neural network |
| Scikit-Learn | Gradient Boosting Regressor, StandardScaler, metrics |
| NumPy | Numerical computing, feature engineering |
| Pandas | Data manipulation & CSV processing |

---

## 3. Setup — Local Development

### Prerequisites

- **Python 3.11+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **Git** — [git-scm.com](https://git-scm.com/)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/finpulse.git
cd finpulse
```

---

### Step 2 — Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Load all CSV data into the SQLite database (run once):

```bash
python load_data.py
```

You should see output like:
```
Loaded  10000 rows -> customers
Loaded  13100 rows -> accounts
Loaded   3500 rows -> loans
...
Database ready at: sqlite:///./smartbank.db
```

Start the API server:

```bash
python -m uvicorn main:app --reload
```

The backend runs at **http://127.0.0.1:8000**  
Interactive Swagger docs: **http://127.0.0.1:8000/docs**

---

### Step 3 — Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173**

The local `.env` file is already configured to point at `http://127.0.0.1:8000`.

---

### Step 4 — (Optional) Re-train the AI model

The trained model files are already committed in `ai/models/` — you don't need to retrain to run the app. If you want to retrain from scratch:

```bash
# Regenerate the dataset (optional — raw CSVs already exist)
cd ai/data
python generate_synthetic_data.py --customers 10000 --seed 42

# Train the V3 ensemble (GBR + MLP)
cd ../loan_prediction
python train.py
```

Training takes ~5–10 minutes. Outputs are saved to `ai/models/`.

---

### Using PostgreSQL instead of SQLite

By default the backend uses SQLite. To switch to PostgreSQL, set the `DATABASE_URL` environment variable before starting the server:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/finpulse"
uvicorn main:app --reload
```

---

## 4. Login Credentials

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `Admin` | `admin123` |
| **Customer** | Customer's full name (e.g. `Aarav Sharma`) | Customer ID (e.g. `C100000`) |

Customer names and IDs are in `ai/data/raw/customers.csv`.

---

## 5. API Reference

Base URL: `http://127.0.0.1:8000`  
Interactive docs: `http://127.0.0.1:8000/docs`

### Customer Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/customers` | List customers. Params: `limit`, `offset`, `search` |
| `GET` | `/customers/{id}` | Single customer profile + risk band |
| `GET` | `/customers/{id}/360` | Full 360° view: health + spending + recommendations |
| `GET` | `/customers/{id}/loan-profile` | Pre-fill data for loan calculator |
| `GET` | `/customers/{id}/transactions` | Paginated transaction history |
| `GET` | `/customers/{id}/loans` | All loan records for a customer |
| `GET` | `/customers/{id}/credit-cards` | All credit card records |

### Analytics Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/analytics/financial-health/{id}` | Financial health score + breakdown |
| `GET` | `/analytics/spending/{id}` | Spend category breakdown. Param: `months` (default 3) |
| `GET` | `/analytics/spending-trend/{id}` | Month-over-month spending trend |

### Loan Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/loans/predict` | Predict loan default risk using V3 ensemble |

**Request body:**
```json
{
  "customer_id": "C100000",
  "loan_type": "Home Loan",
  "monthly_income": 84800,
  "credit_score": 720,
  "employment_years": 5.5,
  "requested_amount": 2500000,
  "tenure_months": 120,
  "existing_debt": 12000
}
```

**Response:**
```json
{
  "approval_probability": 0.7823,
  "default_probability": 0.2177,
  "risk_level": "MEDIUM",
  "recommended_amount": 2500000,
  "recommended_tenure": 120,
  "explanation": [
    "Good credit score",
    "Stable long-term employment (≥5 years)",
    "Moderate existing debt obligations",
    "Loan type: Home Loan"
  ]
}
```

### Recommendation Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/recommendations/{id}` | Top-4 product recommendations for a customer |

### Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/statistics` | Bank-wide KPIs |
| `GET` | `/admin/customer-analytics` | Distributions: credit score, income, age, cities |
| `GET` | `/admin/loan-analytics` | Portfolio stats by loan type |
| `GET` | `/admin/marketing-segments` | Segment counts: high-value, credit card, loan prospects |
| `GET` | `/admin/marketing-prospects` | Customer list for a segment |
| `GET` | `/admin/model-metrics` | V3 model evaluation metrics |

---

## 6. AI Models

### Loan Risk Prediction — V3 Ensemble

The core AI component predicts the probability that a loan applicant will default.

**Why soft labels?**  
The hard binary label (`defaulted`: 0/1) has only −0.18 correlation with credit score. The ground-truth probability (`default_probability_true`) has −0.64 correlation — 3.5× stronger. V3 trains on these smooth probability targets instead of hard labels.

**Model 1 — Gradient Boosting Regressor (80% weight)**
```
Target      : default_probability_true  (soft labels, not hard 0/1)
n_estimators: 1000
learning_rate: 0.02
max_depth   : 4
```

**Model 2 — LoanRiskNet PyTorch MLP (20% weight)**
```
Linear(21→256) → BatchNorm → GELU → Dropout(0.35)
Linear(256→128) → BatchNorm → GELU → Dropout(0.25)
Linear(128→64) → BatchNorm → GELU → Dropout(0.15)
Linear(64→32) → GELU
Linear(32→1) → Sigmoid
```

**Ensemble:**
```
P(default) = 0.80 × GBR_prob + 0.20 × MLP_prob
```

**V3 Performance (held-out test set):**

| Metric | Value |
|--------|-------|
| Accuracy | 0.7657 |
| Precision | 0.2871 |
| ROC-AUC | 0.6731 |
| Threshold | 0.21 (F1-tuned) |

The oracle AUC using ground-truth probabilities is 0.694 — the model reaches 97% of the theoretical maximum for this dataset.

---

### Financial Health Score

Computed in `backend/services/finance_service.py` using a weighted formula:

```
Score (0–100) =
  0.20 × income_stability   (employment_years / 15, capped)
+ 0.20 × savings_score      (savings_ratio × 200)
+ 0.20 × debt_score         (100 − dti × 300)
+ 0.15 × spending_score     (penalises spending > 60% of income)
+ 0.15 × credit_score       ((credit_score − 300) / 6)
+ 0.10 × balance_score      (savings / income × 100)

Rating: Excellent ≥80 | Good ≥65 | Fair ≥45 | Needs Attention <45
```

---

## 7. Dataset

All data is **fully synthetic** — generated by `ai/data/generate_synthetic_data.py` using NumPy and Pandas. No real customer data is used anywhere.

| Table | Rows | Description |
|-------|------|-------------|
| `customers.csv` | 10,000 | Profiles: age, income, credit score, occupation, city |
| `accounts.csv` | ~13,000 | Bank accounts (savings, current, salary, premium) |
| `transactions.csv` | ~500,000 | 6 months of transactions across 13 categories |
| `loans.csv` | 3,500 | Applications with true default probability labels |
| `credit_cards.csv` | ~4,000 | Cards with limits and usage |
| `product_interactions.csv` | ~25,000 | Product view/click/apply/approve events |

Customer data uses realistic Indian names, cities, and occupations. Income, credit scores, and default rates are correlated to match real-world banking distributions (~15.3% default rate).

---

## 8. Deployment

See [DEPLOY.md](./DEPLOY.md) for the full step-by-step guide to deploy for free using:
- **Render** — backend (FastAPI + SQLite, 750 hrs/month free)
- **Vercel** — frontend (unlimited bandwidth, global CDN)

Quick summary:

1. Push code to GitHub
2. Connect repo to Render → set root directory to `backend` → auto-builds the database from CSVs
3. Copy the Render URL → paste into `frontend/.env.production` and Vercel environment variables
4. Connect repo to Vercel → set root directory to `frontend` → deploys automatically

---

## 9. Project Phases

| Phase | Focus | Key Output |
|-------|-------|-----------|
| 1 | Data Pipeline | 10K synthetic customers, 500K transactions, SQLite DB |
| 2 | Backend API | 20+ REST endpoints, Swagger docs |
| 3 | Deep Learning V1/V2 | LoanRiskNet MLP, ROC-AUC 0.67 |
| 4 | Frontend Dashboard | React SPA, 3-role auth, all pages |
| 5 | AI Model V3 | GBR + soft labels, 76.6% accuracy |
| 6 | Advanced UX | 4-tab Customer 360°, global search, new endpoints |
| 7 | Testing & Docs | End-to-end validation, deployment, documentation |

---

*FinPulse — Built with React 19, FastAPI, PyTorch, Scikit-Learn*  
*Dataset: 10,000 synthetic Indian banking customers | Model: V3 GBR+MLP Ensemble*
