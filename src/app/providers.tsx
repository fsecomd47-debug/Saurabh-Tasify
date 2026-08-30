"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { authClient } from "@/lib/auth/client";
import { ReturnMiningSummary } from "@/components/pets/ReturnMiningSummary";
import { LevelUpCelebration } from "@/components/pets/LevelUpCelebration";

function Link({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return <NextLink href={href} className={className}>{children}</NextLink>;
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: 1 },
        },
      })
  );

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => {
        router.refresh();
      }}
      redirectTo="/home"
      Link={Link as any}
    >
      <QueryClientProvider client={client}>
        <MotionConfig reducedMotion="user">
          {children}
          <ReturnMiningSummary />
          <LevelUpCelebration />
        </MotionConfig>
      </QueryClientProvider>
    </NeonAuthUIProvider>
  );
}
