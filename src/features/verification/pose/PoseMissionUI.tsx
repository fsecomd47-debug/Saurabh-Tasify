"use client";

/**
 * PDR-4 §32-§38 + §67-§69 + §74: Pose mission experience.
 *
 * The camera opens only through the unified session, verification runs
 * on-device against real pose landmarks, reps count through a validated
 * state machine, and feedback stays encouraging (§37). Raw frames are
 * processed in-memory and discarded — nothing is recorded (§29).
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Pause, Play, Square, Target, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { PoseRuntime } from "./pose-runtime";
import { CameraSession, type CameraHealth, type CameraIssue } from "@/features/verification/camera/camera-session";
import type { RepEvent } from "./enhanced-rep-counter";

type Props = {
  mission: {
    id: string;
    taskTitle: string;
    activityType?: string;
    targetRepetitions: number;
    rewardStPreview: number;
    rewardXpPreview: number;
  };
  onComplete: (result: { reps: number; duration: number; confidence: number; metadata?: Record<string, unknown> }) => void;
  onCancel: () => void;
};

type Phase = "preparing" | "calibrating" | "active" | "paused" | "completed";

const ISSUE_GUIDANCE: Record<Exclude<CameraIssue, null>, string> = {
  PERMISSION_DENIED: "Camera permission was denied.",
  NO_DEVICE: "No camera was found.",
  INSECURE_CONTEXT: "Camera needs a secure connection.",
  TRACK_ENDED: "The camera disconnected. Restart the mission to continue.",
  FROZEN_FRAME: "The camera feed froze. Try switching cameras.",
  SCENE_DARK: "The scene is too dark. Add more light so your movement is visible.",
  LOCK_HELD: "Another camera session is running.",
};

const ACTIVITY_ALIASES: Record<string, string> = {
  pushup: "pushup",
  push_up: "pushup",
  pushups: "pushup",
  squat: "squat",
  squats: "squat",
  lunge: "lunge",
  lunges: "lunge",
};

function resolveActivity(title: string): string {
  const normalized = title.toLowerCase();
  for (const [key, value] of Object.entries(ACTIVITY_ALIASES)) {
    if (normalized.includes(key)) return value;
  }
  return "pushup";
}

export function PoseMissionUI({ mission, onComplete, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CameraSession | null>(null);
  const runtimeRef = useRef<PoseRuntime | null>(null);
  const rafRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const elapsedBaseRef = useRef<number>(0);
  const repTimestampsRef = useRef<number[]>([]);
  const repQualitiesRef = useRef<number[]>([]);
  const completedRef = useRef(false);
  const phaseRef = useRef<Phase>("preparing");

  const [phase, setPhase] = useState<Phase>("preparing");
  const [reps, setReps] = useState(0);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [calibrationHint, setCalibrationHint] = useState("Stand back so your full body is visible");
  const [health, setHealth] = useState<CameraHealth | null>(null);
  const [issue, setIssue] = useState<CameraIssue>(null);
  const [elapsed, setElapsed] = useState(0);
  const [prepError, setPrepError] = useState<string | null>(null);

  const setPhaseSafe = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  /* ── Setup: camera session → pose model → calibration ── */
  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;

    const videoEl: HTMLVideoElement = video;

    async function setup() {
      const session = CameraSession.tryAcquire();
      if (!session) {
        setPrepError(ISSUE_GUIDANCE.LOCK_HELD);
        return;
      }
      sessionRef.current = session;

      session.onHealth((h, camIssue) => {
        if (cancelled) return;
        setHealth(h);
        setIssue(camIssue);
      });

      try {
        await session.start(videoEl, {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        });
      } catch (err) {
        if (!cancelled) {
          const code = (err as Error & { issue?: CameraIssue }).issue ?? "PERMISSION_DENIED";
          setPrepError(ISSUE_GUIDANCE[code] ?? "Camera could not start.");
        }
        return;
      }
      if (cancelled) return;

      try {
        const runtime = new PoseRuntime(resolveActivity(mission.taskTitle), mission.targetRepetitions, {
          onRep: handleRep,
          onFeedback: (msg) => {
            if (!cancelled) setFormFeedback(msg);
          },
          onVisibility: (visible) => {
            if (!cancelled && phaseRef.current === "calibrating") {
              setCalibrationHint(visible ? "Hold still…" : "Step back into the frame");
            }
          },
        });
        runtimeRef.current = runtime;
        await runtime.ensureModel();
      } catch (err) {
        console.error("[PoseMissionUI] Model load failed:", err);
        if (!cancelled) {
          setPrepError("Pose tracking model failed to load. Make sure you have a stable internet connection and try again.");
        }
        return;
      }
      if (cancelled) return;

      elapsedBaseRef.current = 0;
      setPhaseSafe("calibrating");
      loop();
    }

    function handleRep(rep: RepEvent) {
      if (cancelled || completedRef.current) return;
      repTimestampsRef.current.push(Date.now());
      repQualitiesRef.current.push(rep.quality === "good" ? 1 : rep.quality === "acceptable" ? 0.75 : 0.5);
      setReps(rep.repCount);
      void postRepConfirmed(rep.repCount);

      if (rep.repCount >= mission.targetRepetitions) {
        completeWithReps(rep.repCount);
      }
    }

    function loop() {
      if (cancelled) return;
      rafRef.current = requestAnimationFrame(loop);

      const now = performance.now();

      if (phaseRef.current === "active" || phaseRef.current === "calibrating") {
        const runtime = runtimeRef.current;
        const videoEl = videoRef.current;
        if (runtime && videoEl && videoEl.readyState >= 2) {
          const counting = phaseRef.current === "active";
          const outcome = runtime.processVideoFrame(videoEl, now, counting);

          if (phaseRef.current === "calibrating") {
            calibrationSamplesRef.current = outcome?.personVisible
              ? Math.min(calibrationSamplesRef.current + 1, 200)
              : Math.max(calibrationSamplesRef.current - 2, 0);
            if (calibrationSamplesRef.current >= CALIBRATION_FRAMES_NEEDED) {
              beginActive();
            }
          }

          if (phaseRef.current === "active") {
            /* Throttle elapsed re-renders to ~1/s — the rAF loop must
               never drive React at frame rate. */
            if (now - lastElapsedRenderRef.current >= 1000) {
              lastElapsedRenderRef.current = now;
              setElapsed(elapsedBaseRef.current + Math.round((now - startedAtRef.current) / 1000));
            }
          }
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      runtimeRef.current?.dispose();
      runtimeRef.current = null;
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id]);

  const calibrationSamplesRef = useRef(0);
  const CALIBRATION_FRAMES_NEEDED = 18; // ~1.5s of stable person visibility
  const lastElapsedRenderRef = useRef(0);

  function beginActive() {
    startedAtRef.current = performance.now();
    setFormFeedback(null);
    setPhaseSafe("active");
    sessionRef.current?.markActive();
    void postMissionEvent("SESSION_STARTED", { mode: "pose" });
  }

  async function postMissionEvent(type: string, metadata: Record<string, unknown>) {
    try {
      await fetch(`/api/missions/${mission.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, metadata }),
      });
    } catch {
      // Event telemetry is best-effort; server anti-cheat relies on the final verify payload.
    }
  }

  async function postRepConfirmed(count: number) {
    if (count % 3 !== 0 && count !== mission.targetRepetitions) return;
    await postMissionEvent("REP_CONFIRMED", { count });
  }

  function completeWithReps(finalReps: number) {
    if (completedRef.current) return;
    completedRef.current = true;

    const totalSeconds =
      elapsedBaseRef.current +
      (phaseRef.current === "active" ? Math.round((performance.now() - startedAtRef.current) / 1000) : 0);

    const qualities = repQualitiesRef.current;
    const avgQuality =
      qualities.length > 0 ? qualities.reduce((s, q) => s + q, 0) / qualities.length : 0.6;

    setPhaseSafe("completed");

    setTimeout(() => {
      onComplete({
        reps: finalReps,
        duration: totalSeconds,
        confidence: Math.min(0.95, 0.55 + avgQuality * 0.4),
        metadata: {
          repTimestampCount: repTimestampsRef.current.length,
          averageRepQuality: Math.round(avgQuality * 1000) / 1000,
        },
      });
    }, 600);
  }

  function handlePause() {
    if (phaseRef.current !== "active") return;
    elapsedBaseRef.current += Math.round((performance.now() - startedAtRef.current) / 1000);
    setFormFeedback(null);
    setPhaseSafe("paused");
  }

  function handleResume() {
    if (phaseRef.current !== "paused") return;
    startedAtRef.current = performance.now();
    setPhaseSafe("active");
  }

  function handleEndSet() {
    completeWithReps(runtimeRef.current?.getRepCount() ?? reps);
  }

  const targetReps = mission.targetRepetitions;
  const progress = Math.min(1, reps / targetReps);
  const showHealthWarning =
    issue !== null &&
    issue !== "LOCK_HELD" &&
    (phase === "calibrating" || phase === "active");

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <div className="text-center">
        <p className="text-[11px] font-bold tracking-[0.2em] text-[#FF9500] mb-1">{mission.taskTitle.toUpperCase()}</p>
        <p className="text-[44px] font-bold text-[#1C1C1E] tabular-nums font-mono leading-none">{reps} / {targetReps}</p>
      </div>

      <div className="relative w-full max-w-[340px] rounded-[20px] overflow-hidden bg-black" style={{ aspectRatio: "4/3" }}>
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

        {(phase === "active" || phase === "calibrating") && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full">
            <span className={`w-2 h-2 rounded-full ${health?.healthy ? "bg-[#FF3B30] animate-pulse" : "bg-white/40"}`} />
            <span className="text-[10px] font-bold tracking-wider text-white/90">CAMERA ACTIVE</span>
          </div>
        )}

        {showHealthWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-x-3 top-12 bg-[#FFF4E5]/95 rounded-[12px] p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#FF9500] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#8a5b00] font-medium">{ISSUE_GUIDANCE[issue as Exclude<CameraIssue, null>]}</p>
          </motion.div>
        )}

        {formFeedback && phase === "active" && !showHealthWarning && (
          <motion.div
            key={formFeedback}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[11px] font-medium px-4 py-2 rounded-full whitespace-nowrap"
          >
            {formFeedback}
          </motion.div>
        )}

        {phase === "preparing" && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center px-6 text-center">
            {prepError ? (
              <>
                <AlertCircle className="w-8 h-8 text-[#FF9500] mb-3" />
                <p className="text-white text-[13px] font-medium mb-4">{prepError}</p>
                <button onClick={onCancel} className="px-5 py-2.5 rounded-full bg-white/15 text-white text-[13px] font-bold">
                  BACK
                </button>
              </>
            ) : (
              <>
                <Loader2 className="w-7 h-7 text-white animate-spin mb-3" />
                <p className="text-white text-[14px] font-bold">PREPARING</p>
                <p className="text-white/70 text-[12px] mt-1">Loading movement verification</p>
              </>
            )}
          </div>
        )}

        {phase === "calibrating" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center rounded-[16px]">
            <div className="relative w-20 h-20 mb-4">
              <svg viewBox="0 0 64 64" className="-rotate-90 w-full h-full">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#34C759"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - calibrationSamplesRef.current / CALIBRATION_FRAMES_NEEDED)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-white text-[14px] font-bold">GET INTO POSITION</p>
            <p className="text-white/70 text-[12px] mt-1">{calibrationHint}</p>
          </motion.div>
        )}

        {phase === "completed" && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-[16px]">
            <div className="w-20 h-20 rounded-full bg-[#E8FAF0] flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-[#34C759]" />
            </div>
            <p className="text-white text-[18px] font-bold">SET COMPLETE</p>
            <p className="text-white/70 text-[13px] mt-1">{reps} / {targetReps} valid reps</p>
          </motion.div>
        )}
      </div>

      <div className="w-full max-w-[300px]">
        <div className="h-2 rounded-full bg-[#F2F2F7] overflow-hidden">
          <motion.div className="h-full rounded-full bg-[#FF9500]" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.25 }} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-[#FF9500]" />
          <span className="text-[11px] text-[#8E8E93]">{reps} valid reps</span>
        </div>
        <span className="text-[11px] text-[#8E8E93]">⏱ {formatTime(elapsed)}</span>
        <span className="text-[11px] font-bold text-[#FF9500]">+{mission.rewardStPreview} ST</span>
      </div>

      <div className="flex items-center gap-3">
        {phase === "calibrating" && (
          <div className="flex items-center gap-2 text-[#8E8E93] text-[13px] py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Detecting your position…
          </div>
        )}
        {phase === "active" && (
          <>
            <motion.button whileTap={{ scale: 0.98 }} onClick={handlePause} className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center" aria-label="Pause">
              <Pause className="w-5 h-5 text-[#1C1C1E]" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.98 }} onClick={handleEndSet} className="px-6 py-3 rounded-full bg-[#F2F2F7] text-[#1C1C1E] text-[13px] font-bold">
              END SET
            </motion.button>
          </>
        )}
        {phase === "paused" && (
          <>
            <motion.button whileTap={{ scale: 0.98 }} onClick={handleResume} className="w-12 h-12 rounded-full bg-[#FF9500] flex items-center justify-center" aria-label="Resume">
              <Play className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button whileTap={{ scale: 0.98 }} onClick={onCancel} className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center" aria-label="Stop">
              <Square className="w-5 h-5 text-[#FF3B30]" />
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
