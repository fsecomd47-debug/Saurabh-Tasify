"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Lock, Crown } from "lucide-react";
import type { QuestView } from "@/types/api";

type QuestJourneyProps = {
  chainQuests: QuestView[];
};

type NodeStatus = "completed" | "current" | "locked";

export const QuestJourney: React.FC<QuestJourneyProps> = ({ chainQuests }) => {
  if (chainQuests.length === 0) return null;

  // Determine status for each node
  const nodes: { quest: QuestView; status: NodeStatus; index: number }[] = chainQuests.map((q, i) => {
    let status: NodeStatus = "locked";
    if (q.status === "claimed" || q.status === "completed") status = "completed";
    else if (q.status === "active" && i > 0 && chainQuests[i - 1].status === "claimed") status = "current";
    else if (q.status === "active" && i === 0) status = "current";
    return { quest: q, status, index: i };
  });

  // Find current active node
  const currentNodeIdx = nodes.findIndex((n) => n.status === "current");
  const completedCount = nodes.filter((n) => n.status === "completed").length;
  const totalSteps = nodes.length;
  const isChainComplete = completedCount === totalSteps;

  return (
    <div className="relative">
      {/* Chapter header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center"
          style={{ background: "linear-gradient(145deg, #EDEDFC, #D4D4F7)" }}
        >
          <Crown className="w-5 h-5 text-[#5E5CE6]" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-[14px] font-bold text-[#1C1C1E]">The Builder</h3>
          <p className="text-[10px] text-[#8E8E93]">
            {isChainComplete
              ? "Chapter Complete!"
              : `${completedCount} / ${totalSteps} steps completed`}
          </p>
        </div>
      </div>

      {/* Visual path */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-[#E5E7EB]" />

        {/* Animated progress line */}
        {currentNodeIdx >= 0 && (
          <motion.div
            className="absolute left-[15px] top-0 w-[2px] origin-top"
            style={{ background: "linear-gradient(180deg, #34C759, #5E5CE6)" }}
            initial={{ height: 0 }}
            animate={{
              height: `${((currentNodeIdx) / (totalSteps - 1)) * 100}%`,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}

        {/* Nodes */}
        <div className="space-y-1">
          {nodes.map((node, i) => (
            <QuestNode
              key={node.quest.id}
              quest={node.quest}
              status={node.status}
              index={i}
              isLast={i === nodes.length - 1}
              isNearComplete={
                node.status === "current" &&
                node.quest.objectives.some(
                  (o) => o.target > 1 && o.current >= o.target - 1 && !o.completed
                )
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ──── Individual Quest Node ────────────────────────────────── */

function QuestNode({
  quest,
  status,
  index,
  isLast,
  isNearComplete,
}: {
  quest: QuestView;
  status: NodeStatus;
  index: number;
  isLast: boolean;
  isNearComplete: boolean;
}) {
  const isCompleted = status === "completed";
  const isCurrent = status === "current";
  const isLocked = status === "locked";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className={`relative flex items-start gap-3 py-2 ${isLast ? "" : ""}`}
    >
      {/* Node circle */}
      <div className="relative z-10 flex-shrink-0">
        <motion.div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: isCompleted
              ? "#34C759"
              : isCurrent
                ? "linear-gradient(135deg, #5E5CE6, #7C5CFF)"
                : "#F3F4F6",
            boxShadow: isCurrent
              ? "0 0 0 3px rgba(94,92,230,.15), 0 2px 8px rgba(94,92,230,.25)"
              : isCompleted
                ? "0 2px 8px rgba(52,199,89,.25)"
                : "0 1px 3px rgba(0,0,0,.06)",
            border: isLocked ? "2px solid #E5E7EB" : "none",
          }}
          animate={
            isCurrent
              ? {
                  boxShadow: [
                    "0 0 0 3px rgba(94,92,230,.15), 0 2px 8px rgba(94,92,230,.25)",
                    "0 0 0 5px rgba(94,92,230,.08), 0 2px 12px rgba(94,92,230,.35)",
                    "0 0 0 3px rgba(94,92,230,.15), 0 2px 8px rgba(94,92,230,.25)",
                  ],
                }
              : {}
          }
          transition={isCurrent ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
        >
          {isCompleted ? (
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          ) : isLocked ? (
            <Lock className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={2.5} />
          ) : (
            <span className="text-[12px] font-bold text-white">{index + 1}</span>
          )}
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2">
          <h4
            className={`text-[13px] font-bold ${
              isCompleted
                ? "text-[#8E8E93] line-through"
                : isCurrent
                  ? "text-[#1C1C1E]"
                  : "text-[#9CA3AF]"
            }`}
          >
            {quest.title}
          </h4>
          {isNearComplete && isCurrent && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-[#FFF8EB] text-[#FF9500]"
            >
              ALMOST THERE
            </motion.span>
          )}
          {isCurrent && !isNearComplete && (
            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-[#EDEDFC] text-[#5E5CE6]">
              IN PROGRESS
            </span>
          )}
        </div>

        <p
          className={`text-[11px] mt-0.5 ${
            isCompleted ? "text-[#9CA3AF]" : isCurrent ? "text-[#6B7280]" : "text-[#C7C7CC]"
          }`}
        >
          {quest.description}
        </p>

        {/* Progress for current quest */}
        {isCurrent && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, #5E5CE6, #7C5CFF)",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${quest.progressPct}%` }}
                transition={{ type: "spring", damping: 20, stiffness: 200 }}
              />
            </div>
            <span className="text-[9px] font-bold text-[#6B7280] tabular-nums">
              {quest.progressPct}%
            </span>
          </div>
        )}

        {/* Reward preview */}
        {(isCurrent || isLocked) && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#5E5CE6]">+{quest.reward.st} ST</span>
            <span className="text-[10px] font-bold text-[#34C759]">+{quest.reward.xp} XP</span>
            {quest.reward.badgeId && (
              <span className="text-[9px] font-bold text-[#FF9500] bg-[#FFF8EB] px-1.5 py-0.5 rounded-full">
                Badge
              </span>
            )}
          </div>
        )}

        {/* Completed reward summary */}
        {isCompleted && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[#34C759]">✓ Claimed</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
