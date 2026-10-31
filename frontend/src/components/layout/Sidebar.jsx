import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Wallet, PieChart, Landmark, Sparkles,
  Settings, Building2, BarChart3, Megaphone, Cpu, TrendingUp,
  BookOpen, User, Users,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// ── Nav definitions ───────────────────────────────────────────────────────────

const userNav = [
  { to: "/dashboard",                   label: "My Dashboard",     icon: LayoutDashboard, end: true },
  { to: "/dashboard/entries",           label: "Daily Entries",    icon: BookOpen },
  { to: "/dashboard/loan-eligibility",  label: "Loan & Banks",     icon: Landmark },
  { to: "/dashboard/spending",          label: "Spending",         icon: PieChart },
  { to: "/dashboard/finance",           label: "Finance Health",   icon: Wallet },
  { to: "/dashboard/recommendations",   label: "Recommendations",  icon: Sparkles },
  { to: "/dashboard/profile",           label: "My Profile",       icon: User },
];

const adminNav = [
  { to: "/admin",             label: "Admin Overview",         icon: Building2, end: true },
  { to: "/admin/customers",   label: "Users",              icon: Users },
  { to: "/admin/analytics",   label: "Analytics",              icon: BarChart3 },
  { to: "/admin/loans",       label: "Loan Portfolio",         icon: TrendingUp },
  { to: "/admin/marketing",   label: "Marketing Intelligence", icon: Megaphone },
  { to: "/admin/models",      label: "AI Models",              icon: Cpu },
];

export default function Sidebar() {
  const { user } = useAuth();
  const items    = user?.role === "admin" ? adminNav : userNav;
  const settingsTo = user?.role === "admin" ? "/admin/settings" : "/dashboard/settings";

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-border bg-surface/60 backdrop-blur-md">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-border">
        <img
          src="/smart bank ai icon.png"
          alt="FinPulse"
          className="h-8 w-8 rounded-lg object-cover shrink-0"
        />
        <div className="min-w-0">
          <span className="font-display font-semibold tracking-tight text-[15px] block truncate">
            FinPulse
          </span>
          {user?.name && (
            <span className="text-[10px] text-muted truncate block">{user.name}</span>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? "bg-primary/15 text-text border border-primary/30"
                  : "text-muted hover:text-text hover:bg-white/5 border border-transparent"
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Settings footer */}
      <div className="px-3 pb-5">
        <NavLink
          to={settingsTo}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
              isActive ? "text-text bg-white/5" : "text-muted hover:text-text hover:bg-white/5"
            }`
          }
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
