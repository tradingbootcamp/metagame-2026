"use client";

import { useRef, type ReactNode } from "react";

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
  return (
    <>
      <div
        ref={headRef}
        className="sticky top-0 z-30 overflow-hidden"
        onWheel={(e) => {
          if (bodyRef.current) bodyRef.current.scrollLeft += e.deltaX;
        }}
      >
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
