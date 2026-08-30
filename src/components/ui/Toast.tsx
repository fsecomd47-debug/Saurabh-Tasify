"use client";

import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, XCircle, Info } from "lucide-react";
import { useUIStore } from "@/store/ui-store";

const AUTO_DISMISS_MS = 3000;

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  const icons = {
    success: (
      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
        <Check className="w-3 h-3 text-white" strokeWidth={3} />
      </div>
    ),
    error: (
      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
        <XCircle className="w-3 h-3 text-white" strokeWidth={3} />
      </div>
    ),
    info: (
      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
        <Info className="w-3 h-3 text-white" strokeWidth={3} />
      </div>
    ),
  };

  const dismiss = useCallback(
    (id: string) => {
      removeToast(id);
    },
    [removeToast]
  );

  return (
    <div className="absolute top-14 left-4 right-4 z-[100] flex flex-col items-center gap-2 pointer-events-none" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            icon={icons[toast.type]}
            onDismiss={dismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

type ToastItemProps = {
  toast: { id: string; message: string; type: "success" | "error" | "info" };
  icon: React.ReactNode;
  onDismiss: (id: string) => void;
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, icon, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="pointer-events-auto w-full max-w-[340px]"
    >
      <div
        className="flex items-center gap-2.5 rounded-full px-4 py-2.5"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.4)",
          boxShadow:
            "0 8px 32px -4px rgba(0,0,0,0.08), 0 2px 8px -2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        {icon}
        <p className="text-[13px] font-medium text-slate-800 flex-1 truncate font-ui">
          {toast.message}
        </p>
      </div>
    </motion.div>
  );
};
