"use client";

/**
 * PDR-4.4 §64: Compound Mission Chain UI
 * Shows multi-step mission progress with step-by-step completion.
 */

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Circle, ChevronRight, ArrowLeft, Trophy, Zap } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SceneComparisonClient } from "@/features/verification/scene/SceneComparisonClient";
import { OCRDocumentCapture } from "@/features/verification/document/OCRDocumentCapture";
import { SelfReportMissionUI } from "@/features/verification/self-report/SelfReportMissionUI";
import { TimerMissionUI } from "@/features/verification/timer/TimerMissionUI";
import { FocusMissionUI } from "@/features/verification/focus/focus-ui";
import { PoseMissionUI } from "@/features/verification/pose/PoseMissionUI";
import { httpClient } from "@/types/api";
import type { MissionDTO } from "@/server/services/mission-service";

type ChainStep = {
  missionId: string;
  taskId: string;
  taskTitle: string;
  verificationMode: string;
  activityType: string;
  difficulty: string;
  targetRepetitions?: number;
  durationSeconds?: number;
  rewardStPreview: number;
  rewardXpPreview: number;
  status: string;
  orderIndex: number;
};

type ChainProgress = {
  chainId: string;
  steps: ChainStep[];
  totalSteps: number;
  completedSteps: number;
  currentStepIndex: number;
  allCompleted: boolean;
  totalSt: number;
  totalXp: number;
  earnedSt: number;
  earnedXp: number;
};

