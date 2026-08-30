"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, Target } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { useCreateTask, useAnalyzeTask, ApiRequestError } from "@/hooks/queries";
import type { TaskCategory, TaskDifficulty, TaskRarity } from "@/types";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: TaskCategory; label: string }[] = [
  { id: "study", label: "Study" },
  { id: "work", label: "Work" },
  { id: "fitness", label: "Fitness" },
  { id: "reading", label: "Reading" },
  { id: "health", label: "Health" },
  { id: "creative", label: "Creative" },
  { id: "personal", label: "Personal" },
  { id: "other", label: "Other" },
];

const DIFFICULTY_CONFIG: Record<string, { label: string; colorClass: string }> = {
  easy: { label: "EASY", colorClass: "modal-difficulty-badge--easy" },
  medium: { label: "MEDIUM", colorClass: "modal-difficulty-badge--medium" },
  hard: { label: "HARD", colorClass: "modal-difficulty-badge--hard" },
  elite: { label: "ELITE", colorClass: "modal-difficulty-badge--elite" },
};

const VERIFICATION_LABELS: Record<string, string> = {
  self_reported: "Self Reported",
  timed: "Timer",
  focus: "Focus Session",
  pose: "Camera + Pose",
  repetition: "Motion Counting",
  evidence: "Photo Evidence",
  photo: "Photo Evidence",
  hybrid: "Multiple Signals",
  activity_signal: "Activity Data",
  review: "Under Review",
};

const VERIFICATION_REASONING: Record<string, string> = {
  self_reported: "Simple task — just confirm when done. Lower reward without verification.",
  timed: "Set a timer and complete before it expires. Reward scales with duration.",
  focus: "Camera monitors your focus session. Stay on task for the full duration.",
  pose: "Camera counts your reps and checks form. Higher reward for verified effort.",
  repetition: "Motion-based counting. Track reps with device sensors.",
  evidence: "Submit photos or links as proof. AI reviews your submission.",
  hybrid: "Combines multiple signals for higher confidence verification.",
};

const ALL_VERIFICATION_MODES = [
  "self_reported", "timed", "focus", "pose", "repetition", "evidence", "photo", "hybrid", "activity_signal", "review",
];

type AnalysisStage = "idle" | "analyzing" | "ready" | "error";

