"use client";

/**
 * PDR-6 Feature-1: THE VAULT — ItemCard Component
 * Displays a single vault item with rarity, price, and status.
 *
 * States:
 * - LOCKED (not owned, can't afford)
 * - AFFORDABLE (not owned, can afford)
 * - NEAR_GOAL (close to affordable)
 * - OWNED
 * - EQUIPPED
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Check, ShoppingCart, Heart } from "lucide-react";
import type { VaultItem } from "@/types/vault";

type ItemCardProps = {
  item: VaultItem;
  userBalance?: number;
  owned?: boolean;
  equipped?: boolean;
  favorited?: boolean;
  onSelect: () => void;
  onToggleFavorite?: (itemId: string) => void;
  compact?: boolean;
};

const RARITY_COLORS = {
  common: { bg: "#F2F2F7", text: "#8E8E93", border: "#E5E5EA" },
  uncommon: { bg: "#E8FAF0", text: "#34C759", border: "#34C759" },
  rare: { bg: "#E5F3FF", text: "#007AFF", border: "#007AFF" },
  epic: { bg: "#EDEDFC", text: "#5856D6", border: "#5856D6" },
  legendary: { bg: "#FFF4E5", text: "#FF9500", border: "#FF9500" },
  mythic: { bg: "#FFE5EA", text: "#FF2D55", border: "#FF2D55" },
};

const RARITY_GLOW = {
  common: "",
  uncommon: "0 0 12px rgba(52,199,89,0.2)",
  rare: "0 0 12px rgba(0,122,255,0.2)",
  epic: "0 0 12px rgba(88,86,214,0.2)",
  legendary: "0 0 16px rgba(255,149,0,0.3)",
  mythic: "0 0 20px rgba(255,45,85,0.3)",
};

export function ItemCard({
  item,
  userBalance = 0,
  owned = false,
  equipped = false,
  favorited = false,
  onSelect,
  onToggleFavorite,
  compact = false,
}: ItemCardProps) {
  const canAfford = userBalance >= item.price;
  const isNearGoal = !canAfford && item.price - userBalance <= 1000;
  const rarityColor = RARITY_COLORS[item.rarity];
  const [imgError, setImgError] = useState(false);

  const getStateLabel = () => {
    if (equipped) return "EQUIPPED";
    if (owned) return "OWNED";
    if (canAfford) return "BUY NOW";
    if (isNearGoal) return `${(item.price - userBalance).toLocaleString()} ST AWAY`;
    return null;
  };

  const stateLabel = getStateLabel();

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`bg-white rounded-[16px] overflow-hidden text-left border transition-all ${
        owned
          ? "border-[#34C759]"
          : canAfford
          ? "border-[#FF9500]"
          : "border-[#E5E5EA]"
      }`}
      style={{
        boxShadow: owned || canAfford ? RARITY_GLOW[item.rarity] : undefined,
      }}
    >
      {/* Image placeholder */}
      <div
        className="relative aspect-square flex items-center justify-center"
        style={{
          backgroundColor: rarityColor.bg,
        }}
      >
        {/* Rarity indicator */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
          style={{
            backgroundColor: rarityColor.bg,
            color: rarityColor.text,
            border: `1px solid ${rarityColor.border}`,
          }}
        >
          {item.rarity}
        </div>

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item.id);
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center z-10"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                favorited
                  ? "fill-[#FF2D55] text-[#FF2D55]"
                  : "text-[#8E8E93]"
              }`}
            />
          </button>
        )}

        {/* Status badges */}
        {owned && !onToggleFavorite && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#34C759] flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        {!owned && !canAfford && !onToggleFavorite && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#E5E5EA] flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-[#8E8E93]" />
          </div>
        )}

        {/* Item visual */}
        {item.previewAsset && !imgError ? (
          <img
            src={item.previewAsset}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-16 h-16 rounded-[12px] flex items-center justify-center text-[24px]"
            style={{
              backgroundColor: `${rarityColor.text}20`,
              color: rarityColor.text,
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
      <div className={`p-3 ${compact ? "p-2" : "p-3"}`}>
        <h3
          className={`font-bold text-[#1C1C1E] truncate ${
            compact ? "text-[12px]" : "text-[13px]"
          }`}
        >
          {item.name}
        </h3>

        {!compact && (
          <p className="text-[11px] text-[#8E8E93] truncate mt-0.5">
            {item.description}
          </p>
        )}

        {/* Ability */}
        {!compact && item.abilities && item.abilities.length > 0 && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[10px] text-[#5856D6] font-medium">
              {item.abilities[0].description}
            </span>
          </div>
        )}

        {/* Price */}
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`font-bold ${
              compact ? "text-[12px]" : "text-[13px]"
            } ${canAfford ? "text-[#34C759]" : "text-[#1C1C1E]"}`}
          >
            {item.price.toLocaleString()} ST
          </span>

          {stateLabel && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                equipped
                  ? "bg-[#34C759] text-white"
                  : owned
                  ? "bg-[#E8FAF0] text-[#34C759]"
                  : canAfford
                  ? "bg-[#FF9500] text-white"
                  : "bg-[#E5E5EA] text-[#8E8E93]"
              }`}
            >
              {stateLabel}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
