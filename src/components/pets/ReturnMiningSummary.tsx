"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pickaxe, Sparkles, X } from "lucide-react";
import { useMiningStatus, useSettleMining } from "@/hooks/queries";
import { usePetStore } from "@/store/pet-store";
import { formatCurrency } from "@/lib/format";

export function ReturnMiningSummary() {
  const { data: mining } = useMiningStatus();
  const settleMining = useSettleMining();
  const { lastReturnSummaryShown, setLastReturnSummaryShown } = usePetStore();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [claimError, setClaimError] = useState(false);

  useEffect(() => {
    if (!mining?.returnSummary || dismissed) return;
    const lastShown = lastReturnSummaryShown ? new Date(lastReturnSummaryShown).getTime() : 0;
    const sessionStart = mining.sessionStartedAt ? new Date(mining.sessionStartedAt).getTime() : 0;
    if (sessionStart > lastShown && mining.returnSummary.stMined > 0) {
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, [mining?.returnSummary, lastReturnSummaryShown, dismissed, mining?.sessionStartedAt]);

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    setLastReturnSummaryShown(new Date().toISOString());
  };

  const handleClaim = async () => {
    setClaimError(false);
    try {
      await settleMining.mutateAsync();
      handleDismiss();
    } catch {
      setClaimError(true);
    }
  };

  const summary = mining?.returnSummary;
  if (!summary || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-6"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm bg-white rounded-[24px] overflow-hidden"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        >
          {/* Header glow */}
          <div className="relative px-6 pt-6 pb-4 text-center">
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(circle at 50% 30%, #F59E0B18 0%, transparent 60%)" }} />

            <button onClick={handleDismiss}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center z-10"
              aria-label="Close">
              <X className="w-3.5 h-3.5 text-[#636366]" />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-[#FFF8EB] flex items-center justify-center mx-auto mb-3"
            >
              <span className="text-3xl">{mining?.petEmoji}</span>
            </motion.div>

            <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">While you were away</p>
            <h2 className="text-[20px] font-bold text-[#1C1C1E] mt-1">Your pet was working!</h2>
          </div>

          {/* Stats */}
          <div className="px-6 space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-[14px] bg-[#FFF8EB]">
              <div className="flex items-center gap-2">
                <Pickaxe className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-[12px] font-semibold text-[#636366]">ST Mined</span>
              </div>
              <span className="text-[15px] font-bold text-[#F59E0B] tabular-nums">+{formatCurrency(summary.stMined)}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-[14px] bg-[#EDEDFC]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5E5CE6]" />
                <span className="text-[12px] font-semibold text-[#636366]">Pet XP</span>
              </div>
              <span className="text-[15px] font-bold text-[#5E5CE6] tabular-nums">+{summary.petXpGained}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#8E8E93] px-1 pt-1">
              <span>Mining duration: {summary.elapsed}</span>
              <span>Pet Level {summary.petLevel}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-5 space-y-2">
            {claimError && (
              <p className="text-[11px] text-[#FF3B30] text-center mb-1">
                Couldn&apos;t claim mining rewards. Your ST is safe — try again.
              </p>
            )}
            <button onClick={handleClaim}
              className="w-full py-3 rounded-full bg-[#5E5CE6] text-[13px] font-bold text-white active:scale-[0.98] transition-transform"
              style={{ boxShadow: "0 4px 16px rgba(94,92,230,0.3)" }}>
              CLAIM {formatCurrency(summary.stMined)} ST
            </button>
            <button onClick={handleDismiss}
              className="w-full py-2.5 rounded-full bg-[#F2F2F7] text-[12px] font-semibold text-[#636366]">
              Dismiss
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
