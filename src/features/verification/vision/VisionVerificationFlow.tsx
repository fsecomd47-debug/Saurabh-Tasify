"use client";

/**
 * PDR-4.2: Vision Verification Flow Component
 * Integrates the vision system into the client camera flow.
 * Manages vision session lifecycle, frame processing, and verification submission.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { VisionVerificationOrchestrator } from "./orchestrator";
import { PrivacyPipeline } from "./privacy-pipeline";
import {
  QualityIndicator,
  FormFeedbackBanner,
  VisionStatusIndicator,
  RepProgressDisplay,
  VisionLoadingState,
  VisionErrorState,
} from "./vision-ux";
import type {
  VisionContext,
  VisionRequirements,
  QualityMetrics,
  FormSignal,
  OrchestratorResult,
  FrameData,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export type VisionVerificationFlowProps = {
  missionId: string;
  userId: string;
  sessionId: string;
  activityType: string;
  verificationMode: string;
  targetRepetitions?: number;
  durationSeconds?: number;
  onResult: (result: {
    status: "passed" | "failed" | "uncertain";
    confidence: number;
    repCount?: number;
    duration?: number;
    metadata?: Record<string, unknown>;
  }) => void;
  onError: (error: string) => void;
  onCancel: () => void;
};

export type FlowPhase =
  | "idle"
  | "initializing"
  | "loading-models"
  | "ready"
  | "processing"
  | "finalizing"
  | "completed"
  | "error";

// ============================================================================
// Vision Verification Flow Component
// ============================================================================

export function VisionVerificationFlow({
  missionId,
  userId,
  sessionId,
  activityType,
  verificationMode,
  targetRepetitions,
  durationSeconds,
  onResult,
  onError,
  onCancel,
}: VisionVerificationFlowProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orchestratorRef = useRef<VisionVerificationOrchestrator | null>(null);
  const privacyPipelineRef = useRef<PrivacyPipeline>(new PrivacyPipeline());

  // State
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);
  const [formSignals, setFormSignals] = useState<FormSignal[]>([]);
  const [repCount, setRepCount] = useState(0);
  const [formScore, setFormScore] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [isModelLoading, setIsModelLoading] = useState(true);

  // Initialize vision system
  useEffect(() => {
    const initializeVision = async () => {
      try {
        setPhase("initializing");

        // Create orchestrator
        const orchestrator = new VisionVerificationOrchestrator({
          frameIntervalMs: 100,
          qualityThreshold: 0.5,
          confidenceThreshold: 0.6,
          enableAntiCheat: true,
          enablePrivacyMode: true,
        });

        orchestratorRef.current = orchestrator;

        // Create vision context
        const context: VisionContext = {
          missionId,
          userId,
          sessionId,
          activityType,
          verificationMode,
          processingMode: "realtime",
          frameSource: "camera_front",
          timestamp: Date.now(),
        };

        // Create requirements
        const requirements: VisionRequirements = {
          capabilities:
            verificationMode === "pose"
              ? ["pose_detection", "pose_tracking", "quality_assessment"]
              : ["quality_assessment"],
          minConfidence: "medium",
          maxLatencyMs: 200,
          requireQualityCheck: true,
          requireAntiCheat: true,
          privacyMode: "derived_only",
        };

        // Initialize orchestrator
        await orchestrator.initialize(context, requirements);

        // Set up event listeners
        orchestrator.on("frameProcessed", (data: { metrics: { qualityScore: number } }) => {
          setQualityMetrics((prev) => {
            if (!prev) return prev;
            return { ...prev, overallQuality: data.metrics.qualityScore };
          });
        });

        orchestrator.on("finalized", (result: OrchestratorResult) => {
          setConfidence(result.confidence);
          if (result.summary.formScore) {
            setFormScore(result.summary.formScore);
          }
          if (result.summary.repCount) {
            setRepCount(result.summary.repCount);
          }
        });

        setPhase("loading-models");
        setIsModelLoading(false);
        setPhase("ready");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to initialize vision system";
        setError(errorMessage);
        setPhase("error");
        onError(errorMessage);
      }
    };

    initializeVision();

    return () => {
      orchestratorRef.current?.cleanup();
    };
  }, [missionId, userId, sessionId, activityType, verificationMode, onError]);

  // Handle video stream
  useEffect(() => {
    if (phase !== "ready" || !videoRef.current) return;

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Camera access denied";
        setError(errorMessage);
        setPhase("error");
        onError(errorMessage);
      }
    };

    startVideo();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [phase, onError]);

  // Start frame processing
  const startProcessing = useCallback(() => {
    if (!orchestratorRef.current || !videoRef.current) return;

    setPhase("processing");
    orchestratorRef.current.startAutoProcessing(videoRef.current);
  }, []);

  // Stop processing and finalize
  const stopProcessing = useCallback(async () => {
    if (!orchestratorRef.current) return;

    setPhase("finalizing");
    orchestratorRef.current.stopAutoProcessing();

    try {
      const result = await orchestratorRef.current.finalize();

      // Run quality checks on observations
      const qualityChecks = privacyPipelineRef.current.runQualityChecks(result.observations);

      // Create privacy-compliant evidence
      const evidence = await privacyPipelineRef.current.createEvidenceRecord(
        missionId,
        userId,
        sessionId,
        result.observations,
        result.summary,
        qualityChecks
      );

      // Submit to server
      const response = await fetch(`/api/missions/${missionId}/vision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          observations: result.observations.slice(-10), // Last 10 observations
          summary: result.summary,
          evidenceHash: result.evidenceHash,
          processingTimeMs: result.processingTimeMs,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit vision verification");
      }

      const data = await response.json();

      setPhase("completed");
      onResult({
        status: data.status === "supported" ? "passed" : data.status === "unsupported" ? "failed" : "uncertain",
        confidence: data.confidence,
        repCount: result.summary.repCount,
        duration: durationSeconds,
        metadata: {
          evidenceId: evidence.evidenceId,
          qualityScore: result.summary.qualityScore,
          formScore: result.summary.formScore,
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to finalize verification";
      setError(errorMessage);
      setPhase("error");
      onError(errorMessage);
    }
  }, [missionId, userId, sessionId, durationSeconds, onResult, onError]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    orchestratorRef.current?.stopAutoProcessing();
    onCancel();
  }, [onCancel]);

  // Render based on phase
  if (phase === "idle" || phase === "initializing" || phase === "loading-models") {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <VisionLoadingState
          message={isModelLoading ? "Loading vision models..." : "Initializing..."}
        />
      </div>
    );
  }

  if (phase === "error" || error) {
    return (
      <VisionErrorState
        error={error || "Unknown error"}
        onRetry={() => {
          setError(null);
          setPhase("idle");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Video Feed */}
      <div className="relative flex-1 bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Quality Indicator Overlay */}
        {qualityMetrics && (
          <div className="absolute top-4 left-4 right-4">
            <QualityIndicator quality={qualityMetrics} showDetails />
          </div>
        )}

        {/* Status Indicator */}
        <div className="absolute bottom-4 left-4">
          <VisionStatusIndicator status={phase === "processing" ? "processing" : "idle"} />
        </div>

        {/* Rep Progress (for pose verification) */}
        {verificationMode === "pose" && targetRepetitions && (
          <div className="absolute bottom-4 right-4">
            <RepProgressDisplay
              current={repCount}
              target={targetRepetitions}
              formScore={formScore}
            />
          </div>
        )}
      </div>

      {/* Form Feedback */}
      <FormFeedbackBanner signals={formSignals} className="mt-4" />

      {/* Controls */}
      <div className="flex gap-4 mt-4">
        {phase === "ready" && (
          <button
            onClick={startProcessing}
            className="flex-1 py-3 px-6 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            Start Verification
          </button>
        )}

        {phase === "processing" && (
          <>
            <button
              onClick={stopProcessing}
              className="flex-1 py-3 px-6 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
            >
              Complete
            </button>
            <button
              onClick={handleCancel}
              className="py-3 px-6 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </>
        )}

        {phase === "finalizing" && (
          <div className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gray-100 rounded-xl">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            <span className="text-gray-600">Finalizing...</span>
          </div>
        )}
      </div>
    </div>
  );
}