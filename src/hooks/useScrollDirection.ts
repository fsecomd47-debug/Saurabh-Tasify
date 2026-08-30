"use client";

import { useState, useEffect, useRef, RefObject } from "react";

export function useScrollDirection(containerRef: RefObject<HTMLElement | null>): boolean {
  const [showNav, setShowNav] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const currentScrollY = el.scrollTop;

      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }

      lastScrollY.current = currentScrollY;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  return showNav;
}
