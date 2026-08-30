"use client";

import React from "react";
import { motion } from "framer-motion";
import { Clock, Target, Shield, Zap, ChevronRight } from "lucide-react";

type MissionPreview = {
  id: string;
  title: string;
  difficulty: string;
  verificationMode: string;
  status?: string;
  durationSeconds?: number;
  targetRepetitions?: number;
  rewardStPreview: number;
  rewardXpPreview: number;
};

type Props = {
  mission: MissionPreview;
  onStart: () => void;
};

const DIFFICULTY_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  easy: { bg: "#E8FAF0", text: "#34C759", border: "#BBF7D0", label: "EASY" },
  medium: { bg: "#FFF8EB", text: "#FF9500", border: "#FDE68A", label: "MEDIUM" },
  hard: { bg: "#FFEBEA", text: "#FF3B30", border: "#FECACA", label: "HARD" },
  elite: { bg: "#EDEDFC", text: "#5E5CE6", border: "#DDD6FE", label: "ELITE" },
};

const VERIFICATION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  self_reported: { icon: <Shield className="w-3.5 h-3.5" />, label: "Self Reported", color: "#8E8E93" },
  timed: { icon: <Clock className="w-3.5 h-3.5" />, label: "Timer", color: "#5E5CE6" },
  focus: { icon: <Clock className="w-3.5 h-3.5" />, label: "Focus Session", color: "#5E5CE6" },
  pose: { icon: <Target className="w-3.5 h-3.5" />, label: "Camera + Pose", color: "#FF9500" },
  repetition: { icon: <Target className="w-3.5 h-3.5" />, label: "Motion Counting", color: "#FF9500" },
  evidence: { icon: <Shield className="w-3.5 h-3.5" />, label: "Photo Evidence", color: "#34C759" },
  photo: { icon: <Shield className="w-3.5 h-3.5" />, label: "Photo Evidence", color: "#34C759" },
  hybrid: { icon: <Zap className="w-3.5 h-3.5" />, label: "Multiple Signals", color: "#BF5AF2" },
  activity_signal: { icon: <Target className="w-3.5 h-3.5" />, label: "Activity Data", color: "#34C759" },
  review: { icon: <Shield className="w-3.5 h-3.5" />, label: "Under Review", color: "#FF9500" },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; pulse?: boolean }> = {
  draft: { label: "DRAFT", bg: "#F2F2F7", text: "#8E8E93" },
  analyzing: { label: "ANALYZING", bg: "#EDEDFC", text: "#5E5CE6", pulse: true },
  ready: { label: "READY", bg: "#E8FAF0", text: "#34C759" },
  starting: { label: "STARTING", bg: "#FFF8EB", text: "#FF9500", pulse: true },
  active: { label: "IN PROGRESS", bg: "#EDEDFC", text: "#5E5CE6", pulse: true },
  verifying: { label: "VERIFYING", bg: "#FFF8EB", text: "#FF9500", pulse: true },
  passed: { label: "COMPLETE", bg: "#E8FAF0", text: "#34C759" },
  settled: { label: "COMPLETE", bg: "#E8FAF0", text: "#34C759" },
  failed: { label: "FAILED", bg: "#FFEBEA", text: "#FF3B30" },
  review: { label: "REVIEW", bg: "#FFF8EB", text: "#FF9500", pulse: true },
  expired: { label: "EXPIRED", bg: "#F2F2F7", text: "#8E8E93" },
  cancelled: { label: "CANCELLED", bg: "#F2F2F7", text: "#8E8E93" },
};

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

export function MissionPreviewCard({ mission, onStart }: Props) {
  const diff = DIFFICULTY_CONFIG[mission.difficulty] ?? DIFFICULTY_CONFIG.medium;
  const verConfig = VERIFICATION_CONFIG[mission.verificationMode] ?? VERIFICATION_CONFIG.self_reported;
  const statusConfig = mission.status ? STATUS_CONFIG[mission.status] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      className="bg-white rounded-[24px] p-6 overflow-hidden"
      style={{
        boxShadow: "0 2px 4px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold tracking-[0.15em] text-[#8E8E93]">YOUR MISSION</span>
            {statusConfig && (
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusConfig.pulse ? "animate-pulse" : ""}`}
                style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
              >
                {statusConfig.label}
              </span>
            )}
          </div>
          <h3 className="text-[20px] font-bold text-[#1C1C1E] truncate" style={{ letterSpacing: "-0.02em" }}>
            {mission.title}
          </h3>
        </div>
        <div
          className="px-3.5 py-1.5 rounded-full text-[11px] font-bold"
          style={{ backgroundColor: diff.bg, color: diff.text, border: `1px solid ${diff.border}` }}
        >
          {diff.label}
        </div>
      </div>

      {/* Verification Mode */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="flex items-center gap-1.5 py-2 px-3 rounded-full"
          style={{ backgroundColor: "#F9F9FB", border: "1px solid #F2F2F7" }}
        >
          <span style={{ color: verConfig.color }}>{verConfig.icon}</span>
          <span className="text-[12px] font-medium text-[#636366]">{verConfig.label}</span>
        </div>
        {mission.durationSeconds && (
          <div className="flex items-center gap-1.5 py-2 px-3 rounded-full bg-[#F9F9FB] border border-[#F2F2F7]">
            <Clock className="w-3.5 h-3.5 text-[#8E8E93]" />
            <span className="text-[12px] text-[#636366]">{formatDuration(mission.durationSeconds)}</span>
          </div>
        )}
        {mission.targetRepetitions && (
          <div className="flex items-center gap-1.5 py-2 px-3 rounded-full bg-[#F9F9FB] border border-[#F2F2F7]">
            <Target className="w-3.5 h-3.5 text-[#8E8E93]" />
            <span className="text-[12px] text-[#636366]">{mission.targetRepetitions} reps</span>
          </div>
        )}
      </div>

      {/* Rewards */}
      <div
        className="flex items-center gap-5 py-4 px-5 rounded-[18px] mb-6"
        style={{
          background: "linear-gradient(145deg, #F9F9FB 0%, #F2F2F7 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #FFD700, #FF9500)",
              boxShadow: "0 2px 8px rgba(255,149,0,0.25)",
            }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-[20px] font-bold text-[#1C1C1E] tabular-nums" style={{ letterSpacing: "-0.02em" }}>
              +{mission.rewardStPreview}
            </span>
            <span className="text-[12px] font-medium text-[#8E8E93] ml-1">ST</span>
          </div>
        </div>
        <div className="w-px h-8 bg-[#D1D1D6]" />
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #5E5CE6, #BF5AF2)",
              boxShadow: "0 2px 8px rgba(94,92,230,0.25)",
            }}
          >
            <span className="text-[10px] font-bold text-white">XP</span>
          </div>
          <div>
            <span className="text-[20px] font-bold text-[#1C1C1E] tabular-nums" style={{ letterSpacing: "-0.02em" }}>
              +{mission.rewardXpPreview}
            </span>
            <span className="text-[12px] font-medium text-[#8E8E93] ml-1">XP</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        className="w-full h-[56px] rounded-[16px] text-white text-[16px] font-semibold flex items-center justify-center gap-2.5"
        style={{
          background: "linear-gradient(145deg, #5E5CE6 0%, #4A4BC7 100%)",
          boxShadow: "0 4px 16px rgba(94,92,230,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
      >
        START MISSION
        <ChevronRight className="w-4.5 h-4.5" />
      </motion.button>
    </motion.div>
  );
}
