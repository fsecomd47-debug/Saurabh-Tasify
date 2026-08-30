"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { SocialNotificationDTO } from "@/types/api";
import { useMarkNotificationsRead } from "@/hooks/queries";
import { motion } from "framer-motion";

type NotificationListProps = {
  notifications: SocialNotificationDTO[];
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

const TYPE_ICONS: Record<string, string> = {
  FRIEND_REQUEST: "👤",
  FRIEND_ACCEPTED: "🤝",
  CHALLENGE_INVITATION: "⚔️",
  CHALLENGE_RESULT: "🏆",
  REACTION: "🔥",
  MILESTONE: "🏅",
};

export const NotificationList: React.FC<NotificationListProps> = ({ notifications }) => {
  const markRead = useMarkNotificationsRead();

  const handleClick = (notification: SocialNotificationDTO) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-[32px]">🔔</span>
        <p className="text-[14px] text-[#8E8E93] mt-2 font-medium">No notifications yet</p>
        <p className="text-[12px] text-[#C7C7CC]">Friend activity will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {notifications.map((n, i) => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          onClick={() => handleClick(n)}
          role="button"
          tabIndex={0}
          aria-label={`${n.read ? "" : "Unread: "}${n.body}`}
          className={cn(
            "flex items-start gap-3 p-3 rounded-[14px] transition-all duration-200 cursor-pointer",
            n.read
              ? "bg-white"
              : "bg-[#F0F0FF] border border-[#5E5CE6]/10"
          )}
        >
          {/* Icon */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] flex items-center justify-center text-[16px] flex-shrink-0">
            {TYPE_ICONS[n.type] ?? "📌"}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-[13px] leading-tight",
              n.read ? "text-[#636366]" : "text-[#1C1C1E] font-medium"
            )}>
              {n.body}
            </p>
            <span className="text-[11px] text-[#8E8E93] mt-1 block">{timeAgo(n.createdAt)}</span>
          </div>

          {/* Unread dot */}
          {!n.read && (
            <div className="w-2 h-2 rounded-full bg-[#5E5CE6] flex-shrink-0 mt-1.5" />
          )}
        </motion.div>
      ))}
    </div>
  );
};
