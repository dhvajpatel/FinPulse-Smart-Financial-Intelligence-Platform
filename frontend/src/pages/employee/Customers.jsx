import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ChevronRight, Users } from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { listCustomers } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const riskStyle = {
  Low:      "bg-success/10 text-success",
  Medium:   "bg-warning/10 text-warning",
  Elevated: "bg-warning/10 text-warning",
  High:     "bg-danger/10 text-danger",
  Unknown:  "bg-white/10 text-muted",
};

export default function Customers() {
  const [search, setSearch] = useState("");
  const [data, setData]     = useState(null);
  const [error, setError]   = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const load = async (term = "") => {
    setError(null);
    try {
      const res = await listCustomers({ search: term || undefined, limit: 30 });
      setData(res);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <AnimatedPage>
      <div className="mb-6">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">Admin Control Centre</p>
        <h1 className="font-display text-2xl font-semibold flex items-center gap-2">
          <Users className="h-6 w-6 text-accent" /> Registered Users
        </h1>
        <p className="text-sm text-muted mt-1">Browse and inspect user profiles and their financial data.</p>
      </div>

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

      {error ? (
        <ErrorState onRetry={() => load(search)} />
      ) : !data ? (
        <Loading label="Loading users" />
      ) : data.items.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted">
          No users matched "{search}".
        </div>
      ) : (
        <div className="glass rounded-2xl divide-y divide-border overflow-hidden">
          {data.items.map((c, i) => (
            <motion.button
              key={c.customer_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/admin/customers/${c.customer_id}`)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors text-left"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold shrink-0">
                  {(c.name ?? "U")[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted truncate">
                    {c.email ?? "—"} · {c.city ?? "—"}
                    {c.credit_score ? ` · Score ${c.credit_score}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full ${riskStyle[c.risk_band] ?? riskStyle.Unknown}`}>
                  {c.risk_band ?? "—"} Risk
                </span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {data && (
        <p className="text-xs text-muted mt-4">
          Showing {data.items.length} of {data.total} users
        </p>
      )}
    </AnimatedPage>
  );
}
