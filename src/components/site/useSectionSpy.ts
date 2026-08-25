"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SECTIONS } from "./sections";

// Shared by the nav's desktop and mobile treatments so
// scroll-spy and smooth-scroll behaviour can't drift between them.
export function useSectionSpy() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  // The section whose center is nearest the viewport center wins.
  useEffect(() => {
    const els = SECTIONS.map(({ id }) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // Shrink the root to a horizontal band across the vertical middle so the
      // "active" section is the one occupying the viewport center.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const goTo = useCallback((id: string) => {
    setActive(id);
    const el = document.getElementById(id);
    if (!el) return;
    // Land on the divider that introduces the section, so it stays on screen
    // as the section's header rather than being scrolled past. Testimonials
    // sits inside a wrapper, hence the parent fallback.
    const divider = [
      el.previousElementSibling,
      el.parentElement?.previousElementSibling,
    ].find((c) => c?.hasAttribute("data-section-divider"));
    (divider ?? el).scrollIntoView({
      // "instant", not "auto" — auto defers to CSS, and globals.css sets
      // scroll-behavior: smooth, so "auto" would animate anyway.
      behavior: reducedMotion.current ? "instant" : "smooth",
      block: "start",
    });
  }, []);

  return { active, goTo, reducedMotion };
}
