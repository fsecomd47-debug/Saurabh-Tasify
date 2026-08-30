"use client";

import dynamic from "next/dynamic";

const OnboardingFlow = dynamic(() => import("@/components/onboarding/OnboardingFlow"), { ssr: false });

export default function StartPage() {
  return <OnboardingFlow />;
}
