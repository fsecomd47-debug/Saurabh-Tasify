"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import {
  ArrowRight, Check, Trophy, Target, Star,
  Rocket, Gem, Swords, Crown, Zap, Flame, Shield, Lock, Unlock,
} from "lucide-react";
import { useGuestStore, type GuestPlaystyle } from "@/store/guest-store";

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════════════════════════ */
const HF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
const BF = '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
const BG = "#F2F2F7";
const P = "#5E5CE6";
const TX = "#1C1C1E";
const TM = "#8E8E93";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "rgba(0,0,0,0.06)";
const SHADOW = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)";
const SHADOW_SEL = "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)";

/* Standard pill button style — used in ALL scenes */
const BTN: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
  width: "100%", maxWidth: 320, height: 52, borderRadius: 9999,
  background: "#1D1D1F", color: "#FFFFFF", fontSize: 16, fontWeight: 600, fontFamily: HF,
  boxShadow: "0 4px 14px rgba(0,0,0,0.12)", border: "none", cursor: "pointer",
};
const BTN_DISABLED: React.CSSProperties = { ...BTN, opacity: 0.35, cursor: "not-allowed", boxShadow: "none" };

/* ═══════════════════════════════════════════════════════════════
   ANIMATION PRESETS
   ═══════════════════════════════════════════════════════════════ */
const SC = {
  initial: { opacity: 0, y: 40, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -30, scale: 0.97, transition: { duration: 0.3 } },
};
const UP = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
const ST = { animate: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } };
const CD = {
  initial: { opacity: 0, y: 14, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 26 } },
};

/* ═══════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/** Subtle ambient glow — clipped to not overflow device frame */
function Ambient({ k = 1 }: { k?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div className="absolute rounded-full" style={{
        width: 300 * k, height: 300 * k, top: "-8%", right: "-12%",
        background: `radial-gradient(circle, rgba(94,92,230,${0.07 * k}) 0%, transparent 70%)`,
        filter: "blur(50px)",
      }} />
      <div className="absolute rounded-full" style={{
        width: 260 * k, height: 260 * k, bottom: "-6%", left: "-10%",
        background: `radial-gradient(circle, rgba(94,92,230,${0.05 * k}) 0%, transparent 70%)`,
        filter: "blur(45px)",
      }} />
    </div>
  );
}

