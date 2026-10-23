"use client";

import { InfoIcon } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";

/** An info icon that shows a note on hover, or on tap where there is no hover. */
export function InfoTip({
  children,
  label = "More info",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex align-middle text-ink/40 hover:text-navy"
      >
        <InfoIcon className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 max-w-72 rounded-lg bg-navy px-3 py-2 text-xs font-normal tracking-normal text-cream normal-case shadow-lg"
        >
          {children}
          <Popover.Arrow className="fill-navy" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
