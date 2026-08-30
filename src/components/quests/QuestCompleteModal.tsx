"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Sparkles, ArrowRight } from "lucide-react";
import { useClaimQuest } from "@/hooks/queries";
import { triggerConfetti } from "@/lib/confetti";
import type { QuestView } from "@/types/api";

type QuestCompleteModalProps = {
  quest: QuestView | null;
  onClose: () => void;
};

export const QuestCompleteModal: React.FC<QuestCompleteModalProps> = ({ quest, onClose }) => {
  const claimMutation = useClaimQuest();
  const [stage, setStage] = useState<"ready" | "claiming" | "claimed">("ready");

  useEffect(() => {
    if (quest) {
      setStage("ready");
      // Auto-trigger confetti for the celebration moment
      const timer = setTimeout(() => {
        triggerConfetti({ particleCount: 150, spread: 80, origin: { x: 0.5, y: 0.4 } });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [quest]);

  const handleClaim = async () => {
    if (!quest || claimMutation.isPending) return;
    setStage("claiming");
    try {
      await claimMutation.mutateAsync(quest.id);
      setStage("claimed");
      triggerConfetti({ particleCount: 100, spread: 60 });
    } catch {
      setStage("ready");
    }
  };

  if (!quest) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[85] flex items-center justify-center px-5"
      >
        <div
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,.4)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          onClick={stage !== "claiming" ? onClose : undefined}
        />

        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="relative w-full max-w-sm rounded-[24px] overflow-hidden bg-white text-center"
          style={{ boxShadow: "0 24px 64px -16px rgba(0,0,0,.25)" }}
        >
          {/* Header glow */}
          <div
            className="absolute top-0 left-0 right-0 h-32"
            style={{ background: "linear-gradient(180deg, #EDEDFC 0%, transparent 100%)" }}
          />

          <div className="relative px-6 pt-8 pb-7">
            {/* Trophy */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.15 }}
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "linear-gradient(145deg, #FEF3C7, #FDE68A)" }}
            >
              <span className="text-[40px]">{quest.emoji}</span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[10px] font-bold tracking-[0.2em] text-[#5E5CE6]"
            >
              QUEST COMPLETE
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-[20px] font-extrabold text-[#1C1C1E] mt-2"
            >
              {quest.title}
            </motion.h2>

            {/* Objectives summary */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-3 space-y-1"
            >
              {quest.objectives.map((obj) => (
                <div key={obj.key} className="flex items-center justify-center gap-1.5">
                  <Check className="w-3 h-3 text-[#34C759]" strokeWidth={3} />
                  <span className="text-[11px] text-[#6B7280]">{obj.label}</span>
                </div>
              ))}
            </motion.div>

            {/* Reward */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring", damping: 15 }}
              className="mt-5 py-4 rounded-[16px] bg-[#F9FAFB]"
            >
              <p className="text-[10px] font-bold tracking-wider text-[#8E8E93] mb-2">REWARD</p>
              <div className="flex items-center justify-center gap-4">
                {quest.reward.st > 0 && (
                  <div className="text-center">
                    <p className="text-[22px] font-extrabold text-[#5E5CE6] tabular-nums" style={{ letterSpacing: "-0.03em" }}>
                      +{quest.reward.st}
                    </p>
                    <p className="text-[10px] font-bold text-[#8E8E93]">ST</p>
                  </div>
                )}
                {quest.reward.xp > 0 && (
                  <div className="text-center">
                    <p className="text-[22px] font-extrabold text-[#34C759] tabular-nums" style={{ letterSpacing: "-0.03em" }}>
                      +{quest.reward.xp}
                    </p>
                    <p className="text-[10px] font-bold text-[#8E8E93]">XP</p>
                  </div>
                )}
                {quest.reward.petXp && quest.reward.petXp > 0 && (
                  <div className="text-center">
                    <p className="text-[22px] font-extrabold text-[#FF9500] tabular-nums" style={{ letterSpacing: "-0.03em" }}>
                      +{quest.reward.petXp}
                    </p>
                    <p className="text-[10px] font-bold text-[#8E8E93]">Pet XP</p>
                  </div>
                )}
              </div>
              {quest.reward.badgeId && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EDEDFC] text-[10px] font-semibold text-[#5E5CE6]">
                  <Crown className="w-3 h-3" /> Badge Unlocked
                </div>
              )}
            </motion.div>

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileTap={{ scale: 0.96 }}
              onClick={stage === "claimed" ? onClose : handleClaim}
              disabled={stage === "claiming"}
              className="w-full mt-5 py-4 rounded-[16px] text-[15px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
              style={{
                background: stage === "claimed" ? "#34C759" : "#5E5CE6",
                boxShadow: stage === "claimed"
                  ? "0 8px 16px -4px rgba(52,199,89,.3)"
                  : "0 8px 24px -4px rgba(94,92,230,.4)",
              }}
            >
              {stage === "claiming" ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
              ) : stage === "claimed" ? (
                <>
                  CONTINUE <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </>
              ) : (
                "CLAIM REWARD"
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
