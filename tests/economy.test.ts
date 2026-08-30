import { describe, it, expect } from "vitest";
import { computeCompletionReward, levelFromXP, faceValueReward, faceValueXP } from "@/server/economy/rewards";
import { nextStreakState, shiftDay, localDateStr } from "@/server/economy/streaks";
import { questIsComplete, questView, QUEST_DEFS, weekEnd, ACHIEVEMENT_DEFS } from "@/server/economy/definitions";
import { CATALOG_BY_ID, tierFor, AVATARS_BY_ID } from "@/lib/catalog/data";

/* ── Reward calculation (spec §87 unit tests) ─────────────────── */

describe("computeCompletionReward", () => {
  const base = {
    baseReward: 150,
    baseXP: 75,
    streak: 0,
    tasksCompletedToday: 0,
    activeStBoostValue: null,
    activeXpBoostValue: null,
    localHour: 14,
  };

  it("baseline easy day pays face value", () => {
    const r = computeCompletionReward({ ...base, critRoll: 0.9 });
    expect(r.stGained).toBe(150);
    expect(r.xpGained).toBe(75);
    expect(r.criticalHit).toBe(false);
  });

  it("streak multiplier tiers escalate", () => {
    expect(computeCompletionReward({ ...base, streak: 2, critRoll: 1 }).streakMultiplier).toBe(1);
    expect(computeCompletionReward({ ...base, streak: 3, critRoll: 1 }).streakMultiplier).toBe(1.1);
    expect(computeCompletionReward({ ...base, streak: 7, critRoll: 1 }).streakMultiplier).toBe(1.2);
    expect(computeCompletionReward({ ...base, streak: 30, critRoll: 1 }).streakMultiplier).toBe(1.5);
  });

  it("momentum multiplier applies on same-day volume", () => {
    expect(computeCompletionReward({ ...base, tasksCompletedToday: 5, critRoll: 1 }).momentumMultiplier).toBe(1.2);
    expect(computeCompletionReward({ ...base, tasksCompletedToday: 8, critRoll: 1 }).momentumMultiplier).toBe(1.35);
  });

  it("boost multiplies ST and XP independently", () => {
    const r = computeCompletionReward({ ...base, activeStBoostValue: 2, activeXpBoostValue: 1.5, critRoll: 1 });
    expect(r.stGained).toBe(300);
    expect(r.xpGained).toBe(Math.round(75 * 1.5));
  });

  it("early bird bonus before 9am local", () => {
    const r = computeCompletionReward({ ...base, localHour: 6, critRoll: 1 });
    expect(r.stGained).toBe(Math.round(150 * 1.15));
    expect(r.earlyBird).toBe(true); // via returned flag? see note
  });

  it("critical hit doubles payout deterministically", () => {
    expect(computeCompletionReward({ ...base, critRoll: 0.19 }).criticalHit).toBe(true);
    expect(computeCompletionReward({ ...base, critRoll: 0.21 }).criticalHit).toBe(false);
    const crit = computeCompletionReward({ ...base, critRoll: 0.05 });
    expect(crit.stGained).toBe(300);
  });
});

/* ── Level progression ────────────────────────────────────────── */

describe("levelFromXP", () => {
  it("level boundaries match thresholds", () => {
    expect(levelFromXP(0)).toBe(1);
    expect(levelFromXP(99)).toBe(1);
    expect(levelFromXP(100)).toBe(2);
    expect(levelFromXP(250)).toBe(3);
    expect(levelFromXP(199500)).toBe(30);
    expect(levelFromXP(999999)).toBe(30);
  });

  it("face values are server-computed", () => {
    expect(faceValueReward("easy", "common")).toBe(50);
    expect(faceValueReward("medium", "rare")).toBe(180);
    expect(faceValueReward("elite", "legendary")).toBe(2000);
    expect(faceValueXP("hard", "epic")).toBe(190);
  });
});

/* ── Streak logic — pure + timezone-aware ─────────────────────── */

