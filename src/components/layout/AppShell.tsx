"use client";

import React from "react";
import { RouteTransition } from "@/components/layout/RouteTransition";

type AppShellProps = {
  children: React.ReactNode;
};

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return <RouteTransition>{children}</RouteTransition>;
};
