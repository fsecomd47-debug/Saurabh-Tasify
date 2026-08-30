"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

type QuestComboToastProps = {
  questTitle: string;
  questEmoji: string;
  objectiveLabel: string;
  current: number;
  target: number;
  questComplete?: boolean;
};

export const QuestComboToast: React.FC<QuestComboToastProps> = ({
  questTitle,
  questEmoji,
  objectiveLabel,
  current,
  target,
  questComplete,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), questComplete ? 4000 : 2500);
    return () => clearTimeout(timer);
  }, [questComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -20, x: "-50%" }}
          transition={{ type: "spring", damping: 18, stiffness: 260 }}
          className="fixed top-12 left-1/2 z-[200] pointer-events-none"
        >
          <div
            className="rounded-[16px] px-4 py-3 flex items-center gap-3 min-w-[220px]"
            style={{
              background: questComplete
                ? "linear-gradient(135deg, #5E5CE6, #4A48C9)"
                : "linear-gradient(135deg, #1C1C1E, #2C2C2E)",
              boxShadow: questComplete
                ? "0 8px 32px rgba(94,92,230,.4), 0 0 0 1px rgba(255,255,255,.1) inset"
                : "0 8px 32px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08) inset",
            }}
          >
            {/* Quest emoji */}
            <motion.span
              className="text-[20px]"
              animate={questComplete ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] } : { scale: [1, 1.15, 1] }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {questEmoji}
            </motion.span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-[#FFD700]" fill="#FFD700" />
                <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
                  Quest Progress
                </span>
              </div>
              <p className="text-[13px] font-bold text-white truncate mt-0.5">
                {questTitle}
              </p>
              <p className="text-[10px] text-white/60 mt-0.5">
                {questComplete ? (
                  <span className="text-[#FFD700] font-bold">ALL OBJECTIVES COMPLETE!</span>
                ) : (
                  <>
                    {objectiveLabel} — <span className="text-white font-bold">{current}/{target}</span>
                  </>
                )}
              </p>
            </div>

            {/* Pulse ring for quest complete */}
            {questComplete && (
              <motion.div
                className="absolute inset-0 rounded-[16px] border-2 border-[#FFD700]/40"
                animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
