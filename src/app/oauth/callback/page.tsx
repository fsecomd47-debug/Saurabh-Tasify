"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setStatus("error");
        setErrorMsg("Sign-in is taking longer than expected. Please try again.");
      }
    }, 20_000);

    async function bridge() {
      try {
        const sessionRes = await fetch("/neon-auth/get-session", {
          credentials: "include",
        });

        if (!sessionRes.ok) {
          throw new Error(`get-session returned ${sessionRes.status}`);
        }

        const sessionData = await sessionRes.json() as {
          session?: { user?: { email?: string; name?: string; id?: string } };
        };

        const user = sessionData?.session?.user;
        if (!user?.email) {
          throw new Error("No user in Neon Auth session");
        }

        const bridgeRes = await fetch("/api/auth/oauth/bridge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
          }),
        });

        if (!bridgeRes.ok) {
          const errData = await bridgeRes.json() as { error?: string };
          throw new Error(errData.error ?? "Bridge failed");
        }

        const { redirect } = (await bridgeRes.json()) as { redirect: string };

        if (!cancelled) {
          router.replace(redirect || "/home");
        }
      } catch (err) {
        console.error("[oauth-callback] Bridge failed:", err);
        if (!cancelled) {
          setStatus("error");
          setErrorMsg("Could not complete Google sign-in. Try email sign-in instead.");
        }
      }
    }

    void bridge();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [router, params]);

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center px-6 text-center" style={{ minHeight: "60%" }}>
        <p className="text-[22px] font-extrabold font-display text-white mb-3">
          SIGN-IN ISSUE
        </p>
        <p className="text-[13.5px] text-slate-400 font-ui leading-relaxed mb-6">
          {errorMsg}
        </p>
        <a href="/login" className="btn-neon">
          BACK TO SIGN IN
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 text-center" style={{ minHeight: "60%" }}>
      <Loader2 className="w-8 h-8 text-violet-300 animate-spin mb-5" />
      <p className="text-[15px] font-bold text-white font-display">
        Completing sign-in…
      </p>
      <p className="text-[12px] text-slate-400 font-ui mt-2">
        Connecting your Google account
      </p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center px-6 text-center" style={{ minHeight: "60%" }}>
        <Loader2 className="w-8 h-8 text-violet-300 animate-spin mb-5" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
