"use client";

import React, { RefObject } from "react";
import { motion } from "framer-motion";
import { Home, BarChart3, Trophy, Wallet, Plus, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useRouter, usePathname } from "next/navigation";

type NavItem = {
  id: string;
  label: string;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
};

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", path: "/home", icon: Home },
  { id: "social", label: "Social", path: "/social", icon: Users },
  { id: "tasks", label: "Missions", path: "/tasks", icon: BarChart3 },
  { id: "vault", label: "Vault", path: "/vault", icon: Wallet },
  { id: "profile", label: "Profile", path: "/profile", icon: User },
];

type BottomNavProps = {
  scrollContainerRef?: RefObject<HTMLElement | null>;
};

export const BottomNav: React.FC<BottomNavProps> = ({ scrollContainerRef }) => {
  const { openModal } = useUIStore();
  const showNav = useScrollDirection(scrollContainerRef ?? { current: null });
  const router = useRouter();
  const pathname = usePathname();

  const activeId =
    NAV_ITEMS.find((item) => item.path === pathname)?.id ||
    (pathname.startsWith("/home") ? "home" : pathname.startsWith("/vault") ? "vault" : pathname.startsWith("/social") ? "social" : pathname.startsWith("/leaderboard") ? "social" : "home");

  return (
    <motion.div
      animate={showNav ? { y: 0 } : { y: "110%" }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="absolute bottom-0 left-0 right-0 z-50"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)",
      }}
    >
      {/* Frosted glass dock */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(242, 242, 247, 0.72)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: "0.5px solid rgba(0,0,0,0.06)",
        }}
      />

      {/* Nav pill */}
      <div className="relative px-5 pt-2 pb-1">
        <div
          className="flex items-center justify-around rounded-[16px] h-12 px-1"
          style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)",
            border: "0.5px solid rgba(0,0,0,0.04)",
          }}
        >
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <NavItemButton key={item.id} item={item} isActive={activeId === item.id} onClick={() => router.push(item.path)} />
          ))}

          <div className="relative -mt-5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => openModal("addTask")}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white"
              style={{
                background: "#5E5CE6",
                boxShadow: "0 4px 12px rgba(94,92,230,0.35)",
                border: "3px solid #F2F2F7",
              }}
              aria-label="Mint Mission"
            >
              <Plus className="text-xl font-bold" strokeWidth={2.5} />
            </motion.button>
          </div>

          {NAV_ITEMS.slice(2).map((item) => (
            <NavItemButton key={item.id} item={item} isActive={activeId === item.id} onClick={() => router.push(item.path)} />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

function NavItemButton({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={item.label}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-[12px] transition-all duration-200",
        isActive ? "text-[#5E5CE6]" : "text-[#8E8E93] hover:text-[#636366]"
      )}>
      <div
        className={cn("w-8 h-8 rounded-[10px] flex items-center justify-center transition-all duration-200", isActive ? "bg-[#EDE9FE]" : "")}
        style={isActive ? { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 3px rgba(94,92,230,0.15)" } : {}}
      >
        <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.4 : 1.8} aria-hidden="true" />
      </div>
      <span className={cn("text-[9px] font-bold mt-0.5", isActive ? "text-[#5E5CE6]" : "text-[#8E8E93]")}>
        {item.label}
      </span>
    </button>
  );
}
