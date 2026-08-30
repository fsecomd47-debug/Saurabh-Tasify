"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  max?: number;
  variant?: "default" | "brand" | "success";
  size?: "sm" | "md";
  showGlow?: boolean;
};

const GRADIENTS = {
  default: "linear-gradient(90deg, #94A3B8 0%, #CBD5E1 100%)",
  brand: "linear-gradient(90deg, #6B38C3 0%, #8A4FFF 85%, #A78BFA 100%)",
  success: "linear-gradient(90deg, #10B981 0%, #34D399 85%, #6EE7B7 100%)",
};

export const Progress: React.FC<ProgressProps> = ({
  className,
  value = 0,
  max = 100,
  variant = "brand",
  size = "md",
  showGlow = true,
  ...props
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        "w-full bg-slate-100 rounded-full overflow-hidden",
        {
          "h-1.5": size === "sm",
          "h-2.5": size === "md",
        },
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out relative"
        style={{
          width: `${percentage}%`,
          background: GRADIENTS[variant],
        }}
      >
        {showGlow && percentage > 5 && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/50 blur-[3px]" />
        )}
      </div>
    </div>
  );
};
