"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

/* ───────────────────── Types ───────────────────── */

type User = {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  isBot: boolean;
  createdAt: string;
  updatedAt: string;
};

type Profile = {
  userId: string;
  displayName: string;
  avatarId: string;
  timezone: string;
  locale: string;
  goalItemId: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuthState = {
  user: User | null;
  profile: Profile | null;
  onboardingCompleted: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; emailVerified?: boolean }>;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setOnboardingCompleted: () => void;
};

/* ───────────────────── Context ───────────────────── */

const AuthContext = createContext<AuthContextValue | null>(null);

/* ───────────────────── Provider ───────────────────── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    onboardingCompleted: false,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check session on mount
  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const json = await res.json();

      if (json.data) {
        setState({
          user: json.data.user,
          profile: json.data.profile,
          onboardingCompleted: json.data.onboardingCompleted,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({
          user: null,
          profile: null,
          onboardingCompleted: false,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch {
      setState({
        user: null,
        profile: null,
        onboardingCompleted: false,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        return { success: false, error: json.error?.message || "Login failed" };
      }

      // Session cookie is set by the API, now fetch session
      await refreshSession();
      return { success: true, emailVerified: json.data?.emailVerified };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  }, [refreshSession]);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        return { success: false, error: json.error?.message || "Registration failed" };
      }

      return { success: true };
    } catch {
      return { success: false, error: "Network error. Please try again." };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setState({
        user: null,
        profile: null,
        onboardingCompleted: false,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const setOnboardingCompleted = useCallback(() => {
    setState((prev) => ({ ...prev, onboardingCompleted: true }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshSession,
        setOnboardingCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ───────────────────── Hook ───────────────────── */

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
