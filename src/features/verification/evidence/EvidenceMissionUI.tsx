"use client";

import React from "react";
import { SelfReportMissionUI } from "@/features/verification/self-report/SelfReportMissionUI";
import type { MissionDTO } from "@/server/services/mission-service";

type EvidenceMissionUIProps = {
  mission: MissionDTO;
  onComplete: (result: {
    confidence: number;
    duration?: number;
    metadata?: Record<string, unknown>;
  }) => void;
  onCancel: () => void;
};

export function EvidenceMissionUI({
  mission,
  onComplete,
  onCancel,
}: EvidenceMissionUIProps) {
  return (
    <SelfReportMissionUI
      mission={mission}
      onComplete={(result) =>
        onComplete({
          confidence: result.confidence,
          duration: result.duration,
        })
      }
      onCancel={onCancel}
    />
  );
}
