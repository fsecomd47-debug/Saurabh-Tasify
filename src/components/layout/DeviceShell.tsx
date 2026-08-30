"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";

const ScrollRefContext = createContext<React.RefObject<HTMLDivElement | null>>({ current: null });
export const useScrollRef = () => useContext(ScrollRefContext);

const ScreenRefContext = createContext<React.RefObject<HTMLDivElement | null>>({ current: null });
export const useScreenRef = () => useContext(ScreenRefContext);

type DeviceShellProps = {
  children: React.ReactNode;
  overlay?: React.ReactNode;
  theme?: "light" | "dark";
};

const IPHONE = {
  width: 430,
  height: 932,
  borderRadius: 55,
  innerRadius: 52,
  screenRadius: 50.5,
};

const CHASSIS_GRADIENT =
  "linear-gradient(100deg, #E8E4DE 0%, #D4D0CA 10%, #C2BDB6 20%, #D0CBC4 33%, #B5B0A9 47%, #CCC7C0 60%, #A8A39C 74%, #BFBBB4 88%, #DDD9D3 100%)";

const CHASSIS_SHADOW = [
  "0 40px 80px -20px rgba(0,0,0,0.18)",
  "0 20px 50px -15px rgba(0,0,0,0.1)",
  "0 0 0 1px rgba(0,0,0,0.04)",
].join(", ");

const BUTTON_SHADOW_L =
  "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.18), -1px 0 2px rgba(0,0,0,0.08)";
const BUTTON_SHADOW_R =
  "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.18), 1px 0 2px rgba(0,0,0,0.08)";

function HardwareButtons() {
  return (
    <>
      <div className="absolute -left-[3.5px] top-[148px]" style={{ width: 3.5, height: 26, borderRadius: "2px 0 0 2px", background: "linear-gradient(180deg, #D0CBC4 0%, #B5B0A9 50%, #C8C3BC 100%)", boxShadow: BUTTON_SHADOW_L }} />
      <div className="absolute -left-[3.5px] top-[196px]" style={{ width: 3.5, height: 42, borderRadius: "2px 0 0 2px", background: "linear-gradient(180deg, #D0CBC4 0%, #B5B0A9 50%, #C8C3BC 100%)", boxShadow: BUTTON_SHADOW_L }} />
      <div className="absolute -left-[3.5px] top-[250px]" style={{ width: 3.5, height: 42, borderRadius: "2px 0 0 2px", background: "linear-gradient(180deg, #D0CBC4 0%, #B5B0A9 50%, #C8C3BC 100%)", boxShadow: BUTTON_SHADOW_L }} />
      <div className="absolute -right-[3.5px] top-[212px]" style={{ width: 3.5, height: 68, borderRadius: "0 2px 2px 0", background: "linear-gradient(180deg, #D0CBC4 0%, #B5B0A9 50%, #C8C3BC 100%)", boxShadow: BUTTON_SHADOW_R }} />
    </>
  );
}

