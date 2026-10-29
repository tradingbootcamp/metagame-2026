"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  days,
  formatTimeRange,
  hostNames,
  type Category,
  type Session,
} from "@/v2/lib/last-year-schedule";
import { CATEGORY_STYLES } from "@/v2/lib/schedule-styles";
import LastYearSessionModal from "../schedule/LastYearSessionModal";
import { DISPLAY } from "../styles";

type Kind = Extract<Category, "talk" | "workshop" | "game">;
const KINDS: { kind: Kind; label: string }[] = [
  { kind: "talk", label: "Talk" },
  { kind: "workshop", label: "Workshop" },
  { kind: "game", label: "Game" },
];
const LABEL = Object.fromEntries(KINDS.map((k) => [k.kind, k.label])) as Record<
  Kind,
  string
>;
const isKind = (c: Category | null): c is Kind =>
  c === "talk" || c === "workshop" || c === "game";

// Runs of one game ("Utility Monster 1a", "Escape Room Session 3", a kids'
// edition) are one card, under the plain title.
const plain = (title: string) =>
  title
    .replace(/[​*]/g, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+\d+[a-z]?$/i, "")
    .trim();

// Filed under a kind only because the schedule needed one; unfair questions.
const SKIP = new Set([
  "Opening Ceremony",
  "Closing Session",
  "Election voting & inauguration!",
  "Brendan thanks some of the team",
]);

type Card = { s: Session; kind: Kind; title: string; day: string };

// Every 2025 talk, workshop and game, once.
const DECK: Card[] = [];
{
  const seen = new Set<string>();
  for (const d of days)
    for (const s of d.sessions) {
      const title = plain(s.title);
      const key = title.toLowerCase();
      if (!isKind(s.category) || SKIP.has(title) || seen.has(key)) continue;
      seen.add(key);
      DECK.push({ s, kind: s.category, title, day: d.name });
    }
}

// The first card is fixed so the server and client agree; after that the
// deck deals a kind at random, then a card of that kind you haven't seen, so
// guessing "game" every time doesn't win.
const FIRST = Math.max(
  0,
  DECK.findIndex((c) => c.title === "Play This Talk"),
);
function draw(seen: Set<number>) {
  const piles = KINDS.map(({ kind }) =>
    DECK.flatMap((c, i) => (c.kind === kind && !seen.has(i) ? [i] : [])),
  ).filter((p) => p.length);
  const pile = piles[Math.floor(Math.random() * piles.length)];
  return pile[Math.floor(Math.random() * pile.length)];
}

// Ranks go by your best streak.
const RANKS = [
  { at: 0, name: "Rookie" },
  { at: 3, name: "Regular" },
  { at: 6, name: "Veteran" },
  { at: 10, name: "Metagamer" },
];

