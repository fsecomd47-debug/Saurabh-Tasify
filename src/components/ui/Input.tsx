"use client";

import React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-[13px] font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full h-11 rounded-[12px] border bg-surface px-4 text-[14px] text-text-primary",
              "placeholder:text-text-tertiary transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
              error ? "border-danger" : "border-border",
              icon && "pl-10",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-[12px] text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
