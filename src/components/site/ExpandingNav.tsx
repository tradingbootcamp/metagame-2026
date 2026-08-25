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
const UNFOLD_MS = 800;
const LINK_STAGGER_MS = 50;

// Home is the logo itself, so it doesn't get a link.
const LINKS = SECTIONS.filter((s) => s.id !== "home");

// Backdrop outline: the die's isometric hexagon (pointy top/bottom, cos 30°
// half-width) whose top and bottom vertices stretch into edges as the bar
// widens — an octagon with half-hex ends that collapses back to a hexagon.
const CORNER = 3;
function backdropPath(w: number, h: number) {
  const hx = h * 0.433;
  const raw: [number, number][] = [
    [hx, 0],
    [w - hx, 0],
    [w, h / 4],
    [w, (3 * h) / 4],
    [w - hx, h],
    [hx, h],
    [0, (3 * h) / 4],
    [0, h / 4],
  ];
  // Collapsed, the two top (and two bottom) points coincide — drop the dupes
  // so the corner rounding has real edges to work with.
  const pts = raw.filter(
    ([x, y], i) =>
      i === 0 || Math.hypot(x - raw[i - 1][0], y - raw[i - 1][1]) > 0.5,
  );
  const unit = (dx: number, dy: number) => {
    const len = Math.hypot(dx, dy);
    return [dx / len, dy / len];
  };
  const f = (v: number) => +v.toFixed(2);
  return (
    pts
      .map(([vx, vy], i) => {
        const [px, py] = pts[(i + pts.length - 1) % pts.length];
        const [nx, ny] = pts[(i + 1) % pts.length];
        const [ux, uy] = unit(vx - px, vy - py);
        const [wx, wy] = unit(nx - vx, ny - vy);
        return `${i === 0 ? "M" : "L"}${f(vx - ux * CORNER)} ${f(vy - uy * CORNER)} Q${f(vx)} ${f(vy)} ${f(vx + wx * CORNER)} ${f(vy + wy * CORNER)}`;
      })
      .join(" ") + " Z"
  );
}

export default function ExpandingNav() {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // The link row's natural width, measured so `width` can transition to it —
  // `auto` doesn't animate.
  const [listWidth, setListWidth] = useState(0);
  // Bar size, re-measured every frame the width transition runs so the
  // clip-path stretches with it.
  const [barSize, setBarSize] = useState<[number, number] | null>(null);
  const { active, goTo } = useSectionSpy();

  useLayoutEffect(() => {
    const list = listRef.current;
    const root = rootRef.current;
    if (!list || !root) return;
    const measure = () => {
      setListWidth(list.scrollWidth);
      setBarSize([root.offsetWidth, root.offsetHeight]);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    ro.observe(root);
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
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      // The backdrop's margin around the die grows a touch on hover; the open
      // bar keeps that grown size. Offsetting top/left by half keeps the die
      // fixed in place while the hexagon swells around it.
      className="fixed z-40 flex h-(--bar-h) max-w-[calc(100vw-1.5rem)] items-center bg-navy transition-[height,top,left] duration-300 ease-out [--bar-h:calc(52px+var(--grow))] [--nav-h:40px] sm:[--bar-h:calc(60px+var(--grow))] sm:[--nav-h:48px]"
      style={{
        ["--grow" as string]: hovered || expanded ? "6px" : "0px",
        top: "calc(0.75rem - var(--grow) / 2)",
        left: "calc(0.75rem - var(--grow) / 2)",
        // Half-width of a hexagon this tall (cos 30°).
        ["--hex" as string]: "calc(var(--bar-h) * 0.433)",
        clipPath: barSize
          ? `path("${backdropPath(...barSize)}")`
          : // Pre-measure fallback (SSR/first paint): same shape, square corners.
            "polygon(var(--hex) 0, calc(100% - var(--hex)) 0, 100% 25%, 100% 75%, calc(100% - var(--hex)) 100%, var(--hex) 100%, 0 75%, 0 25%)",
      }}
    >
      <button
        type="button"
        aria-label={expanded ? "Close navigation" : "Open navigation"}
        aria-expanded={expanded}
        aria-controls="expanding-nav-links"
        onClick={() => setExpanded((o) => !o)}
        // Collapsed, the button is the hexagon (2·hex wide) with the die
        // centered; expanded, it grows with the wordmark from that same left
        // inset so the first die never shifts.
        className="flex h-full min-w-[calc(2*var(--hex))] shrink-0 cursor-pointer items-center pl-[calc(5px+var(--grow)/2)] transition-[min-width,padding] duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-inset"
      >
        <NavLogo
          expanded={expanded}
          durationMs={UNFOLD_MS}
          className="h-(--nav-h)"
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
        <ul
          ref={listRef}
          className="flex w-max items-center gap-1 pr-(--hex) pl-1"
        >
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
                      ? "text-cream after:scale-x-100"
                      : "text-cream/75 after:scale-x-0"
                  }`}
                  style={{
                    opacity: expanded ? 1 : 0,
                    transform: expanded ? "translateX(0)" : "translateX(-12px)",
                    transition: `opacity 300ms ease, transform 450ms ${EASE}, color 200ms ease`,
                    // Links ripple out left→right on open and fold back
                    // right→left on close, trailing the wordmark's dice.
                    transitionDelay: expanded
                      ? `${200 + i * LINK_STAGGER_MS}ms`
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
