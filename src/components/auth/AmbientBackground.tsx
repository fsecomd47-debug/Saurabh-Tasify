"use client";

import React, { useMemo } from "react";

/**
 * Ambient neon background — blurred gradient orbs + a light CSS particle
 * field. Pure transforms/opacity; honors prefers-reduced-motion via CSS
 * (spec §64).
 */
export const AmbientBackground: React.FC = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: `${(i * 71) % 100}%`,
        duration: `${12 + ((i * 7) % 12)}s`,
        delay: `${(i * 1.9) % 14}s`,
        opacity: 0.25 + ((i * 13) % 40) / 100,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="orb orb-a"
        style={{
          width: 340,
          height: 340,
          top: "-8%",
          right: "-12%",
          background: "radial-gradient(circle at 35% 35%, rgba(124,92,255,0.32), rgba(124,92,255,0.05) 70%)",
        }}
      />
      <div
        className="orb orb-b"
        style={{
          width: 300,
          height: 300,
          bottom: "6%",
          left: "-16%",
          background: "radial-gradient(circle at 60% 40%, rgba(90,50,200,0.28), rgba(59,7,100,0.04) 72%)",
        }}
      />
      <div className="particles">
        {particles.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={
              {
                left: p.left,
                top: "100%",
                "--p-duration": p.duration,
                "--p-delay": p.delay,
                "--p-opacity": p.opacity,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
};
