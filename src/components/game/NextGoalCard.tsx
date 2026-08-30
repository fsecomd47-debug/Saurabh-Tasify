"use client";

import React from "react";
import { motion } from "framer-motion";
import { Target, ChevronRight, Trophy, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSnapshot, useCatalog } from "@/hooks/queries";
import { CATALOG_BY_ID } from "@/lib/catalog/data";
import { formatCurrency } from "@/lib/format";

function SegmentedBar({ progress, color, segments = 10 }: { progress: number; color: string; segments?: number }) {
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
          {i < filled && i === filled - 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
              className="absolute inset-0"
              style={{ background: "linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.5) 50%, transparent 80%)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export const NextGoalCard: React.FC = () => {
  const router = useRouter();
  const { data: snap } = useSnapshot();
  const { data: catalog } = useCatalog();

  if (!snap || !catalog) return null;

  const balance = snap.wallet.balance;
  const goalItem = snap.profile.goalItemId ? CATALOG_BY_ID[snap.profile.goalItemId] : null;
  const ownedIds = new Set(snap.inventory.map((i) => i.itemId));
  const nearest = [...catalog.items]
    .filter((i) => !i.owned && i.price > balance && (!i.requiredLevel || snap.progress.level >= i.requiredLevel))
    .sort((a, b) => a.price - b.price)[0];
  const target = goalItem ?? nearest;

  if (target) {
    const needed = Math.max(0, target.price - balance);
    const pct = Math.min(100, Math.round((balance / target.price) * 100));
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="px-5 mt-4">
        <div
          onClick={() => router.push("/vault")}
          className="rounded-[20px] p-4 cursor-pointer"
          style={{
            background: "white",
            boxShadow: "inset 0 2px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-[#5E5CE6]" />
              <h3 className="text-[13px] font-bold text-[#1C1C1E]">{goalItem ? "Your Vault Goal" : "Next Vault Prize"}</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
          </div>
          <p className="text-[14px] font-bold text-[#1C1C1E]">{target.name}</p>
          <div className="mt-2.5 h-2.5 rounded-[5px] overflow-hidden" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}>
            <SegmentedBar progress={pct} color="#5E5CE6" segments={10} />
          </div>
          <p className="mt-1.5 text-[11px] font-bold text-[#8E8E93] tabular-nums">
            {formatCurrency(balance)} / {formatCurrency(target.price)} ST{needed > 0 ? ` · ${formatCurrency(needed)} to go` : " · Ready!"}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }} className="px-5 mt-4">
      <div
        onClick={() => router.push("/leaderboard")}
        className="rounded-[20px] p-4 cursor-pointer flex items-center gap-3"
        style={{
          background: "white",
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.04)",
        }}
      >
        <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: "linear-gradient(145deg, #FEF3C7, #FDE68A)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)" }}>
          <Trophy className="w-5 h-5 text-[#D97706]" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-bold text-[#1C1C1E]">Climb the Ranks</p>
          <p className="text-[11px] text-[#8E8E93]">Complete missions to out-earn rivals</p>
        </div>
        <Flame className="w-4 h-4 text-[#FF9500]" />
      </div>
    </motion.div>
  );
};
