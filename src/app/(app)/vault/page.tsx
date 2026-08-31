"use client";

/**
 * PDR-6 Feature-1: THE VAULT — Main Page
 * Entry point for The Vault store experience.
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VaultHome } from "@/features/vault/VaultHome";
import { ItemDetail } from "@/features/vault/ItemDetail";
import { CollectionDetail } from "@/features/vault/CollectionDetail";
import { useVaultStore } from "@/features/vault/vault-store";
import type { VaultItem, Collection } from "@/types/vault";

type ViewMode = "home" | "item" | "collection";

export default function VaultPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    catalog,
    loading,
    balance,
    inventory,
    equipment,
    goal,
    favorites,
    wishlist,
    setCatalog,
    setLoading,
    setBalance,
    setInventory,
    setEquipment,
    setWishlist,
    setFavorites,
    setGoal,
    purchaseItem,
    equipItem,
    toggleFavorite,
    isOwned,
    isEquipped,
  } = useVaultStore();

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch catalog
        const catalogRes = await fetch("/api/vault/catalog");
        const catalogEnvelope = await catalogRes.json();
        if (!catalogEnvelope.error && catalogEnvelope.data) {
          setCatalog(catalogEnvelope.data);
        }

        // Fetch inventory (includes wishlist, favorites, goal)
        const inventoryRes = await fetch("/api/vault/inventory");
        const inventoryEnvelope = await inventoryRes.json();
        if (!inventoryEnvelope.error && inventoryEnvelope.data) {
          const d = inventoryEnvelope.data;
          setBalance(d.balance);
          setInventory(d.inventory);
          setEquipment(d.equipment);
          setWishlist(d.wishlist || []);
          setFavorites(d.favorites || []);
          setGoal(d.goal?.itemId || null);
        }
      } catch (error) {
        console.error("Failed to load vault data:", error);
        setError("The Vault couldn't load. Your ST is safe. Try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [setCatalog, setLoading, setBalance, setInventory, setEquipment, setWishlist, setFavorites, setGoal]);

  // Handlers
  const handleItemSelect = useCallback((item: VaultItem) => {
    setSelectedItem(item);
    setViewMode("item");
    setError(null);
  }, []);

  const handleCollectionSelect = useCallback((collection: Collection) => {
    setSelectedCollection(collection);
    setViewMode("collection");
    setError(null);
  }, []);

  const handleBack = useCallback(() => {
    setViewMode("home");
    setSelectedItem(null);
    setSelectedCollection(null);
    setError(null);
  }, []);

  const handlePurchase = useCallback(
    async (itemId: string) => {
      setError(null);
      const operationKey = `purchase-${itemId}-${Date.now()}`;
      const res = await fetch("/api/vault/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, operationKey }),
      });

      const envelope = await res.json();
      if (envelope.error) {
        setError(envelope.error.message || "Purchase couldn't be completed. Your balance was not changed.");
        throw new Error(envelope.error.message);
      }

      const data = envelope.data;
      purchaseItem(itemId, data.purchase.price);
      setBalance(data.newBalance);
    },
    [purchaseItem, setBalance]
  );

  const handleEquip = useCallback(
    async (itemId: string) => {
      setError(null);
      const item = catalog?.items.find((i) => i.id === itemId);
      if (!item) return;

      let slot: string;
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
          return;
      }

      const res = await fetch("/api/vault/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, slot }),
      });

      const envelope = await res.json();
      if (envelope.error) {
        setError(envelope.error.message || "Equip failed. Please try again.");
        throw new Error(envelope.error.message);
      }

      equipItem(itemId);
      setEquipment(envelope.data.equipment);
    },
    [catalog, equipItem, setEquipment]
  );

  const handleSetGoal = useCallback(
    async (itemId: string) => {
      setError(null);
      const res = await fetch("/api/vault/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });

      const envelope = await res.json();
      if (envelope.error) {
        setError(envelope.error.message || "Failed to set goal.");
        throw new Error(envelope.error.message);
      }

      setGoal(itemId);
    },
    [setGoal]
  );

  const handleAddToWishlist = useCallback(
    async (itemId: string) => {
      setError(null);
      const res = await fetch("/api/vault/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, type: "wishlist" }),
      });

      const envelope = await res.json();
      if (envelope.error) {
        setError(envelope.error.message || "Failed to add to wishlist.");
        throw new Error(envelope.error.message);
      }
    },
    []
  );

  const handleToggleFavorite = useCallback(
    async (itemId: string) => {
      setError(null);
      toggleFavorite(itemId);
      const res = await fetch("/api/vault/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, type: "favorites" }),
      });

      const envelope = await res.json();
      if (envelope.error) {
        toggleFavorite(itemId);
        setError(envelope.error.message || "Failed to toggle favorite.");
      }
    },
    [toggleFavorite]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#5E5CE6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[16px] font-medium text-[#8E8E93]">
            Loading The Vault...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7]">
      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-0 z-50 bg-red-50 border-b border-red-200 px-4 py-3"
          >
            <div className="flex items-center justify-between max-w-lg mx-auto">
              <p className="text-[13px] text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-500 text-[13px] font-semibold ml-4"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {viewMode === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <VaultHome
              catalog={catalog}
              onItemSelect={handleItemSelect}
              onCollectionSelect={handleCollectionSelect}
              userBalance={balance}
              ownedItems={inventory.map((inv) => inv.itemId)}
              equippedItems={inventory.filter((inv) => inv.equipped).map((inv) => inv.itemId)}
              favoritedIds={favorites}
              wishlistIds={wishlist}
              goal={goal}
              onToggleFavorite={handleToggleFavorite}
            />
          </motion.div>
        )}

        {viewMode === "item" && selectedItem && (
          <motion.div
            key="item"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ItemDetail
              item={selectedItem}
              userBalance={balance}
              owned={isOwned(selectedItem.id)}
              equipped={isEquipped(selectedItem.id)}
              favorited={favorites.includes(selectedItem.id)}
              onBack={handleBack}
              onPurchase={handlePurchase}
              onEquip={handleEquip}
              onSetGoal={handleSetGoal}
              onAddToWishlist={handleAddToWishlist}
              onToggleFavorite={handleToggleFavorite}
            />
          </motion.div>
        )}

        {viewMode === "collection" && selectedCollection && (
          <motion.div
            key="collection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CollectionDetail
              collection={selectedCollection}
              items={selectedCollection.itemIds
                .map((id) => catalog?.items.find((i) => i.id === id))
                .filter(Boolean) as VaultItem[]}
              ownedItems={inventory.map((inv) => inv.itemId)}
              onBack={handleBack}
              onItemSelect={handleItemSelect}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
