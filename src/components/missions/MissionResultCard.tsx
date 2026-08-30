"use client";

/**
 * PDR-4 §100-103: Mission Result Cards
 * Renders the appropriate result screen based on verification outcome.
 * - Success: Shows earned rewards with progress
 * - Uncertain: Offers retry or alternative evidence
 * - Failure: Shows respectful failure message
 * - Review: Shows pending review status
 */

import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  RotateCcw,
  Trophy,
  Flame,
  Target,
} from "lucide-react";

type MissionResultCardProps = {
  status: "passed" | "failed" | "uncertain" | "review";
  stGained: number;
  xpGained: number;
  levelUp?: boolean;
  newLevel?: number;
  reasonCode?: string;
  onClaim?: () => void;
  onRetry?: () => void;
  onNext?: () => void;
  claiming?: boolean;
};

function getResultContent(status: string, reasonCode?: string) {
  switch (status) {
    case "passed":
      return {
        icon: <CheckCircle2 className="w-16 h-16 text-[#34C759]" />,
        title: "MISSION VERIFIED",
        subtitle: "Great work! You earned this.",
        bgColor: "bg-[#E8FAF0]",
      };
    case "uncertain":
      return {
        icon: <AlertCircle className="w-16 h-16 text-[#FF9500]" />,
        title: "WE NEED A CLEARER RESULT",
        subtitle: "We couldn't confidently verify this mission yet.",
        bgColor: "bg-[#FFF4E5]",
      };
    case "review":
      return {
        icon: <Eye className="w-16 h-16 text-[#5E5CE6]" />,
        title: "EVIDENCE RECEIVED",
        subtitle: "Your evidence is being reviewed.",
        bgColor: "bg-[#F0EFFF]",
      };
    case "failed":
    default:
      return {
        icon: <XCircle className="w-16 h-16 text-[#FF3B30]" />,
        title: "MISSION NOT VERIFIED",
        subtitle: "We couldn't confirm enough evidence this time. Your account is safe.",
        bgColor: "bg-[#FFE5E5]",
      };
  }
}

export function MissionResultCard({
  status,
  stGained,
  xpGained,
  levelUp,
  newLevel,
  reasonCode,
  onClaim,
  onRetry,
  onNext,
  claiming,
}: MissionResultCardProps) {
  const content = getResultContent(status, reasonCode);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-[24px] overflow-hidden"
      style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08)" }}
    >
      {/* Header */}
      <div className={`${content.bgColor} px-6 py-8 text-center`}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-4"
        >
          {content.icon}
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[22px] font-bold text-[#1C1C1E] mb-1"
        >
          {content.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[13px] text-[#8E8E93]"
        >
          {content.subtitle}
        </motion.p>
      </div>

      {/* Rewards (passed only) */}
      {status === "passed" && (stGained > 0 || xpGained > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="px-6 py-5 border-b border-[#F2F2F7]"
        >
          <div className="flex items-center justify-center gap-8">
            {stGained > 0 && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="text-[28px] font-bold text-[#FF9500] tabular-nums"
                >
                  +{stGained}
                </motion.div>
                <p className="text-[11px] font-bold text-[#FF9500]/70 tracking-wider">ST</p>
              </div>
            )}
            {xpGained > 0 && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: "spring" }}
                  className="text-[28px] font-bold text-[#5E5CE6] tabular-nums"
                >
                  +{xpGained}
                </motion.div>
                <p className="text-[11px] font-bold text-[#5E5CE6]/70 tracking-wider">XP</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Level Up */}
      {levelUp && newLevel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="px-6 py-4 border-b border-[#F2F2F7] text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <Target className="w-5 h-5 text-[#BF5AF2]" />
            <span className="text-[14px] font-bold text-[#BF5AF2]">LEVEL UP! You are now Level {newLevel}</span>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="px-6 py-5 space-y-2.5">
        {status === "passed" && onClaim && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onClaim}
            disabled={claiming}
            className="w-full h-13 rounded-[14px] bg-[#34C759] text-white text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ boxShadow: "0 8px 16px -4px rgba(52,199,89,0.35)" }}
          >
            {claiming ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <Trophy className="w-5 h-5" />
            )}
            {claiming ? "CLAIMING..." : "CLAIM REWARD"}
          </motion.button>
        )}

        {status === "uncertain" && (
          <div className="space-y-2.5">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onRetry}
              className="w-full h-12 rounded-[14px] bg-[#5E5CE6] text-white text-[14px] font-bold flex items-center justify-center gap-2"
              style={{ boxShadow: "0 8px 16px -4px rgba(94,92,230,0.35)" }}
            >
              <RotateCcw className="w-4 h-4" />
              TRY AGAIN
            </motion.button>
            <button
              onClick={onRetry}
              className="w-full h-11 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[13px] font-bold"
            >
              SUBMIT DIFFERENT EVIDENCE
            </button>
          </div>
        )}

        {status === "review" && (
          <div className="bg-[#F9F9FB] rounded-[14px] p-4 text-center">
            <p className="text-[13px] text-[#8E8E93]">
              We&apos;ll update the mission when verification is complete. Check back later.
            </p>
          </div>
        )}

        {status === "failed" && (
          <div className="space-y-2.5">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onRetry}
              className="w-full h-12 rounded-[14px] bg-[#5E5CE6] text-white text-[14px] font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              TRY AGAIN
            </motion.button>
            <button
              onClick={onNext}
              className="w-full h-11 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[13px] font-bold"
            >
              VIEW OTHER MISSIONS
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
