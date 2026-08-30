"use client";

/**
 * PDR-4.1 §42-43: Mission Reward Reveal
 * Shows the reward after successful mission verification.
 * §42: User immediately understands what happened and why they should care.
 * §43: Shows "YOU'RE CLOSE" to the next unlock.
 */

import React from "react";
import { motion } from "framer-motion";
import { Zap, Star, Trophy, ArrowRight, Flame } from "lucide-react";

type Props = {
  stGained: number;
  xpGained: number;
  levelUp?: boolean;
  newLevel?: number;
  streak?: number;
  nextGoalSt?: number;
  nextGoalName?: string;
  onClaim?: () => void;
  onRetry?: () => void;
  onNext?: () => void;
};

export function MissionRewardReveal({
  stGained,
  xpGained,
  levelUp,
  newLevel,
  streak,
  nextGoalSt,
  nextGoalName,
  onClaim,
  onRetry,
  onNext,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-5 py-6 px-5">
      {/* Success badge */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-[#E8FAF0] flex items-center justify-center"
      >
        <Trophy className="w-10 h-10 text-[#34C759]" strokeWidth={1.8} />
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <h2 className="text-[20px] font-bold text-[#1C1C1E]">MISSION VERIFIED</h2>
        <p className="text-[13px] text-[#8E8E93] mt-1">Great work! Your effort paid off.</p>
      </motion.div>

      {/* Rewards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-6"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#FF9500]" />
          <span className="text-[24px] font-bold text-[#1C1C1E]">+{stGained}</span>
          <span className="text-[13px] text-[#8E8E93]">ST</span>
        </div>
        <div className="w-px h-8 bg-[#E5E5EA]" />
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-[#5E5CE6]" />
          <span className="text-[24px] font-bold text-[#1C1C1E]">+{xpGained}</span>
          <span className="text-[13px] text-[#8E8E93]">XP</span>
        </div>
      </motion.div>

      {/* Level up */}
      {levelUp && newLevel && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-[280px] py-3 rounded-[14px] bg-[#F2F2F7] text-center"
        >
          <p className="text-[12px] font-bold text-[#5E5CE6] uppercase tracking-wider">Level Up!</p>
          <p className="text-[18px] font-bold text-[#1C1C1E] mt-1">Level {newLevel}</p>
        </motion.div>
      )}

      {/* Streak */}
      {streak && streak > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center gap-2 text-[13px] text-[#FF9500]"
        >
          <Flame className="w-4 h-4" />
          <span className="font-semibold">STREAK +{streak}</span>
        </motion.div>
      )}

      {/* Next goal hint */}
      {nextGoalSt && nextGoalSt > 0 && nextGoalName && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="w-full max-w-[280px] py-3 rounded-[14px] border border-[#E5E5EA] text-center"
        >
          <p className="text-[11px] text-[#8E8E93] uppercase tracking-wider font-semibold">YOU&apos;RE CLOSE</p>
          <p className="text-[14px] font-bold text-[#1C1C1E] mt-1">
            {nextGoalSt} ST until {nextGoalName}
          </p>
        </motion.div>
      )}

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="flex flex-col gap-3 w-full max-w-[280px]"
      >
        {onClaim && (
          <button
            onClick={onClaim}
            className="w-full py-3.5 rounded-[14px] bg-[#5E5CE6] text-white text-[15px] font-semibold flex items-center justify-center gap-2"
            style={{ boxShadow: "0 8px 16px -4px rgba(94,92,230,0.3)" }}
          >
            CLAIM REWARD
          </button>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-3.5 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[15px] font-semibold"
          >
            TRY AGAIN
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="w-full py-3.5 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[15px] font-semibold flex items-center justify-center gap-2"
          >
            NEXT MISSION <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </div>
  );
}
