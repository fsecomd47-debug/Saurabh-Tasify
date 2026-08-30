import { z } from "zod";

/* Shared server-side validation schemas (spec §48). */

export const taskCategories = ["study", "work", "fitness", "reading", "health", "creative", "personal", "finance", "other"] as const;
export const taskDifficulties = ["easy", "medium", "hard", "elite"] as const;
export const taskRarities = ["common", "rare", "epic", "legendary"] as const;

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Maximum 128 characters.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "At least 2 characters.")
  .max(24, "Maximum 24 characters.")
  .regex(/^[\p{L}\p{N} _.-]+$/u, "Letters, numbers, spaces and _ . - only");

export const registerSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  avatarId: z.string().min(1).max(40).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const tokenSchema = z.object({ token: z.string().min(10).max(200) });

export const resendSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordSchema,
});

export const onboardingSchema = z.object({
  displayName: displayNameSchema,
  avatarId: z.string().min(1).max(40),
  preferredCategories: z.array(z.enum(taskCategories)).min(1).max(taskCategories.length),
  dailyCommitmentMinutes: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(60), z.literal(90)]),
  primaryGoal: z.string().trim().min(2).max(120),
  timezone: z.string().max(64).optional(),
  playstyle: z.enum(["grinder", "sprinter", "competitor", "collector", "balanced"]).nullable().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Give your mission a title.").max(120),
  description: z.string().trim().max(500).nullable().optional(),
  category: z.enum(taskCategories),
  difficulty: z.enum(taskDifficulties),
  rarity: z.enum(taskRarities),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export const itemIdSchema = z.object({ itemId: z.string().min(1).max(60) });

export const equipSchema = z.object({
  itemId: z.string().min(1).max(60),
  equipped: z.boolean(),
});

export const wishlistSchema = z.object({ itemId: z.string().min(1).max(60), add: z.boolean() });

export const goalSchema = z.object({ itemId: z.string().min(1).max(60).nullable() });

export const questClaimSchema = z.object({ questId: z.string().min(1).max(60) });

export const petIdSchema = z.object({ petId: z.string().min(1).max(60) });

export const profilePatchSchema = z.object({
  displayName: displayNameSchema.optional(),
  avatarId: z.string().min(1).max(40).optional(),
  timezone: z.string().max(64).optional(),
});
