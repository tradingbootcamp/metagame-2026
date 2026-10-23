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

const FACE =
  "flex flex-col overflow-hidden rounded-[18px] border-2 border-navy bg-white shadow-[6px_6px_0_0_var(--color-navy)] [grid-area:1/1] [backface-visibility:hidden]";

// §3: a trivia round on the 2025 program. Each card is a real session; say
// whether it was a talk, a workshop or a game and the card flips to show
// what it was, who ran it and when.
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
  // Where focus goes once the card has turned.
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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:items-start">
      <div className="[perspective:1600px]">
        <div
          className={`grid transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none ${
            guess ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <div
            role="group"
            aria-label="Question"
            inert={!!guess}
            className={FACE}
          >
            <div className="flex items-center justify-between bg-navy px-5 py-2.5 text-cream">
              <span className="font-space-mono text-[11px] font-bold tracking-[0.14em] uppercase">
                Trivia · Card {score.played + (guess ? 0 : 1)}
              </span>
              <span aria-hidden className={`${DISPLAY} text-xl text-tan`}>
                ?
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5 sm:p-7">
              <p className="font-space-mono text-[11px] tracking-[0.12em] text-ink/55 uppercase">
                On the 2025 schedule
              </p>
              <h3
                className={`${DISPLAY} mt-2 text-[clamp(34px,4.4vw,52px)] leading-[0.95] tracking-[0.01em] text-balance text-navy`}
              >
                {c.title}
              </h3>
              <p className="mt-auto pt-8 text-[15px] font-semibold text-navy">
                Talk, workshop or game?
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {KINDS.map(({ kind, label }, i) => (
                  <button
                    key={kind}
                    ref={i === 0 ? firstGuess : undefined}
                    type="button"
                    onClick={() => answer(kind)}
                    style={{ background: CATEGORY_STYLES[kind].background }}
                    className={`${DISPLAY} rounded-xl border-2 border-navy py-3 text-[clamp(18px,2.4vw,24px)] leading-none tracking-[0.03em] text-navy transition-[translate,box-shadow] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_var(--color-navy)] active:translate-y-0`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            role="group"
            aria-label="Answer"
            inert={!guess}
            className={`${FACE} [transform:rotateY(180deg)]`}
          >
            <div
              className="flex items-center justify-between border-b-2 border-navy px-5 py-2.5"
              style={{ background: CATEGORY_STYLES[c.kind].background }}
            >
              <span className="font-space-mono text-[11px] font-bold tracking-[0.14em] text-navy uppercase">
                {LABEL[c.kind]} · {c.day}
              </span>
              <span aria-hidden className={`${DISPLAY} text-xl text-navy`}>
                {right ? "✓" : "✗"}
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5 sm:p-7">
              <p
                className={`${DISPLAY} text-[clamp(30px,3.6vw,40px)] leading-none ${right ? "text-moss" : "text-meeple"}`}
              >
                {right
                  ? "Right!"
                  : `Not quite: a ${LABEL[c.kind].toLowerCase()}.`}
              </p>
              <h3 className="mt-3 text-[19px] leading-snug font-bold text-navy">
                {c.s.title}
              </h3>
              <p className="mt-1 font-space-mono text-[11.5px] tracking-[0.06em] text-ink/60 uppercase">
                {formatTimeRange(c.s.start_time, c.s.end_time)}
                {c.s.location && ` · ${c.s.location.name}`}
              </p>
              {hosts && <p className="mt-2 text-[15px] text-ink/75">{hosts}</p>}
              {c.s.description && (
                <p className="mt-3 line-clamp-3 text-[14.5px] leading-relaxed text-ink/70">
                  {c.s.description}
                </p>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
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
          </div>
        </div>
      </div>

      <aside
        aria-label="Your score"
        className="rounded-[18px] bg-navy p-5 text-cream sm:p-6"
      >
        <p className="font-space-mono text-xs font-bold tracking-[0.14em] text-sky uppercase">
          Scoreboard
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] bg-white/20">
          {[
            ["Score", `${score.right}/${score.played}`],
            ["Streak", score.streak],
            ["Best", score.best],
          ].map(([label, value]) => (
            <div key={label} className="bg-navy px-3 py-2.5">
              <dt className="font-space-mono text-[10px] font-bold tracking-[0.14em] text-tan uppercase">
                {label}
              </dt>
              <dd
                key={label === "Streak" ? score.streak : undefined}
                className={`${DISPLAY} mt-1 text-[32px] leading-none ${
                  label === "Streak" && score.streak > 0 ? "score-pop" : ""
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 font-space-mono text-[10.5px] font-bold tracking-[0.14em] text-tan uppercase">
          Rank
        </p>
        <p className={`${DISPLAY} mt-1 text-[38px] leading-none`}>
          {rank.name}
        </p>
        <p className="mt-2 text-sm text-cream/75">
          {up ? (
            `${up.at} in a row makes you a ${up.name}.`
          ) : (
            <>
              Top rank. Now prove it in person:{" "}
              <Link
                href="/#tickets"
                className="font-bold text-cream underline underline-offset-2"
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
