"use client";

import React from "react";
import { cn } from "@/lib/utils";

type DividerProps = React.HTMLAttributes<HTMLDivElement> & {
  spacing?: "sm" | "md" | "lg";
};

export const Divider: React.FC<DividerProps> = ({
  className,
  spacing = "md",
  ...props
}) => {
  return (
    <div
      className={cn(
        "w-full h-px bg-border",
        {
          "my-2": spacing === "sm",
          "my-4": spacing === "md",
          "my-6": spacing === "lg",
        },
        className
      )}
      {...props}
    />
  );
};
