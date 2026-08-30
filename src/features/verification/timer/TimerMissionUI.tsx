"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Square, CheckCircle2 } from "lucide-react";
import type { MissionDTO } from "@/server/services/mission-service";

type Props = {
  mission: MissionDTO;
  onComplete: (result: { duration?: number; confidence: number }) => void;
  onCancel: () => void;
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CircularProgress({ progress, size = 200, stroke = 8 }: { progress: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#F2F2F7"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#5E5CE6"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-linear"
      />
    </svg>
  );
}

export function TimerMissionUI({ mission, onComplete, onCancel }: Props) {
  const totalSeconds = mission.durationSeconds ?? 600;
  const [elapsed, setElapsed] = useState(0);
  const [state, setState] = useState<"idle" | "running" | "completed">("idle");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const remaining = Math.max(0, totalSeconds - elapsed);
  const progress = elapsed / totalSeconds;

  const handleComplete = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState("completed");
    onComplete({ duration: elapsed, confidence: 0.7 });
  }, [elapsed, onComplete]);

  useEffect(() => {
    if (state !== "running") return;

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= totalSeconds) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setState("completed");
          setTimeout(() => onComplete({ duration: totalSeconds, confidence: 0.85 }), 100);
          return totalSeconds;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state, totalSeconds, onComplete]);

  function handleStart() {
    setState("running");
  }

  function handleCancel() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onCancel();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[20px] p-6 mx-5"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)" }}
    >
      <div className="text-center mb-6">
        <h3 className="text-[18px] font-bold text-[#1C1C1E] mb-1">{mission.taskTitle}</h3>
        <p className="text-[13px] text-[#8E8E93]">Timer — complete your task before time runs out</p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="relative">
          <CircularProgress progress={progress} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Clock className="w-5 h-5 text-[#5E5CE6] mb-1" />
            <span className="text-[32px] font-bold text-[#1C1C1E] tabular-nums">
              {formatTime(remaining)}
            </span>
            <span className="text-[12px] text-[#8E8E93]">
              {state === "running" ? "remaining" : state === "completed" ? "complete" : "ready"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#F9F9FB] rounded-[14px] p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] text-[#8E8E93]">Target</span>
          <span className="text-[13px] font-semibold text-[#1C1C1E]">{formatTime(totalSeconds)}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] text-[#8E8E93]">Elapsed</span>
          <span className="text-[13px] font-semibold text-[#1C1C1E] tabular-nums">{formatTime(elapsed)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-[#8E8E93]">Reward</span>
          <span className="text-[13px] font-semibold text-[#FF9500]">{mission.rewardStPreview} ST</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          className="flex-1 py-3 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[13px] font-bold"
        >
          CANCEL
        </button>
        {state === "idle" && (
          <button
            onClick={handleStart}
            className="flex-1 py-3 rounded-[14px] bg-[#5E5CE6] text-white text-[13px] font-bold"
          >
            START TIMER
          </button>
        )}
        {state === "running" && (
          <button
            onClick={handleComplete}
            className="flex-1 py-3 rounded-[14px] bg-[#34C759] text-white text-[13px] font-bold flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            FINISHED EARLY
          </button>
        )}
        {state === "completed" && (
          <div className="flex-1 py-3 rounded-[14px] bg-[#E8FAF0] text-[#34C759] text-[13px] font-bold text-center">
            COMPLETED
          </div>
        )}
      </div>
    </motion.div>
  );
}
