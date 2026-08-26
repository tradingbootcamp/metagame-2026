"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { HEADING } from "./styles";

// Keeps the native <details> (so it still toggles before hydration) but takes
// over the click to animate the body via grid-template-rows: opening sets `open`
// first so the 0fr → 1fr transition has a start state; closing animates to 0fr
// and only drops `open` once the transition ends.
export default function FaqItem({
  id,
  defaultOpen = false,
  question,
  children,
}: {
  id?: string;
  defaultOpen?: boolean;
  question: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(defaultOpen);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (open) {
      setExpanded(false);
      if (reduceMotion) setOpen(false);
    } else {
      flushSync(() => setOpen(true));
      panelRef.current?.getBoundingClientRect();
      setExpanded(true);
    }
  };

  return (
    <details
      id={id}
      open={open}
      className="group overflow-hidden rounded-[14px] border border-navy/[0.22] bg-sky transition-[box-shadow,border-color] duration-[180ms] open:border-navy open:shadow-[0_6px_24px_rgba(23,48,89,0.12)]"
    >
      <summary
        onClick={toggle}
        className={`${HEADING} flex cursor-pointer list-none items-center justify-between gap-[18px] px-6 py-5 text-lg text-navy after:flex after:h-7 after:w-7 after:flex-none after:items-center after:justify-center after:rounded-full after:bg-white/55 after:font-space-mono after:text-lg after:font-normal after:text-navy after:transition-[background,color] after:duration-[180ms] after:content-['+'] group-open:after:bg-navy group-open:after:text-white group-open:after:content-['−'] hover:after:bg-navy hover:after:text-white [&::-webkit-details-marker]:hidden`}
      >
        {question}
      </summary>
      <div
        ref={panelRef}
        onTransitionEnd={(e) => {
          if (e.propertyName === "grid-template-rows" && !expanded)
            setOpen(false);
        }}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="max-w-[660px] px-6 pb-[22px] text-[15.5px] text-ink/75">
            {children}
          </div>
        </div>
      </div>
    </details>
  );
}
