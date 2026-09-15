"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { HOME_SECTIONS } from "./links";

// Scroll-spy for the one-pager: which home section is nearest the viewport
// centre, so the die's top face can show its icon. null everywhere but "/",
// and null on "/" while the hero is in view.
export function useHomeSection(): string | null {
  const onHome = usePathname() === "/";
  const [section, setSection] = useState<string | null>(null);

  // Off "/" the stale value is masked below; the observer refreshes it as
  // soon as we're back, so no reset is needed here.
  useEffect(() => {
    if (!onHome) return;
    const els = ["home", ...HOME_SECTIONS.map((s) => s.id)]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = visible[0].target.id;
          setSection(id === "home" ? null : id);
        }
      },
      // A band across the vertical middle, so "active" is the section
      // occupying the viewport centre.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [onHome]);

  return onHome ? section : null;
}
