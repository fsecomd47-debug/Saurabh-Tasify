"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Flame, TrendingUp, Shield } from "lucide-react";
import { useSnapshot } from "@/hooks/queries";
import { getLevelFromXP } from "@/lib/economy/xp-engine";
import { getStreakStatus } from "@/lib/economy/streak-engine";
import { formatCurrency } from "@/lib/format";
import { useRouter } from "next/navigation";

function TokenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tokenGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <circle cx="10" cy="10" r="9" fill="url(#tokenGold)" stroke="#B45309" strokeWidth="1" />
      <circle cx="10" cy="10" r="6.5" stroke="#FEF3C7" strokeWidth="0.8" opacity="0.6" />
      <text x="10" y="14" textAnchor="middle" fill="#92400E" fontWeight="800" fontSize="10" fontFamily="system-ui">S</text>
    </svg>
  );
}

function SegmentedBar({ progress, color, segments = 8 }: { progress: number; color: string; segments?: number }) {
  const filled = Math.round((progress / 100) * segments);
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-full rounded-[3px] relative overflow-hidden"
          style={{
            background: i < filled ? color : "#E5E7EB",
            boxShadow: i < filled ? `inset 0 1px 0 rgba(255,255,255,0.3), 0 0 6px ${color}40` : "inset 0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          {i < filled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, delay: i * 0.05, repeat: Infinity, repeatDelay: 3 }}
              className="absolute inset-0"
              style={{ background: `linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)` }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export const WealthCard: React.FC = () => {
  const router = useRouter();
  const { data: snap } = useSnapshot();
  const [displayBalance, setDisplayBalance] = useState(0);
  const [showGlow, setShowGlow] = useState(false);
  const [showSpark, setShowSpark] = useState(false);
  const prevBalanceRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const balance = snap?.wallet.balance ?? 0;
  const totalXP = snap?.progress.xpTotal ?? 0;
  const currentStreak = snap?.streak.current ?? 0;
  const shields = snap?.streak.shields ?? 0;
  const displayName = snap?.profile.displayName ?? "";
  const avatarEmoji = snap?.profile.avatarEmoji ?? "👤";
  const earnedToday = snap?.transactions
    .filter((t) => t.amount > 0 && new Date(t.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + t.amount, 0) ?? 0;

  const { level, progress, currentXP, requiredXP } = getLevelFromXP(totalXP);
  const streakStatus = getStreakStatus(currentStreak);

  useEffect(() => {
    if (balance === prevBalanceRef.current || prevBalanceRef.current === 0) {
      setDisplayBalance(balance);
      prevBalanceRef.current = balance;
      return;
    }
    const start = prevBalanceRef.current;
    const end = balance;
    const diff = end - start;
    const startTime = Date.now();

    setShowGlow(true);
    setShowSpark(true);
    setTimeout(() => setShowGlow(false), 2000);
    setTimeout(() => setShowSpark(false), 1200);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const prog = Math.min((Date.now() - startTime) / 1500, 1);
      const eased = 1 - Math.pow(1 - prog, 3);
      setDisplayBalance(Math.round(start + diff * eased));
      if (prog >= 1 && intervalRef.current) {
        clearInterval(intervalRef.current);
        setDisplayBalance(end);
      }
    }, 16);

    prevBalanceRef.current = balance;
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [balance]);

  const actions = [
    { icon: TrendingUp, label: "Earn", onClick: () => router.push("/tasks") },
    { icon: Shield, label: "Vault", onClick: () => router.push("/vault") },
    { icon: Flame, label: "Ranks", onClick: () => router.push("/leaderboard") },
  ];

  return (
    <div className="px-5 mt-3">
      <div
        className="relative w-full rounded-[20px] overflow-hidden select-none bg-white"
        style={{
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.04)",
        }}
      >
        <AnimatePresence>
          {showGlow && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 30%, rgba(245,158,11,0.18) 0%, rgba(52,199,89,0.08) 40%, transparent 70%)" }} />
          )}
        </AnimatePresence>

        <div className="relative z-10 px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-[18px] bg-slate-50">{avatarEmoji}</div>
              <div>
                <p className="text-[15px] font-bold text-[#1C1C1E] truncate max-w-[150px]">{displayName}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-[#8E8E93]">Level {level}</span>
                  <span className="text-[10px] text-[#AEAEB2]">·</span>
                  <span className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: streakStatus.color }}>
                    <Flame className="w-3 h-3" strokeWidth={2.5} /> {streakStatus.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Segmented XP bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-[#8E8E93] tabular-nums">{currentXP} / {requiredXP} XP</span>
              <span className="text-[10px] font-semibold text-[#8E8E93]">Level {level + 1}</span>
            </div>
            <div className="w-full h-2.5 rounded-[5px] overflow-hidden" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)" }}>
              <SegmentedBar progress={progress * 100} color="#34C759" segments={10} />
            </div>
          </div>

          {/* Balance with token icon */}
          <div className="flex items-center gap-2.5">
            <TokenIcon className="w-9 h-9 flex-shrink-0" />
            <div>
              <motion.p
                className="text-[34px] font-extrabold tracking-tight leading-none tabular-nums"
                style={{
                  letterSpacing: "-0.03em",
                  background: "linear-gradient(135deg, #F59E0B 0%, #FCD34D 40%, #F59E0B 70%, #D97706 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "none",
                  filter: "drop-shadow(0 0 8px rgba(245,158,11,0.3))",
                }}
                animate={showSpark ? { scale: [1, 1.04, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {formatCurrency(displayBalance)}
              </motion.p>
            </div>
          </div>
          <p className="text-[12px] text-[#8E8E93] font-medium mt-1 ml-[46px]">$ST · Saurabh Tokens</p>

          <div className="flex items-center gap-2 mt-3 flex-wrap ml-[46px]">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F2F2F7]">
              <Flame className="w-3.5 h-3.5" style={{ color: streakStatus.color }} strokeWidth={2.5} />
              <span className="text-[11px] font-semibold text-[#1C1C1E]">{currentStreak}-Day Streak</span>
            </div>
            {earnedToday > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D1FAE5]">
                <TrendingUp className="w-3.5 h-3.5 text-[#059669]" strokeWidth={2.5} />
                <span className="text-[11px] font-bold text-[#059669]">+{formatCurrency(earnedToday)} today</span>
              </div>
            )}
            {shields > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#DBEAFE]">
                <Shield className="w-3.5 h-3.5 text-[#2563EB]" strokeWidth={2.5} />
                <span className="text-[11px] font-bold text-[#2563EB]">{shields} shield{shields > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom action dock */}
        <div className="border-t border-[rgba(0,0,0,0.04)] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {actions.map((action) => (
              <motion.button key={action.label} whileTap={{ scale: 0.9 }} onClick={action.onClick} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: "linear-gradient(145deg, #EDE9FE, #DDD6FE)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.06)" }}>
                  <action.icon className="w-5 h-5 text-[#5E5CE6]" strokeWidth={2.4} />
                </div>
                <span className="text-[10px] font-semibold text-[#8E8E93]">{action.label}</span>
              </motion.button>
            ))}
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push("/profile")} className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: "linear-gradient(145deg, #6366F1, #5E5CE6)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 6px rgba(94,92,230,0.3)" }}>
              <ChevronRight className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-semibold text-[#8E8E93]">Profile</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
