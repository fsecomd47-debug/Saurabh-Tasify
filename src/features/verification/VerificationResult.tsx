"use client";

/**
 * PDR-4.3 §80-§83, §183-§184, §284-§288: VerificationResult Component
 * Displays verification outcome with human-readable feedback.
 *
 * Rules:
 * - Never expose raw model confidence (§53, §187)
 * - Use human-readable messages (§183)
 * - Internal reason codes for debugging (§184)
 * - Complex AI should feel invisible (§284)
 * - Don't shame users (§193)
 */

import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Clock,
  Shield,
} from "lucide-react";

type VerificationResultProps = {
  status: "passed" | "failed" | "uncertain" | "needs_retry" | "needs_review";
  confidence?: number;
  reasonCode?: string;
  humanMessage?: string;
  suggestions?: string[];
  evidence?: {
    duration?: number;
    reps?: number;
    objects?: number;
    text?: string;
    amount?: number;
    currency?: string;
  };
  providerResults?: Array<{
    kind: string;
    decision: string;
    confidence: number;
  }>;
  onRetry?: () => void;
  onDismiss?: () => void;
};

const STATUS_CONFIG = {
  passed: {
    icon: CheckCircle2,
    color: "#34C759",
    bgColor: "#E8FAF0",
    title: "Verified!",
    subtitle: "Mission completed successfully",
  },
  failed: {
    icon: XCircle,
    color: "#FF3B30",
    bgColor: "#FFEBEA",
    title: "Not Verified",
    subtitle: "Evidence didn't meet requirements",
  },
  uncertain: {
    icon: AlertCircle,
    color: "#FF9500",
    bgColor: "#FFF4E5",
    title: "Under Review",
    subtitle: "Your submission is being reviewed",
  },
  needs_retry: {
    icon: RefreshCw,
    color: "#FF9500",
    bgColor: "#FFF4E5",
    title: "Try Again",
    subtitle: "We need better evidence",
  },
  needs_review: {
    icon: Eye,
    color: "#5E5CE6",
    bgColor: "#EDEDFC",
    title: "Being Reviewed",
    subtitle: "A team member will check this",
  },
};

export function VerificationResult({
  status,
  confidence,
  reasonCode,
  humanMessage,
  suggestions = [],
  evidence,
  providerResults,
  onRetry,
  onDismiss,
}: VerificationResultProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 py-6 px-5"
    >
      {/* Status icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ backgroundColor: config.bgColor }}
      >
        <Icon className="w-10 h-10" style={{ color: config.color }} />
      </motion.div>

      {/* Title */}
      <div className="text-center">
        <h2
          className="text-[20px] font-bold"
          style={{ color: config.color }}
        >
          {config.title}
        </h2>
        <p className="text-[13px] text-[#8E8E93] mt-1">{config.subtitle}</p>
      </div>

      {/* Human-readable message */}
      {humanMessage && (
        <div
          className="w-full rounded-[14px] p-4 text-center"
          style={{ backgroundColor: config.bgColor }}
        >
          <p className="text-[14px] font-medium" style={{ color: config.color }}>
            {humanMessage}
          </p>
        </div>
      )}

      {/* Evidence summary */}
      {evidence && (
        <div className="w-full bg-[#F2F2F7] rounded-[14px] p-4">
          <h3 className="text-[11px] font-bold text-[#636366] uppercase tracking-wider mb-3">
            Evidence Summary
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {evidence.reps !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#8E8E93]">Reps:</span>
                <span className="text-[12px] font-bold text-[#1C1C1E]">
                  {evidence.reps}
                </span>
              </div>
            )}
            {evidence.duration !== undefined && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#8E8E93]" />
                <span className="text-[12px] text-[#8E8E93]">Duration:</span>
                <span className="text-[12px] font-bold text-[#1C1C1E]">
                  {formatDuration(evidence.duration)}
                </span>
              </div>
            )}
            {evidence.objects !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#8E8E93]">Objects:</span>
                <span className="text-[12px] font-bold text-[#1C1C1E]">
                  {evidence.objects}
                </span>
              </div>
            )}
            {evidence.amount !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#8E8E93]">Amount:</span>
                <span className="text-[12px] font-bold text-[#1C1C1E]">
                  {evidence.currency ?? ""} {evidence.amount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="w-full bg-[#F2F2F7] rounded-[14px] p-4">
          <h3 className="text-[11px] font-bold text-[#636366] uppercase tracking-wider mb-2">
            What to do next
          </h3>
          <ul className="space-y-1.5">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-[#636366]">
                <span className="text-[#5E5CE6] mt-0.5">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 w-full">
        {onRetry && (status === "needs_retry" || status === "failed") && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            className="flex-1 py-3 rounded-[14px] text-white text-[14px] font-bold flex items-center justify-center gap-2"
            style={{
              backgroundColor: config.color,
              boxShadow: `0 8px 16px -4px ${config.color}40`,
            }}
          >
            <RefreshCw className="w-4 h-4" /> TRY AGAIN
          </motion.button>
        )}

        {onDismiss && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onDismiss}
            className="flex-1 py-3 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[14px] font-bold"
          >
            {status === "passed" ? "CONTINUE" : "DISMISS"}
          </motion.button>
        )}
      </div>

      {/* Security badge */}
      <div className="flex items-center gap-1.5 mt-2">
        <Shield className="w-3.5 h-3.5 text-[#8E8E93]" />
        <span className="text-[10px] text-[#8E8E93]">
          Verified by SaurabhTask
        </span>
      </div>
    </motion.div>
  );
}
