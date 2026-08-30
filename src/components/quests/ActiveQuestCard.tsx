"use client";

import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, Zap, Target } from "lucide-react";
import { useActiveQuest } from "@/hooks/queries";
import { useUIStore } from "@/store/ui-store";
import { QuestProgress } from "./QuestProgress";

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";

export function ActiveQuestCard() {
  const { data: quest, isLoading } = useActiveQuest();
  const openModal = useUIStore((s) => s.openModal);

  if (isLoading) {
    return (
      <div className="px-5 mt-4">
        <div className="h-20 rounded-[20px] bg-white animate-pulse" style={{ boxShadow: CARD_SHADOW }} />
      </div>
    );
  }

  if (!quest) return null;

  const isNearComplete = quest.progressPct >= 75;
  const isAlmostDone = quest.progressPct >= 90;
  const remaining = quest.objectives.filter((o) => !o.completed);
  const nextObj = remaining[0];

  // Check if exactly 1 objective is left with 1 step to go
  const oneMoreObj = remaining.length === 1 && remaining[0].target - remaining[0].current === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="px-5 mt-4"
    >
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => {}}
        className="w-full text-left"
      >
        <div
          className="rounded-[20px] p-4 flex items-center gap-3 overflow-hidden relative"
          style={{
            background: isNearComplete
              ? isAlmostDone
                ? "linear-gradient(135deg, #FF9500 0%, #FF6B00 50%, #E85D00 100%)"
                : "linear-gradient(135deg, #5E5CE6 0%, #4A48C9 50%, #3A38A8 100%)"
              : "white",
            boxShadow: isNearComplete
              ? isAlmostDone
                ? "0 4px 24px rgba(255,149,0,.35), inset 0 1px 0 rgba(255,255,255,.15)"
                : "0 4px 20px rgba(94,92,230,0.3), inset 0 1px 0 rgba(255,255,255,0.15)"
              : CARD_SHADOW,
          }}
        >
          {/* Shimmer for near-complete */}
          {isNearComplete && (
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{ x: [-100, 400], y: [-20, 20] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                className="absolute -top-10 -left-10 w-20 h-40 bg-white/10 rounded-full blur-xl"
              />
            </div>
          )}

          {/* Emoji */}
          <div
            className="relative w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{
              background: isNearComplete ? "rgba(255,255,255,0.2)" : "#EDEDFC",
            }}
          >
            <span className="text-[18px]">{quest.emoji}</span>
            {oneMoreObj && isNearComplete && (
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FFD700] flex items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <span className="text-[7px] font-black text-[#1C1C1E]">1</span>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 relative">
            <div className="flex items-center gap-1.5">
              <h3
                className="text-[13px] font-bold"
                style={{ color: isNearComplete ? "#FFFFFF" : "#1C1C1E" }}
              >
                {quest.title}
              </h3>
              {isAlmostDone && (
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="px-1.5 py-0.5 rounded-full text-[7px] font-black bg-white/20 text-white"
                >
                  ALMOST!
                </motion.span>
              )}
              {oneMoreObj && isNearComplete && !isAlmostDone && (
                <motion.span
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="px-1.5 py-0.5 rounded-full text-[7px] font-black bg-white/20 text-white flex items-center gap-0.5"
                >
                  <Zap className="w-2.5 h-2.5" fill="#FFD700" /> 1 MORE
                </motion.span>
              )}
            </div>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: isNearComplete ? "rgba(255,255,255,0.7)" : "#8E8E93" }}
            >
              {oneMoreObj
                ? `${remaining[0].label} — just 1 more!`
                : nextObj
                  ? `${nextObj.label} — ${nextObj.current}/${nextObj.target}`
                  : `${quest.progressPct}% complete`}
            </p>
            <div className="mt-1.5">
              <QuestProgress objectives={quest.objectives} />
            </div>
          </div>

          {/* CTA */}
          <div className="relative flex-shrink-0">
            {isAlmostDone ? (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center"
              >
                <Zap className="w-4 h-4 text-white" fill="#FFD700" />
              </motion.div>
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: isNearComplete ? "rgba(255,255,255,0.2)" : "#F2F2F7",
                }}
              >
                <ChevronRight
                  className="w-4 h-4"
                  style={{ color: isNearComplete ? "#FFFFFF" : "#8E8E93" }}
                />
              </div>
            )}
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}
