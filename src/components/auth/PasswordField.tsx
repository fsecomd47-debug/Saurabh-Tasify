"use client";

import React, { useMemo, useState } from "react";

/** 0–4 password strength score with honest, non-theater feedback. */
export function scorePassword(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 0.5;
  if (/[^A-Za-z0-9]/.test(pw)) score += 0.5;
  return Math.min(4, Math.floor(score));
}

const LABELS = ["Too weak", "Weak", "Okay", "Strong", "Excellent"];
const COLORS = ["#EF4444", "#F97316", "#EAB308", "#22C55E", "#10B981"];

export const PasswordField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  className?: string;
}> = ({ value, onChange, onSubmitEditing, autoFocus, className = "" }) => {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const score = useMemo(() => scorePassword(value), [value]);

  return (
    <div className="ios-glass-input-wrapper">
      <input
        type={show ? "text" : "password"}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmitEditing?.()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Create a password"
        autoComplete="new-password"
        aria-label="Password"
        className={`ios-glass-input ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="ios-glass-input-reveal"
        tabIndex={0}
      >
        {show ? "HIDE" : "SHOW"}
      </button>
    </div>
  );
};
