"use client";

import React from "react";
import { Plus } from "lucide-react";
import { useUIStore } from "@/store/ui-store";

type TopBarProps = {
  title?: string;
  subtitle?: string;
  showAction?: boolean;
  onAction?: () => void;
  rightAction?: React.ReactNode;
};

export const TopBar: React.FC<TopBarProps> = ({
  title = "SaurabhTask",
  subtitle,
  showAction = true,
  onAction,
  rightAction,
}) => {
  const openModal = useUIStore((s) => s.openModal);

  return (
    <div className="flex justify-between items-center px-5 pt-1 pb-3">
      <div className="flex-1">
        <h1 className="text-[22px] font-bold text-[#1C1C1E] leading-tight" style={{ letterSpacing: "-0.02em" }}>{title}</h1>
        {subtitle && <p className="text-[12px] font-medium text-[#8E8E93] mt-0.5">{subtitle}</p>}
      </div>

      {rightAction || (
        showAction && (
          <button onClick={onAction || (() => openModal("addTask"))}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#1C1C1E]"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }} aria-label="Add">
            <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
          </button>
        )
      )}
    </div>
  );
};
