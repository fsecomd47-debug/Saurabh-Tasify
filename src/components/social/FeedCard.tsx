"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { SocialFeedEventDTO } from "@/types/api";
import { useSendReaction, useRemoveReaction, useReportContent } from "@/hooks/queries";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal } from "lucide-react";

type FeedCardProps = {
  event: SocialFeedEventDTO;
  onClick?: () => void;
};

const REACTION_EMOJIS = ["🔥", "👏", "💜", "🚀", "🏆"];

const EVENT_LABELS: Record<string, { emoji: string; text: string }> = {
  MISSION_COMPLETED: { emoji: "✅", text: "Mission Complete" },
  QUEST_COMPLETED: { emoji: "🎯", text: "Quest Complete" },
  LEVEL_UP: { emoji: "⬆️", text: "Level Up" },
  PET_LEVEL_UP: { emoji: "🐾", text: "Pet Leveled Up" },
  PET_UNLOCKED: { emoji: "🐣", text: "New Pet!" },
  BADGE_UNLOCKED: { emoji: "🏆", text: "Badge Unlocked" },
  RANK_MILESTONE: { emoji: "🏅", text: "Rank Milestone" },
  STREAK_MILESTONE: { emoji: "🔥", text: "Streak Milestone" },
  GOAL_COMPLETED: { emoji: "🎯", text: "Goal Complete" },
  CHALLENGE_WON: { emoji: "🥇", text: "Challenge Won" },
  CHALLENGE_COMPLETED: { emoji: "🏆", text: "Challenge Complete" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const FeedCard: React.FC<FeedCardProps> = ({ event, onClick }) => {
  const sendReaction = useSendReaction();
  const removeReaction = useRemoveReaction();
  const reportContent = useReportContent();
  const [showReportMenu, setShowReportMenu] = useState(false);

  const eventInfo = EVENT_LABELS[event.eventType] ?? { emoji: "📌", text: event.eventType };
  const totalReactions = Object.values(event.reactionCounts).reduce((a, b) => a + b, 0);

  const handleReaction = (emoji: string) => {
    if (event.myReaction === emoji) {
      removeReaction.mutate(event.id);
    } else {
      sendReaction.mutate({ eventId: event.id, emoji });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-[20px] bg-white border border-[rgba(0,0,0,0.04)] overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] flex items-center justify-center text-[18px] flex-shrink-0">
          {event.actorAvatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-[#1C1C1E] truncate">
              {event.actorName}
            </span>
          </div>
          <span className="text-[12px] text-[#8E8E93]">
            {event.actorTitle} · {timeAgo(event.createdAt)}
          </span>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setShowReportMenu(!showReportMenu); }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#8E8E93] hover:bg-[#F2F2F7]"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showReportMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-8 bg-white rounded-[12px] shadow-lg border border-[rgba(0,0,0,0.08)] z-10 py-1 min-w-[140px]"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReportMenu(false);
                    reportContent.mutate({
                      targetType: "feed_event",
                      targetId: event.id,
                      reason: "inappropriate",
                    });
                  }}
                  disabled={reportContent.isPending}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#FF3B30] font-semibold hover:bg-[#F2F2F7]"
                >
                  Report Post
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Achievement body */}
      <div className="px-4 pb-3">
        <div className="rounded-[12px] bg-[#F9FAFB] p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[14px]">{eventInfo.emoji}</span>
            <span className="text-[14px] font-bold text-[#1C1C1E]">{eventInfo.text}</span>
          </div>
          {typeof event.payload.summary === "string" && event.payload.summary.length > 0 && (
            <p className="text-[13px] text-[#636366]">{event.payload.summary}</p>
          )}
          {typeof event.payload.stGained === "number" && event.payload.stGained > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[13px] font-bold text-[#5E5CE6]">+{event.payload.stGained} ST</span>
              {typeof event.payload.xpGained === "number" && (
                <span className="text-[13px] font-bold text-[#34C759]">+{event.payload.xpGained} XP</span>
              )}
            </div>
          )}
          {typeof event.payload.name === "string" && event.eventType === "PET_LEVEL_UP" && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[13px]">{typeof event.payload.emoji === "string" ? event.payload.emoji : "🐾"}</span>
              <span className="text-[13px] text-[#636366]">
                {event.payload.name} → Level {String(event.payload.newLevel ?? "?")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Reactions + comments */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex items-center gap-1.5">
          {/* Quick reaction buttons */}
          {REACTION_EMOJIS.map((emoji) => {
            const count = event.reactionCounts[emoji] ?? 0;
            const isActive = event.myReaction === emoji;
            return (
              <motion.button
                key={emoji}
                whileTap={{ scale: 1.2 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReaction(emoji);
                }}
                aria-label={`${emoji} reaction${isActive ? " (active)" : ""}${count > 0 ? `, ${count} ${count === 1 ? "reaction" : "reactions"}` : ""}`}
                aria-pressed={isActive}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-[13px] transition-all duration-150",
                  isActive
                    ? "bg-[#EDE9FE] border border-[#5E5CE6]/30 text-[#5E5CE6]"
                    : count > 0
                    ? "bg-[#F2F2F7] text-[#636366] border border-transparent"
                    : "bg-transparent text-[#C7C7CC] border border-transparent hover:bg-[#F2F2F7]"
                )}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="font-semibold text-[11px]">{count}</span>}
              </motion.button>
            );
          })}
        </div>
        <button
          onClick={onClick}
          className="text-[12px] font-semibold text-[#8E8E93] hover:text-[#636366]"
        >
          💬 {event.commentCount > 0 ? event.commentCount : "Add"}
        </button>
      </div>
    </motion.div>
  );
};
