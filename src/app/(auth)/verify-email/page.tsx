"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { httpClient, ApiRequestError } from "@/types/api";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const email = params.get("email") ?? "";

  const [state, setState] = useState<"idle" | "verifying" | "success" | "error">(token ? "verifying" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDevUrl(window.sessionStorage.getItem("st_dev_verify_url"));
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const doVerify = useCallback(async (t: string) => {
    try {
      await httpClient.post("/api/auth/verify-email", { token: t });
      window.sessionStorage.removeItem("st_dev_verify_url");
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof ApiRequestError ? err.message : "Verification failed.");
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void doVerify(token);
  }, [token, doVerify]);

  async function resend() {
    if (cooldown > 0 || resending || !email) return;
    setResending(true);
    try {
      const res = await httpClient.post<{ sent: boolean; devUrl: string | null }>("/api/auth/resend", { email });
      if (res.devUrl) {
        setDevUrl(res.devUrl);
        window.sessionStorage.setItem("st_dev_verify_url", res.devUrl);
      }
      setCooldown(30);
    } catch (err) {
      setErrorMsg(err instanceof ApiRequestError ? err.message : "Could not resend.");
    } finally {
      setResending(false);
    }
  }

  /* ── Success: celebratory reveal ── */
  if (state === "success") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-sm mx-auto w-full">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 220 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-7"
          style={{
            background: "radial-gradient(circle at 35% 30%, rgba(124,92,255,.45), rgba(124,92,255,.12))",
            boxShadow: "0 0 60px rgba(124,92,255,.4)",
          }}
        >
          <CheckCircle2 className="w-10 h-10 text-violet-300" strokeWidth={2} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="text-[11px] font-bold tracking-[0.26em] text-emerald-400/90 mb-3 font-ui">IDENTITY VERIFIED</p>
          <h1 className="text-[28px] leading-tight font-extrabold font-display">
            YOUR PLAYER PROFILE
            <br />
            IS READY TO BUILD.
          </h1>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="w-full max-w-xs mt-9">
          <Link href="/onboarding" className="btn-neon">
            ENTER SAURABHTASK
          </Link>
        </motion.div>
      </div>
    );
  }

  /* ── Token flow in progress / failed ── */
  if (token) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-sm mx-auto w-full">
        {state === "verifying" ? (
          <>
            <Loader2 className="w-9 h-9 text-violet-300 animate-spin mb-5" />
            <h1 className="text-[22px] font-extrabold font-display">Verifying your identity…</h1>
          </>
        ) : (
          <>
            <h1 className="text-[24px] font-extrabold font-display text-red-400 mb-3">Link problem</h1>
            <p className="text-[13.5px] text-slate-400 font-ui leading-relaxed">{errorMsg}</p>
            <Link href={`/verify-email?email=${encodeURIComponent(email)}`} className="btn-neon mt-8">
              REQUEST A NEW LINK
            </Link>
          </>
        )}
      </div>
    );
  }

  /* ── Inbox state ── */
  const masked = email ? `${email.slice(0, 2)}***@${email.split("@")[1] ?? ""}` : "your inbox";
  return (
    <div className="flex-1 flex flex-col justify-center px-6 max-w-sm w-full mx-auto pb-10">
      <MailCheck className="w-12 h-12 text-violet-300 mb-6" strokeWidth={1.6} />
      <h1 className="text-[28px] leading-tight font-extrabold font-display">CHECK YOUR INBOX</h1>
      <p className="mt-3 text-[14px] text-slate-400 font-ui leading-relaxed">
        We sent a verification link to:
        <span className="block mt-1.5 font-bold text-white tabular-nums">{masked}</span>
      </p>

      {devUrl && (
        <a href={devUrl} className="mt-6 block rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-left">
          <p className="text-[10px] font-bold tracking-widest text-violet-300 font-ui">DEV MODE — EMAIL TRANSPORT DISABLED</p>
          <p className="text-[13px] font-bold text-white font-ui mt-0.5">Open verification link →</p>
        </a>
      )}

      <button onClick={() => void resend()} disabled={cooldown > 0 || resending} className="btn-neon mt-8">
        {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : cooldown > 0 ? `RESEND AVAILABLE IN ${cooldown}s` : "RESEND LINK"}
      </button>
      <p className="mt-4 text-center text-[12px] text-slate-500 font-ui">
        Didn&apos;t receive it? Check spam or try again.
      </p>
      {errorMsg && <p className="mt-4 text-center text-[12px] text-red-400 font-ui">{errorMsg}</p>}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
