"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLogo, Pips, TopIcon } from "./LogoDice";
import { SECTIONS } from "./sections";
import { useMediaQuery } from "./useMediaQuery";
import { useSectionSpy } from "./useSectionSpy";

// Collapsed, this is just the single MG die in the corner. Desktop: clicking it
// unfolds the die into the full METAGAME wordmark while the section links slide
// out horizontally from behind it, sharing the wordmark's easing so the two
// read as one motion. Mobile: the die stays put and the links drop down below.
const EASE = "cubic-bezier(0.65,0,0.35,1)";
const UNFOLD_MS = 800;
const LINK_STAGGER_MS = 50;

// Home is the logo itself, so it doesn't get a link.
const LINKS = SECTIONS.filter((s) => s.id !== "home");

// Backdrop outline: the die's isometric hexagon (pointy top/bottom, cos 30°
// half-width, sized from the die row height `hex`) whose vertices stretch into
// edges as the box grows — sideways into the desktop bar, downward into the
// mobile menu — an octagon with hex-angled corners that collapses back to the
// hexagon.
const CORNER = 3;
function backdropPath(w: number, h: number, hexH: number) {
  const hx = hexH * 0.433;
  const q = hexH / 4;
  const raw: [number, number][] = [
    [hx, 0],
    [w - hx, 0],
    [w, q],
    [w, h - q],
    [w - hx, h],
    [hx, h],
    [0, h - q],
    [0, q],
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
  const desktop = useMediaQuery("(min-width: 768px)");
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dieRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLUListElement>(null);
  const columnRef = useRef<HTMLUListElement>(null);
  // Natural sizes of the two link lists, measured so `width`/`height` can
  // transition to them — `auto` doesn't animate.
  const [rowWidth, setRowWidth] = useState(0);
  const [column, setColumn] = useState<[number, number]>([0, 0]);
  // Backdrop box size (+ the die row height that fixes the hex geometry),
  // re-measured every frame a size transition runs so the clip-path follows.
  const [box, setBox] = useState<[number, number, number] | null>(null);
  const { active, goTo } = useSectionSpy();
  // Underlines grow from the side you arrived from: left→right scrolling down
  // the page, right→left scrolling back up.
  const [prevActive, setPrevActive] = useState(active);
  const [fromLeft, setFromLeft] = useState(true);
  if (active !== prevActive) {
    const idx = (id: string) => SECTIONS.findIndex((s) => s.id === id);
    setFromLeft(idx(active) > idx(prevActive));
    setPrevActive(active);
  }

  useLayoutEffect(() => {
    const row = rowRef.current;
    const col = columnRef.current;
    const boxEl = boxRef.current;
    const die = dieRef.current;
    if (!row || !col || !boxEl || !die) return;
    const measure = () => {
      setRowWidth(row.scrollWidth);
      setColumn([col.scrollWidth, col.scrollHeight]);
      setBox([boxEl.offsetWidth, boxEl.offsetHeight, die.offsetHeight]);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    ro.observe(col);
    ro.observe(boxEl);
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

  // Mobile keeps the hexagon exactly as it rests: no wordmark, no swell.
  const unfold = desktop && expanded;
  const grow = desktop && (hovered || expanded);

  const linkClass = (isActive: boolean) =>
    `relative cursor-pointer rounded-md px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 outline-none after:absolute after:inset-x-2 after:bottom-0.5 after:h-0.5 after:bg-brand-blue after:transition-transform after:duration-200 hover:text-cream hover:after:scale-x-100 focus-visible:ring-2 focus-visible:ring-brand-blue ${
      isActive
        ? "text-cream after:scale-x-100"
        : "text-cream/75 after:scale-x-0"
    } ${fromLeft ? "after:origin-left" : "after:origin-right"}`;

  const dropDown = !desktop && expanded;

  return (
    <div
      ref={rootRef}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      // The backdrop's margin around the die grows a touch on hover; the open
      // bar keeps that grown size. Offsetting top/left by half keeps the die
      // fixed in place while the hexagon swells around it.
      className="fixed z-40 flex items-start transition-[top,left] duration-300 ease-out [--bar-h:calc(52px+var(--grow))] [--nav-h:40px] md:[--bar-h:calc(60px+var(--grow))] md:[--nav-h:48px]"
      style={{
        ["--grow" as string]: grow ? "6px" : "0px",
        // Half-width of a hexagon this tall (cos 30°).
        ["--hex" as string]: "calc(var(--bar-h) * 0.433)",
        top: "calc(0.75rem - var(--grow) / 2)",
        left: "calc(0.75rem - var(--grow) / 2)",
      }}
    >
      {/* Desktop: a row (die + links) whose width follows its content. Mobile:
          a column whose box is sized explicitly — the collapsed hexagon, or
          just big enough for the link list — so both edges transition. */}
      <div
        ref={boxRef}
        className="flex max-w-[calc(100vw-1.5rem)] flex-col items-start bg-navy md:h-(--bar-h) md:flex-row md:items-center"
        style={{
          clipPath: box
            ? `path("${backdropPath(...box)}")`
            : // Pre-measure fallback (SSR/first paint): same shape, square corners.
              "polygon(var(--hex) 0, calc(100% - var(--hex)) 0, 100% 25%, 100% 75%, calc(100% - var(--hex)) 100%, var(--hex) 100%, 0 75%, 0 25%)",
          ...(desktop
            ? undefined
            : {
                width: dropDown
                  ? `max(calc(2 * var(--hex)), ${column[0]}px)`
                  : "calc(2 * var(--hex))",
                height: dropDown
                  ? `calc(var(--bar-h) + ${column[1]}px)`
                  : "var(--bar-h)",
                transition: `width ${UNFOLD_MS / 2}ms ${EASE}, height ${UNFOLD_MS / 2}ms ${EASE}`,
              }),
        }}
      >
        <button
          ref={dieRef}
          type="button"
          aria-label={expanded ? "Close navigation" : "Open navigation"}
          aria-expanded={expanded}
          aria-controls="expanding-nav-links"
          onClick={() => setExpanded((o) => !o)}
          // Collapsed, the button is the hexagon (2·hex wide) with the die
          // centered; expanded, it grows with the wordmark from that same left
          // inset so the first die never shifts.
          className="flex h-(--bar-h) min-w-[calc(2*var(--hex))] shrink-0 cursor-pointer items-center pl-[calc(5px+var(--grow)/2)] transition-[min-width,padding] duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-inset"
        >
          <NavLogo
            expanded={unfold}
            durationMs={UNFOLD_MS}
            className="h-(--nav-h)"
            // Top face shows where you are: the section's icon, crossfading
            // as scroll-spy moves. Home, and the unfolded wordmark (where the
            // "2" is part of METAGAME 2026), keep the die's own 2 pips.
            top={SECTIONS.map(({ id, icon: Icon }) => (
              <g
                key={id}
                style={{
                  opacity: (unfold ? "home" : active) === id ? 1 : 0,
                  transition: "opacity 250ms ease",
                }}
              >
                {id === "home" ? (
                  <Pips pips={2} />
                ) : (
                  <TopIcon>
                    <Icon size={24} strokeWidth={2} />
                  </TopIcon>
                )}
              </g>
            ))}
          />
        </button>
        {/* Desktop: links slide out to the right inside the stretching bar.
            Scrollable once open so the row still works where it outruns the
            viewport. */}
        <nav
          id="expanding-nav-links"
          aria-label="Section navigation"
          aria-hidden={!unfold}
          className={`hidden min-w-0 [scrollbar-width:none] md:block ${unfold ? "overflow-x-auto" : "overflow-hidden"}`}
          style={{
            width: unfold ? rowWidth : 0,
            transition: `width ${UNFOLD_MS}ms ${EASE}`,
          }}
        >
          <ul
            ref={rowRef}
            className="flex w-max items-center gap-1 pr-(--hex) pl-1"
          >
            {LINKS.map(({ id, label }, i) => (
              <li key={id}>
                <button
                  type="button"
                  tabIndex={unfold ? 0 : -1}
                  onClick={() => goTo(id)}
                  aria-current={active === id ? "true" : undefined}
                  className={linkClass(active === id)}
                  style={{
                    opacity: unfold ? 1 : 0,
                    transform: unfold ? "translateX(0)" : "translateX(-12px)",
                    transition: `opacity 300ms ease, transform 450ms ${EASE}, color 200ms ease`,
                    // Links ripple out left→right on open and fold back
                    // right→left on close, trailing the wordmark's dice.
                    transitionDelay: unfold
                      ? `${200 + i * LINK_STAGGER_MS}ms`
                      : `${(LINKS.length - 1 - i) * LINK_STAGGER_MS * 0.5}ms`,
                  }}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        {/* Mobile: links stack under the die inside the box as it grows down.
            Picking one closes the menu, since it's covering content. Padding
            keeps the text clear of the hex-cut corners. */}
        <nav
          aria-label="Section navigation"
          aria-hidden={!dropDown}
          className="md:hidden"
        >
          <ul
            ref={columnRef}
            className="flex w-max flex-col items-start pr-(--hex) pb-[calc(var(--bar-h)/4)] pl-(--hex)"
          >
            {LINKS.map(({ id, label }, i) => (
              <li key={id}>
                <button
                  type="button"
                  tabIndex={dropDown ? 0 : -1}
                  onClick={() => {
                    goTo(id);
                    setExpanded(false);
                  }}
                  aria-current={active === id ? "true" : undefined}
                  className={linkClass(active === id)}
                  style={{
                    opacity: dropDown ? 1 : 0,
                    transition: "opacity 200ms ease, color 200ms ease",
                    transitionDelay: dropDown
                      ? `${100 + i * LINK_STAGGER_MS * 0.6}ms`
                      : "0ms",
                  }}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
