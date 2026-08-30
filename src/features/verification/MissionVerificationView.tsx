"use client";

/**
 * PDR-4 §96: MissionVerificationView
 * Master verification UI component that routes to the correct
 * verification mode based on mission contract.
 *
 * Physical → Camera + Pose
 * Focus → Timer + Presence
 * Visual Result → Scene Comparison / Photo
 * External Result → Evidence Upload
 * Simple → Self-report
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, AlertCircle, CheckCircle2, Clock, Camera } from "lucide-react";
import type { MissionDTO } from "@/server/services/mission-service";
import { FocusMissionUI } from "./focus/focus-ui";
import { PoseMissionUI } from "./pose/PoseMissionUI";
import { TimerMissionUI } from "./timer/TimerMissionUI";
import { SelfReportMissionUI } from "./self-report/SelfReportMissionUI";
import { SceneComparisonClient } from "./scene/SceneComparisonClient";
import { OCRDocumentCapture } from "./document/OCRDocumentCapture";
import { VerificationOrchestrator, type OrchestratorResult } from "./verification-orchestrator";
import { MissionResultCard } from "@/components/missions/MissionResultCard";

// ============================================================================
// Types
// ============================================================================

type Props = {
  mission: MissionDTO;
  onComplete: (result: {
    status: "passed" | "failed" | "uncertain";
    confidence: number;
    duration?: number;
    repetitions?: number;
    presenceSamples?: number;
    reasonCode: string;
    metadata?: Record<string, unknown>;
  }) => void;
  onCancel: () => void;
};

type ViewPhase =
  | "consent"
  | "camera-consent"
  | "verification"
  | "result"
  | "error";

// ============================================================================
// Verification Description Map
// ============================================================================

const VERIFICATION_INFO: Record<string, { icon: string; label: string; description: string }> = {
  pose: { icon: "📸", label: "Camera Verification", description: "Your camera will verify movement and count repetitions." },
  repetition: { icon: "📸", label: "Camera Verification", description: "Your camera will verify movement and count repetitions." },
  focus: { icon: "🧠", label: "Focus Session", description: "Stay in this screen while you work. We track session continuity." },
  timed: { icon: "⏱", label: "Timer Verification", description: "Complete the task within the time limit." },
  photo: { icon: "📷", label: "Photo Evidence", description: "Take a photo showing the completed task." },
  evidence: { icon: "📎", label: "Evidence Required", description: "Submit evidence of task completion." },
  self_reported: { icon: "✋", label: "Self-Report", description: "Confirm that you completed this task." },
  hybrid: { icon: "🔗", label: "Combined Verification", description: "Multiple signals will verify completion." },
  review: { icon: "👁", label: "Under Review", description: "Your evidence will be reviewed." },
  activity_signal: { icon: "📊", label: "Activity Signal", description: "Device activity data will verify completion." },
};

// ============================================================================
// MissionVerificationView
// ============================================================================

export function MissionVerificationView({ mission, onComplete, onCancel }: Props) {
  const [phase, setPhase] = useState<ViewPhase>(
    mission.verificationMode === "self_reported" || mission.verificationMode === "photo" || mission.verificationMode === "evidence"
      ? "verification"
      : "consent"
  );
  const [result, setResult] = useState<OrchestratorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const orchestratorRef = useRef<VerificationOrchestrator | null>(null);

  const info = VERIFICATION_INFO[mission.verificationMode] ?? VERIFICATION_INFO.self_reported;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      orchestratorRef.current?.dispose();
    };
  }, []);

  // ─── Camera Consent ────────────────────────────────

  const requiresCameraConsent =
    mission.verificationMode === "pose" || mission.verificationMode === "repetition";

  const handleConsentAccept = useCallback(() => {
    if (requiresCameraConsent) {
      setPhase("camera-consent");
    } else {
      setPhase("verification");
    }
  }, [requiresCameraConsent]);

  const handleCameraConsentAccept = useCallback(() => {
    setPhase("verification");
  }, []);

  const handleCameraConsentDecline = useCallback(() => {
    onCancel();
  }, [onCancel]);

  // ─── Verification Complete ─────────────────────────

  const handleVerificationComplete = useCallback(
    (verificationResult: {
      status: "passed" | "failed" | "uncertain";
      confidence: number;
      duration?: number;
      repetitions?: number;
      presenceSamples?: number;
      reasonCode: string;
      metadata?: Record<string, unknown>;
    }) => {
      setResult({
        ...verificationResult,
        evidence: {
          duration: verificationResult.duration,
          repetitions: verificationResult.repetitions,
          presenceSamples: verificationResult.presenceSamples,
        },
      });
      setPhase("result");
    },
    []
  );

  const handleVerificationError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setPhase("error");
  }, []);

  // ─── Result Actions ────────────────────────────────

  const handleClaimReward = useCallback(() => {
    if (result) {
      onComplete({
        status: result.status,
        confidence: result.confidence,
        duration: result.evidence?.duration,
        repetitions: result.evidence?.repetitions,
        presenceSamples: result.evidence?.presenceSamples,
        reasonCode: result.reasonCode,
        metadata: result.metadata,
      });
    }
  }, [result, onComplete]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setError(null);
    setPhase(requiresCameraConsent ? "consent" : "verification");
  }, [requiresCameraConsent]);

  // ─── Render ────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col">
      {/* Top Bar */}
      <div className="bg-white px-5 pt-3 pb-3 flex items-center justify-between"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center" aria-label="Cancel mission">
            <X className="w-4 h-4 text-[#8E8E93]" />
          </button>
          <div>
            <p className="text-[13px] font-bold text-[#1C1C1E]">{mission.taskTitle}</p>
            <p className="text-[11px] text-[#8E8E93]">{info.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-[#F2F2F7] px-2.5 py-1 rounded-full">
          <span className="text-[11px] font-bold text-[#FF9500]">+{mission.rewardStPreview} ST</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* ─── Consent Phase ─── */}
          {phase === "consent" && (
            <motion.div
              key="consent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-5"
            >
              <div className="bg-white rounded-[20px] p-6 text-center"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)" }}>
                <div className="text-[40px] mb-4">{info.icon}</div>
                <h2 className="text-[20px] font-bold text-[#1C1C1E] mb-2">{info.label}</h2>
                <p className="text-[14px] text-[#8E8E93] mb-6 max-w-[280px] mx-auto">
                  {info.description}
                </p>

                <div className="bg-[#F9F9FB] rounded-[14px] p-4 mb-6 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8E8E93]">Goal</span>
                    <span className="text-[13px] font-semibold text-[#1C1C1E]">
                      {mission.targetRepetitions
                        ? `${mission.targetRepetitions} reps`
                        : mission.durationSeconds
                          ? `${Math.floor(mission.durationSeconds / 60)} min`
                          : "Complete task"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8E8E93]">Difficulty</span>
                    <span className="text-[13px] font-semibold text-[#1C1C1E] capitalize">
                      {mission.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#8E8E93]">Reward</span>
                    <span className="text-[13px] font-bold text-[#FF9500]">
                      +{mission.rewardStPreview} ST · +{mission.rewardXpPreview} XP
                    </span>
                  </div>
                </div>

                <div className="bg-[#FFF9F0] rounded-[12px] p-3 mb-5 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-[#FF9500] flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#8a5b00] text-left">
                    Camera use begins only after you continue. Only relevant movement data is processed. Nothing is recorded.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConsentAccept}
                    className="w-full h-12 rounded-[14px] bg-[#5E5CE6] text-white text-[15px] font-bold"
                    style={{ boxShadow: "0 8px 16px -4px rgba(94,92,230,0.35)" }}
                  >
                    {requiresCameraConsent ? "ALLOW CAMERA" : "START MISSION"}
                  </motion.button>
                  <button
                    onClick={onCancel}
                    className="w-full h-11 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[13px] font-bold"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Camera Consent Phase ─── */}
          {phase === "camera-consent" && (
            <motion.div
              key="camera-consent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-5"
            >
              <div className="bg-white rounded-[20px] p-6 text-center"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)" }}>
                <div className="w-16 h-16 rounded-full bg-[#F0EFFF] flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-[#5E5CE6]" />
                </div>
                <h2 className="text-[20px] font-bold text-[#1C1C1E] mb-2">Camera Verification</h2>
                <p className="text-[13px] text-[#8E8E93] mb-5 max-w-[280px] mx-auto">
                  This mission uses your camera to verify movement and count repetitions.
                </p>

                <div className="bg-[#F9F9FB] rounded-[14px] p-4 mb-5 text-left space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#34C759] text-[13px] mt-0.5">✓</span>
                    <span className="text-[12px] text-[#8E8E93]">Camera is only active during this mission</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#34C759] text-[13px] mt-0.5">✓</span>
                    <span className="text-[12px] text-[#8E8E93]">No video is recorded or stored</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#34C759] text-[13px] mt-0.5">✓</span>
                    <span className="text-[12px] text-[#8E8E93]">Processing happens on your device</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#34C759] text-[13px] mt-0.5">✓</span>
                    <span className="text-[12px] text-[#8E8E93]">You can stop the camera at any time</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCameraConsentAccept}
                    className="w-full h-12 rounded-[14px] bg-[#5E5CE6] text-white text-[15px] font-bold"
                    style={{ boxShadow: "0 8px 16px -4px rgba(94,92,230,0.35)" }}
                  >
                    ALLOW CAMERA
                  </motion.button>
                  <button
                    onClick={handleCameraConsentDecline}
                    className="w-full h-11 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[13px] font-bold"
                  >
                    CANCEL
                  </button>
                </div>

                <p className="text-[10px] text-[#C7C7CC] mt-4">
                  You can revoke camera access at any time in your browser settings.
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── Verification Phase ─── */}
          {phase === "verification" && (
            <motion.div
              key="verification"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-4"
            >
              {renderVerificationUI(mission, handleVerificationComplete, handleVerificationError, onCancel)}
            </motion.div>
          )}

          {/* ─── Result Phase ─── */}
          {phase === "result" && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-5"
            >
              <MissionResultCard
                status={result.status}
                stGained={result.status === "passed" ? mission.rewardStPreview : 0}
                xpGained={result.status === "passed" ? mission.rewardXpPreview : 0}
                reasonCode={result.reasonCode}
                onClaim={result.status === "passed" ? handleClaimReward : undefined}
                onRetry={result.status !== "passed" ? handleRetry : undefined}
                onNext={onCancel}
              />
            </motion.div>
          )}

          {/* ─── Error Phase ─── */}
          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-5"
            >
              <div className="bg-white rounded-[20px] p-6 text-center"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <AlertCircle className="w-12 h-12 text-[#FF3B30] mx-auto mb-4" />
                <h2 className="text-[18px] font-bold text-[#1C1C1E] mb-2">Something went wrong</h2>
                <p className="text-[13px] text-[#8E8E93] mb-6">{error}</p>
                <div className="space-y-2.5">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRetry}
                    className="w-full h-12 rounded-[14px] bg-[#5E5CE6] text-white text-[14px] font-bold"
                  >
                    TRY AGAIN
                  </motion.button>
                  <button
                    onClick={onCancel}
                    className="w-full h-11 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[13px] font-bold"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// Verification UI Router
