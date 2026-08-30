"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Target, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePetCatalog, useSnapshot } from "@/hooks/queries";
import { usePetStore } from "@/store/pet-store";
import { formatCurrency } from "@/lib/format";
import { PET_RARITY_CONFIG } from "@/lib/pets/data";

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";

export function PetGoalWidget() {
  const router = useRouter();
  const { goalPetId } = usePetStore();
  const { data: catalog } = usePetCatalog();
  const { data: snap } = useSnapshot();

  const goalPet = useMemo(() => {
    if (!goalPetId || !catalog) return null;
    return catalog.find((p) => p.id === goalPetId) ?? null;
  }, [goalPetId, catalog]);

  const balance = snap?.wallet.balance ?? 0;

  if (!goalPet) return null;

  const rarityCfg = PET_RARITY_CONFIG[goalPet.rarity as keyof typeof PET_RARITY_CONFIG] ?? PET_RARITY_CONFIG.common;
  const progress = Math.min(100, (balance / goalPet.priceSt) * 100);
  const remaining = Math.max(0, goalPet.priceSt - balance);
  const canAfford = balance >= goalPet.priceSt;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="px-5 mt-4"
    >
      <div className="bg-white rounded-[20px] p-4" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: `${rarityCfg.color}15` }}>
            <Target className="w-4 h-4" style={{ color: rarityCfg.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-bold text-[#1C1C1E]">Pet Goal</h3>
            <p className="text-[10px] text-[#8E8E93]">{canAfford ? "You can afford it!" : `${formatCurrency(remaining)} ST to go`}</p>
          </div>
          <button onClick={() => router.push("/pets")}
            className="text-[10px] font-bold text-[#5E5CE6] flex items-center gap-0.5"
            aria-label="Visit pets">
            View <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Goal pet info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-[14px] flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${goalPet.assetGradient.split(" → ")[0]}20, ${goalPet.assetGradient.split(" → ")[1]}20)` }}>
            <span className="text-2xl">{goalPet.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-bold text-[#1C1C1E] truncate">{goalPet.name}</p>
              <span className="px-1.5 py-0.5 rounded-md text-[7px] font-bold tracking-wider uppercase"
                style={{ background: rarityCfg.bg, color: rarityCfg.color }}>
                {rarityCfg.label}
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93]">{formatCurrency(goalPet.priceSt)} ST</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: canAfford
                ? "linear-gradient(90deg, #34C759, #30B855)"
                : `linear-gradient(90deg, ${rarityCfg.color}, ${rarityCfg.color}CC)`,
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] font-bold tabular-nums" style={{ color: canAfford ? "#34C759" : rarityCfg.color }}>
            {Math.round(progress)}%
          </span>
          <span className="text-[10px] text-[#8E8E93] tabular-nums">{formatCurrency(balance)} / {formatCurrency(goalPet.priceSt)}</span>
        </div>
      </div>
    </motion.div>
  );
}
