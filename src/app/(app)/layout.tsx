import { redirect } from "next/navigation";
import { getAuthContext } from "@/server/session";

/** SERVER-SIDE protected route gate. */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  return <>{children}</>;
}
