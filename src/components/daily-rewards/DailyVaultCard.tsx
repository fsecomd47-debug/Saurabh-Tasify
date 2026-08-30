"use client";

import React from "react";
import { motion } from "framer-motion";
import { Gift, ChevronRight, Sparkles, Timer } from "lucide-react";
import { useDailyReward } from "@/hooks/queries";
import { useUIStore } from "@/store/ui-store";

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";

export function DailyVaultCard() {
  const { data: status, isLoading } = useDailyReward();
  const openModal = useUIStore((s) => s.openModal);

  if (isLoading) {
    return (
      <div className="px-5 mt-4">
        <div className="h-20 rounded-[20px] bg-white animate-pulse" style={{ boxShadow: CARD_SHADOW }} />
      </div>
    );
  }

  if (!status) return null;

  const currentTier = status.tiers[status.currentDay - 1] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="px-5 mt-4"
    >
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => openModal("dailyReward")}
        className="w-full text-left"
      >
        <div
          className="rounded-[20px] p-4 flex items-center gap-3 overflow-hidden relative"
          style={{
            background: status.available
              ? "linear-gradient(135deg, #5E5CE6 0%, #4A48C9 50%, #3A38A8 100%)"
              : "white",
            boxShadow: status.available
              ? "0 4px 20px rgba(94,92,230,0.3), inset 0 1px 0 rgba(255,255,255,0.15)"
              : CARD_SHADOW,
          }}
        >
          {status.available && (
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                animate={{ x: [-100, 400], y: [-20, 20] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute -top-10 -left-10 w-20 h-40 bg-white/10 rounded-full blur-xl"
              />
            </div>
          )}

          <div
            className="relative w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{
              background: status.available
                ? "rgba(255,255,255,0.2)"
                : "linear-gradient(145deg, #EDEDFC, #D4D4F7)",
            }}
          >
            <Gift className="w-5 h-5" style={{ color: status.available ? "#FFFFFF" : "#5E5CE6" }} strokeWidth={2} />
            {status.available && currentTier?.day === 7 && (
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF9500] flex items-center justify-center"
              >
                <span className="text-[8px]">👑</span>
              </motion.div>
            )}
          </div>

          <div className="flex-1 min-w-0 relative">
            <div className="flex items-center gap-1.5">
              <h3
                className="text-[14px] font-bold"
                style={{ color: status.available ? "#FFFFFF" : "#1C1C1E" }}
              >
                Daily Vault
              </h3>
              {status.available && (
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-white/20 text-white/90">
                  CLAIM
                </span>
              )}
            </div>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: status.available ? "rgba(255,255,255,0.7)" : "#8E8E93" }}
            >
              {status.available && currentTier
                ? `${currentTier.emoji} ${currentTier.label} — +${currentTier.st} ST`
                : status.timeUntilNext
                  ? `Next in ${status.timeUntilNext}`
                  : `Day ${status.currentDay} of 7`}
            </p>
          </div>

          <div className="relative flex-shrink-0">
            {status.available ? (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Sparkles className="w-4 h-4 text-white" />
              </motion.div>
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#F2F2F7]">
                <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
              </div>
            )}
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}
