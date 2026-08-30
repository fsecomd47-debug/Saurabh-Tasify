import type { TaskCategory, Difficulty } from "@/types";

export type ActivityType =
  | "repetition"
  | "focus"
  | "timer"
  | "visual_result"
  | "external_result"
  | "simple";

export type VerificationMode =
  | "self_reported"
  | "timed"
  | "focus"
  | "pose"
  | "repetition"
  | "interactive"
  | "evidence"
  | "hybrid"
  | "activity_signal"
  | "review"
  | "photo";

export type TaskAnalysis = {
  canonicalActivity: string;
  category: TaskCategory;
  difficulty: Difficulty;
  estimatedMinutes: number;
  activityType: ActivityType;
  verificationMode: VerificationMode;
  target?: {
    value?: number;
    unit?: string;
  };
  verificationRequirements: Record<string, unknown>;
  normalizedTitle: string;
  confidence: number;
};

export type MissionInput = {
  taskId: string;
  title: string;
  description?: string;
  category?: TaskCategory;
};

export type MissionContract = {
  canonicalActivity: string;
  activityType: ActivityType;
  verificationMode: VerificationMode;
  difficulty: Difficulty;
  durationSeconds?: number;
  targetRepetitions?: number;
  rewardStPreview: number;
  rewardXpPreview: number;
  verificationRules: Record<string, unknown>;
  requiresCamera: boolean;
  requiresPhoto: boolean;
  requiresTimer: boolean;
};

export interface AIProvider {
  readonly name: string;
  analyzeTask(input: MissionInput): Promise<TaskAnalysis>;
}
