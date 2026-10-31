import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// ── Auth token interceptor ────────────────────────────────────────────────────
// Reads the JWT from sessionStorage and attaches it to every request.
client.interceptors.request.use((config) => {
  try {
    const raw = sessionStorage.getItem("finpulse_session");
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.token) {
        config.headers.Authorization = `Bearer ${session.token}`;
      }
    }
  } catch {
    // ignore parse errors
  }
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────

export const registerUser = (payload) =>
  client.post("/auth/register", payload).then((r) => r.data);

export const loginUser = (payload) =>
  client.post("/auth/login", payload).then((r) => r.data);

export const resetPassword = (payload) =>
  client.post("/auth/reset-password", payload).then((r) => r.data);

// ── Customers ─────────────────────────────────────────────────────────────────

export const listCustomers = (params = {}) =>
  client.get("/customers", { params }).then((r) => r.data);

export const getCustomer = (customerId) =>
  client.get(`/customers/${customerId}`).then((r) => r.data);

export const getCustomerLoanProfile = (customerId) =>
  client.get(`/customers/${customerId}/loan-profile`).then((r) => r.data);

export const getCustomer360 = (customerId) =>
  client.get(`/customers/${customerId}/360`).then((r) => r.data);

export const updateProfile = (customerId, payload) =>
  client.patch(`/customers/${customerId}/profile`, payload).then((r) => r.data);

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getFinancialHealth = (customerId) =>
  client.get(`/analytics/financial-health/${customerId}`).then((r) => r.data);

export const getSpending = (customerId, months = 3) =>
  client.get(`/analytics/spending/${customerId}`, { params: { months } }).then((r) => r.data);

export const getSpendingTrend = (customerId, months = 6) =>
  client.get(`/analytics/spending-trend/${customerId}`, { params: { months } }).then((r) => r.data);

// ── Loans ─────────────────────────────────────────────────────────────────────

export const predictLoan = (payload) =>
  client.post("/loans/predict", payload).then((r) => r.data);

// ── Recommendations ───────────────────────────────────────────────────────────

export const getRecommendations = (customerId) =>
  client.get(`/recommendations/${customerId}`).then((r) => r.data);

// ── Daily Entries ─────────────────────────────────────────────────────────────

export const getEntryCategories = () =>
  client.get("/entries/categories").then((r) => r.data);

export const addEntry = (customerId, payload) =>
  client.post(`/entries/${customerId}`, payload).then((r) => r.data);

export const listEntries = (customerId, params = {}) =>
  client.get(`/entries/${customerId}`, { params }).then((r) => r.data);

export const deleteEntry = (customerId, entryId) =>
  client.delete(`/entries/${customerId}/${entryId}`).then((r) => r.data);

export const getMonthlySummary = (customerId, months = 6) =>
  client.get(`/entries/${customerId}/summary/monthly`, { params: { months } }).then((r) => r.data);

export const getCategorySummary = (customerId, entryType = "expense") =>
  client.get(`/entries/${customerId}/summary/category`, { params: { entry_type: entryType } }).then((r) => r.data);

export const getPaymentMethodSummary = (customerId, entryType = "expense") =>
  client.get(`/entries/${customerId}/summary/payment-method`, { params: { entry_type: entryType } }).then((r) => r.data);

// ── Bank Eligibility ──────────────────────────────────────────────────────────

export const getBankEligibility = (customerId, params = {}) =>
  client.get(`/bank-eligibility/${customerId}`, { params }).then((r) => r.data);

export const calculateBankEligibility = (payload) =>
  client.post("/bank-eligibility/calculate", payload).then((r) => r.data);

// ── Activity feed ─────────────────────────────────────────────────────────────

export const getActivity = (customerId, limit = 20) =>
  client.get(`/activity/${customerId}`, { params: { limit } }).then((r) => r.data);

export const getLoanPortfolio = (params = {}) =>
  client.get("/admin/loan-portfolio", { params }).then((r) => r.data);

export const getStatistics = () =>
  client.get("/admin/statistics").then((r) => r.data);

export const getMarketingSegments = () =>
  client.get("/admin/marketing-segments").then((r) => r.data);

export const getCustomerAnalytics = () =>
  client.get("/admin/customer-analytics").then((r) => r.data);

export const getLoanAnalytics = () =>
  client.get("/admin/loan-analytics").then((r) => r.data);

export const getMarketingProspects = (params = {}) =>
  client.get("/admin/marketing-prospects", { params }).then((r) => r.data);

export const getModelMetrics = () =>
  client.get("/admin/model-metrics").then((r) => r.data);
