"use client";

import React from "react";

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";

function SkeletonPulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-[16px] ${className ?? ""}`}
      style={{ background: "#E5E5EA", ...style }}
    />
  );
}

export function WealthCardSkeleton() {
  return (
    <div className="px-5 mt-4">
      <div className="bg-white rounded-[20px] p-5" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex items-center gap-3 mb-4">
          <SkeletonPulse style={{ width: 48, height: 48, borderRadius: "50%" }} />
          <div className="flex-1">
            <SkeletonPulse style={{ width: 100, height: 14, marginBottom: 6 }} />
            <SkeletonPulse style={{ width: 60, height: 10 }} />
          </div>
          <SkeletonPulse style={{ width: 48, height: 48, borderRadius: 12 }} />
        </div>
        <SkeletonPulse style={{ width: "100%", height: 8, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="px-5">
      <div className="bg-white rounded-[20px] p-4" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex items-start gap-3">
          <SkeletonPulse style={{ width: 40, height: 40, borderRadius: 12 }} />
          <div className="flex-1">
            <SkeletonPulse style={{ width: "70%", height: 14, marginBottom: 6 }} />
            <SkeletonPulse style={{ width: "50%", height: 10, marginBottom: 8 }} />
            <div className="flex gap-2">
              <SkeletonPulse style={{ width: 50, height: 18, borderRadius: 99 }} />
              <SkeletonPulse style={{ width: 40, height: 18, borderRadius: 99 }} />
            </div>
          </div>
          <SkeletonPulse style={{ width: 36, height: 36, borderRadius: "50%" }} />
        </div>
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="px-5 mt-4 space-y-3">
      <WealthCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="px-5 mt-4 space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-[16px] px-4 py-3 flex items-center gap-3" style={{ boxShadow: CARD_SHADOW }}>
          <SkeletonPulse style={{ width: 28, height: 14, borderRadius: 4 }} />
          <SkeletonPulse style={{ width: 36, height: 36, borderRadius: "50%" }} />
          <div className="flex-1">
            <SkeletonPulse style={{ width: "60%", height: 12, marginBottom: 4 }} />
            <SkeletonPulse style={{ width: "40%", height: 10 }} />
          </div>
          <SkeletonPulse style={{ width: 50, height: 14, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

export function VaultSkeleton() {
  return (
    <div className="px-5 mt-4 grid grid-cols-2 gap-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-[20px] p-3.5" style={{ boxShadow: CARD_SHADOW }}>
          <SkeletonPulse style={{ width: 48, height: 48, borderRadius: 14, marginBottom: 12 }} />
          <SkeletonPulse style={{ width: "80%", height: 12, marginBottom: 6 }} />
          <SkeletonPulse style={{ width: "50%", height: 10 }} />
        </div>
      ))}
    </div>
  );
}
