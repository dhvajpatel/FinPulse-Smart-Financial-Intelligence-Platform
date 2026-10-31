import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle, Trash2, TrendingUp, TrendingDown, PiggyBank,
  CalendarDays, ChevronDown, BarChart3, ListFilter,
  CreditCard, Banknote, Smartphone, Globe, ShieldCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import Loading from "../../components/common/Loading";
import { useAuth } from "../../context/AuthContext";
import {
  addEntry, listEntries, deleteEntry,
  getMonthlySummary, getEntryCategories,
  getPaymentMethodSummary,
} from "../../services/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_META = {
  income:  { label: "Income",  color: "text-success", bg: "bg-success/10",  border: "border-success/30",  icon: TrendingUp,   chartColor: "#22c55e" },
  expense: { label: "Expense", color: "text-danger",  bg: "bg-danger/10",   border: "border-danger/30",   icon: TrendingDown, chartColor: "#ef4444" },
  savings: { label: "Savings", color: "text-accent",  bg: "bg-accent/10",   border: "border-accent/30",   icon: PiggyBank,    chartColor: "#3b82f6" },
};

const PAYMENT_ICONS = {
  "Cash":         Banknote,
  "UPI":          Smartphone,
  "Credit Card":  CreditCard,
  "Debit Card":   CreditCard,
  "Net Banking":  Globe,
  "Other":        ShieldCheck,
};

const PAYMENT_COLORS = {
  "Cash":        "#F59E0B",
  "UPI":         "#06B6D4",
  "Credit Card": "#2563EB",
  "Debit Card":  "#8B5CF6",
  "Net Banking": "#10B981",
  "Other":       "#8B95A7",
};

const PAYMENT_METHODS = ["Cash", "UPI", "Credit Card", "Debit Card", "Net Banking", "Other"];
const TODAY = new Date().toISOString().slice(0, 10);

// ── Tooltip ───────────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#151D2E", border: "1px solid #1F2937", borderRadius: 10, fontSize: 12 }}
      className="px-3 py-2 shadow-xl">
      {label && <p className="text-muted mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: ₹{Number(p.value).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
};

