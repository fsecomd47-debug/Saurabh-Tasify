"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 bg-surface rounded-t-[24px] z-[90] max-h-[85vh] overflow-hidden",
              "shadow-[0_-8px_30px_rgba(0,0,0,0.1)]",
              className
            )}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            {title && (
              <div className="flex items-center justify-between px-5 pb-4 border-b border-border-light">
                <h3 className="text-[17px] font-semibold text-text-primary font-display">{title}</h3>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface-secondary flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto max-h-[calc(85vh-60px)] p-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
