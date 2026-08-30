import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ──────────────────────── Types ──────────────────────────── */

type PetGoalState = {
  goalPetId: string | null;
  setGoalPet: (petId: string | null) => void;
  lastReturnSummaryShown: string | null;
  setLastReturnSummaryShown: (ts: string) => void;
  levelUpCelebration: { petId: string; petName: string; emoji: string; newLevel: number; miningRate: number; xpBoost: number; rarity: string } | null;
  showLevelUp: (data: PetGoalState["levelUpCelebration"]) => void;
  dismissLevelUp: () => void;
};

/* ──────────────────────── Store ──────────────────────────── */

export const usePetStore = create<PetGoalState>()(
  persist(
    (set) => ({
      goalPetId: null,
      setGoalPet: (petId) => set({ goalPetId: petId }),

      lastReturnSummaryShown: null,
      setLastReturnSummaryShown: (ts) => set({ lastReturnSummaryShown: ts }),

      levelUpCelebration: null,
      showLevelUp: (data) => set({ levelUpCelebration: data }),
      dismissLevelUp: () => set({ levelUpCelebration: null }),
    }),
    {
      name: "st_pet_goals",
      version: 1,
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          const mem: Record<string, string> = {};
          return {
            getItem: (k: string) => mem[k] ?? null,
            setItem: (k: string, v: string) => { mem[k] = v; },
            removeItem: (k: string) => { delete mem[k]; },
          };
        }
      }),
      partialize: (state) => ({
        goalPetId: state.goalPetId,
        lastReturnSummaryShown: state.lastReturnSummaryShown,
      }),
    }
  )
);
