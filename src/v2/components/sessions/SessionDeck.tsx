"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Layers, Search } from "lucide-react";
import ChapterSection, { PAGE } from "@/v2/components/ChapterHeading";
import { NoPuzzle } from "@/v2/components/dividers/DividerRow";
import GoDivider from "@/v2/components/dividers/go";
import JigsawDivider from "@/v2/components/dividers/jigsaw";
import TetrisDivider from "@/v2/components/dividers/tetris";
import { SESSIONS_CHAPTERS } from "@/v2/data/chapters";
import {
  SESSIONS_2026,
  type Session2026,
  type SessionKind,
  type SessionStatus,
} from "@/v2/data/sessions-2026";
import { cn } from "@/v2/lib/utils";
import { DISPLAY, SECTION_ANCHOR, TOKEN } from "../styles";
import { collect, useCollection } from "./collection";
import { hostLine, KINDS, STATUS } from "./kinds";
import SessionDialog from "./SessionDialog";

// One chapter per status, in page order, each under a game divider like the
// home page's chapters (out of the cover puzzle, which lives there).
const GROUPS = [
  {
    status: "confirmed",
    chapter: SESSIONS_CHAPTERS.confirmed,
    rule: <TetrisDivider />,
  },
  { status: "review", chapter: SESSIONS_CHAPTERS.review, rule: <GoDivider /> },
  {
    status: "unconference",
    chapter: SESSIONS_CHAPTERS.unconference,
    rule: <JigsawDivider />,
  },
] as const;

// The kinds that appear, most common first, for the filter chips.
const KIND_COUNTS = (Object.keys(KINDS) as SessionKind[])
  .map((kind) => ({
    kind,
    n: SESSIONS_2026.filter((s) => s.kinds.includes(kind)).length,
  }))
  .filter((k) => k.n > 0)
  .sort((a, b) => b.n - a.n);

// What the search box looks through.
const TEXT = new Map(
  SESSIONS_2026.map((s) => [
    s.slug,
    [
      s.title ?? "",
      ...s.hosts,
      s.org ?? "",
      s.blurb,
      ...s.kinds.map((k) => KINDS[k].label),
    ]
      .join(" ")
      .toLowerCase(),
  ]),
);

