"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { ConversationPreviewDTO } from "@/types/api";
import { motion } from "framer-motion";

type ConversationListProps = {
  conversations: ConversationPreviewDTO[];
  onClick?: (partnerId: string) => void;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export const ConversationList: React.FC<ConversationListProps> = ({ conversations, onClick }) => {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-[32px]">💬</span>
        <p className="text-[14px] text-[#8E8E93] mt-2 font-medium">No conversations yet</p>
        <p className="text-[12px] text-[#C7C7CC]">Start a chat with a friend</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((conv, i) => (
        <motion.div
          key={conv.partnerId}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          onClick={() => onClick?.(conv.partnerId)}
          className="flex items-center gap-3 p-3 rounded-[14px] hover:bg-[#F9FAFB] transition-all duration-200 cursor-pointer"
        >
          {/* Avatar */}
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] flex items-center justify-center text-[18px] flex-shrink-0">
            {conv.partnerAvatar}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-[#1C1C1E] truncate">
                {conv.partnerName}
              </span>
              <span className="text-[11px] text-[#8E8E93] flex-shrink-0 ml-2">
                {timeAgo(conv.lastMessageAt)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[12px] text-[#8E8E93] truncate">
                {conv.lastMessage}
              </span>
              {conv.unreadCount > 0 && (
                <span className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-[#5E5CE6] text-white text-[10px] font-bold flex items-center justify-center">
                  {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
