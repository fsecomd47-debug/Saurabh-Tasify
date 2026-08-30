"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { ReturnMiningSummary } from "@/components/pets/ReturnMiningSummary";
import { LevelUpCelebration } from "@/components/pets/LevelUpCelebration";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <MotionConfig reducedMotion="user">
        {children}
        <ReturnMiningSummary />
        <LevelUpCelebration />
      </MotionConfig>
    </QueryClientProvider>
  );
}
