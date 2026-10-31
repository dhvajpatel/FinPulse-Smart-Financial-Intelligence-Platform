import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, LogOut, Search, X, CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { listCustomers, getActivity } from "../../services/api";

// ── Helpers ────────────────────────────────────────────────────────────────────
const riskStyle = {
  Low:      "bg-success/10 text-success",
  Medium:   "bg-warning/10 text-warning",
  Elevated: "bg-warning/10 text-warning",
  High:     "bg-danger/10 text-danger",
  Unknown:  "bg-white/10 text-muted",
};

/** Format ISO timestamp to relative time string, e.g. "2m ago", "3h ago", "2d ago" */
function relativeTime(iso) {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso.replace(" ", "T") + (iso.includes("T") ? "" : "Z")).getTime();
    if (isNaN(diff)) return iso.slice(0, 10);
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)   return "just now";
    if (mins  < 60)  return `${mins}m ago`;
    if (hours < 24)  return `${hours}h ago`;
    if (days  < 30)  return `${days}d ago`;
    return iso.slice(0, 10);
  } catch { return ""; }
}

// LocalStorage key to persist read state
const READ_KEY = "finpulse_read_notifs";
function loadRead()    { try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]")); } catch { return new Set(); } }
function saveRead(set) { localStorage.setItem(READ_KEY, JSON.stringify([...set])); }

