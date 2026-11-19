import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, Users, Trash2, AlertTriangle, X } from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { listCustomers, deleteUser } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const riskStyle = {
  Low:      "bg-success/10 text-success",
  Medium:   "bg-warning/10 text-warning",
  Elevated: "bg-warning/10 text-warning",
  High:     "bg-danger/10 text-danger",
  Unknown:  "bg-white/10 text-muted",
};

// ── Confirm-delete modal ───────────────────────────────────────────────────────
function DeleteModal({ customer, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass rounded-2xl p-6 w-full max-w-sm border border-danger/30 shadow-xl"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-danger/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Delete User Account</h3>
            <p className="text-xs text-muted mt-1">
              This permanently deletes <span className="text-text font-medium">{customer.name}</span> and
              all their entries, loan predictions, and profile data. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-danger/90 hover:bg-danger text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full" />
            ) : (
              <><Trash2 className="h-4 w-4" /> Delete</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Customers() {
  const [search, setSearch]           = useState("");
  const [data, setData]               = useState(null);
  const [error, setError]             = useState(null);
  const [toDelete, setToDelete]       = useState(null);   // customer object
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin  = user?.role === "admin";

  const load = async (term = "") => {
    setError(null);
    try {
      const res = await listCustomers({ search: term || undefined, limit: 50 });
      setData(res);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteUser(toDelete.customer_id);
      setToDelete(null);
      // Remove from local state immediately — no need to refetch
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((c) => c.customer_id !== toDelete.customer_id),
              total: prev.total - 1,
            }
          : prev
      );
    } catch (e) {
      setDeleteError(e?.response?.data?.detail || "Delete failed. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AnimatedPage>
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">
          {isAdmin ? "Admin Control Centre" : "Employee Workspace"}
        </p>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
          <Users className="h-6 w-6 text-accent" /> Registered Users
        </h1>
        <p className="text-sm text-muted mt-1">
          {isAdmin
            ? "Browse, inspect, and manage user accounts."
            : "Browse and inspect user profiles and their financial data."}
        </p>
      </div>

      {/* Search bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); load(search); }}
        className="glass rounded-2xl p-4 flex items-center gap-3 mb-6"
      >
        <Search className="h-4 w-4 text-muted shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className="bg-transparent outline-none text-sm w-full placeholder:text-muted/60"
        />
        <button className="rounded-lg bg-primary px-4 py-2 text-xs font-medium shrink-0 hover:bg-primary/90 transition-all">
          Search
        </button>
      </form>

      {/* Delete error banner */}
      {deleteError && (
        <div className="mb-4 glass rounded-xl p-3 border border-danger/30 flex items-center gap-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{deleteError}</span>
          <button onClick={() => setDeleteError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* List */}
      {error ? (
        <ErrorState onRetry={() => load(search)} />
      ) : !data ? (
        <Loading label="Loading users" />
      ) : data.items.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted">
          {search ? `No users matched "${search}".` : "No users registered yet."}
        </div>
      ) : (
        <div className="glass rounded-2xl divide-y divide-border overflow-hidden">
          {data.items.map((c, i) => (
            <motion.div
              key={c.customer_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2 px-5 py-4 hover:bg-white/[0.03] transition-colors"
            >
              {/* Row — click anywhere except delete button to navigate */}
              <button
                onClick={() => navigate(
                  isAdmin
                    ? `/admin/customers/${c.customer_id}`
                    : `/admin/customers/${c.customer_id}`
                )}
                className="flex-1 flex items-center gap-4 min-w-0 text-left"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold shrink-0">
                  {(c.name ?? "U")[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted truncate">
                    {c.email ?? "—"} · {c.city ?? "—"}
                    {c.credit_score ? ` · Score ${c.credit_score}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${riskStyle[c.risk_band] ?? riskStyle.Unknown}`}>
                    {c.risk_band ?? "—"} Risk
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </div>
              </button>

              {/* Admin-only delete button */}
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); setToDelete(c); setDeleteError(null); }}
                  title={`Delete ${c.name}`}
                  className="ml-2 h-8 w-8 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {data && (
        <p className="text-xs text-muted mt-4">
          Showing {data.items.length} of {data.total} users
        </p>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {toDelete && (
          <DeleteModal
            customer={toDelete}
            onConfirm={handleDelete}
            onCancel={() => { setToDelete(null); setDeleteError(null); }}
            loading={deleteLoading}
          />
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}
