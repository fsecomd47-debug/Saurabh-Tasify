"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Pickaxe, Zap } from "lucide-react";
import { usePetStore } from "@/store/pet-store";
import { PET_RARITY_CONFIG } from "@/lib/pets/data";

export function LevelUpCelebration() {
  const { levelUpCelebration, dismissLevelUp } = usePetStore();

  if (!levelUpCelebration) return null;

  const { petName, emoji, newLevel, miningRate, xpBoost, rarity } = levelUpCelebration;
  const rarityCfg = PET_RARITY_CONFIG[rarity as keyof typeof PET_RARITY_CONFIG] ?? PET_RARITY_CONFIG.common;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6"
        onClick={dismissLevelUp}
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.7, opacity: 0, y: 30 }}
          transition={{ type: "spring", damping: 18, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-white rounded-[24px] overflow-hidden text-center"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        >
          {/* Glow background */}
          <div className="relative px-6 pt-8 pb-6">
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 40%, ${rarityCfg.color}15 0%, transparent 60%)`,
              }}
            />

            {/* Sparkle burst */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: [0, 1.5, 0], opacity: [0.8, 0.4, 0] }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: "easeOut" }}
                className="absolute w-2 h-2 rounded-full pointer-events-none"
                style={{
                  background: i % 2 === 0 ? "#F59E0B" : "#5E5CE6",
                  left: `${20 + (i % 4) * 20}%`,
                  top: `${15 + Math.floor(i / 4) * 40}%`,
                  boxShadow: `0 0 8px ${i % 2 === 0 ? "#F59E0B" : "#5E5CE6"}`,
                }}
              />
            ))}

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.15 }}
              className="text-6xl mb-3 relative z-10"
            >
              {emoji}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider relative z-10"
            >
              Pet Level Up!
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-[22px] font-bold text-[#1C1C1E] mt-1 relative z-10"
            >
              {petName}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, type: "spring", stiffness: 300 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF8EB] mt-2 relative z-10"
            >
              <span className="text-[13px] font-bold text-[#F59E0B]">Lv.{newLevel}</span>
            </motion.div>
          </div>

          {/* Stat improvements */}
          <div className="px-6 pb-2 space-y-2">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-between p-3 rounded-[14px] bg-[#FFF8EB]"
            >
              <div className="flex items-center gap-2">
                <Pickaxe className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-[12px] font-semibold text-[#636366]">Mining Rate</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[12px] font-bold text-[#1C1C1E] tabular-nums">{miningRate.toFixed(1)}</span>
                <TrendingUp className="w-3 h-3 text-[#34C759]" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 }}
              className="flex items-center justify-between p-3 rounded-[14px] bg-[#EDEDFC]"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#5E5CE6]" />
                <span className="text-[12px] font-semibold text-[#636366]">XP Boost</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[12px] font-bold text-[#1C1C1E] tabular-nums">+{xpBoost}%</span>
                <TrendingUp className="w-3 h-3 text-[#34C759]" />
              </div>
            </motion.div>
          </div>

          {/* Dismiss */}
          <div className="px-6 py-5">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              onClick={dismissLevelUp}
              className="w-full py-3 rounded-full bg-[#5E5CE6] text-[13px] font-bold text-white active:scale-[0.98] transition-transform"
              style={{ boxShadow: "0 4px 16px rgba(94,92,230,0.3)" }}
            >
              NICE!
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
