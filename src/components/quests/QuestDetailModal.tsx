"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, ChevronRight, Check, Lock } from "lucide-react";
import { QuestProgress } from "./QuestProgress";
import type { QuestView } from "@/types/api";

type QuestDetailModalProps = {
  quest: QuestView;
  onClose: () => void;
  onClaim?: (questId: string) => void;
  onStartMission?: () => void;
};

const DIFFICULTY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  easy: { bg: "#D1FAE5", text: "#065F46", label: "Easy" },
  medium: { bg: "#FEF3C7", text: "#92400E", label: "Medium" },
  hard: { bg: "#FEE2E2", text: "#991B1B", label: "Hard" },
  elite: { bg: "#EDE9FE", text: "#5B21B6", label: "Elite" },
};

export const QuestDetailModal: React.FC<QuestDetailModalProps> = ({
  quest,
  onClose,
  onClaim,
  onStartMission,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isComplete = quest.status === "completed";
  const isClaimed = quest.status === "claimed";
  const isActive = quest.status === "active";
  const isExpired = quest.status === "expired";
  const diff = DIFFICULTY_CONFIG[quest.difficulty] ?? DIFFICULTY_CONFIG.easy;

  const completedObjectives = quest.objectives.filter((o) => o.completed).length;
  const totalObjectives = quest.objectives.length;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120]">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)",
          backdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 max-h-[85%] overflow-hidden rounded-t-[24px]"
        style={{ background: "#F9FAFB" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-[3px] rounded-full bg-[#D1D5DB]" />
        </div>

        {/* Scroll content */}
        <div className="overflow-y-auto px-5 pb-6" style={{ maxHeight: "calc(85vh - 16px)" }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-[16px] flex items-center justify-center text-[28px]"
                style={{ background: isClaimed ? "#F3F4F6" : "#FFFFFF" }}
              >
                {isClaimed ? <Check className="w-7 h-7 text-[#9CA3AF]" strokeWidth={2.5} /> : quest.emoji}
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-[#1C1C1E]">{quest.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: diff.bg, color: diff.text }}
                  >
                    {diff.label}
                  </span>
                  <span className="text-[10px] text-[#8E8E93] capitalize">{quest.category}</span>
                </div>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center"
            >
              <X className="w-4 h-4 text-[#636366]" />
            </motion.button>
          </div>

          {/* Description */}
          <p className="text-[13px] text-[#6B7280] mb-4 leading-relaxed">{quest.description}</p>

          {/* Progress */}
          {isActive && (
            <div className="rounded-[16px] bg-white p-4 mb-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Progress</span>
                <span className="text-[13px] font-bold text-[#5E5CE6] tabular-nums">{quest.progressPct}%</span>
              </div>
              <QuestProgress objectives={quest.objectives} />
              <p className="text-[10px] text-[#8E8E93] mt-2">
                {completedObjectives} of {totalObjectives} objectives completed
              </p>
            </div>
          )}

          {/* Objectives */}
          {(isActive || isComplete) && (
            <div className="rounded-[16px] bg-white p-4 mb-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
              <h3 className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-3">Objectives</h3>
              <div className="space-y-3">
                {quest.objectives.map((obj) => (
                  <div key={obj.key} className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{
                        borderColor: obj.completed ? "#34C759" : "#D1D5DB",
                        background: obj.completed ? "#34C759" : "transparent",
                      }}
                    >
                      {obj.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[12px] ${obj.completed ? "text-[#9CA3AF] line-through" : "text-[#1C1C1E]"}`}>
                        {obj.label}
                      </span>
                    </div>
                    <span className={`text-[11px] font-bold tabular-nums ${obj.completed ? "text-[#34C759]" : "text-[#6B7280]"}`}>
                      {obj.current}/{obj.target}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reward */}
          <div className="rounded-[16px] bg-white p-4 mb-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
            <h3 className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-3">Reward</h3>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[16px]">🪙</span>
                <span className="text-[14px] font-bold text-[#5E5CE6]">{quest.reward.st.toLocaleString()} ST</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[16px]">⚡</span>
                <span className="text-[14px] font-bold text-[#34C759]">{quest.reward.xp} XP</span>
              </div>
              {quest.reward.petXp && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[16px]">🐾</span>
                  <span className="text-[14px] font-bold text-[#FF9500]">{quest.reward.petXp} Pet XP</span>
                </div>
              )}
              {quest.reward.badgeId && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[16px]">🏆</span>
                  <span className="text-[14px] font-bold text-[#5E5CE6]">Badge</span>
                </div>
              )}
            </div>
          </div>

          {/* Timer */}
          {quest.expiresAt && isActive && (
            <div className="rounded-[16px] bg-white p-4 mb-4 flex items-center gap-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
              <Clock className="w-4 h-4 text-[#8E8E93]" />
              <div>
                <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Time Remaining</p>
                <p className="text-[13px] font-bold text-[#1C1C1E]">{formatTimeLeft(quest.expiresAt)}</p>
              </div>
            </div>
          )}

          {/* Chain progress */}
          {quest.chainId && quest.chainIndex != null && (
            <div className="rounded-[16px] bg-white p-4 mb-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
              <h3 className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Chain Progress</h3>
              <p className="text-[13px] font-bold text-[#5E5CE6]">
                Step {quest.chainIndex + 1} of the chain
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {isComplete && !isClaimed && onClaim && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => onClaim(quest.id)}
                className="w-full py-3.5 rounded-[14px] text-[14px] font-bold text-white flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #5E5CE6, #4A48C9)",
                  boxShadow: "0 4px 16px rgba(94,92,230,.3)",
                }}
              >
                CLAIM REWARD <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}

            {isActive && onStartMission && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onStartMission}
                className="w-full py-3.5 rounded-[14px] text-[14px] font-bold text-[#5E5CE6] bg-[#EDEDFC] flex items-center justify-center gap-2"
              >
                START NEXT MISSION <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}

            {isClaimed && (
              <div className="w-full py-3.5 rounded-[14px] text-[13px] font-bold text-[#9CA3AF] bg-[#F2F2F7] text-center">
                CLAIMED
              </div>
            )}

            {isExpired && (
              <div className="w-full py-3.5 rounded-[14px] text-[13px] font-bold text-[#9CA3AF] bg-[#F2F2F7] text-center">
                QUEST ENDED
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
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
