import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  CartesianGrid, Cell, PieChart, Pie,
} from "recharts";
import {
  Users, TrendingUp, TrendingDown, Landmark, ChevronDown,
  ChevronUp, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Building2, Cpu,
} from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import StatCard    from "../../components/cards/StatCard";
import Loading     from "../../components/common/Loading";
import ErrorState  from "../../components/common/ErrorState";
import { getLoanPortfolio } from "../../services/api";

const LOAN_TYPES     = ["Personal Loan","Home Loan","Vehicle Loan","Education Loan","Business Loan"];
const TENURE_OPTIONS = [12,24,36,60,84,120,180,240];
const RISK_COLORS    = { LOW: "#10B981", MEDIUM: "#F59E0B", HIGH: "#EF4444" };
const BAR_COLORS     = ["#2563EB","#06B6D4","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#8B95A7"];

const riskBadge = {
  LOW:    "bg-success/10 text-success border-success/20",
  MEDIUM: "bg-warning/10 text-warning border-warning/20",
  HIGH:   "bg-danger/10  text-danger  border-danger/20",
};

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#151D2E", border:"1px solid #1F2937", borderRadius:10, fontSize:12 }}
      className="px-3 py-2 text-xs space-y-1">
      <p className="text-muted">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("en-IN") : p.value}
        </p>
      ))}
    </div>
  );
};

