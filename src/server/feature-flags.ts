import "server-only";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";

const DEFAULT_FLAGS: Record<string, { enabled: boolean; rolloutPct: number }> = {
  MISSION_VERIFICATION_ENABLED: { enabled: false, rolloutPct: 0 },
  FOCUS_VERIFICATION_ENABLED: { enabled: false, rolloutPct: 0 },
  POSE_VERIFICATION_ENABLED: { enabled: false, rolloutPct: 0 },
  AI_ANALYSIS_ENABLED: { enabled: false, rolloutPct: 0 },
  ANTI_ABUSE_ENABLED: { enabled: false, rolloutPct: 0 },
  // §118: PDR-4 feature flags for vision and verification subsystems
  OBJECT_DETECTION_ENABLED: { enabled: false, rolloutPct: 0 },
  SCENE_COMPARISON_ENABLED: { enabled: false, rolloutPct: 0 },
  OCR_DOCUMENT_ENABLED: { enabled: false, rolloutPct: 0 },
  LOCAL_VISION_ENABLED: { enabled: false, rolloutPct: 0 },
  SERVER_VISION_ENABLED: { enabled: false, rolloutPct: 0 },
  ADVANCED_ANTI_ABUSE_ENABLED: { enabled: false, rolloutPct: 0 },
  HUMAN_REVIEW_ENABLED: { enabled: false, rolloutPct: 0 },
  ADAPTIVE_DIFFICULTY_ENABLED: { enabled: false, rolloutPct: 0 },
  // §PDR-5 Feature-6: Social
  SOCIAL_ENABLED: { enabled: true, rolloutPct: 100 },
  FRIENDS_ENABLED: { enabled: true, rolloutPct: 100 },
  FEED_ENABLED: { enabled: true, rolloutPct: 100 },
  REACTIONS_ENABLED: { enabled: true, rolloutPct: 100 },
  COMMENTS_ENABLED: { enabled: true, rolloutPct: 100 },
  CHALLENGES_ENABLED: { enabled: true, rolloutPct: 100 },
  MESSAGING_ENABLED: { enabled: true, rolloutPct: 100 },
  FRIEND_LEADERBOARD_ENABLED: { enabled: true, rolloutPct: 100 },
};

let cachedFlags: Record<string, { enabled: boolean; rolloutPct: number }> | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 minute

export async function getFeatureFlags(): Promise<Record<string, { enabled: boolean; rolloutPct: number }>> {
  const now = Date.now();
  if (cachedFlags && now - cacheTime < CACHE_TTL) {
    return cachedFlags;
  }

  try {
    const rows = await db.select().from(featureFlags);
    const flags: Record<string, { enabled: boolean; rolloutPct: number }> = { ...DEFAULT_FLAGS };
    for (const row of rows) {
      flags[row.key] = { enabled: row.enabled, rolloutPct: row.rolloutPct };
    }
    cachedFlags = flags;
    cacheTime = now;
    return flags;
  } catch {
    // DB might not have the table yet (pre-migration)
    cachedFlags = DEFAULT_FLAGS;
    cacheTime = now;
    return DEFAULT_FLAGS;
  }
}

export async function isFeatureEnabled(key: string, userId?: string): Promise<boolean> {
  const flags = await getFeatureFlags();
  const flag = flags[key];
  if (!flag) return false;
  if (!flag.enabled) return false;
  if (flag.rolloutPct >= 100) return true;
  if (flag.rolloutPct <= 0) return false;

  // Deterministic rollout based on user ID hash
  if (userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
    }
    const bucket = Math.abs(hash) % 100;
    return bucket < flag.rolloutPct;
  }

  return flag.enabled;
}
