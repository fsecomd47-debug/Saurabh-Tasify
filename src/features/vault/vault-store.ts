"use client";

/**
 * PDR-6 Feature-1: THE VAULT — Vault Store (Zustand)
 * Client-side state management for the Vault.
 */

import { create } from "zustand";
import type {
  VaultItem,
  VaultCatalog,
  ItemOwnership,
  EquipmentState,
  Collection,
} from "@/types/vault";

type VaultState = {
  // Catalog
  catalog: VaultCatalog | null;
  loading: boolean;

  // User state
  balance: number;
  inventory: ItemOwnership[];
  equipment: EquipmentState | null;
  wishlist: string[];
  favorites: string[];
  goal: string | null;

  // Collection progress
  collectionProgress: Record<string, { owned: string[]; total: number }>;

  // Actions
  setCatalog: (catalog: VaultCatalog) => void;
  setLoading: (loading: boolean) => void;
  setBalance: (balance: number) => void;
  setInventory: (inventory: ItemOwnership[]) => void;
  setEquipment: (equipment: EquipmentState) => void;
  setWishlist: (wishlist: string[]) => void;
  setFavorites: (favorites: string[]) => void;
  setGoal: (goal: string | null) => void;
  setCollectionProgress: (progress: Record<string, { owned: string[]; total: number }>) => void;

  // Optimistic updates
  purchaseItem: (itemId: string, price: number) => void;
  equipItem: (itemId: string) => void;
  toggleFavorite: (itemId: string) => void;
  toggleWishlist: (itemId: string) => void;

  // Computed
  isOwned: (itemId: string) => boolean;
  isEquipped: (itemId: string) => boolean;
  isWishlisted: (itemId: string) => boolean;
  isFavorited: (itemId: string) => boolean;
  getTotalOwned: () => number;
};

export const useVaultStore = create<VaultState>((set, get) => ({
  // Initial state
  catalog: null,
  loading: true,
  balance: 0,
  inventory: [],
  equipment: null,
  wishlist: [],
  favorites: [],
  goal: null,
  collectionProgress: {},

  // Actions
  setCatalog: (catalog) => set({ catalog }),
  setLoading: (loading) => set({ loading }),
  setBalance: (balance) => set({ balance }),
  setInventory: (inventory) => set({ inventory }),
  setEquipment: (equipment) => set({ equipment }),
  setWishlist: (wishlist) => set({ wishlist }),
  setFavorites: (favorites) => set({ favorites }),
  setGoal: (goal) => set({ goal }),
  setCollectionProgress: (progress) => set({ collectionProgress: progress }),

  // Optimistic updates
  purchaseItem: (itemId, price) =>
    set((state) => ({
      balance: state.balance - price,
      inventory: [
        ...state.inventory,
        {
          userId: "current",
          itemId,
          acquiredAt: new Date(),
          quantity: 1,
          equipped: false,
          favorite: false,
          showcased: false,
        },
      ],
      // Clear goal if this item was the goal
      goal: state.goal === itemId ? null : state.goal,
    })),

  equipItem: (itemId) =>
    set((state) => {
      if (!state.equipment) return {};

      // Determine slot based on item type
      const item = state.catalog?.items.find((i) => i.id === itemId);
      if (!item) return {};

      let slot: keyof EquipmentState;
      switch (item.type) {
        case "pet":
          slot = "activePet";
          break;
        case "car":
        case "superbike":
        case "vehicle":
          slot = "activeVehicle";
          break;
        case "frame":
          slot = "profileFrame";
          break;
        case "title":
          slot = "profileTitle";
          break;
        case "badge":
          slot = "profileBadge";
          break;
        case "theme":
          slot = "theme";
          break;
        default:
          return {};
      }

      return {
        equipment: {
          ...state.equipment,
          [slot]: itemId,
        },
        inventory: state.inventory.map((inv) =>
          inv.itemId === itemId
            ? { ...inv, equipped: true }
            : inv.itemId === state.equipment?.[slot]
            ? { ...inv, equipped: false }
            : inv
        ),
      };
    }),

  toggleFavorite: (itemId) =>
    set((state) => ({
      favorites: state.favorites.includes(itemId)
        ? state.favorites.filter((id) => id !== itemId)
        : [...state.favorites, itemId],
      inventory: state.inventory.map((inv) =>
        inv.itemId === itemId
          ? { ...inv, favorite: !inv.favorite }
          : inv
      ),
    })),

  toggleWishlist: (itemId) =>
    set((state) => ({
      wishlist: state.wishlist.includes(itemId)
        ? state.wishlist.filter((id) => id !== itemId)
        : [...state.wishlist, itemId],
    })),

  // Computed
  isOwned: (itemId) => get().inventory.some((inv) => inv.itemId === itemId),
  isEquipped: (itemId) =>
    get().inventory.some((inv) => inv.itemId === itemId && inv.equipped),
  isWishlisted: (itemId) => get().wishlist.includes(itemId),
  isFavorited: (itemId) => get().favorites.includes(itemId),
  getTotalOwned: () => get().inventory.length,
}));
