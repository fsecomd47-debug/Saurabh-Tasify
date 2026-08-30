"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", fullWidth, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.97]",
          "rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-primary focus-visible:ring-offset-2",
          "min-h-[44px] min-w-[44px]", /* Minimum touch target */
          {
            "bg-vault-primary text-white hover:bg-vault-secondary shadow-sm": variant === "primary",
            "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200": variant === "secondary",
            "bg-transparent text-slate-500 hover:bg-slate-100": variant === "ghost",
            "bg-red-500/10 text-red-500 hover:bg-red-500/20": variant === "danger",
            "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20": variant === "success",
          },
          {
            "h-10 px-3 text-[12px] gap-1.5": size === "sm",
            "h-12 px-5 text-[14px] gap-2": size === "md",
            "h-14 px-6 text-[15px] gap-2": size === "lg",
          },
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
