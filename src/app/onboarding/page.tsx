"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  Dumbbell,
  HeartPulse,
  Loader2,
  Palette,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { httpClient, ApiRequestError } from "@/types/api";
import { AVATARS } from "@/lib/catalog/data";

/* ─────────────────────────── Step config ────────────────────────── */

const CATEGORIES = [
  { id: "study", label: "Study", icon: BookOpen, desc: "Learn something daily" },
  { id: "work", label: "Work", icon: Briefcase, desc: "Ship your projects" },
  { id: "fitness", label: "Fitness", icon: Dumbbell, desc: "Build a consistent routine" },
  { id: "reading", label: "Reading", icon: BookOpen, desc: "Read every day" },
  { id: "health", label: "Health", icon: HeartPulse, desc: "Sleep, water, wellbeing" },
  { id: "creative", label: "Creative", icon: Palette, desc: "Make things that matter" },
  { id: "personal", label: "Personal", icon: User, desc: "Life admin & habits" },
] as const;

const COMMITMENTS = [
  { minutes: 10 as const, title: "10 min", desc: "Light but steady" },
  { minutes: 20 as const, title: "20 min", desc: "A solid daily spark" },
  { minutes: 30 as const, title: "30 min", desc: "The classic grind" },
  { minutes: 60 as const, title: "60 min", desc: "Serious commitment" },
  { minutes: 90 as const, title: "90+ min", desc: "All-in mode" },
];

const GOAL_SUGGESTIONS = [
  "Build a study habit",
  "Finish my projects",
  "Exercise consistently",
  "Read every day",
  "Improve focus",
  "Stay organized",
];

type Draft = {
  displayName: string;
  avatarId: string | null;
  categories: string[];
  commitment: number | null;
  goal: string;
};

const DRAFT_KEY = "st_onboarding_draft";

