"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

/** A tbody where shift-clicking a checkbox extends the selection from the
 *  last clicked one. */
export default function RangeSelectBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const last = useRef<number | null>(null);

  function onClick(e: MouseEvent<HTMLTableSectionElement>) {
    const target = e.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox")
      return;
    const boxes = Array.from(
      e.currentTarget.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]',
      ),
    );
    const index = boxes.indexOf(target);
    if (e.shiftKey && last.current !== null) {
      const [from, to] = [last.current, index].sort((a, b) => a - b);
      for (const box of boxes.slice(from, to + 1)) box.checked = target.checked;
    }
    last.current = index;
  }

  return (
    <tbody className={className} onClick={onClick}>
      {children}
    </tbody>
  );
}
