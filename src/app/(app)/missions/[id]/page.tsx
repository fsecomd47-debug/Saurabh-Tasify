"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/store/ui-store";
import { useMission, useStartMission } from "@/hooks/queries";
import { MissionPreviewCard } from "@/components/missions/MissionPreviewCard";
import { MissionResultCard } from "@/components/missions/MissionResultCard";
import { MissionVerificationView } from "@/features/verification/MissionVerificationView";
import { MissionReviewCard } from "@/components/missions/MissionReviewCard";

type MissionDetail = {
  id: string;
  taskId: string;
  taskTitle: string;
  activityType: "focus" | "repetition" | "timer" | "visual_result" | "external_result" | "simple";
  verificationMode: string;
  status: string;
  difficulty: string;
  durationSeconds?: number;
  targetRepetitions?: number;
  rewardStPreview: number;
  rewardXpPreview: number;
  startedAt?: string;
  verificationRules?: Record<string, unknown>;
  completedAt?: string;
  createdAt?: string;
};

type ViewState = "preview" | "active" | "result" | "review" | "verifying";

type VerificationResult = {
  status: "passed" | "failed" | "uncertain";
  stGained: number;
  xpGained: number;
  levelUp?: boolean;
  newLevel?: number;
  reasonCode?: string;
};

const STATUS_SUBTITLE: Record<string, string> = {
  active: "In Progress",
  ready: "Ready to Start",
  draft: "Draft",
  analyzing: "Analyzing",
  review: "Needs Review",
  expired: "Expired",
  passed: "Complete",
  settled: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
};

