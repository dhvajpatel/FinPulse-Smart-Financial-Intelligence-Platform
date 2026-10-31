import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const item = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};
const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export default function ResetPassword() {
  const { resetPassword } = useAuth();

  const [email,    setEmail]    = useState("");
  const [newPw,    setNewPw]    = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim())  return setError("Please enter your email address.");
    if (newPw.length < 6) return setError("New password must be at least 6 characters.");
    if (newPw !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    const result = await resetPassword(email.trim(), newPw);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(result.message || "Password updated. You can now sign in.");
    setEmail(""); setNewPw(""); setConfirm("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg relative overflow-hidden px-6">
      {/* ambient blobs */}
      <motion.div
        className="pointer-events-none absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-primary/15 blur-[120px]"
        animate={{ x: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-8rem] right-[-4rem] h-[26rem] w-[26rem] rounded-full bg-accent/15 blur-[120px]"
        animate={{ x: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass w-full max-w-sm rounded-3xl p-8 relative z-10"
      >
        {/* brand */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="font-display font-semibold">FinPulse</span>
        </div>

        <h2 className="font-display text-2xl font-semibold mb-1">Reset password</h2>
        <p className="text-sm text-muted mb-6">Enter your email and choose a new password.</p>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="text-sm font-medium">{success}</p>
            <Link
              to="/login"
              className="mt-2 text-sm text-accent hover:underline font-medium"
            >
              Back to sign in →
            </Link>
          </motion.div>
        ) : (
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

            {/* New password */}
            <motion.div variants={item}>
              <label className="text-xs text-muted mb-1.5 block">New Password</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white/[0.03] px-3.5 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <Lock className="h-4 w-4 text-muted shrink-0" />
                <input
                  type={showPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
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
            </motion.div>

            {/* Confirm */}
            <motion.div variants={item}>
              <label className="text-xs text-muted mb-1.5 block">Confirm New Password</label>
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
                : <><span>Reset Password</span><ArrowRight className="h-4 w-4" /></>
              }
            </motion.button>
          </motion.form>
        )}

        {!success && (
          <p className="mt-6 text-center text-xs text-muted">
            Remember it?{" "}
            <Link to="/login" className="text-accent hover:underline font-medium">
              Back to sign in
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