// Confirmed sessions sit under a solid rule; in-review ones under a dashed,
// faded one, so nobody mistakes them for the program.
const RULE: Record<SessionStatus, string> = {
  confirmed: "border-navy",
  review: "border-dashed border-navy/40",
  unconference: "border-navy/50",
};
// One session in the deck, on the page: its kind's token and a few lines
// under a rule. One you've turned over carries a check, for the collection.
function SessionCard({
  s,
  collected,
  onOpen,
}: {
  s: Session2026;
  collected: boolean;
  onOpen: (s: Session2026) => void;
}) {
  const { Icon, label, band } = KINDS[s.kinds[0]];
  const review = s.status === "review";
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(s)}
        className={cn(
          "group flex h-full w-full flex-col gap-2 border-t-2 pt-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-meeple focus-visible:ring-offset-4 focus-visible:ring-offset-background",
          RULE[s.status],
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-space-mono text-[10.5px] font-bold tracking-[0.12em] text-navy uppercase">
            <span
              className={cn(
                TOKEN,
                "size-8 transition-transform duration-300 group-hover:-rotate-12",
                review || band === "bg-background"
                  ? "border border-dashed border-navy/40"
                  : band,
              )}
            >
              <Icon aria-hidden className="size-4" />
            </span>
            {label}
          </span>
          {(s.duration || collected) && (
            <span className="flex items-center gap-1.5 text-right font-space-mono text-[10.5px] tracking-[0.06em] text-navy/70 uppercase">
              {s.duration}
              {collected && (
                <>
                  <CircleCheck
                    aria-hidden
                    className="size-4 shrink-0 fill-navy text-white"
                  />
                  <span className="sr-only">Collected</span>
                </>
              )}
            </span>
          )}
        </span>
        <span
          className={cn(
            "text-[17px] leading-snug font-bold decoration-meeple decoration-2 underline-offset-4 group-hover:underline",
            !s.title
              ? "text-ink/45 italic"
              : review
                ? "text-navy/75"
                : "text-navy",
          )}
        >
          {s.title ?? "Title to come"}
        </span>
        <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="font-space-mono text-[11px] tracking-[0.06em] text-ink/60 uppercase">
            {hostLine(s)}
          </span>
          {s.status !== "confirmed" && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 font-space-mono text-[10px] font-bold tracking-[0.1em] uppercase",
                STATUS[s.status].chip,
              )}
            >
              {STATUS[s.status].label}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

// Every 2026 session so far, as a deck: a control bar (deal a random one,
// search, filter by kind, your collection so far), then one chapter per
// status. A card opens its details and joins the collection; /sessions#slug
// links straight to one, and ?q= prefills the search.
export default function SessionDeck() {
  const [kind, setKind] = useState<SessionKind | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Session2026 | null>(null);
  const collection = useCollection();
  const collected = SESSIONS_2026.filter((s) => collection.has(s.slug)).length;

  // Read the link once mounted (the timer keeps setState out of the effect
  // body), and open whatever session a later #slug names.
  useEffect(() => {
    const fromHash = () => {
      const slug = decodeURIComponent(window.location.hash.slice(1));
      const s = SESSIONS_2026.find((x) => x.slug === slug);
      if (!s) return;
      setOpen(s);
      collect(s.slug);
    };
    const t = setTimeout(() => {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) setQuery(q);
      fromHash();
    }, 0);
    window.addEventListener("hashchange", fromHash);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", fromHash);
    };
  }, []);

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = SESSIONS_2026.filter(
    (s) =>
      (!kind || s.kinds.includes(kind)) &&
      terms.every((w) => TEXT.get(s.slug)!.includes(w)),
  );
  const filtered = kind !== null || terms.length > 0;

  const show = (s: Session2026) => {
    setOpen(s);
    collect(s.slug);
    history.replaceState(null, "", `#${s.slug}`);
  };
  const hide = () => {
    setOpen(null);
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };
  // Deals from the confirmed sessions in view, or from whatever is in view.
  const deal = () => {
    const confirmed = shown.filter((s) => s.status === "confirmed");
    const pool = confirmed.length ? confirmed : shown;
    if (pool.length) show(pool[Math.floor(Math.random() * pool.length)]);
  };

  const chip = (active: boolean) =>
    cn(
      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-space-mono text-[11px] font-bold tracking-[0.08em] whitespace-nowrap uppercase transition-colors",
      active
        ? "border-navy bg-navy text-cream"
        : "border-navy/25 text-navy hover:border-navy",
    );

  return (
    <>
      <div id="deck" className={cn(PAGE, SECTION_ANCHOR, "pb-4")}>
        <div className="flex flex-col gap-4 border-y-2 border-navy py-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="button"
              onClick={deal}
              className={`${DISPLAY} flex items-center gap-2 rounded-xl bg-navy py-2 pr-4 pl-3 text-[22px] leading-none text-cream transition-transform hover:-translate-y-0.5 active:translate-y-0`}
            >
              <Layers aria-hidden className="size-5" />
              Deal me a session
            </button>
            <label className="flex min-w-[220px] flex-1 items-center gap-2 border-b-2 border-navy py-2 transition-colors focus-within:border-meeple">
              <Search aria-hidden className="size-5 shrink-0 text-meeple" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, hosts, descriptions…"
                aria-label="Search the sessions"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink/45"
              />
            </label>
            <span
              aria-live="polite"
              className="font-space-mono text-xs tracking-[0.1em] text-ink/60 uppercase"
            >
              {filtered
                ? `${shown.length} of ${SESSIONS_2026.length} sessions`
                : `${SESSIONS_2026.length} sessions`}
            </span>
            {collected > 0 && (
              <span
                title="Sessions you've turned over, kept in this browser"
                className="flex items-center gap-1.5 font-space-mono text-xs font-bold tracking-[0.1em] text-meeple uppercase"
              >
                <CircleCheck aria-hidden className="size-4" />
                {collected} of {SESSIONS_2026.length} collected
              </span>
            )}
          </div>
          <div
            role="group"
            aria-label="Filter by kind"
            className="-mx-1 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-1 pb-0.5 sm:flex-wrap"
          >
            <button
              type="button"
              aria-pressed={kind === null}
              onClick={() => setKind(null)}
              className={chip(kind === null)}
            >
              All
            </button>
            {KIND_COUNTS.map(({ kind: k, n }) => {
              const { Icon, label } = KINDS[k];
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(kind === k ? null : k)}
                  className={chip(kind === k)}
                >
                  <Icon aria-hidden className="size-3.5" />
                  {label}
                  <span className="opacity-60">{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <NoPuzzle>
        {GROUPS.map(({ status, chapter, rule }) => {
          const all = SESSIONS_2026.filter((s) => s.status === status).length;
          const cards = shown.filter((s) => s.status === status);
          return (
            <ChapterSection
              key={status}
              rule={rule}
              chapter={{
                ...chapter,
                aka: `${filtered ? `${cards.length} of ` : ""}${all} · ${chapter.aka}`,
              }}
            >
              {cards.length ? (
                <ul className="grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
                  {cards.map((s) => (
                    <SessionCard
                      key={s.slug}
                      s={s}
                      collected={collection.has(s.slug)}
                      onOpen={show}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-ink/60">Nothing here matches.</p>
              )}
            </ChapterSection>
          );
        })}
      </NoPuzzle>

      <SessionDialog session={open} onClose={hide} />
    </>
  );
}
