import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const item = {
  hidden: { opacity: 0, y: 12 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), password.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigate(result.session.role === "admin" ? "/admin" : "/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex items-stretch bg-bg relative overflow-hidden">
      {/* ambient blobs */}
      <motion.div
        className="pointer-events-none absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-primary/20 blur-[120px]"
        animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-10rem] right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-[120px]"
        animate={{ x: [0, -30, 0], y: [0, -25, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
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
          Your personal finance intelligence platform.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-muted mt-4 max-w-sm text-sm leading-relaxed"
        >
          Track daily income, expenses & savings. Get AI-powered loan risk scores,
          spending insights, and personalised banking recommendations — all from your own data.
        </motion.p>

        <div className="flex gap-8 mt-12">
          {[
            ["AI-Powered", "loan risk analysis"],
            ["28 Banks", "eligibility engine"],
            ["Real-time", "financial health score"],
          ].map(([n, l], i) => (
            <motion.div
              key={l}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 + i * 0.08 }}
            >
              <p className="font-display text-base font-semibold text-accent">{n}</p>
              <p className="text-xs text-muted mt-0.5">{l}</p>
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

          <h2 className="font-display text-2xl font-semibold mb-1">Welcome back</h2>
          <p className="text-sm text-muted mb-6">Sign in to your account</p>

          <motion.form
            variants={container}
            initial="hidden"
            animate="show"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
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
                  placeholder="••••••••"
                  autoComplete="current-password"
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
            </motion.div>

            {/* Forgot password */}
            <motion.div variants={item} className="flex justify-end -mt-1">
              <Link
                to="/reset-password"
                className="text-xs text-muted hover:text-accent transition-colors"
              >
                Forgot password?
              </Link>
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium shadow-[0_0_24px_-6px_rgba(37,99,235,0.6)] hover:shadow-[0_0_32px_-4px_rgba(37,99,235,0.8)] hover:bg-primary/90 transition-all disabled:opacity-60"
            >
              {loading
                ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                : <><span>Sign In</span><ArrowRight className="h-4 w-4" /></>
              }
            </motion.button>
          </motion.form>

          <p className="mt-6 text-center text-xs text-muted">
            Don't have an account?{" "}
            <Link to="/register" className="text-accent hover:underline font-medium">
              Create one
            </Link>
          </p>

          {/* Admin hint */}
          <div className="mt-4 rounded-xl bg-white/[0.03] border border-border px-4 py-3 text-xs text-muted/70 text-center">
            Admin: <span className="text-muted">admin@finpulse.app / admin123</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
