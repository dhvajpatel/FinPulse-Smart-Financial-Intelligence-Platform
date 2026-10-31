import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import Login         from "../pages/auth/Login";
import Register      from "../pages/auth/Register";
import ResetPassword from "../pages/auth/ResetPassword";

import AppShell   from "../components/layout/AppShell";
import Settings   from "../pages/shared/Settings";

import CustomerDashboard from "../pages/customer/CustomerDashboard";
import DailyEntries      from "../pages/customer/DailyEntries";
import LoanEligibility   from "../pages/customer/LoanEligibility";
import Profile           from "../pages/customer/Profile";

import Finance         from "../pages/employee/Finance";
import Spending        from "../pages/employee/Spending";
import Recommendations from "../pages/employee/Recommendations";

// Admin only
import AdminDashboard from "../pages/admin/Dashboard";
import Analytics      from "../pages/admin/Analytics";
import LoanAnalytics  from "../pages/admin/LoanAnalytics";
import Marketing      from "../pages/admin/Marketing";
import SystemOverview from "../pages/admin/SystemOverview";
import EmployeeCustomers from "../pages/employee/Customers";
import Customer360       from "../pages/employee/Customer360";

// ── Guards ─────────────────────────────────────────────────────────────────────

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user } = useAuth();
  if (!user) return children;
  return <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* ── Public auth pages ──────────────────────────────────────────────── */}
      <Route path="/login"          element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register"       element={<GuestOnly><Register /></GuestOnly>} />
      <Route path="/reset-password" element={<GuestOnly><ResetPassword /></GuestOnly>} />

      {/* ── Customer / user dashboard ──────────────────────────────────────── */}
      <Route
        path="/dashboard"
        element={<RequireAuth><AppShell /></RequireAuth>}
      >
        <Route index                     element={<CustomerDashboard />} />
        <Route path="entries"            element={<DailyEntries />} />
        <Route path="loan-eligibility"   element={<LoanEligibility />} />
        <Route path="spending"           element={<Spending />} />
        <Route path="finance"            element={<Finance />} />
        <Route path="recommendations"    element={<Recommendations />} />
        <Route path="profile"            element={<Profile />} />
        <Route path="settings"           element={<Settings />} />
      </Route>

      {/* ── Admin panel ────────────────────────────────────────────────────── */}
      <Route
        path="/admin"
        element={<RequireAdmin><AppShell /></RequireAdmin>}
      >
        <Route index                   element={<AdminDashboard />} />
        <Route path="customers"        element={<EmployeeCustomers />} />
        <Route path="customers/:id"    element={<Customer360 />} />
        <Route path="analytics"        element={<Analytics />} />
        <Route path="loans"            element={<LoanAnalytics />} />
        <Route path="marketing"        element={<Marketing />} />
        <Route path="models"           element={<SystemOverview />} />
        <Route path="settings"         element={<Settings />} />
      </Route>

      {/* ── Catch-all ──────────────────────────────────────────────────────── */}
      <Route
        path="*"
        element={
          <Navigate
            to={!user ? "/login" : user.role === "admin" ? "/admin" : "/dashboard"}
            replace
          />
        }
      />
    </Routes>
  );
}
