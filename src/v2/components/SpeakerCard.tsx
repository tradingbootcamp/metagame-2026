"use client";

import {
  Dices,
  Mic,
  RotateCcw,
  RotateCw,
  Sparkles,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  formatPacificDay,
  formatPacificTime,
  sessionHref,
  type Category,
  type HostedSession,
} from "@/lib/schedule";
import type { Person } from "@/v2/data/team";
import HatImage from "@/v2/hat-trick/HatImage";
import { HEADING } from "./styles";

const CATEGORY_ICON: Record<Category, typeof Mic> = {
  talk: Mic,
  workshop: Wrench,
  game: Dices,
  other: Sparkles,
};

const SIZES = "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 33vw";
const FACE =
  "flex h-full flex-col overflow-hidden rounded-2xl border border-navy/[0.16] shadow-[0_8px_24px_rgba(23,48,89,0.08)] [backface-visibility:hidden]";
const MONO =
  "font-space-mono text-[9px] uppercase sm:text-xs sm:tracking-[0.08em]";

// One speaker as a two-sided card: the photo on top (with any Hat Trick
// hats), name and affiliation under it. Turn it over for their sessions, each
// linking to its page. The front sets the height; the back lies over it and
// scrolls if it has to. With no sessions there's nothing to turn to.
export default function SpeakerCard({
  name,
  title,
  titleUrl,
  photo,
  hats,
  logo,
  sessions = [],
}: Person & { sessions?: HostedSession[] }) {
  const [flipped, setFlipped] = useState(false);
  const n = sessions.length;
  const canFlip = n > 0;

  return (
    <div className="h-full [perspective:1200px]">
      <div
        className={`relative h-full transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div
          inert={flipped}
          onClick={canFlip ? () => setFlipped(true) : undefined}
          className={`${FACE} relative bg-white ${canFlip ? "cursor-pointer" : ""}`}
        >
          {photo && hats?.length ? (
            <HatImage
              src={photo}
              alt={name}
              hats={hats}
              className="aspect-square w-full"
              sizes={SIZES}
            />
          ) : photo ? (
            <Image
              src={photo}
              alt={name}
              className="aspect-square w-full object-cover"
              sizes={SIZES}
            />
          ) : (
            <div
              aria-hidden
              className={`${HEADING} flex aspect-square w-full items-center justify-center bg-navy text-3xl text-cream sm:text-6xl`}
            >
              {name
                .split(/\s+/)
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
          )}
          <div className="flex flex-1 flex-col items-center px-1 py-2 text-center sm:px-4 sm:py-3">
            <h3
              className={`${HEADING} text-xs break-words text-navy sm:text-lg`}
            >
              {name}
            </h3>
            <p
              className={`${MONO} mt-1 flex max-w-full items-center justify-center gap-1 text-ink/60 sm:gap-1.5`}
            >
              {logo && (
                <Image
                  src={logo}
                  alt=""
                  className="hidden size-3.5 shrink-0 rounded-[3px] object-contain sm:block"
                />
              )}
              {titleUrl ? (
                <a
                  href={titleUrl}
                  onClick={(e) => e.stopPropagation()}
                  {...(titleUrl.startsWith("/")
                    ? {}
                    : { target: "_blank", rel: "noopener noreferrer" })}
                  className="min-w-0 break-words underline underline-offset-2 transition-colors hover:text-navy"
                >
                  {title}
                </a>
              ) : (
                <span className="min-w-0 break-words">{title}</span>
              )}
            </p>
          </div>
          {canFlip && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFlipped(true);
              }}
              aria-label={`Turn over for ${name}'s ${n === 1 ? "session" : `${n} sessions`}`}
              title={`${n} ${n === 1 ? "session" : "sessions"}`}
              className="absolute right-0 bottom-0 size-9 bg-navy text-cream transition-colors outline-none [clip-path:polygon(100%_0,100%_100%,0_100%)] hover:bg-meeple focus-visible:bg-meeple sm:size-11"
            >
              <RotateCw
                aria-hidden
                className="absolute right-1 bottom-1 size-3 sm:right-1.5 sm:bottom-1.5 sm:size-3.5"
              />
            </button>
          )}
        </div>

        {canFlip && (
          <div
            inert={!flipped}
            onClick={() => setFlipped(false)}
            className={`${FACE} absolute inset-0 [transform:rotateY(180deg)] cursor-pointer bg-navy p-2 text-cream sm:p-3`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={`${MONO} truncate font-bold tracking-[0.1em] text-tan`}
              >
                {name.split(" ")[0]}&apos;s sessions
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipped(false);
                }}
                aria-label={`Turn ${name}'s card back`}
                className="grid size-6 shrink-0 place-items-center rounded-full text-cream/60 outline-none hover:bg-white/10 hover:text-cream focus-visible:ring-2 focus-visible:ring-tan"
              >
                <RotateCcw aria-hidden className="size-3" />
              </button>
            </div>
            <ul className="mt-1.5 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto sm:mt-2 sm:gap-2">
              {sessions.map((s) => {
                const Icon = CATEGORY_ICON[s.category ?? "other"];
                return (
                  <li key={s.slug} className="flex min-w-0 items-start gap-1.5">
                    <Icon
                      aria-hidden
                      className="mt-0.5 hidden size-3.5 shrink-0 text-tan sm:block"
                    />
                    <Link
                      href={sessionHref(s)}
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-0 text-left text-[11px] leading-snug outline-none hover:underline focus-visible:ring-2 focus-visible:ring-tan sm:text-[13px]"
                    >
                      <span className="line-clamp-3">{s.title}</span>
                      <span className="block font-space-mono text-[8px] tracking-[0.06em] text-sky uppercase sm:text-[9px]">
                        {formatPacificDay(s.startsAt).split(",")[0]}{" "}
                        {formatPacificTime(s.startsAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
