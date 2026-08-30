"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useScreenRef } from "@/components/layout/DeviceShell";

export function ClientPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const screenRef = useScreenRef();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const target = screenRef.current ?? document.body;
  return createPortal(children, target);
}
