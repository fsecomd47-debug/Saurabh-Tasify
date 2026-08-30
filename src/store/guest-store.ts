import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TaskCategory } from "@/types";

/* ──────────────────────── Types ──────────────────────────── */

export type GuestProgress = {
  st: number;
  xp: number;
  level: number;
  streak: number;
  completedTasks: number;
  achievements: string[];
};

export type GuestPlaystyle =
  | "grinder"
  | "sprinter"
  | "competitor"
  | "collector"
  | "balanced"
  | null;

export type GuestState = {
  /* ── Onboarding preferences ── */
  displayName: string;
  avatarId: string | null;
  selectedGoal: string | null;
  selectedCategories: TaskCategory[];
  selectedPlaystyle: GuestPlaystyle;
  selectedFirstGoal: string | null;
  dailyCommitment: number | null;

  /* ── Demo progress (accumulated during interactive demo) ── */
  progress: GuestProgress;
  demoTaskCompleted: boolean;

  /* ── Flow state ── */
  onboardingStep: number;
  onboardingStarted: boolean;
  onboardingComplete: boolean;

  /* ── Actions ── */
  setDisplayName: (name: string) => void;
  setAvatar: (id: string) => void;
  setGoal: (goal: string) => void;
  addCategory: (cat: TaskCategory) => void;
  removeCategory: (cat: TaskCategory) => void;
  setCategories: (cats: TaskCategory[]) => void;
  setPlaystyle: (style: GuestPlaystyle) => void;
  setFirstGoal: (goal: string) => void;
  setCommitment: (minutes: number) => void;
  completeDemoTask: () => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  markOnboardingStarted: () => void;
  markOnboardingComplete: () => void;
  resetGuest: () => void;
};

/* ──────────────────────── Defaults ───────────────────────── */

const DEFAULT_PROGRESS: GuestProgress = {
  st: 0,
  xp: 0,
  level: 1,
  streak: 0,
  completedTasks: 0,
  achievements: [],
};

/* ──────────────────────── Schema ─────────────────────────── */

const SCHEMA_VERSION = 2;
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type PersistedState = {
  state: Partial<GuestState>;
  version?: number;
  lastSaved?: number;
};

/** Migrate from older schema versions if needed */
function migrate(old: PersistedState): Partial<GuestState> {
  // v1 → v2: no shape changes, just added version tracking
  return old.state ?? old;
}

/** Validate that loaded state has sane values */
function validate(s: Partial<GuestState>): Partial<GuestState> {
  const validGoals = ["focus", "study", "fitness", "projects", "habits", null];
  const validStyles = ["grinder", "sprinter", "competitor", "collector", "balanced", null];
  const validFirstGoals = ["1000st", "level5", "7streak", "firstitem", null];

  return {
    ...s,
    selectedGoal: s.selectedGoal != null && validGoals.includes(s.selectedGoal) ? s.selectedGoal : null,
    selectedPlaystyle: s.selectedPlaystyle != null && validStyles.includes(s.selectedPlaystyle) ? s.selectedPlaystyle : null,
    selectedFirstGoal: s.selectedFirstGoal != null && validFirstGoals.includes(s.selectedFirstGoal) ? s.selectedFirstGoal : null,
    avatarId: typeof s.avatarId === "string" ? s.avatarId : null,
    displayName: typeof s.displayName === "string" ? s.displayName : "",
    progress: s.progress && typeof s.progress.st === "number"
      ? { ...DEFAULT_PROGRESS, ...s.progress }
      : { ...DEFAULT_PROGRESS },
  };
}

