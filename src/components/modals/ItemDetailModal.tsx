"use client";

import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, Check, Heart, Lock, Sparkles } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import {
  useCatalog,
  usePurchaseItem,
  useEquipItem,
  useToggleWishlist,
  useSetGoal,
  useSnapshot,
  ApiRequestError,
} from "@/hooks/queries";
import { RARITY_CONFIG } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const ITEM_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {};
import * as Icons from "lucide-react";
function itemIcon(id: string) {
  if (ITEM_ICONS[id]) return ITEM_ICONS[id];
  const map: Record<string, string> = {
    "item-gold-crown": "Crown", "item-neon-night": "Sparkles", "item-cherry-blossom": "Heart",
    "item-epic-frame": "Sparkles", "item-diamond-frame": "Gem", "item-fire-frame": "Flame",
    "item-moon-frame": "Star", "item-gold-aura": "Sparkles", "item-minimal-theme": "Palette",
    "item-midnight-theme": "Monitor", "item-sunset-theme": "Sparkles", "item-cyberpunk-theme": "Monitor",
    "item-elite-nameplate": "Tag", "item-neon-nameplate": "Tag", "status-founder": "Award",
    "status-unstoppable": "Flame", "status-elite-grinder": "Trophy", "status-top10-badge": "Star",
    "boost-2x-st": "Zap", "boost-xp-50": "TrendingUp", "boost-xp-overdrive": "TrendingUp",
    "boost-2x-st-60": "Flame", "boost-streak-shield": "Shield", "boost-daily-bonus": "Gift",
    "exp-mystery-box": "Gem", "irl-coffee": "Coffee", "irl-pizza": "Pizza", "irl-spotify": "Music",
  };
  const name = map[id] ?? "CircleDollarSign";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = (Icons as any)[name];
  ITEM_ICONS[id] = C;
  return C;
}

