"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Check, Sparkles, Crown, ArrowRight, Timer, Lock } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { useDailyReward, useClaimDailyReward, useSnapshot } from "@/hooks/queries";
import { formatCurrency } from "@/lib/format";
import type { DailyRewardTier, DailyRewardClaimResult } from "@/types/api";
import { triggerConfetti } from "@/lib/confetti";

/* ── Keyframes (injected once) ─────────────────────────────── */
const STYLE_ID = "daily-vault-keyframes";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @kv-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @kv-pulse { 0%,100%{transform:scale(1);box-shadow:0 8px 24px -4px rgba(94,92,230,.35)} 50%{transform:scale(1.03);box-shadow:0 12px 32px -2px rgba(94,92,230,.5)} }
    @kv-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
    @kv-glow-pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
  `;
  document.head.appendChild(style);
}

/* ── Helpers ────────────────────────────────────────────────── */
const CARD_SHADOW = "0 2px 8px -2px rgba(0,0,0,.06)";
const GLOW_PURPLE = "0 4px 24px rgba(94,92,230,.35), 0 0 48px rgba(94,92,230,.15)";
const GLOW_GOLD = "0 4px 24px rgba(255,149,0,.35), 0 0 48px rgba(255,149,0,.15)";
const INSET_SHADOW = "inset 0 2px 6px rgba(0,0,0,.1)";

/* ── Main Modal ────────────────────────────────────────────── */
export const DailyRewardModal: React.FC = () => {
  const isOpen = useUIStore((s) => s.modals.dailyReward);
  const closeModal = useUIStore((s) => s.closeModal);
  const { data: status, isLoading } = useDailyReward();
  const { data: snap } = useSnapshot();
  const claimMutation = useClaimDailyReward();
  const [stage, setStage] = useState<"track" | "claiming" | "revealed">("track");
  const [claimResult, setClaimResult] = useState<DailyRewardClaimResult | null>(null);
  const [flyingTokens, setFlyingTokens] = useState<{ id: number; x: number; y: number }[]>([]);
  const tokenIdRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setStage("track");
      setClaimResult(null);
      setFlyingTokens([]);
    }
  }, [isOpen]);

  const handleClaim = useCallback(async () => {
    if (!status?.available || claimMutation.isPending) return;
    setStage("claiming");

    // Haptic vibration
    try { navigator.vibrate?.(30); } catch {}

    try {
      const result = await claimMutation.mutateAsync();
      setClaimResult(result);

      // Spawn flying tokens
      const tokens = Array.from({ length: 6 }, (_, i) => ({
        id: tokenIdRef.current++,
        x: (Math.random() - 0.5) * 60,
        y: -40 - Math.random() * 60,
      }));
      setFlyingTokens(tokens);

      // Confetti
      if (result.cycleComplete || result.stAwarded >= 200) {
        triggerConfetti({ particleCount: result.cycleComplete ? 250 : 140, spread: 90 });
      } else {
        triggerConfetti({ particleCount: 80, spread: 60 });
      }

      setTimeout(() => {
        setStage("revealed");
        setFlyingTokens([]);
      }, 900);
    } catch {
      setStage("track");
    }
  }, [status?.available, claimMutation]);

  const handleClose = () => {
    if (stage === "claiming") return;
    closeModal("dailyReward");
  };

  if (!isOpen) return null;

  const tiers = status?.tiers ?? [];
  const claimedDays = new Set(status?.claimedDays ?? []);
  const currentDay = status?.currentDay ?? 1;
  const days1to6 = tiers.filter((t) => t.day <= 6);
  const day7 = tiers.find((t) => t.day === 7);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[80] flex items-center justify-center px-4"
      >
        {/* Backdrop — frosted acrylic */}
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,.35)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          onClick={handleClose}
        />

        {/* Sheet */}
        <motion.div
          initial={{ scale: 0.88, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 24, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 320 }}
          className="relative w-full max-w-sm rounded-[24px] overflow-hidden bg-white"
          style={{ boxShadow: "0 24px 64px -16px rgba(0,0,0,.18)" }}
          role="dialog"
          aria-label="Daily Vault"
        >
          {/* Close */}
          <button
            onClick={handleClose}
            disabled={stage === "claiming"}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-[#F2F2F7] text-[#8E8E93] hover:bg-[#E5E5EA] transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="relative px-6 pt-7 pb-3 text-center">
            <div
              className="w-14 h-14 rounded-[16px] flex items-center justify-center mx-auto mb-3"
              style={{ background: "linear-gradient(145deg,#EDEDFC,#D4D4F7)" }}
            >
              <Gift className="w-7 h-7 text-[#5E5CE6]" strokeWidth={2} />
            </div>
            <h2 className="text-[18px] font-bold text-[#1C1C1E]">Daily Vault</h2>
            <p className="text-[12px] text-[#8E8E93] mt-0.5">
              {status?.streakActive
                ? "Streak active — bonus active!"
                : `Day ${currentDay} of 7`}
            </p>
          </div>

          {/* ─── 3×2 Grid + Day 7 Jackpot ─── */}
          <div className="px-5 pb-4">
            {/* Days 1–6: 3×2 grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {days1to6.map((tier) => (
                <DayCard
                  key={tier.day}
                  tier={tier}
                  isClaimed={claimedDays.has(tier.day)}
                  isCurrent={tier.day === currentDay && !!status?.available}
                  isLocked={tier.day > currentDay}
                />
              ))}
            </div>

            {/* Day 7: Jackpot — full width */}
            {day7 && (
              <div className="mt-2.5">
                <JackpotCard
                  tier={day7}
                  isClaimed={claimedDays.has(7)}
                  isCurrent={7 === currentDay && !!status?.available}
                  isLocked={7 > currentDay}
                />
              </div>
            )}
          </div>

          {/* ─── CTA Area ─── */}
          <div className="px-6 pb-7">
            <AnimatePresence mode="wait">
              {/* CLAIM button */}
              {stage === "track" && status?.available && (
                <motion.div key="claim" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleClaim}
                    className="w-full py-4 rounded-[16px] text-[15px] font-bold text-white flex items-center justify-center gap-2 relative overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg,#5E5CE6,#7C5CFF)",
                      boxShadow: "0 8px 24px -4px rgba(94,92,230,.4)",
                      animation: "kv-pulse 2.5s ease-in-out infinite",
                    }}
                  >
                    <Gift className="w-5 h-5" /> CLAIM REWARD
                  </motion.button>
                  {status.streakActive && (
                    <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#FF9500]">
                      <Sparkles className="w-3 h-3" /> ×1.5 streak bonus active
                    </div>
                  )}
                </motion.div>
              )}

              {/* Waiting / already claimed */}
              {stage === "track" && !status?.available && (
                <motion.div key="waiting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center">
                  <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center bg-[#F2F2F7]">
                    <Timer className="w-8 h-8 text-[#8E8E93]" strokeWidth={1.5} />
                  </div>
                  <p className="text-[15px] font-bold text-[#1C1C1E]">Already Claimed!</p>
                  <p className="text-[12px] text-[#8E8E93] mt-1">
                    Next in <span className="font-semibold text-[#5E5CE6]">{status?.timeUntilNext}</span>
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleClose}
                    className="w-full mt-4 py-4 rounded-[16px] text-[15px] font-bold bg-[#F2F2F7] text-[#3C3C43] hover:bg-[#E5E5EA] transition-colors"
                    style={{ boxShadow: "0 1px 3px rgba(0,0,0,.06), inset 0 1px 0 rgba(255,255,255,.8)" }}
                  >
                    CLOSE
                  </motion.button>
                </motion.div>
              )}

              {/* Claiming spinner */}
              {stage === "claiming" && (
                <motion.div key="claiming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ background: "linear-gradient(145deg,#EDEDFC,#D4D4F7)" }}
                  >
                    <Sparkles className="w-7 h-7 text-[#5E5CE6]" />
                  </motion.div>
                  <p className="text-[13px] font-semibold text-[#636366]">Claiming reward...</p>
                </motion.div>
              )}

              {/* Revealed */}
              {stage === "revealed" && claimResult && (
                <motion.div key="revealed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 16, stiffness: 220 }} className="text-center">
                  {/* Flying tokens */}
                  {flyingTokens.map((t) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                      animate={{ opacity: 0, y: t.y, x: t.x, scale: 0.3 }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                      className="absolute left-1/2 top-1/3 text-lg pointer-events-none z-20"
                    >
                      🪙
                    </motion.div>
                  ))}

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10, stiffness: 260, delay: 0.1 }}
                    className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{
                      background: claimResult.cycleComplete
                        ? "linear-gradient(145deg,#FEF3C7,#FDE68A)"
                        : "linear-gradient(145deg,#E8FAF0,#D1FAE5)",
                    }}
                  >
                    {claimResult.cycleComplete ? (
                      <Crown className="w-10 h-10 text-[#FF9500]" strokeWidth={2} />
                    ) : (
                      <Check className="w-10 h-10 text-[#34C759]" strokeWidth={2.5} />
                    )}
                  </motion.div>

                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                    className="text-[10px] font-bold tracking-[0.2em] text-[#8E8E93]">
                    {claimResult.cycleComplete ? "CYCLE COMPLETE!" : "REWARD CLAIMED"}
                  </motion.p>

                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="text-[28px] leading-none font-extrabold text-[#1C1C1E] tabular-nums mt-2" style={{ letterSpacing: "-0.03em" }}>
                    +{claimResult.stAwarded.toLocaleString()} <span className="text-[14px] text-[#5E5CE6] font-bold">ST</span>
                  </motion.p>

                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
                    className="text-[13px] font-bold text-[#34C759] mt-1">
                    +{claimResult.xpAwarded} XP
                  </motion.p>

                  {claimResult.streakBonus && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                      className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF8EB] text-[10px] font-semibold text-[#FF9500]">
                      <Sparkles className="w-3 h-3" /> ×1.5 streak bonus
                    </motion.div>
                  )}

                  {claimResult.levelUp && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
                      className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EDEDFC] text-[10px] font-semibold text-[#5E5CE6]">
                      <Crown className="w-3 h-3" /> Level Up — {claimResult.newLevel}
                    </motion.div>
                  )}

                  <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                    whileTap={{ scale: 0.96 }} onClick={handleClose}
                    className="w-full mt-5 py-3.5 rounded-[14px] text-[14px] font-semibold text-white flex items-center justify-center gap-2"
                    style={{ background: "#34C759", boxShadow: "0 8px 16px -4px rgba(52,199,89,.3)" }}>
                    CONTINUE <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ═══════════════════════════════════════════════════════════════
   DAY CARD (Days 1–6)
   ═══════════════════════════════════════════════════════════════ */
function DayCard({
  tier,
  isClaimed,
  isCurrent,
  isLocked,
}: {
  tier: DailyRewardTier;
  isClaimed: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: tier.day * 0.04, duration: 0.25 }}
      className="relative flex flex-col items-center"
    >
      <div
        className="relative w-full aspect-square rounded-[16px] flex flex-col items-center justify-center gap-0.5 overflow-hidden"
        style={{
          background: isClaimed
            ? "linear-gradient(145deg,#E8FAF0,#D1FAE5)"
            : isCurrent
              ? "linear-gradient(145deg,#5E5CE6,#7C5CFF)"
              : "#F3F4F6",
          boxShadow: isCurrent
            ? GLOW_PURPLE
            : isClaimed
              ? INSET_SHADOW
              : "0 1px 3px rgba(0,0,0,.06)",
          border: !isClaimed && !isCurrent ? "2px solid #E5E7EB" : "none",
          transform: isCurrent ? "scale(1.05)" : "scale(1)",
          animation: isCurrent ? "kv-float 2.5s ease-in-out infinite" : undefined,
        }}
      >
        {/* Day label — top center inside card, bold & visible */}
        <span
          className="absolute top-1.5 left-0 right-0 text-center text-[9px] font-black tracking-wider uppercase"
          style={{ color: isCurrent ? "rgba(255,255,255,.7)" : isClaimed ? "#34C759" : "#6B7280" }}
        >
          Day {tier.day}
        </span>

        {isClaimed ? (
          <div className="w-8 h-8 rounded-full bg-[#34C759] flex items-center justify-center mt-1.5">
            <Check className="w-5 h-5 text-white" strokeWidth={3} />
          </div>
        ) : isLocked ? (
          <div className="relative flex items-center justify-center">
            {/* Reward asset behind lock — large, dimmed, builds anticipation */}
            <span className="text-[28px] opacity-25 grayscale">{tier.emoji}</span>
            {/* Lock icon centered over the asset */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.12)" }}>
                <Lock className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <span className="text-[28px] leading-none">{tier.emoji}</span>
            <span
              className="text-[9px] font-bold tabular-nums mt-0.5"
              style={{ color: isCurrent ? "#FFFFFF" : "#6B7280" }}
            >
              +{tier.st} ST
            </span>
          </>
        )}

        {/* Current glow ring */}
        {isCurrent && (
          <motion.div
            className="absolute inset-0 rounded-[16px] border-2 border-[#5E5CE6]"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   JACKPOT CARD (Day 7)
   ═══════════════════════════════════════════════════════════════ */
function JackpotCard({
  tier,
  isClaimed,
  isCurrent,
  isLocked,
}: {
  tier: DailyRewardTier;
  isClaimed: boolean;
  isCurrent: boolean;
  isLocked: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.35 }}
      className="relative rounded-[18px] overflow-hidden"
      style={{
        background: isClaimed
          ? "linear-gradient(135deg,#E8FAF0,#D1FAE5)"
          : "linear-gradient(135deg,#FF9500,#FF6B00,#FF3D00)",
        boxShadow: isCurrent
          ? GLOW_GOLD
          : isClaimed
            ? INSET_SHADOW
            : "0 4px 16px -4px rgba(255,107,0,.3)",
        minHeight: 80,
      }}
    >
      {/* Shimmer sweep (only when current/available) */}
      {isCurrent && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 w-1/3"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent)",
              animation: "kv-shimmer 2.5s ease-in-out infinite",
            }}
          />
        </div>
      )}

      <div className="relative flex items-center gap-3 px-5 py-4">
        {/* Crown / asset icon — scaled up */}
        <div
          className="w-16 h-16 rounded-[16px] flex items-center justify-center flex-shrink-0"
          style={{
            background: isClaimed
              ? "rgba(52,199,89,.15)"
              : "rgba(255,255,255,.2)",
          }}
        >
          {isClaimed ? (
            <Check className="w-8 h-8 text-[#34C759]" strokeWidth={2.5} />
          ) : (
            <span className="text-[36px] leading-none">{tier.emoji}</span>
          )}
        </div>

        {/* Centered info */}
        <div className="flex-1 min-w-0 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[13px] font-bold text-white">
              {isClaimed ? "Claimed" : "Day 7 Jackpot"}
            </span>
            {isCurrent && (
              <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-white/20 text-white/90">
                READY
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: isClaimed ? "#34C759" : "rgba(255,255,255,.75)" }}>
            {isClaimed
              ? "Reward collected"
              : isLocked
                ? "Complete days 1–6 first"
                : "+500 ST · +500 XP"}
          </p>
        </div>

        {/* Reward amount with token icon — scaled up */}
        {!isClaimed && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-[20px]">🪙</span>
            </div>
            <p className="text-[24px] font-extrabold text-white tabular-nums leading-none" style={{ letterSpacing: "-0.03em" }}>
              +{tier.st}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
