"use client";

import React, { useCallback, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Flame, Zap, TrendingUp } from "lucide-react";

export function HeroDevice() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 150, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const stats = [
    { icon: Flame, label: "STREAK", value: "14d", color: "#EF4444" },
    { icon: Zap, label: "MULTI", value: "\u00d71.8", color: "#38BDF8" },
    { icon: TrendingUp, label: "RANK", value: "#23", color: "#10B981" },
  ];

  return (
    <div ref={containerRef} className="relative w-full flex justify-center" onMouseMove={handleMouseMove} onMouseEnter={() => setHovered(true)} onMouseLeave={handleMouseLeave}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 500, height: 500, background: "radial-gradient(circle, rgba(155,93,229,0.25) 0%, rgba(124,92,255,0.12) 40%, transparent 70%)", filter: "blur(40px)" }} />
      <motion.div style={{ rotateX, rotateY, transformPerspective: 1200, transformStyle: "preserve-3d" }} className="relative">
        <div className="relative overflow-hidden" style={{ width: "min(320px, 80vw)", aspectRatio: "9 / 19.5", borderRadius: 48, padding: 2, background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.02) 100%)", boxShadow: hovered ? "0 30px 60px -12px rgba(0,0,0,0.7), 0 0 80px rgba(124,92,255,0.2), inset 0 1px 2px rgba(255,255,255,0.25)" : "0 30px 60px -12px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.25)", transition: "box-shadow 0.4s ease" }}>
          <div className="w-full h-full overflow-hidden relative" style={{ borderRadius: 46, background: "rgba(0,0,0,0.85)" }}>
            <div className="w-full h-full overflow-hidden relative" style={{ borderRadius: 42, background: "linear-gradient(180deg, #0f0a1a 0%, #1a1030 40%, #0f0a1a 100%)", backdropFilter: "blur(24px) saturate(180%)" }}>
              <div className="absolute top-[10px] left-1/2 -translate-x-1/2 z-20" style={{ width: "36%", height: 28, borderRadius: 14, background: "rgba(0,0,0,0.9)", boxShadow: "inset 0 0 3px rgba(255,255,255,0.06)" }}>
                <div className="absolute right-3 top-1/2 -translate-y-1/2" style={{ width: 10, height: 10, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #1a1a3a, #050510)", boxShadow: "inset 0 0 2px rgba(255,255,255,0.12)" }} />
              </div>
              <div className="flex items-center justify-between px-6 pt-[44px] pb-1 relative z-10">
                <span className="text-[11px] font-semibold text-white/80">9:41</span>
                <div className="flex items-center gap-1">
                  <svg width="14" height="10" viewBox="0 0 17 12" fill="white" opacity={0.8}><rect x="0" y="9" width="3" height="3" rx="0.5" /><rect x="4.5" y="6" width="3" height="6" rx="0.5" /><rect x="9" y="3" width="3" height="9" rx="0.5" /><rect x="13.5" y="0" width="3" height="12" rx="0.5" /></svg>
                  <svg width="22" height="11" viewBox="0 0 27 13" fill="white" opacity={0.8}><rect x="0.5" y="0.5" width="22" height="12" rx="2.5" stroke="white" strokeWidth="0.5" fill="none" opacity={0.5} /><rect x="2" y="2" width="17" height="9" rx="1.5" /></svg>
                </div>
              </div>
              <div className="relative z-10 px-4 pt-3 space-y-3">
                <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.15), rgba(59,7,100,0.12))", border: "1px solid rgba(154,124,255,0.2)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold tracking-widest text-violet-300/70">PORTFOLIO</span>
                    <span className="text-[9px] font-bold text-slate-500">LVL 12</span>
                  </div>
                  <p className="text-[28px] font-extrabold text-white leading-none tabular-nums">4,280 <span className="text-[13px] text-violet-300 font-bold">ST</span></p>
                  <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: "68%", background: "linear-gradient(90deg, #7C5CFF, #9A7CFF)" }} />
                  </div>
                  <p className="text-[8px] text-slate-500 mt-1">680 / 1000 XP to Level 13</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {stats.map((s) => (
                    <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <s.icon className="w-3 h-3 mx-auto mb-1" style={{ color: s.color }} strokeWidth={2.5} />
                      <p className="text-[13px] font-extrabold text-white leading-none">{s.value}</p>
                      <p className="text-[7px] text-slate-500 mt-0.5 tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,92,255,0.2)" }}>
                      <span className="text-[10px]">&#x2728;</span>
                    </div>
                    <span className="text-[9px] font-bold tracking-wider text-violet-300/80">ACTIVE MISSION</span>
                  </div>
                  <p className="text-[12px] font-bold text-white">Review morning notes</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-emerald-400/15 text-emerald-300 tabular-nums">+120 ST</span>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-violet-400/15 text-violet-300 tabular-nums">+50 XP</span>
                  </div>
                </div>
                <div className="rounded-2xl p-3" style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.08), rgba(59,7,100,0.06))", border: "1px solid rgba(154,124,255,0.15)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold tracking-wider text-violet-300/70">WEEKLY GRIND</span>
                  </div>
                  <div className="flex gap-1.5">
                    {["M","T","W","T","F","S","S"].map((d, i) => (
                      <div key={i} className="flex-1 text-center">
                        <div className="w-full aspect-square rounded-lg mb-0.5 flex items-center justify-center" style={{ background: i < 5 ? "rgba(124,92,255,0.25)" : "rgba(255,255,255,0.04)", border: i === 4 ? "1px solid rgba(154,124,255,0.5)" : "1px solid rgba(255,255,255,0.04)" }}>
                          {i < 5 && <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
                        </div>
                        <span className="text-[7px] text-slate-500">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-16 z-20" style={{ background: "linear-gradient(transparent, #0f0a1a)" }} />
            </div>
          </div>
        </div>
        <div className="absolute -left-[3px] top-[18%] w-[3px] h-[10%] rounded-l-sm" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))" }} />
        <div className="absolute -left-[3px] top-[26%] w-[3px] h-[16%] rounded-l-sm" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))" }} />
        <div className="absolute -left-[3px] top-[36%] w-[3px] h-[16%] rounded-l-sm" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))" }} />
        <div className="absolute -right-[3px] top-[30%] w-[3px] h-[22%] rounded-r-sm" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))" }} />
        <div className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-[36%] h-[3px] rounded-b-sm" style={{ background: "rgba(255,255,255,0.06)" }} />
      </motion.div>
    </div>
  );
}