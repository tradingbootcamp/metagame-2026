"use client";

import { useState } from "react";
import { DISPLAY } from "./styles";

// Rule one, played rather than listed: a short deck of things to call
// "counts" or "doesn't count", judged by the site's own definition of a game
// (designed to be played, not passively consumed). The last card is the
// brand's twist.
const CARDS: { thing: string; counts: boolean; why: string }[] = [
  {
    thing: "A crossword",
    counts: true,
    why: "Every square was set for you to solve.",
  },
  {
    thing: "A rock-climbing route",
    counts: true,
    why: "Someone set every hold asking where you'd reach next.",
  },
  {
    thing: "A movie",
    counts: false,
    why: "It's made to be watched, not played.",
  },
  {
    thing: "A LARP",
    counts: true,
    why: "You decide what your character does next.",
  },
  {
    thing: "A talk about game design",
    counts: false,
    why: "Not a game. It's on the schedule anyway.",
  },
  {
    thing: "A video game",
    counts: true,
    why: "Every level asks what you'll do next.",
  },
  {
    thing: "A board game",
    counts: true,
    why: "Board games count, too.",
  },
];

export default function DoesItCount() {
  const [i, setI] = useState(0);
  const [call, setCall] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const done = i === CARDS.length;
  const card = CARDS[Math.min(i, CARDS.length - 1)];

  const answer = (counts: boolean) => {
    setCall(counts);
    if (counts === card.counts) setScore((s) => s + 1);
  };
  const next = () => {
    setI((n) => n + 1);
    setCall(null);
  };
  const again = () => {
    setI(0);
    setCall(null);
    setScore(0);
  };

  return (
    <div className="relative overflow-hidden rounded-[14px] border-2 border-navy bg-white p-5 shadow-[6px_6px_0_0_var(--color-navy)] sm:p-6">
      <div className="flex items-baseline justify-between gap-3 font-space-mono text-xs font-bold tracking-[0.14em] uppercase">
        <span className="text-meeple">Does it count?</span>
        <span className="text-ink/50">
          {done ? "Final score" : `Card ${i + 1} of ${CARDS.length}`}
        </span>
      </div>

      {done ? (
        <div key="done" className="animate-in duration-300 fade-in">
          <p
            className={`${DISPLAY} mt-3 text-[clamp(40px,5vw,60px)] leading-none text-navy`}
          >
            {score} / {CARDS.length}
          </p>
          <p className="mt-2 text-ink/80">
            {score === CARDS.length
              ? "Perfect. You already know rule one."
              : "Rule one again: if it's designed to be played, it counts."}
          </p>
          <button
            type="button"
            onClick={again}
            className="mt-5 rounded-lg border-2 border-navy px-4 py-2 text-sm font-bold text-navy transition-colors hover:bg-navy hover:text-cream"
          >
            Play again
          </button>
        </div>
      ) : (
        <div
          key={i}
          className="animate-in duration-300 fade-in slide-in-from-right-6"
        >
          <p
            className={`${DISPLAY} mt-3 min-h-[2lh] text-[clamp(36px,4.4vw,54px)] leading-[0.95] text-navy sm:min-h-0`}
          >
            {card.thing}
          </p>
          {call === null ? (
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => answer(true)}
                className="rounded-lg bg-moss px-5 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                Counts
              </button>
              <button
                type="button"
                onClick={() => answer(false)}
                className="rounded-lg bg-meeple px-5 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                Doesn&apos;t count
              </button>
            </div>
          ) : (
            <div aria-live="polite" className="mt-4">
              <div className="flex flex-wrap items-center gap-4">
                <span
                  className={`${DISPLAY} inline-block -rotate-6 animate-in rounded-md border-[3px] px-3 py-1 text-[28px] leading-none duration-200 fade-in zoom-in-150 ${
                    card.counts
                      ? "border-moss text-moss"
                      : "border-meeple text-meeple"
                  }`}
                >
                  {card.counts ? "Counts" : "Doesn't count"}
                </span>
                <span className="font-space-mono text-xs tracking-[0.08em] text-ink/60 uppercase">
                  {call === card.counts ? "✓ You got it" : "✗ Not quite"}
                </span>
              </div>
              <p className="mt-3 text-ink/80">{card.why}</p>
              <button
                type="button"
                onClick={next}
                className="mt-4 text-sm font-bold text-navy underline underline-offset-4 hover:text-meeple"
              >
                {i === CARDS.length - 1 ? "See your score →" : "Next card →"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
