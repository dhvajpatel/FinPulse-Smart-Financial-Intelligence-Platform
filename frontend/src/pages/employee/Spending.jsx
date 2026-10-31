import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, BookOpen, Info } from "lucide-react";
import AnimatedPage   from "../../components/common/AnimatedPage";
import Loading        from "../../components/common/Loading";
import ErrorState     from "../../components/common/ErrorState";
import { useAuth }    from "../../context/AuthContext";
import { getSpending, getMonthlySummary } from "../../services/api";
import { Link } from "react-router-dom";

const COLORS = ["#2563EB","#06B6D4","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#8B95A7"];

const PERIODS = [
  { label: "Monthly",  months: 1  },
  { label: "6 Months", months: 6  },
  { label: "Yearly",   months: 12 },
];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#151D2E", border: "1px solid #1F2937", borderRadius: 12 }}
      className="px-3 py-2 text-xs shadow-xl space-y-1">
      <p className="text-muted font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: ₹{Number(p.value).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
};

export default function Spending() {
  const { user }   = useAuth();
  const customerId = user?.customer_id;

  const [period,    setPeriod]    = useState(1);
  const [breakdown, setBreakdown] = useState(null);
  const [trend,     setTrend]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const load = async (m) => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      // Run both in parallel — each handles its own period
      const [spend, monthly] = await Promise.all([
        getSpending(customerId, m),
        getMonthlySummary(customerId, m),
      ]);
      setBreakdown(spend);
      setTrend(monthly.monthly ?? []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, period]);

  // Derived display values
  const hasBreakdown  = (breakdown?.breakdown?.length ?? 0) > 0 && (breakdown?.total_spent ?? 0) > 0;
  const hasTrend      = trend.length > 0;
  const hasAnyData    = hasBreakdown || hasTrend;
  const topCats       = breakdown?.breakdown?.slice(0, 7) ?? [];
  const pieData       = topCats.map((c) => ({ name: c.category, value: c.amount }));
  const barData       = topCats.map((c) => ({
    name:   c.category.length > 10 ? c.category.slice(0, 10) + "…" : c.category,
    amount: c.amount,
  }));
  const totalSpent    = breakdown?.total_spent ?? 0;
  const avgPerMonth   = period > 0 ? Math.round(totalSpent / period) : 0;

  return (
    <AnimatedPage>
      <div className="mb-5">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">My Account</p>
        <h1 className="font-display text-2xl font-semibold">My Spending</h1>
        <p className="text-sm text-muted mt-1">Analyse your expenses across any time window.</p>
      </div>

      {/* Period selector */}
      <div className="glass rounded-2xl p-1.5 flex items-center gap-1 w-fit mb-5">
        {PERIODS.map(({ label, months }) => (
          <button
            key={months}
            onClick={() => setPeriod(months)}
            className={`px-5 py-2 rounded-xl text-xs font-medium transition-all ${
              period === months
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "text-muted hover:text-text hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <Loading label="Analysing spending…" />}
      {error   && <ErrorState error={error} onRetry={() => load(period)} />}

      {/* No data at all */}
      {!loading && !error && !hasAnyData && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 text-center flex flex-col items-center gap-4"
        >
          <BookOpen className="h-10 w-10 text-muted" />
          <div>
            <p className="font-semibold mb-1">No entries for this period</p>
            <p className="text-sm text-muted">
              {period === 1
                ? "Add expense entries for this month to see your breakdown."
                : `No entries found in the last ${period} months. Try adding some entries.`}
            </p>
          </div>
          <Link
            to="/dashboard/entries"
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-all"
          >
            <BookOpen className="h-4 w-4" /> Add Entry
          </Link>
        </motion.div>
      )}

      {!loading && !error && hasAnyData && (
        <>
          {/* Summary strip */}
          <div className="glass rounded-2xl p-5 mb-4 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted">Total Spent</p>
                <p className="font-display font-semibold text-lg">₹{totalSpent.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <div className="text-sm text-muted">
              Over <span className="text-text font-medium">{period} month{period > 1 ? "s" : ""}</span>
              {topCats.length > 0 && (
                <>{" · "}<span className="text-text font-medium">{topCats.length}</span> categories</>
              )}
            </div>
            <div className="ml-auto text-right hidden sm:block">
              <p className="text-xs text-muted">Avg / Month</p>
              <p className="font-display font-semibold">₹{avgPerMonth.toLocaleString("en-IN")}</p>
            </div>
          </div>

          {/* Row 1: donut + bar — only when expense data exists */}
          {hasBreakdown ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Donut */}
              <div className="glass rounded-2xl p-5">
                <h3 className="font-display font-semibold text-sm mb-4">Category Breakdown</h3>
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <PieChart width={164} height={164}>
                      <Pie
                        data={pieData} cx={78} cy={78}
                        innerRadius={46} outerRadius={70}
                        dataKey="value" strokeWidth={0}
                      >
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    {topCats.map((b, i) => (
                      <div key={b.category} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-xs text-muted flex-1 truncate">{b.category}</span>
                        <span className="text-xs font-semibold shrink-0 text-text">
                          {b.pct_of_total > 0 ? `${b.pct_of_total}%` : "<1%"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bar chart */}
              <div className="glass rounded-2xl p-5">
                <h3 className="font-display font-semibold text-sm mb-4">Amount by Category</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#8B95A7", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: "#8B95A7", fontSize: 10 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="amount" name="Spent" radius={[4, 4, 0, 0]}>
                      {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            /* Has trend data but no expenses in this period */
            <div className="glass rounded-2xl p-5 mb-4 flex items-center gap-3 border border-warning/20 bg-warning/5">
              <Info className="h-4 w-4 text-warning shrink-0" />
              <p className="text-sm text-muted">
                No expense entries for this period — showing income/savings trend only.{" "}
                <Link to="/dashboard/entries" className="text-accent hover:underline">Add expenses</Link>
              </p>
            </div>
          )}

          {/* Trend chart — shown when >1 month period and trend data exists */}
          {hasTrend && period > 1 && (
            <div className="glass rounded-2xl p-5 mb-4">
              <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                Income vs Expense Trend
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="savG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#8B95A7", fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#8B95A7" }} />
                  <Area type="monotone" dataKey="income"   name="Income"  stroke="#2563EB" strokeWidth={2} fill="url(#incG)" dot={{ fill: "#2563EB", r: 3 }} />
                  <Area type="monotone" dataKey="spending" name="Expense" stroke="#EF4444" strokeWidth={2} fill="url(#expG)" dot={{ fill: "#EF4444", r: 3 }} />
                  <Area type="monotone" dataKey="savings"  name="Savings" stroke="#10B981" strokeWidth={2} fill="url(#savG)" dot={{ fill: "#10B981", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Month-by-month table — period > 1 and trend exists */}
          {hasTrend && period > 1 && (
            <div className="glass rounded-2xl p-5 mb-4">
              <h3 className="font-display font-semibold text-sm mb-4">Month-by-Month Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted uppercase tracking-wide text-left border-b border-border">
                      <th className="pb-3 font-medium">Month</th>
                      <th className="pb-3 font-medium text-right">Income</th>
                      <th className="pb-3 font-medium text-right">Expense</th>
                      <th className="pb-3 font-medium text-right">Savings</th>
                      <th className="pb-3 font-medium text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {trend.map((m) => {
                      const net = (m.income ?? 0) - (m.spending ?? 0);
                      return (
                        <tr key={m.month} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 font-medium">{m.month}</td>
                          <td className="py-2.5 text-right text-success">₹{(m.income ?? 0).toLocaleString("en-IN")}</td>
                          <td className="py-2.5 text-right text-danger">₹{(m.spending ?? 0).toLocaleString("en-IN")}</td>
                          <td className="py-2.5 text-right text-accent">₹{(m.savings ?? 0).toLocaleString("en-IN")}</td>
                          <td className={`py-2.5 text-right font-semibold ${net >= 0 ? "text-success" : "text-danger"}`}>
                            {net >= 0 ? "+" : ""}₹{net.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Insights */}
          {(breakdown?.insights?.length ?? 0) > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-accent" /> AI Insights
              </h3>
              <div className="space-y-2.5">
                {breakdown.insights.map((ins, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-start gap-3 rounded-xl border border-border bg-white/[0.02] px-4 py-3 text-sm"
                  >
                    <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-muted leading-relaxed">{ins}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AnimatedPage>
  );
}
