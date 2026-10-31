import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, User, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const item = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

function PasswordStrength({ password }) {
  const checks = [
    { label: "At least 6 characters", ok: password.length >= 6 },
    { label: "Contains a number",     ok: /\d/.test(password) },
    { label: "Contains a letter",     ok: /[a-zA-Z]/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      {checks.map(({ label, ok }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <CheckCircle2 className={`h-3 w-3 ${ok ? "text-success" : "text-muted/40"}`} />
          <span className={ok ? "text-success" : "text-muted/50"}>{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim())  return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm)  return setError("Passwords do not match.");

    setLoading(true);
    const result = await register(name.trim(), email.trim(), password);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex items-stretch bg-bg relative overflow-hidden">
      {/* ambient blobs */}
      <motion.div
        className="pointer-events-none absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-[120px]"
        animate={{ x: [0, 30, 0], y: [0, 15, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-8rem] right-[-4rem] h-[26rem] w-[26rem] rounded-full bg-accent/20 blur-[120px]"
        animate={{ x: [0, -20, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* left brand panel */}
      <div className="hidden lg:flex flex-col justify-center flex-1 px-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">FinPulse</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="font-display text-4xl font-semibold max-w-md leading-tight"
        >
          Start tracking your finances smarter.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-muted mt-4 max-w-sm text-sm leading-relaxed"
        >
          Sign up in seconds. Log your income, expenses and savings — FinPulse
          handles the AI analysis, bank eligibility checks, and financial health scoring.
        </motion.p>

        <div className="mt-10 space-y-4 max-w-xs">
          {[
            "Free to use — no card required",
            "Your data stays private",
            "AI loan risk in seconds",
            "28-bank eligibility check",
          ].map((txt, i) => (
            <motion.div
              key={txt}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.07 }}
              className="flex items-center gap-2 text-sm text-muted"
            >
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
              {txt}
            </motion.div>
          ))}
        </div>
      </div>

      {/* right form card */}
      <div className="flex-1 flex items-center justify-center px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="glass w-full max-w-sm rounded-3xl p-8"
        >
          {/* mobile brand */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-semibold">FinPulse</span>
          </div>

          <h2 className="font-display text-2xl font-semibold mb-1">Create account</h2>
          <p className="text-sm text-muted mb-6">Free — takes about 30 seconds</p>

          <motion.form
            variants={container}
            initial="hidden"
            animate="show"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Name */}
            <motion.div variants={item}>
              <label className="text-xs text-muted mb-1.5 block">Full Name</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <User className="h-4 w-4 text-muted shrink-0" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  autoComplete="name"
                  className="bg-transparent outline-none text-sm w-full placeholder:text-muted/50"
                />
              </div>
            </motion.div>

            {/* Email */}
            <motion.div variants={item}>
              <label className="text-xs text-muted mb-1.5 block">Email</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Mail className="h-4 w-4 text-muted shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="bg-transparent outline-none text-sm w-full placeholder:text-muted/50"
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div variants={item}>
              <label className="text-xs text-muted mb-1.5 block">Password</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Lock className="h-4 w-4 text-muted shrink-0" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  className="bg-transparent outline-none text-sm w-full placeholder:text-muted/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="text-muted hover:text-text transition-colors shrink-0"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </motion.div>

            {/* Confirm password */}
            <motion.div variants={item}>
              <label className="text-xs text-muted mb-1.5 block">Confirm Password</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Lock className="h-4 w-4 text-muted shrink-0" />
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  className="bg-transparent outline-none text-sm w-full placeholder:text-muted/50"
                />
              </div>
            </motion.div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-danger/10 border border-danger/20 px-3 py-2.5 text-xs text-danger"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.button
              variants={item}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium shadow-[0_0_24px_-6px_rgba(37,99,235,0.6)] hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              {loading
                ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <><span>Create Account</span><ArrowRight className="h-4 w-4" /></>
              }
            </motion.button>
          </motion.form>

          <p className="mt-6 text-center text-xs text-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-accent hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
