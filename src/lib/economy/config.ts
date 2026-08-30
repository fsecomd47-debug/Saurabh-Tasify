export const ECONOMY = {
  taskRewards: {
    easy: 50,
    medium: 150,
    hard: 400,
    elite: 1000,
  },

  xp: {
    easy: 25,
    medium: 75,
    hard: 150,
    elite: 350,
  },

  streakBonus: {
    maxMultiplier: 1.35,
    thresholds: [
      { streak: 3, multiplier: 1.1 },
      { streak: 7, multiplier: 1.2 },
      { streak: 14, multiplier: 1.3 },
      { streak: 21, multiplier: 1.4 },
      { streak: 30, multiplier: 1.5 },
    ],
  },

  momentumBonus: {
    maxMultiplier: 1.35,
    thresholds: [
      { tasks: 2, multiplier: 1.05 },
      { tasks: 3, multiplier: 1.1 },
      { tasks: 5, multiplier: 1.2 },
      { tasks: 8, multiplier: 1.35 },
    ],
  },

  earlyBirdBonus: 1.15,
  perfectDayBonus: 1.25,
  criticalHitChance: 0.2,
  criticalHitMultiplier: 2,

  xpToStRatio: 10,

  dailyMissionRewards: {
    complete3Tasks: 200,
    earn500ST: 100,
    finishHardTask: 150,
  },

  questRewards: {
    weeklyGrind: { st: 2500, xp: 500 },
    hardWorker: { st: 3000, xp: 750 },
  },

  achievementRewards: {
    firstBlood: { st: 100, xp: 50 },
    centurion: { st: 500, xp: 100 },
    unstoppable: { st: 2000, xp: 500, badge: "unstoppable" },
    moneyMaker: { st: 1000, xp: 250 },
    speedDemon: { st: 500, xp: 150 },
    hardHitter: { st: 1000, xp: 300 },
    top10: { st: 2000, xp: 500, badge: "top10" },
    socialButterfly: { st: 300, xp: 100 },
    collector: { st: 500, xp: 150 },
    earlyGrinder: { st: 400, xp: 120 },
  },

  levelUnlocks: {
    5: { type: "store_category", value: "boost" },
    10: { type: "store_category", value: "status" },
    12: { type: "item", value: "irl-pizza" },
    15: { type: "item", value: "boost-streak-shield-3x" },
    16: { type: "item", value: "irl-spotify" },
    18: { type: "item", value: "item-cyberpunk-theme" },
    20: { type: "item", value: "status-unstoppable", badge: "unstoppable-title" },
    22: { type: "item", value: "status-elite-grinder" },
    25: { type: "item", value: "item-gold-aura" },
    28: { type: "item", value: "status-top10-badge" },
  },

  storePrices: {
    boost2xST: 750,
    boostXP50: 500,
    boostXPOverdrive: 600,
    boostStreakShield: 1200,
    boostStreakShield3x: 1800,
    boostDailyBonus: 400,
    boost2xST60: 1200,
    boostMissionReroll: 150,
    mysteryBox: 500,
    bonusMission: 800,
    coffeeTreat: 800,
    pizzaNight: 1500,
    spotifyPremium: 3000,
    gift500: 500,
    celebrationEffect: 300,
  },

  decay: {
    penaltyPerHour: 1,
  },
} as const;

export type EconomyConfig = typeof ECONOMY;