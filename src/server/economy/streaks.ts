import "server-only";

/**
 * Timezone-aware streak math (spec §94/§95).
 * All comparisons happen against the user's own calendar day, never raw UTC.
 */

/** "today" as a YYYY-MM-DD string in the given IANA timezone. */
export function localDateStr(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

export function localHour(date: Date, timezone: string): number {
  try {
    const h = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hour12: false }).format(date);
    return parseInt(h, 10) % 24;
  } catch {
    return date.getUTCHours();
  }
}

export type StreakUpdate = {
  current: number;
  best: number;
  shieldsUsed: number; // how many shields were consumed (0 normally)
  extended: boolean; // true when this completion advanced the streak
};

/**
 * Derives the next streak state from the last completion date.
 * Pure + injectable for tests. `shieldCount` is consumed only on a gap day.
 */
export function nextStreakState(params: {
  lastCompletionDate: string | null;
  todayLocal: string;
  currentStreak: number;
  bestStreak: number;
  shieldCount: number;
}): StreakUpdate {
  const { lastCompletionDate, todayLocal, currentStreak, bestStreak, shieldCount } = params;

  if (!lastCompletionDate) {
    return { current: 1, best: Math.max(bestStreak, 1), shieldsUsed: 0, extended: true };
  }
  if (lastCompletionDate === todayLocal) {
    // Second+ completion on the same day — streak unchanged.
    return { current: Math.max(currentStreak, 1), best: bestStreak, shieldsUsed: 0, extended: false };
  }

  const yesterday = shiftDay(todayLocal, -1);
  if (lastCompletionDate === yesterday) {
    const next = currentStreak + 1;
    return { current: next, best: Math.max(bestStreak, next), shieldsUsed: 0, extended: true };
  }

  // Gap detected — consume one shield to keep the chain alive if available.
  if (shieldCount > 0) {
    const next = currentStreak + 1;
    return { current: next, best: Math.max(bestStreak, next), shieldsUsed: 1, extended: true };
  }

  return { current: 1, best: bestStreak, shieldsUsed: 0, extended: true };
}

/** Shifts a YYYY-MM-DD string by N days (UTC-safe arithmetic). */
export function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}
