"use client";

import React from "react";
import { cn } from "@/lib/utils";

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          {
            "bg-surface text-text-primary shadow-soft border border-border-light": variant === "default",
            "bg-brand-500 text-white shadow-sm": variant === "primary",
            "bg-transparent text-text-secondary hover:bg-surface-secondary": variant === "ghost",
          },
          {
            "w-8 h-8 text-[14px]": size === "sm",
            "w-10 h-10 text-[16px]": size === "md",
            "w-12 h-12 text-[18px]": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
