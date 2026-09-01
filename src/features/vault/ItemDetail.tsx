"use client";

/**
 * PDR-6 Feature-1: THE VAULT — ItemDetail Component
 * Detailed item view with purchase flow, abilities, and collection info.
 *
 * Flow:
 * BUY → CONFIRM → WALLET VALIDATION → PURCHASE → OWNERSHIP → REVEAL → EQUIP?
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Target,
  Shield,
  Check,
  Lock,
  ShoppingCart,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import type { VaultItem, Collection } from "@/types/vault";

type ItemDetailProps = {
  item: VaultItem;
  userBalance?: number;
  owned?: boolean;
  equipped?: boolean;
  favorited?: boolean;
  collection?: Collection & { ownedCount: number; completed: boolean };
  onBack: () => void;
  onPurchase: (itemId: string) => Promise<void>;
  onEquip: (itemId: string) => Promise<void>;
  onSetGoal: (itemId: string) => Promise<void>;
  onAddToWishlist: (itemId: string) => Promise<void>;
  onToggleFavorite?: (itemId: string) => void;
};

const RARITY_COLORS = {
  common: "#8E8E93",
  uncommon: "#34C759",
  rare: "#007AFF",
  epic: "#5856D6",
  legendary: "#FF9500",
  mythic: "#FF2D55",
};

export function ItemDetail({
  item,
  userBalance = 0,
  owned = false,
  equipped = false,
  favorited = false,
  collection,
  onBack,
  onPurchase,
  onEquip,
  onSetGoal,
  onAddToWishlist,
  onToggleFavorite,
}: ItemDetailProps) {
  const [purchasing, setPurchasing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [equipping, setEquipping] = useState(false);
  const [imgError, setImgError] = useState(false);

  const canAfford = userBalance >= item.price;
  const rarityColor = RARITY_COLORS[item.rarity];

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      await onPurchase(item.id);
      setPurchased(true);
      setShowConfirm(false);
    } catch (error) {
      console.error("Purchase failed:", error);
    } finally {
      setPurchasing(false);
    }
  };

  const handleEquip = async () => {
    setEquipping(true);
    try {
      await onEquip(item.id);
    } catch (error) {
      console.error("Equip failed:", error);
    } finally {
      setEquipping(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="min-h-screen bg-[#F2F2F7] pb-24"
    >
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#F2F2F7]/80 backdrop-blur-xl border-b border-[#E5E5EA]">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#5E5CE6] text-[14px] font-semibold"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="flex items-center gap-2">
            {/* Favorite toggle */}
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(item.id)}
                className="w-10 h-10 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center"
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    favorited
                      ? "fill-[#FF2D55] text-[#FF2D55]"
                      : "text-[#8E8E93]"
                  }`}
                />
              </button>
            )}
            <button
              onClick={() => onAddToWishlist(item.id)}
              className="w-10 h-10 rounded-full bg-white border border-[#E5E5EA] flex items-center justify-center"
            >
              <Heart className="w-5 h-5 text-[#FF2D55]" />
            </button>
          </div>
        </div>
      </div>

      {/* Item Hero */}
      <div
        className="relative h-[300px] flex items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #FAFAFA 0%, #F2F2F7 100%)",
        }}
      >
        {/* Rarity badge */}
        <div
          className="absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-white/90 backdrop-blur-sm"
          style={{
            color: rarityColor,
            border: `1.5px solid ${rarityColor}`,
          }}
        >
          {item.rarity}
        </div>

        {/* Status badge */}
        {owned && (
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#34C759] text-white text-[11px] font-bold">
            {equipped ? "EQUIPPED" : "OWNED"}
          </div>
        )}

        {/* Item visual */}
        {item.previewAsset && !imgError ? (
          <img
            src={item.previewAsset}
            alt={item.name}
            className="w-40 h-40 object-contain drop-shadow-lg"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-32 h-32 rounded-[24px] flex items-center justify-center text-[64px]"
            style={{
              backgroundColor: `${rarityColor}30`,
            }}
          >
            {item.type === "pet"
              ? "🐾"
              : item.type === "car"
              ? "🚗"
              : item.type === "superbike"
              ? "🏍"
              : item.type === "frame"
              ? "🖼"
              : item.type === "title"
              ? "📝"
              : item.type === "badge"
              ? "🏅"
              : item.type === "boost"
              ? "⚡"
              : item.type === "theme"
              ? "🎨"
              : item.type === "accessory"
              ? "✨"
              : "📦"}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Name & Price */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-[#1C1C1E]">{item.name}</h1>
          <p className="text-[14px] text-[#8E8E93] mt-1">{item.description}</p>
          <div className="flex items-center gap-3 mt-3">
            <span
              className="text-[24px] font-bold"
              style={{ color: canAfford ? "#34C759" : "#1C1C1E" }}
            >
              {item.price.toLocaleString()} ST
            </span>
            {!owned && !canAfford && (
              <span className="text-[13px] text-[#FF9500]">
                {(item.price - userBalance).toLocaleString()} ST to go
              </span>
            )}
          </div>
        </div>

        {/* Balance */}
        {!owned && (
          <div className="bg-white rounded-[16px] p-4 mb-4 border border-[#E5E5EA]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#8E8E93]">Your ST</span>
              <span className="text-[16px] font-bold text-[#1C1C1E]">
                {userBalance.toLocaleString()} ST
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#F2F2F7] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#5E5CE6]"
                style={{
                  width: `${Math.min(100, (userBalance / item.price) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Abilities */}
        {item.abilities && item.abilities.length > 0 && (
          <div className="bg-white rounded-[16px] p-4 mb-4 border border-[#E5E5EA]">
            <h3 className="text-[11px] font-bold text-[#636366] uppercase tracking-wider mb-3">
              Ability
            </h3>
            {item.abilities.map((ability, i) => (
              <div key={i} className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5856D6]" />
                <span className="text-[14px] font-medium text-[#1C1C1E]">
                  {ability.description}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Collection */}
        {collection && (
          <div className="bg-white rounded-[16px] p-4 mb-4 border border-[#E5E5EA]">
            <h3 className="text-[11px] font-bold text-[#636366] uppercase tracking-wider mb-3">
              Collection
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-[#1C1C1E]">
                {collection.name}
              </span>
              <span className="text-[13px] text-[#8E8E93]">
                {collection.ownedCount} / {collection.itemIds.length}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#F2F2F7] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#5E5CE6]"
                style={{
                  width: `${
                    (collection.ownedCount / collection.itemIds.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="space-y-3">
          {owned ? (
            <>
              {!equipped && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEquip}
                  disabled={equipping}
                  className="w-full py-4 rounded-[16px] bg-[#5E5CE6] text-white text-[16px] font-bold flex items-center justify-center gap-2"
                >
                  {equipping ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" /> EQUIP
                    </>
                  )}
                </motion.button>
              )}
              {equipped && (
                <div className="w-full py-4 rounded-[16px] bg-[#E8FAF0] text-[#34C759] text-[16px] font-bold text-center">
                  EQUIPPED
                </div>
              )}
            </>
          ) : (
            <>
              {canAfford ? (
                <>
                  {!showConfirm ? (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowConfirm(true)}
                      className="w-full py-4 rounded-[16px] bg-[#FF9500] text-white text-[16px] font-bold flex items-center justify-center gap-2"
                      style={{ boxShadow: "0 8px 16px -4px rgba(255,149,0,0.3)" }}
                    >
                      <ShoppingCart className="w-5 h-5" /> BUY FOR{" "}
                      {item.price.toLocaleString()} ST
                    </motion.button>
                  ) : (
                    <div className="bg-white rounded-[16px] p-4 border border-[#E5E5EA]">
                      <p className="text-[14px] text-[#1C1C1E] font-medium mb-2">
                        Confirm purchase?
                      </p>
                      <p className="text-[12px] text-[#8E8E93] mb-4">
                        Balance after:{" "}
                        {(userBalance - item.price).toLocaleString()} ST
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowConfirm(false)}
                          className="flex-1 py-3 rounded-[12px] bg-[#F2F2F7] text-[#1C1C1E] text-[14px] font-semibold"
                        >
                          Cancel
                        </button>
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={handlePurchase}
                          disabled={purchasing}
                          className="flex-1 py-3 rounded-[12px] bg-[#FF9500] text-white text-[14px] font-bold flex items-center justify-center gap-2"
                        >
                          {purchasing ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            "CONFIRM"
                          )}
                        </motion.button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="bg-white rounded-[16px] p-4 border border-[#E5E5EA]">
                    <p className="text-[14px] text-[#FF9500] font-medium mb-2">
                      {(item.price - userBalance).toLocaleString()} ST more
                      needed
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSetGoal(item.id)}
                      className="w-full py-3 rounded-[12px] bg-[#5E5CE6] text-white text-[14px] font-bold flex items-center justify-center gap-2"
                    >
                      <Target className="w-4 h-4" /> SET AS GOAL
                    </motion.button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <Shield className="w-3.5 h-3.5 text-[#8E8E93]" />
          <span className="text-[10px] text-[#8E8E93]">
            Server-verified purchase
          </span>
        </div>
      </div>

      {/* Purchase success overlay */}
      <AnimatePresence>
        {purchased && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[24px] p-8 max-w-[320px] w-full text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#E8FAF0] flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-[#34C759]" />
              </div>
              <h2 className="text-[20px] font-bold text-[#1C1C1E] mb-2">
                YOU OWN IT
              </h2>
              <p className="text-[16px] font-medium text-[#5E5CE6] mb-6">
                {item.name}
              </p>
              <div className="space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEquip}
                  className="w-full py-3 rounded-[14px] bg-[#5E5CE6] text-white text-[14px] font-bold"
                >
                  EQUIP NOW
                </motion.button>
                <button
                  onClick={onBack}
                  className="w-full py-3 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[14px] font-semibold"
                >
                  VIEW COLLECTION
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
