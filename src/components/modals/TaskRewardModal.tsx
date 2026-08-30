"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Crown, Flame, Zap, ArrowRight, Sparkles } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import type { CompletionResult } from "@/types/api";
import { getLevelFromXP } from "@/lib/economy/xp-engine";
import { triggerConfetti } from "@/lib/confetti";
import { useRouter } from "next/navigation";

export const TaskRewardModal: React.FC = () => {
  const isOpen = useUIStore((s) => s.modals.taskReward);
  const result = useUIStore((s) => s.completionResult) as CompletionResult | null;
  const closeModal = useUIStore((s) => s.closeModal);
  const router = useRouter();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isOpen || !result) return;
    setStage(0);
    triggerConfetti({ particleCount: result.reward.criticalHit ? 150 : 90 });
    const timers = [
      setTimeout(() => setStage(1), 700),
      setTimeout(() => setStage(2), 1400),
      setTimeout(() => setStage(3), 2100),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isOpen, result]);

  if (!isOpen || !result) return null;

  const levelInfo = getLevelFromXP(result.progress.xpTotal);
  const r = result.reward;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[80] flex items-center justify-center px-6"
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => closeModal("taskReward")} />

        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="relative w-full max-w-sm rounded-[24px] overflow-hidden bg-white"
          style={{ boxShadow: "0 20px 60px -15px rgba(0,0,0,0.2)" }}
          role="dialog"
          aria-label="Mission complete"
        >
          <div className="relative z-10 px-7 pt-9 pb-8 text-center">
            {/* Stage 0 — checkmark */}
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 11, stiffness: 260 }} className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: r.criticalHit ? "#FFF8EB" : "#E8FAF0" }}>
              {r.criticalHit ? <Crown className="w-8 h-8 text-[#FF9500]" strokeWidth={2} /> : <CheckCircle2 className="w-8 h-8 text-[#34C759]" strokeWidth={2.2} />}
            </motion.div>

            <p className="text-[10px] font-bold tracking-[0.2em] text-[#8E8E93]">
              {r.criticalHit ? "CRITICAL HIT!" : "MISSION COMPLETE"}
            </p>
            <h2 className="mt-1.5 text-[20px] font-bold text-[#1C1C1E] leading-snug">{result.task.title}</h2>

            {/* Stage 1 — ST reveal */}
            <AnimatePresence>
              {stage >= 1 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-6">
                  <p className="text-[40px] leading-none font-extrabold text-[#1C1C1E] tabular-nums" style={{ letterSpacing: "-0.03em" }}>
                    +{r.stGained.toLocaleString()} <span className="text-[16px] text-[#5E5CE6] font-bold">ST</span>
                  </p>
                  {(r.streakMultiplier > 1 || r.momentumMultiplier > 1 || r.boostStMultiplier > 1) && (
                    <div className="flex items-center justify-center gap-1.5 mt-2.5 flex-wrap">
                      {r.streakMultiplier > 1 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#FF9500] bg-[#FFF8EB]"><Flame className="w-3 h-3" />×{r.streakMultiplier} streak</span>
                      )}
                      {r.momentumMultiplier > 1 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#007AFF] bg-[#E8F4FD]"><Zap className="w-3 h-3" />×{r.momentumMultiplier} momentum</span>
                      )}
                      {r.boostStMultiplier > 1 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#34C759] bg-[#E8FAF0]"><Sparkles className="w-3 h-3" />×{r.boostStMultiplier} boost</span>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stage 2 — XP + level */}
            <AnimatePresence>
              {stage >= 2 && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-5">
                  <p className="text-[13px] font-bold text-[#34C759] tabular-nums">+{r.xpGained} XP</p>
                  {result.progress.levelUp ? (
                    <p className="mt-1.5 text-[15px] font-bold text-[#FF9500]">
                      LEVEL UP — {result.progress.levelAfter}
                    </p>
                  ) : (
                    <div className="mx-auto mt-2.5 max-w-[220px]">
                      <div className="flex justify-between text-[9px] font-semibold text-[#8E8E93] mb-1">
                        <span>LEVEL {levelInfo.level}</span>
                        <span>{levelInfo.currentXP}/{levelInfo.requiredXP}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#F2F2F7] overflow-hidden">
                        <motion.div
                          initial={{ width: `${getLevelFromXP(result.progress.xpTotal - r.xpGained).progress * 100}%` }}
                          animate={{ width: `${levelInfo.progress * 100}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: "#34C759" }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stage 3 — streak / quests / achievements */}
            <AnimatePresence>
              {stage >= 3 && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mt-5 space-y-2.5">
                  {result.streak.extended && (
                    <div className="rounded-[12px] px-3.5 py-2.5 flex items-center gap-2 bg-[#FFEBEA]">
                      <Flame className="w-4 h-4 text-[#FF3B30] flex-shrink-0" />
                      <p className="text-[12px] font-semibold text-[#FF3B30]">
                        {result.streak.after}-day streak{result.streak.milestone ? ` — milestone!` : " protected"}
                      </p>
                    </div>
                  )}

                  {result.newAchievements.map((a) => (
                    <div key={a.id} className="rounded-[12px] px-3.5 py-2.5 flex items-center gap-2.5 bg-[#FFF8EB]">
                      <span className="text-lg">{a.emoji}</span>
                      <div className="text-left min-w-0">
                        <p className="text-[12px] font-bold text-[#FF9500] truncate">Achievement — {a.name}</p>
                        {a.rewardSt > 0 && <p className="text-[10px] text-[#FF9500]/70 tabular-nums">+{a.rewardSt} ST bonus</p>}
                      </div>
                    </div>
                  ))}

                  {result.quests.map((q) =>
                    q.completed ? (
                      <div key={q.id} className="rounded-[12px] px-3.5 py-2.5 flex items-center gap-2.5 bg-[#EDEDFC]">
                        <span className="text-lg">{q.emoji}</span>
                        <p className="text-[12px] font-bold text-[#5E5CE6]">{q.title} complete!</p>
                      </div>
                    ) : (
                      <div key={q.id} className="rounded-[12px] px-3.5 py-2.5 text-left bg-[#F2F2F7]">
                        <div className="flex justify-between mb-1.5">
                          <p className="text-[11px] font-semibold text-[#636366]">{q.emoji} {q.title}</p>
                          <span className="text-[10px] font-semibold text-[#8E8E93] tabular-nums">{q.progressPct}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-[#E5E5EA] overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${q.progressPct}%`, background: "#5E5CE6" }} />
                        </div>
                      </div>
                    )
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                closeModal("taskReward");
                router.push("/tasks");
              }}
              className="btn-primary mt-7"
              style={{ opacity: stage >= 3 ? 1 : 0.5 }}
            >
              CONTINUE <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