export const ItemDetailModal: React.FC = () => {
  const isOpen = useUIStore((s) => s.modals.itemDetail);
  const itemId = useUIStore((s) => s.itemDetailId);
  const closeModal = useUIStore((s) => s.closeModal);
  const addToast = useUIStore((s) => s.addToast);

  const { data: catalog } = useCatalog();
  const { data: snapshot } = useSnapshot();
  const purchase = usePurchaseItem();
  const equip = useEquipItem();
  const wishlist = useToggleWishlist();
  const setGoal = useSetGoal();

  const item = useMemo(() => catalog?.items.find((i) => i.id === itemId), [catalog, itemId]);

  const level = snapshot?.progress.level ?? 1;
  const balance = snapshot?.wallet.balance ?? 0;
  const levelLocked = !!item?.requiredLevel && level < item.requiredLevel;
  const affordable = !!item && balance >= item.price;
  const isGoal = snapshot?.profile.goalItemId === item?.id;

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal("itemDetail");
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, closeModal]);

  async function doPurchase() {
    if (!item || purchase.isPending) return;
    try {
      const res = await purchase.mutateAsync(item.id);
      const effect = res.effect as { kind?: string; amount?: number; shieldsAdded?: number } | undefined;
      if (effect?.kind === "mystery") addToast(`Mystery Reward opened: +${effect.amount} ST!`);
      else if (effect?.kind === "instant") addToast(`Daily Bonus claimed: +${effect.amount} ST`);
      else if (effect?.kind === "shield") addToast(`Streak shield active (+${effect.shieldsAdded})`);
      else if (effect?.kind === "boost") addToast("Boost activated!");
      else addToast(`${item.name} acquired!`);
      if (!item.consumable) addToast("Equipped from Inventory when ready.", "info");
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "INSUFFICIENT_BALANCE") {
        const shortfall = (err.meta as { shortfall?: number })?.shortfall;
        addToast(`You need ${shortfall != null ? shortfall.toLocaleString() : "more"} ST more.`, "error");
      } else {
        addToast(err instanceof ApiRequestError ? err.message : "Purchase failed.", "error");
      }
    }
  }

  async function toggleEquip() {
    if (!item || equip.isPending) return;
    try {
      await equip.mutateAsync({ itemId: item.id, equipped: !item.equipped });
      addToast(item.equipped ? "Unequipped" : `${item.name} equipped!`);
    } catch {
      addToast("Could not update equipment.", "error");
    }
  }

  if (!isOpen || !item) return null;

  const rarityCfg = RARITY_CONFIG[item.rarity];
  const Icon = itemIcon(item.id);

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-[80] flex items-end sm:items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => closeModal("itemDetail")} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] overflow-hidden max-h-[88%] overflow-y-auto no-scrollbar"
          role="dialog"
          aria-label={item.name}
        >
          {/* Hero */}
          <div className="relative px-6 pt-8 pb-6 text-center" style={{ background: `linear-gradient(160deg, ${rarityCfg.color}10, transparent 70%)` }}>
            <button onClick={() => closeModal("itemDetail")} aria-label="Close" className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center">
              <X className="w-4 h-4 text-[#636366]" />
            </button>
            <div className="mx-auto w-20 h-20 rounded-[20px] flex items-center justify-center mb-4 relative" style={{ background: rarityCfg.bg, color: rarityCfg.color }}>
              <Icon className="w-10 h-10" strokeWidth={1.8} />
            </div>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: rarityCfg.color }}>{rarityCfg.label} · {item.category}</p>
            <h2 className="mt-1 text-[20px] font-bold text-[#1C1C1E]">{item.name}</h2>
            <p className="mt-2 text-[12.5px] text-[#8E8E93] leading-relaxed max-w-[280px] mx-auto">{item.description}</p>
          </div>

          <div className="px-6 pb-7">
            {levelLocked && (
              <div className="flex items-center gap-2.5 rounded-[12px] px-3.5 py-3 mb-3 bg-[#FFF8EB]">
                <Lock className="w-4 h-4 text-[#FF9500] flex-shrink-0" />
                <p className="text-[12px] font-semibold text-[#FF9500]">Unlocks at level {item.requiredLevel}</p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-[14px] px-4 py-3.5 bg-[#F2F2F7]">
              <span className="text-[11px] font-semibold text-[#8E8E93]">Authoritative price</span>
              <span className="text-[16px] font-bold text-[#5E5CE6] tabular-nums">{formatCurrency(item.price)} ST</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              {!item.owned ? (
                <button
                  onClick={() => void doPurchase()}
                  disabled={!affordable || levelLocked || purchase.isPending}
                  className="col-span-2 h-12 rounded-[14px] text-white text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: "#5E5CE6", boxShadow: "0 8px 16px -4px rgba(94,92,230,0.3)" }}
                >
                  {purchase.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : affordable && !levelLocked ? `BUY · ${formatCurrency(item.price)} ST` : !affordable ? `NEED ${formatCurrency(item.price - balance)} MORE` : "LOCKED"}
                </button>
              ) : (
                <>
                  {item.slot ? (
                    <button
                      onClick={() => void toggleEquip()}
                      disabled={equip.isPending}
                      className={cn(
                        "h-12 rounded-[14px] text-[13px] font-semibold flex items-center justify-center gap-1.5",
                        item.equipped ? "bg-[#E8FAF0] text-[#34C759]" : "bg-[#EDEDFC] text-[#5E5CE6]"
                      )}
                    >
                      {equip.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : item.equipped ? (<><Check className="w-4 h-4" /> EQUIPPED</>) : "EQUIP"}
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        void (async () => {
                          try {
                            const { httpClient } = await import("@/types/api");
                            await httpClient.post("/api/store/redeem", { itemId: item.id });
                            addToast(`${item.name} redeemed!`);
                            closeModal("itemDetail");
                          } catch {
                            addToast("Redeem failed.", "error");
                          }
                        })()
                      }
                      className="h-12 rounded-[14px] bg-[#EDEDFC] text-[#5E5CE6] text-[13px] font-semibold"
                    >
                      REDEEM
                    </button>
                  )}
                  <button
                    onClick={() => void setGoal.mutateAsync(isGoal ? null : item.id)}
                    className={cn("h-12 rounded-[14px] text-[13px] font-semibold flex items-center justify-center gap-1.5", isGoal ? "bg-[#FFF8EB] text-[#FF9500]" : "bg-[#F2F2F7] text-[#636366]")}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> {isGoal ? "YOUR GOAL" : "SET AS GOAL"}
                  </button>
                </>
              )}
            </div>

            {!item.owned && (
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  onClick={() => void wishlist.mutateAsync({ itemId: item.id, add: !item.inWishlist })}
                  className={cn("flex items-center gap-1.5 text-[12px] font-semibold", item.inWishlist ? "text-[#FF3B30]" : "text-[#8E8E93]")}
                >
                  <Heart className={cn("w-3.5 h-3.5", item.inWishlist && "fill-current")} /> {item.inWishlist ? "In wishlist" : "Add to wishlist"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
