"use client";

/**
 * PDR-4 §65 + §64: Focus mission experience.
 *
 * Timer + browser-visibility presence + periodic checkpoints. No camera
 * — focus is verified through session continuity signals, honestly
 * framed as supporting evidence rather than surveillance.
 *
 * §64: Adaptive checkpoint intervals for long missions:
 *   ≤10min: no intermediate checkpoints
 *   10-30min: every 5 min
 *   30-60min: every 5 min
 *   1hr+: every 10 min (reduced battery drain)
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Pause, Play, Square, Eye, Clock, CheckCircle2 } from "lucide-react";
import type { MissionDTO } from "@/server/services/mission-service";

type Props = {
  mission: MissionDTO;
  onComplete: (actualElapsed: number) => void;
  onCancel: () => void;
};

const HEARTBEAT_MS = 60_000; // presence heartbeat each minute

/** §64: Adaptive checkpoint frequency based on mission duration. */
function getCheckpointEveryNHeartbeats(durationSeconds: number): number {
  if (durationSeconds <= 600) return 999; // ≤10min: no intermediate checkpoints
  if (durationSeconds <= 1800) return 5;  // 10-30min: every 5 min
  if (durationSeconds <= 3600) return 5;  // 30-60min: every 5 min
  return 10;                              // 1hr+: every 10 min
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FocusMissionUI({ mission, onComplete, onCancel }: Props) {
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const totalPausedMsRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatCountRef = useRef(0);
  const interruptionsRef = useRef(0);
  const completedRef = useRef(false);
  const phaseRef = useRef<"idle" | "active" | "paused">("idle");

  const [phase, setPhase] = useState<"idle" | "active" | "paused" | "completed">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [presence, setPresence] = useState(true);
  const [checkpointsDone, setCheckpointsDone] = useState(0);

  const targetSeconds = mission.durationSeconds ?? 0;
  const checkpointEveryN = getCheckpointEveryNHeartbeats(targetSeconds);
  const totalCheckpoints = targetSeconds > 600
    ? Math.ceil(targetSeconds / (checkpointEveryN * (HEARTBEAT_MS / 1000)))
    : 0;

  const postEvent = useCallback(
    async (type: string, metadata?: Record<string, unknown>) => {
      try {
        await fetch(`/api/missions/${mission.id}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, metadata }),
        });
      } catch {
        // Best-effort telemetry; the final verify recomputes from
        // whatever events landed.
      }
    },
    [mission.id]
  );

  const currentElapsed = () => {
    if (startedAtRef.current === 0) return 0;
    const activeWindow =
      phaseRef.current === "paused"
        ? pausedAtRef.current - startedAtRef.current
        : Date.now() - startedAtRef.current;
    return Math.max(0, Math.round((activeWindow - totalPausedMsRef.current) / 1000));
  };

  /* Visibility presence tracking */
  useEffect(() => {
    const onVisibility = () => {
      const visible = !document.hidden;
      setPresence(visible);
      if (!visible && phaseRef.current === "active") {
        interruptionsRef.current += 1;
        void postEvent("INTERRUPTION", { atSecond: currentElapsed() });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [postEvent]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;

    if (tickRef.current) clearInterval(tickRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    void postEvent("SESSION_COMPLETED", { elapsedSeconds: currentElapsed() });
    onComplete(currentElapsed());
  }, [onComplete, postEvent]);

  const startHeartbeat = useCallback(() => {
    heartbeatRef.current = setInterval(() => {
      if (phaseRef.current !== "active") return;
      heartbeatCountRef.current += 1;
      const present = !document.hidden;
      if (present) {
        void postEvent("PRESENCE_CONFIRMED", {
          atSecond: currentElapsed(),
          sample: heartbeatCountRef.current,
        });
      }
      if (heartbeatCountRef.current % checkpointEveryN === 0) {
        setCheckpointsDone((c) => c + 1);
        void postEvent("SESSION_CHECKPOINT", {
          elapsedSeconds: currentElapsed(),
          checkpoint: heartbeatCountRef.current / checkpointEveryN,
          totalCheckpoints,
        });
      }
    }, HEARTBEAT_MS);
  }, [postEvent, checkpointEveryN, totalCheckpoints]);

  const handleStart = () => {
    if (phase !== "idle") return;
    startedAtRef.current = Date.now();
    phaseRef.current = "active";
    setPhase("active");
    startHeartbeat();
    void postEvent("SESSION_STARTED", { durationSeconds: targetSeconds });
  };

  const handlePause = () => {
    if (phaseRef.current !== "active") return;
    pausedAtRef.current = Date.now();
    phaseRef.current = "paused";
    setPhase("paused");
    void postEvent("SESSION_PAUSED", { elapsedSeconds: currentElapsed() });
  };

  const handleResume = () => {
    if (phaseRef.current !== "paused") return;
    totalPausedMsRef.current += Date.now() - pausedAtRef.current;
    startedAtRef.current = Date.now();
    phaseRef.current = "active";
    setPhase("active");
    void postEvent("SESSION_RESUMED", {});
  };

  /* Timer tick + auto-complete at target */
  useEffect(() => {
    if (phase !== "active") return;
    tickRef.current = setInterval(() => {
      const e = currentElapsed();
      setElapsed(e);
      if (targetSeconds > 0 && e >= targetSeconds) {
        finish();
      }
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, targetSeconds, finish]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  const remaining = Math.max(0, targetSeconds - elapsed);
  const progress = targetSeconds > 0 ? Math.min(1, elapsed / targetSeconds) : 0;
  const minutes = Math.floor(targetSeconds / 60);

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="text-center">
        <p className="text-[11px] font-bold tracking-[0.2em] text-[#5E5CE6] mb-2">DEEP FOCUS</p>
        <p className="text-[48px] font-bold text-[#1C1C1E] tabular-nums font-mono leading-none">{formatTime(elapsed)}</p>
        <p className="text-[13px] text-[#8E8E93] mt-2">
          {formatTime(remaining)} remaining · {minutes} min session
        </p>
      </div>

      <div className="w-full max-w-[280px]">
        <div className="h-2 rounded-full bg-[#F2F2F7] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#5E5CE6]"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-[#8E8E93]">0:00</span>
          <span className="text-[10px] text-[#8E8E93]">{formatTime(targetSeconds)}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${presence ? "bg-[#34C759]" : "bg-[#FF3B30]"}`} />
          <span className="text-[11px] text-[#8E8E93]">Presence {presence ? "✓" : "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-[#5E5CE6]" />
          <span className="text-[11px] text-[#8E8E93]">
            {phase === "active" ? "Session Active" : phase === "paused" ? "Paused" : "Ready"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#FF9500]" />
          <span className="text-[11px] text-[#8E8E93]">+{mission.rewardStPreview} ST</span>
        </div>
      </div>

      <p className="text-[11px] text-[#8E8E93] text-center max-w-[260px]">
        Stay in this screen while you work. We track session continuity — nothing is recorded.
      </p>

      <div className="flex items-center gap-3">
        {phase === "idle" && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            className="px-7 py-3.5 rounded-full bg-[#5E5CE6] text-white text-[14px] font-bold"
            style={{ boxShadow: "0 8px 16px -4px rgba(94,92,230,0.35)" }}
          >
            START FOCUS
          </motion.button>
        )}
        {phase === "active" && (
          <>
            <motion.button whileTap={{ scale: 0.98 }} onClick={handlePause} className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center" aria-label="Pause">
              <Pause className="w-5 h-5 text-[#1C1C1E]" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.98 }} onClick={finish} className="px-6 py-3 rounded-full bg-[#34C759] text-white text-[13px] font-bold">
              END SESSION
            </motion.button>
          </>
        )}
        {phase === "paused" && (
          <>
            <motion.button whileTap={{ scale: 0.98 }} onClick={handleResume} className="w-12 h-12 rounded-full bg-[#5E5CE6] flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.98 }} onClick={onCancel} className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center">
              <Square className="w-5 h-5 text-[#FF3B30]" />
            </motion.button>
          </>
        )}
      </div>

      {/* §64: Checkpoint progress visualization */}
      {totalCheckpoints > 0 && (checkpointsDone > 0 || phase === "active") && (
        <div className="w-full max-w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
              <span className="text-[11px] font-semibold text-[#636366]">CHECKPOINTS</span>
            </div>
            <span className="text-[11px] text-[#8E8E93]">
              {checkpointsDone}/{totalCheckpoints}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalCheckpoints }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8 }}
                animate={{ scale: i < checkpointsDone ? 1 : 0.8 }}
                className={`h-1.5 flex-1 rounded-full ${
                  i < checkpointsDone ? "bg-[#34C759]" : "bg-[#F2F2F7]"
                }`}
              />
            ))}
          </div>
          {checkpointsDone > 0 && (
            <p className="text-[10px] text-[#8E8E93] mt-1.5 text-center">
              {checkpointsDone} checkpoint{checkpointsDone > 1 ? "s" : ""} saved — keep going!
            </p>
          )}
        </div>
      )}

      {phase === "completed" && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[15px] font-bold text-[#34C759]">
          Focus Session Complete
        </motion.p>
      )}
    </div>
  );
}