// §3: a trivia round on the 2025 program, played on the page. Each question
// is a real session; say whether it was a talk, a workshop or a game, and the
// answer comes up in place of the choices: what it was, who ran it and when.
export default function TriviaDeck() {
  const [card, setCard] = useState(FIRST);
  const [guess, setGuess] = useState<Kind | null>(null);
  const [score, setScore] = useState({
    played: 0,
    right: 0,
    streak: 0,
    best: 0,
  });
  const [open, setOpen] = useState(false);
  const seen = useRef(new Set([FIRST]));
  // Where focus goes once the answer is in, or the next question is up.
  const turned = useRef<"front" | "back" | null>(null);
  const firstGuess = useRef<HTMLButtonElement>(null);
  const nextCard = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (turned.current === "back")
      nextCard.current?.focus({ preventScroll: true });
    if (turned.current === "front")
      firstGuess.current?.focus({ preventScroll: true });
    turned.current = null;
  }, [card, guess]);

  const c = DECK[card];
  const right = guess === c.kind;

  const answer = (k: Kind) => {
    const hit = k === c.kind;
    setGuess(k);
    setScore((s) => {
      const streak = hit ? s.streak + 1 : 0;
      return {
        played: s.played + 1,
        right: s.right + (hit ? 1 : 0),
        streak,
        best: Math.max(s.best, streak),
      };
    });
    turned.current = "back";
  };
  const next = () => {
    if (seen.current.size >= DECK.length) seen.current.clear();
    const n = draw(seen.current);
    seen.current.add(n);
    setCard(n);
    setGuess(null);
    turned.current = "front";
  };

  const rank = RANKS.findLast((r) => score.best >= r.at)!;
  const up = RANKS.find((r) => r.at > score.best);
  const hosts = hostNames(c.s).join(", ");

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:items-start lg:gap-12">
      <div>
        <p className="flex items-center justify-between border-t-2 border-navy pt-2.5 font-space-mono text-[11px] font-bold tracking-[0.14em] text-navy uppercase">
          <span>Trivia · Card {score.played + (guess ? 0 : 1)}</span>
          <span
            aria-hidden
            className={`${DISPLAY} text-2xl leading-none ${guess && right ? "text-moss" : "text-meeple"}`}
          >
            {guess ? (right ? "✓" : "✗") : "?"}
          </span>
        </p>
        <p className="mt-6 font-space-mono text-[11px] tracking-[0.12em] text-ink/55 uppercase">
          On the 2025 schedule
        </p>
        <h3
          key={card}
          className={`${DISPLAY} mt-2 animate-in text-[clamp(40px,5.4vw,68px)] leading-[0.95] tracking-[0.01em] text-balance text-navy duration-500 fade-in slide-in-from-bottom-3`}
        >
          {c.title}
        </h3>

        {guess ? (
          <div
            role="group"
            aria-label="Answer"
            className="mt-7 animate-in duration-500 fade-in slide-in-from-bottom-2"
          >
            <p
              className={`${DISPLAY} text-[clamp(30px,3.6vw,40px)] leading-none ${right ? "text-moss" : "text-meeple"}`}
            >
              {right
                ? "Right!"
                : `Not quite: a ${LABEL[c.kind].toLowerCase()}.`}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-space-mono text-[11.5px] tracking-[0.06em] text-ink/60 uppercase">
              <span
                className="rounded px-1.5 py-0.5 font-bold text-navy"
                style={{ background: CATEGORY_STYLES[c.kind].background }}
              >
                {LABEL[c.kind]}
              </span>
              {c.day} · {formatTimeRange(c.s.start_time, c.s.end_time)}
              {c.s.location && ` · ${c.s.location.name}`}
            </p>
            {c.s.title !== c.title && (
              <p className="mt-3 text-[17px] leading-snug font-bold text-navy">
                {c.s.title}
              </p>
            )}
            {hosts && <p className="mt-2 text-[15px] text-ink/75">{hosts}</p>}
            {c.s.description && (
              <p className="mt-3 line-clamp-3 max-w-[40em] text-[14.5px] leading-relaxed text-ink/70">
                {c.s.description}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                ref={nextCard}
                type="button"
                onClick={next}
                className={`${DISPLAY} rounded-xl bg-navy px-5 py-2.5 text-[22px] leading-none tracking-[0.03em] text-cream transition-transform hover:-translate-y-0.5 active:translate-y-0`}
              >
                Next card →
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-sm font-bold text-navy underline underline-offset-4 hover:text-meeple"
              >
                Read the whole card
              </button>
            </div>
          </div>
        ) : (
          <div role="group" aria-label="Question" className="mt-8">
            <p className="text-[15px] font-semibold text-navy">
              Talk, workshop or game?
            </p>
            <div className="mt-3 grid max-w-[560px] grid-cols-3 gap-2">
              {KINDS.map(({ kind, label }, i) => (
                <button
                  key={kind}
                  ref={i === 0 ? firstGuess : undefined}
                  type="button"
                  onClick={() => answer(kind)}
                  style={{ background: CATEGORY_STYLES[kind].background }}
                  className={`${DISPLAY} rounded-xl border-2 border-navy py-3 text-[clamp(18px,2.4vw,24px)] leading-none tracking-[0.03em] text-navy transition-[translate] hover:-translate-y-0.5 active:translate-y-0`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside
        aria-label="Your score"
        className="border-t-2 border-navy pt-2.5 lg:border-t-0 lg:border-l-2 lg:pt-0 lg:pl-8"
      >
        <p className="font-space-mono text-xs font-bold tracking-[0.14em] text-meeple uppercase">
          Scoreboard
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-x-4 border-b border-navy/15 pb-3">
          {[
            ["Score", `${score.right}/${score.played}`],
            ["Streak", score.streak],
            ["Best", score.best],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="font-space-mono text-[10px] font-bold tracking-[0.14em] text-ink/55 uppercase">
                {label}
              </dt>
              <dd
                key={label === "Streak" ? score.streak : undefined}
                className={`${DISPLAY} mt-1 text-[36px] leading-none text-navy ${
                  label === "Streak" && score.streak > 0 ? "score-pop" : ""
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 font-space-mono text-[10.5px] font-bold tracking-[0.14em] text-meeple uppercase">
          Rank
        </p>
        <p className={`${DISPLAY} mt-1 text-[42px] leading-none text-navy`}>
          {rank.name}
        </p>
        <p className="mt-2 text-sm text-ink/70">
          {up ? (
            `${up.at} in a row makes you a ${up.name}.`
          ) : (
            <>
              Top rank. Now prove it in person:{" "}
              <Link
                href="/#tickets"
                className="font-bold text-navy underline underline-offset-2"
              >
                Metagame 2026
              </Link>
              .
            </>
          )}
        </p>
        <p aria-live="polite" className="sr-only">
          {guess &&
            `${right ? "Right" : "Not quite"}: ${c.s.title} was a ${LABEL[c.kind]}. Score ${score.right} of ${score.played}.`}
        </p>
      </aside>

      {open && (
        <LastYearSessionModal
          session={c.s}
          dayName={c.day}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
