"use client";

import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/types/api";

export type FeatureFlagKey =
  | "MISSION_VERIFICATION_ENABLED"
  | "FOCUS_VERIFICATION_ENABLED"
  | "POSE_VERIFICATION_ENABLED"
  | "AI_ANALYSIS_ENABLED"
  | "ANTI_ABUSE_ENABLED";

type FeatureFlag = {
  key: string;
  enabled: boolean;
  rolloutPct: number;
};

type FeatureFlagResponse = {
  flags: Record<string, FeatureFlag>;
};

const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  MISSION_VERIFICATION_ENABLED: { key: "MISSION_VERIFICATION_ENABLED", enabled: false, rolloutPct: 0 },
  FOCUS_VERIFICATION_ENABLED: { key: "FOCUS_VERIFICATION_ENABLED", enabled: false, rolloutPct: 0 },
  POSE_VERIFICATION_ENABLED: { key: "POSE_VERIFICATION_ENABLED", enabled: false, rolloutPct: 0 },
  AI_ANALYSIS_ENABLED: { key: "AI_ANALYSIS_ENABLED", enabled: false, rolloutPct: 0 },
  ANTI_ABUSE_ENABLED: { key: "ANTI_ABUSE_ENABLED", enabled: false, rolloutPct: 0 },
};

let serverFlags: Record<string, FeatureFlag> | null = null;

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { data } = useQuery<FeatureFlagResponse>({
    queryKey: ["feature-flags"],
    queryFn: () => httpClient.get<FeatureFlagResponse>("/api/feature-flags"),
    staleTime: 5 * 60 * 1000,
    placeholderData: { flags: DEFAULT_FLAGS },
  });

  const flag = data?.flags?.[key];
  return flag?.enabled ?? false;
}

export function useFeatureFlags(): Record<string, boolean> {
  const { data } = useQuery<FeatureFlagResponse>({
    queryKey: ["feature-flags"],
    queryFn: () => httpClient.get<FeatureFlagResponse>("/api/feature-flags"),
    staleTime: 5 * 60 * 1000,
    placeholderData: { flags: DEFAULT_FLAGS },
  });

  const flags = data?.flags ?? DEFAULT_FLAGS;
  const result: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(flags)) {
    result[key] = flag.enabled;
  }
  return result;
}
