import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  Wallet, TrendingUp, ShieldCheck, PiggyBank,
  Sparkles, BookOpen, ArrowRight, Info,
} from "lucide-react";
import AnimatedPage    from "../../components/common/AnimatedPage";
import Loading         from "../../components/common/Loading";
import ErrorState      from "../../components/common/ErrorState";
import RecommendationCard from "../../components/cards/RecommendationCard";
import { useAuth }     from "../../context/AuthContext";
import {
  getFinancialHealth,
  getMonthlySummary,
  getSpending,
  getRecommendations,
  getCustomer,
} from "../../services/api";

const COLORS = ["#2563EB", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const ratingColor = {
  Excellent:       "#10B981",
  Good:            "#06B6D4",
  Fair:            "#F59E0B",
  "Needs Attention":"#EF4444",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#151D2E", border: "1px solid #1F2937", borderRadius: 12 }}
      className="px-3 py-2 text-xs shadow-xl">
      <p className="text-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: ₹{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

function HealthGauge({ score, rating }) {
  const color = ratingColor[rating] ?? "#2563EB";
  const data  = [{ value: score }, { value: 100 - score }];
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <PieChart width={140} height={80}>
          <Pie
            data={data} cx={65} cy={75}
            startAngle={180} endAngle={0}
            innerRadius={44} outerRadius={62}
            dataKey="value" strokeWidth={0}
          >
            <Cell fill={color} />
            <Cell fill="rgba(255,255,255,0.05)" />
          </Pie>
        </PieChart>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-1">
          <span className="font-display text-xl font-semibold" style={{ color }}>{score}</span>
          <span className="text-[10px] text-muted">/100</span>
        </div>
      </div>
      <span className="text-xs font-medium mt-1" style={{ color }}>{rating}</span>
    </div>
  );
}

// ── Empty-state nudge shown when user has no entries yet ──────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-8 text-center flex flex-col items-center gap-4"
    >
      <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
        <BookOpen className="h-7 w-7" />
      </div>
      <div>
        <h2 className="font-display text-lg font-semibold mb-1">No entries yet</h2>
        <p className="text-sm text-muted max-w-xs">
          Add your first income, expense or savings entry and FinPulse will
          calculate your financial health, spending breakdown and AI recommendations.
        </p>
      </div>
      <Link
        to="/dashboard/entries"
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all"
      >
        Add your first entry <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.div>
  );
}

