"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DiscoverPage() {
  const router = useRouter();
  useEffect(() => {
    /* Discover is accessed via the onboarding flow — redirect to start if direct */
    router.replace("/start");
  }, [router]);
  return null;
}
