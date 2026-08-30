"use client";

/**
 * PDR-4 §103/§121/§122: Review is a human process on our side.
 * Users see honest status and can add context — they never decide
 * their own verification outcome.
 */

import React from "react";
import { motion } from "framer-motion";
import { Clock3, ShieldCheck, MessageSquare } from "lucide-react";

type Props = {
  missionId: string;
  taskTitle: string;
  verificationMode: string;
  metadata?: Record<string, unknown>;
};

export function MissionReviewCard({ missionId, taskTitle, verificationMode }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[20px] p-6"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)" }}
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-[#EDF4FF] flex items-center justify-center mx-auto mb-4">
          <Clock3 className="w-8 h-8 text-[#5E9EFF]" />
        </div>
        <h3 className="text-[18px] font-bold text-[#1C1C1E] mb-1">EVIDENCE RECEIVED</h3>
        <p className="text-[13px] text-[#8E8E93]">Status: UNDER REVIEW</p>
      </div>

      <div className="bg-[#F9F9FB] rounded-[14px] p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] text-[#8E8E93]">Task</span>
          <span className="text-[13px] font-semibold text-[#1C1C1E]">{taskTitle}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#8E8E93]">Verification</span>
          <span className="text-[13px] font-semibold text-[#1C1C1E] capitalize">{verificationMode}</span>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-[#F2F7FF] rounded-[14px] p-4 mb-5">
        <ShieldCheck className="w-4 h-4 text-[#5E9EFF] flex-shrink-0 mt-0.5" />
        <p className="text-[12px] leading-relaxed text-[#4a6a8a]">
          We&apos;ll update the mission when verification is complete. Your account is safe and no reward
          is affected while we check.
        </p>
      </div>

      <div className="flex items-center gap-2 text-[#8E8E93]">
        <MessageSquare className="w-3.5 h-3.5" />
        <p className="text-[11px]">Mission ref {missionId.slice(0, 8)}</p>
      </div>
    </motion.div>
  );
}
