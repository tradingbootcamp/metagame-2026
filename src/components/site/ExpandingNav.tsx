"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { NavLogo, Pips, TopIcon } from "./LogoDice";
import { SECTIONS } from "./sections";
import { useMediaQuery } from "./useMediaQuery";
import { useSectionSpy } from "./useSectionSpy";

// Collapsed, this is just the single MG die in the corner. Desktop: clicking it
// unfolds the die into the full METAGAME wordmark while the section links slide
// out horizontally from behind it, sharing the wordmark's easing so the two
// read as one motion. Mobile: same unfold, but the links stack down a
// full-height column instead.
const EASE = "cubic-bezier(0.65,0,0.35,1)";
const UNFOLD_MS = 800;
// Mobile's sideways phase is quicker and eases out; the drop-down phase that
// follows keeps the desktop timing.
const MOBILE_SIDEWAYS_MS = 450;
const MOBILE_SIDEWAYS_EASE = "cubic-bezier(0.22,1,0.36,1)";
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
        // Mid-transition an edge can be shorter than the rounding; cap so the
        // curve never overshoots the vertex.
        const r = Math.min(
          CORNER,
          Math.hypot(vx - px, vy - py) / 2,
          Math.hypot(nx - vx, ny - vy) / 2,
        );
        return `${i === 0 ? "M" : "L"}${f(vx - ux * r)} ${f(vy - uy * r)} Q${f(vx)} ${f(vy)} ${f(vx + wx * r)} ${f(vy + wy * r)}`;
      })
      .join(" ") + " Z"
  );
}

