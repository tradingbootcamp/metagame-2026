"use client";

import { Check, Link as LinkIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/v2/components/ui/button";
import {
  CON_PARTIFUL_PATH,
  CON_PARTIFUL_URL,
  NIGHT_PARTIFUL_PATH,
  NIGHT_PARTIFUL_URL,
} from "@/v2/lib/links";
import { useCopy } from "@/v2/lib/use-copy";
import partifulLogo from "../../../../public/images/partiful-logo.png";

const EVENTS = [
  {
    name: "Metagame",
    href: CON_PARTIFUL_URL,
    sharePath: CON_PARTIFUL_PATH,
    variant: "default",
  },
  {
    name: "Night Market",
    subtitle: "Friday 7–10pm · open to the public",
    href: NIGHT_PARTIFUL_URL,
    sharePath: NIGHT_PARTIFUL_PATH,
    variant: "navy",
  },
] as const;

export function PartifulLogo() {
  return (
    <Image
      src={partifulLogo}
      alt="Partiful"
      width={22}
      height={22}
      className="rounded-[5px]"
    />
  );
}

export default function PartifulInvite() {
  return (
    <div className="flex w-full flex-col gap-5 rounded-2xl border-[1.5px] border-navy/15 bg-white/60 p-6">
      <p className="font-grotesk text-xl font-bold text-navy">
        RSVP on Partiful and invite your friends!
      </p>
      <div className="flex flex-col gap-4">
        {EVENTS.map((event) => (
          <PartifulRow key={event.sharePath} {...event} />
        ))}
      </div>
    </div>
  );
}

function PartifulRow({
  name,
  href,
  sharePath,
  variant,
  ...rest
}: (typeof EVENTS)[number]) {
  const { status, copy } = useCopy();
  const subtitle = "subtitle" in rest ? rest.subtitle : null;
  const label =
    status === "copied"
      ? "Invite link copied"
      : status === "failed"
        ? "Couldn't copy the invite link"
        : `Copy ${name} invite link`;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-stretch gap-2">
        <Button asChild variant={variant} className="pl-3">
          <a href={href} target="_blank" rel="noopener noreferrer">
            <PartifulLogo />
            {name}
          </a>
        </Button>
        <button
          type="button"
          onClick={() => copy(`${window.location.origin}${sharePath}`)}
          aria-label={label}
          title={label}
          className="flex w-12 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-navy/20 text-navy transition-colors hover:border-navy hover:bg-navy/5"
        >
          {status === "copied" ? (
            <Check className="h-4 w-4" />
          ) : (
            <LinkIcon className="h-4 w-4" />
          )}
        </button>
      </div>
      {subtitle ? <p className="text-xs text-ink/60">{subtitle}</p> : null}
    </div>
  );
}
