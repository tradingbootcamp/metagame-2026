"use client";

import { useEffect, useRef, useState } from "react";
import { SECTIONS } from "./sections";
import { useSectionSpy } from "./useSectionSpy";

// Flip the rail to the right edge: change this to "right" (and nothing else —
// label side + magnification are edge-agnostic).
const RAIL_SIDE: "left" | "right" = "left";

// Apple-dock magnification: an icon's scale falls off as a gaussian of the
// vertical distance between its center and the pointer. scale = 1 + AMP * e^(-(d/WIDTH)^2).
const MAG_AMP = 0.5; // nearest icon grows by ~50%
const MAG_WIDTH = 52; // px falloff radius — how far the bulge spreads

// The summoned overlay sits on the right so it comes from under the hamburger
// that opened it; the permanent desktop rail stays on RAIL_SIDE.
const OVERLAY_SIDE: "left" | "right" = "right";

// Overlay mode: releasing inside this band off the rail edge counts as picking
// the nearest item; releasing beyond it just dismisses. Matches the wash width.
const OVERLAY_BAND = 300;

type SideRailProps = {
  // Summoned full-screen over the page (mobile hamburger): labels and wash are
  // forced open and a finger drag drives the same magnification the mouse does.
  // Otherwise the rail is the permanent desktop fixture, hidden below md.
  overlay?: boolean;
  onClose?: () => void;
};

