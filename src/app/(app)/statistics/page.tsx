"use client";

import React from "react";
import { motion } from "framer-motion";
import { Flame, Target, Coins, ShoppingBag, TrendingUp, Award, Zap, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useSnapshot, useLeaderboard } from "@/hooks/queries";
import { getStreakStatus } from "@/lib/economy/streak-engine";
import { formatCurrency } from "@/lib/format";

export default function StatisticsPage() {
  const { data: snap } = useSnapshot();
  const { data: lb } = useLeaderboard();

  if (!snap) {
    return (
      <AppShell>
        <TopBar title="Player Progress" subtitle="Loading…" />
        <div className="px-6 mt-4 space-y-2.5">
          {[0, 1].map((i) => <div key={i} className="h-24 rounded-3xl bg-white animate-pulse" />)}
        </div>
      </AppShell>
    );
  }

  const streakStatus = getStreakStatus(snap.streak.current);
  const rank = lb?.me.rank;

  const stats = [
    { icon: Target, label: "Missions Done", value: String(snap.progress.tasksCompleted), color: "#6B38C3" },
    { icon: Coins, label: "Lifetime Earned", value: formatCurrency(snap.wallet.lifetimeEarned), color: "#10B981" },
    { icon: Flame, label: "Best Streak", value: `${snap.streak.best}d`, color: "#EF4444" },
    { icon: TrendingUp, label: "Global Rank", value: rank ? `#${rank}` : "—", color: "#F59E0B" },
    { icon: Zap, label: "Total XP", value: snap.progress.xpTotal.toLocaleString(), color: "#8B5CF6" },
    { icon: ShoppingBag, label: "Items Owned", value: String(snap.inventory.length), color: "#06B6D4" },
  ];

  const unlocked = snap.achievements.filter((a) => a.unlockedAt);
  const locked = snap.achievements.filter((a) => !a.unlockedAt);

  return (
    <AppShell>
      <TopBar title="Player Progress" subtitle={`${snap.profile.displayName} · Level ${snap.progress.level}`} />

      {/* Streak status card */}
      <div className="px-6 mt-2">
        <div className="rounded-3xl p-4 flex items-center gap-4" style={{ background: "#fff", boxShadow: "0 8px 24px -4px rgba(0,0,0,.06)", border: "1px solid rgba(0,0,0,.04)" }}>
          <span className="text-[30px]">{streakStatus.icon}</span>
          <div className="flex-1">
            <p className="text-[14px] font-extrabold font-display" style={{ color: streakStatus.color }}>{streakStatus.label}</p>
            <p className="text-[11px] text-slate-400 font-ui">{snap.streak.current}-day streak · best {snap.streak.best}{snap.streak.shields > 0 ? ` · ${snap.streak.shields} shield${snap.streak.shields > 1 ? "s" : ""} armed` : ""}</p>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="px-6 mt-4 grid grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-2xl p-3 bg-white" style={{ boxShadow: "0 6px 18px -4px rgba(0,0,0,.05)" }}>
            <s.icon className="w-4 h-4 mb-1.5" style={{ color: s.color }} strokeWidth={2.2} />
            <p className="text-[15px] font-extrabold text-slate-900 font-display tabular-nums truncate">{s.value}</p>
            <p className="text-[9px] font-bold text-slate-400 font-ui mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Achievements */}
      <div className="px-6 mt-5 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-vault-primary" />
          <h2 className="text-[14px] font-extrabold text-slate-900 font-display">Achievements</h2>
          <span className="ml-auto text-[11px] font-bold text-slate-400 font-ui tabular-nums">{unlocked.length}/{snap.achievements.length}</span>
        </div>

        <div className="space-y-2">
          {snap.achievements.length === 0 && (
            <div className="text-center py-6">
              <p className="text-[12px] text-slate-400 font-ui">Complete missions to unlock achievements.</p>
            </div>
          )}
          {[...unlocked, ...locked].map((a) => (
            <div key={a.id} className="bg-white rounded-2xl p-3.5 flex items-center gap-3" style={{ boxShadow: "0 6px 18px -4px rgba(0,0,0,.05)", border: a.unlockedAt ? "1px solid rgba(234,179,8,.35)" : "1px solid rgba(0,0,0,.04)", opacity: a.unlockedAt ? 1 : 0.75 }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: a.unlockedAt ? "rgba(234,179,8,.12)" : "rgba(0,0,0,.03)" }}>
                {a.unlockedAt ? a.emoji : "🔒"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[12.5px] font-bold text-slate-900 font-display truncate">{a.name}</p>
                  {a.unlockedAt && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" strokeWidth={2.4} />}
                </div>
                {!a.unlockedAt && (
                  <>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${a.progressPct}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#6B38C3,#8A4FFF)" }} />
                    </div>
                    <p className="text-[9.5px] text-slate-400 font-ui mt-1">{a.description}</p>
                  </>
                )}
                {a.unlockedAt && <p className="text-[9.5px] text-slate-400 font-ui">{a.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
