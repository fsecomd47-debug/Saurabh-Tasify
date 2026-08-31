"use client";

/**
 * PDR-6 Feature-1: THE VAULT — CollectionCard Component
 * Displays a collection with progress bar and completion status.
 * Includes celebration animation for 100% completed collections.
 */

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Lock, Check } from "lucide-react";
import type { Collection } from "@/types/vault";

type CollectionCardProps = {
  collection: Collection;
  ownedCount: number;
  onSelect: () => void;
};

export function CollectionCard({
  collection,
  ownedCount,
  onSelect,
}: CollectionCardProps) {
  const total = collection.itemIds.length;
  const completed = ownedCount === total && total > 0;
  const progress = total > 0 ? ownedCount / total : 0;

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`bg-white rounded-[16px] overflow-hidden text-left border w-full relative ${
        completed ? "border-[#34C759]" : "border-[#E5E5EA]"
      }`}
    >
      {/* Celebration shimmer overlay for completed */}
      {completed && (
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(110deg, transparent 25%, rgba(52,199,89,0.08) 37%, rgba(255,215,0,0.12) 50%, rgba(52,199,89,0.08) 63%, transparent 75%)",
              backgroundSize: "200% 100%",
            }}
          />
          <motion.div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(110deg, transparent 25%, rgba(255,215,0,0.15) 37%, rgba(52,199,89,0.12) 50%, rgba(255,215,0,0.15) 63%, transparent 75%)",
              backgroundSize: "200% 100%",
            }}
            animate={{
              backgroundPosition: ["200% 0", "-200% 0"],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </motion.div>
      )}

      {/* Header */}
      <div
        className={`p-4 text-white relative z-10 ${
          completed
            ? "bg-gradient-to-br from-[#34C759] to-[#30D158]"
            : "bg-gradient-to-br from-[#5E5CE6] to-[#BF5AF2]"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[14px] font-bold">{collection.name}</h3>
          {completed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <CheckCircle2 className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </div>
        <p className="text-[11px] opacity-80 line-clamp-2">
          {collection.description}
        </p>
      </div>

      {/* Progress */}
      <div className="p-3 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-bold text-[#1C1C1E]">
            {ownedCount} / {total}
          </span>
          {completed ? (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 text-[10px] font-bold text-white bg-[#34C759] px-2 py-0.5 rounded-full"
            >
              <Check className="w-3 h-3" />
              COMPLETE
            </motion.span>
          ) : (
            <span className="text-[10px] text-[#8E8E93]">
              {total - ownedCount} remaining
            </span>
          )}
        </div>

        {/* Progress bar with pulse animation for completed */}
        <div className="h-2 rounded-full bg-[#F2F2F7] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${progress * 100}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-full rounded-full relative ${
              completed ? "bg-[#34C759]" : "bg-[#5E5CE6]"
            }`}
          >
            {completed && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  background:
                    "linear-gradient(90deg, #34C759, #30D158, #A8F0BA, #30D158, #34C759)",
                  backgroundSize: "200% 100%",
                }}
              />
            )}
          </motion.div>
        </div>

        {/* Reward */}
        {collection.completionReward && !completed && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[10px] text-[#8E8E93]">Reward:</span>
            <span className="text-[10px] text-[#FF9500] font-medium">
              {collection.completionReward.badgeId
                ? "Badge"
                : collection.completionReward.titleId
                ? "Title"
                : "Frame"}
            </span>
          </div>
        )}

        {/* Completion reward claim hint */}
        {completed && collection.completionReward && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center gap-1"
          >
            <span className="text-[10px] text-[#34C759] font-medium">
              Reward unlocked! Tap to claim
            </span>
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}
