"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShoppingBag, ChevronRight, Swords, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { WealthCard } from "@/components/wallet/WealthCard";
import { NextTaskHero } from "@/components/game/NextTaskHero";
import { MomentumBar } from "@/components/game/MomentumBar";
import { NextGoalCard } from "@/components/game/NextGoalCard";
import { WeeklyGrindCard } from "@/components/game/WeeklyGrindCard";
import { SocialProofFeed } from "@/components/game/SocialProofFeed";
import { PetWidget } from "@/components/pets/PetWidget";
import { PetGoalWidget } from "@/components/pets/PetGoalWidget";
import { DailyVaultCard } from "@/components/daily-rewards/DailyVaultCard";
import { DailyRewardModal } from "@/components/daily-rewards/DailyRewardModal";
import { ActiveQuestCard } from "@/components/quests/ActiveQuestCard";
import { useSnapshot, useLeaderboard } from "@/hooks/queries";
import { CATALOG_BY_ID } from "@/lib/catalog/data";
import { formatCurrency } from "@/lib/format";
import { useRouter } from "next/navigation";

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";

export default function HomePage() {
  const router = useRouter();
  const { data: snap } = useSnapshot();
  const { data: lb } = useLeaderboard();

  if (!snap) {
    return (
      <AppShell>
        <TopBar title="SaurabhTask" subtitle="Loading your player…" />
        <div className="px-5 mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-[20px] bg-white animate-pulse" style={{ boxShadow: CARD_SHADOW }} />
          ))}
        </div>
      </AppShell>
    );
  }

  const balance = snap.wallet.balance;
  const goalItem = snap.profile.goalItemId ? CATALOG_BY_ID[snap.profile.goalItemId] : null;
  const ownedIds = new Set(snap.inventory.map((i) => i.itemId));
  const nearestItem = goalItem ?? null;

  const me = lb?.me;
  const rival = lb?.rows.find((r) => r.rank === (me ? me.rank - 1 : 1));
  const ahead = me && rival && me.totalAssets > rival.totalAssets;

  return (
    <AppShell>
      <TopBar title="SaurabhTask" subtitle="Get things done. Get richer." />

      <WealthCard />

      <DailyVaultCard />

      <ActiveQuestCard />

      <PetWidget />

      <PetGoalWidget />

      {/* Near reward */}
      {nearestItem && !ownedIds.has(nearestItem.id) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="px-5 mt-4">
          <div className="bg-white rounded-[20px] p-4" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#FFF8EB]">
                <ShoppingBag className="w-4 h-4 text-[#FF9500]" />
              </div>
              <h3 className="text-[13px] font-bold text-[#1C1C1E]">You&apos;re Close To</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#1C1C1E] truncate">{nearestItem.name}</p>
                <p className="text-[10px] text-[#FF9500] font-semibold">{formatCurrency(Math.max(0, nearestItem.price - balance))} ST to go</p>
              </div>
              <button onClick={() => router.push("/vault")} className="px-3 py-1.5 rounded-full text-[10px] font-semibold text-[#FF9500] bg-[#FFF8EB]">
                View
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <WeeklyGrindCard />

      <NextTaskHero />
      <MomentumBar />
      <NextGoalCard />

      {/* Rival card */}
      {ahead && me && rival && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="px-5 mt-4">
          <div className="bg-white rounded-[20px] p-4" style={{ boxShadow: CARD_SHADOW }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#FFF8EB]">
                <Swords className="w-4 h-4 text-[#FF9500]" strokeWidth={2.5} />
              </div>
              <h3 className="text-[13px] font-bold text-[#1C1C1E]">Protect Your Lead</h3>
            </div>
            <div className="flex items-center justify-between">
              <PlayerChip name={me.displayName} emoji={me.avatarEmoji} assets={me.totalAssets} />
              <span className="text-[14px] font-bold text-[#FF9500]">vs</span>
              <PlayerChip name={rival.displayName} emoji={rival.avatarEmoji} assets={rival.totalAssets} />
            </div>
            <div className="mt-2 pt-2 border-t border-[rgba(0,0,0,0.04)]">
              <p className="text-[11px] font-semibold text-[#FF9500]">
                +{formatCurrency(me.totalAssets - rival.totalAssets)} ST lead — keep grinding!
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent wins from real ledger */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="px-5 mt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-[#1C1C1E]">Recent Wins</h2>
          <button onClick={() => router.push("/statistics")} className="text-[11px] font-bold text-[#8E8E93] hover:text-[#5E5CE6] transition-colors flex items-center gap-0.5">
            Stats <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2">
          {snap.transactions.filter((t) => t.amount > 0).length === 0 && (
            <div className="rounded-[16px] px-4 py-5 text-center" style={{ background: "white", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.04)" }}>
              <p className="text-[12px] text-[#8E8E93] font-ui">Complete your first mission to see rewards here.</p>
            </div>
          )}
          {snap.transactions
            .filter((t) => t.amount > 0)
            .slice(0, 3)
            .map((t) => {
              const isHighValue = t.amount >= 100;
              return (
                <div
                  key={t.id}
                  className="rounded-[16px] px-4 py-3 flex items-center gap-3"
                  style={{
                    background: "white",
                    boxShadow: isHighValue
                      ? "inset 0 2px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(245,158,11,0.08)"
                      : "inset 0 2px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isHighValue ? "linear-gradient(145deg, #FEF3C7, #FDE68A)" : "linear-gradient(145deg, #D1FAE5, #A7F3D0)",
                      boxShadow: isHighValue ? "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 3px rgba(245,158,11,0.15)" : "inset 0 1px 0 rgba(255,255,255,0.6)",
                    }}
                  >
                    {isHighValue ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" fill="#F59E0B" stroke="#B45309" strokeWidth="0.8" />
                        <text x="8" y="11" textAnchor="middle" fill="#92400E" fontWeight="800" fontSize="8" fontFamily="system-ui">S</text>
                      </svg>
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#059669]" strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#1C1C1E] truncate">{snap.profile.displayName} — {t.title}</p>
                    <p className="text-[10px] text-[#8E8E93] capitalize">{t.context ?? t.type}</p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 text-[12px] font-bold tabular-nums px-2.5 py-1 rounded-full"
                    style={{
                      background: isHighValue ? "linear-gradient(135deg, #FEF3C7, #FDE68A)" : "#D1FAE5",
                      color: isHighValue ? "#92400E" : "#065F46",
                      boxShadow: isHighValue ? "0 0 8px rgba(245,158,11,0.2)" : "none",
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="5" r="4.5" fill={isHighValue ? "#F59E0B" : "#10B981"} stroke={isHighValue ? "#B45309" : "#047857"} strokeWidth="0.5" />
                      <text x="5" y="7" textAnchor="middle" fill={isHighValue ? "#78350F" : "#064E3B"} fontWeight="800" fontSize="5" fontFamily="system-ui">S</text>
                    </svg>
                    +{formatCurrency(t.amount)}
                  </span>
                </div>
              );
            })}
          {snap.transactions.filter((t) => t.amount > 0).length === 0 && (
            <div className="rounded-[20px] px-4 py-5 text-center bg-white" style={{ boxShadow: CARD_SHADOW }}>
              <p className="text-[12px] text-[#8E8E93]">Your wins will appear here after your first mission.</p>
            </div>
          )}
        </div>
      </motion.div>

      <SocialProofFeed />
    </AppShell>
  );
}

function PlayerChip({ name, emoji, assets }: { name: string; emoji: string; assets: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold bg-[#F2F2F7] text-[#636366]">
        {emoji}
      </div>
      <div>
        <p className="text-[12px] font-semibold text-[#1C1C1E] truncate max-w-[80px]">{name}</p>
        <p className="text-[10px] text-[#8E8E93] tabular-nums">{formatCurrency(assets)} ST</p>
      </div>
    </div>
  );
}
