"use client";

/**
 * Compound Mission Page
 * Handles multi-step missions where user completes several sub-tasks in sequence.
 * Each step can have its own verification mode (focus, pose, timer, etc.)
 */

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2, Circle, Trophy } from "lucide-react";
import { MissionPreviewCard } from "@/components/missions/MissionPreviewCard";
import { MissionResultCard } from "@/components/missions/MissionResultCard";
import { FocusMissionUI } from "@/features/verification/focus/focus-ui";
import { PoseMissionUI } from "@/features/verification/pose/PoseMissionUI";
import { SelfReportMissionUI } from "@/features/verification/self-report/SelfReportMissionUI";
import { TimerMissionUI } from "@/features/verification/timer/TimerMissionUI";
import { EvidenceMissionUI } from "@/features/verification/evidence/EvidenceMissionUI";
import { ActivitySignalMissionUI } from "@/features/verification/activity-signal/ActivitySignalMissionUI";
import type { CompoundMissionConfig, CompoundMissionStep, VerificationMode } from "@/types";

// ============================================================================
// Types
// ============================================================================

type CompoundMissionDetail = {
  id: string;
  taskTitle: string;
  difficulty: string;
  status: string;
  compoundConfig: CompoundMissionConfig;
  rewardStPreview: number;
  rewardXpPreview: number;
};

type StepResult = {
  stepId: string;
  status: "passed" | "failed" | "pending";
  stGained: number;
  xpGained: number;
};

type ViewState = "preview" | "active" | "step-complete" | "all-complete" | "failed";

// ============================================================================
// Compound Mission Page Component
// ============================================================================

