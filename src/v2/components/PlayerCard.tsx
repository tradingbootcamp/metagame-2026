"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Session2026 } from "@/v2/data/sessions-2026";
import type { Person } from "@/v2/data/team";
import HatImage from "@/v2/hat-trick/HatImage";
import { KINDS, STATUS } from "./sessions/kinds";
import SessionDialog from "./sessions/SessionDialog";
import { DISPLAY, PLAYER_PHOTO } from "./styles";

// Sessions listed under a player; any more are on the sessions page.
const LISTED = 3;

const label = (s: Session2026) =>
  s.title ?? `${KINDS[s.kinds[0]].label}, title to come`;
const tag = (s: Session2026) =>
  s.status === "confirmed" ? null : STATUS[s.status].label;

// One speaker in the rulebook's §4 Players, straight on the page: the photo
// square (with any Hat Trick hats), name and affiliation, then their
// sessions. A session opens its details in a pop-up.
export default function PlayerCard({
  name,
  title,
  titleUrl,
  photo,
  hats,
  sessions = [],
}: Person & { sessions?: Session2026[] }) {
  const [open, setOpen] = useState<Session2026 | null>(null);
  const more = sessions.length - LISTED;

  return (
    <div className="flex min-w-0 gap-3.5">
      {photo && hats?.length ? (
        <HatImage
          src={photo}
          alt={name}
          hats={hats}
          className={PLAYER_PHOTO}
          sizes="144px"
        />
      ) : photo ? (
        <Image
          src={photo}
          alt={name}
          className={`${PLAYER_PHOTO} object-cover`}
          sizes="144px"
        />
      ) : (
        <div
          aria-hidden
          className={`${PLAYER_PHOTO} ${DISPLAY} grid place-items-center bg-navy text-3xl text-cream`}
        >
          {name
            .split(/\s+/)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h3
          className={`${DISPLAY} truncate leading-none tracking-[0.02em] text-navy ${
            name.length > 14 ? "text-[22px]" : "text-[25px]"
          }`}
        >
          {name}
        </h3>
        <p className="mt-1 truncate font-space-mono text-[11px] tracking-[0.08em] text-ink/60 uppercase">
          {titleUrl ? (
            <a
              href={titleUrl}
              {...(titleUrl.startsWith("/")
                ? {}
                : { target: "_blank", rel: "noopener noreferrer" })}
              className="underline underline-offset-2 transition-colors hover:text-navy"
            >
              {title}
            </a>
          ) : (
            title
          )}
        </p>
        {sessions.length > 0 && (
          <ul className="mt-1.5 flex min-w-0 flex-col gap-0.5 text-sm leading-snug">
            {sessions.slice(0, LISTED).map((s) => (
              <li key={s.slug} className="flex min-w-0 items-baseline gap-1.5">
                <button
                  type="button"
                  onClick={() => setOpen(s)}
                  className="min-w-0 truncate text-left text-ink/80 italic underline-offset-2 hover:text-navy hover:underline"
                >
                  {label(s)}
                </button>
                {tag(s) && (
                  <span className="shrink-0 font-space-mono text-[9.5px] tracking-[0.08em] text-ink/50 uppercase">
                    {tag(s)}
                  </span>
                )}
              </li>
            ))}
            {more > 0 && (
              <li>
                <Link
                  href={`/sessions?q=${encodeURIComponent(name)}`}
                  className="font-space-mono text-[10.5px] font-bold tracking-[0.06em] text-meeple uppercase hover:underline"
                >
                  +{more} more
                </Link>
              </li>
            )}
          </ul>
        )}
      </div>
      <SessionDialog session={open} onClose={() => setOpen(null)} browse />
    </div>
  );
}
