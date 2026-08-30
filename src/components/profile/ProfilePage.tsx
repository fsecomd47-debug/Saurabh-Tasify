"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import {
  ArrowLeft, Settings, Flame, Trophy, Zap, Target, TrendingUp,
  ChevronRight, Star, Shield, Clock, Wallet, Award, Crown,
  Lock, Check, X, Gem, Pickaxe, Heart
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ClientPortal } from "@/components/layout/ClientPortal";
import { useProfile, useSnapshot, useUserPets, usePetCatalog, useUpdateProfile } from "@/hooks/queries";
import { PET_RARITY_CONFIG, PET_MINING_DAILY_CAP } from "@/lib/pets/data";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProfileView } from "@/types/api";

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";
const TABS = ["Overview", "Stats", "Collection", "Badges"] as const;
type Tab = typeof TABS[number];

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN PROFILE PAGE                                             */
/* ═══════════════════════════════════════════════════════════════ */

export default function ProfilePage() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  if (isLoading || !profile) {
    return <ProfileSkeleton />;
  }

  return (
    <AppShell>
      <div className="bg-[#F2F2F7]">
        {/* ── Hero Section ── */}
        <ProfileHero
          profile={profile}
          onAvatarTap={() => setShowAvatarPicker(true)}
          onSettingsTap={() => router.push("/settings")}
        />

        {/* ── Stats Bar ── */}
        <ProfileStatsBar stats={profile.stats} />

        {/* ── Active Pet ── */}
        {profile.activePet && <ProfilePetShowcase pet={profile.activePet} />}

        {/* ── Tabs ── */}
        <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ── Tab Content ── */}
        <div className="px-5 pb-8">
          <AnimatePresence mode="wait">
            {activeTab === "Overview" && <OverviewTab key="overview" profile={profile} />}
            {activeTab === "Stats" && <StatsTab key="stats" profile={profile} />}
            {activeTab === "Collection" && <CollectionTab key="collection" profile={profile} />}
            {activeTab === "Badges" && <BadgesTab key="badges" profile={profile} />}
          </AnimatePresence>
        </div>

        {/* ── Avatar Picker Modal ── */}
        <ClientPortal>
          <AnimatePresence>
            {showAvatarPicker && (
              <AvatarPickerModal
                currentAvatarId={profile.user.avatarId}
                onClose={() => setShowAvatarPicker(false)}
              />
            )}
          </AnimatePresence>
        </ClientPortal>
      </div>
    </AppShell>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  PROFILE HERO                                                  */
/* ═══════════════════════════════════════════════════════════════ */

