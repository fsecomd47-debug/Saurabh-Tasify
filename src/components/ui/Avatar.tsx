"use client";

import React from "react";
import { cn } from "@/lib/utils";

type AvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  emoji?: string;
  size?: "sm" | "md" | "lg" | "xl";
  ring?: boolean;
};

export const Avatar: React.FC<AvatarProps> = ({
  className,
  emoji = "👤",
  size = "md",
  ring = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-brand-100 flex-shrink-0",
        ring && "ring-2 ring-white ring-offset-2 ring-offset-brand-100",
        {
          "w-8 h-8 text-[14px]": size === "sm",
          "w-10 h-10 text-[18px]": size === "md",
          "w-12 h-12 text-[22px]": size === "lg",
          "w-16 h-16 text-[28px]": size === "xl",
        },
        className
      )}
      {...props}
    >
      {children || <span>{emoji}</span>}
    </div>
  );
};
