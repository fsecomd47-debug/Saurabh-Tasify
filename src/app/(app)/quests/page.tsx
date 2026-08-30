"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Calendar, Link, Sparkles, RefreshCw, ChevronDown, ChevronUp, ArrowUpDown, Clock, Trophy, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { ActiveQuestCard } from "@/components/quests/ActiveQuestCard";
import { QuestCard } from "@/components/quests/QuestCard";
import { QuestJourney } from "@/components/quests/QuestJourney";
import { QuestDetailModal } from "@/components/quests/QuestDetailModal";
import { QuestCompleteModal } from "@/components/quests/QuestCompleteModal";
import { useQuests, useClaimQuest, useActiveQuest } from "@/hooks/queries";
import type { QuestView } from "@/types/api";

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";

type Tab = "daily" | "weekly" | "chain";
type SortMode = "recommended" | "nearComplete" | "reward" | "expiry";

const SORT_OPTIONS: { id: SortMode; label: string; icon: React.ReactNode }[] = [
  { id: "recommended", label: "Recommended", icon: <Sparkles className="w-3 h-3" /> },
  { id: "nearComplete", label: "Near Complete", icon: <Zap className="w-3 h-3" /> },
  { id: "reward", label: "Highest Reward", icon: <Trophy className="w-3 h-3" /> },
  { id: "expiry", label: "Expiring Soon", icon: <Clock className="w-3 h-3" /> },
];

