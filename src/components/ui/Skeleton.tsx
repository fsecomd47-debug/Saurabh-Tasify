"use client";

import React from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  width?: string;
  height?: string;
  rounded?: "sm" | "md" | "lg" | "full";
};

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  rounded = "md",
  ...props
}) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-surface-secondary",
        {
          "rounded-[10px]": rounded === "sm",
          "rounded-[16px]": rounded === "md",
          "rounded-[24px]": rounded === "lg",
          "rounded-full": rounded === "full",
        },
        className
      )}
      style={{ width, height }}
      {...props}
    />
  );
};
