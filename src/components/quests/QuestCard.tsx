"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Clock, ChevronRight, Lock, Zap } from "lucide-react";
import type { QuestView } from "@/types/api";
import { QuestProgress } from "./QuestProgress";

function isNearCompletion(quest: QuestView): boolean {
  if (quest.progressPct < 60) return false;
  // One objective is exactly 1 away from target
  return quest.objectives.some(
    (o) => !o.completed && o.target > 1 && o.current === o.target - 1
  );
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  easy: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
  medium: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
  hard: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
  elite: { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
};

const CATEGORY_ICONS: Record<string, string> = {
  daily: "📅",
  weekly: "📆",
  chain: "🔗",
  special: "✨",
};

type QuestCardProps = {
  quest: QuestView;
  onClaim?: (questId: string) => void;
  onTap?: () => void;
  compact?: boolean;
};

export const QuestCard: React.FC<QuestCardProps> = ({ quest, onClaim, onTap, compact = false }) => {
  const isComplete = quest.status === "completed";
  const isClaimed = quest.status === "claimed";
  const isExpired = quest.status === "expired";
  const isActive = quest.status === "active";
  const nearComplete = isActive && isNearCompletion(quest);
  const diff = DIFFICULTY_COLORS[quest.difficulty] ?? DIFFICULTY_COLORS.easy;

  if (compact) {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={onTap}
        className={`rounded-[16px] p-3.5 relative overflow-hidden ${onTap ? "cursor-pointer" : ""}`}
        style={{
          background: nearComplete
            ? "linear-gradient(135deg, #FFF8EB, #FFFFFF)"
            : isClaimed ? "#F9FAFB" : "white",
          boxShadow: nearComplete
            ? "0 2px 16px rgba(255,149,0,.18), 0 0 0 1px rgba(255,149,0,.15)"
            : isComplete && !isClaimed
              ? "0 2px 12px rgba(94,92,230,.15)"
              : "0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03)",
          border: nearComplete
            ? "1.5px solid rgba(255,149,0,.25)"
            : isComplete && !isClaimed ? "1.5px solid #5E5CE6" : "1px solid rgba(0,0,0,.04)",
          opacity: isExpired ? 0.5 : 1,
        }}
      >
        <div className="flex items-start gap-3">
          {/* Emoji */}
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 text-[18px]"
            style={{
              background: isClaimed ? "#F3F4F6" : isComplete ? "#EDEDFC" : "#F9FAFB",
            }}
          >
            {isClaimed ? <Check className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2.5} /> : quest.emoji}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-[13px] font-bold text-[#1C1C1E] truncate">{quest.title}</h4>
              {nearComplete && (
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="px-1.5 py-0.5 rounded-full text-[7px] font-black bg-[#FFF0CC] text-[#FF9500] flex-shrink-0 flex items-center gap-0.5"
                >
                  <Zap className="w-2.5 h-2.5" fill="#FF9500" /> 1 MORE
                </motion.span>
              )}
              {isComplete && !isClaimed && !nearComplete && (
                <span className="px-1.5 py-0.5 rounded-full text-[7px] font-bold bg-[#5E5CE6] text-white flex-shrink-0">
                  DONE
                </span>
              )}
              {isClaimed && (
                <span className="px-1.5 py-0.5 rounded-full text-[7px] font-bold bg-[#D1FAE5] text-[#065F46] flex-shrink-0">
                  CLAIMED
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8E8E93] mt-0.5 line-clamp-1">{quest.description}</p>

            {/* Progress */}
            {isActive && (
              <div className="mt-2">
                <QuestProgress objectives={quest.objectives} />
              </div>
            )}
          </div>

          {/* Reward / Action */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {isComplete && !isClaimed && onClaim ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onClaim(quest.id)}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold text-white"
                style={{ background: "#5E5CE6", boxShadow: "0 2px 8px rgba(94,92,230,.3)" }}
              >
                CLAIM
              </motion.button>
            ) : (
              <span className="text-[11px] font-bold text-[#5E5CE6] tabular-nums">
                +{quest.reward.st} ST
              </span>
            )}
            {quest.expiresAt && isActive && (
              <span className="text-[9px] text-[#8E8E93] flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatTimeLeft(quest.expiresAt)}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Full card
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
      className={`rounded-[20px] p-4 relative overflow-hidden ${onTap ? "cursor-pointer" : ""}`}
      style={{
        background: nearComplete
          ? "linear-gradient(135deg, #FFF8EB 0%, #FFFFFF 60%)"
          : isClaimed ? "#F9FAFB" : "white",
        boxShadow: nearComplete
          ? "0 4px 24px rgba(255,149,0,.15), 0 0 0 1.5px rgba(255,149,0,.12)"
          : isComplete && !isClaimed
            ? "0 4px 20px rgba(94,92,230,.15)"
            : "0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03)",
        border: nearComplete
          ? "1.5px solid rgba(255,149,0,.2)"
          : isComplete && !isClaimed ? "1.5px solid #5E5CE6" : "1px solid rgba(0,0,0,.04)",
        opacity: isExpired ? 0.5 : 1,
      }}
    >
      {/* Near-complete shimmer */}
      {nearComplete && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ x: [-100, 500], y: [-10, 10] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
            className="absolute -top-10 -left-10 w-16 h-32 bg-[#FFD700]/8 rounded-full blur-xl"
          />
        </div>
      )}

      {/* Category & Difficulty badges */}
      <div className="flex items-center gap-1.5 mb-2.5 relative">
        <span className="text-[10px]">{CATEGORY_ICONS[quest.category] ?? "📋"}</span>
        <span
          className="px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider"
          style={{ background: diff.bg, color: diff.text }}
        >
          {quest.difficulty}
        </span>
        {nearComplete && (
          <motion.span
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="px-2 py-0.5 rounded-full text-[8px] font-black bg-[#FFF0CC] text-[#FF9500] flex items-center gap-0.5"
          >
            <Zap className="w-2.5 h-2.5" fill="#FF9500" /> 1 MORE
          </motion.span>
        )}
        {quest.chainId && (
          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-[#EDEDFC] text-[#5E5CE6]">
            Chain {quest.chainIndex != null ? quest.chainIndex + 1 : ""}
          </span>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[24px] flex-shrink-0"
          style={{
            background: isClaimed ? "#F3F4F6" : isComplete ? "#EDEDFC" : "#F9FAFB",
          }}
        >
          {isClaimed ? <Check className="w-6 h-6 text-[#9CA3AF]" strokeWidth={2.5} /> : quest.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-[#1C1C1E]">{quest.title}</h3>
          <p className="text-[12px] text-[#8E8E93] mt-0.5">{quest.description}</p>
        </div>
      </div>

      {/* Objectives */}
      {isActive && (
        <div className="space-y-2 mb-3">
          {quest.objectives.map((obj) => (
            <div key={obj.key} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: obj.completed ? "#34C759" : "#D1D5DB",
                  background: obj.completed ? "#34C759" : "transparent",
                }}
              >
                {obj.completed && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </div>
              <span className={`text-[12px] flex-1 ${obj.completed ? "text-[#8E8E93] line-through" : "text-[#1C1C1E]"}`}>
                {obj.label}
              </span>
              <span className="text-[11px] font-bold tabular-nums text-[#6B7280]">
                {obj.current}/{obj.target}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {isActive && <QuestProgress objectives={quest.objectives} />}

      {/* Reward + Action */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(0,0,0,.04)]">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-bold text-[#5E5CE6]">+{quest.reward.st} ST</span>
          <span className="text-[12px] font-bold text-[#34C759]">+{quest.reward.xp} XP</span>
          {quest.reward.petXp && (
            <span className="text-[12px] font-bold text-[#FF9500]">+{quest.reward.petXp} Pet XP</span>
          )}
          {quest.reward.badgeId && (
            <span className="text-[10px] font-bold text-[#5E5CE6] bg-[#EDEDFC] px-1.5 py-0.5 rounded-full">Badge</span>
          )}
        </div>

        {isComplete && !isClaimed && onClaim ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onClaim(quest.id)}
            className="px-4 py-2 rounded-full text-[12px] font-bold text-white flex items-center gap-1"
            style={{ background: "#5E5CE6", boxShadow: "0 4px 12px rgba(94,92,230,.3)" }}
          >
            CLAIM <ChevronRight className="w-3.5 h-3.5" />
          </motion.button>
        ) : quest.expiresAt && isActive ? (
          <span className="text-[10px] text-[#8E8E93] flex items-center gap-0.5">
            <Clock className="w-3 h-3" /> {formatTimeLeft(quest.expiresAt)}
          </span>
        ) : isClaimed ? (
          <span className="text-[10px] font-bold text-[#9CA3AF]">CLAIMED</span>
        ) : null}
      </div>
    </motion.div>
  );
};

function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${mins}m`;
}
