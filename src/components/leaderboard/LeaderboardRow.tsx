"use client";

import React from "react";
import { motion } from "framer-motion";
import { Crown, Trophy, Medal, Flame, TrendingUp, TrendingDown, Minus, User } from "lucide-react";
import type { LeaderboardRow as LeaderboardRowType } from "@/types/api";
import { TIERS } from "@/lib/catalog/data";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ─────────── Row ─────────── */

type RowProps = {
  row: LeaderboardRowType;
  delay?: number;
  onTap?: (userId: string) => void;
};

export function LeaderboardRow({ row, delay = 0, onTap }: RowProps) {
  const tierColor = TIERS.find((t) => t.name === row.tier)?.color ?? "#94A3B8";
  const score = row.rank > 0 ? row.rank : "—";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25, ease: "easeOut" }}
      onClick={() => onTap?.(row.userId)}
      className={cn(
        "rounded-2xl px-3.5 py-3 flex items-center gap-2.5 transition-all active:scale-[0.98]",
        row.isCurrentUser
          ? "bg-[#FAF7FF]"
          : "bg-white"
      )}
      style={{
        boxShadow: "0 2px 8px -2px rgba(0,0,0,.06)",
        border: row.isCurrentUser
          ? "1.5px solid rgba(107,56,195,.3)"
          : "1px solid rgba(0,0,0,.04)",
      }}
    >
      {/* Rank */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold flex-shrink-0 font-display tabular-nums",
        row.rank === 1 ? "bg-amber-50 text-amber-600" :
        row.rank === 2 ? "bg-slate-100 text-slate-500" :
        row.rank === 3 ? "bg-orange-50 text-orange-500" :
        "bg-transparent text-slate-400"
      )}>
        {row.rank <= 3 ? (
          row.rank === 1 ? <Crown className="w-3.5 h-3.5" /> :
          row.rank === 2 ? <Trophy className="w-3.5 h-3.5" /> :
          <Medal className="w-3.5 h-3.5" />
        ) : score}
      </div>

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-[17px] flex-shrink-0"
        style={{
          background: row.isCurrentUser
            ? "linear-gradient(135deg,#6B38C3,#8A4FFF)"
            : "#F3F0FF",
        }}
      >
        {row.avatarEmoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold text-slate-900 font-display truncate leading-tight">
          {row.isCurrentUser ? `${row.displayName} (you)` : row.displayName}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="text-[9px] font-bold font-ui capitalize"
            style={{ color: tierColor }}
          >
            {row.tier}
          </span>
          <span className="text-[9px] text-slate-400 font-ui">
            · LVL {row.level}
          </span>
          {row.streak > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-orange-400 font-ui tabular-nums">
              <Flame className="w-2.5 h-2.5" />
              {row.streak}
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="text-right flex-shrink-0">
        <p className="text-[12.5px] font-extrabold text-slate-900 font-display tabular-nums leading-tight">
          {formatCurrency(row.totalAssets)}
        </p>
        <p className="text-[8.5px] font-bold text-emerald-500 font-ui inline-flex items-center gap-0.5">
          <TrendingUp className="w-2 h-2" /> ST
        </p>
      </div>
    </motion.div>
  );
}

/* ─────────── Podium ─────────── */

type PodiumProps = {
  top3: LeaderboardRowType[];
  onTap?: (userId: string) => void;
};

export function LeaderboardPodium({ top3, onTap }: PodiumProps) {
  // Display order: 2nd, 1st, 3rd
  const order = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const heights = [72, 96, 56];
  const icons = [Trophy, Crown, Medal];
  const barColors = [
    "linear-gradient(180deg,#E2E8F0,#CBD5E1)",
    "linear-gradient(180deg,#FFD700,#EAB308)",
    "linear-gradient(180deg,#FDBA74,#FB923C)",
  ];
  const rankOrder = top3.length >= 3 ? [2, 1, 3] : top3.map((_, i) => i + 1);

  return (
    <div className="px-5 mt-3">
      <div className="flex items-end justify-center gap-2">
        {order.map((p, i) => {
          const realRank = rankOrder[i];
          const Icon = icons[realRank - 1] ?? Crown;
          const barColor = barColors[realRank - 1] ?? barColors[0];
          const isCenter = realRank === 1;

          return (
            <motion.div
              key={p.userId}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.35, ease: "easeOut" }}
              className="flex flex-col items-center cursor-pointer"
              style={{ width: "30%" }}
              onClick={() => onTap?.(p.userId)}
            >
              {/* Avatar + crown */}
              <div className={cn("relative mb-1", isCenter && "-mt-5")}>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    background: p.isCurrentUser
                      ? "linear-gradient(135deg,#6B38C3,#8A4FFF)"
                      : "#fff",
                    boxShadow: `0 ${isCenter ? 14 : 8}px 28px -6px rgba(234,179,8,.45)`,
                    border: `2px solid ${isCenter ? "#FFD700" : realRank === 2 ? "#C0C0C0" : "#CD7F32"}55`,
                  }}
                >
                  {p.avatarEmoji}
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5",
                        realRank === 1 ? "text-amber-400" :
                        realRank === 2 ? "text-slate-300" :
                        "text-orange-400"
                      )}
                      strokeWidth={2.2}
                    />
                  </span>
                </div>
              </div>

              <p className="text-[11px] font-extrabold text-slate-900 font-display truncate max-w-full text-center">
                {p.isCurrentUser ? "YOU" : p.displayName}
              </p>
              <p className="text-[9px] text-slate-400 font-ui tabular-nums">
                {formatCurrency(p.totalAssets)}
              </p>

              {/* Bar */}
              <div
                className="w-full rounded-t-xl mt-1.5"
                style={{ height: heights[i], background: barColor }}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Your Rank Card ─────────── */

