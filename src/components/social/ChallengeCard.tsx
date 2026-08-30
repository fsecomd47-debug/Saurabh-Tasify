"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { ChallengeDTO } from "@/types/api";
import { useRematchChallenge } from "@/hooks/queries";
import { motion } from "framer-motion";

type ChallengeCardProps = {
  challenge: ChallengeDTO;
  onClick?: () => void;
};

function formatTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

const METRIC_LABELS: Record<string, string> = {
  verified_st: "Verified ST",
  missions: "Missions",
  focus_minutes: "Focus Minutes",
  fitness_missions: "Fitness",
};

export const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onClick }) => {
  const rematch = useRematchChallenge();
  const isActive = challenge.status === "active";
  const isPending = challenge.status === "pending";
  const isCompleted = challenge.status === "completed";
  const isDeclined = challenge.status === "declined";
  const canRematch = (isCompleted || isDeclined) && challenge.isMe;

  const creatorAhead = challenge.creatorScore >= challenge.inviteeScore;
  const maxScore = Math.max(challenge.creatorScore, challenge.inviteeScore, 1);
  const creatorPct = (challenge.creatorScore / maxScore) * 100;
  const inviteePct = (challenge.inviteeScore / maxScore) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        "rounded-[20px] bg-white border border-[rgba(0,0,0,0.04)] p-4 cursor-pointer transition-all duration-200",
        "active:scale-[0.98] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        isDeclined && "opacity-60"
      )}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)" }}
    >
      {/* Title + Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-[#1C1C1E]">{challenge.title}</span>
        </div>
        <span
          className={cn(
            "text-[11px] font-bold px-2 py-0.5 rounded-full",
            isActive && "bg-[#E8F5E9] text-[#34C759]",
            isPending && "bg-[#FFF8E1] text-[#F59E0B]",
            isCompleted && "bg-[#EDE9FE] text-[#5E5CE6]",
            isDeclined && "bg-[#F2F2F7] text-[#8E8E93]"
          )}
        >
          {isActive ? "ACTIVE" : isPending ? "PENDING" : isCompleted ? "DONE" : "DECLINED"}
        </span>
      </div>

      {/* Players */}
      <div className="flex items-center gap-3 mb-3">
        {/* Creator */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] flex items-center justify-center text-[14px] flex-shrink-0">
              {challenge.creator.avatarEmoji}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-[#1C1C1E] truncate">
                {challenge.creator.displayName}
              </div>
              <div className="text-[12px] font-bold text-[#5E5CE6]">
                {challenge.creatorScore}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${creatorPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-[#5E5CE6] rounded-full"
            />
          </div>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center flex-shrink-0">
          <span className="text-[12px] font-bold text-[#8E8E93]">VS</span>
          {isActive && challenge.timeRemaining && (
            <span className="text-[10px] font-bold text-[#F59E0B] mt-0.5">
              {challenge.timeRemaining}
            </span>
          )}
        </div>

        {/* Invitee */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FEE2E2] to-[#FECACA] flex items-center justify-center text-[14px] flex-shrink-0">
              {challenge.invitee.avatarEmoji}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-[#1C1C1E] truncate">
                {challenge.invitee.displayName}
              </div>
              <div className="text-[12px] font-bold text-[#F59E0B]">
                {challenge.inviteeScore}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${inviteePct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full bg-[#F59E0B] rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[12px] text-[#8E8E93]">
        <span>{METRIC_LABELS[challenge.metric] ?? challenge.metric}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold">+{challenge.rewardSt} ST</span>
          {canRematch && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                rematch.mutate(challenge.id);
              }}
              disabled={rematch.isPending}
              className="px-3 py-1 rounded-full bg-[#5E5CE6] text-white text-[11px] font-bold"
            >
              {rematch.isPending ? "..." : "REMATCH"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
