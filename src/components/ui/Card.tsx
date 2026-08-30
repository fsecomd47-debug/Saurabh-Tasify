"use client";

import React from "react";
import { cn } from "@/lib/utils";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "elevated" | "flat" | "wealth";
  padding?: "none" | "sm" | "md" | "lg";
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[20px] transition-all duration-200",
          {
            "bg-surface shadow-card border border-border-light": variant === "default",
            "bg-surface shadow-card-hover": variant === "elevated",
            "bg-surface-secondary": variant === "flat",
            "bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white shadow-wealth": variant === "wealth",
          },
          {
            "p-0": padding === "none",
            "p-3": padding === "sm",
            "p-5": padding === "md",
            "p-6": padding === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
