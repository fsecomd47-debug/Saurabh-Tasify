"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useAnimation, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowUpRight, User } from "lucide-react";

const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif';

const AVATAR_MAP: Record<string, { emoji: string; label: string; gradient: string }> = {
  wolf:   { emoji: "🐺", label: "WOLF",   gradient: "linear-gradient(135deg, #6B7280 0%, #374151 100%)" },
  tiger:  { emoji: "🐯", label: "TIGER",  gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" },
  ninja:  { emoji: "🥷", label: "NINJA",  gradient: "linear-gradient(135deg, #1F2937 0%, #111827 100%)" },
  wizard: { emoji: "🧙", label: "WIZARD", gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)" },
  dragon: { emoji: "🐉", label: "DRAGON", gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)" },
  phoenix:{ emoji: "🔥", label: "PHOENIX",gradient: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)" },
};

interface ProfileCardProps {
  avatarUrl?: string;
  avatarId?: string | null;
  name: string;
  title?: string;
  bio?: string;
  actionText?: string;
  onAction?: () => void;
  typing?: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  avatarUrl,
  avatarId,
  name,
  title = "New Player",
  bio = "Ready to start your productive journey. Every quest completed earns real rewards.",
  actionText = "Continue",
  onAction,
  typing = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const controls = useAnimation();
  const bounceRef = useRef(null);
  const scale = useMotionValue(1);
  const rotate = useTransform(scale, [1, 1.15], [-3, 3]);

  const avatar = avatarId ? AVATAR_MAP[avatarId] : null;
  const emoji = avatar?.emoji;
  const gradient = avatar?.gradient;

  // Bounce the avatar when typing
  useEffect(() => {
    if (typing && emoji) {
      controls.start({
        scale: [1, 1.2, 0.9, 1.1, 1],
        rotate: [0, -8, 8, -4, 0],
        transition: { duration: 0.5, ease: "easeInOut" },
      });
    }
  }, [typing, emoji, controls]);

  return (
    <div className="relative w-full" style={{ maxWidth: 414, margin: "0 auto" }}>
      <div
        className="relative flex flex-col items-center"
        style={{
          padding: "32px 20px",
          borderRadius: 24,
          border: "0.5px solid rgba(255,255,255,0.6)",
          background: "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.06)",
        }}
      >
        {/* Avatar */}
        <motion.div
          animate={controls}
          style={{ scale, rotate }}
          whileHover={{ scale: 1.08, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              padding: 3,
              border: "2px solid rgba(255,255,255,0.3)",
              marginBottom: 16,
              overflow: "hidden",
              background: gradient || "linear-gradient(135deg, #EDEDFC 0%, #F0EDFF 100%)",
              boxShadow: emoji ? `0 8px 24px ${gradient ? "rgba(0,0,0,0.2)" : "rgba(94,92,230,0.2)"}` : "none",
            }}
          >
            {emoji ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 44,
                  lineHeight: 1,
                }}
              >
                {emoji}
              </div>
            ) : avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={`${name}'s Avatar`}
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #EDEDFC 0%, #F0EDFF 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <User style={{ width: 40, height: 40, color: "#5E5CE6" }} />
              </div>
            )}
          </div>

          {/* Sparkle dots when typing */}
          {typing && emoji && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.2, 0],
                    x: [0, (Math.random() - 0.5) * 80],
                    y: [0, (Math.random() - 0.5) * 80 - 20],
                  }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.08,
                    ease: "easeOut",
                  }}
                  style={{
                    position: "absolute",
                    top: 40,
                    left: 44,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: i % 2 === 0 ? "#FFD700" : "#5E5CE6",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                />
              ))}
            </>
          )}
        </motion.div>

        {/* Name */}
        <motion.h2
          key={name}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 24, fontWeight: 700, color: "#1C1C1E", fontFamily: SF, textAlign: "center" }}
        >
          {name || "Your Name"}
        </motion.h2>

        {/* Title */}
        <p style={{ marginTop: 4, fontSize: 14, fontWeight: 500, color: "#5E5CE6", fontFamily: SF, textAlign: "center" }}>
          {title}
        </p>

        {/* Bio */}
        <p style={{ marginTop: 16, fontSize: 14, color: "#8E8E93", fontFamily: SF, textAlign: "center", lineHeight: 1.5, maxWidth: 280 }}>
          {bio}
        </p>

        {/* Divider */}
        <div style={{ width: "50%", height: 1, borderRadius: 1, background: "#E5E5EA", margin: "24px 0" }} />

        {/* Action Button */}
        <motion.button
          onClick={onAction}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center justify-center gap-2"
          style={{
            padding: "12px 28px",
            borderRadius: 9999,
            background: name.trim().length >= 2 ? "#1C1C1E" : "#D1D1D6",
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 600,
            fontFamily: SF,
            border: "none",
            cursor: name.trim().length >= 2 ? "pointer" : "not-allowed",
            boxShadow: name.trim().length >= 2 ? "0 4px 20px rgba(0,0,0,0.15)" : "none",
            transition: "background 0.2s",
          }}
        >
          <span>{actionText}</span>
          <ArrowUpRight style={{ width: 16, height: 16 }} />
        </motion.button>
      </div>

      {/* Glow effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 24,
          zIndex: -1,
          transition: "all 0.5s",
          filter: "blur(40px)",
          opacity: 0.25,
          background: gradient
            ? gradient.replace("100%", "50%").replace("0%", "50%")
            : "linear-gradient(135deg, rgba(94,92,230,0.5) 0%, rgba(168,85,247,0.5) 100%)",
        }}
      />
    </div>
  );
};

export { ProfileCard, AVATAR_MAP };
export type { ProfileCardProps };
