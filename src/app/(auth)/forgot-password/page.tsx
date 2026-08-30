"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { httpClient, ApiRequestError } from "@/types/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email || loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await httpClient.post<{ sent: boolean; devUrl: string | null }>("/api/auth/forgot-password", { email: email.trim() });
      if (res.devUrl) {
        window.sessionStorage.setItem("st_dev_reset_url", res.devUrl);
        setDevUrl(res.devUrl);
      }
      // Neutral success regardless of account existence (spec §46).
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 px-6">
      <header className="pt-8 pb-4">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-white font-ui transition-colors">
          ← Back to sign in
        </Link>
      </header>

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto pb-10">
        {!sent ? (
          <>
            <h1 className="text-[28px] leading-tight font-extrabold font-display">RESET YOUR PASSWORD</h1>
            <p className="mt-2.5 text-[13.5px] text-slate-400 font-ui leading-relaxed">
              Enter your email and we&apos;ll send a secure, single-use reset link.
            </p>
            <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
              <input
                type="email"
                inputMode="email"
                autoFocus
                aria-label="Email"
                className="neon-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {error && (
                <p role="alert" className="text-[12.5px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 font-ui">
                  {error}
                </p>
              )}
              <button type="submit" disabled={!email || loading} className="btn-neon">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "SEND RESET LINK"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-[28px] leading-tight font-extrabold font-display">CHECK YOUR INBOX</h1>
            <p className="mt-3 text-[14px] text-slate-400 font-ui leading-relaxed">
              If an account exists for <span className="font-bold text-white">{email}</span>, a reset link is on its way. It expires in 60 minutes.
            </p>
            {devUrl && (
              <a href={devUrl} className="mt-6 block rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3">
                <p className="text-[10px] font-bold tracking-widest text-violet-300 font-ui">DEV MODE — EMAIL TRANSPORT DISABLED</p>
                <p className="text-[13px] font-bold text-white font-ui mt-0.5">Open reset link →</p>
              </a>
            )}
            <Link href="/login" className="btn-ghost-dark mt-6">
              BACK TO SIGN IN
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
