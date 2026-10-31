import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  IndianRupee, Percent, Clock, AlertCircle, RefreshCw, TrendingUp,
} from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import PageHeader from "../../components/layout/PageHeader";
import Loading from "../../components/common/Loading";
import { useAuth } from "../../context/AuthContext";
import { getBankEligibility } from "../../services/api";

const LOAN_TYPES = [
  "Personal Loan", "Home Loan", "Vehicle Loan",
  "Education Loan", "Business Loan",
];

const TENURE_OPTIONS = [12, 24, 36, 48, 60, 84, 120, 180, 240, 300, 360];

const TYPE_BADGE = {
  Public:       "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Private:      "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Small Finance": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Cooperative:  "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

function BankCard({ bank, idx }) {
  const [expanded, setExpanded] = useState(false);
  const typeCls = TYPE_BADGE[bank.bank_type] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20";

  if (!bank.eligible) {
    return (
      <div className="flex items-start gap-3 rounded-xl px-4 py-3 bg-white/[0.01] border border-border/40 opacity-60">
        <XCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-muted">{bank.bank_name}</p>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${typeCls}`}>
              {bank.bank_type}
            </span>
          </div>
          <p className="text-[10px] text-muted/60 mt-0.5">
            {bank.reasons_not_eligible?.join(" · ")}
          </p>
        </div>
        <div className="text-xs text-muted/60 shrink-0">
          {bank.interest_rate_min}–{bank.interest_rate_max}% p.a.
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="rounded-2xl border border-border bg-surface/40 overflow-hidden"
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
      >
        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{bank.bank_name}</p>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${typeCls}`}>
              {bank.bank_type}
            </span>
            {!bank.emi_within_capacity && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border bg-warning/10 text-warning border-warning/20">
                High EMI
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-success">
            ₹{(bank.eligible_amount / 100000).toFixed(1)}L
          </p>
          <p className="text-[10px] text-muted">eligible</p>
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border/50">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                <Stat icon={IndianRupee} label="Eligible Amount"
                  value={`₹${bank.eligible_amount.toLocaleString("en-IN")}`} />
                <Stat icon={Percent} label="Interest Rate"
                  value={`${bank.interest_rate_min}–${bank.interest_rate_max}%`} />
                <Stat icon={Clock} label="Max Tenure"
                  value={`${bank.max_tenure_months} mo`} />
                <Stat icon={IndianRupee} label="Processing Fee"
                  value={`${bank.processing_fee_pct}%`} />
              </div>

              {bank.est_emi && (
                <div className={`rounded-xl px-3.5 py-2.5 text-sm border ${
                  bank.emi_within_capacity
                    ? "bg-success/5 border-success/20 text-success"
                    : "bg-warning/5 border-warning/20 text-warning"
                }`}>
                  <span className="font-semibold">Est. EMI ₹{bank.est_emi.toLocaleString("en-IN")}/mo</span>
                  {" · "}
                  <span className="text-xs opacity-80">
                    {bank.emi_within_capacity
                      ? "Within your repayment capacity"
                      : `Exceeds 50% of your disposable income (₹${bank.emi_capacity?.toLocaleString("en-IN")} capacity)`}
                  </span>
                </div>
              )}

              {/* Loan types offered */}
              <div>
                <p className="text-[10px] text-muted mb-1.5">Loan types offered by this bank</p>
                <div className="flex flex-wrap gap-1.5">
                  {bank.loan_types_offered?.map((lt) => (
                    <span key={lt} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-border text-muted">
                      {lt}
                    </span>
                  ))}
                </div>
              </div>

              {bank.notes && (
                <p className="text-[11px] text-muted/70 border-t border-border/30 pt-2">
                  {bank.notes}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-border p-2.5 text-center">
      <Icon className="h-3.5 w-3.5 text-muted mx-auto mb-1" />
      <p className="text-sm font-semibold">{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}

export default function BankEligibility() {
  const { user } = useAuth();
  const customerId = user?.customer_id;

  const [loanType, setLoanType]       = useState("Personal Loan");
  const [reqAmount, setReqAmount]     = useState("");
  const [tenure, setTenure]           = useState("");
  const [histMonths, setHistMonths]   = useState(3);
  const [showIneligible, setShowIneligible] = useState(false);

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetch = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getBankEligibility(customerId, {
        loan_type: loanType,
        requested_amount: reqAmount ? Number(reqAmount) : undefined,
        tenure_months: tenure ? Number(tenure) : undefined,
        history_months: histMonths,
      });
      setData(res);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load eligibility.");
    } finally {
      setLoading(false);
    }
  }, [customerId, loanType, reqAmount, tenure, histMonths]);

  useEffect(() => { fetch(); }, [fetch]);

  const eligible   = data?.results?.filter((r) => r.eligible) ?? [];
  const ineligible = data?.results?.filter((r) => !r.eligible) ?? [];

  return (
    <AnimatedPage>
      <PageHeader
        eyebrow="Loan Eligibility"
        title="Bank Eligibility Check"
        description="See which Indian banks will approve your loan and how much they'll offer."
      />

      {/* ── Controls ── */}
      <div className="glass rounded-2xl p-5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Loan type */}
        <div>
          <label className="text-xs text-muted mb-1 block">Loan Type</label>
          <div className="relative">
            <select
              value={loanType}
              onChange={(e) => setLoanType(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-primary/50 transition-all"
            >
              {LOAN_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Requested amount */}
        <div>
          <label className="text-xs text-muted mb-1 block">Desired Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
            <input
              type="number"
              placeholder="Any"
              value={reqAmount}
              onChange={(e) => setReqAmount(e.target.value)}
              className="w-full rounded-xl border border-border bg-white/[0.03] pl-7 pr-3 py-2 text-sm outline-none focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* Tenure */}
        <div>
          <label className="text-xs text-muted mb-1 block">Tenure</label>
          <div className="relative">
            <select
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-primary/50 transition-all"
            >
              <option value="">Max available</option>
              {TENURE_OPTIONS.map((m) => (
                <option key={m} value={m}>{m} months</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          </div>
        </div>

        {/* History window */}
        <div>
          <label className="text-xs text-muted mb-1 block">Income history</label>
          <div className="relative">
            <select
              value={histMonths}
              onChange={(e) => setHistMonths(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-border bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-primary/50 transition-all"
            >
              {[1, 2, 3, 6, 12].map((m) => (
                <option key={m} value={m}>Last {m} month{m > 1 ? "s" : ""}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Data source banner ── */}
      {data && (
        <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 mb-4 border text-xs ${
          data.data_source === "profile_fallback"
            ? "bg-warning/5 border-warning/20 text-warning"
            : "bg-success/5 border-success/20 text-success"
        }`}>
          {data.data_source === "profile_fallback" ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <TrendingUp className="h-4 w-4 shrink-0" />
          )}
          <span>
            {data.data_source === "profile_fallback"
              ? "No daily entries found — using your stored profile income as a fallback. Add daily entries for a more accurate assessment."
              : `Based on your last ${histMonths} month(s) of daily entries — avg monthly income ₹${data.avg_monthly_income?.toLocaleString("en-IN")}, expenses ₹${data.avg_monthly_expense?.toLocaleString("en-IN")}.`}
          </span>
        </div>
      )}

      {/* ── Summary bar ── */}
      {data && !loading && (
        <div className="flex items-center gap-4 mb-4">
          <p className="text-sm">
            <span className="font-semibold text-success">{data.eligible_banks}</span>
            <span className="text-muted"> of {data.total_banks} banks eligible</span>
          </p>
          <button
            onClick={fetch}
            className="ml-auto flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      )}

      {/* ── Results ── */}
      {loading ? (
        <Loading label="Checking eligibility across Indian banks…" />
      ) : error ? (
        <div className="glass rounded-2xl p-6 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      ) : (
        <div className="space-y-2.5">
          {eligible.map((bank, i) => (
            <BankCard key={bank.bank_name} bank={bank} idx={i} />
          ))}

          {/* Ineligible toggle */}
          {ineligible.length > 0 && (
            <div>
              <button
                onClick={() => setShowIneligible((v) => !v)}
                className="flex items-center gap-2 text-xs text-muted hover:text-text py-2 transition-colors"
              >
                {showIneligible ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showIneligible ? "Hide" : "Show"} {ineligible.length} ineligible banks
              </button>
              <AnimatePresence>
                {showIneligible && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    {ineligible.map((bank, i) => (
                      <BankCard key={bank.bank_name} bank={bank} idx={i} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {!data && (
            <div className="glass rounded-2xl p-8 text-center text-muted">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select your loan type and click Refresh to check eligibility.</p>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-muted/50 text-center mt-6">
        Results are indicative based on your entry history and credit score. Final approval subject to bank review and documentation.
      </p>
    </AnimatedPage>
  );
}
