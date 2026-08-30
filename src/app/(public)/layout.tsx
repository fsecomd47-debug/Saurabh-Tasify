import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SaurabhTask — Your Productivity Becomes Your Wealth",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
