"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * A room header that stays at the top of the page over a body that scrolls
 * sideways. A horizontal scroller is a vertical scroll container too, so a
 * header inside it would stick to the scroller rather than the page; it sits
 * outside instead and follows the body's scrollLeft. Give the head and body
 * the same grid template and `min-w-fit` so they come out the same width.
 */
export default function StickyHeadScroll({
  head,
  children,
}: {
  head: ReactNode;
  children: ReactNode;
}) {
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Native and non-passive so a sideways swipe over the head can be consumed;
  // otherwise nothing scrolls and macOS reads it as a back/forward gesture.
  // When the body can't scroll sideways, leave the gesture to the browser.
  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const onWheel = (e: WheelEvent) => {
      const body = bodyRef.current;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      if (!body || body.scrollWidth <= body.clientWidth) return;
      e.preventDefault();
      body.scrollLeft += e.deltaX;
    };
    head.addEventListener("wheel", onWheel, { passive: false });
    return () => head.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <>
      <div ref={headRef} className="sticky top-0 z-30 overflow-hidden">
        {head}
      </div>
      <div
        ref={bodyRef}
        className="overflow-x-auto"
        onScroll={(e) => {
          if (headRef.current)
            headRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }}
      >
        {children}
      </div>
    </>
  );
}
