"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Star, Zap, Flame, Shield, Target, TrendingUp } from "lucide-react";
import { useSnapshot, useLeaderboard } from "@/hooks/queries";
import { getLevelFromXP } from "@/lib/economy/xp-engine";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const LEVEL_MILESTONES = [
  { level: 1, title: "Beginner", icon: Target, color: "#94A3B8", unlock: "First mission" },
  { level: 5, title: "Grinder", icon: Zap, color: "#10B981", unlock: "Boost store unlocks" },
  { level: 10, title: "Hustler", icon: Flame, color: "#F59E0B", unlock: "Status items unlock" },
  { level: 15, title: "Elite", icon: Shield, color: "#EF4444", unlock: "3x Streak Shield" },
  { level: 20, title: "Champion", icon: Trophy, color: "#8B5CF6", unlock: "Unstoppable Title" },
  { level: 25, title: "Mogul", icon: Crown, color: "#F59E0B", unlock: "Gold Aura" },
  { level: 30, title: "Legend", icon: Star, color: "#EF4444", unlock: "Top 10 Badge" },
];

export const PlayerJourney: React.FC = () => {
  const { data: snap } = useSnapshot();
  const { data: lb } = useLeaderboard();
  if (!snap) return null;

  const totalXP = snap.progress.xpTotal;
  const totalTasksCompleted = snap.progress.tasksCompleted;
  const lifetimeEarned = snap.wallet.lifetimeEarned;
  const bestStreak = snap.streak.best;
  const rank = lb?.me.rank ?? 0;
  const { level, progress } = getLevelFromXP(totalXP);

  const currentMilestoneIndex = LEVEL_MILESTONES.findIndex((m) => m.level > level) - 1;
  const currentMilestone = LEVEL_MILESTONES[Math.max(0, currentMilestoneIndex)];
  const nextMilestone = LEVEL_MILESTONES[Math.min(LEVEL_MILESTONES.length - 1, currentMilestoneIndex + 1)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="px-6 mt-5"
    >
      <div className="bg-white rounded-3xl p-4" style={{ boxShadow: "0 8px 24px -4px rgba(0,0,0,0.06), 0 2px 6px -1px rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-vault-primary/10">
            <TrendingUp className="w-4 h-4 text-vault-primary" strokeWidth={2.5} />
          </div>
          <h2 className="text-[13px] font-extrabold text-slate-900 font-display">Player Journey</h2>
        </div>

        {/* Current Status */}
        <div className="mb-5 p-3 rounded-2xl" style={{ background: `${currentMilestone.color}10`, border: `1px solid ${currentMilestone.color}20` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${currentMilestone.color}20` }}>
              <currentMilestone.icon className="w-5 h-5" style={{ color: currentMilestone.color }} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-slate-400 font-ui uppercase tracking-wider">Current Rank</p>
              <p className="text-[16px] font-extrabold text-slate-900 font-display">{currentMilestone.title}</p>
              <p className="text-[10px] text-slate-400 font-ui">Level {level} • {totalTasksCompleted} missions completed</p>
            </div>
            <div className="text-right">
              <p className="text-[14px] font-extrabold text-vault-primary font-display tabular-nums">{formatCurrency(lifetimeEarned)}</p>
              <p className="text-[9px] text-slate-400 font-ui">Lifetime $ST</p>
            </div>
          </div>
        </div>

        {/* Journey Path */}
        <div className="space-y-3">
          {LEVEL_MILESTONES.map((milestone, index) => {
            const isCompleted = level >= milestone.level;
            const isCurrent = level === milestone.level;
            const isNext = !isCompleted && index === currentMilestoneIndex + 1;
            const Icon = milestone.icon;

            return (
              <motion.div
                key={milestone.level}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="relative flex items-center gap-3"
              >
                {/* Connecting line */}
                {index < LEVEL_MILESTONES.length - 1 && (
                  <div className="absolute left-[21px] top-10 bottom-0 w-0.5" style={{ 
                    background: isCompleted ? `linear-gradient(180deg, ${milestone.color} 0%, ${LEVEL_MILESTONES[index + 1].color} 100%)` : "linear-gradient(180deg, #E2E8F0 0%, #E2E8F0 100%)"
                  }} />
                )}

                {/* Milestone Node */}
                <div className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                  isCompleted && "scale-100",
                  isCurrent && "scale-110 ring-4",
                  !isCompleted && !isCurrent && "opacity-50"
                )} style={{
                  background: isCompleted ? `linear-gradient(135deg, ${milestone.color} 0%, ${milestone.color}CC 100%)` : "#F1F5F9",
                  boxShadow: isCurrent ? `0 0 0 4px ${milestone.color}30, 0 4px 12px ${milestone.color}30` : "none",
                  borderColor: isCurrent ? milestone.color : "transparent",
                }}>
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4 + index * 0.05, type: "spring", damping: 12 }}
                    >
                      <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </motion.div>
                  ) : (
                    <span className="text-[10px] font-extrabold font-display" style={{ color: isCurrent ? milestone.color : "#94A3B8" }}>
                      {milestone.level}
                    </span>
                  )}
                  {isCurrent && (
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full"
                      style={{ border: `2px solid ${milestone.color}`, borderColor: milestone.color }}
                    />
                  )}
                </div>

                {/* Milestone Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[12px] font-bold font-display", isCompleted ? "text-slate-900" : "text-slate-400")}>
                      {milestone.title}
                    </span>
                    {isNext && (
                      <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-[8px] px-1.5 py-0.5 rounded-full font-bold font-ui"
                        style={{ background: `${milestone.color}15`, color: milestone.color }}
                      >
                        NEXT
                      </motion.span>
                    )}
                    {isCompleted && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-bold font-ui">✓</span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 font-ui mt-0.5">Level {milestone.level} — {milestone.unlock}</p>
                  {isNext && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress * 100}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${milestone.color} 0%, ${milestone.color}CC 100%)` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold font-ui" style={{ color: milestone.color }}>
                        {Math.round((1 - progress) * 100)}% to {milestone.title}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Long-term Goals */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 font-ui uppercase tracking-wider mb-3">Long-Term Goals</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Level 25", target: 25, current: level, icon: Crown, color: "#F59E0B" },
              { label: "Top 10 Global", target: 10, current: rank, icon: TrendingUp, color: "#EF4444", reverse: true },
              { label: "100K $ST Earned", target: 100000, current: lifetimeEarned, icon: Star, color: "#6B38C3" },
              { label: "30 Day Streak", target: 30, current: bestStreak, icon: Flame, color: "#F59E0B" },
            ].map((goal) => {
              const progress = Math.min(goal.current / goal.target, 1);
              const isReverse = goal.reverse;
              const Icon = goal.icon;
              return (
                <motion.div
                  key={goal.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-3 rounded-2xl bg-slate-50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: goal.color }} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold text-slate-700 font-display flex-1">{goal.label}</span>
                    <span className="text-[10px] font-bold font-ui" style={{ color: goal.color }}>
                      {Math.round(progress * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${goal.color} 0%, ${goal.color}CC 100%)` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-ui mt-1 text-right">
                    {isReverse 
                      ? `#${goal.current} → Top ${goal.target}`
                      : formatCurrency(goal.current) + (goal.label.includes("$ST") ? "" : `/ ${goal.target}`)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};