export default function QuestsPage() {
  const { data: quests, isLoading } = useQuests();
  const { data: activeQuest } = useActiveQuest();
  const claimMutation = useClaimQuest();
  const [activeTab, setActiveTab] = useState<Tab>("daily");
  const [sortMode, setSortMode] = useState<SortMode>("recommended");
  const [detailQuest, setDetailQuest] = useState<QuestView | null>(null);
  const [completingQuest, setCompletingQuest] = useState<QuestView | null>(null);
  const [showClaimed, setShowClaimed] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const handleClaim = async (questId: string) => {
    const board = quests;
    if (!board) return;
    const allQuests = [...board.daily, ...board.weekly, ...board.chain];
    const quest = allQuests.find((q) => q.id === questId);
    if (!quest) return;

    if (quest.status === "completed") {
      setCompletingQuest(quest);
      return;
    }
  };

  const handleClaimFromModal = async () => {
    if (!completingQuest) return;
    try {
      await claimMutation.mutateAsync(completingQuest.id);
      setCompletingQuest(null);
    } catch {}
  };

  const handleQuestTap = (quest: QuestView) => {
    setDetailQuest(quest);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = quests
    ? [
        { id: "daily", label: "Daily", icon: <Calendar className="w-3.5 h-3.5" />, count: quests.daily.filter((q) => q.status === "active").length },
        { id: "weekly", label: "Weekly", icon: <Target className="w-3.5 h-3.5" />, count: quests.weekly.filter((q) => q.status === "active").length },
        { id: "chain", label: "Journey", icon: <Link className="w-3.5 h-3.5" />, count: quests.chain.filter((q) => q.status !== "claimed").length },
      ]
    : [];

  const currentQuests = quests
    ? activeTab === "daily"
      ? quests.daily
      : activeTab === "weekly"
        ? quests.weekly
        : quests.chain
    : [];

  // Sort quests
  const sortedQuests = useMemo(() => {
    const active = currentQuests.filter((q) => q.status === "active");
    const completed = currentQuests.filter((q) => q.status === "completed");
    const claimed = currentQuests.filter((q) => q.status === "claimed");

    const sortFn = (a: QuestView, b: QuestView) => {
      switch (sortMode) {
        case "nearComplete":
          return b.progressPct - a.progressPct;
        case "reward":
          return (b.reward.st + b.reward.xp) - (a.reward.st + a.reward.xp);
        case "expiry": {
          if (!a.expiresAt) return 1;
          if (!b.expiresAt) return -1;
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
        }
        default: // recommended
          return b.progressPct - a.progressPct;
      }
    };

    return {
      active: active.sort(sortFn),
      completed,
      claimed,
    };
  }, [currentQuests, sortMode]);

  // Counts
  const unclaimedCount = quests
    ? [...quests.daily, ...quests.weekly, ...quests.chain].filter((q) => q.status === "completed").length
    : 0;

  const nextDailyRefresh = getNextDailyReset();
  const nextWeeklyRefresh = getNextWeeklyReset();

  return (
    <AppShell>
      <TopBar title="Quests" subtitle="Your progression journey" />

      <div className="px-5 mt-4">
        {/* Summary stat */}
        {quests && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[16px] p-3 flex items-center gap-3 mb-4"
            style={{ background: "linear-gradient(135deg, #EDEDFC, #D4D4F7)", boxShadow: CARD_SHADOW }}
          >
            <div className="w-10 h-10 rounded-[12px] bg-white/60 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#5E5CE6]" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-bold text-[#1C1C1E]">
                {unclaimedCount > 0
                  ? `${unclaimedCount} quest${unclaimedCount > 1 ? "s" : ""} ready to claim!`
                  : `${currentQuests.filter((q) => q.status === "active").length} active quests`}
              </p>
              <p className="text-[10px] text-[#6B7280]">
                {unclaimedCount > 0 ? "Complete missions to claim rewards" : "Complete missions to make progress"}
              </p>
            </div>
          </motion.div>
        )}

        {/* Active quest card — prominent at top */}
        {activeQuest && activeTab !== "chain" && (
          <div className="mb-4">
            <ActiveQuestCard />
          </div>
        )}

        {/* Refresh timers */}
        {quests && activeTab !== "chain" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 mb-3 px-1"
          >
            <RefreshCw className="w-3 h-3 text-[#8E8E93]" />
            <span className="text-[10px] text-[#8E8E93]">
              {activeTab === "daily"
                ? `Resets in ${nextDailyRefresh}`
                : `Resets in ${nextWeeklyRefresh}`}
            </span>
          </motion.div>
        )}

        {/* Tab bar + sort */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex gap-1.5 p-1 bg-[#F2F2F7] rounded-[14px] flex-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] text-[12px] font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-[#1C1C1E] shadow-sm"
                    : "text-[#8E8E93] hover:text-[#636366]"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className="w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
                    style={{
                      background: activeTab === tab.id ? "#5E5CE6" : "#D1D5DB",
                      color: activeTab === tab.id ? "white" : "#6B7280",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort button */}
          {activeTab !== "chain" && (
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="w-10 h-10 rounded-[12px] bg-[#F2F2F7] flex items-center justify-center"
              >
                <ArrowUpDown className="w-4 h-4 text-[#636366]" />
              </motion.button>

              <AnimatePresence>
                {showSortMenu && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute right-0 top-12 z-50 w-48 rounded-[14px] bg-white p-1.5"
                      style={{ boxShadow: "0 8px 32px rgba(0,0,0,.12)" }}
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => { setSortMode(opt.id); setShowSortMenu(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12px] font-bold transition-colors ${
                            sortMode === opt.id
                              ? "bg-[#EDEDFC] text-[#5E5CE6]"
                              : "text-[#1C1C1E] hover:bg-[#F2F2F7]"
                          }`}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Quest list */}
      <div className="px-5 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-[20px] bg-white animate-pulse" style={{ boxShadow: CARD_SHADOW }} />
            ))}
          </div>
        ) : currentQuests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 rounded-full bg-[#F2F2F7] mx-auto mb-3 flex items-center justify-center">
              <Target className="w-8 h-8 text-[#C7C7CC]" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-bold text-[#1C1C1E]">No quests right now</p>
            <p className="text-[12px] text-[#8E8E93] mt-1">
              Complete a mission and your next challenge will appear.
            </p>
          </motion.div>
        ) : activeTab === "chain" ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] bg-white p-4"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <QuestJourney chainQuests={currentQuests} />
          </motion.div>
        ) : (
          <div className="space-y-3">
            {/* Completed (unclaimed) — top priority */}
            {sortedQuests.completed.map((quest) => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <QuestCard quest={quest} onClaim={handleClaim} onTap={() => handleQuestTap(quest)} />
              </motion.div>
            ))}

            {/* Active quests — sorted */}
            {sortedQuests.active.map((quest, i) => (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <QuestCard quest={quest} onClaim={handleClaim} onTap={() => handleQuestTap(quest)} />
              </motion.div>
            ))}

            {/* Claimed quests — collapsible */}
            {sortedQuests.claimed.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowClaimed(!showClaimed)}
                  className="flex items-center gap-1.5 mb-2 w-full"
                >
                  <p className="text-[10px] font-bold text-[#C7C7CC] uppercase tracking-wider">
                    Completed ({sortedQuests.claimed.length})
                  </p>
                  <div className="flex-1 h-px bg-[#E5E7EB]" />
                  {showClaimed ? (
                    <ChevronUp className="w-3 h-3 text-[#C7C7CC]" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-[#C7C7CC]" />
                  )}
                </button>
                <AnimatePresence>
                  {showClaimed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {sortedQuests.claimed.map((quest) => (
                        <QuestCard key={quest.id} quest={quest} compact onTap={() => handleQuestTap(quest)} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quest Detail Modal */}
      <AnimatePresence>
        {detailQuest && (
          <QuestDetailModal
            quest={detailQuest}
            onClose={() => setDetailQuest(null)}
            onClaim={handleClaim}
          />
        )}
      </AnimatePresence>

      {/* Quest Complete Modal */}
      <AnimatePresence>
        {completingQuest && (
          <QuestCompleteModal
            quest={completingQuest}
            onClose={() => setCompletingQuest(null)}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function getNextDailyReset(): string {
  const now = new Date();
  const nepalOffset = 5.75 * 60;
  const localOffset = now.getTimezoneOffset();
  const nepalTime = new Date(now.getTime() + (nepalOffset + localOffset) * 60 * 1000);
  const resetHour = 14;

  const hoursUntilReset = (resetHour - nepalTime.getUTCHours() + 24) % 24;
  const minsUntilReset = (60 - nepalTime.getUTCMinutes()) % 60;

  if (hoursUntilReset === 0) return `${minsUntilReset}m`;
  return `${hoursUntilReset}h ${minsUntilReset}m`;
}

function getNextWeeklyReset(): string {
  const now = new Date();
  const nepalOffset = 5.75 * 60;
  const localOffset = now.getTimezoneOffset();
  const nepalTime = new Date(now.getTime() + (nepalOffset + localOffset) * 60 * 1000);
  const resetHour = 14;

  const daysUntilSunday = (7 - nepalTime.getUTCDay()) % 7;
  const hoursUntilReset = (resetHour - nepalTime.getUTCHours() + 24) % 24;
  const minsUntilReset = (60 - nepalTime.getUTCMinutes()) % 60;

  if (daysUntilSunday === 0 && hoursUntilReset === 0) return `${minsUntilReset}m`;
  if (daysUntilSunday === 0) return `${hoursUntilReset}h ${minsUntilReset}m`;
  return `${daysUntilSunday}d ${hoursUntilReset}h`;
}
