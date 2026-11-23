"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

const isCheckbox = (t: EventTarget | null): t is HTMLInputElement =>
  t instanceof HTMLInputElement && t.type === "checkbox";

export default function RangeSelectBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const last = useRef<HTMLInputElement | null>(null);

  function onClick(e: MouseEvent<HTMLTableSectionElement>) {
    const target = e.target;
    if (!isCheckbox(target)) return;
    const boxes = Array.from(
      e.currentTarget.querySelectorAll<HTMLInputElement>(
        `input[type="checkbox"][name="${target.name}"]`,
      ),
    );
    const from = last.current ? boxes.indexOf(last.current) : -1;
    const to = boxes.indexOf(target);
    if (e.shiftKey && from !== -1) {
      for (const box of boxes.slice(Math.min(from, to), Math.max(from, to) + 1))
        box.checked = target.checked;
    }
    last.current = target;
  }

  return (
    <tbody
      className={className}
      onClick={onClick}
      // Shift-click would otherwise extend the page's text selection.
      onMouseDown={(e) => {
        if (e.shiftKey && isCheckbox(e.target)) e.preventDefault();
      }}
    >
      {children}
    </tbody>
  );
}
