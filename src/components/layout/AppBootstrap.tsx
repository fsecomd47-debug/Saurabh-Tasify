"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Brief branded bootstrap state while session restores.
 * Shows for ~800ms max, then fades out.
 */
export function AppBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="bootstrap"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{ background: "#F2F2F7" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "linear-gradient(135deg, #7C5CFF, #5E5CE6)",
                  boxShadow: "0 8px 24px -4px rgba(124,92,255,0.35)",
                }}
              >
                <span className="text-white text-[20px] font-extrabold">S</span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#8E8E93",
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                  letterSpacing: "0.02em",
                }}
              >
                Restoring your journey...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