// ============================================================================

function renderVerificationUI(
  mission: MissionDTO,
  onComplete: (result: {
    status: "passed" | "failed" | "uncertain";
    confidence: number;
    duration?: number;
    repetitions?: number;
    presenceSamples?: number;
    reasonCode: string;
    metadata?: Record<string, unknown>;
  }) => void,
  onError: (error: string) => void,
  onCancel: () => void
): React.ReactNode {
  switch (mission.verificationMode) {
    case "pose":
    case "repetition":
      return (
        <PoseMissionUI
          mission={{
            id: mission.id,
            taskTitle: mission.taskTitle,
            activityType: mission.activityType,
            targetRepetitions: mission.targetRepetitions ?? 10,
            rewardStPreview: mission.rewardStPreview,
            rewardXpPreview: mission.rewardXpPreview,
          }}
          onComplete={(result: { confidence: number; duration: number; reps: number; metadata?: Record<string, unknown> }) =>
            onComplete({
              status: "passed",
              confidence: result.confidence,
              duration: result.duration,
              repetitions: result.reps,
              reasonCode: "REPETITION_VERIFIED",
              metadata: result.metadata,
            })
          }
          onCancel={onCancel}
        />
      );

    case "focus":
      return (
        <FocusMissionUI
          mission={mission}
          onComplete={(elapsed: number) =>
            onComplete({
              status: "passed",
              confidence: 0.8,
              duration: elapsed,
              reasonCode: "FOCUS_SESSION_VERIFIED",
            })
          }
          onCancel={onCancel}
        />
      );

    case "timed":
      return (
        <TimerMissionUI
          mission={mission}
          onComplete={(result: { confidence: number; duration?: number }) =>
            onComplete({
              status: "passed",
              confidence: result.confidence,
              duration: result.duration,
              reasonCode: "TIMER_VERIFIED",
            })
          }
          onCancel={onCancel}
        />
      );

    case "photo":
      return (
        <SceneComparisonClient
          missionTitle={mission.taskTitle}
          onComplete={(result: { confidence: number; metadata: Record<string, unknown> }) =>
            onComplete({
              status: result.confidence >= 0.6 ? "passed" : "uncertain",
              confidence: result.confidence,
              reasonCode: (result.metadata as { sceneChanged?: boolean }).sceneChanged ? "SCENE_VERIFIED" : "INSUFFICIENT_EVIDENCE",
              metadata: result.metadata,
            })
          }
          onCancel={onCancel}
        />
      );

    case "evidence":
    case "hybrid":
      return mission.activityType === "external_result" ? (
        <OCRDocumentCapture
          missionTitle={mission.taskTitle}
          onComplete={(result: { confidence: number; metadata: Record<string, unknown> }) =>
            onComplete({
              status: result.confidence >= 0.5 ? "passed" : "uncertain",
              confidence: result.confidence,
              reasonCode: "EVIDENCE_SUBMITTED",
              metadata: result.metadata,
            })
          }
          onCancel={onCancel}
        />
      ) : (
        <SceneComparisonClient
          missionTitle={mission.taskTitle}
          onComplete={(result: { confidence: number; metadata: Record<string, unknown> }) =>
            onComplete({
              status: result.confidence >= 0.6 ? "passed" : "uncertain",
              confidence: result.confidence,
              reasonCode: "EVIDENCE_SUBMITTED",
              metadata: result.metadata,
            })
          }
          onCancel={onCancel}
        />
      );

    case "self_reported":
      return (
        <SelfReportMissionUI
          mission={mission}
          onComplete={() =>
            onComplete({
              status: "passed",
              confidence: 0.6,
              reasonCode: "SELF_REPORTED",
            })
          }
          onCancel={onCancel}
        />
      );

    default:
      return (
        <SelfReportMissionUI
          mission={mission}
          onComplete={() =>
            onComplete({
              status: "passed",
              confidence: 0.6,
              reasonCode: "SELF_REPORTED",
            })
          }
          onCancel={onCancel}
        />
      );
  }
}
