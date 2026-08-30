"use client";

/**
 * PDR-4 §25-§27 + §74: Camera readiness checks backed by real evidence.
 * Stream health and lighting come from the unified CameraSession monitor;
 * person presence is verified later against actual pose landmarks.
 */

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, RotateCcw, VideoOff } from "lucide-react";
import { CameraSession, type CameraHealth, type CameraIssue } from "./camera-session";

type Props = {
  mode: "pose";
  onReady: () => void;
  onCancel: () => void;
};

type CheckStatus = "checking" | "pass" | "fail";

const ISSUE_GUIDANCE: Record<Exclude<CameraIssue, null>, string> = {
  PERMISSION_DENIED: "Allow camera access to continue.",
  NO_DEVICE: "No camera was found on this device.",
  INSECURE_CONTEXT: "Camera needs a secure (https) connection.",
  TRACK_ENDED: "The camera disconnected unexpectedly.",
  FROZEN_FRAME: "The camera feed looks frozen. Try switching cameras.",
  SCENE_DARK: "The scene is too dark. Add more light.",
  LOCK_HELD: "Another camera session is still active.",
};

export function CameraCheckScreen({ mode, onReady, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CameraSession | null>(null);

  const [cameraState, setCameraState] = useState<"loading" | "active" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [health, setHealth] = useState<CameraHealth | null>(null);
  const [issue, setIssue] = useState<CameraIssue>(null);
  const [stableMs, setStableMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const video = videoRef.current;

    async function setup() {
      if (!video) return;
      const session = CameraSession.tryAcquire();
      if (!session) {
        setErrorMsg(ISSUE_GUIDANCE.LOCK_HELD);
        setCameraState("error");
        return;
      }
      sessionRef.current = session;

      session.onHealth((h, camIssue) => {
        if (cancelled) return;
        setHealth(h);
        setIssue(camIssue);
      });

      try {
        await session.start(video, {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        });
        if (cancelled) return;
        setCameraState("active");
      } catch (err) {
        if (cancelled) return;
        const issueCode = (err as Error & { issue?: CameraIssue }).issue ?? "PERMISSION_DENIED";
        setErrorMsg(ISSUE_GUIDANCE[issueCode] ?? "Camera could not start.");
        setCameraState("error");
      }
    }

    setup();

    return () => {
      cancelled = true;
      sessionRef.current?.stop();
      sessionRef.current = null;
    };
  }, [mode]);

  /* Stability timer — feed must play steadily for 2s before ready. */
  useEffect(() => {
    if (cameraState !== "active" || !health?.healthy) return;
    const timer = setInterval(() => setStableMs((ms) => ms + 250), 250);
    return () => clearInterval(timer);
  }, [cameraState, health?.healthy]);

  const ready =
    cameraState === "active" && !!health?.healthy && stableMs >= 2000 && issue === null;

  useEffect(() => {
    if (!ready) return;
    const timeout = setTimeout(async () => {
      await sessionRef.current?.stop();
      sessionRef.current = null;
      onReady();
    }, 350);
    return () => clearTimeout(timeout);
  }, [ready, onReady]);

  const checks: Array<{ label: string; status: CheckStatus }> = [
    {
      label: "Camera accessible",
      status: cameraState === "loading" ? "checking" : cameraState === "active" ? "pass" : "fail",
    },
    { label: "Feed playing", status: health?.videoPlaying ? "pass" : cameraState === "error" ? "fail" : "checking" },
    { label: "Enough light", status: health === null ? "checking" : health.sceneVisible ? "pass" : "fail" },
  ];

  return (
    <div className="flex flex-col items-center gap-5 py-6 px-5">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-[360px]">
        <h2 className="text-[18px] font-bold text-[#1C1C1E] text-center mb-1">CAMERA CHECK</h2>
        <p className="text-[13px] text-[#8E8E93] text-center mb-5">Getting your camera ready</p>

        <div className="relative w-full rounded-[20px] overflow-hidden bg-black mb-5" style={{ aspectRatio: "4/3" }}>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

          {cameraState === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <Loader2 size={32} color="#fff" className="animate-spin mb-2" />
              <p className="text-[12px] text-white/80">Starting camera…</p>
            </div>
          )}

          {cameraState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 px-6">
              <VideoOff size={32} color="rgba(255,255,255,0.6)" className="mb-2" />
              <p className="text-[12px] text-white/85 text-center">{errorMsg}</p>
            </div>
          )}

          {cameraState === "active" && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full">
              <span className={`w-2 h-2 rounded-full ${health?.healthy ? "bg-[#FF3B30] animate-pulse" : "bg-white/40"}`} />
              <span className="text-[10px] font-bold tracking-wider text-white/90">CAMERA ACTIVE</span>
            </div>
          )}
        </div>

        {issue && cameraState === "active" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 bg-[#FFF4E5] rounded-[14px] p-3 mb-4"
          >
            <XCircle className="w-4 h-4 text-[#FF9500] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#8a5b00]">{ISSUE_GUIDANCE[issue]}</p>
          </motion.div>
        )}

        <div className="flex flex-col gap-2 mb-5">
          {checks.map((check, i) => (
            <motion.div
              key={check.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center justify-between px-4 py-3 rounded-[12px] bg-[#F2F2F7]"
            >
              <span className="text-[12px] text-[#636366]">{check.label}</span>
              {check.status === "checking" && <Loader2 size={16} color="#5E5CE6" className="animate-spin" />}
              {check.status === "pass" && <CheckCircle2 size={16} color="#34C759" strokeWidth={2.5} />}
              {check.status === "fail" && <XCircle size={16} color="#FF3B30" strokeWidth={2.5} />}
            </motion.div>
          ))}
        </div>

        {ready ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[14px] font-bold text-[#34C759] text-center mb-4">
            READY TO START
          </motion.p>
        ) : (
          <p className="text-[12px] text-[#8E8E93] text-center mb-4">Keep this screen open while we check your camera.</p>
        )}

        {cameraState === "error" && (
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-[14px] bg-[#FF3B30] text-white text-[13px] font-bold flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> GO BACK
          </button>
        )}

        <button onClick={onCancel} className="w-full py-3 rounded-[14px] text-[#8E8E93] text-[13px] font-semibold mt-1">
          CANCEL
        </button>
      </motion.div>
    </div>
  );
}
