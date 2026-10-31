import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Sidebar   from "./Sidebar";
import Topbar    from "./Topbar";
import MobileNav from "./MobileNav";

const TITLES = {
  // User dashboard routes
  "/dashboard":                  ["My Dashboard",     "Your financial overview"],
  "/dashboard/entries":          ["Daily Entries",    "Log income, expenses & savings"],
  "/dashboard/loan-eligibility": ["Loan & Bank Eligibility", "AI risk + bank offers"],
  "/dashboard/spending":         ["Spending",         "Category insights"],
  "/dashboard/finance":          ["Finance Health",   "Financial health score"],
  "/dashboard/recommendations":  ["Recommendations",  "Product matching"],
  "/dashboard/profile":          ["My Profile",       "Manage your account"],
  "/dashboard/settings":         ["Settings",         "Preferences"],
  // Admin routes
  "/admin":                      ["Admin Overview",         "Platform-wide statistics"],
  "/admin/customers":            ["Users",                    "Directory & search"],
  "/admin/analytics":            ["Analytics",              "User distributions"],
  "/admin/loans":                ["Loan Portfolio",         "Per-user loan approvals & bank data"],
  "/admin/marketing":            ["Marketing Intelligence", "Segments & targeting"],
  "/admin/models":               ["AI Models",              "System status"],
  "/admin/settings":             ["Settings",               "Preferences"],
};

export default function AppShell() {
  const location = useLocation();
  const segments  = location.pathname.split("/").filter(Boolean);
  const twoLevel  = "/" + segments.slice(0, 2).join("/");
  const oneLevel  = "/" + segments.slice(0, 1).join("/");
  const [title, subtitle] =
    TITLES[location.pathname] ?? TITLES[twoLevel] ?? TITLES[oneLevel] ?? ["FinPulse", ""];

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 pb-24 md:pb-6">
          <AnimatePresence mode="wait">
            <div key={location.pathname}>
              <Outlet />
            </div>
          </AnimatePresence>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
