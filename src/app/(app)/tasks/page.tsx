"use client";

import React, { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Loader2, Trash2, Zap, Target, ChevronRight, Play, Shield, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Tabs } from "@/components/ui/Tabs";
import { useUIStore } from "@/store/ui-store";
import { useMissions, useDeleteTask } from "@/hooks/queries";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "ready", label: "Ready" },
  { id: "completed", label: "Completed" },
];

const STATUS_LABELS: Record<string, string> = {
  ready: "Ready",
  active: "Active",
  verifying: "Verifying",
  passed: "Verified",
  settled: "Verified",
  failed: "Failed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  ready: { bg: "#EDEDFC", text: "#5E5CE6", icon: Clock },
  active: { bg: "#FFF8EB", text: "#FF9500", icon: Play },
  verifying: { bg: "#FFF8EB", text: "#FF9500", icon: Clock },
  passed: { bg: "#E8FAF0", text: "#34C759", icon: CheckCircle2 },
  settled: { bg: "#E8FAF0", text: "#34C759", icon: CheckCircle2 },
  failed: { bg: "#FFEBEA", text: "#FF3B30", icon: Clock },
  cancelled: { bg: "#F2F2F7", text: "#8E8E93", icon: Clock },
};

function triggerHaptic(style: "light" | "medium" | "heavy" = "heavy") {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    const patterns = { light: 10, medium: 20, heavy: [30, 10, 15] };
    navigator.vibrate(patterns[style]);
  }
}

function ParticleBurst({ trigger }: { trigger: boolean }) {
  if (!trigger) return null;

  const particles = [
    { emoji: "\uD83E\uDE99", x: -20, y: -30, delay: 0, rotate: 45 },
    { emoji: "\u2B50", x: 15, y: -35, delay: 0.05, rotate: -30 },
    { emoji: "\uD83E\uDE99", x: 25, y: -20, delay: 0.1, rotate: 60 },
    { emoji: "\u2B50", x: -15, y: -40, delay: 0.08, rotate: -45 },
    { emoji: "\uD83D\uDCB0", x: 5, y: -45, delay: 0.03, rotate: 20 },
    { emoji: "\u2B50", x: -25, y: -25, delay: 0.12, rotate: 70 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 1, scale: 0.5, x: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: [1, 1, 0],
            scale: [0.5, 1.2, 0.3],
            x: p.x,
            y: p.y,
            rotate: p.rotate,
          }}
          transition={{
            duration: 0.6,
            delay: p.delay,
            ease: "easeOut",
          }}
          className="absolute text-[10px] left-[22px] top-[6px]"
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
}

