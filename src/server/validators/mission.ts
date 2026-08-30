import { z } from "zod";

export const analyzeTaskSchema = z.object({
  description: z.string().max(500).optional(),
});

export const createMissionSchema = z.object({
  taskId: z.string().uuid(),
  analysisId: z.string().uuid().optional(),
});

export const startMissionSchema = z.object({});

export const cancelMissionSchema = z.object({
  reason: z.string().max(200).optional(),
});

export const submitEventSchema = z.object({
  type: z.string().min(1).max(50),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const verifyMissionSchema = z.object({
  status: z.enum(["passed", "failed", "uncertain"]),
  confidenceScore: z.number().min(0).max(1),
  durationSeconds: z.number().int().min(0).optional(),
  repetitionCount: z.number().int().min(0).optional(),
  presenceSamples: z.number().int().min(0).optional(),
  reasonCode: z.string().max(100),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
