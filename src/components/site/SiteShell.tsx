"use client";

import { useEffect, useState } from "react";
import ExpandingNav from "./ExpandingNav";
import MobileNavCorner from "./MobileNavCorner";
import SideRail from "./SideRail";

// Section nav: a permanent rail on desktop; on mobile a corner hamburger that
// summons that same rail as an overlay.
export default function SiteShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [menuOpen, setMenuOpen] = useState(false);

  // The overlay is a mobile affordance; widening past md hands back to the
  // permanent desktop rail, so close rather than leave both on screen.
  //
  // Deliberately no body scroll-lock: the overlay releases by scrolling to the
  // picked section, and `overflow: hidden` blocks that same scroll — fatal for
  // an instant (prefers-reduced-motion) jump, which finishes before the menu
  // closes and the lock lifts. The overlay's touch-action: none already stops
  // the page moving under the finger.
  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const close = () => setMenuOpen(false);
    mq.addEventListener("change", close);
    return () => mq.removeEventListener("change", close);
  }, [menuOpen]);

  return (
    <>
      <ExpandingNav />
      <MobileNavCorner onOpenMenu={() => setMenuOpen(true)} />
      <SideRail overlay={menuOpen} onClose={() => setMenuOpen(false)} />
      {/* The rail is fixed-position, so this padding only keeps content from
          sliding under it — symmetric so it never shifts the page's center. */}
      <main className="flex-1 overflow-x-clip md:px-20 lg:px-24">
        {children}
      </main>
    </>
  );
}
