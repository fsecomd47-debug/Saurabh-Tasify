"use client";

/**
 * PDR-4.2: Vision Quality Feedback Component
 * Real-time quality feedback for camera-based verification.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Eye, Sun, Maximize, RotateCcw } from "lucide-react";
import type { QualityMetrics, FormSignal, VisionConfidence } from "./types";

// ============================================================================
// Quality Indicator
// ============================================================================

export type QualityIndicatorProps = {
  quality: QualityMetrics;
  showDetails?: boolean;
  className?: string;
};

export function QualityIndicator({ quality, showDetails = false, className = "" }: QualityIndicatorProps) {
  const overallLevel = getQualityLevel(quality.overallQuality);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Overall Quality Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${getQualityColor(quality.overallQuality)}`}
            initial={{ width: 0 }}
            animate={{ width: `${quality.overallQuality * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className={`text-xs font-medium ${getQualityTextColor(quality.overallQuality)}`}>
          {overallLevel}
        </span>
      </div>

      {/* Detailed Metrics */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <QualityMetric
            icon={<Eye className="w-3 h-3" />}
            label="Blur"
            value={quality.blurScore}
          />
          <QualityMetric
            icon={<Sun className="w-3 h-3" />}
            label="Brightness"
            value={quality.brightnessScore}
          />
          <QualityMetric
            icon={<Maximize className="w-3 h-3" />}
            label="Resolution"
            value={quality.resolutionScore}
          />
          <QualityMetric
            icon={<RotateCcw className="w-3 h-3" />}
            label="Orientation"
            value={quality.orientationScore}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Quality Metric Sub-component
// ============================================================================

type QualityMetricProps = {
  icon: React.ReactNode;
  label: string;
  value: number;
};

function QualityMetric({ icon, label, value }: QualityMetricProps) {
  const level = getQualityLevel(value);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-500">{icon}</span>
      <span className="text-gray-600">{label}</span>
      <span className={`ml-auto font-medium ${getQualityTextColor(value)}`}>
        {level}
      </span>
    </div>
  );
}

// ============================================================================
// Form Feedback Banner
// ============================================================================

export type FormFeedbackBannerProps = {
  signals: FormSignal[];
  className?: string;
};

export function FormFeedbackBanner({ signals, className = "" }: FormFeedbackBannerProps) {
  const feedbackSignals = signals.filter((s) => s.feedback);

  if (feedbackSignals.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`bg-amber-50 border border-amber-200 rounded-lg p-3 ${className}`}
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
          <div className="flex-1">
            {feedbackSignals.map((signal, index) => (
              <p key={index} className="text-sm text-amber-700">
                {signal.feedback}
              </p>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Confidence Badge
// ============================================================================

export type ConfidenceBadgeProps = {
  confidence: number;
  confidenceClass: VisionConfidence;
  className?: string;
};

export function ConfidenceBadge({ confidence, confidenceClass, className = "" }: ConfidenceBadgeProps) {
  const colorMap: Record<VisionConfidence, string> = {
    high: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-red-100 text-red-800",
    none: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorMap[confidenceClass]} ${className}`}
    >
      {confidenceClass.charAt(0).toUpperCase() + confidenceClass.slice(1)}{" "}
      ({Math.round(confidence * 100)}%)
    </span>
  );
}

// ============================================================================
// Vision Status Indicator
// ============================================================================

export type VisionStatusIndicatorProps = {
  status: "idle" | "initializing" | "processing" | "completed" | "error";
  error?: string;
  className?: string;
};

export function VisionStatusIndicator({ status, error, className = "" }: VisionStatusIndicatorProps) {
  const statusConfig = {
    idle: { color: "text-gray-500", label: "Ready" },
    initializing: { color: "text-blue-500", label: "Initializing..." },
    processing: { color: "text-green-500", label: "Processing" },
    completed: { color: "text-green-600", label: "Completed" },
    error: { color: "text-red-500", label: error || "Error" },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${
          status === "processing" ? "animate-pulse" : ""
        } ${
          status === "error"
            ? "bg-red-500"
            : status === "processing"
            ? "bg-green-500"
            : "bg-gray-400"
        }`}
      />
      <span className={`text-sm ${config.color}`}>{config.label}</span>
    </div>
  );
}

// ============================================================================
// Rep Progress Display
// ============================================================================

export type RepProgressDisplayProps = {
  current: number;
  target: number;
  formScore: number;
  className?: string;
};

export function RepProgressDisplay({
  current,
  target,
  formScore,
  className = "",
}: RepProgressDisplayProps) {
  const progress = target > 0 ? Math.min(1, current / target) : 0;
  const formLevel = getQualityLevel(formScore);

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Rep Counter */}
      <div className="text-4xl font-bold text-white">
        {current}
        <span className="text-lg text-gray-400"> / {target}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getProgressColor(progress)}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Form Score */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className={`w-4 h-4 ${getFormScoreColor(formScore)}`} />
        <span className={`text-sm ${getFormScoreColor(formScore)}`}>
          Form: {formLevel}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Loading State
// ============================================================================

export type VisionLoadingStateProps = {
  message?: string;
  className?: string;
};

export function VisionLoadingState({ message = "Loading vision models...", className = "" }: VisionLoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div className="relative">
        <div className="w-16 h-16 border-4 border-gray-200 rounded-full" />
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

export type VisionErrorStateProps = {
  error: string;
  onRetry?: () => void;
  className?: string;
};

export function VisionErrorState({ error, onRetry, className = "" }: VisionErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 p-6 ${className}`}>
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900">Vision Error</h3>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getQualityLevel(score: number): string {
  if (score >= 0.8) return "Excellent";
  if (score >= 0.6) return "Good";
  if (score >= 0.4) return "Fair";
  return "Poor";
}

function getQualityColor(score: number): string {
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.6) return "bg-blue-500";
  if (score >= 0.4) return "bg-yellow-500";
  return "bg-red-500";
}

function getQualityTextColor(score: number): string {
  if (score >= 0.8) return "text-green-600";
  if (score >= 0.6) return "text-blue-600";
  if (score >= 0.4) return "text-yellow-600";
  return "text-red-600";
}

function getProgressColor(progress: number): string {
  if (progress >= 0.8) return "bg-green-500";
  if (progress >= 0.5) return "bg-blue-500";
  return "bg-yellow-500";
}

function getFormScoreColor(score: number): string {
  if (score >= 0.8) return "text-green-500";
  if (score >= 0.6) return "text-blue-500";
  return "text-yellow-500";
}