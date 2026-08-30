import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { DeviceShellGlobal } from "@/components/layout/DeviceShellGlobal";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export const metadata: Metadata = {
  title: "SaurabhTask — Your Productivity Becomes Your Wealth",
  description:
    "Complete tasks. Earn ST. Level up. Build streaks. Compete on the leaderboard. Your productivity journey, persisted.",
};

export const viewport: Viewport = {
  themeColor: "#f9fafb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <ErrorBoundary>
            <DeviceShellGlobal>{children}</DeviceShellGlobal>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
