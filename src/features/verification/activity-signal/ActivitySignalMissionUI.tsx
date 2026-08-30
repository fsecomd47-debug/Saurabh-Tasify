"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import type { MissionDTO } from "@/server/services/mission-service";

type Props = {
  mission: MissionDTO;
  onComplete: (result: { duration?: number; confidence: number; metadata?: Record<string, unknown> }) => void;
  onCancel: () => void;
};

function parseDistance(title: string): { target: number; unit: string } | null {
  const match = title.match(/(\d+(?:\.\d+)?)\s*(mi|mile|miles|km|kilometer|kilometers|km|meter|m|ft|feet|yard|yd)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("mi")) return { target: value, unit: "miles" };
  if (unit.startsWith("km") || unit.startsWith("kil")) return { target: value, unit: "km" };
  if (unit.startsWith("m") && !unit.startsWith("mi")) return { target: value, unit: "m" };
  if (unit.startsWith("ft") || unit.startsWith("feet")) return { target: value, unit: "ft" };
  if (unit.startsWith("yd") || unit.startsWith("yard")) return { target: value, unit: "yards" };
  return { target: value, unit };
}

function parseSteps(title: string): number | null {
  const match = title.match(/(\d[\d,]*)\s*(step|steps)/i);
  if (!match) return null;
  return parseInt(match[1].replace(/,/g, ""), 10);
}

export function ActivitySignalMissionUI({ mission, onComplete, onCancel }: Props) {
  const [state, setState] = useState<"idle" | "input" | "submitting" | "done">("idle");
  const [actualDistance, setActualDistance] = useState("");
  const [error, setError] = useState("");

  const distance = parseDistance(mission.taskTitle);
  const steps = parseSteps(mission.taskTitle);
  const target = distance ? distance.target : steps ? steps : 0;
  const unit = distance ? distance.unit : steps ? "steps" : "units";

  function handleComplete() {
    const value = parseFloat(actualDistance);
    if (isNaN(value) || value <= 0) {
      setError("Please enter a valid number");
      return;
    }
    setError("");
    setState("submitting");

    let confidence = 0.7;
    if (target > 0) {
      const ratio = value / target;
      if (ratio >= 0.95 && ratio <= 1.05) {
        confidence = 0.95;
      } else if (ratio >= 0.8 && ratio <= 1.2) {
        confidence = 0.85;
      } else if (ratio >= 0.5 && ratio <= 1.5) {
        confidence = 0.7;
      } else {
        confidence = 0.5;
      }
    }

    setTimeout(() => {
      onComplete({
        confidence,
        metadata: {
          actualDistance: value,
          targetDistance: target,
          unit,
          activityType: steps ? "steps" : "distance",
        },
      });
      setState("done");
    }, 600);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      className="bg-white rounded-[24px] p-7 overflow-hidden"
      style={{
        boxShadow: "0 2px 4px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div className="text-center mb-7">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: "linear-gradient(145deg, #E8FAF0 0%, #D4F5DE 100%)",
            boxShadow: "0 4px 16px rgba(52,199,89,0.15), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <MapPin className="w-9 h-9 text-[#34C759]" strokeWidth={1.8} />
        </motion.div>
        <h3 className="text-[20px] font-bold text-[#1C1C1E] mb-1" style={{ letterSpacing: "-0.02em" }}>
          {steps ? "STEP TRACKER" : "DISTANCE TRACKER"}
        </h3>
        <p className="text-[14px] text-[#8E8E93]">
          Complete your {steps ? "step" : "distance"} goal, then enter what you actually did
        </p>
      </div>

      {/* Mission Info */}
      <div
        className="rounded-[18px] p-5 mb-6"
        style={{
          background: "linear-gradient(145deg, #F9F9FB 0%, #F2F2F7 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-semibold tracking-wider text-[#8E8E93]">TASK</span>
          <span className="text-[14px] font-semibold text-[#1C1C1E]">{mission.taskTitle}</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-semibold tracking-wider text-[#8E8E93]">TARGET</span>
          <span className="text-[14px] font-semibold text-[#1C1C1E]">{target} {unit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-semibold tracking-wider text-[#8E8E93]">DIFFICULTY</span>
          <span className="text-[14px] font-semibold text-[#1C1C1E] capitalize">{mission.difficulty}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setState("input")}
              className="w-full h-[56px] rounded-[16px] text-white text-[16px] font-semibold flex items-center justify-center gap-2 mb-3"
              style={{
                background: "linear-gradient(145deg, #34C759 0%, #2DB84E 100%)",
                boxShadow: "0 4px 16px rgba(52,199,89,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              I Did It — Enter Distance
              <ChevronRight className="w-4.5 h-4.5" />
            </motion.button>
            <button
              onClick={onCancel}
              className="w-full h-[52px] rounded-[14px] bg-[#F2F2F7] text-[#636366] font-semibold text-[15px]"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.04)" }}
            >
              Cancel
            </button>
          </motion.div>
        )}

        {state === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <label className="block text-[11px] font-semibold tracking-[0.1em] text-[#8E8E93] mb-2">
              ACTUAL {steps ? "STEPS" : "DISTANCE"} ({unit.toUpperCase()})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={actualDistance}
              onChange={(e) => { setActualDistance(e.target.value); setError(""); }}
              placeholder={`e.g., ${target}`}
              className="w-full h-[56px] rounded-[14px] bg-[#F9F9FB] border border-[#E5E5EA] px-4 text-[18px] font-semibold text-[#1C1C1E] placeholder:text-[#C7C7CC] focus:outline-none focus:border-[#34C759] focus:ring-2 focus:ring-[#34C759]/20 transition-all mb-2"
            />
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13px] text-[#FF3B30] mb-3"
              >
                {error}
              </motion.p>
            )}
            <div
              className="rounded-[14px] p-4 mb-5 flex items-start gap-3"
              style={{
                background: "linear-gradient(145deg, #FFF8EB 0%, #FFF3D6 100%)",
                border: "1px solid #FDE68A",
              }}
            >
              <AlertTriangle className="w-4.5 h-4.5 text-[#FF9500] mt-0.5 flex-shrink-0" />
              <p className="text-[13px] text-[#636366] leading-relaxed">
                Accuracy matters. Confidence drops if your actual distance is far from the target.
                Staying within 5% gives maximum confidence.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleComplete}
              disabled={!actualDistance}
              className="w-full h-[56px] rounded-[16px] text-white text-[16px] font-semibold mb-3 disabled:opacity-40"
              style={{
                background: "linear-gradient(145deg, #34C759 0%, #2DB84E 100%)",
                boxShadow: "0 4px 16px rgba(52,199,89,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              Submit Distance
            </motion.button>
            <button
              onClick={() => setState("idle")}
              className="w-full h-[52px] rounded-[14px] bg-[#F2F2F7] text-[#636366] font-semibold text-[15px]"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 1px 3px rgba(0,0,0,0.04)" }}
            >
              Back
            </button>
          </motion.div>
        )}

        {state === "submitting" && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="w-12 h-12 border-[3px] border-[#34C759] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[15px] font-medium text-[#8E8E93]">Verifying your activity…</p>
          </motion.div>
        )}

        {state === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
          >
            <CheckCircle2 className="w-14 h-14 text-[#34C759] mx-auto mb-3" />
            <p className="text-[18px] font-bold text-[#1C1C1E]">Submitted!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