export default function CustomerDashboard() {
  const { user }     = useAuth();
  const customerId   = user?.customer_id;

  const [profile,      setProfile]      = useState(null);
  const [health,       setHealth]        = useState(null);
  const [trend,        setTrend]         = useState([]);
  const [categories,   setCategories]    = useState([]);
  const [recs,         setRecs]          = useState([]);
  const [hasEntries,   setHasEntries]    = useState(true);
  const [loading,      setLoading]       = useState(true);
  const [error,        setError]         = useState(null);

  const load = async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const [prof, h, monthly, spendData, recommendations] = await Promise.all([
        getCustomer(customerId),
        getFinancialHealth(customerId),
        getMonthlySummary(customerId, 6),
        getSpending(customerId, 3),
        getRecommendations(customerId),
      ]);

      setProfile(prof);
      setHealth(h);
      setTrend(monthly.monthly ?? []);
      setCategories(spendData?.breakdown ?? []);
      setRecs(recommendations?.recommendations ?? []);
      setHasEntries((monthly.monthly?.length ?? 0) > 0);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [customerId]);

  if (error)   return <AnimatedPage><ErrorState error={error} onRetry={load} /></AnimatedPage>;
  if (loading) return <AnimatedPage><Loading label="Loading your dashboard…" /></AnimatedPage>;

  const name     = profile?.name ?? user?.name ?? "there";
  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();

  const income   = health?.monthly_income   ?? 0;
  const spending = health?.monthly_spending ?? 0;
  const savings  = health?.savings          ?? 0;
  const credit   = profile?.credit_score    ?? 650;
  const spendPct = income > 0 ? Math.round((spending / income) * 100) : 0;
  const savePct  = income > 0 ? Math.round((savings  / income) * 100) : 0;

  // Pie chart from top 6 expense categories
  const topCats  = categories.slice(0, 6);
  const pieData  = topCats.map((c) => ({ name: c.category, value: c.amount }));

  return (
    <AnimatedPage>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">My Dashboard</p>
        <h1 className="font-display text-2xl font-semibold">
          {greeting}, {name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted mt-1">
          {customerId} · {profile?.city ?? user?.email}
          {health?.data_source === "profile_fallback" && (
            <span className="ml-2 text-warning text-xs">(using profile defaults — add entries for live data)</span>
          )}
        </p>
      </div>

      {/* No entries yet → nudge */}
      {!hasEntries && <div className="mb-5"><EmptyState /></div>}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          {
            icon: Wallet,    label: "Avg Monthly Income",
            value: `₹${income.toLocaleString()}`,
            tone: "primary",  sub: "From your entries",
          },
          {
            icon: TrendingUp, label: "Avg Monthly Spend",
            value: `₹${spending.toLocaleString()}`,
            tone: spendPct > 80 ? "danger" : "warning",
            sub: `${spendPct}% of income`,
          },
          {
            icon: ShieldCheck, label: "Credit Score",
            value: credit,
            tone: credit >= 700 ? "success" : credit >= 600 ? "warning" : "danger",
            sub: credit >= 750 ? "Excellent — auto-computed" : credit >= 650 ? "Good — auto-computed" : "Updates with entries",
          },
          {
            icon: PiggyBank, label: "Avg Monthly Savings",
            value: `₹${savings.toLocaleString()}`,
            tone: "success",   sub: `${savePct}% saved`,
          },
        ].map(({ icon: Icon, label, value, tone, sub }, i) => {
          const c = {
            primary: { bg: "bg-primary/15", text: "text-primary" },
            success: { bg: "bg-success/15", text: "text-success" },
            warning: { bg: "bg-warning/15", text: "text-warning" },
            danger:  { bg: "bg-danger/15",  text: "text-danger"  },
          }[tone];
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass rounded-2xl p-4 relative overflow-hidden"
            >
              <div className={`h-8 w-8 rounded-lg ${c.bg} ${c.text} flex items-center justify-center mb-3`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="font-display text-lg font-semibold">{value}</p>
              <p className="text-[11px] text-muted mt-0.5">{label}</p>
              <p className={`text-[10px] mt-1 font-medium ${c.text}`}>{sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Row 2 — trend chart + health gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Income vs Expense trend */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Income vs Spending Trend</h3>
            <span className="text-xs text-muted">Last 6 months</span>
          </div>
          {trend.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#8B95A7" }} />
                <Bar dataKey="income"   name="Income"  fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings"  name="Savings" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[180px] gap-2 text-muted">
              <Info className="h-5 w-5" />
              <p className="text-xs">Add entries to see your trend chart.</p>
            </div>
          )}
        </div>

        {/* Financial health gauge */}
        <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center">
          <h3 className="font-display font-semibold text-sm mb-4 self-start">Financial Health</h3>
          <HealthGauge
            score={health?.financial_health_score ?? 0}
            rating={health?.rating ?? "Needs Attention"}
          />
          <div className="mt-4 w-full space-y-2">
            {[
              {
                label: "Savings Ratio",
                val:   `${Math.round((health?.savings_ratio ?? 0) * 100)}%`,
                good:  (health?.savings_ratio ?? 0) >= 0.2,
              },
              {
                label: "Debt-to-Income",
                val:   `${Math.round((health?.debt_to_income ?? 0) * 100)}%`,
                good:  (health?.debt_to_income ?? 0) < 0.4,
              },
            ].map(({ label, val, good }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-muted">{label}</span>
                <span className={good ? "text-success font-medium" : "text-warning font-medium"}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — spend donut + AI recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Spend breakdown donut */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Spending Breakdown</h3>
          {topCats.length ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={pieData} cx={75} cy={75}
                    innerRadius={44} outerRadius={68}
                    dataKey="value" strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => `₹${Number(v).toLocaleString()}`}
                    contentStyle={{
                      background: "#151D2E", border: "1px solid #1F2937",
                      borderRadius: 12, fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {topCats.map((b, i) => (
                  <div key={b.category} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-xs text-muted flex-1 truncate">{b.category}</span>
                    <span className="text-xs font-semibold shrink-0 tabular-nums">
                      {b.pct_of_total > 0 ? `${b.pct_of_total}%` : "<1%"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[160px] gap-2 text-muted">
              <Info className="h-5 w-5" />
              <p className="text-xs">No expense entries yet.</p>
              <Link to="/dashboard/entries" className="text-xs text-accent hover:underline">
                Add an expense →
              </Link>
            </div>
          )}
        </div>

        {/* AI Recommendations */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" /> AI Recommendations
          </h3>
          <div className="space-y-2.5">
            {recs.length ? (
              recs.slice(0, 4).map((r) => (
                <RecommendationCard key={r.product} {...r} />
              ))
            ) : (
              <p className="text-sm text-muted">
                Recommendations appear once you've set up your profile and added a few entries.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick-action row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: "/dashboard/entries",          label: "Add Entry",       icon: BookOpen,    tone: "primary" },
          { to: "/dashboard/loan-eligibility", label: "Check Loan Risk", icon: TrendingUp,  tone: "warning" },
          { to: "/dashboard/loan-eligibility", label: "Bank Offers",     icon: ShieldCheck, tone: "success" },
          { to: "/dashboard/recommendations",  label: "All Recs",        icon: Sparkles,    tone: "accent"  },
        ].map(({ to, label, icon: Icon, tone }, i) => {
          const c = {
            primary: "bg-primary/10 hover:bg-primary/20 text-primary border-primary/20",
            warning: "bg-warning/10 hover:bg-warning/20 text-warning border-warning/20",
            success: "bg-success/10 hover:bg-success/20 text-success border-success/20",
            accent:  "bg-accent/10  hover:bg-accent/20  text-accent  border-accent/20",
          }[tone];
          return (
            <motion.div
              key={to}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
            >
              <Link
                to={to}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${c}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </AnimatedPage>
  );
}
