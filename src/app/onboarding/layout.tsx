import { redirect } from "next/navigation";
import { getAuthContext } from "@/server/session";

/** Onboarding is optional — only accessible if logged in. */
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return <div className="relative z-10 flex flex-col flex-1">{children}</div>;
}
