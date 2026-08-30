"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Tab = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

type TabsProps = {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
};

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex bg-surface-secondary rounded-[14px] p-1 gap-1",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-[12px] text-[13px] font-semibold transition-all duration-200",
            activeTab === tab.id
              ? "bg-white text-[#1C1C1E] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]"
              : "text-[#8E8E93] hover:text-[#636366]"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
};