type YourRankProps = {
  me: LeaderboardRowType;
  totalPlayers: number;
  mode: "global" | "weekly";
  onTap?: (userId: string) => void;
};

export function YourRankCard({ me, totalPlayers, mode, onTap }: YourRankProps) {
  const rankDisplay = me.rank > 0 ? `#${me.rank}` : "—";
  const score = mode === "weekly" ? me.weeklyEarned : me.totalAssets;
  const scoreLabel = mode === "weekly" ? "earned this week" : "total assets";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-5 mt-2 cursor-pointer"
      onClick={() => onTap?.(me.userId)}
    >
      <div
        className="rounded-3xl p-4"
        style={{
          background: "linear-gradient(135deg,#6B38C3,#4C1D95)",
          boxShadow: "0 16px 40px -12px rgba(107,56,195,.5)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[26px] font-extrabold text-white/90 font-display tabular-nums">
            {rankDisplay}
          </span>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: "rgba(255,255,255,.15)" }}
          >
            {me.avatarEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-extrabold text-white font-display truncate">
              {me.displayName}
            </p>
            <p className="text-[11px] font-bold text-violet-200 font-ui">
              {formatCurrency(score)} ST · {scoreLabel}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-orange-300">
              <Flame className="w-4 h-4" />
              <span className="text-[12px] font-extrabold font-display tabular-nums">
                {me.streak}
              </span>
            </div>
            <p className="text-[9px] text-violet-300 font-ui mt-0.5">
              {me.level > 0 ? `LVL ${me.level}` : "New"} · {totalPlayers} players
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────── Rival Card ─────────── */

type RivalCardProps = {
  rival: LeaderboardRowType;
  meRank: number;
  mode: "global" | "weekly";
  onTap?: (userId: string) => void;
};

export function RivalCard({ rival, meRank, mode, onTap }: RivalCardProps) {
  const gap = rival.rank - meRank;
  const score = mode === "weekly" ? rival.weeklyEarned : rival.totalAssets;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3 }}
      className="mx-5 mt-3"
    >
      <div
        className="rounded-2xl p-3.5 bg-white cursor-pointer active:scale-[0.98] transition-transform"
        style={{
          boxShadow: "0 2px 12px -2px rgba(234,179,8,.15)",
          border: "1px solid rgba(234,179,8,.15)",
        }}
        onClick={() => onTap?.(rival.userId)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-[17px] flex-shrink-0">
            {rival.avatarEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-extrabold text-slate-900 font-display truncate">
              {rival.displayName}
            </p>
            <p className="text-[9.5px] text-slate-500 font-ui">
              #{rival.rank} · {formatCurrency(score)} ST
            </p>
          </div>
          <div className={cn(
            "flex items-center gap-1",
            gap < 0 ? "text-amber-500" : "text-slate-400"
          )}>
            {gap < 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span className="text-[11px] font-bold font-display">
              {gap < 0 ? `${Math.abs(gap)} ahead` : gap > 0 ? `${gap} behind` : "tied"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────── Empty State ─────────── */

export function LeaderboardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mb-4">
        <User className="w-8 h-8 text-violet-300" />
      </div>
      <p className="text-[14px] font-bold text-slate-900 font-display text-center">
        No players yet
      </p>
      <p className="text-[12px] text-slate-400 font-ui text-center mt-1">
        Complete onboarding to join the leaderboard
      </p>
    </div>
  );
}
