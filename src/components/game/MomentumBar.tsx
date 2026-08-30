"use client";

import React from "react";
import { motion } from "framer-motion";
import { Flame, Zap, TrendingUp } from "lucide-react";
import { useSnapshot } from "@/hooks/queries";
import { getStreakStatus, getNextStreakMilestone } from "@/lib/economy/streak-engine";

function SegmentedBar({ progress, color, segments = 7 }: { progress: number; color: string; segments?: number }) {
  const filled = Math.round((progress / 100) * segments);
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-full rounded-[3px] relative overflow-hidden"
          style={{
            background: i < filled ? color : "#E5E7EB",
            boxShadow: i < filled ? `inset 0 1px 0 rgba(255,255,255,0.3), 0 0 6px ${color}40` : "inset 0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          {i < filled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0] }}
              transition={{ duration: 2, delay: i * 0.08, repeat: Infinity, repeatDelay: 4 }}
              className="absolute inset-0"
              style={{ background: "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export const MomentumBar: React.FC = () => {
  const { data } = useSnapshot();
  if (!data) return null;
  const streak = data.streak.current;
  const status = getStreakStatus(streak);
  const milestone = getNextStreakMilestone(streak);
  const pct = Math.min((milestone ? streak / milestone.streak : 1) * 100, 100);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="px-5 mt-4">
      <div
        className="rounded-[20px] p-4"
        style={{
          background: "white",
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[16px]">{status.icon}</span>
            <span className="text-[13px] font-bold" style={{ color: status.color }}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#8E8E93] tabular-nums">
            <Flame className="w-3 h-3 text-[#FF9500]" />
            {streak} day{streak === 1 ? "" : "s"}
          </div>
        </div>

        <div className="w-full h-2.5 rounded-[5px] overflow-hidden" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}>
          <SegmentedBar progress={pct} color="#FF9500" segments={7} />
        </div>

        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-[#8E8E93]">
            {milestone ? `${milestone.streak - streak} more day${milestone.streak - streak === 1 ? "" : "s"} → ${milestone.label}` : "Maximum multiplier achieved"}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#059669] tabular-nums">
            <TrendingUp className="w-3 h-3" /> ×{milestone ? milestone.multiplier.toFixed(1) : "1.5"} next
          </span>
        </div>

        {data.activeBoosts.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-[rgba(0,0,0,0.04)] flex items-center gap-1.5 flex-wrap">
            {data.activeBoosts.map((b) => (
              <span key={b.boostType + b.expiresAt} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EDE9FE] text-[#6D28D9] capitalize">
                <Zap className="w-2.5 h-2.5" />
                {b.boostType.replace("Multiplier", "")} ×{b.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export function WealthStatsRow({ earnedToday }: { earnedToday: number }) {
  return (
    <span>{earnedToday}</span>
  );
}
