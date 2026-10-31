import { useEffect, useState } from "react";
import AnimatedPage from "../../components/common/AnimatedPage";
import Loading from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { getMarketingSegments, getMarketingProspects } from "../../services/api";

const SEGMENTS = [
  { key: "high_value", label: "High Income",     desc: "Monthly income > ₹1L" },
  { key: "credit_card",label: "Good Credit",     desc: "Credit score ≥ 700" },
  { key: "savers",     label: "Active Savers",   desc: "Have savings entries" },
];

export default function Marketing() {
  const [segments,  setSegments]  = useState(null);
  const [segment,   setSegment]   = useState("high_value");
  const [prospects, setProspects] = useState(null);
  const [error,     setError]     = useState(null);

  const loadSummary = async () => {
    try { setSegments(await getMarketingSegments()); }
    catch (e) { setError(e); }
  };

  const loadProspects = async (seg) => {
    setProspects(null); setError(null);
    try { setProspects(await getMarketingProspects({ segment: seg, limit: 25 })); }
    catch (e) { setError(e); }
  };

  useEffect(() => { loadSummary(); }, []);
  useEffect(() => { loadProspects(segment); }, [segment]);

  const segCount = (key) => {
    if (!segments) return "—";
    if (key === "high_value")  return segments.high_value_customers?.toLocaleString();
    if (key === "credit_card") return segments.credit_card_prospects?.toLocaleString();
    if (key === "savers")      return segments.active_savers?.toLocaleString();
    return "—";
  };

  return (
    <AnimatedPage>
      <div className="mb-6">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">Admin Control Centre</p>
        <h1 className="font-display text-2xl font-semibold">User Segments & Recommendations</h1>
        <p className="text-sm text-muted mt-1">AI-ranked product recommendations for targeting user segments.</p>
      </div>

      {/* Segment selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {SEGMENTS.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => setSegment(key)}
            className={`glass rounded-2xl p-5 text-left transition-all ${
              segment === key ? "ring-1 ring-primary/50 bg-primary/5" : "hover:bg-white/[0.03]"
            }`}
          >
            <p className="font-display text-2xl font-semibold text-accent">{segCount(key)}</p>
            <p className="text-sm font-medium mt-1">{label}</p>
            <p className="text-xs text-muted mt-0.5">{desc}</p>
          </button>
        ))}
      </div>

      {/* Prospects table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display font-semibold text-sm">AI Product Recommendations</h3>
        </div>

        {error ? (
          <div className="p-6"><ErrorState onRetry={() => loadProspects(segment)} /></div>
        ) : !prospects ? (
          <div className="p-6"><Loading label="Loading users" /></div>
        ) : prospects.prospects.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">No users in this segment yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted uppercase tracking-wide text-left border-b border-border">
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">City</th>
                <th className="px-6 py-3 font-medium">Credit Score</th>
                <th className="px-6 py-3 font-medium">Recommended Product</th>
                <th className="px-6 py-3 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {prospects.prospects.map((p) => (
                <tr key={p.customer_id} className="border-t border-border hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold shrink-0">
                        {(p.name ?? "U")[0]}
                      </div>
                      <p className="font-medium">{p.name ?? "—"}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-muted">{p.city ?? "—"}</td>
                  <td className="px-6 py-3 text-muted">{p.credit_score ?? "—"}</td>
                  <td className="px-6 py-3">{p.recommended_product ?? "—"}</td>
                  <td className="px-6 py-3">
                    {p.confidence != null ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
                        {p.confidence}%
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AnimatedPage>
  );
}
