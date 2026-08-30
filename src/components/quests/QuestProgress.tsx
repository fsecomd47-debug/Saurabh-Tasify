"use client";

import React from "react";
import { motion } from "framer-motion";
import type { QuestObjectiveView } from "@/types/api";

type QuestProgressProps = {
  objectives: QuestObjectiveView[];
  size?: "sm" | "md";
};

export const QuestProgress: React.FC<QuestProgressProps> = ({ objectives, size = "sm" }) => {
  if (objectives.length === 0) return null;

  const totalPct = objectives.reduce((acc, obj) => {
    return acc + Math.min(obj.current / obj.target, 1);
  }, 0) / objectives.length;
  const pct = Math.round(totalPct * 100);
  const isComplete = pct >= 100;

  const h = size === "sm" ? 4 : 6;

  return (
    <div className="relative">
      <div
        className="w-full rounded-full overflow-hidden"
        style={{
          height: h,
          background: "#F3F4F6",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className="h-full rounded-full"
          style={{
            background: isComplete
              ? "linear-gradient(90deg, #34C759, #30D158)"
              : "linear-gradient(90deg, #5E5CE6, #7C5CFF)",
          }}
        />
      </div>
      {size === "md" && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-[#8E8E93]">
            {objectives.length === 1
              ? `${objectives[0].current}/${objectives[0].target}`
              : `${objectives.filter((o) => o.completed).length}/${objectives.length} objectives`}
          </span>
          <span className="text-[9px] font-bold text-[#6B7280] tabular-nums">{pct}%</span>
        </div>
      )}
    </div>
  );
};
