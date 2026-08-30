"use client";

/**
 * PDR-4.1 §19-20: Camera Permission Screen
 * Shows camera consent with clear "required" vs "optional" indication.
 * §29: If camera verification is enabled by policy, user must consciously choose.
 */

import React from "react";
import { motion } from "framer-motion";
import { Video, Shield, CheckCircle2, XCircle, Camera } from "lucide-react";

type Props = {
  onAllow: () => void;
  onCancel: () => void;
  onSkip?: () => void;
  mode: "focus" | "pose";
  optional?: boolean;
};

const MODE_TEXT = {
  focus: {
    title: "FOCUS SESSION VERIFICATION",
    description: "This mission may use your camera to verify presence during the focus session.",
    optionalDescription: "Camera verification is optional. You can complete this mission without it.",
    details: [
      "Camera checks for person presence periodically",
      "No video is recorded or stored",
      "Processing happens on your device",
      "You can pause or stop anytime",
    ],
  },
  pose: {
    title: "POSE VERIFICATION",
    description: "This mission uses your camera to count exercise repetitions.",
    optionalDescription: "Camera verification is optional.",
    details: [
      "Camera tracks body pose for rep counting",
      "No video is recorded or stored",
      "Processing happens on your device",
      "Keep full body in frame for best results",
    ],
  },
};

export function CameraPermissionScreen({ onAllow, onCancel, onSkip, mode, optional = false }: Props) {
  const config = MODE_TEXT[mode];

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="w-16 h-16 rounded-full bg-[#EDEDFC] flex items-center justify-center mx-auto mb-4">
          <Video className="w-7 h-7 text-[#5E5CE6]" strokeWidth={1.8} />
        </div>

        <h2 className="text-[18px] font-bold text-[#1C1C1E] text-center mb-1">{config.title}</h2>
        <p className="text-[13px] text-[#8E8E93] text-center mb-2">
          {optional ? config.optionalDescription : config.description}
        </p>

        {/* Required / Optional badge */}
        <div className="flex justify-center mb-6">
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
            optional
              ? "bg-[#F2F2F7] text-[#8E8E93]"
              : "bg-[#EDEDFC] text-[#5E5CE6]"
          }`}>
            {optional ? "OPTIONAL" : "REQUIRED"}
          </span>
        </div>

        <div className="bg-[#F2F2F7] rounded-[16px] p-4 mb-6">
          <h3 className="text-[11px] font-bold text-[#636366] uppercase tracking-wider mb-3">What happens</h3>
          <ul className="space-y-2">
            {config.details.map((detail, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-[#636366]">
                <CheckCircle2 className="w-4 h-4 text-[#34C759] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onAllow}
            className="w-full py-3.5 rounded-[14px] bg-[#5E5CE6] text-white text-[15px] font-semibold flex items-center justify-center gap-2"
            style={{ boxShadow: "0 8px 16px -4px rgba(94,92,230,0.3)" }}
          >
            <Shield className="w-4 h-4" /> ALLOW CAMERA
          </motion.button>

          {optional && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onSkip ?? onCancel}
              className="w-full py-3.5 rounded-[14px] bg-[#F2F2F7] text-[#1C1C1E] text-[15px] font-semibold flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> CONTINUE WITHOUT CAMERA
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            className="w-full py-3.5 rounded-[14px] bg-transparent text-[#8E8E93] text-[15px] font-semibold flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" /> CANCEL
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
