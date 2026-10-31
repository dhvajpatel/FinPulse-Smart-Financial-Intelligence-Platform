import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu, CheckCircle2, Lock, Pencil, AlertCircle,
  Building2, XCircle, ChevronDown, ChevronUp,
  IndianRupee, Percent, Clock, TrendingUp, RefreshCw,
} from "lucide-react";
import AnimatedPage  from "../../components/common/AnimatedPage";
import RiskCard      from "../../components/cards/RiskCard";
import ErrorState    from "../../components/common/ErrorState";
import Loading       from "../../components/common/Loading";
import { useAuth }   from "../../context/AuthContext";
import { predictLoan, getCustomerLoanProfile, getBankEligibility } from "../../services/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const LOAN_TYPES     = ["Personal Loan","Home Loan","Vehicle Loan","Education Loan","Business Loan"];
const TENURE_OPTIONS = [12,24,36,60,84,120,180,240,300];
const STAGES = [
  "Analysing financial profile…",
  "Evaluating credit behaviour…",
  "Running neural network…",
  "Calculating risk score…",
];
const TYPE_BADGE = {
  Public:          "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Private:         "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Small Finance": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Cooperative:     "bg-teal-500/10 text-teal-400 border-teal-500/20",
};

// ── Bank card ─────────────────────────────────────────────────────────────────
function BankCard({ bank, idx }) {
  const [open, setOpen] = useState(false);
  const typeCls = TYPE_BADGE[bank.bank_type] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20";

  if (!bank.eligible) {
    return (
      <div className="flex items-start gap-3 rounded-xl px-4 py-3 bg-white/[0.01] border border-border/40 opacity-55">
        <XCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-muted">{bank.bank_name}</p>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${typeCls}`}>{bank.bank_type}</span>
          </div>
          <p className="text-[10px] text-muted/60 mt-0.5">{bank.reasons_not_eligible?.join(" · ")}</p>
        </div>
        <div className="text-xs text-muted/60 shrink-0">{bank.interest_rate_min}–{bank.interest_rate_max}% p.a.</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="rounded-2xl border border-border bg-surface/40 overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
      >
        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{bank.bank_name}</p>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${typeCls}`}>{bank.bank_type}</span>
            {!bank.emi_within_capacity && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border bg-warning/10 text-warning border-warning/20">High EMI</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-success">₹{(bank.eligible_amount / 100000).toFixed(1)}L</p>
          <p className="text-[10px] text-muted">eligible</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border/50">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {[
                  { Icon: IndianRupee, label: "Eligible", value: `₹${bank.eligible_amount.toLocaleString("en-IN")}` },
                  { Icon: Percent,    label: "Rate",      value: `${bank.interest_rate_min}–${bank.interest_rate_max}%` },
                  { Icon: Clock,      label: "Tenure",    value: `${bank.max_tenure_months} mo` },
                  { Icon: IndianRupee,label: "Fee",       value: `${bank.processing_fee_pct}%` },
                ].map(({ Icon, label, value }) => (
                  <div key={label} className="rounded-xl bg-white/[0.02] border border-border p-2.5 text-center">
                    <Icon className="h-3.5 w-3.5 text-muted mx-auto mb-1" />
                    <p className="text-sm font-semibold">{value}</p>
                    <p className="text-[10px] text-muted">{label}</p>
                  </div>
                ))}
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
                      : `Exceeds 50% of disposable income (₹${bank.emi_capacity?.toLocaleString("en-IN")} capacity)`}
                  </span>
                </div>
              )}
              {bank.notes && (
                <p className="text-[11px] text-muted/70 border-t border-border/30 pt-2">{bank.notes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LoanEligibility() {
  const { user }   = useAuth();
  const customerId = user?.customer_id;

  // Shared controls (affect both panels)
  const [loanType,   setLoanType]   = useState("Personal Loan");
  const [loanAmount, setLoanAmount] = useState(500000);
  const [tenure,     setTenure]     = useState(60);

  // AI panel state
  const [profile, setProfile] = useState(null);
  const [form, setForm]       = useState({
    monthly_income:   0,
    credit_score:     650,
    employment_years: 0,
    existing_debt:    0,
  });
  const [stage,  setStage]   = useState(-1);
  const [result, setResult]  = useState(null);
  const [aiErr,  setAiErr]   = useState(null);

  // Bank panel state
  const [banks,    setBanks]    = useState(null);
  const [bankLoad, setBankLoad] = useState(false);
  const [bankErr,  setBankErr]  = useState(null);
  const [histMo,   setHistMo]   = useState(3);
  const [showInelig, setShowInelig] = useState(false);

  // Load profile on mount
  useEffect(() => {
    if (!customerId) return;
    getCustomerLoanProfile(customerId)
      .then((p) => {
        setProfile(p);
        setForm({
          monthly_income:   p.monthly_income   ?? 0,
          credit_score:     p.credit_score     ?? 650,
          employment_years: p.employment_years ?? 0,
          existing_debt:    p.existing_debt    ?? 0,
        });
      })
      .catch(() => {});
  }, [customerId]);

  // ── Run AI prediction ──────────────────────────────────────────────────────
  const runAI = async (e) => {
    e?.preventDefault();
    setResult(null); setAiErr(null); setStage(0);
    const timer = setInterval(() => setStage((s) => s < STAGES.length - 1 ? s + 1 : s), 450);
    try {
      const payload = {
        ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)])),
        requested_amount: Number(loanAmount),
        tenure_months:    Number(tenure),
        loan_type:        loanType,
      };
      const [res] = await Promise.all([
        predictLoan(payload),
        new Promise((r) => setTimeout(r, STAGES.length * 450 + 200)),
      ]);
      setResult(res);
    } catch (err) {
      setAiErr(err);
    } finally {
      clearInterval(timer);
      setStage(-1);
    }
  };

  // ── Fetch bank eligibility ─────────────────────────────────────────────────
  const fetchBanks = useCallback(async () => {
    if (!customerId) return;
    setBankLoad(true); setBankErr(null);
    try {
      const res = await getBankEligibility(customerId, {
        loan_type:        loanType,
        requested_amount: loanAmount || undefined,
        tenure_months:    tenure     || undefined,
        history_months:   histMo,
      });
      setBanks(res);
    } catch (err) {
      setBankErr(err?.response?.data?.detail || "Failed to load bank data.");
    } finally {
      setBankLoad(false);
    }
  }, [customerId, loanType, loanAmount, tenure, histMo]);

  useEffect(() => { fetchBanks(); }, [fetchBanks]);

  const eligible   = banks?.results?.filter((r) => r.eligible)  ?? [];
  const ineligible = banks?.results?.filter((r) => !r.eligible) ?? [];

  return (
    <AnimatedPage>
      <div className="mb-5">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">My Account</p>
        <h1 className="font-display text-2xl font-semibold">Loan Eligibility</h1>
        <p className="text-sm text-muted mt-1">
          Check your AI risk score and see which banks will approve you — all in one place.
        </p>
      </div>

      {/* ── Shared controls ── */}
      <div className="glass rounded-2xl p-5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted mb-1 block">Loan Type</label>
          <div className="relative">
            <select
              value={loanType} onChange={(e) => setLoanType(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-all"
            >
              {LOAN_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Loan Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
            <input
              type="number" value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="w-full rounded-xl border border-border bg-white/[0.03] pl-7 pr-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-all"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Tenure</label>
          <div className="relative">
            <select
              value={tenure} onChange={(e) => setTenure(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-all"
            >
              {TENURE_OPTIONS.map((m) => <option key={m} value={m}>{m} months</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Income History</label>
          <div className="relative">
            <select
              value={histMo} onChange={(e) => setHistMo(Number(e.target.value))}
              className="w-full appearance-none rounded-xl border border-border bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition-all"
            >
              {[1,2,3,6,12].map((m) => <option key={m} value={m}>Last {m} month{m > 1 ? "s" : ""}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ══ LEFT: AI Risk Score ═══════════════════════════════════════════ */}
        <section className="space-y-4">
          <h2 className="font-display font-semibold flex items-center gap-2 text-sm">
            <Cpu className="h-4 w-4 text-primary" /> AI Loan Risk Score
          </h2>

          {/* Profile info banner */}
          <div className="glass rounded-2xl p-4 flex items-center gap-3 border border-primary/15">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Income, credit score, employment & debt are pulled from your profile.
              <span className="text-accent ml-1">Pencil fields below are editable.</span>
            </p>
          </div>

          <form onSubmit={runAI} className="glass rounded-2xl p-5 space-y-3">
            {[
              { key: "monthly_income",   label: "Monthly Income (₹)",  locked: true,  step: 1000 },
              { key: "credit_score",     label: "Credit Score",         locked: true,  step: 1 },
              { key: "employment_years", label: "Employment (yrs)",     locked: true,  step: 0.5 },
              { key: "existing_debt",    label: "Existing Debt (₹)",    locked: true,  step: 500 },
            ].map(({ key, label, locked, step }) => (
              <div key={key}>
                <label className="text-xs text-muted mb-1.5 flex items-center gap-1.5">
                  {label}
                  {locked
                    ? <Lock className="h-3 w-3 text-muted/50 ml-auto" />
                    : <Pencil className="h-3 w-3 text-accent/60 ml-auto" />}
                </label>
                <div className="relative">
                  <input
                    type="number" value={form[key]} step={step}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    disabled={locked}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${
                      locked
                        ? "border-border bg-white/[0.01] text-muted cursor-not-allowed opacity-70"
                        : "border-border bg-white/[0.03] focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  {locked && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted/50 bg-white/5 px-1.5 py-0.5 rounded">auto</span>
                  )}
                </div>
              </div>
            ))}

            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={stage >= 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium shadow-[0_0_24px_-6px_rgba(37,99,235,0.5)] hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              <Cpu className="h-4 w-4" />
              {stage >= 0 ? "Analysing…" : "Check My Risk Score"}
            </motion.button>
          </form>

          {/* Result */}
          <div className="glass rounded-2xl p-5 min-h-[14rem] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {stage >= 0 && (
                <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  {STAGES.map((s, i) => (
                    <div key={s} className="flex items-center gap-3 text-sm">
                      {i < stage ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        : i === stage ? <span className="h-4 w-4 rounded-full border-2 border-t-accent border-white/10 animate-spin shrink-0" />
                        : <span className="h-4 w-4 rounded-full border border-border shrink-0" />}
                      <span className={i <= stage ? "text-text" : "text-muted"}>{s}</span>
                    </div>
                  ))}
                </motion.div>
              )}
              {aiErr && stage < 0 && (
                <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ErrorState error={aiErr} title="Analysis failed" onRetry={runAI} />
                </motion.div>
              )}
              {result && stage < 0 && !aiErr && (
                <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <RiskCard
                    level={result.risk_level}
                    approvalProbability={result.approval_probability}
                    defaultProbability={result.default_probability}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-white/[0.02] p-3 text-center">
                      <p className="font-display font-semibold">₹{result.recommended_amount?.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-muted mt-1">Recommended Amount</p>
                    </div>
                    <div className="rounded-xl border border-border bg-white/[0.02] p-3 text-center">
                      <p className="font-display font-semibold">{result.recommended_tenure} mo</p>
                      <p className="text-xs text-muted mt-1">Recommended Tenure</p>
                    </div>
                  </div>
                  {result.explanation?.map((exp, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted">
                      <span className="text-accent mt-0.5">•</span><span>{exp}</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted/60 text-center pt-2 border-t border-border">
                    AI estimate — final approval is subject to bank review.
                  </p>
                </motion.div>
              )}
              {!result && stage < 0 && !aiErr && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-3">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Cpu className="h-7 w-7 text-primary/60" />
                  </div>
                  <p className="text-sm text-muted">Set your loan details above, then click Check My Risk Score.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ══ RIGHT: Bank Eligibility ═══════════════════════════════════════ */}
        <section className="space-y-4">
          <h2 className="font-display font-semibold flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-accent" /> Bank Eligibility
            <button onClick={fetchBanks} className="ml-auto text-muted hover:text-accent transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </h2>

          {/* Data source banner */}
          {banks && (
            <div className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 border text-xs ${
              banks.data_source === "profile_fallback"
                ? "bg-warning/5 border-warning/20 text-warning"
                : "bg-success/5 border-success/20 text-success"
            }`}>
              {banks.data_source === "profile_fallback"
                ? <AlertCircle className="h-4 w-4 shrink-0" />
                : <TrendingUp className="h-4 w-4 shrink-0" />}
              <span>
                {banks.data_source === "profile_fallback"
                  ? "No daily entries — using profile income as fallback."
                  : `Based on last ${histMo} month(s) of entries — avg income ₹${banks.avg_monthly_income?.toLocaleString("en-IN")}.`}
              </span>
            </div>
          )}

          {/* Summary */}
          {banks && !bankLoad && (
            <p className="text-sm">
              <span className="font-semibold text-success">{banks.eligible_banks}</span>
              <span className="text-muted"> of {banks.total_banks} banks eligible</span>
            </p>
          )}

          {bankLoad && <Loading label="Checking bank eligibility…" />}
          {bankErr  && !bankLoad && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />{bankErr}
            </div>
          )}

          {banks && !bankLoad && (
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-0.5">
              {eligible.map((b, i) => <BankCard key={b.bank_name} bank={b} idx={i} />)}

              {ineligible.length > 0 && (
                <>
                  <button
                    onClick={() => setShowInelig((v) => !v)}
                    className="flex items-center gap-2 text-xs text-muted hover:text-text transition-colors mt-2"
                  >
                    {showInelig ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    {showInelig ? "Hide" : "Show"} {ineligible.length} ineligible banks
                  </button>
                  {showInelig && ineligible.map((b, i) => (
                    <BankCard key={b.bank_name} bank={b} idx={i} />
                  ))}
                </>
              )}

              <p className="text-[10px] text-muted/60 text-center pt-2">
                Results are indicative. Final approval depends on the bank's own assessment.
              </p>
            </div>
          )}
        </section>
      </div>
    </AnimatedPage>
  );
}