const stepVariants = {
  enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<Draft>({ displayName: "", avatarId: null, categories: [], commitment: null, goal: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  /* Resume support (spec §92) — local draft, server remains authoritative. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    // Prefill display name from the account created at signup.
    void httpClient
      .get<{ authenticated: boolean; displayName?: string }>("/api/auth/session")
      .then((s) => {
        if (s.authenticated && s.displayName) {
          setDraft((d) => (d.displayName ? d : { ...d, displayName: s.displayName! }));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  const totalSteps = 6; // name → avatar → categories → commitment → goal → mission
  const progressStep = Math.min(step, totalSteps - 1);

  function go(dir: number) {
    setError(null);
    setDirection(dir);
    setStep((s) => Math.max(0, Math.min(s + dir, totalSteps + 1)));
  }

  const canContinue = useMemo(() => {
    switch (progressStep) {
      case 0: return draft.displayName.trim().length >= 2;
      case 1: return !!draft.avatarId;
      case 2: return draft.categories.length > 0;
      case 3: return draft.commitment != null;
      case 4: return draft.goal.trim().length >= 2;
      default: return true;
    }
  }, [progressStep, draft]);

  async function finish() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await httpClient.post("/api/onboarding", {
        displayName: draft.displayName.trim(),
        avatarId: draft.avatarId!,
        preferredCategories: draft.categories,
        dailyCommitmentMinutes: draft.commitment ?? 20,
        primaryGoal: draft.goal.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      window.localStorage.removeItem(DRAFT_KEY);
      setDirection(1);
      setRevealed(true);
      setStep(totalSteps + 1);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "ONBOARDING_ALREADY_COMPLETE") {
        router.replace("/home");
        return;
      }
      setError(err instanceof ApiRequestError ? err.message : "Could not save. Your answers are kept — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const personalization =
    draft.categories.includes("fitness") ? "Build your consistency." :
    draft.categories.includes("study") || draft.categories.includes("reading") ? "Build your focus streak." :
    draft.categories.includes("work") ? "Build your momentum." :
    "Build your streak.";

  return (
    <div className="neon-canvas h-full relative flex flex-col text-white overflow-hidden">
      {/* Ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="orb orb-a" style={{ width: 320, height: 320, top: "-10%", right: "-14%", background: "radial-gradient(circle at 35% 35%, rgba(124,92,255,.3), transparent 70%)" }} />
        <div className="orb orb-b" style={{ width: 280, height: 280, bottom: "-4%", left: "-18%", background: "radial-gradient(circle at 60% 40%, rgba(90,50,200,.26), transparent 72%)" }} />
      </div>

      {/* Header: back + progress */}
      {!revealed && (
        <header className="relative z-10 px-6 pt-7 flex items-center gap-4">
          <button
            onClick={() => go(-1)}
            disabled={step === 0}
            aria-label="Go back"
            className={`w-9 h-9 rounded-full glass-dark flex items-center justify-center transition-opacity ${step === 0 ? "opacity-0 pointer-events-none" : ""}`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold tracking-[0.2em] text-violet-300/80 font-ui">ORIGIN STORY</span>
              <span className="text-[10px] font-bold text-slate-500 font-ui tabular-nums">{Math.min(progressStep + 1, totalSteps)} of {totalSteps}</span>
            </div>
            <div className="h-1 rounded-full bg-white/8 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${((progressStep + 1) / totalSteps) * 100}%` }}
                transition={{ type: "spring", damping: 24, stiffness: 200 }}
                style={{ background: "linear-gradient(90deg,#7C5CFF,#9A7CFF)" }}
              />
            </div>
          </div>
        </header>
      )}

      {/* Steps */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 max-w-md w-full mx-auto pb-8">
        <AnimatePresence mode="wait" custom={direction}>
          {revealed ? (
            <motion.div key="reveal" variants={stepVariants} custom={direction} initial="enter" animate="center" exit="exit" transition={{ duration: 0.35, ease: "easeOut" }}>
              <RevealScreen displayName={draft.displayName} onEnter={() => router.replace("/home")} />
            </motion.div>
          ) : (
            <motion.div
              key={progressStep}
              variants={stepVariants}
              custom={direction}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: "easeOut" }}
            >
              {progressStep === 0 && <StepName draft={draft} setDraft={setDraft} />}
              {progressStep === 1 && <StepAvatar draft={draft} setDraft={setDraft} />}
              {progressStep === 2 && <StepCategories draft={draft} setDraft={setDraft} />}
              {progressStep === 3 && <StepCommitment draft={draft} setDraft={setDraft} />}
              {progressStep === 4 && <StepGoal draft={draft} setDraft={setDraft} personalization={personalization} />}
              {progressStep === 5 && <StepMission draft={draft} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer CTA */}
      {!revealed && (
        <footer className="relative z-10 px-6 pb-10 max-w-md mx-auto w-full">
          {error && (
            <p role="alert" className="mb-3 text-[12.5px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 font-ui text-center">
              {error}
            </p>
          )}
          {progressStep === 5 ? (
            <button onClick={() => void finish()} disabled={submitting} className="btn-neon">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>CREATE MISSION <ArrowRight className="w-4 h-4" strokeWidth={2.5} /></>
              )}
            </button>
          ) : (
            <button onClick={() => go(1)} disabled={!canContinue} className="btn-neon">
              CONTINUE <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </footer>
      )}
    </div>
  );
}

/* ───────────────────────────── Steps ───────────────────────────── */

function StepName({ draft, setDraft }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>> }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.24em] text-violet-300/80 mb-3 font-ui">✦ IDENTITY</p>
      <h1 className="text-[30px] leading-tight font-extrabold font-display">WHO ARE YOU BECOMING?</h1>
      <p className="mt-3 text-[13.5px] text-slate-400 font-ui">Choose your player name.</p>
      <input
        autoFocus
        value={draft.displayName}
        onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
        maxLength={24}
        placeholder="Saurabh"
        aria-label="Player name"
        className="neon-input mt-6 text-lg font-bold"
      />
      <p className="mt-3 text-[12px] text-slate-500 font-ui">This is how you&apos;ll appear across SaurabhTask.</p>
    </div>
  );
}

