"use client";

import React from "react";
import { motion } from "framer-motion";
import { Pickaxe, Zap, ChevronRight, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActivePet, useMiningStatus } from "@/hooks/queries";
import { usePetStore } from "@/store/pet-store";
import { formatCurrency } from "@/lib/format";
import { PET_RARITY_CONFIG } from "@/lib/pets/data";

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";

export function PetWidget() {
  const router = useRouter();
  const { data: activePet } = useActivePet();
  const { data: mining } = useMiningStatus();
  const { goalPetId } = usePetStore();

  if (!activePet) return null;

  const rarityCfg = PET_RARITY_CONFIG[activePet.rarity as keyof typeof PET_RARITY_CONFIG] ?? PET_RARITY_CONFIG.common;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="px-5 mt-4">
      <div className="bg-white rounded-[20px] p-4" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: rarityCfg.bg }}>
            <span className="text-lg">{activePet.emoji}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[13px] font-bold text-[#1C1C1E]">{activePet.name}</h3>
              {goalPetId === activePet.petDefinitionId && (
                <span className="px-1.5 py-0.5 rounded-md text-[7px] font-bold bg-[#FFF8EB] text-[#F59E0B]">GOAL</span>
              )}
            </div>
            <p className="text-[10px] text-[#8E8E93] capitalize">{rarityCfg.label} · Lv.{activePet.petLevel}</p>
          </div>
          <button onClick={() => router.push("/pets")} className="text-[10px] font-bold text-[#5E5CE6] flex items-center gap-0.5" aria-label="Visit pets">
            Visit <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {mining?.active ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2.5 rounded-[12px] bg-[#F8F9FA]">
              <div className="flex items-center gap-1.5">
                <Pickaxe className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="text-[11px] font-semibold text-[#636366]">Mining</span>
              </div>
              <div className="flex-1" />
              <span className="text-[12px] font-bold text-[#1C1C1E] tabular-nums">+{mining.miningRate.toFixed(1)} ST/min</span>
            </div>
            {mining.todayMined > 0 && (
              <div className="flex items-center gap-1.5 px-1">
                <TrendingUp className="w-3 h-3 text-[#34C759]" />
                <span className="text-[10px] font-semibold text-[#8E8E93]">
                  +{formatCurrency(mining.todayMined)} ST today
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-2.5 rounded-[12px] bg-[#F8F9FA]">
            <Zap className="w-3.5 h-3.5 text-[#5E5CE6]" />
            <span className="text-[11px] font-semibold text-[#636366]">+{activePet.xpBoost}% XP boost active</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
