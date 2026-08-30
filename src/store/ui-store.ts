import { create } from "zustand";

/**
 * Client-ONLY UI state (spec §73): modals, toasts, transient flags.
 * All server state lives in TanStack Query — never duplicated here.
 */
export type ModalType = "addTask" | "taskReward" | "itemDetail" | "dailyReward";

type UIState = {
  modals: Record<ModalType, boolean>;
  itemDetailId: string | null;
  completionResult: unknown;
  toasts: { id: string; message: string; type: "success" | "error" | "info" }[];
  openModal: (type: ModalType, data?: unknown) => void;
  closeModal: (type: ModalType) => void;
  addToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
};

export const useUIStore = create<UIState>((set) => ({
  modals: { addTask: false, taskReward: false, itemDetail: false, dailyReward: false },
  itemDetailId: null,
  completionResult: null,
  toasts: [],

  openModal: (type, data) =>
    set((s) => ({
      modals: { ...s.modals, [type]: true },
      itemDetailId: type === "itemDetail" ? ((data as { itemId?: string })?.itemId ?? s.itemDetailId) : s.itemDetailId,
      completionResult: type === "taskReward" ? data : s.completionResult,
    })),

  closeModal: (type) =>
    set((s) => ({
      modals: { ...s.modals, [type]: false },
      completionResult: type === "taskReward" ? null : s.completionResult,
    })),

  addToast: (message, type = "success") =>
    set((s) => ({ toasts: [...s.toasts, { id: `toast-${Date.now()}-${Math.random()}`, message, type }] })),

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