/** Premium progress timeline — connected line with glowing active dot */
function PD({ step, total }: { step: number; total: number }) {
  const pct = total <= 1 ? 0 : (step / (total - 1)) * 100;
  return (
    <div className="relative" style={{ width: 220, height: 28 }}>
      {/* Track line */}
      <div className="absolute rounded-full" style={{
        left: 8, right: 8, top: "50%", height: 2, transform: "translateY(-50%)",
        background: "#E5E5EA",
      }} />
      {/* Filled line */}
      <motion.div className="absolute rounded-full" style={{
        left: 8, top: "50%", height: 2, transformOrigin: "left",
        background: `linear-gradient(90deg, ${P}, #7A78FF)`,
      }}
        initial={false}
        animate={{ width: `calc(${pct}% - 16px)` }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      />
      {/* Dots */}
      {Array.from({ length: total }).map((_, i) => {
        const x = total <= 1 ? 50 : (i / (total - 1)) * 100;
        const active = i <= step;
        const current = i === step;
        return (
          <motion.div key={i} className="absolute rounded-full"
            style={{
              left: `${x}%`, top: "50%", transform: "translate(-50%, -50%)",
            }}
            initial={false}
            animate={{
              width: current ? 14 : active ? 10 : 8,
              height: current ? 14 : active ? 10 : 8,
              backgroundColor: active ? P : "#D1D1D6",
              boxShadow: current ? `0 0 14px ${P}50` : "none",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          />
        );
      })}
    </div>
  );
}

/** Goal / selection card */
function GC({ children, sel, onClick, className = "", style = {} }: {
  children: React.ReactNode; sel?: boolean; onClick?: () => void;
  className?: string; style?: React.CSSProperties;
}) {
  return (
    <motion.button variants={CD} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
      onClick={onClick} className={"text-left rounded-2xl transition-all " + className} style={{
        background: sel ? "#EDEDFC" : CARD_BG,
        border: sel ? `1.5px solid ${P}` : `1px solid ${CARD_BORDER}`,
        boxShadow: sel ? SHADOW_SEL : SHADOW,
        ...style,
      }}>
      {children}
    </motion.button>
  );
}

/** Animated number counter */
function AN({ value, delay = 0 }: { value: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const n = ref.current;
    const c = animate(0, value, {
      duration: 0.8, delay, ease: "easeOut",
      onUpdate(v) { if (n) n.textContent = Math.round(v).toLocaleString(); },
    });
    return () => c.stop();
  }, [value, delay]);
  return <span ref={ref}>0</span>;
}

/* ═══════════════════════════════════════════════════════════════
   VaultCrack — press-and-hold vault cracker with released phase
   ═══════════════════════════════════════════════════════════════ */
function VaultCrack({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"idle" | "cracking" | "released" | "cracked">("idle");
  const [hold, setHold] = useState(0);
  const [coins, setCoins] = useState<{ id: number; angle: number; delay: number; emoji: string }[]>([]);
  const holding = useRef(false);
  const raf = useRef<number>(0);
  const lastTime = useRef(0);
  const HOLD_MS = 1800;

  const tick = useCallback((time: number) => {
    if (!holding.current) return;
    if (lastTime.current === 0) lastTime.current = time;
    const delta = time - lastTime.current;
    lastTime.current = time;
    setHold(prev => {
      const next = Math.min(prev + delta / HOLD_MS, 1);
      if (next >= 1) {
        holding.current = false;
        const newCoins = Array.from({ length: 8 }, (_, i) => ({
          id: i, angle: (i / 8) * 360 + Math.random() * 30, delay: Math.random() * 0.15,
          emoji: ["\u{1F4B0}", "\u2B50", "\u{1FA99}", "\u2728", "\u{1F48E}", "\u{1F525}", "\u{1F4B0}", "\u2B50"][i],
        }));
        setCoins(newCoins);
        setPhase("cracked");
        setTimeout(() => onDone(), 2800);
      }
      return next;
    });
    raf.current = requestAnimationFrame(tick);
  }, [onDone]);

  const startHold = useCallback(() => {
    if (phase === "cracked") return;
    setPhase("cracking");
    holding.current = true;
    lastTime.current = 0;
    raf.current = requestAnimationFrame(tick);
  }, [phase, tick]);

  const stopHold = useCallback(() => {
    holding.current = false;
    if (phase === "cracking") {
      setPhase("released");
      setTimeout(() => setPhase("idle"), 1200);
    }
  }, [phase]);

  useEffect(() => () => { holding.current = false; cancelAnimationFrame(raf.current); }, []);

  const circ = 2 * Math.PI * 52;
  const shakeX = phase === "cracking" ? Math.sin(hold * 40) * (2 + hold * 4) : 0;
  const shakeRotate = phase === "cracking" ? Math.sin(hold * 35) * (1 + hold * 2) : 0;

  const getMicrocopy = () => {
    if (hold < 0.25) return "HOLD TO CRACK";
    if (hold < 0.5) return "LET\u2019S DO THIS";
    if (hold < 0.75) return "KEEP GOING";
    if (hold < 0.9) return "ALMOST THERE";
    return "ONE LAST PUSH";
  };
  const microcopy = getMicrocopy();

  return (
    <div className="flex flex-col items-center gap-4 select-none" style={{ userSelect: "none", WebkitUserSelect: "none" }}>
      <div className="relative" style={{ width: 120, height: 120 }}>
        <AnimatePresence>
          {coins.map(c => (
            <motion.div key={c.id}
              initial={{ opacity: 1, scale: 0.5, x: 0, y: 0 }}
              animate={{ opacity: 0, scale: 1.2, x: Math.cos(c.angle * Math.PI / 180) * 90, y: Math.sin(c.angle * Math.PI / 180) * 90 - 20 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, delay: c.delay, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl"
              style={{ zIndex: 20 }}>
              {c.emoji}
            </motion.div>
          ))}
        </AnimatePresence>

        <svg width="120" height="120" viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#E5E5EA" strokeWidth="4" />
          <motion.circle cx="60" cy="60" r="52" fill="none" stroke={P} strokeWidth="4"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - hold) }}
            transition={{ duration: 0.05 }} />
        </svg>

        <motion.div className="absolute inset-0 flex items-center justify-center"
          animate={{ x: shakeX, rotate: shakeRotate }}
          transition={{ duration: 0.05 }}>
          <motion.div className="rounded-full flex items-center justify-center relative overflow-hidden"
            animate={{
              width: phase === "cracked" ? 110 : 100,
              height: phase === "cracked" ? 110 : 100,
              background: phase === "cracked"
                ? "linear-gradient(135deg, #E8FAF0 0%, #D4F5E0 100%)"
                : `linear-gradient(135deg, #2C2C2E ${100 - hold * 30}%, #3A3A3C 100%)`,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              boxShadow: phase === "cracked"
                ? "0 8px 32px rgba(52,199,89,0.25), 0 2px 8px rgba(52,199,89,0.15)"
                : "0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.12)",
            }}>
            <AnimatePresence mode="wait">
              {phase === "cracked" ? (
                <motion.div key="unlock"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                  className="flex items-center justify-center">
                  <Unlock className="w-12 h-12" style={{ color: "#34C759" }} strokeWidth={2} />
                </motion.div>
              ) : (
                <motion.div key="lock"
                  animate={{ scale: phase === "cracking" ? 1 + hold * 0.08 : 1 }}
                  className="flex items-center justify-center">
                  <Lock className="w-10 h-10" style={{ color: hold > 0.5 ? "#FF9500" : "#8E8E93" }} strokeWidth={2} />
                </motion.div>
              )}
            </AnimatePresence>

            {phase === "cracking" && hold > 0.4 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: hold * 0.6 }}
                className="absolute inset-0 pointer-events-none">
                {[0, 60, 120, 180, 240, 300].map(angle => (
                  <div key={angle} className="absolute" style={{
                    top: "50%", left: "50%", width: hold * 30, height: 1.5,
                    background: `rgba(255,149,0,${hold * 0.8})`,
                    transformOrigin: "0 50%",
                    transform: `rotate(${angle}deg) translateX(${20}px)`,
                  }} />
                ))}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-1" style={{ height: 48 }}>
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.p key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ fontSize: 15, fontWeight: 600, color: TX, fontFamily: HF }}>
              Hold to crack
            </motion.p>
          )}
          {phase === "cracking" && (
            <motion.p key="cracking" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ fontSize: 15, fontWeight: 600, color: hold > 0.7 ? "#FF9500" : TX, fontFamily: HF }}>
              {microcopy}
            </motion.p>
          )}
          {phase === "released" && (
            <motion.p key="released" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ fontSize: 15, fontWeight: 600, color: "#FF9500", fontFamily: HF }}>
              Almost. Try again.
            </motion.p>
          )}
          {phase === "cracked" && (
            <motion.div key="cracked" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-0.5">
              <p style={{ fontSize: 17, fontWeight: 800, color: "#34C759", fontFamily: HF }}>VAULT CRACKED</p>
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                style={{ fontSize: 14, color: TM, fontFamily: BF }}>First loot secured</motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {phase !== "cracked" && (
        <motion.div
          onPointerDown={startHold} onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold}
          whileTap={{ scale: 0.95 }}
          className="rounded-full flex items-center justify-center cursor-pointer touch-none"
          style={{
            width: 140, height: 48,
            background: phase === "cracking"
              ? `linear-gradient(90deg, #1D1D1F ${hold * 100}%, #3A3A3C ${hold * 100}%)`
              : "#1D1D1F",
            boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
          }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", fontFamily: HF, letterSpacing: "0.08em" }}>
            {phase === "cracking" ? microcopy : "HOLD TO CRACK"}
          </span>
        </motion.div>
      )}

      {phase === "cracking" && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ fontSize: 12, color: TM, fontFamily: BF, fontVariantNumeric: "tabular-nums" }}>
          {Math.ceil((1 - hold) * (HOLD_MS / 1000))}s remaining
        </motion.p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 1 — HOOK
   ═══════════════════════════════════════════════════════════════ */
function SceneHook({ onNext }: { onNext: () => void }) {
  return (
    <motion.div key="hook" variants={SC} initial="initial" animate="animate" exit="exit"
      className="flex flex-col items-center text-center w-full" style={{ zIndex: 2 }}>
      <Ambient k={0.5} />
      <motion.div variants={ST} initial="initial" animate="animate"
        className="relative flex flex-col items-center w-full" style={{ maxWidth: 320, zIndex: 3 }}>
        <div style={{ fontFamily: HF, fontWeight: 800, fontSize: 28, lineHeight: 1.15, letterSpacing: "-0.03em" }}>
          <motion.span variants={UP} transition={{ delay: 0.15 }} className="block" style={{ color: TX }}>WHAT IF</motion.span>
          <motion.span variants={UP} transition={{ delay: 0.25 }} className="block" style={{ color: TX }}>GETTING THINGS DONE</motion.span>
          <motion.span variants={UP} transition={{ delay: 0.35 }} className="block" style={{ color: TX }}>MADE YOU RICHER?</motion.span>
        </div>
        <motion.p variants={UP} transition={{ delay: 0.55 }}
          style={{ marginTop: 16, fontSize: 15, lineHeight: 1.5, color: TM, maxWidth: 240, fontFamily: BF }}>
          Turn your everyday progress into a game.
        </motion.p>
        <motion.button variants={UP} transition={{ delay: 0.7 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
          onClick={onNext} style={{ ...BTN, marginTop: 32 }}>
          LET&apos;S BUILD
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 2 — IDEA
   ═══════════════════════════════════════════════════════════════ */
function SceneIdea({ onNext }: { onNext: () => void }) {
  const items = [
    { t: "TASK", s: { fontSize: 18, fontWeight: 800, color: TX, fontFamily: HF } },
    { t: "\u2713", s: { fontSize: 28, fontWeight: 800, color: "#34C759", fontFamily: HF } },
    { t: "+100 ST", s: { fontSize: 18, fontWeight: 800, color: "#FF9500", fontFamily: HF } },
    { t: "+50 XP", s: { fontSize: 18, fontWeight: 800, color: P, fontFamily: HF } },
    { t: "LEVEL UP", s: { fontSize: 16, fontWeight: 800, color: TX, fontFamily: HF } },
    { t: "\u2191", s: { fontSize: 24, fontWeight: 800, color: P, fontFamily: HF } },
  ];
  return (
    <motion.div key="idea" variants={SC} initial="initial" animate="animate" exit="exit"
      className="flex flex-col items-center text-center w-full" style={{ zIndex: 2 }}>
      <Ambient k={0.6} />
      <motion.div variants={ST} initial="initial" animate="animate"
        className="relative flex flex-col items-center w-full" style={{ maxWidth: 320, zIndex: 3 }}>
        <motion.p variants={UP} transition={{ delay: 0.08 }}
          style={{ fontFamily: BF, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: TM, textTransform: "uppercase" as const, marginBottom: 20 }}>
          Here&apos;s how it works
        </motion.p>
        <div className="w-full" style={{ maxWidth: 280, background: CARD_BG, borderRadius: 20, padding: "24px 20px", boxShadow: SHADOW_SEL }}>
          <div className="flex flex-col items-center gap-4">
            {items.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.5, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.24, type: "spring", stiffness: 200, damping: 16 }} style={item.s}>
                {item.t}
              </motion.div>
            ))}
          </div>
        </div>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onNext}
          style={{ ...BTN, marginTop: 28 }}>
          TRY IT
          <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 3 — HEIST
   ═══════════════════════════════════════════════════════════════ */
function SceneHeist({ onNext }: { onNext: () => void }) {
  const [done, setDone] = useState(false);
  const complete = useGuestStore(s => s.completeDemoTask);
  const handleDone = useCallback(() => { complete(); setDone(true); }, [complete]);
  return (
    <motion.div key="heist" variants={SC} initial="initial" animate="animate" exit="exit"
      className="flex flex-col items-center text-center w-full" style={{ zIndex: 2 }}>
      <motion.div variants={ST} initial="initial" animate="animate"
        className="relative flex flex-col items-center w-full" style={{ maxWidth: 320, zIndex: 3 }}>
        {!done ? (
          <>
            <motion.p variants={UP} transition={{ delay: 0.08 }}
              style={{ fontFamily: BF, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: P, textTransform: "uppercase" as const, marginBottom: 8 }}>
              YOUR FIRST HEIST
            </motion.p>
            <motion.h2 variants={UP} transition={{ delay: 0.16 }}
              style={{ fontFamily: HF, fontWeight: 800, fontSize: 24, lineHeight: 1.15, letterSpacing: "-0.03em", color: TX, maxWidth: 260 }}>
              Steal your first 100 ST.
            </motion.h2>
            <motion.p variants={UP} transition={{ delay: 0.28 }}
              style={{ marginTop: 10, fontSize: 14, color: TM, fontFamily: BF, maxWidth: 220, lineHeight: 1.4 }}>
              The vault is waiting.
            </motion.p>
            <motion.div variants={UP} transition={{ delay: 0.4 }} className="mt-8">
              <VaultCrack onDone={handleDone} />
            </motion.div>
          </>
        ) : (
          <>
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: "#E8FAF0", boxShadow: "0 8px 24px rgba(52,199,89,0.2)" }}>
              <Unlock className="w-10 h-10" style={{ color: "#34C759" }} strokeWidth={2.5} />
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ fontFamily: HF, fontWeight: 800, fontSize: 26, letterSpacing: "-0.03em", color: TX }}>
              VAULT CRACKED
            </motion.h2>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="mt-5 flex items-center gap-6">
              <div className="text-center">
                <p style={{ fontSize: 32, fontWeight: 800, color: "#FF9500", fontFamily: HF }}><AN value={100} delay={0.6} /></p>
                <p style={{ fontSize: 12, fontWeight: 600, color: TM, fontFamily: BF }}>ST</p>
              </div>
              <div style={{ width: 1, height: 40, background: "#E5E5EA" }} />
              <div className="text-center">
                <p style={{ fontSize: 32, fontWeight: 800, color: P, fontFamily: HF }}><AN value={50} delay={0.8} /></p>
                <p style={{ fontSize: 12, fontWeight: 600, color: TM, fontFamily: BF }}>XP</p>
              </div>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
              style={{ marginTop: 20, fontSize: 15, color: TX, fontFamily: HF, fontWeight: 600, lineHeight: 1.5, maxWidth: 240 }}>
              First loot secured.
            </motion.p>
            <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onNext}
              style={{ ...BTN, marginTop: 28 }}>
              CONTINUE
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 4 — REWARD (progressive reveal with sequential delays)
   ═══════════════════════════════════════════════════════════════ */
function SceneReward({ onNext }: { onNext: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 500);
    const t2 = setTimeout(() => setStep(2), 900);
    const t3 = setTimeout(() => setStep(3), 1200);
    const t4 = setTimeout(() => setStep(4), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <motion.div key="reward" variants={SC} initial="initial" animate="animate" exit="exit"
      className="flex flex-col items-center text-center w-full" style={{ zIndex: 2 }}>
      <motion.div variants={ST} initial="initial" animate="animate"
        className="relative flex flex-col items-center w-full" style={{ maxWidth: 320, zIndex: 3 }}>

        <motion.div key="check" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "#E8FAF0" }}>
          <Check className="w-10 h-10" style={{ color: "#34C759" }} strokeWidth={3} />
        </motion.div>

        <AnimatePresence>
          {step >= 1 && (
            <motion.h2 key="title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              style={{ marginTop: 20, fontFamily: HF, fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em", color: TX }}>
              MISSION COMPLETE
            </motion.h2>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 2 && (
            <motion.div key="st" initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
              className="mt-6 px-6 py-3 rounded-2xl"
              style={{ background: "#FFF8EE", boxShadow: "0 2px 8px rgba(255,149,0,0.1)" }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: "#FF9500", fontFamily: HF }}>+<AN value={100} delay={0} /> ST</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 3 && (
            <motion.div key="xp" initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
              className="mt-3 px-6 py-3 rounded-2xl"
              style={{ background: "#EDEDFC", boxShadow: "0 2px 8px rgba(94,92,230,0.15)" }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: P, fontFamily: HF }}>+<AN value={50} delay={0} /> XP</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step >= 4 && (
            <motion.div key="win" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              className="mt-4 flex flex-col items-center">
              <p style={{ fontFamily: HF, fontWeight: 800, fontSize: 18, color: "#34C759", letterSpacing: "-0.02em" }}>
                FIRST WIN
              </p>
              <p style={{ marginTop: 12, fontSize: 15, color: TM, fontFamily: BF, maxWidth: 240, lineHeight: 1.5 }}>
                You just created your first piece of virtual wealth.
              </p>
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onNext}
                style={{ ...BTN, marginTop: 24 }}>
                CONTINUE
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 5 — GOAL (updated sub text & responses)
   ═══════════════════════════════════════════════════════════════ */
function SceneGoal({ onNext }: { onNext: () => void }) {
  const { selectedGoal, setGoal } = useGuestStore();
  const goals = [
    { id: "focus", emoji: "\u{1F9E0}", label: "FOCUS", sub: "Build deeper attention.", color: "#5E5CE6" },
    { id: "study", emoji: "\u{1F4DA}", label: "STUDY", sub: "Turn consistency into mastery.", color: "#007AFF" },
    { id: "fitness", emoji: "\u{1F4AA}", label: "FITNESS", sub: "Make showing up automatic.", color: "#FF2D55" },
    { id: "projects", emoji: "\u{1F680}", label: "PROJECTS", sub: "Finish what you start.", color: "#FF9500" },
    { id: "habits", emoji: "\u2705", label: "HABITS", sub: "Make progress repeatable.", color: "#34C759" },
  ];
  const responses: Record<string, string> = {
    focus: "Focus it is. Let\u2019s build your momentum.",
    study: "Study it is. Let\u2019s build your momentum.",
    fitness: "Fitness it is. Let\u2019s build your momentum.",
    projects: "Projects it is. Let\u2019s build your momentum.",
    habits: "Habits it is. Let\u2019s build your momentum.",
  };
  const canContinue = !!selectedGoal;
  return (
    <motion.div key="goal" variants={SC} initial="initial" animate="animate" exit="exit"
      className="flex flex-col items-center text-center w-full" style={{ zIndex: 2 }}>
      <motion.div variants={ST} initial="initial" animate="animate"
        className="relative flex flex-col items-center w-full" style={{ maxWidth: 320, zIndex: 3 }}>
        <motion.h2 variants={UP} transition={{ delay: 0.08 }}
          style={{ fontFamily: HF, fontWeight: 800, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.03em", color: TX, marginBottom: 6 }}>
          WHAT ARE YOU BUILDING?
        </motion.h2>
        <motion.p variants={UP} transition={{ delay: 0.15 }}
          style={{ fontSize: 14, color: TM, fontFamily: BF, marginBottom: 20 }}>
          Pick one to start.
        </motion.p>
        <div className="w-full flex flex-col gap-2.5">
          {goals.map((g) => {
            const sel = selectedGoal === g.id;
            return (
              <GC key={g.id} sel={sel} onClick={() => setGoal(g.id)} style={{ padding: "14px 16px" }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 26 }}>{g.emoji}</span>
                  <div className="flex-1 text-left">
                    <p style={{ fontSize: 14, fontWeight: 700, color: sel ? g.color : TX, letterSpacing: "0.04em", fontFamily: HF }}>{g.label}</p>
                    <p style={{ fontSize: 11, color: TM, fontFamily: BF }}>{g.sub}</p>
                  </div>
                  {sel && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: g.color }}>
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </div>
              </GC>
            );
          })}
        </div>
        {selectedGoal && (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 16, fontSize: 14, fontWeight: 600, color: P, fontFamily: BF }}>
            {responses[selectedGoal] || "Great choice."}
          </motion.p>
        )}
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: canContinue ? 1 : 0.35 }}
          whileHover={{ scale: canContinue ? 1.03 : 1 }} whileTap={{ scale: canContinue ? 0.96 : 1 }}
          onClick={onNext} disabled={!canContinue}
          style={{ ...BTN, marginTop: 24, ...(canContinue ? {} : BTN_DISABLED) }}>
          CONTINUE <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 6 — PLAYSTYLE (updated desc)
   ═══════════════════════════════════════════════════════════════ */
