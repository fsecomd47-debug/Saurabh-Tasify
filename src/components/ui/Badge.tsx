"use client";

import React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "danger" | "warning" | "brand";
  size?: "sm" | "md";
};

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  size = "sm",
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full whitespace-nowrap",
        {
          "bg-slate-100 text-slate-600 border border-slate-200/60": variant === "default",
          "bg-emerald-50 text-emerald-600 border border-emerald-200/60": variant === "success",
          "bg-red-50 text-red-600 border border-red-200/60": variant === "danger",
          "bg-amber-50 text-amber-600 border border-amber-200/60": variant === "warning",
          "bg-vault-primary/10 text-vault-primary border border-vault-primary/15": variant === "brand",
        },
        {
          "px-2 py-0.5 text-[10px]": size === "sm",
          "px-3 py-1 text-[12px]": size === "md",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
