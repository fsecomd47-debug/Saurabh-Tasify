"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ChevronRight } from "lucide-react";
import { httpClient, ApiRequestError } from "@/types/api";

const FRIENDLY: Record<string, string> = {
  INVALID_CREDENTIALS: "Incorrect email or password.",
  RATE_LIMITED: "Too many attempts. Take a breath and try again shortly.",
  NETWORK_FAILURE: "You appear to be offline. Check your connection.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") ?? "/home";
  const oauthError = params.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    oauthError ? "Google sign-in is unavailable. Try email sign-in instead." : null
  );

  const canSubmit = email.length > 0 && password.length > 0 && !loading;

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await httpClient.post("/api/auth/login", { email: email.trim(), password });
      router.replace(nextPath.startsWith("/") ? nextPath : "/home");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(FRIENDLY[err.code] ?? err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    window.location.href = "/api/auth/oauth/google/start";
  }

  return (
    <div className="flex flex-col flex-1 px-6">
      <header className="pt-8 pb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-white font-ui transition-colors">
          <span className="text-lg leading-none">&larr;</span> Back
        </Link>
      </header>

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto pb-10">
        <h1 className="text-[30px] leading-tight font-extrabold font-display">
          WELCOME BACK
        </h1>
        <p className="mt-2 text-[13.5px] text-slate-400 font-ui">Continue your journey.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <label htmlFor="login-email" className="ios-glass-label">Email</label>
            <div className="ios-glass-form-group">
              <input
                id="login-email"
                type="email"
                inputMode="email"
                autoFocus
                className="ios-glass-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label htmlFor="login-password" className="ios-glass-label">Password</label>
            <div className="ios-glass-form-group">
              <div className="ios-glass-input-wrapper">
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  className="ios-glass-input"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="ios-glass-input-reveal"
                  style={{ cursor: "pointer" }}
                >
                  {showPw ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>
            <div className="text-right mt-2">
              <Link href="/forgot-password" className="text-[12px] font-semibold text-violet-300/90 hover:text-white font-ui transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-[12.5px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 font-ui">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full min-h-[56px] rounded-[14px] font-bold text-[15px] font-ui flex items-center justify-center gap-2 transition-all duration-150 mt-6"
            style={{
              background: canSubmit ? "linear-gradient(135deg, #7C5CFF 0%, #9A7CFF 100%)" : "rgba(124,92,255,0.3)",
              color: "#fff",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.5,
              boxShadow: canSubmit ? "0 10px 26px -6px rgba(124,92,255,0.45)" : "none",
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "SIGN IN"}
            {!loading && <ChevronRight className="w-4 h-4" strokeWidth={2.5} />}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6" aria-hidden="true">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[11px] tracking-widest text-slate-500 font-ui">OR</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full min-h-[56px] rounded-[14px] font-semibold text-[15px] font-ui flex items-center justify-center gap-2.5 transition-all duration-150"
          style={{
            cursor: "pointer",
            color: "#D9D4E8",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-[13px] text-slate-400 font-ui">
          New to SaurabhTask?{" "}
          <Link href="/signup" className="font-bold text-violet-300 hover:text-violet-200 transition-colors">
            Create a player
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
