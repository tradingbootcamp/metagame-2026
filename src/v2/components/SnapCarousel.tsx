"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const noSubscribe = () => () => {};

// Where the track has to be scrolled for slot k to sit centred. Measured per
// slide, not k × a width: with `peek` the slides are narrower than the track.
const leftOf = (el: HTMLElement, slot: number) => {
  const slide = el.children[slot] as HTMLElement | undefined;
  return slide
    ? slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2
    : 0;
};

const slotOf = (el: HTMLElement) => {
  let best = 0;
  for (let k = 1; k < el.children.length; k++)
    if (
      Math.abs(leftOf(el, k) - el.scrollLeft) <
      Math.abs(leftOf(el, best) - el.scrollLeft)
    )
      best = k;
  return best;
};

const jump = (el: HTMLElement, slot: number) =>
  el.scrollTo({ left: leftOf(el, slot), behavior: "instant" });

// Generic one-slide-at-a-time strip. Native scroll-snap does the work — swipe
// on touch, arrows on desktop — so it needs no gesture library and stays
// smooth on phones. Slides are whatever you pass; each fills the track, or
// with `peek` leaves room for a faded slice of its neighbours either side.
//
// It loops: clones of the last slides sit before the first and of the first
// after the last, so stepping past either end looks like one more slide. Once
// the scroll settles on a clone we jump (no animation) to its real twin, and
// the next gesture carries on from there.
export default function SnapCarousel({
  slides,
  label,
  className = "",
  trackClassName = "",
  slideClassName = "",
  arrowsOutside = false,
  peek = false,
}: {
  slides: ReactNode[];
  label: string; // what a slide is, for the arrow labels ("photo")
  className?: string;
  trackClassName?: string;
  slideClassName?: string;
  // Arrows flush with the wrapper's edges instead of over the slide — pair
  // with horizontal padding on `className` to give them a gutter.
  arrowsOutside?: boolean;
  peek?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // Arrows are off while a press's scroll is in flight: a second
  // press mid-animation would read a half-finished position and misfire.
  const [moving, setMoving] = useState(false);
  const n = slides.length;
  // Clones only appear after hydration: server HTML starts scrolled to 0, so
  // rendering the leading clone there would flash the last slide first.
  const loop = useSyncExternalStore(
    noSubscribe,
    () => n > 1,
    () => false,
  );
  // A clone's own neighbour shows too with `peek`, so it takes two a side.
  const offset = loop ? (peek ? 2 : 1) : 0; // track slot holding real slide 0
  const items = loop
    ? [...slides.slice(-offset), ...slides, ...slides.slice(0, offset)]
    : slides;

  useLayoutEffect(() => {
    const el = track.current;
    if (el && loop) jump(el, offset);
  }, [loop, offset]);

  useEffect(() => {
    const el = track.current;
    if (!el || !n) return;
    let slot = offset;
    const onScroll = () => {
      if (!el.clientWidth) return;
      slot = slotOf(el);
      setIndex((((slot - offset) % n) + n) % n);
    };
    const onSettle = () => {
      if (!el.clientWidth || Math.abs(el.scrollLeft - leftOf(el, slot)) > 1)
        return;
      if (loop && (slot < offset || slot >= offset + n)) {
        slot += slot < offset ? n : -n;
        jump(el, slot);
      }
      setMoving(false);
    };
    // Safari only got `scrollend` recently; fall back to a quiet period.
    let timer: number | undefined;
    const onScrollDebounced = () => {
      clearTimeout(timer);
      timer = window.setTimeout(onSettle, 120);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    if (el.onscrollend !== undefined)
      el.addEventListener("scrollend", onSettle);
    else el.addEventListener("scroll", onScrollDebounced, { passive: true });

    // Slide width follows the track, so keep the same slide in view on resize.
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      jump(el, slot);
    });
    ro.observe(el);

    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", onSettle);
      el.removeEventListener("scroll", onScrollDebounced);
      ro.disconnect();
    };
  }, [n, loop, offset]);

  const goTo = useCallback(
    (slot: number) => {
      const el = track.current;
      if (!el || moving || slot === slotOf(el)) return;
      setMoving(true);
      el.scrollTo({ left: leftOf(el, slot), behavior: "smooth" });
    },
    [moving],
  );

  return (
    <div className={`relative ${className}`}>
      <div
        ref={track}
        className={`relative flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden ${peek ? "gap-3" : ""} ${trackClassName}`}
        aria-roledescription="carousel"
      >
        {items.map((slide, k) => {
          const clone = loop && (k < offset || k >= offset + n);
          const i = (((k - offset) % n) + n) % n;
          // A ghost is a way to its slide, not a place to use it from.
          const ghost = peek && i !== index;
          return (
            <div
              key={clone ? `clone-${k}` : i}
              className={`shrink-0 snap-center transition-opacity duration-300 ${
                peek ? "w-[84%]" : "w-full"
              } ${ghost ? "cursor-pointer opacity-35" : ""} ${slideClassName}`}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${n}`}
              aria-hidden={clone || undefined}
              onClick={ghost ? () => goTo(k) : undefined}
            >
              <div className={ghost ? "pointer-events-none" : undefined}>
                {slide}
              </div>
            </div>
          );
        })}
      </div>

      {/* arrows — hidden on touch-only screens where swiping is the gesture */}
      {(["prev", "next"] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          aria-label={dir === "prev" ? `Previous ${label}` : `Next ${label}`}
          aria-disabled={moving}
          onClick={() => goTo(index + offset + (dir === "prev" ? -1 : 1))}
          className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-navy/15 bg-cream/90 text-navy shadow-md transition hover:bg-white aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-cream/90 [@media(hover:hover)]:flex ${
            arrowsOutside
              ? dir === "prev"
                ? "left-0"
                : "right-0"
              : dir === "prev"
                ? "left-2"
                : "right-2"
          }`}
        >
          {dir === "prev" ? <ChevronLeft /> : <ChevronRight />}
        </button>
      ))}
    </div>
  );
}