function stepToMissionDTO(step: ChainStep): MissionDTO {
  return {
    id: step.missionId,
    taskId: step.taskId,
    taskTitle: step.taskTitle,
    activityType: step.activityType as MissionDTO["activityType"],
    verificationMode: step.verificationMode as MissionDTO["verificationMode"],
    status: "active",
    difficulty: step.difficulty as MissionDTO["difficulty"],
    durationSeconds: step.durationSeconds ?? null,
    targetRepetitions: step.targetRepetitions ?? null,
    rewardStPreview: step.rewardStPreview,
    rewardXpPreview: step.rewardXpPreview,
    verificationRules: {},
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
}

type CameraViewState = "idle" | "ready";

export default function MissionChainPage() {
  const params = useParams();
  const router = useRouter();
  const missionId = params.id as string;
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [cameraViewState, setCameraViewState] = useState<CameraViewState>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Fetch chain progress
  const { data: chain, isLoading } = useQuery<ChainProgress>({
    queryKey: ["chain-progress", missionId],
    queryFn: () => httpClient.get<ChainProgress>(`/api/missions/${missionId}/chain`),
    enabled: !!missionId,
  });

  // Complete step mutation
  const completeStep = useMutation({
    mutationFn: (data: { missionId: string; confidence: number; metadata?: Record<string, unknown> }) =>
      httpClient.post(`/api/missions/${data.missionId}/complete`, {
        confidence: data.confidence,
        metadata: data.metadata,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chain-progress", missionId] });
      queryClient.invalidateQueries({ queryKey: ["mission", missionId] });
      addToast("Step completed!");
    },
  });

  // Start mission mutation
  const startMission = useMutation({
    mutationFn: (id: string) => httpClient.post(`/api/missions/${id}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chain-progress", missionId] });
    },
  });

  useEffect(() => {
    if (chain && activeStepIndex === null) {
      const idx = chain.steps.findIndex((s) => s.status === "ready" || s.status === "active");
      if (idx >= 0) setActiveStepIndex(idx);
    }
  }, [chain, activeStepIndex]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  const needsCamera = useCallback((step: ChainStep) => {
    return step.verificationMode === "pose" || step.verificationMode === "repetition";
  }, []);

  const handleStartCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      setStream(mediaStream);
      setCameraViewState("ready");
    } catch {
      addToast("Camera access denied", "error");
    }
  }, [addToast]);

  const handleStepComplete = useCallback((result: { confidence: number; metadata?: Record<string, unknown> }) => {
    if (activeStepIndex === null || !chain) return;
    const step = chain.steps[activeStepIndex];
    completeStep.mutate({
      missionId: step.missionId,
      confidence: result.confidence,
      metadata: result.metadata,
    });
    if (activeStepIndex < chain.steps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    }
  }, [activeStepIndex, chain, completeStep]);

  const handleCancel = useCallback(() => {
    setCameraViewState("idle");
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading chain...</div>
      </div>
    );
  }

  if (!chain) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-xl font-semibold">Chain Not Found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const activeStep = activeStepIndex !== null ? chain.steps[activeStepIndex] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="text-center">
              <h1 className="font-semibold">Mission Chain</h1>
              <p className="text-xs text-muted-foreground">
                Step {Math.min(chain.completedSteps + 1, chain.totalSteps)} of {chain.totalSteps}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="brand">
                <Trophy className="h-3 w-3 mr-1" />
                {chain.earnedSt} ST
              </Badge>
              <Badge variant="success">
                <Zap className="h-3 w-3 mr-1" />
                {chain.earnedXp} XP
              </Badge>
            </div>
          </div>
          <Progress
            value={(chain.completedSteps / chain.totalSteps) * 100}
            className="mt-2 h-2"
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          {/* Steps Sidebar */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Steps</h2>
            {chain.steps.map((step, i) => {
              const isCompleted = step.status === "passed" || step.status === "settled";
              const isActive = i === activeStepIndex;
              const isPending = step.status === "draft";

              return (
                <motion.div
                  key={step.missionId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card
                    className={`cursor-pointer transition-all p-3 ${
                      isActive
                        ? "border-primary ring-2 ring-primary/20"
                        : isCompleted
                          ? "border-green-500/50 bg-green-500/5"
                          : "hover:border-muted-foreground/50"
                    } ${isPending ? "opacity-60" : ""}`}
                    onClick={() => !isPending && setActiveStepIndex(i)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : isActive ? (
                          <div className="h-5 w-5 rounded-full border-2 border-primary animate-pulse" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{step.taskTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.verificationMode === "photo" ? "Photo" :
                           step.verificationMode === "pose" ? "Pose" :
                           step.verificationMode === "timed" ? "Timer" :
                           step.verificationMode === "focus" ? "Focus" :
                           step.verificationMode === "evidence" ? "Evidence" :
                           step.verificationMode === "self_reported" ? "Self Report" :
                           "Verify"}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs font-medium">+{step.rewardStPreview} ST</p>
                        <p className="text-xs text-muted-foreground">+{step.rewardXpPreview} XP</p>
                      </div>
                      {!isPending && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Active Step Content */}
          <div>
            <AnimatePresence mode="wait">
              {activeStep && (
                <motion.div
                  key={activeStep.missionId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">{activeStep.taskTitle}</h2>
                      <Badge variant={
                        activeStep.difficulty === "easy" ? "success" :
                        activeStep.difficulty === "medium" ? "default" :
                        activeStep.difficulty === "hard" ? "danger" :
                        "warning"
                      }>
                        {activeStep.difficulty}
                      </Badge>
                    </div>

                    {/* Verification UI based on mode */}
                    {activeStep.verificationMode === "photo" && activeStep.activityType === "visual_result" && (
                      <SceneComparisonClient
                        onComplete={handleStepComplete}
                        onCancel={handleCancel}
                      />
                    )}
                    {activeStep.verificationMode === "evidence" && activeStep.activityType === "external_result" && (
                      <OCRDocumentCapture
                        missionTitle={activeStep.taskTitle}
                        onComplete={handleStepComplete}
                        onCancel={handleCancel}
                      />
                    )}
                    {activeStep.verificationMode === "self_reported" && (
                      <SelfReportMissionUI
                        mission={stepToMissionDTO(activeStep)}
                        onComplete={handleStepComplete}
                        onCancel={handleCancel}
                      />
                    )}
                    {activeStep.verificationMode === "timed" && (
                      <TimerMissionUI
                        mission={stepToMissionDTO(activeStep)}
                        onComplete={handleStepComplete}
                        onCancel={handleCancel}
                      />
                    )}
                    {activeStep.verificationMode === "focus" && (
                      <FocusMissionUI
                        mission={stepToMissionDTO(activeStep)}
                        onComplete={(elapsed) => handleStepComplete({ confidence: 0.8, metadata: { elapsed } })}
                        onCancel={handleCancel}
                      />
                    )}
                    {(activeStep.verificationMode === "pose" || activeStep.verificationMode === "repetition") && (
                      <PoseMissionUI
                        mission={{
                          id: activeStep.missionId,
                          taskTitle: activeStep.taskTitle,
                          targetRepetitions: activeStep.targetRepetitions ?? 10,
                          rewardStPreview: activeStep.rewardStPreview,
                          rewardXpPreview: activeStep.rewardXpPreview,
                        }}
                        onComplete={handleStepComplete}
                        onCancel={handleCancel}
                      />
                    )}

                    {/* Start button for camera missions */}
                    {needsCamera(activeStep) && cameraViewState === "idle" && (
                      <Button onClick={handleStartCamera} className="w-full mt-4">
                        Start Camera Verification
                      </Button>
                    )}
                  </Card>

                  {/* Reward preview */}
                  <Card className="p-4 bg-muted/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Step Reward</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">+{activeStep.rewardStPreview} ST</span>
                        <span className="font-medium text-primary">+{activeStep.rewardXpPreview} XP</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chain Complete */}
            {chain.allCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="p-6 text-center border-green-500 bg-green-500/5">
                  <Trophy className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Chain Complete!</h3>
                  <p className="text-muted-foreground mb-4">
                    You earned {chain.totalSt} ST and {chain.totalXp} XP
                  </p>
                  <Button onClick={() => router.push("/missions")}>
                    View All Missions
                  </Button>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