function useRealTimeClock() {
  const [time, setTime] = useState("9:41");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes().toString().padStart(2, "0");
      setTime(`${h}:${m}`);
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function StatusBar({ dark }: { dark: boolean }) {
  const time = useRealTimeClock();
  const color = dark ? "#fff" : "#000";
  const bgColor = dark
    ? "linear-gradient(180deg, #0B0812 0%, #120E1D 100%)"
    : "#F2F2F7";
  return (
    <div
      className="flex items-center justify-between px-8 absolute top-0 left-0 right-0 z-[999]"
      style={{ height: STATUS_BAR_HEIGHT, background: bgColor }}
    >
      <span className="text-[15px] font-semibold tracking-tight" style={{ color, fontVariantNumeric: "tabular-nums" }}>{time}</span>
      <div className="flex items-center gap-[5px]">
        <svg width="17" height="12" viewBox="0 0 17 12" fill={color}>
          <rect x="0" y="9" width="3" height="3" rx="0.5" /><rect x="4.5" y="6" width="3" height="6" rx="0.5" />
          <rect x="9" y="3" width="3" height="9" rx="0.5" /><rect x="13.5" y="0" width="3" height="12" rx="0.5" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill={color}>
          <path d="M8 3.6c1.8 0 3.4.7 4.6 1.8l1.2-1.2C12.2 2.7 10.2 1.8 8 1.8S3.8 2.7 2.2 4.2L3.4 5.4C4.6 4.3 6.2 3.6 8 3.6z" />
          <path d="M8 6.8c1 0 2 .4 2.7 1.1l1.2-1.2C10.8 5.7 9.5 5.2 8 5.2s-2.8.5-3.9 1.5L5.3 7.9C6 7.2 7 6.8 8 6.8z" />
          <circle cx="8" cy="10.5" r="1.5" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill={color}>
          <rect x="0.5" y="0.5" width="22" height="12" rx="2.5" stroke={color} strokeWidth="1" fill="none" />
          <rect x="23.5" y="3.5" width="2.5" height="5.5" rx="1" />
          <rect x="2" y="2" width="19" height="9" rx="1.5" />
        </svg>
      </div>
    </div>
  );
}

const STATUS_BAR_HEIGHT = 54;
const SAFE_AREA_TOP = STATUS_BAR_HEIGHT + 8;

export const DeviceShell: React.FC<DeviceShellProps> = ({ children, overlay, theme = "light" }) => {
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const desktopScreenRef = useRef<HTMLDivElement>(null);
  const mobileScreenRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";
  const screenBg = isDark
    ? "linear-gradient(180deg, #0B0812 0%, #120E1D 55%, #0B0812 100%)"
    : "#F2F2F7";

  return (
    <ScrollRefContext.Provider value={desktopRef}>
      <>
        {/* ── Desktop: iPhone frame on clean canvas ── */}
        <div className="hidden lg:flex items-center justify-center min-h-screen device-shell-canvas">
          <div className="relative flex-shrink-0 device-shell-frame" style={{ width: IPHONE.width, height: IPHONE.height, borderRadius: IPHONE.borderRadius, padding: 3, background: CHASSIS_GRADIENT, boxShadow: CHASSIS_SHADOW }}>
            <div className="w-full h-full overflow-hidden relative" style={{ borderRadius: IPHONE.innerRadius, background: "#000", padding: 1.5 }}>
              <ScreenRefContext.Provider value={desktopScreenRef}>
                <div ref={desktopScreenRef} className="w-full h-full overflow-hidden relative device-shell-screen" style={{ borderRadius: IPHONE.screenRadius, background: screenBg }}>
                  {/* Dynamic Island */}
                  <div className="absolute top-[11px] left-1/2 -translate-x-1/2 z-[1000]" style={{ width: 126, height: 36, borderRadius: 18, background: "#000", boxShadow: "inset 0 0 2px rgba(255,255,255,0.06)" }} />
                  <StatusBar dark={isDark} />

                  {/* Scrollable content — padded below status bar to avoid notch collision */}
                  <div ref={desktopRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden z-[1]" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    <div style={{ paddingTop: SAFE_AREA_TOP }}>
                      <div className="pb-[120px]">{children}</div>
                    </div>
                  </div>

                  {overlay}
                </div>
              </ScreenRefContext.Provider>
            </div>
            <HardwareButtons />
            {/* Home indicator */}
            <div className="absolute bottom-[7px] left-1/2 -translate-x-1/2" style={{ width: 134, height: 5, borderRadius: 3, background: "#1A1A1A" }} />
          </div>
        </div>

        {/* ── Mobile: full viewport ── */}
        <ScrollRefContext.Provider value={mobileRef}>
          <ScreenRefContext.Provider value={mobileScreenRef}>
            <div
              className="lg:hidden flex flex-col relative mobile-shell"
              style={{ background: screenBg }}
            >
              <div ref={mobileScreenRef} className="flex-1 min-h-0 relative" style={{ background: screenBg }}>
                <div
                  ref={mobileRef}
                  className="absolute inset-0 overflow-y-auto overflow-x-hidden"
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    paddingTop: "env(safe-area-inset-top, 0px)",
                    WebkitOverflowScrolling: "touch",
                    touchAction: "pan-y",
                  }}
                >
                  <div className="pb-[120px]">{children}</div>
                </div>
                {overlay}
              </div>
            </div>
          </ScreenRefContext.Provider>
        </ScrollRefContext.Provider>
      </>
    </ScrollRefContext.Provider>
  );
};