function StepAvatar({ draft, setDraft }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>> }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.24em] text-violet-300/80 mb-3 font-ui">✦ AVATAR</p>
      <h1 className="text-[30px] leading-tight font-extrabold font-display">CHOOSE YOUR PLAYER</h1>
      <div className="grid grid-cols-4 gap-2.5 mt-7">
        {AVATARS.map((a) => {
          const selected = draft.avatarId === a.id;
          return (
            <motion.button
              key={a.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => setDraft((d) => ({ ...d, avatarId: a.id }))}
              aria-label={a.label}
              aria-pressed={selected}
              className="relative aspect-square rounded-2xl flex items-center justify-center text-[30px]"
              style={{
                background: selected ? "rgba(124,92,255,.16)" : "rgba(255,255,255,.04)",
                border: `1px solid ${selected ? "rgba(154,124,255,.7)" : "rgba(255,255,255,.08)"}`,
                boxShadow: selected ? "0 0 22px rgba(124,92,255,.35)" : "none",
                transform: selected ? "translateY(-2px)" : undefined,
              }}
            >
              {a.emoji}
              {selected && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#7C5CFF" }}>
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] text-slate-500 font-ui">Frames and cosmetics unlock in the Vault later.</p>
    </div>
  );
}

function StepCategories({ draft, setDraft }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>> }) {
  function toggle(id: string) {
    setDraft((d) => ({
      ...d,
      categories: d.categories.includes(id) ? d.categories.filter((c) => c !== id) : [...d.categories, id],
    }));
  }
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.24em] text-violet-300/80 mb-3 font-ui">✦ FOCUS</p>
      <h1 className="text-[28px] leading-tight font-extrabold font-display">WHAT ARE YOU BUILDING?</h1>
      <p className="mt-3 text-[13.5px] text-slate-400 font-ui">Pick everything you want to become more consistent at.</p>
      <div className="space-y-2 mt-6 max-h-[46%] overflow-y-auto no-scrollbar pr-0.5">
        {CATEGORIES.map((c) => {
          const selected = draft.categories.includes(c.id);
          return (
            <motion.button
              key={c.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(c.id)}
              aria-pressed={selected}
              className="w-full flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left"
              style={{
                background: selected ? "rgba(124,92,255,.14)" : "rgba(255,255,255,.04)",
                border: `1px solid ${selected ? "rgba(154,124,255,.65)" : "rgba(255,255,255,.08)"}`,
                boxShadow: selected ? "0 8px 24px -8px rgba(124,92,255,.4)" : "none",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: selected ? "rgba(124,92,255,.25)" : "rgba(255,255,255,.06)" }}
              >
                <c.icon className="w-5 h-5" style={{ color: selected ? "#B9A6FF" : "#8b86a0" }} strokeWidth={2.1} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold font-display">{c.label}</p>
                <p className="text-[11.5px] text-slate-500 font-ui truncate">{c.desc}</p>
              </div>
              {selected && <Check className="w-4.5 h-4.5 text-violet-300 flex-shrink-0" strokeWidth={3} />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function StepCommitment({ draft, setDraft }: { draft: Draft; setDraft: React.Dispatch<React.SetStateAction<Draft>> }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.24em] text-violet-300/80 mb-3 font-ui">✦ RHYTHM</p>
      <h1 className="text-[28px] leading-tight font-extrabold font-display">HOW MUCH TIME CAN YOU REALLY GIVE?</h1>
      <p className="mt-3 text-[13.5px] text-slate-400 font-ui">Honest beats heroic. Small daily reps win.</p>
      <div className="grid grid-cols-1 gap-2.5 mt-6">
        {COMMITMENTS.map((c) => {
          const selected = draft.commitment === c.minutes;
          return (
            <motion.button
              key={c.minutes}
              whileTap={{ scale: 0.98 }}
              onClick={() => setDraft((d) => ({ ...d, commitment: c.minutes }))}
              aria-pressed={selected}
              className="w-full flex items-center gap-3.5 rounded-2xl px-4 py-3 text-left"
              style={{
                background: selected ? "rgba(124,92,255,.14)" : "rgba(255,255,255,.04)",
                border: `1px solid ${selected ? "rgba(154,124,255,.65)" : "rgba(255,255,255,.08)"}`,
              }}
            >
              <Target className="w-4.5 h-4.5 flex-shrink-0" style={{ color: selected ? "#B9A6FF" : "#6E687F" }} strokeWidth={2.2} />
              <p className="text-[15px] font-extrabold font-display tabular-nums">{c.title}</p>
              <p className="text-[12px] text-slate-500 font-ui ml-auto">{c.desc}</p>
              {selected && <Check className="w-4 h-4 text-violet-300" strokeWidth={3} />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function StepGoal({
  draft,
  setDraft,
  personalization,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  personalization: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.24em] text-violet-300/80 mb-3 font-ui">✦ DESTINATION</p>
      <h1 className="text-[28px] leading-tight font-extrabold font-display">WHAT WOULD FEEL AMAZING TO ACHIEVE?</h1>
      <motion.p key={personalization} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-[13.5px] font-bold font-display" style={{ color: "#B9A6FF" }}>
        {personalization}
      </motion.p>
      <input
        autoFocus
        value={draft.goal}
        onChange={(e) => setDraft((d) => ({ ...d, goal: e.target.value }))}
        maxLength={120}
        placeholder="Describe your first destination…"
        aria-label="Your main goal"
        className="neon-input mt-5"
      />
      <div className="flex flex-wrap gap-2 mt-4">
        {GOAL_SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setDraft((d) => ({ ...d, goal: s }))}
            className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold font-ui glass-dark hover:bg-white/10 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepMission({ draft }: { draft: Draft }) {
  return (
    <div>
      <p className="text-[11px] font-bold tracking-[0.24em] text-violet-300/80 mb-3 font-ui">✦ FIRST MISSION</p>
      <h1 className="text-[28px] leading-tight font-extrabold font-display">EVERY LEGEND STARTS SMALL.</h1>
      <div
        className="mt-7 rounded-3xl p-5"
        style={{
          background: "linear-gradient(150deg, rgba(124,92,255,.16), rgba(59,7,100,.12))",
          border: "1px solid rgba(154,124,255,.35)",
          boxShadow: "0 18px 44px -14px rgba(124,92,255,.45)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-violet-300" strokeWidth={2.2} />
          <span className="text-[10px] font-bold tracking-[0.2em] text-violet-300 font-ui">YOUR FIRST MISSION</span>
        </div>
        <p className="text-[17px] font-extrabold font-display leading-snug">
          {draft.goal.trim() ? `First step: ${draft.goal.charAt(0).toLowerCase()}${draft.goal.slice(1)}` : "Complete one small task today"}
        </p>
        <div className="flex items-center gap-2 mt-4">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-400/15 text-emerald-300 font-display tabular-nums">+100 ST</span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-violet-400/15 text-violet-300 font-display tabular-nums">+50 XP</span>
        </div>
      </div>
      <div className="mt-5 glass-dark rounded-2xl p-4">
        <p className="text-[10px] font-bold tracking-[0.2em] text-violet-300/80 font-ui mb-1.5">WELCOME QUEST</p>
        <p className="text-[12.5px] text-slate-300 font-ui leading-relaxed">
          Complete this mission, earn 250 ST and protect your first streak to claim a <span className="font-bold text-white">+500 ST</span> founding reward.
        </p>
      </div>
    </div>
  );
}

function RevealScreen({ displayName, onEnter }: { displayName: string; onEnter: () => void }) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 13, stiffness: 200 }}
        className="mx-auto w-24 h-24 rounded-full flex items-center justify-center text-[42px] mb-7"
        style={{
          background: "radial-gradient(circle at 35% 30%, rgba(124,92,255,.5), rgba(124,92,255,.12))",
          boxShadow: "0 0 70px rgba(124,92,255,.45)",
        }}
      >
        ✦
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <p className="text-[11px] font-bold tracking-[0.28em] text-emerald-400/90 mb-3 font-ui">IDENTITY COMPLETE</p>
        <h1 className="text-[34px] leading-tight font-extrabold font-display">
          WELCOME,{displayName.trim() ? <br /> : null}
          <span className="uppercase tracking-wide" style={{ color: "#B9A6FF" }}>{displayName.trim()}</span>
        </h1>
        <p className="mt-4 text-[13.5px] text-slate-400 font-ui">YOUR JOURNEY STARTS NOW.</p>

        <div className="flex items-center justify-center gap-2.5 mt-7">
          <div className="glass-dark rounded-2xl px-4 py-3">
            <p className="text-[9px] font-bold tracking-widest text-slate-400 font-ui">LEVEL</p>
            <p className="text-[20px] font-extrabold font-display tabular-nums">1</p>
          </div>
          <div className="glass-dark rounded-2xl px-4 py-3">
            <p className="text-[9px] font-bold tracking-widest text-slate-400 font-ui">BALANCE</p>
            <p className="text-[20px] font-extrabold font-display tabular-nums text-emerald-300">100 ST</p>
          </div>
          <div className="glass-dark rounded-2xl px-4 py-3">
            <p className="text-[9px] font-bold tracking-widest text-slate-400 font-ui">STREAK</p>
            <p className="text-[20px] font-extrabold font-display">🔥 Ready</p>
          </div>
        </div>
        <p className="mt-5 text-[12.5px] text-slate-500 font-ui">Your first mission is waiting.</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="mt-9">
        <button onClick={onEnter} className="btn-neon">ENTER SAURABHTASK</button>
      </motion.div>
    </div>
  );
}