function ScenePlaystyle({ onNext }: { onNext: () => void }) {
  const { selectedPlaystyle, setPlaystyle } = useGuestStore();
  const styles: { id: NonNullable<GuestPlaystyle>; emoji: string; label: string; desc: string; color: string }[] = [
    { id: "grinder", emoji: "\u26A1", label: "THE GRINDER", desc: "Win through consistency.", color: "#FF9500" },
    { id: "sprinter", emoji: "\u{1F3C3}", label: "THE SPRINTER", desc: "Chase big milestones.", color: "#FF2D55" },
    { id: "competitor", emoji: "\u{1F3C6}", label: "THE COMPETITOR", desc: "Climb the rankings.", color: P },
    { id: "collector", emoji: "\u{1F48E}", label: "THE COLLECTOR", desc: "Unlock everything.", color: "#007AFF" },
    { id: "balanced", emoji: "\u2696\uFE0F", label: "THE BALANCED", desc: "A little of everything.", color: "#34C759" },
  ];
  const canContinue = !!selectedPlaystyle;
  return (
    <motion.div key="playstyle" variants={SC} initial="initial" animate="animate" exit="exit"
      className="flex flex-col items-center text-center w-full" style={{ zIndex: 2 }}>
      <motion.div variants={ST} initial="initial" animate="animate"
        className="relative flex flex-col items-center w-full" style={{ maxWidth: 320, zIndex: 3 }}>
        <motion.h2 variants={UP} transition={{ delay: 0.08 }}
          style={{ fontFamily: HF, fontWeight: 800, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.03em", color: TX, marginBottom: 20 }}>
          HOW DO YOU LIKE TO WIN?
        </motion.h2>
        <div className="w-full flex flex-col gap-2.5">
          {styles.map((s) => {
            const sel = selectedPlaystyle === s.id;
            return (
              <GC key={s.id} sel={sel} onClick={() => setPlaystyle(s.id)} style={{ padding: "14px 16px" }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 26 }}>{s.emoji}</span>
                  <div className="flex-1 text-left">
                    <p style={{ fontSize: 14, fontWeight: 700, color: sel ? s.color : TX, letterSpacing: "0.03em", fontFamily: HF }}>{s.label}</p>
                    <p style={{ fontSize: 11, color: TM, fontFamily: BF }}>{s.desc}</p>
                  </div>
                  {sel && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: s.color }}>
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </div>
              </GC>
            );
          })}
        </div>
        {selectedPlaystyle && (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 16, fontSize: 14, fontWeight: 600, color: P, fontFamily: BF }}>
            Your path is taking shape.
          </motion.p>
        )}
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: canContinue ? 1 : 0.35 }}
          whileHover={{ scale: canContinue ? 1.03 : 1 }} whileTap={{ scale: canContinue ? 0.96 : 1 }}
          onClick={onNext} disabled={!canContinue}
          style={{ ...BTN, marginTop: 24, ...(canContinue ? {} : BTN_DISABLED) }}>
          CONTINUE <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 7 — AVATAR (updated identity taglines)
   ═══════════════════════════════════════════════════════════════ */
