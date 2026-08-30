"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Shield } from "lucide-react";
import type { MissionDTO } from "@/server/services/mission-service";

type Props = {
  mission: MissionDTO;
  onComplete: (result: { duration?: number; confidence: number }) => void;
  onCancel: () => void;
};

export function SelfReportMissionUI({ mission, onComplete, onCancel }: Props) {
  const [state, setState] = useState<"idle" | "confirming" | "done">("idle");

  function handleConfirm() {
    setState("confirming");
    setTimeout(() => {
      onComplete({ confidence: 0.6 });
      setState("done");
    }, 600);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[20px] p-6 mx-5"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)" }}
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-[#F2F2F7] flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-[#5E5CE6]" />
        </div>
        <h3 className="text-[18px] font-bold text-[#1C1C1E] mb-1">SELF-REPORT</h3>
        <p className="text-[13px] text-[#8E8E93]">
          Complete your task, then confirm below. Reward is lower without camera verification.
        </p>
      </div>

      <div className="bg-[#F9F9FB] rounded-[14px] p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] text-[#8E8E93]">Task</span>
          <span className="text-[13px] font-semibold text-[#1C1C1E]">{mission.taskTitle}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] text-[#8E8E93]">Difficulty</span>
          <span className="text-[13px] font-semibold text-[#1C1C1E] capitalize">{mission.difficulty}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#8E8E93]">Reward</span>
          <span className="text-[13px] font-semibold text-[#FF9500]">{mission.rewardStPreview} ST</span>
        </div>
      </div>

      <div className="bg-[#FFF8EB] rounded-[14px] p-3 mb-5">
        <p className="text-[12px] text-[#8E8E93] text-center">
          Self-reported completions receive ~60% of displayed reward (no camera verification).
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[13px] font-bold"
        >
          CANCEL
        </button>
        <button
          onClick={handleConfirm}
          disabled={state === "confirming" || state === "done"}
          className="flex-1 py-3 rounded-[14px] bg-[#34C759] text-white text-[13px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {state === "confirming" ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {state === "confirming" ? "CONFIRMING..." : "CONFIRM"}
        </button>
      </div>
    </motion.div>
  );
}