/** Per-user expanded row */
function UserRow({ u, idx }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.025 }}
      className="rounded-xl border border-border overflow-hidden mb-2"
    >
      {/* Summary row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        {/* Avatar */}
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold shrink-0">
          {(u.name ?? "U")[0]}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{u.name}</p>
          <p className="text-xs text-muted truncate">{u.email ?? u.customer_id}</p>
        </div>

        {/* Risk badge */}
        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${riskBadge[u.risk_level] ?? ""}`}>
          {u.risk_level}
        </span>

        {/* Approval % */}
        <div className="text-right shrink-0 w-16">
          <p className={`text-sm font-semibold ${
            u.approval_probability >= 70 ? "text-success" :
            u.approval_probability >= 40 ? "text-warning" : "text-danger"
          }`}>{u.approval_probability}%</p>
          <p className="text-[10px] text-muted">approval</p>
        </div>

        {/* Banks eligible */}
        <div className="text-right shrink-0 w-16">
          <p className="text-sm font-semibold text-accent">{u.eligible_banks_count}</p>
          <p className="text-[10px] text-muted">banks</p>
        </div>

        {/* Top bank amount */}
        {u.top_bank ? (
          <div className="text-right shrink-0 hidden sm:block w-24">
            <p className="text-sm font-semibold">₹{(u.top_bank_amount / 100000).toFixed(1)}L</p>
            <p className="text-[10px] text-muted truncate">{u.top_bank?.split(" ")[0]}</p>
          </div>
        ) : (
          <div className="w-24 hidden sm:block" />
        )}

        {open
          ? <ChevronUp   className="h-4 w-4 text-muted shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted shrink-0" />}
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden border-t border-border/50"
          >
            <div className="px-4 py-4 space-y-4 bg-white/[0.01]">
              {/* AI stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Monthly Income",  val: `₹${(u.monthly_income||0).toLocaleString("en-IN")}`, cls: "text-success" },
                  { label: "Credit Score",    val: u.credit_score,   cls: u.credit_score >= 700 ? "text-success" : u.credit_score >= 600 ? "text-warning" : "text-danger" },
                  { label: "Rec. Amount",     val: `₹${(u.recommended_amount||0).toLocaleString("en-IN")}`, cls: "" },
                  { label: "Rec. Tenure",     val: `${u.recommended_tenure} mo`, cls: "" },
                ].map(({ label, val, cls }) => (
                  <div key={label} className="rounded-xl bg-white/[0.02] border border-border p-2.5 text-center">
                    <p className={`text-sm font-semibold ${cls}`}>{val}</p>
                    <p className="text-[10px] text-muted mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* AI explanation */}
              {u.explanation?.length > 0 && (
                <div className="space-y-1">
                  {u.explanation.map((exp, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted">
                      <span className="text-accent mt-0.5 shrink-0">•</span>
                      <span>{exp}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Eligible banks list */}
              {u.eligible_banks?.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Top eligible banks
                  </p>
                  <div className="space-y-1.5">
                    {u.eligible_banks.map((b) => (
                      <div key={b.bank_name}
                        className="flex items-center gap-3 rounded-lg bg-success/5 border border-success/15 px-3 py-2 text-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        <span className="font-medium flex-1 truncate">{b.bank_name}</span>
                        <span className="text-success font-semibold">₹{(b.eligible_amount/100000).toFixed(1)}L</span>
                        <span className="text-muted">{b.interest_rate_min}–{b.interest_rate_max}% p.a.</span>
                        {b.est_emi && (
                          <span className="text-muted hidden sm:inline">EMI ₹{b.est_emi.toLocaleString("en-IN")}/mo</span>
                        )}
                      </div>
                    ))}
                    {u.ineligible_count > 0 && (
                      <p className="text-[10px] text-muted/60 text-right">
                        +{u.ineligible_count} ineligible banks
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg bg-danger/5 border border-danger/20 px-3 py-2 text-xs text-danger">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  No banks eligible for this loan type with current profile.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LoanAnalytics() {
  const [loanType, setLoanType] = useState("Personal Loan");
  const [amount,   setAmount]   = useState(500000);
  const [tenure,   setTenure]   = useState(60);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getLoanPortfolio({ loan_type: loanType, amount, tenure, limit: 50 });
      setData(res);
    } catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [loanType, amount, tenure]);

  useEffect(() => { load(); }, [load]);

  const summary  = data?.summary  ?? {};
  const portfolio= data?.portfolio ?? [];
  const topBanks = data?.top_banks ?? [];

  const pieData = [
    { name: "Approved",  value: summary.approved   ?? 0, fill: "#10B981" },
    { name: "High Risk", value: summary.high_risk  ?? 0, fill: "#EF4444" },
  ].filter((d) => d.value > 0);

  const riskCounts = portfolio.reduce((acc, u) => {
    acc[u.risk_level] = (acc[u.risk_level] || 0) + 1;
    return acc;
  }, {});
  const riskData = Object.entries(riskCounts).map(([k, v]) => ({
    name: k, count: v, fill: RISK_COLORS[k] ?? "#8B95A7",
  }));

  return (
    <AnimatedPage>
      <div className="mb-5">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">Admin Control Centre</p>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
          <Landmark className="h-6 w-6 text-accent" /> Loan Portfolio
        </h1>
        <p className="text-sm text-muted mt-1">
          AI risk scores + bank eligibility for every registered user.
        </p>
      </div>

      {/* Controls */}
      <div className="glass rounded-2xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted mb-1 block">Loan Type</label>
          <div className="relative">
            <select value={loanType} onChange={(e) => setLoanType(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-[#1a2235] px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-all">
              {LOAN_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Loan Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-white/[0.03] pl-7 pr-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-all" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Tenure</label>
          <div className="relative">
            <select value={tenure} onChange={(e) => setTenure(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-border bg-[#1a2235] px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-all">
              {TENURE_OPTIONS.map((m) => <option key={m} value={m}>{m} months</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col justify-end">
          <button onClick={load} disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analysing…" : "Run Analysis"}
          </button>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={load} />}
      {loading && !data && <Loading label="Running AI analysis for all users…" />}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <StatCard icon={Users}       label="Total Users"    value={summary.total_users    ?? 0} tone="primary" />
            <StatCard icon={CheckCircle2} label="Approved (AI)" value={summary.approved       ?? 0} tone="success" />
            <StatCard icon={AlertTriangle} label="High Risk"    value={summary.high_risk      ?? 0} tone="danger" />
            <StatCard icon={TrendingUp}  label="Avg Approval"   value={summary.avg_approval_pct ?? 0} tone="accent"
              format={(v) => `${v}%`} />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            {/* Risk distribution pie */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-accent" /> Risk Distribution
              </h3>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <PieChart width={120} height={120}>
                    <Pie data={pieData} cx={55} cy={55} innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={0}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                  <div className="space-y-2 flex-1">
                    {riskData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                        <span className="text-xs text-muted flex-1">{d.name}</span>
                        <span className="text-xs font-semibold">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted text-center py-8">No data yet.</p>
              )}
            </div>

            {/* Top approving banks bar chart */}
            <div className="lg:col-span-2 glass rounded-2xl p-5">
              <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-accent" /> Most Approving Banks
              </h3>
              {topBanks.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={topBanks} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="bank" tick={{ fill: "#8B95A7", fontSize: 9 }} axisLine={false} tickLine={false}
                      angle={-15} textAnchor="end" height={40} interval={0}
                      tickFormatter={(v) => v.split(" ").slice(0, 2).join(" ")} />
                    <YAxis tick={{ fill: "#8B95A7", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTip />} formatter={(v) => [v, "Users approved"]} />
                    <Bar dataKey="count" name="Users" radius={[4, 4, 0, 0]}>
                      {topBanks.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted text-center py-8">No bank approvals yet.</p>
              )}
            </div>
          </div>

          {/* Total eligible amount banner */}
          {summary.total_eligible_amount > 0 && (
            <div className="glass rounded-2xl p-4 mb-5 flex items-center gap-4 border border-success/20 bg-success/[0.04]">
              <Landmark className="h-8 w-8 text-success shrink-0" />
              <div>
                <p className="text-xs text-muted">Total eligible loan amount across all users</p>
                <p className="font-display text-xl font-bold text-success">
                  ₹{(summary.total_eligible_amount / 10000000).toFixed(2)} Cr
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs text-muted">For {data.loan_type}</p>
                <p className="text-sm font-medium">₹{amount.toLocaleString("en-IN")} · {tenure} mo</p>
              </div>
            </div>
          )}

          {/* Per-user list */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" /> User-wise Loan Eligibility
              </h3>
              <p className="text-xs text-muted">{portfolio.length} users</p>
            </div>

            {/* Column headers */}
            <div className="grid text-[10px] text-muted uppercase tracking-wide px-4 pb-2 border-b border-border mb-2"
              style={{ gridTemplateColumns: "2rem 1fr 5rem 5rem 5rem 6rem 1.5rem" }}>
              <span />
              <span>User</span>
              <span className="text-right">Risk</span>
              <span className="text-right">Approval</span>
              <span className="text-right">Banks</span>
              <span className="text-right hidden sm:block">Best Amount</span>
              <span />
            </div>

            {portfolio.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">
                No registered users yet.
              </p>
            ) : (
              <div>
                {portfolio.map((u, i) => (
                  <UserRow key={u.customer_id} u={u} idx={i} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AnimatedPage>
  );
}
