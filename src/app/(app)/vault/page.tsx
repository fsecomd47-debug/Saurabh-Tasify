"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Heart, Check, Shield, Sparkles, TrendingUp, Pickaxe, Zap, Lock, PackageOpen, ChevronRight } from "lucide-react";
import * as Icons from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { Tabs } from "@/components/ui/Tabs";
import { useUIStore } from "@/store/ui-store";
import { useCatalog, useSnapshot, useEquipItem, useRedeemItem, usePetCatalog, useUserPets } from "@/hooks/queries";
import { usePetStore } from "@/store/pet-store";
import type { CatalogItemDTO } from "@/types/api";
import { RARITY_CONFIG } from "@/lib/mock-data";
import { PET_RARITY_CONFIG } from "@/lib/pets/data";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const TABS = [
  { id: "shop", label: "Shop" },
  { id: "pets", label: "Pets" },
  { id: "inventory", label: "Inventory" },
];

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "customize", label: "Customize" },
  { id: "boost", label: "Boosts" },
  { id: "status", label: "Status" },
  { id: "experience", label: "Rewards" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_CACHE: Record<string, any> = {};
function itemIcon(id: string) {
  if (ICON_CACHE[id]) return ICON_CACHE[id];
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = (Icons as any)[map[id] ?? "CircleDollarSign"];
  ICON_CACHE[id] = C;
  return C;
}

export default function VaultPage() {
  const router = useRouter();
  const [tab, setTab] = useState("shop");
  const [category, setCategory] = useState("all");
  const openModal = useUIStore((s) => s.openModal);
  const { data: catalog, isLoading } = useCatalog();
  const { data: snap } = useSnapshot();
  const equip = useEquipItem();
  const redeem = useRedeemItem();

  const balance = snap?.wallet.balance ?? 0;
  const level = snap?.progress.level ?? 1;

  const items = useMemo(() => {
    if (!catalog) return [];
    if (category === "all") return catalog.items;
    return catalog.items.filter((i) => i.category === category);
  }, [catalog, category]);

  const ownedItems = useMemo(
    () => (catalog ? catalog.items.filter((i) => i.owned) : []),
    [catalog]
  );

  return (
    <AppShell>
      <TopBar title="The Vault" subtitle={`${formatCurrency(balance)} ST · Level ${level}`} />

      {!!snap?.activeBoosts.length && (
        <div className="px-5 mt-1 flex items-center gap-1.5 flex-wrap">
          {snap.activeBoosts.map((b) => (
            <span key={b.boostType + b.expiresAt} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#EDEDFC] text-[#5E5CE6] capitalize">
              {b.boostType === "stMultiplier" ? <Zap className="w-3 h-3" /> : b.boostType === "xpMultiplier" ? <TrendingUp className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              {b.boostType.replace("Multiplier", "")} ×{b.value}
            </span>
          ))}
        </div>
      )}

      <div className="px-5 mt-2">
        <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />
      </div>

      {tab === "shop" && (
        <>
          <div className="px-5 mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all",
                  category === c.id ? "bg-[#5E5CE6] text-white shadow-sm" : "bg-white text-[#636366]"
                )}
                style={category !== c.id ? { boxShadow: "0 1px 2px rgba(0,0,0,0.03)" } : undefined}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="px-5 mt-4 grid grid-cols-2 gap-2.5 pb-6">
            {isLoading &&
              [0, 1, 2, 3].map((i) => <div key={i} className="h-40 rounded-[20px] bg-white animate-pulse" />)}

            {!isLoading && items.length === 0 && (
              <div className="col-span-2 text-center py-10">
                <p className="text-[13px] text-[#8E8E93] font-ui">No items in this category yet.</p>
              </div>
            )}

            {items.map((item, idx) => (
              <ShopCard
                key={item.id}
                item={item}
                level={level}
                balance={balance}
                delay={idx * 0.03}
                onOpen={() => openModal("itemDetail", { itemId: item.id })}
              />
            ))}
          </div>
        </>
      )}

      {tab === "pets" && <PetsTab />}

      {tab === "inventory" && (
        <InventoryTab owned={ownedItems} onEquip={(itemId, equipped) => equip.mutate({ itemId, equipped })} onRedeem={(itemId) => redeem.mutate(itemId)} busy={equip.isPending || redeem.isPending} />
      )}
    </AppShell>
  );
}

function ShopCard({
  item,
  level,
  balance,
  delay,
  onOpen,
}: {
  item: CatalogItemDTO;
  level: number;
  balance: number;
  delay: number;
  onOpen: () => void;
}) {
  const Icon = itemIcon(item.id);
  const rarityCfg = RARITY_CONFIG[item.rarity];
  const locked = !!item.requiredLevel && level < item.requiredLevel;
  const affordable = balance >= item.price;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
      className="relative text-left rounded-[20px] p-3.5 overflow-hidden bg-white"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}
    >
      {(item.featured || item.limited) && (
        <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold tracking-wider uppercase" style={{ background: rarityCfg.bg, color: rarityCfg.color }}>
          {item.featured ? "Featured" : "Limited"}
        </span>
      )}

      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-3" style={{ background: rarityCfg.bg }}>
        <Icon className="w-6 h-6" style={{ color: rarityCfg.color }} strokeWidth={1.9} />
      </div>

      <p className="text-[12px] font-semibold text-[#1C1C1E] leading-tight line-clamp-2 min-h-[28px]">{item.name}</p>
      <p className="mt-1 text-[11px] font-bold tabular-nums" style={{ color: affordable && !locked ? "#5E5CE6" : "#AEAEB2" }}>
        {formatCurrency(item.price)} ST
      </p>

      {locked && (
        <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-[#FF9500]">
          <Lock className="w-2.5 h-2.5" /> Level {item.requiredLevel}
        </span>
      )}
      {item.inWishlist && (
        <Heart className="absolute bottom-3 right-3 w-3.5 h-3.5 text-[#FF3B30] fill-current" />
      )}
    </motion.button>
  );
}

