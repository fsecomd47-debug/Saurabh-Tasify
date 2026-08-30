"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { PlayerCardDTO } from "@/types/api";

type PlayerCardProps = {
  player: PlayerCardDTO;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
  action?: React.ReactNode;
};

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  size = "md",
  onClick,
  className,
  action,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-[16px] bg-white p-3 transition-all duration-200",
        "border border-[rgba(0,0,0,0.04)]",
        onClick && "cursor-pointer active:scale-[0.98] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        size === "sm" && "p-2.5 gap-2.5",
        size === "lg" && "p-4 gap-4",
        className
      )}
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)",
      }}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] flex-shrink-0",
          size === "sm" && "w-9 h-9 text-[16px]",
          size === "md" && "w-11 h-11 text-[18px]",
          size === "lg" && "w-14 h-14 text-[24px]"
        )}
      >
        <span>{player.avatarEmoji}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-bold text-[#1C1C1E] truncate",
              size === "sm" && "text-[13px]",
              size === "md" && "text-[15px]",
              size === "lg" && "text-[17px]"
            )}
          >
            {player.displayName}
          </span>
          {player.rank && (
            <span className="text-[11px] font-bold text-[#5E5CE6] bg-[#EDE9FE] px-1.5 py-0.5 rounded-full">
              #{player.rank}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[12px] text-[#8E8E93] font-medium truncate">
            {player.title}
          </span>
          <span className="text-[11px] text-[#8E8E93]">·</span>
          <span className="text-[12px] text-[#8E8E93] font-medium">
            LV.{player.level}
          </span>
        </div>
        {player.petEmoji && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[12px]">{player.petEmoji}</span>
            <span className="text-[11px] text-[#8E8E93]">{player.petName}</span>
            {player.petLevel !== null && (
              <span className="text-[10px] text-[#8E8E93]">Lv.{player.petLevel}</span>
            )}
          </div>
        )}
      </div>

      {/* Action slot */}
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};