export default function MissionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const missionId = params.id;

  const { data: mission, isLoading, refetch } = useMission(missionId);
  const startMission = useStartMission();
  const [viewState, setViewState] = useState<ViewState>("preview");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Reset result state when mission ID changes
  useEffect(() => {
    setVerificationResult(null);
    setUserInteracted(false);
    setViewState("preview");
    setClaiming(false);
  }, [missionId]);

  // Warn before leaving during active session
  useEffect(() => {
    if (viewState !== "active") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [viewState]);

  useEffect(() => {
    if (!mission) return;

    // Sync verificationResult with actual mission status from server
    if (mission.status === "passed" || mission.status === "settled" || mission.status === "failed" || mission.status === "expired" || mission.status === "cancelled") {
      setVerificationResult({
        status: mission.status === "passed" || mission.status === "settled" ? "passed" : mission.status === "expired" ? "uncertain" : "failed",
        stGained: mission.status === "passed" || mission.status === "settled" ? mission.rewardStPreview : 0,
        xpGained: mission.status === "passed" || mission.status === "settled" ? mission.rewardXpPreview : 0,
        reasonCode: mission.status === "passed" || mission.status === "settled" ? "VERIFIED" : mission.status === "expired" ? "EXPIRED" : "MISSION_FAILED",
      });
      setViewState("result");
    } else if (!userInteracted) {
      if (mission.status === "active" || mission.status === "verifying") {
        setViewState("active");
      } else if (mission.status === "ready" || mission.status === "draft" || mission.status === "analyzing") {
        setViewState("preview");
      } else if (mission.status === "review") {
        setViewState("review");
      }
    }
  }, [mission, userInteracted]);

  // §18/§65-66: camera consent and checks are handled by MissionVerificationView
  async function handleStart() {
    setUserInteracted(true);
    await startMission.mutateAsync(mission!.id);
    setViewState("active");
  }

  async function handleCancel() {
    if (mission) {
      setUserInteracted(true);
      try {
        const cancelController = new AbortController();
        const cancelTimeout = setTimeout(() => cancelController.abort(), 15_000);
        const cancelResponse = await fetch(`/api/missions/${mission.id}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "failed",
            confidenceScore: 0,
            reasonCode: "USER_CANCELLED",
          }),
          signal: cancelController.signal,
        });
        clearTimeout(cancelTimeout);

        if (!cancelResponse.ok) {
          const errBody = await cancelResponse.json().catch(() => ({}));
          if (errBody.error?.code === "MISSION_TERMINAL") {
            addToast("Mission already completed.", "info");
            refetch();
            return;
          }
        }
      } catch {
        // Network error — still show failed UI
      }

      setVerificationResult({
        status: "failed",
        stGained: 0,
        xpGained: 0,
        reasonCode: "USER_CANCELLED",
      });
      setViewState("result");
    }
  }

  async function handleComplete(result: { duration?: number; reps?: number; confidence: number; metadata?: Record<string, unknown> }) {
    if (!mission) return;

    setViewState("verifying");

    const verifyController = new AbortController();
    const verifyTimeout = setTimeout(() => verifyController.abort(), 30_000);

    try {
      let response: Response;

      // §53: Scene comparison and OCR flows route through /vision for
      // server-side validation, replay defense, and verifier settlement.
      const useVisionRoute = result.metadata?.useVisionRoute === true;

      if (useVisionRoute) {
        // Create a vision session first, then submit derived signals
        const sessionRes = await fetch(`/api/missions/${mission.id}/vision-session`, {
          method: "POST",
          signal: verifyController.signal,
        });
        const sessionBody = await sessionRes.json().catch(() => ({}));
        const sessionId = sessionBody.data?.sessionId;

        if (!sessionId) {
          throw new Error("Failed to create vision session");
        }

        const summary = (result.metadata?.summary as Record<string, unknown>) ?? {};
        response = await fetch(`/api/missions/${mission.id}/vision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: verifyController.signal,
          body: JSON.stringify({
            sessionId,
            providerIds: result.metadata?.changeScore != null
              ? ["scene_comparator"]
              : result.metadata?.textLength != null
                ? ["document_ocr"]
                : ["quality_analyzer"],
            observations: [{
              frameIndex: 0,
              timestamp: Date.now(),
              confidence: result.confidence,
            }],
            summary: {
              totalFrames: 1,
              processedFrames: 1,
              averageConfidence: result.confidence,
              qualityScore: result.confidence,
              ...summary,
            },
            evidenceHash: Array.from(
              new Uint8Array(
                await crypto.subtle.digest("SHA-256",
                  new TextEncoder().encode(`${mission.id}-${Date.now()}-${JSON.stringify(summary)}`)
                )
              ),
              (b) => b.toString(16).padStart(2, "0")
            ).join(""),
            processingTimeMs: 0,
          }),
        });
      } else if (mission.verificationMode === "evidence" || mission.verificationMode === "hybrid") {
        response = await fetch(`/api/missions/${mission.id}/evidence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: verifyController.signal,
          body: JSON.stringify({
            photos: result.metadata?.photos,
            externalEvidence: result.metadata?.externalEvidence,
          }),
        });
      } else {
        response = await fetch(`/api/missions/${mission.id}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: verifyController.signal,
          body: JSON.stringify({
            status: "passed",
            confidenceScore: result.confidence,
            durationSeconds: result.duration != null ? Math.round(result.duration) : undefined,
            repetitionCount: result.reps,
            reasonCode: result.reps ? "REPETITION_COMPLETE" : "FOCUS_SESSION_VERIFIED",
            metadata: result.metadata,
          }),
        });
      }

      clearTimeout(verifyTimeout);
      const body = await response.json().catch(() => ({}));

      if (!response.ok || body.data?.status === "failed") {
        console.error("Verify failed:", response.status, body);
        setVerificationResult({
          status: "failed",
          stGained: 0,
          xpGained: 0,
          reasonCode: body.data?.reasonCode ?? body.error?.message ?? "VERIFICATION_FAILED",
        });
        setViewState("result");
        return;
      }

      // Read actual server status from response
      const serverStatus = body.data?.status ?? "passed";

      await queryClient.invalidateQueries({ queryKey: ["missions"] });

      if (serverStatus === "uncertain") {
        // Server escalated to review — show pending state
        setVerificationResult({
          status: "uncertain",
          stGained: 0,
          xpGained: 0,
          reasonCode: "PENDING_REVIEW",
        });
        setViewState("result");
        addToast("Verification pending review.");
      } else {
        setVerificationResult({
          status: "passed",
          stGained: mission.rewardStPreview,
          xpGained: mission.rewardXpPreview,
          reasonCode: "VERIFIED",
        });
        setViewState("result");
        addToast("Mission verified! Claim your reward.");
      }

    } catch (err) {
      clearTimeout(verifyTimeout);
      console.error("Verification failed:", err);
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      setVerificationResult({
        status: "failed",
        stGained: 0,
        xpGained: 0,
        reasonCode: isTimeout ? "VERIFICATION_TIMEOUT" : "VERIFICATION_FAILED",
      });
      setViewState("result");
    }
  }

  const handleClaim = useCallback(async () => {
    if (!mission || claiming) return;
    setClaiming(true);

    try {
      const claimController = new AbortController();
      const claimTimeout = setTimeout(() => claimController.abort(), 15_000);
      const claimResponse = await fetch(`/api/missions/${mission.id}/claim`, {
        method: "POST",
        signal: claimController.signal,
      });
      clearTimeout(claimTimeout);

      const claimBody = await claimResponse.json().catch(() => ({}));

      if (!claimResponse.ok) {
        console.error("Claim failed:", claimResponse.status, claimBody);
        addToast(claimBody.error?.message ?? "Claim failed. Try again.", "error");
        setClaiming(false);
        return;
      }

      // Read from envelope: { data: { stGained, xpGained, levelUp, newLevel } }
      const settled = claimBody.data ?? claimBody;

      setVerificationResult({
        status: "passed",
        stGained: settled.stGained ?? 0,
        xpGained: settled.xpGained ?? 0,
        levelUp: settled.levelUp,
        newLevel: settled.newLevel,
        reasonCode: "CLAIMED",
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["missions"] }),
        queryClient.invalidateQueries({ queryKey: ["snapshot"] }),
      ]);

      addToast("Reward claimed!");
      router.push("/tasks");
    } catch (err) {
      console.error("Claim failed:", err);
      addToast("Claim failed. Try again.", "error");
      setClaiming(false);
    }
  }, [mission, claiming, queryClient, router, addToast]);

  async function handleRetry() {
    setUserInteracted(true);
    setVerificationResult(null);
    setViewState("preview");
  }

  async function handleNext() {
    router.push("/tasks");
  }

  if (isLoading || !mission) {
    return (
      <div className="min-h-screen bg-[#F2F2F7]">
        <div className="px-5 pt-14">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-[#E5E5EA] animate-pulse" />
            <div>
              <div className="h-5 w-24 rounded bg-[#E5E5EA] animate-pulse mb-1.5" />
              <div className="h-3 w-16 rounded bg-[#E5E5EA] animate-pulse" />
            </div>
          </div>
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-48 rounded-[24px] bg-[#E5E5EA] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const m = mission;

  const resultStatus: "passed" | "failed" | "uncertain" =
    m.status === "passed" || m.status === "settled" ? "passed" :
    m.status === "expired" ? "uncertain" :
    "failed";

  // Use actual settled values after claim, otherwise use preview values
  const displaySt = verificationResult?.reasonCode === "CLAIMED"
    ? verificationResult.stGained
    : resultStatus === "passed" ? m.rewardStPreview : 0;
  const displayXp = verificationResult?.reasonCode === "CLAIMED"
    ? verificationResult.xpGained
    : resultStatus === "passed" ? m.rewardXpPreview : 0;

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
              <h1 className="text-[20px] font-bold text-[#1C1C1E]" style={{ letterSpacing: "-0.02em" }}>Mission</h1>
              <p className="text-[13px] text-[#8E8E93]">{STATUS_SUBTITLE[m.status] || "Loading"}</p>
            </div>
          </div>
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
              <MissionPreviewCard
                mission={{
                  id: m.id,
                  title: m.taskTitle,
                  difficulty: m.difficulty,
                  verificationMode: m.verificationMode,
                  status: m.status,
                  durationSeconds: m.durationSeconds,
                  targetRepetitions: m.targetRepetitions,
                  rewardStPreview: m.rewardStPreview,
                  rewardXpPreview: m.rewardXpPreview,
                }}
                onStart={handleStart}
              />
            )}

            {viewState === "active" && (
              <MissionVerificationView
                mission={m}
                onComplete={handleComplete}
                onCancel={handleCancel}
              />
            )}

            {viewState === "review" && (
              <MissionReviewCard
                missionId={m.id}
                taskTitle={m.taskTitle}
                verificationMode={m.verificationMode}
                metadata={m.verificationRules}
              />
            )}

            {viewState === "verifying" && (
              <div className="bg-white rounded-[24px] p-8 text-center" style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.06)" }}>
                <div className="w-12 h-12 border-[3px] border-[#5E5CE6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[16px] font-bold text-[#1C1C1E] mb-1">Verifying your session...</p>
                <p className="text-[13px] text-[#8E8E93]">Checking activity and duration</p>
              </div>
            )}

            {viewState === "result" && (
              <MissionResultCard
                key={`${m.id}-${m.status}`}
                status={resultStatus}
                stGained={displaySt}
                xpGained={displayXp}
                levelUp={verificationResult?.levelUp}
                newLevel={verificationResult?.newLevel}
                reasonCode={verificationResult?.reasonCode ?? (resultStatus === "passed" ? "VERIFIED" : m.status === "expired" ? "EXPIRED" : "MISSION_FAILED")}
                onClaim={resultStatus === "passed" && verificationResult?.reasonCode !== "CLAIMED" ? handleClaim : undefined}
                onRetry={handleRetry}
                onNext={handleNext}
                claiming={claiming}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
