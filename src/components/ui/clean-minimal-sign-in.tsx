"use client";

import * as React from "react";
import { useState } from "react";
import { LogIn, Lock, Mail, Loader2 } from "lucide-react";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif';

interface AuthFormProps {
  mode: "signin" | "signup";
  onSubmit: (email: string, password: string) => void;
  onSwitchMode: () => void;
  onForgotPassword?: () => void;
  onGoogleAuth?: () => void;
  error?: string | null;
  loading?: boolean;
}

const CleanMinimalSignIn: React.FC<AuthFormProps> = ({
  mode,
  onSubmit,
  onSwitchMode,
  onForgotPassword,
  onGoogleAuth,
  error,
  loading = false,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = () => {
    if (!email || !password) {
      setLocalError("Please enter both email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setLocalError("Please enter a valid email address.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setLocalError("Password must be at least 8 characters.");
      return;
    }
    setLocalError("");
    onSubmit(email, password);
  };

  const displayError = error || localError;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 414,
        margin: "0 auto",
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        paddingBottom: "calc(env(safe-area-inset-bottom, 20px) + 24px)",
        boxSizing: "border-box",
        fontFamily: SF,
      }}
    >
      {/* Glass Form Card */}
      <div
        className="w-full flex flex-col items-center"
        style={{
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "0.5px solid rgba(255, 255, 255, 0.6)",
          borderRadius: 24,
          padding: "32px 20px",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: "#FFFFFF",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            marginBottom: 24,
          }}
        >
          <LogIn className="w-7 h-7 text-gray-800" />
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 22, fontWeight: 600, color: "#1C1C1E", textAlign: "center", marginBottom: 6, fontFamily: SF, width: "100%" }}>
          {mode === "signin" ? "Welcome Back" : "Spawn Your Profile"}
        </h2>
        <p style={{ fontSize: 14, color: "#8E8E93", textAlign: "center", marginBottom: 24, fontFamily: SF, lineHeight: 1.4, width: "100%" }}>
          {mode === "signin"
            ? "Sign in to continue your journey."
            : "Step into SaurabhTask. Every completed quest pays out."}
        </p>

        {/* Fields */}
        <div className="w-full flex flex-col gap-3" style={{ marginBottom: 8 }}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{
                width: "100%",
                paddingLeft: 40,
                paddingRight: 12,
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 12,
                border: "1px solid #E5E5EA",
                background: "#F9F9F9",
                fontSize: 15,
                color: "#1C1C1E",
                fontFamily: SF,
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#5E5CE6";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(94,92,230,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5E5EA";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{
                width: "100%",
                paddingLeft: 40,
                paddingRight: 12,
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 12,
                border: "1px solid #E5E5EA",
                background: "#F9F9F9",
                fontSize: 15,
                color: "#1C1C1E",
                fontFamily: SF,
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#5E5CE6";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(94,92,230,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#E5E5EA";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
          <div className="w-full flex justify-between items-center" style={{ minHeight: 20 }}>
            {displayError && (
              <div style={{ fontSize: 13, color: "#FF3B30" }}>{displayError}</div>
            )}
            {mode === "signin" && onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="ml-auto"
                style={{ fontSize: 12, fontWeight: 500, color: "#5E5CE6", fontFamily: SF, background: "none", border: "none", cursor: "pointer" }}
              >
                Forgot password?
              </button>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2"
          style={{
            padding: "10px 0",
            borderRadius: 12,
            background: "linear-gradient(180deg, #2C2C2E 0%, #1C1C1E 100%)",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: SF,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            transition: "opacity 0.2s, transform 0.15s",
            marginBottom: 16,
            marginTop: 8,
          }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            mode === "signin" ? "Sign In" : "Create Account"
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center w-full" style={{ margin: "4px 0 16px" }}>
          <div className="flex-grow" style={{ borderTop: "1px dashed #E5E5EA" }} />
          <span style={{ margin: "0 8px", fontSize: 12, color: "#C7C7CC", fontFamily: SF }}>Or sign in with</span>
          <div className="flex-grow" style={{ borderTop: "1px dashed #E5E5EA" }} />
        </div>

        {/* Social buttons */}
        <div className="flex gap-3 w-full justify-center">
          {onGoogleAuth && (
            <button
              onClick={onGoogleAuth}
              className="flex items-center justify-center grow"
              style={{
                height: 48,
                borderRadius: 12,
                border: "1px solid #E5E5EA",
                background: "#FFFFFF",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                style={{ width: 22, height: 22 }}
              />
            </button>
          )}
          <button
            className="flex items-center justify-center grow"
            style={{
              height: 48,
              borderRadius: 12,
              border: "1px solid #E5E5EA",
              background: "#FFFFFF",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <img
              src="https://www.svgrepo.com/show/448224/facebook.svg"
              alt="Facebook"
              style={{ width: 22, height: 22 }}
            />
          </button>
          <button
            className="flex items-center justify-center grow"
            style={{
              height: 48,
              borderRadius: 12,
              border: "1px solid #E5E5EA",
              background: "#FFFFFF",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <img
              src="https://www.svgrepo.com/show/511330/apple-173.svg"
              alt="Apple"
              style={{ width: 22, height: 22 }}
            />
          </button>
        </div>

        {/* Switch mode */}
        <p style={{ marginTop: 20, fontSize: 14, color: "#8E8E93", fontFamily: SF, textAlign: "center" }}>
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={onSwitchMode}
                style={{ fontWeight: 600, color: "#5E5CE6", fontFamily: SF, background: "none", border: "none", cursor: "pointer" }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={onSwitchMode}
                style={{ fontWeight: 600, color: "#5E5CE6", fontFamily: SF, background: "none", border: "none", cursor: "pointer" }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export { CleanMinimalSignIn };
export type { AuthFormProps };
