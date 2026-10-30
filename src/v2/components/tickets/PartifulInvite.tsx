"use client";

import { Button } from "@/v2/components/ui/button";
import {
  CON_PARTIFUL_PATH,
  CON_PARTIFUL_URL,
  NIGHT_PARTIFUL_PATH,
  NIGHT_PARTIFUL_URL,
} from "@/v2/lib/links";
import { useCopy } from "@/v2/lib/use-copy";

const EVENTS = [
  {
    name: "Metagame 2026",
    blurb: "Let friends see you're going.",
    href: CON_PARTIFUL_URL,
    sharePath: CON_PARTIFUL_PATH,
    variant: "default",
  },
  {
    name: "the Night Market",
    blurb: "Friday 7–10pm, free and open to the public.",
    href: NIGHT_PARTIFUL_URL,
    sharePath: NIGHT_PARTIFUL_PATH,
    variant: "navy",
  },
] as const;

export default function PartifulInvite() {
  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border-[1.5px] border-navy/15 bg-white/60 p-6">
      <div>
        <p className="font-grotesk text-xl font-bold text-navy">
          Bring your friends
        </p>
        <p className="mt-1 text-base text-ink/80">
          RSVP on Partiful, then send the link to anyone who should come too.
        </p>
      </div>
      {EVENTS.map((event) => (
        <PartifulRow key={event.sharePath} {...event} />
      ))}
    </div>
  );
}

function PartifulRow({
  name,
  blurb,
  href,
  sharePath,
  variant,
}: (typeof EVENTS)[number]) {
  const { status, copy } = useCopy();
  return (
    <div className="flex flex-col gap-2 border-t border-navy/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink/70">{blurb}</p>
      <div className="flex flex-wrap items-center gap-3 sm:shrink-0 sm:flex-nowrap">
        <Button asChild variant={variant} size="sm">
          <a href={href} target="_blank" rel="noopener noreferrer">
            RSVP to {name}
          </a>
        </Button>
        <button
          type="button"
          onClick={() => copy(`${window.location.origin}${sharePath}`)}
          className="text-sm font-semibold text-navy underline underline-offset-4 hover:text-meeple"
        >
          {status === "copied"
            ? "Link copied!"
            : status === "failed"
              ? "Couldn't copy"
              : "Copy invite link"}
        </button>
      </div>
    </div>
  );
}