export const AddTaskModal: React.FC = () => {
  const isOpen = useUIStore((s) => s.modals.addTask);
  const closeModal = useUIStore((s) => s.closeModal);
  const createTask = useCreateTask();
  const analyzeTask = useAnalyzeTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TaskCategory>("work");
  const [error, setError] = useState<string | null>(null);

  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("idle");
  const [analysis, setAnalysis] = useState<{
    difficulty: string;
    activityType: string;
    verificationMode: string;
    estimatedMinutes: number;
    rewardSt: number;
    rewardXp: number;
    normalizedTitle: string;
    confidence: number;
  } | null>(null);
  const [verificationOverride, setVerificationOverride] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  function close() {
    closeModal("addTask");
    setTitle("");
    setDescription("");
    setCategory("work");
    setError(null);
    setAnalysisStage("idle");
    setAnalysis(null);
    setVerificationOverride(null);
  }

  async function handleAnalyze() {
    if (!title.trim() || analysisStage === "analyzing") return;
    setError(null);
    setAnalysisStage("analyzing");

    try {
      const res = await createTask.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        category: category as never,
        difficulty: "medium" as TaskDifficulty,
        rarity: "common" as TaskRarity,
      }) as unknown as { task?: { id: string }; id?: string };

      const taskId = res.task?.id ?? res.id;
      if (!taskId) throw new Error("Task created but no ID returned.");

      const result = await analyzeTask.mutateAsync(taskId);
      setAnalysis({
        difficulty: result.difficulty,
        activityType: result.activityType,
        verificationMode: result.verificationMode,
        estimatedMinutes: result.estimatedMinutes,
        rewardSt: result.rewardSt,
        rewardXp: result.rewardXp,
        normalizedTitle: result.normalizedTitle,
        confidence: result.confidence,
      });
      setAnalysisStage("ready");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not analyze mission.");
      setAnalysisStage("error");
    }
  }

  if (!isOpen) return null;

  const isAnalyzing = analysisStage === "analyzing";
  const isReady = analysisStage === "ready";
  const showAnalysis = isReady && analysis;
  const diffConfig = analysis ? DIFFICULTY_CONFIG[analysis.difficulty] : null;

  return (
    <div className="absolute inset-0 z-[80] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className="relative w-full max-w-md modal-glass p-6 max-h-[88%] overflow-y-auto no-scrollbar"
        role="dialog"
        aria-label="Create a new mission"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1C1C1E] flex items-center justify-center">
              <Target className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">CREATE MISSION</h2>
          </div>
          <button onClick={close} className="modal-close" aria-label="Close">
            <X className="w-4 h-4 text-[#636366]" />
          </button>
        </div>

        {/* Mission title */}
        <div className="mb-4">
          <label className="block text-[11px] font-bold tracking-[0.12em] text-[#8E8E93] uppercase mb-2">Mission</label>
          <div className="modal-glass-inset">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to accomplish?"
              autoFocus
              maxLength={120}
              disabled={isAnalyzing || isReady}
              className="modal-glass-field"
            />
          </div>
        </div>

        {/* Details */}
        <div className="mb-5">
          <label className="block text-[11px] font-bold tracking-[0.12em] text-[#8E8E93] uppercase mb-2">Details</label>
          <div className="modal-glass-inset">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details (optional)"
              rows={2}
              maxLength={500}
              disabled={isAnalyzing || isReady}
              className="modal-glass-textarea"
            />
          </div>
        </div>

        {/* Category */}
        <p className="text-[11px] font-bold tracking-[0.12em] text-[#8E8E93] uppercase mt-5 mb-3">Category</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              disabled={isAnalyzing || isReady}
              className={cn(
                "modal-category-pill",
                category === c.id ? "modal-category-pill--active" : "modal-category-pill--inactive",
                (isAnalyzing || isReady) && "opacity-50 pointer-events-none"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Analyzing animation */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 modal-analysis-card"
            >
              <div className="flex items-center gap-3">
                <div className="modal-spinner" />
                <span className="text-[14px] font-semibold text-[#1C1C1E]">Analyzing your mission...</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                <span className="flex items-center gap-1.5 text-[12px] text-[#34C759]">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} /> Understanding
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-[#34C759]">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} /> Difficulty
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-[#34C759]">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} /> Challenge
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-[#8E8E93]">
                  <div className="w-3.5 h-3.5 border-2 border-[#8E8E93] border-t-transparent rounded-full animate-spin" /> Verification
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis results */}
        <AnimatePresence>
          {showAnalysis && analysis && diffConfig && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-5 space-y-3"
            >
              {/* Difficulty + Time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn("modal-difficulty-badge", diffConfig.colorClass)}>
                    {diffConfig.label}
                  </span>
                  {analysis.estimatedMinutes > 0 && (
                    <span className="text-[13px] text-[#636366]">{analysis.estimatedMinutes} min</span>
                  )}
                </div>
              </div>

              {/* Verification Mode */}
              <div className="bg-[#F9F9FB] rounded-[12px] p-3">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="verification-mode" className="text-[12px] font-semibold text-[#1C1C1E]">Verification</label>
                  <select
                    id="verification-mode"
                    value={verificationOverride ?? analysis.verificationMode}
                    onChange={(e) => setVerificationOverride(e.target.value)}
                    className="text-[12px] font-semibold text-[#5E5CE6] bg-transparent border-none focus:outline-none cursor-pointer"
                  >
                    {ALL_VERIFICATION_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {VERIFICATION_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-[#8E8E93]">
                  {VERIFICATION_REASONING[verificationOverride ?? analysis.verificationMode]}
                </p>
              </div>

              {/* Payout */}
              <div className="modal-payout">
                <span className="text-[13px] font-medium text-[#636366]">Projected payout</span>
                <span className="text-[15px] font-bold text-[#1C1C1E] tabular-nums">
                  +{analysis.rewardSt} ST · +{analysis.rewardXp} XP
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="mt-4 text-[13px] font-medium text-[#FF3B30] bg-[#FFEBEA] rounded-xl px-4 py-3"
          >
            {error}
          </motion.p>
        )}

        {/* CTA */}
        <div className="mt-6">
          {!isReady ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAnalyze}
              disabled={!title.trim() || createTask.isPending || isAnalyzing}
              className="modal-cta-primary"
            >
              {isAnalyzing ? (
                <div className="modal-spinner" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
              ) : (
                <>
                  <Target className="w-4 h-4" strokeWidth={2.5} />
                  ANALYZE MISSION
                </>
              )}
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={close}
              className="modal-cta-primary"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Check className="w-5 h-5" strokeWidth={3} />
              MISSION READY
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