export default function SideRail({ overlay = false, onClose }: SideRailProps) {
  const side = overlay ? OVERLAY_SIDE : RAIL_SIDE;
  const railRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { active, goTo, reducedMotion } = useSectionSpy();
  const [hovering, setHovering] = useState(false);
  // Per-icon magnification scales, driven by pointer Y via rAF.
  const [scales, setScales] = useState<number[]>(() => SECTIONS.map(() => 1));
  const rafRef = useRef<number | null>(null);
  // Touch devices fire pointerenter/move on tap, which would latch the rail into
  // hover mode (labels + wash) on a plain nav tap — so hover is fine-pointer only.
  const finePointer = useRef(false);

  useEffect(() => {
    finePointer.current = window.matchMedia("(pointer: fine)").matches;
  }, []);

  const applyMagnification = (pointerY: number) => {
    if (reducedMotion.current) return;
    const next = itemRefs.current.map((el) => {
      if (!el) return 1;
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const d = pointerY - center;
      return 1 + MAG_AMP * Math.exp(-((d / MAG_WIDTH) ** 2));
    });
    setScales(next);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!overlay && !finePointer.current) return;
    const y = e.clientY;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => applyMagnification(y));
  };

  const handlePointerEnter = () => {
    if (!finePointer.current) return;
    setHovering(true);
  };
  const handlePointerLeave = () => {
    if (overlay) return;
    setHovering(false);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    setScales(SECTIONS.map(() => 1));
  };

  const nearestIndex = (y: number) => {
    let best = 0;
    let bestDistance = Infinity;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = Math.abs(y - (r.top + r.height / 2));
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    return best;
  };

  // Overlay: the whole screen is the drag surface, so press anywhere starts
  // scrubbing and release picks whatever the finger ended up nearest.
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!overlay) return;
    applyMagnification(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!overlay) return;
    // Closing re-renders the overlay away before the browser synthesizes the
    // tap's click, which then hit-tests whatever was underneath (ghost click).
    // A React onTouchEnd prop is also gone by then, so cancel the upcoming
    // touchend natively — that stops the click from being generated at all.
    if (e.pointerType === "touch") {
      document.addEventListener("touchend", (te) => te.preventDefault(), {
        capture: true,
        once: true,
      });
    }
    const withinBand =
      side === "left"
        ? e.clientX <= OVERLAY_BAND
        : e.clientX >= window.innerWidth - OVERLAY_BAND;
    if (withinBand) goTo(SECTIONS[nearestIndex(e.clientY)].id);
    onClose?.();
  };

  // Labels, wash and dock-magnification key off `hovering`, which touch never
  // sets — so the inline mobile rail is plain tap-to-scroll, while the overlay
  // forces the expanded look and drives it from the finger instead.
  const expanded = hovering || overlay;

  return (
    <nav
      ref={railRef}
      aria-label="Section navigation"
      onPointerEnter={handlePointerEnter}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      // touch-none so scrubbing the rail doesn't scroll the page underneath.
      style={overlay ? { touchAction: "none" } : undefined}
      // Normal: pointer-events-none on the fixed wrapper band, re-enabled on the
      // rail itself so only the rail is interactive, not the invisible column.
      // Overlay: the whole screen is live, so a drag can start anywhere.
      className={
        overlay
          ? `pointer-events-auto fixed inset-0 z-50 flex flex-col justify-center ${
              side === "left" ? "pl-3" : "pr-3"
            }`
          : `pointer-events-none fixed inset-y-0 z-40 hidden flex-col justify-center md:flex ${
              side === "left" ? "left-3 lg:left-5" : "right-3 lg:right-5"
            }`
      }
    >
      {/* Wash behind the rail: one gradient rectangle spanning the full page
          height (the nav is full-height; the icon list below is what's limited to
          75vh), fading in on hover so labels stay legible over page content, and
          tapering off to the side. The overlay runs wider and more opaque — it's
          a deliberate mode you opened, not a hover hint. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 -z-10 transition-opacity duration-200 ${
          side === "left"
            ? "left-0 bg-gradient-to-r"
            : "right-0 bg-gradient-to-l"
        } ${
          overlay
            ? "w-[300px] from-background via-background/90 to-transparent"
            : "w-[240px] from-background/95 via-background/60 to-transparent"
        } ${expanded ? "opacity-100" : "opacity-0"}`}
      />
      <ul
        className={`pointer-events-auto flex h-[75vh] flex-col justify-between ${
          side === "left" ? "items-start" : "items-end"
        }`}
      >
        {SECTIONS.map(({ id, label, icon: Icon }, i) => {
          const isActive = active === id;
          const scale = scales[i] ?? 1;
          return (
            <li key={id} className="contents">
              <button
                type="button"
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                onClick={overlay ? undefined : () => goTo(id)}
                aria-label={label}
                aria-current={isActive ? "true" : undefined}
                // Overlay is touch-only, so it pads out and bleeds an ::after
                // hit area to ~44px; the desktop rail is a mouse target.
                className={`group relative flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
                  overlay
                    ? "px-2 py-2 after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']"
                    : "px-1 py-1"
                } ${side === "right" ? "flex-row-reverse" : ""}`}
                style={{
                  touchAction: "manipulation",
                  transform: `scale(${scale})`,
                  transformOrigin: side,
                  transition: expanded
                    ? "transform 60ms linear"
                    : "transform 200ms ease-out",
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 2}
                  // Resting: muted gray blending into the beige. Active: navy
                  // and enlarged, legible even when the rail isn't hovered.
                  className={`shrink-0 transition-colors duration-200 ${
                    isActive
                      ? "scale-110 text-navy"
                      : "text-ink/35 group-hover:text-ink"
                  }`}
                />
                {/* Home (the MG2 die) is self-evident as the top item — no label.
                    Labels reveal on rail hover — fade + slide in beside icons;
                    the full-height wash above keeps them legible over content. */}
                {i !== 0 && (
                  <span
                    className={`text-sm font-medium whitespace-nowrap text-ink/60 transition-all duration-200 group-hover:text-ink ${
                      expanded
                        ? "translate-x-0 opacity-100"
                        : "pointer-events-none w-0 -translate-x-1 overflow-hidden opacity-0"
                    }`}
                  >
                    {label}
                  </span>
                )}
              </button>
              {/* Faint dot between consecutive icons: icon · icon · icon … */}
              {i < SECTIONS.length - 1 && (
                <span
                  aria-hidden
                  className={`my-0.5 h-1 w-1 rounded-full bg-ink/15 ${
                    side === "left" ? "ml-2" : "mr-2"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