function SceneAvatar({ onNext }: { onNext: () => void }) {
  const { avatarId, setAvatar } = useGuestStore();
  const avatars = [
    { id: "wolf", emoji: "\u{1F43A}", label: "WOLF", color: "#5E5CE6", tagline: "Loyal and relentless." },
    { id: "tiger", emoji: "\u{1F42F}", label: "TIGER", color: "#FF9500", tagline: "Strike with precision." },
    { id: "ninja", emoji: "\u{1F977}", label: "NINJA", color: "#1C1C1E", tagline: "Silent and swift." },
    { id: "wizard", emoji: "\u{1F9D9}", label: "WIZARD", color: "#AF52DE", tagline: "Shape your world." },
    { id: "dragon", emoji: "\u{1F409}", label: "DRAGON", color: "#FF2D55", tagline: "Unleash your power." },
    { id: "phoenix", emoji: "\u{1F525}", label: "PHOENIX", color: "#FF6482", tagline: "Built to rise again." },
  ];
  const canContinue = !!avatarId;
  const selected = avatars.find(a => a.id === avatarId);
  return (
    <motion.div key="avatar" variants={SC} initial="initial" animate="animate" exit="exit"
      className="flex flex-col items-center text-center w-full" style={{ zIndex: 2 }}>
      <motion.div variants={ST} initial="initial" animate="animate"
        className="relative flex flex-col items-center w-full" style={{ maxWidth: 300, zIndex: 3 }}>
        <motion.h2 variants={UP} transition={{ delay: 0.08 }}
          style={{ fontFamily: HF, fontWeight: 800, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.03em", color: TX, marginBottom: 6 }}>
          WHAT WILL THE WORLD SEE?
        </motion.h2>
        <motion.p variants={UP} transition={{ delay: 0.15 }}
          style={{ fontSize: 14, color: TM, fontFamily: BF, marginBottom: 20 }}>
          Choose your identity.
        </motion.p>
        <div className="grid grid-cols-3 gap-3 w-full" style={{ maxWidth: 264 }}>
          {avatars.map((a, i) => {
            const sel = avatarId === a.id;
            return (
              <motion.button key={a.id} variants={CD}
                initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 260, damping: 18 }}
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                onClick={() => setAvatar(a.id)}
                className="flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-all"
                style={{
                  background: sel ? "#EDEDFC" : CARD_BG,
                  border: sel ? `1.5px solid ${a.color}` : `1px solid ${CARD_BORDER}`,
                  boxShadow: sel ? SHADOW_SEL : SHADOW,
                }}>
                <span style={{ fontSize: 32, lineHeight: 1 }}>{a.emoji}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: sel ? a.color : TM, letterSpacing: "0.08em", fontFamily: HF }}>{a.label}</span>
                {sel && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: a.color }}>
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
        <AnimatePresence>
          {selected && (
            <motion.p key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 200, damping: 18 }}
              style={{ marginTop: 16, fontSize: 14, fontWeight: 600, color: P, fontFamily: BF, maxWidth: 240, lineHeight: 1.4 }}>
              {selected.label} \u2014 {selected.tagline}
            </motion.p>
          )}
        </AnimatePresence>
        <motion.button
          initial={{ opacity: 0 }} animate={{ opacity: canContinue ? 1 : 0.35 }}
          whileHover={{ scale: canContinue ? 1.03 : 1 }} whileTap={{ scale: canContinue ? 0.96 : 1 }}
          onClick={onNext} disabled={!canContinue}
          style={{ ...BTN, marginTop: 28, ...(canContinue ? {} : BTN_DISABLED) }}>
          CONTINUE <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 8 — PLAYER (updated reveal text: "THIS IS YOU.")
   ═══════════════════════════════════════════════════════════════ */
function ScenePlayer({ onNext }: { onNext: () => void }) {
  const s = useGuestStore();
  const [buildStep, setBuildStep] = useState(0);
  const emoji = s.avatarId === "wolf" ? "\u{1F43A}" : s.avatarId === "tiger" ? "\u{1F42F}" : s.avatarId === "ninja" ? "\u{1F977}" : s.avatarId === "wizard" ? "\u{1F9D9}" : s.avatarId === "dragon" ? "\u{1F409}" : s.avatarId === "phoenix" ? "\u{1F525}" : "\u{1F464}";
  const pLabel = s.selectedPlaystyle === "grinder" ? "THE GRINDER" : s.selectedPlaystyle === "sprinter" ? "THE SPRINTER" : s.selectedPlaystyle === "competitor" ? "THE COMPETITOR" : s.selectedPlaystyle === "collector" ? "THE COLLECTOR" : "THE BALANCED";
  const gLabel = s.selectedGoal === "focus" ? "FOCUS PLAYER" : s.selectedGoal === "study" ? "STUDY PLAYER" : s.selectedGoal === "fitness" ? "FITNESS PLAYER" : s.selectedGoal === "projects" ? "BUILDER" : "HABITS PLAYER";

  useEffect(() => {
    const timers = [
      setTimeout(() => setBuildStep(1), 400),
      setTimeout(() => setBuildStep(2), 800),
      setTimeout(() => setBuildStep(3), 1200),
      setTimeout(() => setBuildStep(4), 1600),
      setTimeout(() => setBuildStep(5), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div key="player" variants={SC} initial="initial" animate="animate" exit="exit"
      className="flex flex-col items-center text-center w-full" style={{ zIndex: 2 }}>
      <motion.div variants={ST} initial="initial" animate="animate"
        className="relative flex flex-col items-center w-full" style={{ maxWidth: 300, zIndex: 3 }}>
        <motion.p variants={UP} transition={{ delay: 0.08 }}
          style={{ fontFamily: BF, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: TM, textTransform: "uppercase" as const, marginBottom: 16 }}>
          Building your player...
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="w-full rounded-3xl p-5 relative overflow-hidden"
          style={{ background: CARD_BG, boxShadow: SHADOW_SEL }}>
          <div className="relative">
            {buildStep >= 1 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: "1px solid #F2F2F7" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: TM, letterSpacing: "0.1em", fontFamily: HF }}>AVATAR</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: TX, fontFamily: HF }}>{emoji}</span>
              </motion.div>
            )}
            {buildStep >= 2 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: "1px solid #F2F2F7" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: TM, letterSpacing: "0.1em", fontFamily: HF }}>NAME</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: TX, fontFamily: HF }}>{s.displayName || "PLAYER"}</span>
              </motion.div>
            )}
            {buildStep >= 3 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: "1px solid #F2F2F7" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: TM, letterSpacing: "0.1em", fontFamily: HF }}>GOAL</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: TX, fontFamily: HF }}>{gLabel}</span>
              </motion.div>
            )}
            {buildStep >= 4 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex items-center justify-between py-2.5"
                style={{ borderBottom: "1px solid #F2F2F7" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: TM, letterSpacing: "0.1em", fontFamily: HF }}>PLAYSTYLE</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: TX, fontFamily: HF }}>{pLabel}</span>
              </motion.div>
            )}
            {buildStep >= 5 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex items-center justify-between py-2.5">
                <span style={{ fontSize: 10, fontWeight: 700, color: TM, letterSpacing: "0.1em", fontFamily: HF }}>LEVEL</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: P, fontFamily: HF }}>1</span>
              </motion.div>
            )}
          </div>
        </motion.div>
        {buildStep >= 5 && (
          <>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              style={{ marginTop: 20, fontSize: 15, fontWeight: 600, color: TX, fontFamily: HF }}>
              THIS IS YOU.
            </motion.p>
            <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onNext}
              style={{ ...BTN, marginTop: 24 }}>
              CONTINUE <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 9 — FUTURE (messages show during level progression)
   ═══════════════════════════════════════════════════════════════ */
function SceneFuture({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<"future" | "compete" | "done">("future");
  const [lvlIdx, setLvlIdx] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  const levels = [
    { level: 1, st: 0, xp: 0, streak: 0, msg: "This is where you start." },
    { level: 5, st: 2400, xp: 1200, streak: 4, msg: "This is where consistency can take you." },
    { level: 10, st: 12800, xp: 6400, streak: 9, msg: "This is where consistency can take you." },
    { level: 18, st: 25867, xp: 13200, streak: 12, msg: "This is where consistency can take you." },
  ];
  const cur = levels[lvlIdx];

  useEffect(() => {
    if (phase !== "future") return;
    const t1 = setTimeout(() => setShowStats(true), 600);
    const t2 = setTimeout(() => setShowMessage(true), 1000);
    if (lvlIdx < levels.length - 1) {
      const t3 = setTimeout(() => { setLvlIdx(i => i + 1); setShowStats(false); setShowMessage(false); }, lvlIdx === 0 ? 1800 : 2200);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
    const t4 = setTimeout(() => setPhase("compete"), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t4); };
  }, [phase, lvlIdx]);

  useEffect(() => {
    if (phase === "compete") {
      const t = setTimeout(() => setPhase("done"), 3500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const rivals = [
    { name: "ALEX", st: 24800 },
    { name: "SOFIA", st: 23600 },
    { name: "WARREN", st: 22400 },
    { name: "MAYA", st: 21200 },
    { name: "KAI", st: 20000 },
  ];

  return (
    <motion.div key="future" variants={SC} initial="initial" animate="animate" exit="exit"
      className="flex flex-col items-center text-center w-full" style={{ zIndex: 2 }}>
      <motion.div variants={ST} initial="initial" animate="animate"
        className="relative flex flex-col items-center w-full" style={{ maxWidth: 320, zIndex: 3 }}>
        <AnimatePresence mode="wait">
          {phase === "future" && (
            <motion.div key="fut" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }} className="flex flex-col items-center w-full">
              <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
                style={{ fontFamily: BF, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: TM, textTransform: "uppercase" as const, marginBottom: 20 }}>
                Your future self
              </motion.p>
              <motion.div initial={{ opacity: 0, scale: 0.85, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.2 }}
                className="w-full rounded-3xl relative overflow-hidden"
                style={{ maxWidth: 280, background: CARD_BG, boxShadow: SHADOW_SEL }}>
                <motion.div className="absolute inset-0 pointer-events-none"
                  animate={{ opacity: lvlIdx >= 2 ? 0.15 : 0 }} transition={{ duration: 1 }}
                  style={{ background: `radial-gradient(circle at 50% 30%, ${P} 0%, transparent 60%)` }} />
                <div className="relative p-6 pb-5">
                  <motion.div key={cur.level} initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 16 }}>
                    <p style={{ fontFamily: HF, fontWeight: 800, fontSize: 48, color: P, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                      LEVEL {cur.level}
                    </p>
                  </motion.div>
                  {showStats && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="flex items-center justify-center gap-5 mt-4 pt-4" style={{ borderTop: "1px solid #F2F2F7" }}>
                      <div className="text-center">
                        <FCount n={cur.st} delay={0} color="#FF9500" />
                        <p style={{ fontSize: 10, fontWeight: 600, color: TM, fontFamily: HF, marginTop: 2 }}>ST</p>
                      </div>
                      <div style={{ width: 1, height: 28, background: "#E5E5EA" }} />
                      <div className="text-center">
                        <FCount n={cur.xp} delay={0.1} color={P} />
                        <p style={{ fontSize: 10, fontWeight: 600, color: TM, fontFamily: HF, marginTop: 2 }}>XP</p>
                      </div>
                      {cur.streak > 0 && (<>
                        <div style={{ width: 1, height: 28, background: "#E5E5EA" }} />
                        <div className="text-center">
                          <p style={{ fontSize: 20, fontWeight: 800, color: "#FF9500", fontFamily: HF }}>{cur.streak}</p>
                          <p style={{ fontSize: 10, fontWeight: 600, color: TM, fontFamily: HF, marginTop: 2 }}>STREAK</p>
                        </div>
                      </>)}
                    </motion.div>
                  )}
                  {showStats && cur.xp > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                      className="mt-3 rounded-full overflow-hidden" style={{ height: 4, background: "#F2F2F7" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((cur.xp / 15000) * 100, 100)}%` }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                        className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${P}, #7A78FF)` }} />
                    </motion.div>
                  )}
                </div>
              </motion.div>
              {showMessage && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                  <p style={{ marginTop: 20, fontSize: 15, color: TM, fontFamily: BF, lineHeight: 1.5 }}>
                    {cur.msg}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
          {phase === "compete" && (
            <motion.div key="comp" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }} className="flex flex-col items-center w-full">
              <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
                style={{ fontFamily: BF, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: TM, textTransform: "uppercase" as const, marginBottom: 16 }}>
                The Leaderboard
              </motion.p>
              <div className="w-full flex flex-col gap-2" style={{ maxWidth: 280 }}>
                {rivals.map((r, i) => (
                  <motion.div key={r.name}
                    initial={{ opacity: 0, x: -30, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.18, type: "spring", stiffness: 200, damping: 22 }}
                    className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: CARD_BG, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TM, fontFamily: HF, width: 22, textAlign: "center" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: TX, fontFamily: HF, flex: 1, textAlign: "left" }}>
                      {r.name}
                    </span>
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.18 }}
                      style={{ fontSize: 12, color: TM, fontFamily: BF, fontVariantNumeric: "tabular-nums" }}>
                      {r.st.toLocaleString()} ST
                    </motion.span>
                  </motion.div>
                ))}
                <motion.div initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: 1.2, type: "spring", stiffness: 180, damping: 18 }}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 relative"
                  style={{ background: "#EDEDFC", border: `1.5px solid ${P}`, boxShadow: "0 4px 20px rgba(94,92,230,0.2)" }}>
                  <motion.div className="absolute inset-0 rounded-xl pointer-events-none"
                    animate={{ boxShadow: [`0 0px 0px ${P}00`, `0 4px 20px ${P}30`, `0 0px 0px ${P}00`] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: P, fontFamily: HF, width: 22, textAlign: "center" }}>17</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: TX, fontFamily: HF, flex: 1, textAlign: "left" }}>YOU</span>
                  <span style={{ fontSize: 12, color: P, fontFamily: BF, fontWeight: 600 }}>STARTING</span>
                </motion.div>
              </div>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 0.5 }}
                style={{ marginTop: 18, fontSize: 14, color: TX, fontFamily: BF, lineHeight: 1.5 }}>
                And there will always be something ahead.
              </motion.p>
            </motion.div>
          )}
          {phase === "done" && (
            <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }} className="flex flex-col items-center w-full">
              <p style={{ fontSize: 15, color: TM, fontFamily: BF, maxWidth: 250, lineHeight: 1.5 }}>
                Somewhere to go.
              </p>
              <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onNext}
                style={{ ...BTN, marginTop: 28 }}>
                SET MY GOAL <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function FCount({ n, delay = 0, color = TX }: { n: number; delay?: number; color?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const c = animate(0, n, {
      duration: 1.4, delay, ease: [0.22, 1, 0.36, 1],
      onUpdate(v) { if (el) el.textContent = Math.round(v).toLocaleString(); },
    });
    return () => c.stop();
  }, [n, delay]);
  return <p ref={ref} style={{ fontSize: 20, fontWeight: 800, color, fontFamily: HF, fontVariantNumeric: "tabular-nums" }}>0</p>;
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 10 — FIRST GOAL (updated desc)
   ═══════════════════════════════════════════════════════════════ */
