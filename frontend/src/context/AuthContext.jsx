import { createContext, useContext, useState, useCallback } from "react";
import { loginUser, registerUser, resetPassword as apiResetPassword } from "../services/api";

const AuthContext = createContext(null);
const STORAGE_KEY = "finpulse_session";

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSession);

  // ── Login with email + password ─────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      const data = await loginUser({ email, password });
      // data: { access_token, token_type, customer_id, name, email, is_admin }
      const session = {
        token:       data.access_token,
        role:        data.is_admin ? "admin" : "customer",
        name:        data.name,
        email:       data.email,
        customer_id: data.customer_id,
      };
      saveSession(session);
      setUser(session);
      return { ok: true, session };
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Incorrect email or password.";
      return { ok: false, message: msg };
    }
  }, []);

  // ── Register new account ────────────────────────────────────────────────────
  const register = useCallback(async (name, email, password) => {
    try {
      const data = await registerUser({ name, email, password });
      const session = {
        token:       data.access_token,
        role:        data.is_admin ? "admin" : "customer",
        name:        data.name,
        email:       data.email,
        customer_id: data.customer_id,
      };
      saveSession(session);
      setUser(session);
      return { ok: true, session };
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Registration failed. Please try again.";
      return { ok: false, message: msg };
    }
  }, []);

  // ── Reset password ──────────────────────────────────────────────────────────
  const resetPasswordFn = useCallback(async (email, newPassword) => {
    try {
      const data = await apiResetPassword({ email, new_password: newPassword });
      return { ok: true, message: data.message };
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Unable to reset password. Please try again.";
      return { ok: false, message: msg };
    }
  }, []);

  // ── Refresh session fields after profile update ─────────────────────────────
  const refreshSession = useCallback((updatedFields = {}) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updatedFields };
      saveSession(next);
      return next;
    });
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, register, resetPassword: resetPasswordFn, logout, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