function InventoryTab({
  owned,
  onEquip,
  onRedeem,
  busy,
}: {
  owned: CatalogItemDTO[];
  onEquip: (itemId: string, equipped: boolean) => void;
  onRedeem: (itemId: string) => void;
  busy: boolean;
}) {
  if (owned.length === 0) {
    return (
      <div className="px-5 mt-6">
        <div className="rounded-[20px] p-8 text-center bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
          <PackageOpen className="w-10 h-10 text-[#5E5CE6]/40 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[14px] font-bold text-[#1C1C1E]">Your vault is empty</p>
          <p className="text-[12px] text-[#8E8E93] mt-1">Complete missions to earn ST, then buy your first cosmetic.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 mt-4 space-y-2.5 pb-6">
      {owned.map((item) => {
        const Icon = itemIcon(item.id);
        const rarityCfg = RARITY_CONFIG[item.rarity];
        return (
          <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[20px] p-4 flex items-center gap-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>
            <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ background: rarityCfg.bg }}>
              <Icon className="w-5 h-5" style={{ color: rarityCfg.color }} strokeWidth={1.9} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1C1C1E] truncate">{item.name}</p>
              <p className="text-[10px] font-semibold capitalize" style={{ color: rarityCfg.color }}>
                {rarityCfg.label} {item.slot ? `· ${item.slot}` : ""} {item.consumable ? "· consumable" : ""}
              </p>
            </div>
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#5E5CE6]" />
            ) : item.consumable ? (
              <button onClick={() => onRedeem(item.id)} className="px-3.5 py-2 rounded-full bg-[#EDEDFC] text-[#5E5CE6] text-[11px] font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> REDEEM
              </button>
            ) : item.slot ? (
              <button
                onClick={() => onEquip(item.id, !item.equipped)}
                className={cn(
                  "px-3.5 py-2 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-colors",
                  item.equipped ? "bg-[#34C759] text-white" : "bg-[#EDEDFC] text-[#5E5CE6]"
                )}
              >
                {item.equipped ? (<><Check className="w-3 h-3" /> WORN</>) : "EQUIP"}
              </button>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}

function PetsTab() {
  const router = useRouter();
  const { data: petCatalog, isLoading } = usePetCatalog();
  const { data: userPets } = useUserPets();
  const { data: snap } = useSnapshot();
  const { goalPetId } = usePetStore();
  const balance = snap?.wallet.balance ?? 0;
  const level = snap?.progress.level ?? 1;

  const ownedIds = useMemo(() => new Set(userPets?.map((p) => p.petDefinitionId) ?? []), [userPets]);
  const equippedId = useMemo(() => userPets?.find((p) => p.equipped)?.petDefinitionId ?? null, [userPets]);

  const ownedPets = petCatalog?.filter((p) => ownedIds.has(p.id)) ?? [];
  const availablePets = petCatalog?.filter((p) => !ownedIds.has(p.id) && playerLevelOk(p, level)) ?? [];
  const goalPet = goalPetId ? petCatalog?.find((p) => p.id === goalPetId) ?? null : null;

  function playerLevelOk(p: { unlockPlayerLevel: number }, lvl: number) { return lvl >= p.unlockPlayerLevel; }

  return (
    <div className="px-5 mt-4 pb-6">
      {/* Active pet */}
      {equippedId && (
        <div className="mb-4 rounded-[20px] p-4 bg-gradient-to-r from-[#EDEDFC] to-[#F0EBFF]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{petCatalog?.find((p) => p.id === equippedId)?.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-[#5E5CE6]">ACTIVE COMPANION</p>
              <p className="text-[13px] font-bold text-[#1C1C1E]">{petCatalog?.find((p) => p.id === equippedId)?.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Pet goal */}
      {goalPet && !ownedIds.has(goalPet.id) && (
        <div className="mb-4 rounded-[20px] p-4 bg-[#FFF8EB]" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{goalPet.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-[#F59E0B]">PET GOAL</p>
              <p className="text-[13px] font-bold text-[#1C1C1E]">{goalPet.name}</p>
              <p className="text-[10px] text-[#8E8E93]">{Math.round(Math.min(100, (balance / goalPet.priceSt) * 100))}% · {formatCurrency(Math.max(0, goalPet.priceSt - balance))} ST to go</p>
            </div>
          </div>
        </div>
      )}

      {/* My pets */}
      {ownedPets.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2">My Pets ({ownedPets.length})</h3>
          <div className="grid grid-cols-3 gap-2">
            {ownedPets.map((pet) => {
              const rarityCfg = PET_RARITY_CONFIG[pet.rarity as keyof typeof PET_RARITY_CONFIG] ?? PET_RARITY_CONFIG.common;
              const isEquipped = equippedId === pet.id;
              return (
                <div key={pet.id} className="rounded-[14px] p-2.5 bg-white text-center" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <span className="text-2xl">{pet.emoji}</span>
                  <p className="text-[10px] font-bold text-[#1C1C1E] mt-1 truncate">{pet.name}</p>
                  {isEquipped && <span className="text-[8px] font-bold text-[#34C759]">ACTIVE</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick view all */}
      <button
        onClick={() => router.push("/pets")}
        className="w-full py-3 rounded-full bg-[#5E5CE6] text-[13px] font-bold text-white flex items-center justify-center gap-2"
      >
        Explore All Pets <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
