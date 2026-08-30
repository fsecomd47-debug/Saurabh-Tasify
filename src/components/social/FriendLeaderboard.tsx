"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { FriendLeaderboardRowDTO } from "@/types/api";
import { motion } from "framer-motion";

type FriendLeaderboardProps = {
  rows: FriendLeaderboardRowDTO[];
  onClick?: (userId: string) => void;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export const FriendLeaderboard: React.FC<FriendLeaderboardProps> = ({ rows, onClick }) => {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-[32px]">👥</span>
        <p className="text-[14px] text-[#8E8E93] mt-2 font-medium">No friends yet</p>
        <p className="text-[12px] text-[#C7C7CC]">Add friends to see your rankings</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const medal = i < 3 ? MEDALS[i] : null;
        return (
          <motion.div
            key={row.userId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onClick?.(row.userId)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-[14px] transition-all duration-200 cursor-pointer",
              row.isCurrentUser
                ? "bg-[#EDE9FE] border border-[#5E5CE6]/20"
                : "bg-white border border-[rgba(0,0,0,0.04)] hover:bg-[#F9FAFB]"
            )}
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
          >
            {/* Rank */}
            <div className="w-8 text-center flex-shrink-0">
              {medal ? (
                <span className="text-[18px]">{medal}</span>
              ) : (
                <span
                  className={cn(
                    "text-[14px] font-bold",
                    row.isCurrentUser ? "text-[#5E5CE6]" : "text-[#8E8E93]"
                  )}
                >
                  {row.rank}
                </span>
              )}
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] flex items-center justify-center text-[16px] flex-shrink-0">
              {row.avatarEmoji}
            </div>

            {/* Name + Level */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[14px] font-bold truncate",
                    row.isCurrentUser ? "text-[#5E5CE6]" : "text-[#1C1C1E]"
                  )}
                >
                  {row.isCurrentUser ? "You" : row.displayName}
                </span>
                {row.isRival && (
                  <span className="text-[10px] font-bold text-[#F59E0B] bg-[#FFF8E1] px-1.5 py-0.5 rounded-full">
                    RIVAL
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#8E8E93]">LV.{row.level}</span>
            </div>

            {/* Score */}
            <div className="text-right flex-shrink-0">
              <div className="text-[14px] font-bold text-[#1C1C1E]">
                {row.weeklyEarned.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#8E8E93]">ST/week</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
