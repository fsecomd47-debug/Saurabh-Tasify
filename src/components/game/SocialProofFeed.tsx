"use client";

import React from "react";
import { motion } from "framer-motion";
import { Award, CheckCircle2, Crown, ShoppingBag, TrendingUp, Zap, Flame, Star, Trophy } from "lucide-react";
import { useActivity } from "@/hooks/queries";
import { formatCurrency } from "@/lib/format";

const ACTION_META: Record<string, { icon: React.ComponentType<any>; color: string; bg: string; gradient: string }> = {
  TASK_COMPLETED: {
    icon: Zap,
    color: "#059669",
    bg: "#D1FAE5",
    gradient: "linear-gradient(145deg, #D1FAE5, #A7F3D0)",
  },
  LEVEL_UP: {
    icon: Star,
    color: "#D97706",
    bg: "#FEF3C7",
    gradient: "linear-gradient(145deg, #FEF3C7, #FDE68A)",
  },
  ACHIEVEMENT_UNLOCKED: {
    icon: Trophy,
    color: "#B45309",
    bg: "#FEF3C7",
    gradient: "linear-gradient(145deg, #FEF3C7, #FCD34D)",
  },
  STORE_PURCHASE: {
    icon: ShoppingBag,
    color: "#7C3AED",
    bg: "#EDE9FE",
    gradient: "linear-gradient(145deg, #EDE9FE, #DDD6FE)",
  },
  QUEST_COMPLETED: {
    icon: Crown,
    color: "#D97706",
    bg: "#FEF3C7",
    gradient: "linear-gradient(145deg, #FEF3C7, #FDE68A)",
  },
  STREAK_MILESTONE: {
    icon: Flame,
    color: "#DC2626",
    bg: "#FEE2E2",
    gradient: "linear-gradient(145deg, #FEE2E2, #FECACA)",
  },
};

function describe(item: { type: string; metadata: Record<string, unknown> | null; entityId?: string | null }): string {
  const m = item.metadata ?? {};
  switch (item.type) {
    case "TASK_COMPLETED":
      return ` completed ${String(m.title ?? "a mission")}`;
    case "LEVEL_UP":
      return ` reached Level ${String(m.level ?? item.entityId ?? "?")}`;
    case "ACHIEVEMENT_UNLOCKED":
      return ` unlocked ${String(m.name ?? "an achievement")}`;
    case "STORE_PURCHASE":
      return ` redeemed ${String(m.name ?? "an item")} from the Vault`;
    case "QUEST_COMPLETED":
      return ` finished ${String(m.title ?? item.entityId ?? "a quest")}`;
    case "STREAK_MILESTONE":
      return ` hit a ${String(m.streak ?? item.entityId ?? "")}-day streak`;
    case "PLAYER_CREATED":
      return " joined the arena";
    default:
      return " is active";
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export const SocialProofFeed: React.FC = () => {
  const { data: items = [] } = useActivity();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="px-5 mt-6 pb-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-[#5E5CE6]" strokeWidth={2.2} />
        <h2 className="text-[15px] font-bold text-[#1C1C1E]">Live Activity</h2>
      </div>

      <div className="space-y-2">
        {items.slice(0, 6).map((item, i) => {
          const meta = ACTION_META[item.type] ?? { icon: Zap, color: "#8E8E93", bg: "#F2F2F7", gradient: "linear-gradient(145deg, #F2F2F7, #E5E7EB)" };
          const Icon = meta.icon;
          const amount =
            item.type === "TASK_COMPLETED"
              ? (item.metadata?.reward as number | undefined)
              : item.type === "STORE_PURCHASE"
              ? undefined
              : undefined;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="rounded-[16px] px-4 py-3 flex items-center gap-3"
              style={{
                background: "white",
                boxShadow: "inset 0 2px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.04)",
              }}
            >
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                style={{
                  background: meta.gradient,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 3px ${meta.color}15`,
                }}
              >
                <Icon className="w-4 h-4" style={{ color: meta.color }} strokeWidth={2.4} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#1C1C1E] truncate">
                  {item.playerName}
                  <span className="font-normal text-[#8E8E93]">{describe(item)}</span>
                </p>
                <p className="text-[10px] text-[#AEAEB2]">{timeAgo(item.createdAt)} ago</p>
              </div>
              {amount ? (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#065F46] tabular-nums px-2 py-0.5 rounded-full"
                  style={{ background: "#D1FAE5" }}
                >
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="4.5" fill="#10B981" stroke="#047857" strokeWidth="0.5" />
                    <text x="5" y="7" textAnchor="middle" fill="#064E3B" fontWeight="800" fontSize="5" fontFamily="system-ui">S</text>
                  </svg>
                  +{formatCurrency(amount)}
                </span>
              ) : (
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: meta.color }} strokeWidth={2.2} />
              )}
            </motion.div>
          );
        })}
        {items.length === 0 && (
          <div className="rounded-[20px] px-4 py-6 text-center bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
            <p className="text-[12px] text-[#8E8E93]">The arena is quiet. Complete a mission to make noise.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