describe("nextStreakState", () => {
  const today = "2026-08-22";

  it("first completion starts streak at 1", () => {
    const s = nextStreakState({ lastCompletionDate: null, todayLocal: today, currentStreak: 0, bestStreak: 0, shieldCount: 0 });
    expect(s.current).toBe(1);
    expect(s.extended).toBe(true);
  });

  it("same-day repeat keeps streak unchanged", () => {
    const s = nextStreakState({ lastCompletionDate: today, todayLocal: today, currentStreak: 5, bestStreak: 5, shieldCount: 0 });
    expect(s.current).toBe(5);
    expect(s.extended).toBe(false);
  });

  it("consecutive day extends", () => {
    const s = nextStreakState({ lastCompletionDate: "2026-08-21", todayLocal: today, currentStreak: 5, bestStreak: 5, shieldCount: 0 });
    expect(s.current).toBe(6);
    expect(s.best).toBe(6);
  });

  it("gap resets to 1 without shield", () => {
    const s = nextStreakState({ lastCompletionDate: "2026-08-01", todayLocal: today, currentStreak: 12, bestStreak: 12, shieldCount: 0 });
    expect(s.current).toBe(1);
    expect(s.best).toBe(12);
  });

  it("shield consumes itself across a gap", () => {
    const s = nextStreakState({ lastCompletionDate: "2026-08-01", todayLocal: today, currentStreak: 12, bestStreak: 12, shieldCount: 1 });
    expect(s.current).toBe(13);
    expect(s.shieldsUsed).toBe(1);
  });

  it("shiftDay and localDateStr are stable", () => {
    expect(shiftDay(today, -1)).toBe("2026-08-21");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(localDateStr(new Date("2026-08-21T20:30:00Z"), "Asia/Kathmandu")).toBe("2026-08-22");
  });
});

/* ── Quest evaluation ─────────────────────────────────────────── */

describe("quests", () => {
  const def = QUEST_DEFS["welcome-quest"];

  it("welcome quest completes only when all objectives met", () => {
    const partial = { profile_created: 1, tasks_completed: 1, st_earned: 240 };
    expect(questIsComplete(def, partial, 1)).toBe(false);
    expect(questIsComplete(def, { ...partial, st_earned: 250 }, 1)).toBe(false); // streak < 2
    expect(questIsComplete(def, { ...partial, st_earned: 250 }, 2)).toBe(true);
  });

  it("quest view clamps progress to targets", () => {
    const v = questView(def, { profile_created: 1, tasks_completed: 4, st_earned: 900 }, 5, false);
    expect(v.objectives.every((o) => o.current <= o.target)).toBe(true);
    expect(v.progressPct).toBeLessThanOrEqual(100);
  });

  it("weekly window ends Sunday UTC", () => {
    const wed = new Date("2026-08-19T10:00:00Z");
    expect(weekEnd(wed).getUTCDay()).toBe(0);
    expect(weekEnd(wed).toISOString()).toBe("2026-08-23T23:59:59.999Z");
  });
});

/* ── Catalog integrity (server-authoritative pricing) ─────────── */

describe("catalog", () => {
  it("every collection references real items", () => {
    for (const id of ["item-gold-crown", "item-minimal-theme", "boost-xp-50"]) {
      expect(CATALOG_BY_ID[id]).toBeDefined();
    }
  });

  it("prices are positive integers; consumables have no slot", () => {
    for (const item of Object.values(CATALOG_BY_ID)) {
      expect(Number.isInteger(item.price)).toBe(true);
      expect(item.price).toBeGreaterThan(0);
      if (item.consumable) expect(item.slot).toBeUndefined();
    }
  });

  it("tiers escalate monotonically and avatars resolve", () => {
    expect(tierFor(0)).toBe("Bronze Beginner");
    expect(tierFor(35000)).toBe("Gold Hustler");
    expect(tierFor(150000)).toBe("Diamond Mogul");
    expect(AVATARS_BY_ID["avatar-wolf"].emoji).toBe("🐺");
    expect(AVATARS_BY_ID["nonexistent"]).toBeUndefined();
  });

  it("achievement checks fire at exact thresholds", () => {
    const money = ACHIEVEMENT_DEFS.find((a) => a.id === "money-maker")!;
    const baseStats = { tasksCompleted: 0, lifetimeEarned: 0, streakCurrent: 0, bestStreak: 0, hardTasksCompleted: 0, itemsBought: 0, petsOwned: 0, petLevel: 0, miningTotal: 0, missionsThisWeek: 0, perfectDays: 0, earlyBirdTasks: 0, level: 1, balance: 0, friendsCount: 0, challengesWon: 0, challengesLost: 0 };
    expect(money.check({ ...baseStats, lifetimeEarned: 9999 })).toBe(false);
    expect(money.check({ ...baseStats, lifetimeEarned: 10000 })).toBe(true);
  });
});
