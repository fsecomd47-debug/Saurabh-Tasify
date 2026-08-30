"use client";

/**
 * PDR-4.1: Missions List Page
 * Shows all user missions with status filtering.
 */

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useMissions } from "@/hooks/queries";
import { getVerificationModeLabel } from "@/lib/verification-labels";
import { cn } from "@/lib/utils";

type MissionItem = {
  id: string;
  taskTitle: string;
  activityType: string;
  verificationMode: string;
  status: string;
  difficulty: string;
  durationSeconds: number | null;
  targetRepetitions: number | null;
  rewardStPreview: number;
  rewardXpPreview: number;
  createdAt: string;
};

const STATUS_FILTERS = ["all", "active", "ready", "passed", "failed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ready: { bg: "bg-[#EDEDFC]", text: "text-[#5E5CE6]" },
  active: { bg: "bg-[#FFF3E0]", text: "text-[#FF9500]" },
  passed: { bg: "bg-[#E8FAF0]", text: "text-[#34C759]" },
  settled: { bg: "bg-[#E8FAF0]", text: "text-[#34C759]" },
  failed: { bg: "bg-[#FFE5E5]", text: "text-[#FF3B30]" },
  review: { bg: "bg-[#FFF3E0]", text: "text-[#FF9500]" },
  cancelled: { bg: "bg-[#F2F2F7]", text: "text-[#8E8E93]" },
  expired: { bg: "bg-[#F2F2F7]", text: "text-[#8E8E93]" },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "text-[#34C759]",
  medium: "text-[#FF9500]",
  hard: "text-[#FF3B30]",
  elite: "text-[#AF52DE]",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}m`;
}

export default function MissionsPage() {
  const router = useRouter();
  const { data, isLoading } = useMissions();
  const [filter, setFilter] = React.useState<StatusFilter>("all");

  const missions: MissionItem[] = data?.missions ?? [];
  const filtered = filter === "all" ? missions : missions.filter((m) => m.status === filter);

  return (
    <AppShell>
      <TopBar title="Missions" subtitle={`${missions.length} total`} showAction={false} />

      {/* Status filter tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[12px] font-semibold capitalize whitespace-nowrap transition-colors",
                filter === s
                  ? "bg-[#1C1C1E] text-white"
                  : "bg-[#F2F2F7] text-[#636366]"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Mission list */}
      <div className="px-5 space-y-3">
        {isLoading && (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-[20px] bg-white animate-pulse"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }} />
            ))}
          </>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[14px] text-[#8E8E93]">No missions found</p>
            <p className="text-[12px] text-[#C7C7CC] mt-1">Create a task to get started</p>
          </div>
        )}

        {filtered.map((mission, i) => {
          const statusColor = STATUS_COLORS[mission.status] ?? STATUS_COLORS.ready;
          const diffColor = DIFFICULTY_COLORS[mission.difficulty] ?? "text-[#8E8E93]";

          return (
            <motion.button
              key={mission.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => router.push(`/missions/${mission.id}`)}
              className="w-full text-left p-4 rounded-[20px] bg-white transition-all active:scale-[0.98]"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1C1C1E] truncate">{mission.taskTitle}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-[11px] font-bold uppercase", diffColor)}>
                      {mission.difficulty}
                    </span>
                    <span className="text-[11px] text-[#C7C7CC]">·</span>
                    <span className="text-[11px] text-[#8E8E93]">
                      {getVerificationModeLabel(mission.verificationMode as any)}
                    </span>
                    {mission.durationSeconds && (
                      <>
                        <span className="text-[11px] text-[#C7C7CC]">·</span>
                        <span className="text-[11px] text-[#8E8E93]">{formatDuration(mission.durationSeconds)}</span>
                      </>
                    )}
                    {mission.targetRepetitions && (
                      <>
                        <span className="text-[11px] text-[#C7C7CC]">·</span>
                        <span className="text-[11px] text-[#8E8E93]">{mission.targetRepetitions} reps</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase", statusColor.bg, statusColor.text)}>
                    {mission.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[12px] font-bold text-[#FF9500]">+{mission.rewardStPreview}</span>
                    <span className="text-[10px] text-[#8E8E93]">ST</span>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </AppShell>
  );
}
