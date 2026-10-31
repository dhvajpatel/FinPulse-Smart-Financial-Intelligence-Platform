import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Landmark, PieChart,
  User, BarChart3, Users, Megaphone, Cpu,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const userItems = [
  { to: "/dashboard",                   label: "Home",    icon: LayoutDashboard, end: true },
  { to: "/dashboard/entries",           label: "Entries", icon: BookOpen },
  { to: "/dashboard/loan-eligibility",  label: "Loans",   icon: Landmark },
  { to: "/dashboard/spending",          label: "Spending",icon: PieChart },
  { to: "/dashboard/profile",           label: "Profile", icon: User },
];

const adminItems = [
  { to: "/admin",             label: "Overview",   icon: LayoutDashboard, end: true },
  { to: "/admin/customers",   label: "Users",      icon: Users },
  { to: "/admin/analytics",   label: "Analytics",  icon: BarChart3 },
  { to: "/admin/marketing",   label: "Marketing",  icon: Megaphone },
  { to: "/admin/models",      label: "AI",         icon: Cpu },
];

export default function MobileNav() {
  const { user } = useAuth();
  const items = user?.role === "admin" ? adminItems : userItems;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface/90 backdrop-blur-md border-t border-border flex justify-around py-2">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] rounded-lg transition-colors ${
              isActive ? "text-accent" : "text-muted"
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
