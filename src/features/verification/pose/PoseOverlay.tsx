"use client";

/**
 * PDR-4.3 §221, §287: PoseOverlay Component
 * Displays pose landmarks and form feedback on camera view.
 * Shows human-shaped silhouette guide for body positioning.
 *
 * UX:
 * - Pose should feel like a coach (§287)
 * - Display a human-shaped silhouette or safe frame region (§221)
 * - "Fit your body here" is better than explaining coordinates
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

type PoseLandmark = {
  name: string;
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

type PoseOverlayProps = {
  landmarks?: PoseLandmark[];
  repCount?: number;
  targetReps?: number;
  formFeedback?: string | null;
  showGuide?: boolean;
  isVisible?: boolean;
  className?: string;
};

// MediaPipe Pose landmark connections for skeleton drawing
const POSE_CONNECTIONS: [string, string][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

// Key landmarks to highlight
const KEY_LANDMARKS = [
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
];

export function PoseOverlay({
  landmarks,
  repCount = 0,
  targetReps = 10,
  formFeedback,
  showGuide = true,
  isVisible = true,
  className = "",
}: PoseOverlayProps) {
  if (!isVisible) return null;

  const landmarkMap = new Map(
    (landmarks ?? []).map((lm) => [lm.name, lm])
  );

  const progress = targetReps > 0 ? Math.min(1, repCount / targetReps) : 0;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Body guide silhouette */}
      {showGuide && !landmarks && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 200 400"
            className="w-32 h-64 opacity-20"
            fill="none"
            stroke="white"
            strokeWidth="2"
          >
            {/* Head */}
            <circle cx="100" cy="50" r="25" />
            {/* Body */}
            <line x1="100" y1="75" x2="100" y2="200" />
            {/* Arms */}
            <line x1="100" y1="100" x2="50" y2="160" />
            <line x1="100" y1="100" x2="150" y2="160" />
            {/* Legs */}
            <line x1="100" y1="200" x2="60" y2="350" />
            <line x1="100" y1="200" x2="140" y2="350" />
          </svg>
        </div>
      )}

      {/* Skeleton drawing */}
      {landmarks && landmarks.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
        >
          {/* Connections */}
          {POSE_CONNECTIONS.map(([from, to]) => {
            const p1 = landmarkMap.get(from);
            const p2 = landmarkMap.get(to);
            if (!p1 || !p2) return null;
            if (
              (p1.visibility !== undefined && p1.visibility < 0.3) ||
              (p2.visibility !== undefined && p2.visibility < 0.3)
            ) {
              return null;
            }
            return (
              <line
                key={`${from}-${to}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#34C759"
                strokeWidth="0.005"
                strokeLinecap="round"
              />
            );
          })}

          {/* Landmarks */}
          {KEY_LANDMARKS.map((name) => {
            const lm = landmarkMap.get(name);
            if (!lm) return null;
            if (lm.visibility !== undefined && lm.visibility < 0.3) return null;
            return (
              <circle
                key={name}
                cx={lm.x}
                cy={lm.y}
                r="0.008"
                fill="#34C759"
              />
            );
          })}
        </svg>
      )}

      {/* Rep counter */}
      <div className="absolute top-3 right-3 bg-black/60 px-3 py-1.5 rounded-full">
        <span className="text-[12px] font-bold text-white tabular-nums">
          {repCount} / {targetReps}
        </span>
      </div>

      {/* Progress ring */}
      <div className="absolute top-3 left-3">
        <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="2"
          />
          <circle
            cx="18"
            cy="18"
            r="15.915"
            fill="none"
            stroke="#34C759"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${progress * 100} 100`}
          />
        </svg>
      </div>

      {/* Form feedback */}
      <AnimatePresence>
        {formFeedback && (
          <motion.div
            key={formFeedback}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[12px] font-medium px-4 py-2 rounded-full whitespace-nowrap"
          >
            {formFeedback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
