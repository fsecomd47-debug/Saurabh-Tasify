"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, CheckCircle2, Trophy } from "lucide-react";
import { useSnapshot, useClaimQuest } from "@/hooks/queries";
import { Loader2 } from "lucide-react";

export const WeeklyGrindCard: React.FC = () => {
  const { data: snap } = useSnapshot();
  const claim = useClaimQuest();

  if (!snap) return null;
  const welcome = snap.quests.find((q) => q.id === "welcome-quest");
  const weekly = snap.quests.find((q) => q.id === "weekly-grind");
  if (!welcome && !weekly) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="px-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-[#5E5CE6]" strokeWidth={2.2} />
        <h2 className="text-[15px] font-bold text-[#1C1C1E]">Active Quests</h2>
      </div>

      <div className="space-y-2.5">
        {[welcome, weekly].filter(Boolean).map((q) => (
          <div
            key={q!.id}
            className="rounded-[20px] p-4"
            style={{
              background: "white",
              boxShadow: "inset 0 2px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg flex-shrink-0">{q!.emoji}</span>
                <p className="text-[13px] font-bold text-[#1C1C1E] truncate">{q!.title}</p>
              </div>
              {q!.completed ? (
                claim.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#5E5CE6]" />
                ) : (
                  <button
                    onClick={() => claim.mutate(q!.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #10B981, #059669)", boxShadow: "0 2px 8px rgba(16,185,129,0.3)" }}
                  >
                    <Trophy className="w-3 h-3" /> CLAIM
                  </button>
                )
              ) : (
                <span className="text-[11px] font-bold tabular-nums text-[#5E5CE6]">
                  {q!.progressPct}%
                </span>
              )}
            </div>

            {!q!.completed ? (
              <>
                <div className="w-full h-2.5 rounded-[5px] overflow-hidden mb-2.5" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${q!.progressPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-[3px]"
                    style={{ background: "linear-gradient(90deg, #5E5CE6, #7C3AED)" }}
                  />
                </div>
                <div className="space-y-1.5">
                  {q!.objectives.map((o) => (
                    <div key={o.label} className="flex items-center gap-2">
                      {o.completed ? (
                        <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5.5L4.5 8L8 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      ) : (
                        <CheckCircle2 className="w-[18px] h-[18px] flex-shrink-0 text-[#D1D5DB]" strokeWidth={2} />
                      )}
                      <span
                        className="text-[11.5px] font-medium"
                        style={{
                          color: o.completed ? "#6B7280" : "#374151",
                        }}
                      >
                        {o.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[12px] font-bold text-[#059669]">All objectives complete — reward ready!</p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};
