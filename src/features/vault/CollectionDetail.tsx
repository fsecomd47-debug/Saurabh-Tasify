"use client";

/**
 * PDR-6 Feature-1: THE VAULT — CollectionDetail Component
 * Detailed collection view with progress, owned items, and missing items.
 */

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Gift } from "lucide-react";
import { ItemCard } from "./ItemCard";
import type { Collection, VaultItem } from "@/types/vault";

type CollectionDetailProps = {
  collection: Collection;
  items: VaultItem[];
  ownedItems: string[];
  onBack: () => void;
  onItemSelect: (item: VaultItem) => void;
};

export function CollectionDetail({
  collection,
  items,
  ownedItems,
  onBack,
  onItemSelect,
}: CollectionDetailProps) {
  const ownedCount = collection.itemIds.filter((id) =>
    ownedItems.includes(id)
  ).length;
  const completed = ownedCount === collection.itemIds.length;
  const progress =
    collection.itemIds.length > 0
      ? ownedCount / collection.itemIds.length
      : 0;

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#F2F2F7]/80 backdrop-blur-xl border-b border-[#E5E5EA]">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#5E5CE6] text-[14px] font-semibold"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
        </div>
      </div>

      {/* Collection Hero */}
      <div className="bg-gradient-to-br from-[#5E5CE6] to-[#BF5AF2] px-4 py-8 text-white">
        <h1 className="text-[28px] font-bold mb-2">{collection.name}</h1>
        <p className="text-[14px] opacity-80 mb-4">{collection.description}</p>

        {/* Progress */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[32px] font-bold">
              {ownedCount}/{collection.itemIds.length}
            </p>
            <p className="text-[12px] opacity-80">Collected</p>
          </div>
          <div className="flex-1">
            <div className="h-3 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full rounded-full bg-white"
              />
            </div>
          </div>
        </div>

        {completed && (
          <div className="mt-4 bg-white/20 rounded-[12px] p-3 flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="text-[14px] font-bold">COLLECTION COMPLETE</span>
          </div>
        )}
      </div>

      {/* Reward */}
      {collection.completionReward && (
        <div className="px-4 py-4">
          <div className="bg-white rounded-[16px] p-4 border border-[#E5E5EA]">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-[#FF9500]" />
              <h3 className="text-[14px] font-bold text-[#1C1C1E]">
                Completion Reward
              </h3>
            </div>
            <p className="text-[13px] text-[#8E8E93]">
              {collection.completionReward.badgeId
                ? "Earn a special badge"
                : collection.completionReward.titleId
                ? "Unlock a unique title"
                : "Get a premium frame"}
            </p>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="px-4">
        <h3 className="text-[16px] font-bold text-[#1C1C1E] mb-3">Items</h3>
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              owned={ownedItems.includes(item.id)}
              onSelect={() => onItemSelect(item)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