function ProfileHero({
  profile,
  onAvatarTap,
  onSettingsTap,
}: {
  profile: ProfileView;
  onAvatarTap: () => void;
  onSettingsTap: () => void;
}) {
  const router = useRouter();
  const { user, collection } = profile;
  const ringRadius = 52;
  const ringStroke = 4;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = user.xpProgress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
      className="relative bg-white pt-12 pb-6"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 20%, rgba(94,92,230,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Header actions */}
      <div className="absolute top-12 left-5 right-5 flex items-center justify-between z-10">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-[#636366]" />
        </button>
        <button
          onClick={onSettingsTap}
          className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center"
        >
          <Settings className="w-4 h-4 text-[#636366]" />
        </button>
      </div>

      <div className="relative flex flex-col items-center">
        {/* Avatar with Level Ring */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAvatarTap}
          className="relative"
          style={{ width: 120, height: 120 }}
        >
          <svg className="absolute inset-0" width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="#F2F2F7" strokeWidth={ringStroke} />
            <circle
              cx="60" cy="60" r={ringRadius}
              fill="none"
              stroke="#5E5CE6"
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringCircumference * (1 - ringProgress)}
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #EDEDFC, #D4D4F7)",
                boxShadow: "0 4px 16px rgba(94,92,230,0.2)",
              }}
            >
              <span className="text-4xl select-none">{user.avatarEmoji}</span>
            </div>
          </div>
          {/* Level badge */}
          <div
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#5E5CE6] text-white text-[10px] font-bold"
            style={{ boxShadow: "0 2px 8px rgba(94,92,230,0.4)" }}
          >
            LV.{user.level}
          </div>
        </motion.button>

        {/* Player Name */}
        <h1
          className="text-[24px] font-bold text-[#1C1C1E] mt-3"
          style={{ letterSpacing: "-0.02em" }}
        >
          {user.displayName}
        </h1>

        {/* Title */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[12px] font-bold text-[#5E5CE6] uppercase tracking-wider">
            {user.title}
          </span>
        </div>

        {/* Featured Badges */}
        {collection.recentBadges.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            {collection.recentBadges.slice(0, 3).map((badge) => (
              <span key={badge.id} className="text-lg">{badge.emoji}</span>
            ))}
          </div>
        )}

        {/* XP Progress */}
        <div className="w-48 mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-[#8E8E93]">
              {user.xp.toLocaleString()} / {user.xpToNextLevel.toLocaleString()} XP
            </span>
            <span className="text-[10px] font-bold text-[#5E5CE6]">
              LV.{user.level + 1}
            </span>
          </div>
          <div className="h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${user.xpProgress * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #5E5CE6, #7A78FF)" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  STATS BAR                                                     */
/* ═══════════════════════════════════════════════════════════════ */

function ProfileStatsBar({ stats }: { stats: ProfileView["stats"] }) {
  const items = [
    { icon: <Wallet className="w-3.5 h-3.5 text-[#F59E0B]" />, value: formatCurrency(stats.stBalance), label: "ST" },
    { icon: <Flame className="w-3.5 h-3.5 text-[#FF6B35]" />, value: stats.streak.toString(), label: "Streak" },
    { icon: <Trophy className="w-3.5 h-3.5 text-[#5E5CE6]" />, value: stats.rank ? `#${stats.rank}` : "—", label: "Rank" },
    { icon: <Award className="w-3.5 h-3.5 text-[#34C759]" />, value: stats.missionsCompleted.toString(), label: "Missions" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="px-5 mt-4"
    >
      <div
        className="grid grid-cols-4 gap-2 rounded-[20px] bg-white p-3"
        style={{ boxShadow: CARD_SHADOW }}
      >
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="flex flex-col items-center gap-1"
          >
            {item.icon}
            <span className="text-[13px] font-bold text-[#1C1C1E] tabular-nums">{item.value}</span>
            <span className="text-[9px] font-semibold text-[#8E8E93]">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  ACTIVE PET SHOWCASE                                           */
/* ═══════════════════════════════════════════════════════════════ */

function ProfilePetShowcase({ pet }: { pet: NonNullable<ProfileView["activePet"]> }) {
  const [floatY, setFloatY] = useState(0);
  const rarityCfg = PET_RARITY_CONFIG[pet.rarity as keyof typeof PET_RARITY_CONFIG];

  useEffect(() => {
    let frame: number;
    let t = 0;
    const tick = () => {
      t += 0.02;
      setFloatY(Math.sin(t) * 4);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="px-5 mt-4"
    >
      <div
        className="relative rounded-[20px] bg-white p-4 overflow-hidden"
        style={{ boxShadow: CARD_SHADOW }}
      >
        {/* Ambient glow */}
        {rarityCfg && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 30% 50%, ${rarityCfg.color}10 0%, transparent 50%)`,
            }}
          />
        )}

        <div className="relative flex items-center gap-4">
          {/* Pet Avatar */}
          <div
            className="relative flex-shrink-0 w-16 h-16 rounded-[16px] flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${rarityCfg?.color ?? "#5E5CE6"}15, ${rarityCfg?.color ?? "#5E5CE6"}08)`,
            }}
          >
            <motion.span
              className="text-3xl select-none"
              style={{
                transform: `translateY(${floatY}px)`,
                filter: `drop-shadow(0 2px 8px ${rarityCfg?.color ?? "#5E5CE6"}40)`,
              }}
            >
              {pet.emoji}
            </motion.span>
          </div>

          {/* Pet Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">Active Companion</span>
            </div>
            <h3 className="text-[16px] font-bold text-[#1C1C1E] mt-0.5">{pet.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[11px] font-bold text-[#5E5CE6]">LV.{pet.petLevel}</span>
              <div className="flex items-center gap-1">
                <Pickaxe className="w-3 h-3 text-[#F59E0B]" />
                <span className="text-[11px] font-semibold text-[#636366]">{pet.miningRate} ST/min</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#5E5CE6]" />
                <span className="text-[11px] font-semibold text-[#636366]">+{pet.xpBoost}% XP</span>
              </div>
            </div>
          </div>

          {/* Today's mining */}
          <div className="text-right">
            <span className="text-[10px] font-semibold text-[#8E8E93]">Today</span>
            <p className="text-[14px] font-bold text-[#34C759] tabular-nums">+{pet.todayMined}</p>
          </div>
        </div>

        {/* Mining cap bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-semibold text-[#8E8E93]">Daily Cap</span>
            <span className="text-[9px] font-bold text-[#636366] tabular-nums">
              {pet.todayMined} / {PET_MINING_DAILY_CAP}
            </span>
          </div>
          <div className="h-1 bg-[#F2F2F7] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (pet.todayMined / PET_MINING_DAILY_CAP) * 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #F59E0B, #FCD34D)" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  TAB BAR                                                       */
/* ═══════════════════════════════════════════════════════════════ */

function ProfileTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  return (
    <div className="px-5 mt-5 mb-3">
      <div
        className="flex gap-1 p-1 rounded-[14px] bg-white"
        style={{ boxShadow: CARD_SHADOW }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "flex-1 py-2 rounded-[11px] text-[11px] font-bold transition-all duration-200",
              activeTab === tab
                ? "bg-[#5E5CE6] text-white"
                : "text-[#8E8E93] hover:text-[#636366]"
            )}
            style={activeTab === tab ? { boxShadow: "0 2px 8px rgba(94,92,230,0.3)" } : {}}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  OVERVIEW TAB                                                  */
/* ═══════════════════════════════════════════════════════════════ */

function OverviewTab({ profile }: { profile: ProfileView }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Current Goal */}
      {profile.goal && (
        <GoalCard goal={profile.goal} balance={profile.stats.stBalance} />
      )}

      {/* Proud Of */}
      <ProudOfSection profile={profile} />

      {/* Recent Wins */}
      {profile.recentWins.length > 0 && (
        <RecentWinsSection wins={profile.recentWins} />
      )}

      {/* Player Journey */}
      <PlayerJourneySection journey={profile.journey} level={profile.user.level} />
    </motion.div>
  );
}

function GoalCard({ goal, balance }: { goal: NonNullable<ProfileView["goal"]>; balance: number }) {
  return (
    <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-[#5E5CE6]" />
        <span className="text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wider">Current Goal</span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #EDEDFC, #D4D4F7)" }}
        >
          <span className="text-2xl">{goal.itemEmoji ?? "🎯"}</span>
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-bold text-[#1C1C1E]">{goal.itemName ?? "Goal"}</p>
          {goal.itemPrice && (
            <>
              <div className="mt-1.5">
                <div className="h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (balance / goal.itemPrice) * 100)}%`,
                      background: "linear-gradient(90deg, #5E5CE6, #7A78FF)",
                    }}
                  />
                </div>
              </div>
              <p className="text-[10px] font-semibold text-[#8E8E93] mt-1">
                {formatCurrency(balance)} / {formatCurrency(goal.itemPrice)} ST
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProudOfSection({ profile }: { profile: ProfileView }) {
  const items = [
    { icon: <Flame className="w-4 h-4 text-[#FF6B35]" />, label: `${profile.stats.streak} Day Streak`, highlight: profile.stats.streak >= 7 },
    { icon: <Trophy className="w-4 h-4 text-[#5E5CE6]" />, label: `${profile.stats.missionsCompleted} Missions`, highlight: profile.stats.missionsCompleted >= 50 },
    { icon: <Wallet className="w-4 h-4 text-[#F59E0B]" />, label: `${formatCurrency(profile.stats.lifetimeStEarned)} ST Earned`, highlight: profile.stats.lifetimeStEarned >= 10000 },
    { icon: <Gem className="w-4 h-4 text-[#8B5CF6]" />, label: `${profile.collection.petsOwned} Pets Collected`, highlight: profile.collection.petsOwned >= 5 },
  ].filter((item) => item.highlight);

  if (items.length === 0) return null;

  return (
    <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-[#F59E0B]" />
        <span className="text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wider">Proud Of</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2.5"
          >
            {item.icon}
            <span className="text-[12px] font-semibold text-[#636366]">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RecentWinsSection({ wins }: { wins: ProfileView["recentWins"] }) {
  return (
    <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-[#34C759]" />
        <span className="text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wider">Recent Wins</span>
      </div>
      <div className="space-y-2">
        {wins.slice(0, 4).map((win, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between"
          >
            <span className="text-[11px] font-semibold text-[#636366] truncate flex-1">{win.title}</span>
            <span className="text-[11px] font-bold text-[#34C759] tabular-nums ml-2">+{win.amount} ST</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PlayerJourneySection({ journey, level }: { journey: ProfileView["journey"]; level: number }) {
  return (
    <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-[#5E5CE6]" />
        <span className="text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wider">Player Journey</span>
      </div>
      <div className="relative">
        {journey.map((milestone, i) => {
          const isLast = i === journey.length - 1;
          const isCurrent = milestone.level === level;
          return (
            <div key={milestone.level} className="flex items-start gap-3 relative">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-[7px] top-[18px] w-[2px] h-[calc(100%-12px)] bg-[#EDEDFC]" />
              )}
              {/* Dot */}
              <div
                className={cn(
                  "w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center",
                  isCurrent ? "bg-[#5E5CE6]" : "bg-[#EDEDFC]"
                )}
                style={isCurrent ? { boxShadow: "0 0 8px rgba(94,92,230,0.4)" } : {}}
              >
                {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              {/* Content */}
              <div className="pb-4">
                <p className={cn(
                  "text-[12px] font-bold",
                  isCurrent ? "text-[#5E5CE6]" : "text-[#1C1C1E]"
                )}>
                  LV.{milestone.level}
                </p>
                <p className="text-[10px] text-[#8E8E93]">{milestone.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  STATS TAB                                                     */
/* ═══════════════════════════════════════════════════════════════ */

function StatsTab({ profile }: { profile: ProfileView }) {
  const { stats } = profile;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Productivity */}
      <StatSection
        title="Productivity"
        icon={<Zap className="w-4 h-4 text-[#5E5CE6]" />}
        items={[
          { label: "Missions Completed", value: stats.missionsCompleted.toString() },
          { label: "Hard Missions", value: stats.hardMissionsCompleted.toString() },
          { label: "Early Bird Tasks", value: stats.earlyTasksCompleted.toString() },
          { label: "Items Bought", value: stats.itemsBought.toString() },
        ]}
      />

      {/* Wealth */}
      <StatSection
        title="Wealth"
        icon={<Wallet className="w-4 h-4 text-[#F59E0B]" />}
        items={[
          { label: "Current Balance", value: formatCurrency(stats.stBalance) + " ST", highlight: true },
          { label: "Lifetime Earned", value: formatCurrency(stats.lifetimeStEarned) + " ST" },
          { label: "Lifetime Spent", value: formatCurrency(stats.lifetimeStSpent) + " ST" },
          { label: "Best Streak", value: stats.bestStreak + " days" },
        ]}
      />

      {/* Progression */}
      <StatSection
        title="Progression"
        icon={<TrendingUp className="w-4 h-4 text-[#34C759]" />}
        items={[
          { label: "Current Level", value: `LV.${profile.user.level}`, highlight: true },
          { label: "Total XP", value: profile.user.xp.toLocaleString() },
          { label: "Badges Earned", value: `${profile.collection.badgesEarned} / ${profile.collection.totalBadges}` },
          { label: "Pets Owned", value: `${profile.collection.petsOwned} / ${profile.collection.totalPets}` },
        ]}
      />
    </motion.div>
  );
}

function StatSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { label: string; value: string; highlight?: boolean }[];
}) {
  return (
    <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8E8E93]">{item.label}</span>
            <span className={cn(
              "text-[12px] font-bold tabular-nums",
              item.highlight ? "text-[#5E5CE6]" : "text-[#1C1C1E]"
            )}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  COLLECTION TAB                                                */
/* ═══════════════════════════════════════════════════════════════ */

function CollectionTab({ profile }: { profile: ProfileView }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Pet Collection Summary */}
      <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gem className="w-4 h-4 text-[#8B5CF6]" />
            <span className="text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wider">Pets</span>
          </div>
          <span className="text-[11px] font-bold text-[#5E5CE6]">
            {profile.collection.petsOwned} / {profile.collection.totalPets}
          </span>
        </div>
        <div className="h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(profile.collection.petsOwned / profile.collection.totalPets) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #8B5CF6, #A78BFA)" }}
          />
        </div>
        <button className="w-full mt-3 py-2 rounded-[12px] bg-[#F2F2F7] text-[11px] font-bold text-[#636366]">
          View All Pets →
        </button>
      </div>

      {/* Badge Collection Summary */}
      <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wider">Badges</span>
          </div>
          <span className="text-[11px] font-bold text-[#5E5CE6]">
            {profile.collection.badgesEarned} / {profile.collection.totalBadges}
          </span>
        </div>
        <div className="h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(profile.collection.badgesEarned / profile.collection.totalBadges) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #F59E0B, #FCD34D)" }}
          />
        </div>
        <button className="w-full mt-3 py-2 rounded-[12px] bg-[#F2F2F7] text-[11px] font-bold text-[#636366]">
          View All Badges →
        </button>
      </div>

      {/* Recent Badges */}
      {profile.collection.recentBadges.length > 0 && (
        <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-[#34C759]" />
            <span className="text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wider">Recent Badges</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {profile.collection.recentBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center p-2 rounded-[12px] bg-[#F8F9FA]"
              >
                <span className="text-2xl">{badge.emoji}</span>
                <span className="text-[9px] font-bold text-[#636366] mt-1 text-center leading-tight">
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  BADGES TAB                                                    */
/* ═══════════════════════════════════════════════════════════════ */

function BadgesTab({ profile }: { profile: ProfileView }) {
  const allBadges = profile.collection.recentBadges;
  const lockedCount = profile.collection.totalBadges - profile.collection.badgesEarned;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Badge Progress */}
      <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wider">Badges</span>
          </div>
          <span className="text-[11px] font-bold text-[#5E5CE6]">
            {profile.collection.badgesEarned} / {profile.collection.totalBadges}
          </span>
        </div>
        <div className="h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(profile.collection.badgesEarned / profile.collection.totalBadges) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #F59E0B, #FCD34D)" }}
          />
        </div>
      </div>

      {/* Earned Badges */}
      {allBadges.length > 0 && (
        <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
          <span className="text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wider">Earned</span>
          <div className="grid grid-cols-3 gap-2.5 mt-3">
            {allBadges.map((badge, i) => {
              const rarityColors: Record<string, string> = {
                common: "#8E8E93",
                rare: "#3B82F6",
                epic: "#8B5CF6",
                legendary: "#F59E0B",
                mythic: "#EF4444",
              };
              const rarityBg: Record<string, string> = {
                common: "#F2F2F7",
                rare: "#EFF6FF",
                epic: "#F5F3FF",
                legendary: "#FFFBEB",
                mythic: "#FEF2F2",
              };
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex flex-col items-center p-3 rounded-[16px] relative"
                  style={{ background: rarityBg[badge.rarity] ?? "#F8F9FA" }}
                >
                  <span className="text-3xl">{badge.emoji}</span>
                  <span className="text-[9px] font-bold text-[#636366] mt-1.5 text-center leading-tight">
                    {badge.name}
                  </span>
                  <span
                    className="text-[8px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-full"
                    style={{
                      color: rarityColors[badge.rarity] ?? "#8E8E93",
                      background: `${rarityColors[badge.rarity] ?? "#8E8E93"}15`,
                    }}
                  >
                    {badge.rarity}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Badges Preview */}
      {lockedCount > 0 && (
        <div className="rounded-[20px] bg-white p-4" style={{ boxShadow: CARD_SHADOW }}>
          <span className="text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wider">Locked</span>
          <div className="grid grid-cols-3 gap-2.5 mt-3">
            {Array.from({ length: Math.min(6, lockedCount) }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center p-3 rounded-[16px] bg-[#F8F9FA] opacity-50"
              >
                <Lock className="w-6 h-6 text-[#C7C7CC]" />
                <span className="text-[9px] font-bold text-[#C7C7CC] mt-1.5 text-center">
                  ???
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  AVATAR PICKER MODAL                                           */
/* ═══════════════════════════════════════════════════════════════ */

function AvatarPickerModal({
  currentAvatarId,
  onClose,
}: {
  currentAvatarId: string;
  onClose: () => void;
}) {
  const update = useUpdateProfile();
  const avatars = [
    { id: "avatar-1", emoji: "😊", label: "Smile" },
    { id: "avatar-2", emoji: "😎", label: "Cool" },
    { id: "avatar-3", emoji: "🤓", label: "Nerd" },
    { id: "avatar-4", emoji: "🦊", label: "Fox" },
    { id: "avatar-5", emoji: "🐱", label: "Cat" },
    { id: "avatar-6", emoji: "🐺", label: "Wolf" },
    { id: "avatar-7", emoji: "🐉", label: "Dragon" },
    { id: "avatar-8", emoji: "🦄", label: "Unicorn" },
    { id: "avatar-9", emoji: "🤖", label: "Robot" },
    { id: "avatar-10", emoji: "👻", label: "Ghost" },
  ];

  const handleSelect = async (avatarId: string) => {
    await update.mutateAsync({ avatarId });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-end justify-center bg-black/30"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-[24px] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-bold text-[#1C1C1E]">Choose Avatar</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center">
            <X className="w-4 h-4 text-[#636366]" />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {avatars.map((avatar) => (
            <motion.button
              key={avatar.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSelect(avatar.id)}
              disabled={update.isPending}
              className={cn(
                "aspect-square rounded-[14px] flex items-center justify-center text-[24px] transition-all",
                currentAvatarId === avatar.id ? "ring-2 ring-[#5E5CE6]" : ""
              )}
              style={{
                background: currentAvatarId === avatar.id ? "#EDEDFC" : "#F8F9FA",
              }}
            >
              {avatar.emoji}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  SKELETON LOADING STATE                                        */
/* ═══════════════════════════════════════════════════════════════ */

function ProfileSkeleton() {
  return (
    <AppShell>
      <div className="bg-[#F2F2F7]">
        {/* Hero skeleton */}
        <div className="bg-white pt-12 pb-6">
          <div className="flex flex-col items-center">
            <div className="w-[120px] h-[120px] rounded-full bg-[#F2F2F7] animate-pulse" />
            <div className="w-32 h-5 bg-[#F2F2F7] rounded-full animate-pulse mt-4" />
            <div className="w-20 h-3 bg-[#F2F2F7] rounded-full animate-pulse mt-2" />
            <div className="w-48 h-3 bg-[#F2F2F7] rounded-full animate-pulse mt-3" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="px-5 mt-4">
          <div className="grid grid-cols-4 gap-2 rounded-[20px] bg-white p-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-[#F2F2F7] animate-pulse" />
                <div className="w-12 h-3 bg-[#F2F2F7] rounded-full animate-pulse" />
                <div className="w-8 h-2 bg-[#F2F2F7] rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Card skeletons */}
        <div className="px-5 mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 rounded-[20px] bg-white animate-pulse" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
