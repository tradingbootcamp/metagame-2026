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

const slotOf = (el: HTMLElement) => Math.round(el.scrollLeft / el.clientWidth);

const jump = (el: HTMLElement, slot: number) =>
  el.scrollTo({ left: slot * el.clientWidth, behavior: "instant" });

// Generic one-slide-at-a-time strip. Native scroll-snap does the work — swipe
// on touch, arrows and dots on desktop — so it needs no gesture library and
// stays smooth on phones. Slides are whatever you pass; each fills the track.
//
// It loops: a clone of the last slide sits before the first and one of the
// first after the last, so stepping past either end looks like one more
// slide. Once the scroll settles on a clone we jump (no animation) to its
// real twin, and the next gesture carries on from there.
export default function SnapCarousel({
  slides,
  label,
  className = "",
  trackClassName = "",
  arrowsOutside = false,
}: {
  slides: ReactNode[];
  label: string; // what a slide is, for the arrow/dot labels ("photo")
  className?: string;
  trackClassName?: string;
  // Arrows flush with the wrapper's edges instead of over the slide — pair
  // with horizontal padding on `className` to give them a gutter.
  arrowsOutside?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // Arrows and dots are off while a press's scroll is in flight: a second
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
  const offset = loop ? 1 : 0; // track slot holding real slide 0
  const items = loop ? [slides[n - 1], ...slides, slides[0]] : slides;

  useLayoutEffect(() => {
    const el = track.current;
    if (el && loop) jump(el, 1);
  }, [loop]);

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
      const w = el.clientWidth;
      if (!w || Math.abs(el.scrollLeft - slot * w) > 1) return;
      if (loop && (slot === 0 || slot === n + 1)) {
        slot = slot === 0 ? n : 1;
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
      el.scrollTo({ left: slot * el.clientWidth, behavior: "smooth" });
    },
    [moving],
  );

  return (
    <div className={`relative ${className}`}>
      <div
        ref={track}
        className={`flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden ${trackClassName}`}
        aria-roledescription="carousel"
      >
        {items.map((slide, k) => {
          const clone = loop && (k === 0 || k === n + 1);
          const i = (k - offset + n) % n;
          return (
            <div
              key={clone ? `clone-${k}` : i}
              className="w-full shrink-0 snap-center"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${n}`}
              aria-hidden={clone || undefined}
            >
              {slide}
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

      <div className="mt-4 flex justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to ${label} ${i + 1}`}
            aria-current={i === index}
            onClick={() => goTo(i + offset)}
            className={`h-2.5 w-2.5 cursor-pointer rounded-full transition ${
              i === index ? "bg-meeple" : "bg-navy/25 hover:bg-navy/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