function SceneFirstGoal({ onNext }: { onNext: () => void }) {
  const { selectedFirstGoal, setFirstGoal } = useGuestStore();
  const [locked, setLocked] = useState(false);
  const goals = [
    { id: "1000st", emoji: "\u{1F4B0}", label: "1,000 ST", desc: "Build your first stash.", color: "#FF9500" },
    { id: "level5", emoji: "\u{1F4C8}", label: "LEVEL 5", desc: "Prove your momentum.", color: P },
    { id: "7streak", emoji: "\u{1F525}", label: "7 DAY STREAK", desc: "Show up every day.", color: "#FF9500" },
    { id: "firstitem", emoji: "\u{1F48E}", label: "FIRST ITEM", desc: "Own something worth grinding for.", color: "#007AFF" },
  ];
  const handleLock = useCallback(() => {
    if (!selectedFirstGoal) return;
    setLocked(true);
    setTimeout(() => onNext(), 2200);
  }, [selectedFirstGoal, onNext]);
  return (
    <motion.div key="firstgoal" variants={SC} initial="initial" animate="animate" exit="exit"
      className="flex flex-col items-center text-center w-full" style={{ zIndex: 2 }}>
      <motion.div variants={ST} initial="initial" animate="animate"
        className="relative flex flex-col items-center w-full" style={{ maxWidth: 300, zIndex: 3 }}>
        {!locked ? (
          <>
            <motion.h2 variants={UP} transition={{ delay: 0.08 }}
              style={{ fontFamily: HF, fontWeight: 800, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.03em", color: TX, marginBottom: 6 }}>
              WHAT SHOULD YOU CHASE FIRST?
            </motion.h2>
            <motion.p variants={UP} transition={{ delay: 0.15 }}
              style={{ fontSize: 14, color: TM, fontFamily: BF, marginBottom: 20 }}>
              Pick your opening target.
            </motion.p>
            <div className="w-full flex flex-col gap-2.5">
              {goals.map((g) => {
                const sel = selectedFirstGoal === g.id;
                return (
                  <GC key={g.id} sel={sel} onClick={() => setFirstGoal(g.id)} style={{ padding: "14px 16px" }}>
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: 26 }}>{g.emoji}</span>
                      <div className="flex-1 text-left">
                        <p style={{ fontSize: 14, fontWeight: 700, color: sel ? g.color : TX, fontFamily: HF }}>{g.label}</p>
                        <p style={{ fontSize: 11, color: TM, fontFamily: BF }}>{g.desc}</p>
                      </div>
                      {sel && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: g.color }}>
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </div>
                  </GC>
                );
              })}
            </div>
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: selectedFirstGoal ? 1 : 0.35 }}
              whileHover={{ scale: selectedFirstGoal ? 1.03 : 1 }} whileTap={{ scale: selectedFirstGoal ? 0.96 : 1 }}
              onClick={handleLock} disabled={!selectedFirstGoal}
              style={{ ...BTN, marginTop: 24, ...(selectedFirstGoal ? {} : BTN_DISABLED) }}>
              LOCK IN <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </motion.button>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="flex flex-col items-center py-6">
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
              style={{ background: "#EDEDFC", border: `2px solid ${P}` }}>
              <Lock className="w-8 h-8" style={{ color: P }} />
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              style={{ fontFamily: HF, fontWeight: 800, fontSize: 20, color: TX, letterSpacing: "-0.03em" }}>
              That&apos;s your first target.
            </motion.p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCENE 11 — REVEAL (updated: "You're ready.")
   ═══════════════════════════════════════════════════════════════ */
function SceneReveal({ onNext }: { onNext: () => void }) {
  const s = useGuestStore();
  const emoji = s.avatarId === "wolf" ? "\u{1F43A}" : s.avatarId === "tiger" ? "\u{1F42F}" : s.avatarId === "ninja" ? "\u{1F977}" : s.avatarId === "wizard" ? "\u{1F9D9}" : s.avatarId === "dragon" ? "\u{1F409}" : s.avatarId === "phoenix" ? "\u{1F525}" : "\u{1F464}";
  const gLabel = s.selectedGoal === "focus" ? "FOCUS PLAYER" : s.selectedGoal === "study" ? "STUDY PLAYER" : s.selectedGoal === "fitness" ? "FITNESS PLAYER" : s.selectedGoal === "projects" ? "BUILDER" : "HABITS PLAYER";
  const pLabel = s.selectedPlaystyle === "grinder" ? "THE GRINDER" : s.selectedPlaystyle === "sprinter" ? "THE SPRINTER" : s.selectedPlaystyle === "competitor" ? "THE COMPETITOR" : s.selectedPlaystyle === "collector" ? "THE COLLECTOR" : "THE BALANCED";
  const firstGoalLabel = s.selectedFirstGoal === "1000st" ? "1,000 ST" : s.selectedFirstGoal === "level5" ? "LEVEL 5" : s.selectedFirstGoal === "7streak" ? "7 DAY STREAK" : "FIRST ITEM";
  return (
    <motion.div key="reveal" variants={SC} initial="initial" animate="animate" exit="exit"
      className="flex flex-col items-center text-center w-full" style={{ zIndex: 2 }}>
      <motion.div variants={ST} initial="initial" animate="animate"
        className="relative flex flex-col items-center w-full" style={{ maxWidth: 300, zIndex: 3 }}>
        <motion.p variants={UP} transition={{ delay: 0.08 }}
          style={{ fontFamily: HF, fontWeight: 800, fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.03em", color: TX, marginBottom: 24 }}>
          YOUR JOURNEY IS READY.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 200, damping: 18 }}
          className="w-full rounded-3xl p-5 relative overflow-hidden"
          style={{ maxWidth: 260, background: CARD_BG, boxShadow: SHADOW_SEL }}>
          <div className="relative">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring" }}
              className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl"
              style={{ background: "#EDEDFC" }}>
              {emoji}
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              style={{ marginTop: 10, fontFamily: HF, fontWeight: 800, fontSize: 18, color: TX, letterSpacing: "-0.02em" }}>
              {s.displayName || "PLAYER"}
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
              style={{ fontSize: 11, fontWeight: 700, color: P, letterSpacing: "0.08em", fontFamily: HF, marginTop: 3 }}>
              {gLabel}
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }}
              style={{ fontSize: 10, fontWeight: 600, color: TM, fontFamily: HF, marginTop: 2 }}>
              {pLabel}
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95 }}
              className="flex items-center justify-center gap-5 mt-3 pt-3" style={{ borderTop: "1px solid #F2F2F7" }}>
              <div className="text-center">
                <p style={{ fontSize: 18, fontWeight: 800, color: TX, fontFamily: HF }}>1</p>
                <p style={{ fontSize: 9, fontWeight: 600, color: TM, textTransform: "uppercase" as const, fontFamily: HF }}>LEVEL</p>
              </div>
              <div className="text-center">
                <p style={{ fontSize: 18, fontWeight: 800, color: "#FF9500", fontFamily: HF }}>0</p>
                <p style={{ fontSize: 9, fontWeight: 600, color: TM, textTransform: "uppercase" as const, fontFamily: HF }}>ST</p>
              </div>
              <div className="text-center">
                <p style={{ fontSize: 18, fontWeight: 800, color: P, fontFamily: HF }}>0</p>
                <p style={{ fontSize: 9, fontWeight: 600, color: TM, textTransform: "uppercase" as const, fontFamily: HF }}>XP</p>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
              className="mt-3 pt-2.5" style={{ borderTop: "1px solid #F2F2F7" }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: TM, letterSpacing: "0.1em", fontFamily: HF }}>FIRST GOAL</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: P, fontFamily: HF, marginTop: 2 }}>{firstGoalLabel}</p>
            </motion.div>
          </div>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}
          style={{ marginTop: 24, fontSize: 15, color: TX, fontFamily: HF, fontWeight: 600, lineHeight: 1.5, maxWidth: 260 }}>
          You&apos;re ready.
        </motion.p>
        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onNext}
          style={{ ...BTN, marginTop: 24 }}>
          START MY JOURNEY <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
        </motion.button>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
          style={{ marginTop: 12, fontSize: 12, color: TM, fontFamily: BF }}>
          You can customize everything later.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN CONTROLLER
   ═══════════════════════════════════════════════════════════════ */
