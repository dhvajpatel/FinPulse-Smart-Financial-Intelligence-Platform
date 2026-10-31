import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Users, BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import AnimatedPage from "../../components/common/AnimatedPage";
import StatCard from "../../components/cards/StatCard";
import Loading, { CardSkeleton } from "../../components/common/Loading";
import ErrorState from "../../components/common/ErrorState";
import { getStatistics, getMarketingSegments, getLoanAnalytics } from "../../services/api";

const COLORS = ["#2563EB","#06B6D4","#10B981","#F59E0B","#EF4444"];

export default function AdminDashboard() {
  const [stats,    setStats]    = useState(null);
  const [segments, setSegments] = useState(null);
  const [entryData, setEntryData] = useState(null);
  const [error,    setError]    = useState(null);

  const load = async () => {
    setError(null);
    try {
      const [s, m, l] = await Promise.all([
        getStatistics(),
        getMarketingSegments(),
        getLoanAnalytics(),
      ]);
      setStats(s);
      setSegments(m);
      setEntryData(l);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => { load(); }, []);

  if (error) return (
    <AnimatedPage>
      <div className="mb-6">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">Admin Control Centre</p>
        <h1 className="font-display text-2xl font-semibold">Platform Overview</h1>
      </div>
      <ErrorState onRetry={load} />
    </AnimatedPage>
  );

  return (
    <AnimatedPage>
      <div className="mb-6">
        <p className="text-xs text-muted uppercase tracking-wider mb-1">Admin Control Centre</p>
        <h1 className="font-display text-2xl font-semibold">Platform Overview</h1>
        <p className="text-sm text-muted mt-1">Live statistics across all registered users and their entries.</p>
      </div>

      {/* KPI row */}
      {!stats ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users}       label="Total Users"     value={stats.total_customers ?? 0}  tone="primary" />
          <StatCard icon={BookOpen}    label="Total Entries"   value={stats.total_entries   ?? 0}  tone="accent" />
          <StatCard icon={TrendingUp}  label="Total Income"    value={stats.total_income    ?? 0}  tone="success"
            format={(v) => `₹${(v / 100000).toFixed(1)}L`} />
          <StatCard icon={TrendingDown} label="Total Expenses" value={stats.total_expense   ?? 0}  tone="warning"
            format={(v) => `₹${(v / 100000).toFixed(1)}L`} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Top expense categories */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-sm mb-4">Top Expense Categories (All Users)</h3>
          {!entryData ? <Loading label="Loading" /> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entryData.top_expense_categories ?? []} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="category" tick={{ fill: "#8B95A7", fontSize: 10 }} axisLine={false} tickLine={false}
                    angle={-20} textAnchor="end" height={44} interval={0} />
                  <YAxis tick={{ fill: "#8B95A7", fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "#151D2E", border: "1px solid #1F2937", borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="total" name="Total" fill="#EF4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Income vs Expense vs Savings donut */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-semibold text-sm mb-4">Platform Financial Mix</h3>
          {!entryData || !stats ? <Loading label="Loading" /> : (() => {
            const total = (stats.total_income ?? 0) + (stats.total_expense ?? 0);
            const pieData = [
              { name: "Income",  value: stats.total_income  ?? 0 },
              { name: "Expense", value: stats.total_expense ?? 0 },
              { name: "Savings", value: Math.max(0, (stats.total_income ?? 0) - (stats.total_expense ?? 0)) },
            ].filter((d) => d.value > 0);
            return (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx={75} cy={75} innerRadius={44} outerRadius={68} dataKey="value" strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#151D2E", border: "1px solid #1F2937", borderRadius: 10, fontSize: 12 }}
                      formatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i] }} />
                      <span className="text-xs text-muted">{d.name}</span>
                      <span className="text-xs font-medium ml-auto">₹{(d.value / 100000).toFixed(1)}L</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* User segments */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-display font-semibold text-sm mb-4">User Segments</h3>
        {!segments ? <Loading label="Loading" /> : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              ["High Income Users",    segments.high_value_customers,  "Income > ₹1L/month"],
              ["Good Credit Users",    segments.credit_card_prospects, "Credit score ≥ 700"],
              ["Active Savers",        segments.active_savers,         "Have savings entries"],
            ].map(([label, value, desc]) => (
              <div key={label} className="rounded-xl border border-border bg-white/[0.02] p-4 text-center">
                <p className="font-display text-2xl font-semibold text-accent">{value?.toLocaleString() ?? "—"}</p>
                <p className="text-sm font-medium mt-1">{label}</p>
                <p className="text-xs text-muted mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