export default function ExpandingNav() {
  const desktop = useMediaQuery("(min-width: 768px)");
  const [expanded, setExpanded] = useState(false);
  // Mobile opens sideways then down, and closes down then sideways — so the
  // die's own unfold state lags `expanded` on close by one phase.
  const [dieOpen, setDieOpen] = useState(false);
  const foldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const dieRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLUListElement>(null);
  const columnRef = useRef<HTMLUListElement>(null);
  // Natural sizes of the two link lists, measured so `width`/`height` can
  // transition to them — `auto` doesn't animate.
  const [rowWidth, setRowWidth] = useState(0);
  const [columnWidth, setColumnWidth] = useState(0);
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
      setColumnWidth(col.scrollWidth);
      // The clip-path must match the box on the very frame it's painted —
      // a React state round-trip lags a frame, and while the box shrinks a
      // stale (larger) clip lets its square bottom edge show. So write it
      // straight to the element from the observer callback, which runs
      // after layout and before paint.
      boxEl.style.clipPath = `path("${backdropPath(
        boxEl.offsetWidth,
        boxEl.offsetHeight,
        die.offsetHeight,
      )}")`;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    ro.observe(col);
    ro.observe(boxEl);
    return () => ro.disconnect();
  }, []);

  const setOpen = useCallback(
    (open: boolean) => {
      setExpanded(open);
      if (foldTimer.current) clearTimeout(foldTimer.current);
      if (open || desktop) setDieOpen(open);
      else foldTimer.current = setTimeout(() => setDieOpen(false), UNFOLD_MS);
    },
    [desktop],
  );
  useEffect(
    () => () => {
      if (foldTimer.current) clearTimeout(foldTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, setOpen]);

  // Mobile has no hover, so no swell there.
  const unfold = desktop ? expanded : dieOpen;
  const sidewaysMs = desktop ? UNFOLD_MS : MOBILE_SIDEWAYS_MS;
  const sidewaysEase = desktop ? EASE : MOBILE_SIDEWAYS_EASE;
  const grow = desktop && (hovered || expanded);

  const linkClass = (isActive: boolean) =>
    `relative cursor-pointer rounded-md px-2 py-2 text-2xl font-medium whitespace-nowrap md:py-1.5 md:text-sm transition-colors duration-200 outline-none after:absolute after:inset-x-2 after:bottom-0.5 after:h-0.5 after:bg-brand-blue after:transition-transform after:duration-200 hover:text-cream hover:after:scale-x-100 focus-visible:ring-2 focus-visible:ring-brand-blue ${
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
      className="fixed z-40 flex items-start [--bar-h:calc(66px+var(--grow))] [--nav-h:54px] md:[--bar-h:calc(76px+var(--grow))] md:[--nav-h:64px]"
      style={{
        ["--grow" as string]: grow ? "6px" : "0px",
        transition: "--grow 300ms ease-out",
        // Half-width of a hexagon this tall (cos 30°).
        ["--hex" as string]: "calc(var(--bar-h) * 0.433)",
        top: "calc(0.75rem - var(--grow) / 2)",
        left: "calc(0.75rem - var(--grow) / 2)",
      }}
    >
      {/* Desktop: a row (die + links) whose width follows its content. Mobile:
          a column — width still content-driven (wordmark or widest link),
          height explicit so it can transition to the full screen. */}
      <div
        ref={boxRef}
        className="flex max-w-[calc(100vw-1.5rem)] flex-col items-start bg-navy md:h-(--bar-h) md:flex-row md:items-center"
        style={{
          // Pre-measure fallback (SSR/first paint) — the observer replaces it
          // with the rounded path.
          clipPath:
            "polygon(var(--hex) 0, calc(100% - var(--hex)) 0, 100% 25%, 100% 75%, calc(100% - var(--hex)) 100%, var(--hex) 100%, 0 75%, 0 25%)",
          ...(desktop
            ? undefined
            : {
                height: dropDown ? "calc(100dvh - 1.5rem)" : "var(--bar-h)",
                // Second phase on open, first on close.
                transition: `height ${UNFOLD_MS}ms ${EASE} ${dropDown ? sidewaysMs : 0}ms`,
                // Swiping the open menu shouldn't scroll the page under it.
                touchAction: dropDown ? "none" : undefined,
                overscrollBehavior: "contain",
              }),
        }}
      >
        <button
          ref={dieRef}
          type="button"
          aria-label={expanded ? "Close navigation" : "Open navigation"}
          aria-expanded={expanded}
          aria-controls="expanding-nav-links"
          onClick={() => setOpen(!expanded)}
          // Collapsed, the button is the hexagon (2·hex wide) with the die
          // centered; expanded, it grows with the wordmark from that same left
          // inset so the first die never shifts.
          // Mobile only pads the right while unfolded (so the wordmark clears
          // the hex cap) — always-on it would hold the hexagon open.
          className={`flex h-(--bar-h) min-w-[calc(2*var(--hex))] shrink-0 cursor-pointer items-center pl-[calc(5px+var(--grow)/2)] outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-inset md:pr-0 ${unfold ? "pr-(--hex)" : "pr-0"}`}
          // padding-right only: the left inset must follow --grow exactly, or
          // the die lags behind the swelling backdrop.
          style={{
            transition: `padding-right ${sidewaysMs}ms ${sidewaysEase}`,
          }}
        >
          <NavLogo
            expanded={unfold}
            durationMs={sidewaysMs}
            easing={sidewaysEase}
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
        {/* Mobile: links stack under the die, spread down the full-height box,
            flush with the die's left edge. The list is already its final
            height while the box grows, so the words hold position and roll
            into view one by one as the box reaches them. Width 0 while closed
            so the widest label can't prop the hexagon open. Picking one closes
            the menu, since it's covering content. Bottom padding clears the
            hex cap. */}
        <nav
          aria-label="Section navigation"
          aria-hidden={!dropDown}
          className="min-h-0 flex-1 overflow-hidden md:hidden"
          style={{
            width: dropDown ? columnWidth : 0,
            // Sideways phase: with the wordmark on open, after the height
            // has collapsed on close.
            transition: `width ${sidewaysMs}ms ${sidewaysEase} ${dropDown ? 0 : UNFOLD_MS}ms`,
          }}
        >
          <ul
            ref={columnRef}
            className="flex h-[calc(100dvh-1.5rem-var(--bar-h))] w-max flex-col items-start justify-around pr-(--hex) pb-[calc(var(--bar-h)/4)] pl-1"
          >
            {LINKS.map(({ id, label }, i) => (
              <li key={id}>
                <button
                  type="button"
                  tabIndex={dropDown ? 0 : -1}
                  onClick={() => {
                    goTo(id);
                    setOpen(false);
                  }}
                  aria-current={active === id ? "true" : undefined}
                  className={linkClass(active === id)}
                  style={{
                    opacity: dropDown ? 1 : 0,
                    transition: "opacity 200ms ease, color 200ms ease",
                    // Fade each word in around when the growing box uncovers
                    // it; on close the shrinking box hides them, so they only
                    // fade once it's down.
                    transitionDelay: dropDown
                      ? `${sidewaysMs + ((i + 0.5) / LINKS.length) * UNFOLD_MS * 0.8}ms`
                      : `${UNFOLD_MS}ms`,
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
