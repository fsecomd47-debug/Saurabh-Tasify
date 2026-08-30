"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Globe, Calendar, ChevronDown, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { ClientPortal } from "@/components/layout/ClientPortal";
import {
  LeaderboardRow,
  LeaderboardPodium,
  YourRankCard,
  RivalCard,
  LeaderboardEmpty,
} from "@/components/leaderboard/LeaderboardRow";
import { useLeaderboard, useLeaderboardSearch, usePlayerDetail } from "@/hooks/queries";
import type { LeaderboardMode, LeaderboardRow as LeaderboardRowType } from "@/types/api";
import { cn } from "@/lib/utils";

export default function LeaderboardPage() {
  const [mode, setMode] = useState<LeaderboardMode>("global");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data, isLoading } = useLeaderboard(mode);
  const { data: searchData } = useLeaderboardSearch(searchQuery);
  const { data: playerDetail } = usePlayerDetail(selectedUserId);

  const handleTapUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  const rows = data?.rows ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const me = data?.me;
  const neighbors = data?.neighbors ?? [];
  const totalPlayers = data?.totalPlayers ?? 0;
  const searchResults = searchData?.rows ?? [];

  // Find nearest rival (first neighbor that is ahead of me)
  const nearestRival = neighbors.find(
    (n) => me && n.rank < me.rank
  );

  return (
    <AppShell>
      <TopBar
        title="Leaderboard"
        subtitle={me ? `You're #${me.rank ?? "—"}` : undefined}
        rightAction={
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-600"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}
            aria-label="Search"
          >
            {showSearch ? <X className="w-[18px] h-[18px]" /> : <Search className="w-[18px] h-[18px]" />}
          </button>
        }
      />

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white text-[13px] font-ui text-slate-900 placeholder:text-slate-400 outline-none"
                  style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,.06)", border: "1px solid rgba(0,0,0,.04)" }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode tabs */}
      <div className="px-5 mt-1 mb-1">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80">
          {(["global", "weekly"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMode(tab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-bold font-display transition-all",
                mode === tab
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              )}
            >
              {tab === "global" ? (
                <Globe className="w-3.5 h-3.5" />
              ) : (
                <Calendar className="w-3.5 h-3.5" />
              )}
              {tab === "global" ? "All Time" : "This Week"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="px-5 mt-4 space-y-2.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white animate-pulse" />
          ))}
        </div>
      )}

      {/* Search results */}
      {showSearch && searchQuery.trim().length >= 2 && !isLoading && (
        <div className="px-5 mt-2 space-y-2">
          {searchResults.length === 0 ? (
            <p className="text-center text-[12px] text-slate-400 font-ui py-6">
              No players found for "{searchQuery}"
            </p>
          ) : (
            searchResults.map((row, i) => (
              <LeaderboardRow
                key={row.userId}
                row={row}
                delay={i * 0.03}
                onTap={handleTapUser}
              />
            ))
          )}
        </div>
      )}

      {/* Main leaderboard */}
      {!showSearch && !isLoading && (
        <div className="pb-6">
          {/* Your rank */}
          {me && (
            <YourRankCard
              me={me}
              totalPlayers={totalPlayers}
              mode={mode}
              onTap={handleTapUser}
            />
          )}

          {/* Podium */}
          {podium.length >= 1 && (
            <LeaderboardPodium top3={podium} onTap={handleTapUser} />
          )}

          {/* Rival card */}
          {nearestRival && me && (
            <RivalCard
              rival={nearestRival}
              meRank={me.rank}
              mode={mode}
              onTap={handleTapUser}
            />
          )}

          {/* Rest of ranks */}
          {rest.length > 0 && (
            <div className="px-5 mt-4 space-y-2">
              {rest.map((row, i) => (
                <LeaderboardRow
                  key={row.userId}
                  row={row}
                  delay={0.05 * i}
                  onTap={handleTapUser}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {rows.length === 0 && <LeaderboardEmpty />}

          {/* Divider */}
          {rows.length > 0 && (
            <div className="px-5 mt-4">
              <div className="h-px bg-slate-100" />
              <p className="text-center text-[10px] text-slate-400 font-ui mt-2">
                {totalPlayers} players · {mode === "weekly" ? "Week resets Monday" : "Ranked by total assets"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Player detail overlay — portaled to device screen to stay inside shell */}
      <ClientPortal>
        <AnimatePresence>
          {selectedUserId && playerDetail && (
            <PlayerDetailOverlay
              detail={playerDetail}
              onClose={handleCloseDetail}
            />
          )}
        </AnimatePresence>
      </ClientPortal>
    </AppShell>
  );
}

/* ─────────── Player Detail Overlay ─────────── */

type PlayerDetailProps = {
  detail: {
    userId: string;
    displayName: string;
    avatarEmoji: string;
    level: number;
    xp: number;
    balance: number;
    totalAssets: number;
    weeklyEarned: number;
    streak: number;
    tier: string;
    rank: number;
    weeklyRank: number;
    tasksCompleted: number;
    joinedAt: string;
  };
  onClose: () => void;
};

function PlayerDetailOverlay({ detail, onClose }: PlayerDetailProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[85] flex items-end justify-center"
      onClick={onClose}
    >
      {/* Backdrop — frosted acrylic */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 400 }}
        className="relative w-full bg-white rounded-t-3xl px-5 pt-3 pb-8 max-h-[85%] overflow-y-auto"
        style={{
          boxShadow: "0 -8px 32px -4px rgba(0,0,0,.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
            style={{
              background: "linear-gradient(135deg,#6B38C3,#8A4FFF)",
              boxShadow: "0 8px 24px -4px rgba(107,56,195,.4)",
            }}
          >
            {detail.avatarEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[18px] font-extrabold text-slate-900 font-display truncate">
              {detail.displayName}
            </p>
            <p className="text-[12px] font-bold text-slate-500 font-ui">
              {detail.tier} · LVL {detail.level}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <StatBox label="Global Rank" value={`#${detail.rank}`} color="#5E5CE6" />
          <StatBox label="Weekly Rank" value={`#${detail.weeklyRank}`} color="#FF9500" />
          <StatBox label="Tasks Done" value={detail.tasksCompleted} color="#34C759" />
          <StatBox label="Balance" value={`${detail.balance} ST`} color="#5E5CE6" />
          <StatBox label="Weekly Earned" value={`${detail.weeklyEarned} ST`} color="#FF9500" />
          <StatBox label="Streak" value={`${detail.streak} days`} color="#FF3B30" />
        </div>

        {/* Close — above iOS home indicator */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-100 text-[13px] font-bold text-slate-700 font-display"
        >
          Close
        </button>
        <div className="h-4" />
      </motion.div>
    </motion.div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{ background: `${color}08`, border: `1px solid ${color}15` }}
    >
      <p className="text-[16px] font-extrabold font-display tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="text-[9px] font-bold text-slate-500 font-ui mt-0.5">{label}</p>
    </div>
  );
}
