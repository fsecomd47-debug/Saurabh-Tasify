"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, ChevronRight, Flame, Target, Loader2, Play } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { useMissions, useStartMission } from "@/hooks/queries";
import { MissionPreviewCard } from "@/components/missions/MissionPreviewCard";
import { cn } from "@/lib/utils";

export const NextTaskHero: React.FC = () => {
  const openModal = useUIStore((s) => s.openModal);
  const router = useRouter();
  const { data: missionsData = { missions: [], active: null }, isLoading } = useMissions();
  const startMission = useStartMission();

  const activeMission = missionsData.active;
  const readyMissions = missionsData.missions.filter((m) => m.status === "ready");
  const nextMission = activeMission ?? readyMissions[0];

  if (isLoading) {
    return (
      <div className="px-5 mt-5">
        <div className="rounded-[20px] p-5 bg-white animate-pulse" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }} />
      </div>
    );
  }

  if (!nextMission) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="px-5 mt-5">
        <div className="bg-white rounded-[20px] p-6 text-center" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[#EDEDFC] mx-auto mb-3">
            <Target className="w-7 h-7 text-[#5E5CE6]" strokeWidth={1.8} />
          </div>
          <p className="text-[16px] font-bold text-[#1C1C1E] mb-1">No Active Missions</p>
          <p className="text-[13px] text-[#8E8E93] mb-4">Create your first mission to start earning</p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => openModal("addTask")}
            className="px-6 py-3 rounded-[14px] text-[14px] font-semibold text-white"
            style={{ background: "#5E5CE6", boxShadow: "0 8px 16px -4px rgba(94,92,230,0.3)" }}
          >
            CREATE MISSION
          </motion.button>
        </div>
      </motion.div>
    );
  }

  const isActive = nextMission.status === "active";

  async function handleStart() {
    if (!startMission.isPending) {
      await startMission.mutateAsync(nextMission.id);
    }
  }

  async function handleComplete() {
    // For completed missions, navigate to tasks page
    router.push("/tasks");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="px-5 mt-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-[#5E5CE6]" strokeWidth={2.2} />
        <h2 className="text-[15px] font-bold text-[#1C1C1E]">YOUR NEXT MISSION</h2>
      </div>

      {isActive ? (
        <div
          className={cn("relative rounded-[20px] p-5 overflow-hidden bg-white")}
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <span className="inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full font-semibold bg-[#EDEDFC] text-[#5E5CE6]">
              <Play className="w-2.5 h-2.5" strokeWidth={2.5} /> ACTIVE
            </span>
          </div>

          <h3 className="text-[17px] font-bold text-[#1C1C1E] mb-1">{nextMission.taskTitle}</h3>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#EDEDFC]">
                <span className="text-[10px] font-bold text-[#5E5CE6]">ST</span>
              </div>
              <span className="text-[15px] font-bold text-[#5E5CE6] tabular-nums">+{nextMission.rewardStPreview}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#E8FAF0]">
                <Zap className="w-3.5 h-3.5 text-[#34C759]" />
              </div>
              <span className="text-[15px] font-bold text-[#34C759] tabular-nums">+{nextMission.rewardXpPreview}</span>
              <span className="text-[10px] font-semibold text-[#8E8E93]">XP</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleComplete}
            className="w-full py-3.5 rounded-[14px] text-[14px] font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: "#34C759", boxShadow: "0 8px 16px -4px rgba(52,199,89,0.3)" }}
          >
            <Zap className="w-4 h-4" /> VIEW PROGRESS <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      ) : (
        <MissionPreviewCard
          mission={nextMission}
          onStart={handleStart}
        />
      )}
    </motion.div>
  );
};
