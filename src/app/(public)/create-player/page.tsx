"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import { useGuestStore } from "@/store/guest-store";
import { ProfileCard } from "@/components/ui/profile-card-1";
import { authClient } from "@/lib/auth/client";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif';

type AuthMode = "display-name" | "auth" | "reveal";

export default function CreatePlayerPage() {
  const router = useRouter();
  const guest = useGuestStore();
  const setDisplayName = useGuestStore(s => s.setDisplayName);
  const [mode, setMode] = useState<AuthMode>("display-name");
  const [displayName, setDisplayNameLocal] = useState(guest.displayName || "");

  return (
    <div style={{
      background: "#F2F2F7",
      minHeight: "calc(100dvh - 62px)",
      height: "100%",
      marginBottom: -120,
      paddingBottom: 120,
      width: "100%",
    }}>
      <div style={{ width: "100%", overflow: "visible" }}>
        <AnimatePresence mode="wait">
          {mode === "display-name" && (
            <DisplayNameStep
              key="display-name"
              displayName={displayName}
              setDisplayName={setDisplayNameLocal}
              onNext={() => {
                setDisplayName(displayName);
                setMode("auth");
              }}
            />
          )}
          {mode === "auth" && (
            <AuthStep
              key="auth"
              displayName={displayName}
              avatarId={guest.avatarId}
              onBack={() => setMode("display-name")}
              onSuccess={() => setMode("reveal")}
            />
          )}
          {mode === "reveal" && (
            <RevealStep
              key="reveal"
              displayName={displayName || "Player"}
              avatarId={guest.avatarId}
              goal={guest.selectedGoal}
              playstyle={guest.selectedPlaystyle}
              onContinue={() => router.push("/home")}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DISPLAY NAME
   ═══════════════════════════════════════════════════════════ */

type NameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

function DisplayNameStep({
  displayName,
  setDisplayName,
  onNext,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  onNext: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [nameStatus, setNameStatus] = useState<NameStatus>("idle");
  const [takenName, setTakenName] = useState("");
  const guest = useGuestStore();
  const avatarId = guest.avatarId;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced username availability check
  const checkAvailability = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameStatus(trimmed.length === 0 ? "idle" : "invalid");
      setTakenName("");
      return;
    }
    if (trimmed.length > 24) {
      setNameStatus("invalid");
      setTakenName("");
      return;
    }
    if (!/^[\p{L}\p{N} _.-]+$/u.test(trimmed)) {
      setNameStatus("invalid");
      setTakenName("");
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setNameStatus("checking");

    try {
      const res = await fetch(
        `/api/check-username?name=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal }
      );
      const json = await res.json();
      const data = json.data ?? json;

      if (data.available) {
        setNameStatus("available");
        setTakenName("");
      } else {
        setNameStatus("taken");
        setTakenName(data.takenBy ?? trimmed);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        // Network error — fail open (allow继续)
        setNameStatus("available");
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDisplayName(val);
    setTyping(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setTyping(false), 600);

    // Debounce availability check by 500ms
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      checkAvailability(val);
    }, 500);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      timeoutRef.current && clearTimeout(timeoutRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const funNames = ["Shadowhunter", "PixelMaster", "QuestKing", "StarWalker", "ByteNinja"];
  const randomFun = funNames[Math.floor(Math.random() * funNames.length)];

  const canContinue = displayName.trim().length >= 2 && (nameStatus === "available" || nameStatus === "idle" || nameStatus === "checking");

  return (
    <motion.div
      key="display-name"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-full flex-col justify-center items-center px-6 py-12"
    >
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center text-3xl font-extrabold tracking-tight"
        style={{ color: "#1D1D1F", fontFamily: SF, letterSpacing: "-0.04em" }}
      >
        PUT YOUR NAME ON IT.
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-3 text-center text-base"
        style={{ color: "#8E8E93", fontFamily: SF }}
      >
        This is how you'll appear across SaurabhTask.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
        className="mt-10 w-full max-w-sm"
      >
        <ProfileCard
          avatarId={avatarId}
          name={displayName || "Your Name"}
          title="New Player"
          bio="Ready to start your productive journey. Every quest completed earns real rewards."
          actionText="Continue"
          typing={typing}
          onAction={() => {
            if (canContinue) onNext();
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 w-full max-w-sm"
      >
        <label
          htmlFor="display-name"
          className="block text-sm font-semibold"
          style={{ color: "#1C1C1E", fontFamily: SF }}
        >
          Display Name
        </label>
        <div className="mt-2 relative">
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canContinue) onNext();
            }}
            placeholder={"e.g. " + randomFun}
            maxLength={24}
            autoFocus
            className="block w-full rounded-xl px-4 py-3 text-base placeholder:text-gray-400 sm:text-sm"
            style={{
              background: "rgba(255,255,255,0.8)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              color: "#1C1C1E",
              fontFamily: SF,
              border: nameStatus === "taken"
                ? "1.5px solid rgba(255,59,48,0.5)"
                : nameStatus === "available" && displayName.trim().length >= 2
                  ? "1.5px solid rgba(52,199,89,0.5)"
                  : focused
                    ? "1.5px solid rgba(94,92,230,0.5)"
                    : "1px solid rgba(0,0,0,0.06)",
              outline: "none",
              boxShadow: nameStatus === "taken"
                ? "0 0 0 4px rgba(255,59,48,0.06), 0 4px 16px rgba(0,0,0,0.04)"
                : nameStatus === "available" && displayName.trim().length >= 2
                  ? "0 0 0 4px rgba(52,199,89,0.06), 0 4px 16px rgba(0,0,0,0.04)"
                  : focused
                    ? "0 0 0 4px rgba(94,92,230,0.08), 0 4px 16px rgba(0,0,0,0.04)"
                    : "0 2px 8px rgba(0,0,0,0.04)",
            }}
          />
          {/* Status indicator icon */}
          {displayName.trim().length >= 2 && nameStatus !== "idle" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {nameStatus === "checking" && (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              )}
              {nameStatus === "available" && (
                <Check className="w-4 h-4 text-green-500" />
              )}
              {nameStatus === "taken" && (
                <X className="w-4 h-4 text-red-500" />
              )}
            </div>
          )}
          {/* Clear button (when no status icon) */}
          {displayName.length > 0 && (nameStatus === "idle" || nameStatus === "invalid" || displayName.trim().length < 2) && (
            <button
              type="button"
              onClick={() => { setDisplayName(""); setNameStatus("idle"); setTakenName(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.06)",
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                color: "#8E8E93",
                lineHeight: 1,
              }}
            >
              x
            </button>
          )}
        </div>

        {/* Status text */}
        <div className="flex items-center justify-between mt-2 min-h-[18px]">
          <p className="text-xs" style={{
            color: nameStatus === "taken" ? "#FF3B30" : nameStatus === "available" ? "#34C759" : "#C7C7CC",
            fontFamily: SF,
          }}>
            {nameStatus === "taken" && `"${takenName}" is already taken`}
            {nameStatus === "available" && "Great choice — that's available!"}
            {nameStatus === "checking" && "Checking availability..."}
            {nameStatus === "invalid" && "Letters, numbers, spaces, _ . - only"}
            {nameStatus === "idle" && (displayName.length >= 2 ? "Looks great!" : "At least 2 characters")}
          </p>
          <p className="text-xs" style={{ color: "#C7C7CC", fontFamily: SF }}>
            {displayName.length}/24
          </p>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={onNext}
        disabled={displayName.trim().length < 2}
        className="mt-8 flex w-full max-w-sm justify-center items-center gap-2 px-4 py-3 text-base font-semibold"
        style={{
          background: displayName.trim().length >= 2
            ? "linear-gradient(135deg, #5E5CE6 0%, #7B61FF 100%)"
            : "rgba(0,0,0,0.06)",
          color: displayName.trim().length >= 2 ? "#FFFFFF" : "#C7C7CC",
          fontFamily: SF,
          borderRadius: 16,
          cursor: displayName.trim().length >= 2 ? "pointer" : "not-allowed",
          border: "none",
          boxShadow: displayName.trim().length >= 2
            ? "0 8px 32px rgba(94,92,230,0.3), 0 2px 8px rgba(0,0,0,0.08)"
            : "none",
          transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        LOCK IT IN
        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
      </motion.button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AUTH — Neon Auth Sign Up / Sign In
   ═══════════════════════════════════════════════════════════ */

type AuthTab = "signup" | "signin";

function AuthStep({
  displayName,
  avatarId,
  onBack,
  onSuccess,
}: {
  displayName: string;
  avatarId: string | null;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [tab, setTab] = useState<AuthTab>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setError("");
    setShowPassword(false);
  };

  const switchTab = (newTab: AuthTab) => {
    setTab(newTab);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (tab === "signup") {
        const { error: signUpError } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: displayName.trim(),
        });

        if (signUpError) {
          if (signUpError.message?.includes("already")) {
            setTab("signin");
            setError("Account already exists. Signing you in instead.");
            return;
          }
          setError(signUpError.message || "Registration failed. Try again.");
          return;
        }

        // Sync Neon Auth user to local DB (profiles, wallet, progression, etc.)
        const syncRes = await fetch("/api/auth/kinde-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim(),
            avatarId: avatarId || "avatar-wolf",
          }),
        });
        if (!syncRes.ok) {
          console.warn("Sync warning:", await syncRes.text());
        }

        onSuccess();
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError(signInError.message || "Login failed. Check your credentials.");
          return;
        }

        onSuccess();
      }
    } catch (err: any) {
      console.error("[auth]", err);
      const msg = err?.message || err?.error?.message || JSON.stringify(err);
      if (msg.includes("Invalid") || msg.includes("credentials") || msg.includes("401")) {
        setError("Incorrect email or password. Please try again.");
      } else if (msg.includes("not found") || msg.includes("does not exist")) {
        setError("No account found with this email. Sign up instead.");
      } else if (msg.includes("rate") || msg.includes("limit") || msg.includes("429")) {
        setError("Too many attempts. Please wait a moment.");
      } else {
        setError("Network error. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length >= 8 && !isLoading;

  const inputBaseStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    color: "#1C1C1E",
    fontFamily: SF,
    fontSize: 16,
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.06)",
    outline: "none",
    boxSizing: "border-box" as const,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <motion.div
      key="auth"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-full flex-col items-center justify-center px-6 py-12"
    >
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 }}
        onClick={onBack}
        className="self-start flex items-center gap-1 mb-6"
        style={{
          background: "none",
          border: "none",
          color: "#5E5CE6",
          fontFamily: SF,
          fontSize: 16,
          cursor: "pointer",
          padding: "8px 0",
        }}
      >
        <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
        Back
      </motion.button>

      {/* Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)",
          padding: "40px 28px 36px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-center mb-8"
        >
          <h2
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: "#1D1D1F", fontFamily: SF, letterSpacing: "-0.03em" }}
          >
            {tab === "signup" ? "SAVE YOUR PLAYER" : "Welcome back"}
          </h2>
          <p
            className="mt-2 text-sm"
            style={{ color: "#8E8E93", fontFamily: SF }}
          >
            {tab === "signup"
              ? "Your progress is ready. Create an account to keep it."
              : "Sign in to continue your journey."}
          </p>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label
              htmlFor="auth-email"
              className="block text-sm font-semibold"
              style={{ color: "#1C1C1E", fontFamily: SF }}
            >
              Email address
            </label>
            <div className="mt-2">
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                style={{
                  ...inputBaseStyle,
                  border: emailFocused
                    ? "1.5px solid rgba(94,92,230,0.5)"
                    : "1px solid rgba(0,0,0,0.06)",
                  boxShadow: emailFocused
                    ? "0 0 0 4px rgba(94,92,230,0.08), 0 4px 16px rgba(0,0,0,0.04)"
                    : "0 2px 8px rgba(0,0,0,0.04)",
                }}
              />
            </div>
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <label
              htmlFor="auth-password"
              className="block text-sm font-semibold"
              style={{ color: "#1C1C1E", fontFamily: SF }}
            >
              Password
            </label>
            <div className="mt-2 relative">
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                required
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                placeholder={tab === "signup" ? "Min 8 characters" : "Enter password"}
                style={{
                  ...inputBaseStyle,
                  paddingRight: 48,
                  border: passwordFocused
                    ? "1.5px solid rgba(94,92,230,0.5)"
                    : "1px solid rgba(0,0,0,0.06)",
                  boxShadow: passwordFocused
                    ? "0 0 0 4px rgba(94,92,230,0.08), 0 4px 16px rgba(0,0,0,0.04)"
                    : "0 2px 8px rgba(0,0,0,0.04)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#C7C7CC",
                  padding: 4,
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {tab === "signup" && password.length > 0 && password.length < 8 && (
              <p className="mt-1.5 text-xs" style={{ color: "#FF9500", fontFamily: SF }}>
                At least 8 characters required
              </p>
            )}
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                className="text-sm text-center"
                style={{ color: "#FF3B30", fontFamily: SF }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={!canSubmit}
            className="w-full flex justify-center items-center gap-2 px-4 py-3 text-base font-semibold"
            style={{
              fontFamily: SF,
              height: 52,
              borderRadius: 16,
              background: canSubmit
                ? "linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)"
                : "rgba(0,0,0,0.06)",
              color: canSubmit ? "#FFFFFF" : "#C7C7CC",
              cursor: canSubmit ? "pointer" : "not-allowed",
              border: "none",
              boxShadow: canSubmit
                ? "0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.08)"
                : "none",
              transition: "all 0.3s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {isLoading ? (
              <div style={{
                width: 22,
                height: 22,
                border: "2.5px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
            ) : (
              <>
                {tab === "signup" ? "SAVE MY PLAYER" : "SIGN IN"}
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </>
            )}
          </motion.button>
        </form>

        {/* Toggle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center text-sm"
          style={{ color: "#8E8E93", fontFamily: SF }}
        >
          {tab === "signup" ? "Already have an account? " : "Not a member? "}
          <button
            onClick={() => switchTab(tab === "signup" ? "signin" : "signup")}
            className="font-semibold"
            style={{
              color: "#5E5CE6",
              fontFamily: SF,
              fontSize: 14,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {tab === "signup" ? "Sign in" : "Start a 14 day free trial"}
          </button>
        </motion.p>

        {/* Legal */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.42 }}
          className="mt-4 text-center text-xs"
          style={{ color: "#AEAEB2", fontFamily: SF }}
        >
          Your player will be ready when you return.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-3 text-center text-xs"
          style={{ color: "#AEAEB2", fontFamily: SF, lineHeight: 1.5 }}
        >
          By continuing, you agree to our{" "}
          <a href="#" style={{ color: "#5E5CE6", textDecoration: "none" }}>Terms</a>
          {" "}&{" "}
          <a href="#" style={{ color: "#5E5CE6", textDecoration: "none" }}>Privacy Policy</a>
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REVEAL — Player card after auth
   ═══════════════════════════════════════════════════════════ */

const GOAL_LABELS: Record<string, string> = {
  focus: "FOCUS PLAYER",
  study: "STUDY PLAYER",
  fitness: "FITNESS PLAYER",
  projects: "BUILDER",
  habits: "HABITS PLAYER",
};

const STYLE_LABELS: Record<string, string> = {
  grinder: "THE GRINDER",
  sprinter: "THE SPRINTER",
  competitor: "THE COMPETITOR",
  collector: "THE COLLECTOR",
  balanced: "THE BALANCED",
};

const AVATAR_MAP: Record<string, { emoji: string; label: string; gradient: string }> = {
  wolf:   { emoji: "\u{1F43A}", label: "WOLF",   gradient: "linear-gradient(135deg, #6B7280 0%, #374151 100%)" },
  tiger:  { emoji: "\u{1F42F}", label: "TIGER",  gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" },
  ninja:  { emoji: "\u{1F977}", label: "NINJA",  gradient: "linear-gradient(135deg, #1F2937 0%, #111827 100%)" },
  wizard: { emoji: "\u{1F9D9}", label: "WIZARD", gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)" },
  dragon: { emoji: "\u{1F409}", label: "DRAGON", gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)" },
  phoenix:{ emoji: "\u{1F525}", label: "PHOENIX",gradient: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)" },
};

function RevealStep({
  displayName,
  avatarId,
  goal,
  playstyle,
  onContinue,
}: {
  displayName: string;
  avatarId: string | null;
  goal: string | null;
  playstyle: string | null;
  onContinue: () => void;
}) {
  const avatar = avatarId ? AVATAR_MAP[avatarId] : null;
  const goalLabel = goal ? GOAL_LABELS[goal] || "PLAYER" : "PLAYER";
  const styleLabel = playstyle ? STYLE_LABELS[playstyle] || "THE BALANCED" : "THE BALANCED";

  return (
    <motion.div
      key="reveal"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-h-full flex-col items-center justify-center px-6 py-12"
    >
      {/* Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%",
          maxWidth: 380,
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)",
          padding: "40px 28px 36px",
          boxSizing: "border-box",
        }}
      >
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center text-xs font-bold tracking-widest uppercase"
          style={{ color: "#8E8E93", fontFamily: SF }}
        >
          YOUR PLAYER IS READY
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
          className="mx-auto mt-6 flex items-center justify-center"
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            background: avatar?.gradient || "linear-gradient(135deg, #EDEDFC 0%, #F0EDFF 100%)",
            fontSize: 44,
            lineHeight: 1,
            boxShadow: "0 16px 40px rgba(0,0,0,0.2)",
            border: "3px solid rgba(255,255,255,0.5)",
          }}
        >
          {avatar?.emoji || "\u{1F464}"}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-5 text-center text-3xl font-extrabold tracking-tight"
          style={{ color: "#1D1D1F", fontFamily: SF }}
        >
          {displayName}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="flex items-center justify-center gap-3 mt-7"
        >
          <StatCard label="AVATAR" value={avatar?.label || "\u2014"} />
          <StatCard label="GOAL" value={goalLabel} />
          <StatCard label="STYLE" value={styleLabel} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="flex items-center justify-center gap-6 mt-6"
        >
          <div className="text-center" style={{ minWidth: 56 }}>
            <p className="text-2xl font-extrabold" style={{ color: "#5E5CE6", fontFamily: SF }}>1</p>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8E8E93", fontFamily: SF }}>LEVEL</p>
          </div>
          <div style={{ width: 1, height: 32, background: "rgba(0,0,0,0.06)" }} />
          <div className="text-center" style={{ minWidth: 56 }}>
            <p className="text-2xl font-extrabold" style={{ color: "#FF9500", fontFamily: SF }}>0</p>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8E8E93", fontFamily: SF }}>ST</p>
          </div>
          <div style={{ width: 1, height: 32, background: "rgba(0,0,0,0.06)" }} />
          <div className="text-center" style={{ minWidth: 56 }}>
            <p className="text-2xl font-extrabold" style={{ color: "#5E5CE6", fontFamily: SF }}>0</p>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8E8E93", fontFamily: SF }}>XP</p>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
          className="mt-8 w-full flex justify-center items-center gap-2 px-4 py-3 text-base font-semibold"
          style={{
            fontFamily: SF,
            height: 52,
            borderRadius: 16,
            background: "linear-gradient(135deg, #1C1C1E 0%, #2C2C2E 100%)",
            color: "#FFFFFF",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          START MY JOURNEY
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-4 text-center text-xs"
          style={{ color: "#AEAEB2", fontFamily: SF }}
        >
          You can customize everything later.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex-1 text-center"
      style={{
        padding: "12px 8px",
        borderRadius: 16,
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.5)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.4)",
      }}
    >
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8E8E93", fontFamily: SF, marginBottom: 4 }}>
        {label}
      </p>
      <p className="text-xs font-extrabold" style={{ color: "#1C1C1E", fontFamily: SF, lineHeight: 1.2 }}>
        {value}
      </p>
    </div>
  );
}