/* ──────────────────────── Store ──────────────────────────── */

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      /* Defaults */
      displayName: "",
      avatarId: null,
      selectedGoal: null,
      selectedCategories: [],
      selectedPlaystyle: null,
      selectedFirstGoal: null,
      dailyCommitment: null,
      progress: { ...DEFAULT_PROGRESS },
      demoTaskCompleted: false,
      onboardingStep: 0,
      onboardingStarted: false,
      onboardingComplete: false,

      /* Actions */
      setDisplayName: (name) => set({ displayName: name }),
      setAvatar: (id) => set({ avatarId: id }),
      setGoal: (goal) => set({ selectedGoal: goal }),

      addCategory: (cat) =>
        set((s) => ({
          selectedCategories: s.selectedCategories.includes(cat)
            ? s.selectedCategories
            : [...s.selectedCategories, cat],
        })),

      removeCategory: (cat) =>
        set((s) => ({
          selectedCategories: s.selectedCategories.filter((c) => c !== cat),
        })),

      setCategories: (cats) => set({ selectedCategories: cats }),
      setPlaystyle: (style) => set({ selectedPlaystyle: style }),
      setFirstGoal: (goal) => set({ selectedFirstGoal: goal }),
      setCommitment: (minutes) => set({ dailyCommitment: minutes }),

      completeDemoTask: () =>
        set((s) => ({
          demoTaskCompleted: true,
          progress: {
            ...s.progress,
            st: s.progress.st + 100,
            xp: s.progress.xp + 50,
            completedTasks: s.progress.completedTasks + 1,
          },
        })),

      setStep: (step) => set({ onboardingStep: step }),
      nextStep: () => set((s) => ({ onboardingStep: s.onboardingStep + 1 })),
      prevStep: () => set((s) => ({ onboardingStep: Math.max(0, s.onboardingStep - 1) })),
      markOnboardingStarted: () => set({ onboardingStarted: true }),
      markOnboardingComplete: () => set({ onboardingComplete: true }),

      resetGuest: () =>
        set({
          displayName: "",
          avatarId: null,
          selectedGoal: null,
          selectedCategories: [],
          selectedPlaystyle: null,
          selectedFirstGoal: null,
          dailyCommitment: null,
          progress: { ...DEFAULT_PROGRESS },
          demoTaskCompleted: false,
          onboardingStep: 0,
          onboardingStarted: false,
          onboardingComplete: false,
        }),
    }),
    {
      name: "st_guest",
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          // Fallback: in-memory storage if localStorage unavailable
          const mem: Record<string, string> = {};
          return {
            getItem: (k: string) => mem[k] ?? null,
            setItem: (k: string, v: string) => { mem[k] = v; },
            removeItem: (k: string) => { delete mem[k]; },
          };
        }
      }),
      migrate: (persisted: unknown, version: number) => {
        try {
          const data = persisted as PersistedState;
          // Check expiry
          if (data.lastSaved && Date.now() - data.lastSaved > EXPIRY_MS) {
            return undefined; // Reset to defaults
          }
          // Migrate if old version
          if (version < SCHEMA_VERSION) {
            return validate(migrate(data));
          }
          return validate(data.state ?? data);
        } catch {
          return undefined; // Corrupted — reset to defaults
        }
      },
      partialize: (state) => ({
        displayName: state.displayName,
        avatarId: state.avatarId,
        selectedGoal: state.selectedGoal,
        selectedCategories: state.selectedCategories,
        selectedPlaystyle: state.selectedPlaystyle,
        selectedFirstGoal: state.selectedFirstGoal,
        dailyCommitment: state.dailyCommitment,
        progress: state.progress,
        demoTaskCompleted: state.demoTaskCompleted,
        onboardingStep: state.onboardingStep,
        onboardingStarted: state.onboardingStarted,
        onboardingComplete: state.onboardingComplete,
      }),
      onRehydrateStorage: () => (state) => {
        // Validate after rehydration — fix any corrupted values
        if (state) {
          const validated = validate(state as Partial<GuestState>);
          // Only update if values changed
          if (validated.selectedGoal !== (state as GuestState).selectedGoal ||
              validated.selectedPlaystyle !== (state as GuestState).selectedPlaystyle ||
              validated.selectedFirstGoal !== (state as GuestState).selectedFirstGoal) {
            useGuestStore.setState(validated as GuestState);
          }
        }
      },
    }
  )
);

/* ────────────── Helper: build API payload ────────────────── */

export type OnboardingPayload = {
  displayName: string;
  avatarId: string;
  preferredCategories: TaskCategory[];
  dailyCommitmentMinutes: number;
  primaryGoal: string;
  playstyle: GuestPlaystyle;
  firstGoal: string | null;
  timezone: string;
};

export function buildOnboardingPayload(state: GuestState): OnboardingPayload {
  return {
    displayName: state.displayName.trim(),
    avatarId: state.avatarId ?? "avatar-dev",
    preferredCategories: state.selectedCategories.length > 0 ? state.selectedCategories : ["other"],
    dailyCommitmentMinutes: state.dailyCommitment ?? 20,
    primaryGoal: state.selectedGoal ?? "Build a productive habit",
    playstyle: state.selectedPlaystyle,
    firstGoal: state.selectedFirstGoal,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}