const SCENES = ["hook", "idea", "heist", "reward", "goal", "playstyle", "avatar", "player", "future", "firstgoal", "reveal"] as const;

export default function OnboardingFlow() {
  const [idx, setIdx] = useState(0);
  const mark = useGuestStore(s => s.markOnboardingStarted);
  const go = useCallback(() => { mark(); setIdx(i => Math.min(i + 1, SCENES.length - 1)); }, [mark]);
  const skip = useCallback(() => { mark(); window.location.href = "/create-player"; }, [mark]);
  const scene = SCENES[idx];
  return (
    <div className="flex flex-col w-full" style={{
      background: BG,
      minHeight: "calc(100dvh - 62px)",
      marginBottom: -120,
      paddingBottom: 120,
    }}>
      <div className="flex-1 flex flex-col items-center overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <div className="w-full flex flex-col items-center justify-center" style={{ minHeight: "calc(100dvh - 62px - 80px)", padding: "20px 24px" }}>
          <AnimatePresence mode="wait">
            {scene === "hook" && <SceneHook onNext={go} />}
            {scene === "idea" && <SceneIdea onNext={go} />}
            {scene === "heist" && <SceneHeist onNext={go} />}
            {scene === "reward" && <SceneReward onNext={go} />}
            {scene === "goal" && <SceneGoal onNext={go} />}
            {scene === "playstyle" && <ScenePlaystyle onNext={go} />}
            {scene === "avatar" && <SceneAvatar onNext={go} />}
            {scene === "player" && <ScenePlayer onNext={go} />}
            {scene === "future" && <SceneFuture onNext={go} />}
            {scene === "firstgoal" && <SceneFirstGoal onNext={go} />}
            {scene === "reveal" && <SceneReveal onNext={() => { window.location.href = "/create-player"; }} />}
          </AnimatePresence>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-center gap-2" style={{ paddingBottom: 28, paddingTop: 8 }}>
        <PD step={idx} total={SCENES.length} />
        {idx < SCENES.length - 1 && (
          <button onClick={skip}
            style={{ fontSize: 14, fontWeight: 500, color: "#C7C7CC", fontFamily: BF, background: "none", border: "none", cursor: "pointer", padding: "6px 16px" }}>
            Skip setup
          </button>
        )}
      </div>
    </div>
  );
}