function FlyingLoot({ trigger, st, xp }: { trigger: boolean; st: number; xp: number }) {
  if (!trigger) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <motion.span
        initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        animate={{ opacity: [1, 1, 0], scale: [1, 1.1, 0.4], x: 40, y: -60 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="absolute right-2 top-0 text-[11px] font-bold"
        style={{ color: "#10B981", textShadow: "0 0 8px rgba(16,185,129,0.5)" }}
      >
        +{st}
      </motion.span>
      <motion.span
        initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        animate={{ opacity: [1, 1, 0], scale: [1, 1.1, 0.4], x: 45, y: -55 }}
        transition={{ duration: 0.7, delay: 0.05, ease: "easeOut" }}
        className="absolute right-2 top-4 text-[10px] font-bold"
        style={{ color: "#10B981", textShadow: "0 0 6px rgba(52,199,89,0.4)" }}
      >
        +{xp} XP
      </motion.span>
    </div>
  );
}

export default function TasksPage() {
  const [tab, setTab] = useState("all");
  const openModal = useUIStore((s) => s.openModal);
  const { data: missionsData = { missions: [], active: null }, isLoading } = useMissions();
  const deleteTask = useDeleteTask();
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const filtered = useMemo(() => {
    if (tab === "active") return missionsData.missions.filter((m) => m.status === "active" || m.status === "verifying");
    if (tab === "ready") return missionsData.missions.filter((m) => m.status === "ready");
    if (tab === "completed") return missionsData.missions.filter((m) => m.status === "passed" || m.status === "settled");
    return missionsData.missions;
  }, [missionsData.missions, tab]);

  const activeCount = missionsData.missions.filter((m) => m.status === "active" || m.status === "verifying").length;
  const readyCount = missionsData.missions.filter((m) => m.status === "ready").length;
  const completedCount = missionsData.missions.filter((m) => m.status === "passed" || m.status === "settled").length;
  const failedCount = missionsData.missions.filter((m) => m.status === "failed").length;

  const canDelete = (status: string) => ["ready", "active", "failed"].includes(status);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteTask.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <AppShell>
      <TopBar title="Missions" subtitle={`${activeCount} active · ${readyCount} ready · ${completedCount} completed · ${failedCount} failed`} showAction={false} />

      <div className="px-5 mt-2">
        <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />
      </div>

      <div className="px-5 mt-4 space-y-2.5 pb-6">
        {isLoading && <div className="h-24 rounded-[20px] bg-white animate-pulse" />}

        <AnimatePresence initial={false}>
          {filtered.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClick={() => router.push(`/missions/${mission.id}`)}
              onDelete={canDelete(mission.status) ? () => setDeleteTarget({ id: mission.taskId, title: mission.taskTitle }) : undefined}
            />
          ))}
        </AnimatePresence>

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-[20px] p-8 text-center bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
            <Target className="w-10 h-10 text-[#5E5CE6]/40 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[14px] font-bold text-[#1C1C1E]">
              {tab === "completed" ? "No verified missions yet" : tab === "active" ? "No active missions" : tab === "ready" ? "No missions ready" : "No missions here"}
            </p>
            <p className="text-[12px] text-[#8E8E93] mt-1 mb-4">Tap + to create your next mission</p>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => !deleteTask.isPending && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[20px] p-6 w-full max-w-[300px] text-center"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-[#FFEBEA] flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-[#FF3B30]" strokeWidth={2} />
              </div>
              <p className="text-[15px] font-bold text-[#1C1C1E] mb-1">Delete Mission?</p>
              <p className="text-[12px] text-[#8E8E93] mb-5 leading-relaxed">
                &ldquo;{deleteTarget.title}&rdquo; will be permanently removed.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteTask.isPending}
                  className="flex-1 h-10 rounded-full text-[13px] font-semibold bg-[#F2F2F7] text-[#1C1C1E] active:scale-[0.97] transition-transform disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteTask.isPending}
                  className="flex-1 h-10 rounded-full text-[13px] font-semibold bg-[#FF3B30] text-white active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {deleteTask.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function MissionCard({
  mission,
  onClick,
  onDelete,
}: {
  mission: {
    id: string;
    taskId: string;
    taskTitle: string;
    activityType: string;
    verificationMode: string;
    status: string;
    difficulty: string;
    durationSeconds?: number;
    targetRepetitions?: number;
    rewardStPreview: number;
    rewardXpPreview: number;
  };
  onClick: () => void;
  onDelete?: () => void;
}) {
  const statusConfig = STATUS_COLORS[mission.status] ?? STATUS_COLORS.ready;
  const StatusIcon = statusConfig.icon;
  const isActive = mission.status === "active";
  const isReady = mission.status === "ready";
  const isFailed = mission.status === "failed";
  const isVerified = mission.status === "passed" || mission.status === "settled";

  const [stampActive, setStampActive] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [showLoot, setShowLoot] = useState(false);

  const handleStamp = useCallback(() => {
    triggerHaptic("heavy");
    setStampActive(true);
    setShowParticles(true);
    setShowLoot(true);
    setTimeout(() => setStampActive(false), 400);
    setTimeout(() => setShowParticles(false), 800);
    setTimeout(() => setShowLoot(false), 900);
  }, []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className="rounded-[20px] p-4 cursor-pointer relative overflow-hidden transition-all duration-300"
        style={{
          background: isVerified
            ? "rgba(0, 0, 0, 0.02)"
            : isFailed
            ? "rgba(255, 59, 48, 0.03)"
            : "#fff",
          boxShadow: isVerified
            ? "inset 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 2px rgba(0,0,0,0.03)"
            : "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
          opacity: isVerified ? 0.75 : 1,
        }}
        onClick={onClick}
      >
        {/* Particle burst overlay */}
        <AnimatePresence>
          {showParticles && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-4 top-4 z-10 pointer-events-none"
            >
              {[
                { emoji: "\uD83E\uDE99", x: -18, y: -28, delay: 0, rotate: 40 },
                { emoji: "\u2B50", x: 20, y: -32, delay: 0.04, rotate: -40 },
                { emoji: "\uD83E\uDE99", x: 28, y: -18, delay: 0.08, rotate: 60 },
                { emoji: "\u2B50", x: -12, y: -38, delay: 0.06, rotate: -50 },
                { emoji: "\uD83D\uDCB0", x: 8, y: -42, delay: 0.02, rotate: 25 },
                { emoji: "\u2B50", x: -22, y: -22, delay: 0.1, rotate: -35 },
              ].map((p, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 1, scale: 0.4, x: 0, y: 0, rotate: 0 }}
                  animate={{
                    opacity: [1, 1, 0],
                    scale: [0.4, 1.1, 0.2],
                    x: p.x,
                    y: p.y,
                    rotate: p.rotate ?? (i % 2 === 0 ? 40 : -40),
                  }}
                  transition={{ duration: 0.55, delay: p.delay, ease: "easeOut" }}
                  className="absolute text-[9px]"
                >
                  {p.emoji}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-start gap-3">
          {/* Status icon / Stamp Checkmark */}
          <div className="flex-shrink-0">
            {isVerified ? (
              <motion.div
                initial={{ scale: 0.3, opacity: 0 }}
                animate={
                  stampActive
                    ? { scale: [0.3, 0.85, 1.1, 1], opacity: 1, rotate: [0, -8, 4, 0] }
                    : { scale: 1, opacity: 1, rotate: 0 }
                }
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 15,
                  mass: 0.8,
                  duration: 0.4,
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(145deg, #10B981, #059669)",
                  boxShadow: "0 3px 12px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M4 9.5L7.5 13L14 5"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            ) : (
              <div
                className="w-10 h-10 rounded-[12px] flex items-center justify-center"
                style={{ background: statusConfig.bg }}
              >
                <StatusIcon className="w-5 h-5" style={{ color: statusConfig.text }} strokeWidth={2.2} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="relative inline-block">
              <p
                className="text-[13.5px] font-semibold truncate"
                style={{
                  color: isVerified ? "#6B7280" : isFailed ? "#9CA3AF" : "#1C1C1E",
                }}
              >
                {mission.taskTitle}
              </p>
              {isVerified && (
                <motion.svg
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    pathLength: { duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275], delay: 0.05 },
                    opacity: { duration: 0.05 },
                  }}
                  className="absolute top-[45%] left-0 w-full"
                  viewBox="0 0 100 4"
                  preserveAspectRatio="none"
                  style={{ height: "2.5px", transform: "translateY(-50%)" }}
                >
                  <defs>
                    <linearGradient id="slashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#34D399" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                    <filter id="slashGlow">
                      <feGaussianBlur stdDeviation="1" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <motion.line
                    x1="0" y1="2" x2="100" y2="2"
                    stroke="url(#slashGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    filter="url(#slashGlow)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275], delay: 0.05 }}
                  />
                </motion.svg>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span
                className="inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: isVerified ? "#D1FAE5" : isFailed ? "#FFE4E1" : statusConfig.bg,
                  color: isVerified ? "#065F46" : isFailed ? "#991B1B" : statusConfig.text,
                }}
              >
                {STATUS_LABELS[mission.status] ?? mission.status}
              </span>
              <span
                className="inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: isVerified ? "#EDE9FE" : "#E0E7FF",
                  color: isVerified ? "#5B21B6" : "#4338CA",
                }}
              >
                {mission.difficulty.toUpperCase()}
              </span>
              {mission.verificationMode === "focus" && (
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background: isVerified ? "#D1FAE5" : "#DCFCE7",
                    color: isVerified ? "#065F46" : "#166534",
                  }}
                >
                  <Shield className="w-2.5 h-2.5" strokeWidth={2.5} /> Focus
                </span>
              )}
              {mission.verificationMode === "pose" && (
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background: isVerified ? "#FEF3C7" : "#FEF9C3",
                    color: isVerified ? "#92400E" : "#854D0E",
                  }}
                >
                  <Target className="w-2.5 h-2.5" strokeWidth={2.5} /> Pose
                </span>
              )}
            </div>
          </div>

          {/* Rewards + action */}
          <div className="text-right flex-shrink-0 flex flex-col items-end gap-2 relative">
            <div className="relative">
              <p
                className="text-[12px] font-bold tabular-nums"
                style={{
                  color: isFailed ? "#D1D5DB" : "#10B981",
                  textShadow: isVerified ? "0 0 10px rgba(16,185,129,0.45), 0 0 20px rgba(16,185,129,0.2)" : "none",
                }}
              >
                {isFailed ? "+0" : `+${mission.rewardStPreview}`}
              </p>
              <p
                className="text-[9px] font-semibold tabular-nums"
                style={{
                  color: isFailed ? "#D1D5DB" : "#10B981",
                  textShadow: isVerified ? "0 0 8px rgba(52,199,89,0.4), 0 0 16px rgba(52,199,89,0.15)" : "none",
                }}
              >
                {isFailed ? "+0 XP" : `+${mission.rewardXpPreview} XP`}
              </p>

              {/* Flying loot animation */}
              <AnimatePresence>
                {showLoot && (
                  <>
                    <motion.span
                      initial={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                      animate={{ opacity: [1, 1, 0], scale: [1, 1.05, 0.3], y: -50, x: 35 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.65, ease: "easeOut" }}
                      className="absolute right-0 top-0 text-[11px] font-bold pointer-events-none"
                      style={{ color: "#10B981", textShadow: "0 0 10px rgba(16,185,129,0.5)" }}
                    >
                      +{mission.rewardStPreview}
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                      animate={{ opacity: [1, 1, 0], scale: [1, 1.05, 0.3], y: -48, x: 38 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.65, delay: 0.04, ease: "easeOut" }}
                      className="absolute right-0 top-3 text-[10px] font-bold pointer-events-none"
                      style={{ color: "#10B981", textShadow: "0 0 8px rgba(52,199,89,0.4)" }}
                    >
                      +{mission.rewardXpPreview} XP
                    </motion.span>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2">
              {isActive && (
                <span className="w-9 h-9 rounded-full bg-[#FFF8EB] flex items-center justify-center">
                  <Play className="w-4 h-4 text-[#FF9500]" strokeWidth={2.2} />
                </span>
              )}
              {isReady && (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={(e) => { e.stopPropagation(); onClick(); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                  style={{ background: "#5E5CE6", boxShadow: "0 4px 12px rgba(94,92,230,0.35)" }}
                  aria-label="Start mission"
                >
                  <Zap className="w-4 h-4" strokeWidth={2.4} />
                </motion.button>
              )}
              {isFailed && (
                <span className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                  <Clock className="w-4 h-4 text-[#9CA3AF]" strokeWidth={2.2} />
                </span>
              )}
              {onDelete && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-[#F3F4F6] active:bg-[#E5E7EB] transition-colors"
                  aria-label="Delete mission"
                >
                  <Trash2 className="w-4 h-4 text-[#9CA3AF]" strokeWidth={2.2} />
                </motion.button>
              )}
              {!isVerified && <ChevronRight className="w-4 h-4 text-[#D1D5DB]" />}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
