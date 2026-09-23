"use client";

import { useRef, useState } from "react";
import { Popover } from "radix-ui";

/**
 * The ⓘ next to a field label, showing that column's Airtable description.
 *
 * Popover rather than Tooltip: Radix's tooltip deliberately never opens on
 * touch, which would leave the descriptions unreachable on a phone. So this
 * opens on tap (Popover's own behaviour) and hover is added on top, guarded to
 * mouse pointers so a tap doesn't immediately re-close it.
 */
export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const onMouse = (next: boolean) => (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") setOpen(next);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {/* Anchor, not Trigger: Trigger toggles on click, and since hover/focus
          have already opened it by then, that toggle only ever closes it. */}
      <Popover.Anchor asChild>
        <button
          ref={button}
          type="button"
          aria-label="What is this field?"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          onPointerEnter={onMouse(true)}
          onPointerLeave={onMouse(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className="ml-1.5 inline-flex size-4 shrink-0 translate-y-px items-center justify-center rounded-full border border-ink/25 align-middle font-sans text-[10px] leading-none font-semibold text-ink/45 normal-case transition-colors hover:border-navy hover:text-navy focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          i
        </button>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          role="tooltip"
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          // Hovering must not steal focus from whatever the grader is typing in.
          onOpenAutoFocus={(event) => event.preventDefault()}
          // The ⓘ is an Anchor, so Radix counts pressing it as an outside press
          // and would dismiss the panel the click just opened.
          onInteractOutside={(event) => {
            if (button.current?.contains(event.target as Node)) {
              event.preventDefault();
            }
          }}
          className="z-50 max-w-80 rounded-lg bg-navy px-3 py-2 font-sans text-sm leading-snug font-normal tracking-normal text-cream normal-case shadow-lg"
        >
          {text}
          <Popover.Arrow className="fill-navy" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
