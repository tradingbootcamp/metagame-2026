"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLogo } from "./LogoDice";
import { SECTIONS } from "./sections";
import { useSectionSpy } from "./useSectionSpy";

// Collapsed, this is just the single MG die in the corner. Clicking it unfolds
// the die into the full METAGAME wordmark while the section links slide out
// horizontally from behind it, sharing the wordmark's easing so the two read
// as one motion.
const EASE = "cubic-bezier(0.22,1,0.36,1)";
const UNFOLD_MS = 460;
const LINK_STAGGER_MS = 35;

// Home is the logo itself, so it doesn't get a link.
const LINKS = SECTIONS.filter((s) => s.id !== "home");

export default function ExpandingNav() {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // The link row's natural width, measured so `width` can transition to it —
  // `auto` doesn't animate.
  const [listWidth, setListWidth] = useState(0);
  const { active, goTo } = useSectionSpy();

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => setListWidth(el.scrollWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  return (
    <div
      ref={rootRef}
      className="fixed top-3 left-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-center rounded-xl border border-line-dark bg-navy/95 p-1 shadow-[0_2px_10px_rgba(23,48,89,0.25)] backdrop-blur-sm"
    >
      <button
        type="button"
        aria-label={expanded ? "Close navigation" : "Open navigation"}
        aria-expanded={expanded}
        aria-controls="expanding-nav-links"
        onClick={() => setExpanded((o) => !o)}
        className="shrink-0 cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
      >
        <NavLogo
          expanded={expanded}
          shadow
          className="[--nav-h:40px] sm:[--nav-h:48px]"
        />
      </button>
      <nav
        id="expanding-nav-links"
        aria-label="Section navigation"
        aria-hidden={!expanded}
        // Scrollable once open so the row still works on narrow screens where
        // the wordmark + links outrun the viewport.
        className={`min-w-0 [scrollbar-width:none] ${expanded ? "overflow-x-auto" : "overflow-hidden"}`}
        style={{
          width: expanded ? listWidth : 0,
          transition: `width ${UNFOLD_MS}ms ${EASE}`,
        }}
      >
        <ul ref={listRef} className="flex w-max items-center gap-1 pr-2 pl-3">
          {LINKS.map(({ id, label }, i) => {
            const isActive = active === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  tabIndex={expanded ? 0 : -1}
                  onClick={() => goTo(id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none after:absolute after:inset-x-2 after:bottom-0.5 after:h-0.5 after:origin-left after:bg-brand-blue after:transition-transform after:duration-200 hover:text-cream hover:after:scale-x-100 focus-visible:ring-2 focus-visible:ring-brand-blue ${
                    isActive
                      ? "text-ink after:scale-x-100"
                      : "text-ink/60 after:scale-x-0"
                  }`}
                  style={{
                    opacity: expanded ? 1 : 0,
                    transform: expanded ? "translateX(0)" : "translateX(-12px)",
                    transition: `opacity 200ms ease, transform 300ms ${EASE}, color 200ms ease`,
                    // Links ripple out left→right on open and fold back
                    // right→left on close, trailing the wordmark's dice.
                    transitionDelay: expanded
                      ? `${120 + i * LINK_STAGGER_MS}ms`
                      : `${(LINKS.length - 1 - i) * LINK_STAGGER_MS * 0.5}ms`,
                  }}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
