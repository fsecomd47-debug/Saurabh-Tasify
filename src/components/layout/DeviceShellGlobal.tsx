"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { DeviceShell, useScrollRef } from "@/components/layout/DeviceShell";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ToastContainer } from "@/components/ui/Toast";
import { AddTaskModal } from "@/components/modals/AddTaskModal";
import { TaskRewardModal } from "@/components/modals/TaskRewardModal";
import { ItemDetailModal } from "@/components/modals/ItemDetailModal";
import { DailyRewardModal } from "@/components/daily-rewards/DailyRewardModal";
import { AppBootstrap } from "@/components/layout/AppBootstrap";

type DeviceShellGlobalProps = {
  children: React.ReactNode;
};

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/start", "/create-player"];

function GlobalOverlays({ isAppRoute }: { isAppRoute: boolean }) {
  const scrollRef = useScrollRef();
  if (!isAppRoute) return null;
  return (
    <>
      <BottomNav scrollContainerRef={scrollRef} />
      <ToastContainer />
      <AddTaskModal />
      <TaskRewardModal />
      <ItemDetailModal />
      <DailyRewardModal />
    </>
  );
}

export const DeviceShellGlobal: React.FC<DeviceShellGlobalProps> = ({ children }) => {
  const pathname = usePathname();
  const isAppRoute = !PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  return (
    <DeviceShell
      theme="light"
      overlay={<GlobalOverlays isAppRoute={isAppRoute} />}
    >
      {isAppRoute ? <AppBootstrap>{children}</AppBootstrap> : children}
    </DeviceShell>
  );
};