// ── Credit Score badge ────────────────────────────────────────────────────────
function CreditBadge({ score }) {
  if (!score) return null;
  const color = score >= 750 ? "text-success" : score >= 650 ? "text-accent" : score >= 550 ? "text-warning" : "text-danger";
  const label = score >= 750 ? "Excellent" : score >= 650 ? "Good" : score >= 550 ? "Fair" : "Poor";
  return (
    <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 border border-border">
      <ShieldCheck className={`h-4 w-4 ${color}`} />
      <div>
        <p className="text-[10px] text-muted">Your Credit Score</p>
        <p className={`font-display font-bold text-lg leading-none ${color}`}>{score}</p>
      </div>
      <span className={`text-xs font-medium ml-1 ${color}`}>{label}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DailyEntries() {
  const { user, refreshSession } = useAuth();
  const customerId = user?.customer_id;

  // form
  const [form, setForm] = useState({
    entry_date: TODAY,
    entry_type: "expense",
    category: "",
    payment_method: "",
    amount: "",
    note: "",
  });
  const [categories, setCategories] = useState({ income: [], expense: [], savings: [] });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);
  const [latestScore, setLatestScore] = useState(null);

  // list
  const [entries,     setEntries]     = useState([]);
  const [total,       setTotal]       = useState(0);
  const [listPage,    setListPage]    = useState(0);
  const [filterType,  setFilterType]  = useState("");
  const [listLoading, setListLoading] = useState(false);

  // charts
  const [summary,      setSummary]      = useState(null);
  const [chartMonths,  setChartMonths]  = useState(6);
  const [paymentBreak, setPaymentBreak] = useState(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    getEntryCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setForm((f) => ({ ...f, category: "" }));
  }, [form.entry_type]);

  const loadEntries = useCallback(async () => {
    if (!customerId) return;
    setListLoading(true);
    try {
      const res = await listEntries(customerId, {
        entry_type: filterType || undefined,
        limit:      PAGE_SIZE,
        offset:     listPage * PAGE_SIZE,
      });
      setEntries(res.items);
      setTotal(res.total);
    } catch { /* ignore */ }
    finally { setListLoading(false); }
  }, [customerId, filterType, listPage]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const loadSummary = useCallback(async () => {
    if (!customerId) return;
    try {
      const res = await getMonthlySummary(customerId, chartMonths);
      setSummary(res);
    } catch { /* ignore */ }
  }, [customerId, chartMonths]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const loadPaymentBreak = useCallback(async () => {
    if (!customerId) return;
    try {
      const res = await getPaymentMethodSummary(customerId, "expense");
      setPaymentBreak(res.breakdown ?? []);
    } catch { /* ignore */ }
  }, [customerId]);

  useEffect(() => { loadPaymentBreak(); }, [loadPaymentBreak]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category || !form.amount || Number(form.amount) <= 0) {
      setSubmitMsg({ ok: false, text: "Please fill in category and a valid amount." });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await addEntry(customerId, {
        ...form,
        amount:         Number(form.amount),
        payment_method: form.payment_method || null,
      });
      setSubmitMsg({ ok: true, text: "Entry added! Credit score updated." });
      setForm((f) => ({ ...f, amount: "", note: "", category: "", payment_method: "" }));
      loadEntries();
      loadSummary();
      loadPaymentBreak();
      // Refresh credit score shown in session (backend computed it)
      // We'll fetch the updated score via the response header or by re-fetching profile
    } catch (err) {
      setSubmitMsg({ ok: false, text: err?.response?.data?.detail || "Failed to add entry." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEntry(customerId, id);
      loadEntries();
      loadSummary();
      loadPaymentBreak();
    } catch { /* ignore */ }
  };

  const currentCats = categories[form.entry_type] || [];
  const totalPages  = Math.ceil(total / PAGE_SIZE);

  // payment method pie data
  const payPieData = (paymentBreak ?? []).map((p) => ({
    name: p.payment_method,
    value: p.total,
    pct: p.pct,
  }));

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow="My Finances"
        title="Daily Entries"
        description="Log income, expenses and savings. Every entry updates your credit score in real time."
      />

      {/* ── Summary cards + credit score ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {(["income", "expense", "savings"] ).map((t) => {
            const meta = TYPE_META[t];
            const Icon = meta.icon;
            const avg  = summary.averages[`monthly_${t}`] ?? 0;
            return (
              <div key={t} className={`glass rounded-2xl p-4 border ${meta.border}`}>
                <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.color} mb-1`}>
                  <Icon className="h-3.5 w-3.5" /> {meta.label}
                </div>
                <p className="font-display font-semibold text-lg">
                  ₹{avg.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-muted mt-0.5">avg / month</p>
              </div>
            );
          })}
          {/* Credit Score card */}
          <div className="glass rounded-2xl p-4 border border-primary/20">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-accent mb-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Credit Score
            </div>
            <p className={`font-display font-semibold text-lg ${
              (user?.credit_score ?? 650) >= 700 ? "text-success" :
              (user?.credit_score ?? 650) >= 600 ? "text-accent" : "text-warning"
            }`}>
              {user?.credit_score ?? 650}
            </p>
            <p className="text-[10px] text-muted mt-0.5">auto-updated on save</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* ── Add Entry Form ── */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 glass rounded-2xl p-6 space-y-4 h-fit"
        >
          <p className="text-sm font-semibold flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-accent" /> Add Entry
          </p>

          {/* Date */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Date</label>
            <input
              type="date"
              value={form.entry_date}
              max={TODAY}
              onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
              className="w-full rounded-xl border border-border bg-[#1a2235] px-3.5 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Type toggle */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Type</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-border">
              {Object.entries(TYPE_META).map(([t, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={t} type="button"
                    onClick={() => setForm((f) => ({ ...f, entry_type: t }))}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all ${
                      form.entry_type === t
                        ? `${meta.bg} ${meta.color} ${meta.border} border`
                        : "text-muted hover:text-text"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Category <span className="text-danger">*</span></label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full appearance-none rounded-xl border border-border bg-[#1a2235] px-3.5 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Select category…</option>
                {currentCats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Amount (₹) <span className="text-danger">*</span></label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
              <input
                type="number" min="1" step="1"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-white/[0.03] pl-8 pr-3.5 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">
              Payment Method
              <span className="text-muted/60 ml-1">(optional — improves credit score)</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map((pm) => {
                const Icon = PAYMENT_ICONS[pm] ?? CreditCard;
                const selected = form.payment_method === pm;
                const color = PAYMENT_COLORS[pm] ?? "#8B95A7";
                return (
                  <button
                    key={pm} type="button"
                    onClick={() => setForm((f) => ({
                      ...f,
                      payment_method: f.payment_method === pm ? "" : pm,
                    }))}
                    className={`flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 text-[10px] font-medium border transition-all ${
                      selected
                        ? "border-primary/50 bg-primary/10 text-accent"
                        : "border-border text-muted hover:border-primary/30 hover:text-text"
                    }`}
                    style={selected ? { borderColor: color + "55", color } : {}}
                  >
                    <Icon className="h-4 w-4" />
                    {pm}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Note (optional)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Brief description…"
              maxLength={120}
              className="w-full rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }} type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium shadow-[0_0_24px_-6px_rgba(37,99,235,0.5)] hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            <PlusCircle className="h-4 w-4" />
            {submitting ? "Saving…" : "Add Entry"}
          </motion.button>

          <AnimatePresence>
            {submitMsg && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${
                  submitMsg.ok
                    ? "text-success bg-success/10 border-success/20"
                    : "text-danger bg-danger/10 border-danger/20"
                }`}
              >
                {submitMsg.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Credit score explanation */}
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 space-y-1.5">
            <p className="text-xs font-medium text-accent">How your credit score is calculated</p>
            {[
              ["Income Stability", "Consistent monthly income entries"],
              ["Savings Rate",     "Savings ÷ income (25% → full marks)"],
              ["Spending Control", "Lower spend ratio → higher score"],
              ["Loan/EMI Burden",  "Heavy EMI load reduces score"],
              ["Digital Payments","UPI/Card usage signals formal banking"],
              ["Entry Frequency", "Regular logging = financial discipline"],
            ].map(([label, desc]) => (
              <div key={label} className="flex items-start gap-1.5">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span className="text-[10px] text-muted">
                  <span className="text-text font-medium">{label}</span> — {desc}
                </span>
              </div>
            ))}
          </div>
        </form>

        {/* ── Right panel ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Monthly chart */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-accent" /> Monthly Overview
              </p>
              <select
                value={chartMonths}
                onChange={(e) => setChartMonths(Number(e.target.value))}
                className="text-xs rounded-lg border border-border bg-[#1a2235] px-2 py-1.5 outline-none"
              >
                {[3, 6, 12].map((m) => <option key={m} value={m}>Last {m} months</option>)}
              </select>
            </div>
            {summary?.monthly?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary.monthly} barCategoryGap="30%" barGap={2}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="income"  name="Income"  fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="savings" name="Savings" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[140px] text-muted text-sm gap-2">
                <BarChart3 className="h-8 w-8 opacity-30" />
                No entries yet — add your first entry to see the chart.
              </div>
            )}
          </div>

          {/* Payment method breakdown */}
          {payPieData.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <p className="text-sm font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-accent" /> Payment Method Breakdown
                <span className="text-[10px] text-muted font-normal">(expenses only)</span>
              </p>
              <div className="flex items-center gap-6">
                <PieChart width={120} height={120}>
                  <Pie data={payPieData} cx={55} cy={55}
                    innerRadius={32} outerRadius={52}
                    dataKey="value" strokeWidth={0}
                  >
                    {payPieData.map((d) => (
                      <Cell key={d.name} fill={PAYMENT_COLORS[d.name] ?? "#8B95A7"} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChartTip />}
                    formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                  />
                </PieChart>
                <div className="flex-1 space-y-2">
                  {payPieData.map((d) => {
                    const Icon = PAYMENT_ICONS[d.name] ?? CreditCard;
                    const color = PAYMENT_COLORS[d.name] ?? "#8B95A7";
                    return (
                      <div key={d.name} className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                        <span className="text-xs text-muted flex-1">{d.name}</span>
                        <span className="text-xs font-semibold tabular-nums">{d.pct}%</span>
                        <span className="text-[10px] text-muted tabular-nums">
                          ₹{d.value.toLocaleString("en-IN")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* History list */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-accent" /> Entry History
                {total > 0 && <span className="text-xs text-muted font-normal">({total} total)</span>}
              </p>
              <div className="flex items-center gap-1.5">
                <ListFilter className="h-3.5 w-3.5 text-muted" />
                {["", "income", "expense", "savings"].map((t) => (
                  <button
                    key={t}
                    onClick={() => { setFilterType(t); setListPage(0); }}
                    className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                      filterType === t
                        ? "bg-primary/15 border-primary/30 text-accent"
                        : "border-border text-muted hover:text-text"
                    }`}
                  >
                    {t === "" ? "All" : TYPE_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            {listLoading ? (
              <Loading label="Loading entries…" />
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No entries found.</p>
            ) : (
              <div className="space-y-1.5">
                {entries.map((e) => {
                  const meta = TYPE_META[e.entry_type] ?? TYPE_META.expense;
                  const Icon = meta.icon;
                  const PayIcon = e.payment_method
                    ? (PAYMENT_ICONS[e.payment_method] ?? CreditCard)
                    : null;
                  const payColor = e.payment_method
                    ? (PAYMENT_COLORS[e.payment_method] ?? "#8B95A7")
                    : null;
                  return (
                    <motion.div
                      key={e.id} layout
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.03] group transition-colors"
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${meta.bg}`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{e.category}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-muted">{e.entry_date}</span>
                          {PayIcon && (
                            <span
                              className="flex items-center gap-0.5 text-[10px] font-medium"
                              style={{ color: payColor }}
                            >
                              <PayIcon className="h-3 w-3" /> {e.payment_method}
                            </span>
                          )}
                          {e.note && (
                            <span className="text-[10px] text-muted/70 truncate max-w-[120px]">
                              · {e.note}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${meta.color}`}>
                          {e.entry_type === "expense" ? "−" : "+"}₹{e.amount.toLocaleString("en-IN")}
                        </p>
                        <p className={`text-[10px] ${meta.color} opacity-70 capitalize`}>{e.entry_type}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="opacity-0 group-hover:opacity-100 ml-1 text-muted hover:text-danger transition-all"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <button
                  onClick={() => setListPage((p) => Math.max(0, p - 1))}
                  disabled={listPage === 0}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:text-text disabled:opacity-40 transition-colors"
                >
                  Prev
                </button>
                <span className="text-xs text-muted">Page {listPage + 1} of {totalPages}</span>
                <button
                  onClick={() => setListPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={listPage >= totalPages - 1}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted hover:text-text disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
