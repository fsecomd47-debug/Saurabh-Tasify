"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { httpClient, ApiRequestError } from "@/types/api";
import { PasswordField } from "@/components/auth/PasswordField";

function ResetInner() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!token || password.length < 8 || loading) return;
    setError(null);
    setLoading(true);
    try {
      await httpClient.post("/api/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => router.replace("/login"), 1800);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 px-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto pb-10">
        {!done ? (
          <>
            <h1 className="text-[28px] leading-tight font-extrabold font-display">NEW PASSWORD</h1>
            <p className="mt-2.5 text-[13.5px] text-slate-400 font-ui leading-relaxed">
              Choose something strong. All existing sessions will be signed out.
            </p>
            {!token ? (
              <>
                <p className="mt-6 text-[13px] text-red-400 font-ui">This link is missing its reset token.</p>
                <Link href="/forgot-password" className="btn-neon mt-6">REQUEST A NEW LINK</Link>
              </>
            ) : (
              <form
                className="mt-8 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <PasswordField value={password} onChange={setPassword} autoFocus onSubmitEditing={() => void submit()} />
                {error && (
                  <p role="alert" className="text-[12.5px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 font-ui">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={password.length < 8 || loading} className="btn-neon">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "UPDATE PASSWORD"}
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="text-center">
            <h1 className="text-[26px] font-extrabold font-display text-emerald-400">PASSWORD UPDATED</h1>
            <p className="mt-3 text-[13.5px] text-slate-400 font-ui">Redirecting you to sign in…</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
