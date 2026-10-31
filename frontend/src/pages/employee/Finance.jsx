import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  HeartPulse, Wallet, TrendingDown, PiggyBank,
  ShieldCheck, Briefcase, RefreshCw, Info,
} from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { getFinancialHealth } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

const ratingColor = {
  Excellent:        "#10B981",
  Good:             "#06B6D4",
  Fair:             "#F59E0B",
  "Needs Attention":"#EF4444",
};

function RadialScore({ score, rating }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = ratingColor[rating] ?? "#2563EB";
  return (
    <div className="relative h-40 w-40 mx-auto">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <motion.circle
          cx="64" cy="64" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          stroke={color}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="font-display text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted uppercase tracking-wider">/100</span>
      </div>
    </div>
  );
}

function Meter({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted">{label}</span>
        <span className="font-medium">₹{value?.toLocaleString("en-IN")}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

export default function Finance() {
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const load = async () => {
    if (!user?.customer_id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getFinancialHealth(user.customer_id);
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.customer_id]);

  if (loading) return <AnimatedPage><Loading label="Calculating your financial health…" /></AnimatedPage>;
  if (error)   return <AnimatedPage><ErrorState error={error} onRetry={load} /></AnimatedPage>;

  const rating     = data?.rating ?? "Needs Attention";
  const score      = data?.financial_health_score ?? 0;
  const income     = data?.monthly_income   ?? 0;
  const spending   = data?.monthly_spending ?? 0;
  const savings    = data?.savings          ?? 0;
  const savRatio   = data?.savings_ratio    ?? 0;
  const dti        = data?.debt_to_income   ?? 0;
  const isFallback = data?.data_source === "profile_fallback";

  const components = [
    { label: "Monthly Income",    value: `₹${income.toLocaleString("en-IN")}`,            icon: Wallet,      good: true },
    { label: "Monthly Spending",  value: `₹${spending.toLocaleString("en-IN")}`,          icon: TrendingDown, good: spending <= income * 0.7 },
    { label: "Avg Monthly Savings",value:`₹${savings.toLocaleString("en-IN")}`,           icon: PiggyBank,   good: savRatio >= 0.2 },
    { label: "Savings Rate",      value: `${(savRatio * 100).toFixed(1)}%`,               icon: ShieldCheck, good: savRatio >= 0.2 },
    { label: "Debt-to-Income",    value: `${(dti * 100).toFixed(1)}%`,                    icon: Briefcase,   good: dti < 0.4 },
    { label: "Data Source",       value: isFallback ? "Profile defaults" : "Live entries",icon: Info,        good: !isFallback },
  ];

  return (
    <AnimatedPage>
      <div className="mb-6">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">My Account</p>
        <h1 className="font-display text-2xl font-semibold">Financial Health</h1>
        <p className="text-sm text-muted mt-1">Your personal financial health score based on your entries.</p>
      </div>

      {/* Fallback warning */}
      {isFallback && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-3 mb-5 text-sm text-warning"
        >
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            No daily entries yet — showing profile defaults.{" "}
            <Link to="/dashboard/entries" className="underline font-medium">Add entries</Link>
            {" "}for a live score.
          </span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Score gauge */}
        <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center gap-4">
          <RadialScore score={score} rating={rating} />
          <div className="text-center">
            <p className="font-display font-semibold" style={{ color: ratingColor[rating] }}>{rating}</p>
            <p className="text-xs text-muted mt-0.5">Financial Health Score</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors mt-1"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* KPI grid */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-sm mb-5 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-accent" /> Score Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {components.map(({ label, value, icon: Icon, good }) => (
              <div key={label} className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  good ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted">{label}</p>
                  <p className="text-sm font-semibold truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Income vs Spending meters */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-display font-semibold text-sm mb-5">Income vs Outgoings</h3>
        <div className="space-y-4 max-w-xl">
          <Meter label="Income"   value={income}   max={income} color="bg-primary" />
          <Meter label="Spending" value={spending} max={income} color={spending > income * 0.7 ? "bg-danger" : "bg-warning"} />
          <Meter label="Savings"  value={savings}  max={income} color="bg-success" />
        </div>

        {/* Score component weights */}
        <div className="mt-6 pt-5 border-t border-border">
          <p className="text-xs text-muted mb-3">How your score is calculated</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Income Stability", weight: "20%" },
              { label: "Savings Rate",     weight: "20%" },
              { label: "Debt Load",        weight: "20%" },
              { label: "Spending Control", weight: "15%" },
              { label: "Credit Score",     weight: "15%" },
              { label: "Balance",          weight: "10%" },
            ].map(({ label, weight }) => (
              <div key={label} className="flex items-center justify-between text-xs rounded-lg bg-white/[0.02] border border-border px-3 py-2">
                <span className="text-muted">{label}</span>
                <span className="font-medium text-accent">{weight}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
