"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, Shield } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/layout/TopBar";
import { useSnapshot } from "@/hooks/queries";
import { httpClient } from "@/types/api";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const { data: snap } = useSnapshot();
  const [loggingOut, setLoggingOut] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacy, setPrivacy] = useState({
    profileVisibility: "public" as "public" | "friends" | "private",
    activityVisibility: "public" as "public" | "friends" | "private",
    allowFriendRequests: true,
    allowMessages: "everyone" as "everyone" | "friends" | "nobody",
    allowChallenges: "everyone" as "everyone" | "friends" | "nobody",
  });

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await httpClient.post("/api/auth/logout");
    } finally {
      router.replace("/login");
    }
  }

  async function savePrivacy() {
    setSavingPrivacy(true);
    try {
      await httpClient.patch("/api/social/profile", privacy);
    } finally {
      setSavingPrivacy(false);
    }
  }

  function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-11 h-6 rounded-full transition-colors relative",
          value ? "bg-[#34C759]" : "bg-[#E5E5EA]"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
            value ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
    );
  }

  function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
  }: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
  }) {
    return (
      <div className="flex gap-1 bg-[#F2F2F7] rounded-[10px] p-0.5">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 py-1.5 rounded-[8px] text-[11px] font-semibold transition-all",
              value === opt.value
                ? "bg-white text-[#1C1C1E] shadow-sm"
                : "text-[#8E8E93]"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <AppShell>
      <TopBar title="Settings" subtitle="Account & preferences" />

      <div className="px-6 mt-2 pb-8 space-y-3">
        {/* Account */}
        <section className="rounded-3xl p-4 bg-white" style={{ boxShadow: "0 8px 24px -4px rgba(0,0,0,.06)", border: "1px solid rgba(0,0,0,.04)" }}>
          <h3 className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase font-ui mb-3">Account</h3>
          <Row label="Email" value={snap?.email ?? "—"} />
          <Row label="Player name" value={snap?.profile.displayName ?? "—"} />
          <Row label="Timezone" value={snap?.profile.timezone ?? "UTC"} />
        </section>

        {/* Social Privacy */}
        <section className="rounded-3xl p-4 bg-white" style={{ boxShadow: "0 8px 24px -4px rgba(0,0,0,.06)", border: "1px solid rgba(0,0,0,.04)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#5E5CE6]" />
            <h3 className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase font-ui">Social Privacy</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[12.5px] text-slate-600 font-ui block mb-1.5">Who can see your profile?</label>
              <SegmentedControl
                options={[
                  { value: "public" as const, label: "Everyone" },
                  { value: "friends" as const, label: "Friends" },
                  { value: "private" as const, label: "Nobody" },
                ]}
                value={privacy.profileVisibility}
                onChange={(v) => setPrivacy({ ...privacy, profileVisibility: v })}
              />
            </div>

            <div>
              <label className="text-[12.5px] text-slate-600 font-ui block mb-1.5">Who can see your activity?</label>
              <SegmentedControl
                options={[
                  { value: "public" as const, label: "Everyone" },
                  { value: "friends" as const, label: "Friends" },
                  { value: "private" as const, label: "Nobody" },
                ]}
                value={privacy.activityVisibility}
                onChange={(v) => setPrivacy({ ...privacy, activityVisibility: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[12.5px] text-slate-600 font-ui">Allow friend requests</span>
              <Toggle
                value={privacy.allowFriendRequests}
                onChange={(v) => setPrivacy({ ...privacy, allowFriendRequests: v })}
              />
            </div>

            <div>
              <label className="text-[12.5px] text-slate-600 font-ui block mb-1.5">Who can message you?</label>
              <SegmentedControl
                options={[
                  { value: "everyone" as const, label: "Everyone" },
                  { value: "friends" as const, label: "Friends" },
                  { value: "nobody" as const, label: "Nobody" },
                ]}
                value={privacy.allowMessages}
                onChange={(v) => setPrivacy({ ...privacy, allowMessages: v })}
              />
            </div>

            <div>
              <label className="text-[12.5px] text-slate-600 font-ui block mb-1.5">Who can challenge you?</label>
              <SegmentedControl
                options={[
                  { value: "everyone" as const, label: "Everyone" },
                  { value: "friends" as const, label: "Friends" },
                  { value: "nobody" as const, label: "Nobody" },
                ]}
                value={privacy.allowChallenges}
                onChange={(v) => setPrivacy({ ...privacy, allowChallenges: v })}
              />
            </div>

            <button
              onClick={savePrivacy}
              disabled={savingPrivacy}
              className="w-full py-2.5 rounded-[12px] bg-[#5E5CE6] text-white text-[13px] font-bold flex items-center justify-center gap-2"
            >
              {savingPrivacy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {savingPrivacy ? "Saving..." : "Save Privacy Settings"}
            </button>
          </div>
        </section>

        {/* Session security info */}
        <section className="rounded-3xl p-4 bg-white" style={{ boxShadow: "0 8px 24px -4px rgba(0,0,0,.06)" }}>
          <h3 className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase font-ui mb-3">Security</h3>
          <p className="text-[12px] text-slate-500 font-ui leading-relaxed">
            Your session is protected with an HTTP-only secure cookie and expires after 30 days.
            All economy actions are validated server-side.
          </p>
        </section>

        <button
          onClick={() => void logout()}
          disabled={loggingOut}
          className="w-full py-3.5 rounded-2xl text-[14px] font-bold font-display flex items-center justify-center gap-2 bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors"
        >
          {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" strokeWidth={2.2} />}
          SIGN OUT
        </button>

        <p className="text-center text-[10.5px] text-slate-300 font-ui pt-1">SaurabhTask · PDR-2 · Your journey persists.</p>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12.5px] text-slate-400 font-ui">{label}</span>
      <span className="text-[12.5px] font-bold text-slate-900 font-ui truncate max-w-[180px]">{value}</span>
    </div>
  );
}