export default function Topbar({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ── Notifications ────────────────────────────────────────────────────────
  const [notifOpen, setNotifOpen]   = useState(false);
  const [events,    setEvents]      = useState([]);
  const [readIds,   setReadIds]     = useState(loadRead);
  const [notifLoading, setNotifLoading] = useState(false);
  const bellRef  = useRef(null);
  const panelRef = useRef(null);

  const fetchActivity = useCallback(async () => {
    if (!user?.customer_id || user.role === "admin") return;
    setNotifLoading(true);
    try {
      const res = await getActivity(user.customer_id, 15);
      setEvents(res.events ?? []);
    } catch { /* silent */ }
    finally  { setNotifLoading(false); }
  }, [user?.customer_id, user?.role]);

  // Fetch on mount, then every 90 seconds
  useEffect(() => {
    fetchActivity();
    const t = setInterval(fetchActivity, 90000);
    return () => clearInterval(t);
  }, [fetchActivity]);

  // Admin gets static platform events
  const adminEvents = user?.role === "admin" ? [
    { id: "admin_1", title: "🔐 Admin session active", body: "You are logged in as platform administrator.", time: new Date().toISOString(), read: false },
    { id: "admin_2", title: "📊 Analytics live",       body: "All user analytics are computed in real-time from daily entries.", time: "", read: true },
    { id: "admin_3", title: "🤖 AI models ready",      body: "Loan risk model (GBR + MLP ensemble) is loaded and serving.", time: "", read: true },
  ] : [];

  const displayEvents = user?.role === "admin" ? adminEvents : events;
  const unread = displayEvents.filter((e) => !readIds.has(e.id) && !e.read).length;

  const markAllRead = () => {
    const next = new Set([...readIds, ...displayEvents.map((e) => e.id)]);
    setReadIds(next);
    saveRead(next);
  };

  const markRead = (id) => {
    const next = new Set([...readIds, id]);
    setReadIds(next);
    saveRead(next);
  };

  const dismissEvent = (id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    markRead(id);
  };

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current  && !bellRef.current.contains(e.target)
      ) setNotifOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // ── Global search (admin only) ────────────────────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const searchRef      = useRef(null);
  const searchPanelRef = useRef(null);
  const debounceRef    = useRef(null);

  useEffect(() => {
    function onMouseDown(e) {
      if (
        searchPanelRef.current && !searchPanelRef.current.contains(e.target) &&
        searchRef.current      && !searchRef.current.contains(e.target)
      ) setSearchOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") clearSearch(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const doSearch = useCallback((term) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!term.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await listCustomers({ search: term, limit: 6 });
        setSearchResults(res.items ?? []);
        setSearchOpen(true);
      } catch { setSearchResults([]); }
      finally  { setSearchLoading(false); }
    }, 280);
  }, []);

  const handleSearchChange = (e) => { setSearchQuery(e.target.value); doSearch(e.target.value); };
  const goToUser  = (id) => { navigate(`/admin/customers/${id}`); clearSearch(); };
  const clearSearch = () => { setSearchQuery(""); setSearchResults([]); setSearchOpen(false); };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length === 1) goToUser(searchResults[0].customer_id);
    else if (searchQuery.trim()) { navigate("/admin/customers", { state: { search: searchQuery.trim() } }); clearSearch(); }
  };

  return (
    <header className="h-16 border-b border-border bg-surface/40 backdrop-blur-md flex items-center justify-between px-6 gap-4 sticky top-0 z-20">
      <div className="min-w-0">
        <h1 className="font-display font-semibold text-[15px] leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2.5">

        {/* ── Admin global search ────────────────────────────────────────── */}
        {user?.role === "admin" && (
          <div className="relative hidden lg:block" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 w-64 transition-all duration-200 ${
                searchOpen || searchQuery
                  ? "border-primary/50 bg-white/[0.08] shadow-lg shadow-primary/5"
                  : "border-border bg-white/5 hover:border-primary/40"
              }`}>
                <Search className="h-4 w-4 text-muted shrink-0" />
                <input
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery && setSearchOpen(true)}
                  placeholder="Search users…"
                  className="bg-transparent outline-none text-xs text-text placeholder:text-muted/60 w-full"
                />
                {searchQuery && (
                  <button type="button" onClick={clearSearch} className="text-muted/50 hover:text-danger">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </form>

            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  ref={searchPanelRef}
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-11 w-80 rounded-2xl shadow-2xl border border-border overflow-hidden z-50"
                  style={{ background: "#111827" }}
                >
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted">
                      <div className="h-4 w-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      <span className="text-xs">Searching…</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted">
                      No users found for "<span className="text-text">{searchQuery}</span>"
                    </div>
                  ) : (
                    <div>
                      <div className="px-4 py-2 border-b border-border/50">
                        <p className="text-[10px] text-muted uppercase tracking-wider font-medium">
                          {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {searchResults.map((c) => (
                        <button
                          key={c.customer_id}
                          onClick={() => goToUser(c.customer_id)}
                          className="w-full flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-white/[0.04] transition-colors text-left"
                        >
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-semibold shrink-0">
                            {(c.name ?? "U")[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted truncate">{c.email ?? c.customer_id} · {c.city ?? "—"}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${riskStyle[c.risk_band] ?? riskStyle.Unknown}`}>
                              {c.risk_band}
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 text-muted" />
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={() => { navigate("/admin/customers", { state: { search: searchQuery } }); clearSearch(); }}
                        className="w-full px-4 py-2.5 text-xs text-primary hover:bg-primary/5 transition-colors text-center border-t border-border/50"
                      >
                        View all results →
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Notification bell ─────────────────────────────────────────── */}
        <div className="relative">
          <button
            ref={bellRef}
            onClick={() => { setNotifOpen((v) => !v); if (!notifOpen) markAllRead(); }}
            className="relative h-9 w-9 rounded-lg border border-border bg-white/5 flex items-center justify-center hover:bg-white/10 hover:border-primary/30 active:scale-95 transition-all duration-200"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-danger flex items-center justify-center text-[10px] font-bold">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-11 w-80 rounded-2xl shadow-2xl border border-border overflow-hidden z-50"
                style={{ background: "#111827" }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Activity</p>
                  <div className="flex items-center gap-2">
                    {!notifLoading && user?.role !== "admin" && (
                      <button
                        onClick={fetchActivity}
                        className="text-muted hover:text-accent transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs text-primary hover:text-accent transition-colors">
                        Mark all read
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-muted">
                      <div className="h-4 w-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      <span className="text-xs">Loading activity…</span>
                    </div>
                  ) : displayEvents.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                      <p className="text-xs">No activity yet.</p>
                      <p className="text-[10px] text-muted/60">Add daily entries to see your feed.</p>
                    </div>
                  ) : (
                    displayEvents.map((ev) => {
                      const isRead = readIds.has(ev.id) || ev.read;
                      return (
                        <div
                          key={ev.id}
                          onClick={() => markRead(ev.id)}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-border/40 last:border-0 cursor-default transition-colors hover:bg-white/[0.03] ${
                            !isRead ? "bg-primary/[0.04]" : ""
                          }`}
                        >
                          <div className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                            !isRead ? "bg-primary" : "bg-muted/25"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-snug">{ev.title}</p>
                            <p className="text-xs text-muted mt-0.5 leading-relaxed line-clamp-2">{ev.body}</p>
                            {ev.time && (
                              <p className="text-[10px] text-muted/50 mt-1">{relativeTime(ev.time)}</p>
                            )}
                          </div>
                          {user?.role !== "admin" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); dismissEvent(ev.id); }}
                              className="text-muted/40 hover:text-danger transition-colors mt-0.5 shrink-0"
                              title="Dismiss"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── User chip ─────────────────────────────────────────────────── */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="text-xs leading-tight">
            <p className="font-medium truncate max-w-[100px]">{user?.name}</p>
            <p className="text-muted capitalize">{user?.role}</p>
          </div>
        </div>

        {/* ── Sign out ─────────────────────────────────────────────────── */}
        <button
          onClick={logout}
          className="h-9 w-9 rounded-lg border border-border bg-white/5 flex items-center justify-center hover:bg-danger/10 hover:text-danger hover:border-danger/30 active:scale-95 transition-all duration-200"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