export default function CompoundMissionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [viewState, setViewState] = useState<ViewState>("preview");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [mission, setMission] = useState<CompoundMissionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch mission data
  useEffect(() => {
    async function fetchMission() {
      try {
        const response = await fetch(`/api/missions/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          const m = data.data ?? data;
          setMission({
            id: m.id,
            taskTitle: m.taskTitle,
            difficulty: m.difficulty,
            status: m.status,
            compoundConfig: m.compoundConfig ?? {
              steps: [
                {
                  stepId: "step_1",
                  taskId: m.taskId,
                  taskTitle: m.taskTitle + " - Part 1",
                  verificationMode: m.verificationMode,
                  targetRepetitions: m.targetRepetitions,
                  durationSeconds: m.durationSeconds,
                  rewardStPreview: Math.ceil(m.rewardStPreview / 2),
                  rewardXpPreview: Math.ceil(m.rewardXpPreview / 2),
                  orderIndex: 0,
                },
                {
                  stepId: "step_2",
                  taskId: m.taskId,
                  taskTitle: m.taskTitle + " - Part 2",
                  verificationMode: "self_reported",
                  rewardStPreview: Math.floor(m.rewardStPreview / 2),
                  rewardXpPreview: Math.floor(m.rewardXpPreview / 2),
                  orderIndex: 1,
                },
              ],
              totalSteps: 2,
              currentStepIndex: 0,
              allStepsRequired: true,
            },
            rewardStPreview: m.rewardStPreview,
            rewardXpPreview: m.rewardXpPreview,
          });
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchMission();
  }, [params.id]);

  const steps = mission?.compoundConfig.steps ?? [];
  const currentStep = steps[currentStepIndex];
  const completedSteps = stepResults.filter((r) => r.status === "passed").length;
  const totalReward = steps.reduce((sum, s) => sum + s.rewardStPreview, 0);
  const totalXp = steps.reduce((sum, s) => sum + s.rewardXpPreview, 0);

  const handleStart = useCallback(() => {
    setViewState("active");
  }, []);

  const handleStepComplete = useCallback(
    async (result: { duration?: number; reps?: number; confidence: number; metadata?: Record<string, unknown> }) => {
      const stepResult: StepResult = {
        stepId: currentStep.stepId,
        status: "passed",
        stGained: currentStep.rewardStPreview,
        xpGained: currentStep.rewardXpPreview,
      };

      const newResults = [...stepResults, stepResult];
      setStepResults(newResults);

      if (currentStepIndex < steps.length - 1) {
        setViewState("step-complete");
      } else {
        setViewState("all-complete");
      }
    },
    [currentStep, currentStepIndex, stepResults, steps.length]
  );

  const handleNextStep = useCallback(() => {
    setCurrentStepIndex((prev) => prev + 1);
    setViewState("active");
  }, []);

  const handleStepFailed = useCallback(() => {
    const stepResult: StepResult = {
      stepId: currentStep.stepId,
      status: "failed",
      stGained: 0,
      xpGained: 0,
    };
    setStepResults((prev) => [...prev, stepResult]);
    setViewState("failed");
  }, [currentStep]);

  const handleRetryStep = useCallback(() => {
    setViewState("active");
  }, []);

  const handleClaimAll = useCallback(async () => {
    try {
      const response = await fetch(`/api/missions/${mission!.id}/claim`, {
        method: "POST",
      });

      if (response.ok) {
        router.push("/tasks");
      }
    } catch {
      // Handle error
    }
  }, [mission, router]);

  if (loading || !mission) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF9500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#F2F2F7]/80 backdrop-blur-xl">
        <div className="px-5 pt-14 pb-3">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)" }}
            >
              <ChevronLeft className="w-5 h-5 text-[#1C1C1E]" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-[20px] font-bold text-[#1C1C1E]" style={{ letterSpacing: "-0.02em" }}>
                Compound Mission
              </h1>
              <p className="text-[13px] text-[#8E8E93]">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step Progress Indicator */}
      <div className="px-5 py-3">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.stepId}>
              <div className="flex items-center gap-2">
                {stepResults.find((r) => r.stepId === step.stepId)?.status === "passed" ? (
                  <CheckCircle2 className="w-6 h-6 text-[#34C759]" />
                ) : index === currentStepIndex ? (
                  <div className="w-6 h-6 rounded-full bg-[#FF9500] flex items-center justify-center">
                    <span className="text-[11px] font-bold text-white">{index + 1}</span>
                  </div>
                ) : (
                  <Circle className="w-6 h-6 text-[#D1D1D6]" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 ${
                  stepResults.find((r) => r.stepId === step.stepId)?.status === "passed"
                    ? "bg-[#34C759]"
                    : "bg-[#D1D1D6]"
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 mt-4 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            key={viewState}
          >
            {viewState === "preview" && (
              <div className="space-y-4">
                <MissionPreviewCard
                  mission={{
                    id: mission.id,
                    title: mission.taskTitle,
                    difficulty: mission.difficulty,
                    verificationMode: "compound",
                    status: mission.status,
                    rewardStPreview: totalReward,
                    rewardXpPreview: totalXp,
                  }}
                  onStart={handleStart}
                />

                {/* Steps Overview */}
                <div className="bg-white rounded-[24px] p-5" style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.06)" }}>
                  <h3 className="text-[16px] font-bold text-[#1C1C1E] mb-3">Mission Steps</h3>
                  <div className="space-y-3">
                    {steps.map((step, index) => (
                      <div key={step.stepId} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          stepResults.find((r) => r.stepId === step.stepId)?.status === "passed"
                            ? "bg-[#E8FAF0]"
                            : "bg-[#F2F2F7]"
                        }`}>
                          {stepResults.find((r) => r.stepId === step.stepId)?.status === "passed" ? (
                            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                          ) : (
                            <span className="text-[12px] font-bold text-[#8E8E93]">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#1C1C1E]">{step.taskTitle}</p>
                          <p className="text-[12px] text-[#8E8E93]">
                            {step.verificationMode} • +{step.rewardStPreview} ST
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {viewState === "active" && currentStep && (
              <StepVerificationUI
                step={currentStep}
                missionId={mission.id}
                onComplete={handleStepComplete}
                onCancel={handleStepFailed}
              />
            )}

            {viewState === "step-complete" && (
              <div className="bg-white rounded-[24px] p-8 text-center" style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.06)" }}>
                <div className="w-16 h-16 rounded-full bg-[#E8FAF0] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[#34C759]" />
                </div>
                <h3 className="text-[18px] font-bold text-[#1C1C1E] mb-2">Step Complete!</h3>
                <p className="text-[14px] text-[#8E8E93] mb-6">
                  +{currentStep.rewardStPreview} ST earned
                </p>
                <button
                  onClick={handleNextStep}
                  className="w-full py-3 px-6 bg-[#FF9500] text-white rounded-xl font-medium hover:bg-[#FF9500]/90 transition-colors"
                >
                  Next Step ({currentStepIndex + 2} of {steps.length})
                </button>
              </div>
            )}

            {viewState === "all-complete" && (
              <div className="bg-white rounded-[24px] p-8 text-center" style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.06)" }}>
                <div className="w-16 h-16 rounded-full bg-[#FFF4E5] flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-[#FF9500]" />
                </div>
                <h3 className="text-[18px] font-bold text-[#1C1C1E] mb-2">All Steps Complete!</h3>
                <p className="text-[14px] text-[#8E8E93] mb-2">
                  {completedSteps} / {steps.length} steps completed
                </p>
                <p className="text-[20px] font-bold text-[#FF9500] mb-6">
                  +{totalReward} ST
                </p>
                <button
                  onClick={handleClaimAll}
                  className="w-full py-3 px-6 bg-[#34C759] text-white rounded-xl font-medium hover:bg-[#34C759]/90 transition-colors"
                >
                  Claim All Rewards
                </button>
              </div>
            )}

            {viewState === "failed" && (
              <MissionResultCard
                status="failed"
                stGained={0}
                xpGained={0}
                reasonCode="STEP_FAILED"
                onRetry={handleRetryStep}
                onNext={() => router.push("/tasks")}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// Step Verification UI (delegates to appropriate verification mode)
// ============================================================================

function StepVerificationUI({
  step,
  missionId,
  onComplete,
  onCancel,
}: {
  step: CompoundMissionStep;
  missionId: string;
  onComplete: (result: { duration?: number; reps?: number; confidence: number; metadata?: Record<string, unknown> }) => void;
  onCancel: () => void;
}) {
  const mission = {
    id: missionId,
    taskTitle: step.taskTitle,
    taskId: step.taskId,
    activityType: "focus" as const,
    verificationMode: step.verificationMode,
    status: "active" as const,
    targetRepetitions: step.targetRepetitions ?? 1,
    durationSeconds: step.durationSeconds ?? null,
    rewardStPreview: step.rewardStPreview,
    rewardXpPreview: step.rewardXpPreview,
    difficulty: "easy" as const,
    verificationRules: {},
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };

  switch (step.verificationMode) {
    case "focus":
      return (
        <FocusMissionUI
          mission={mission}
          onComplete={(duration) => onComplete({ duration, confidence: 0.85 })}
          onCancel={onCancel}
        />
      );
    case "pose":
    case "repetition":
      return (
        <PoseMissionUI
          mission={mission}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      );
    case "self_reported":
      return (
        <SelfReportMissionUI
          mission={mission}
          onComplete={(result) => onComplete({ confidence: result.confidence })}
          onCancel={onCancel}
        />
      );
    case "timed":
      return (
        <TimerMissionUI
          mission={mission}
          onComplete={(result) => onComplete({ duration: result.duration, confidence: result.confidence })}
          onCancel={onCancel}
        />
      );
    case "evidence":
    case "hybrid":
      return (
        <EvidenceMissionUI
          mission={mission}
          onComplete={(result) => onComplete({ duration: result.duration, confidence: result.confidence, metadata: result.metadata })}
          onCancel={onCancel}
        />
      );
    case "activity_signal":
      return (
        <ActivitySignalMissionUI
          mission={mission}
          onComplete={(result) => onComplete({ confidence: result.confidence, metadata: result.metadata })}
          onCancel={onCancel}
        />
      );
    default:
      return (
        <SelfReportMissionUI
          mission={mission}
          onComplete={(result) => onComplete({ confidence: result.confidence })}
          onCancel={onCancel}
        />
      );
  }
}
