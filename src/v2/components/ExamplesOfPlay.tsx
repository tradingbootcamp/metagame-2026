"use client";

import { useState } from "react";
import Link from "next/link";
import { SESSIONS_2026, type Session2026 } from "@/v2/data/sessions-2026";
import { SPEAKERS } from "@/v2/data/speakers";
import Glyph, { type GlyphName } from "./Glyph";
import { hostLine, isPlayed, KINDS } from "./sessions/kinds";
import SessionDialog from "./sessions/SessionDialog";
import { DISPLAY, TOKEN } from "./styles";

// Featured speakers' sessions first in each pile, so the opening hand
// shows them.
const FEATURED = new Set(SPEAKERS.map((p) => p.name));
const featured = (s: Session2026) =>
  s.hosts.some((h) => FEATURED.has(h)) ? 0 : 1;
const CONFIRMED = SESSIONS_2026.filter(
  (s) => s.status === "confirmed" && s.title,
).sort((a, b) => featured(a) - featured(b));

// The three piles a hand is dealt from, by each session's main kind, each
// with its token.
const PILES: {
  chip: string;
  token: string;
  glyph: GlyphName;
  sessions: Session2026[];
}[] = [
  {
    chip: "Talk",
    token: "bg-sky text-navy",
    glyph: "talks",
    sessions: CONFIRMED.filter((s) => s.kinds[0] === "talk"),
  },
  {
    chip: "Workshop",
    token: "bg-peach text-navy",
    glyph: "workshops",
    sessions: CONFIRMED.filter((s) => s.kinds[0] === "workshop"),
  },
  {
    chip: "Game",
    token: "bg-moss text-cream",
    glyph: "party-games",
    sessions: CONFIRMED.filter(
      (s) => isPlayed(s) && s.kinds[0] !== "talk" && s.kinds[0] !== "workshop",
    ),
  },
];

// §1's examples of play, right under rule one: three confirmed 2026
// sessions, one talk, one workshop and one game, set in columns under a rule.
// Deal again for a new hand; a title opens its session; the 2025 recap and
// every 2026 session are a click away. The first hand is fixed so the server
// and client agree.
export default function ExamplesOfPlay() {
  const [hand, setHand] = useState(() => PILES.map(() => 0));
  const [deals, setDeals] = useState(0);
  const [open, setOpen] = useState<Session2026 | null>(null);

  const deal = () => {
    setHand((h) =>
      PILES.map(({ sessions }, k) => {
        if (sessions.length < 2) return 0;
        let n = h[k];
        while (n === h[k]) n = Math.floor(Math.random() * sessions.length);
        return n;
      }),
    );
    setDeals((d) => d + 1);
  };

  return (
    <div>
      <p className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={`${DISPLAY} text-[28px] leading-none tracking-[0.02em] text-navy`}
        >
          Examples of play
        </span>
        <span className="font-space-mono text-[11px] tracking-[0.12em] text-ink/55 uppercase">
          Dealt from the 2026 program
        </span>
      </p>
      <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-3">
        {PILES.map(({ chip, token, glyph, sessions }, k) => {
          const s = sessions[hand[k]];
          return (
            <li
              key={`${deals}-${chip}`}
              className="animate-in border-t-2 border-navy pt-3.5 duration-500 fill-mode-backwards fade-in slide-in-from-bottom-8"
              style={{ animationDelay: `${k * 110}ms` }}
            >
              <button
                type="button"
                onClick={() => setOpen(s)}
                className="group flex h-full w-full flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-meeple focus-visible:ring-offset-4 focus-visible:ring-offset-background"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={`${TOKEN} size-10 transition-transform duration-300 group-hover:-rotate-12 ${token}`}
                  >
                    <Glyph name={glyph} className="size-6" />
                  </span>
                  <span className="font-space-mono text-[10.5px] font-bold tracking-[0.12em] text-navy uppercase">
                    {chip === "Game" ? KINDS[s.kinds[0]].label : chip}
                  </span>
                </span>
                <span className="mt-3.5 text-[18px] leading-snug font-bold text-navy decoration-meeple decoration-2 underline-offset-4 group-hover:underline">
                  {s.title}
                </span>
                <span className="mt-auto pt-3 font-space-mono text-[11px] tracking-[0.06em] text-ink/60 uppercase">
                  {hostLine(s)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={deal}
          className={`${DISPLAY} rounded-lg bg-navy px-5 py-2.5 text-xl leading-none tracking-[0.04em] text-cream transition-transform hover:-translate-y-0.5 active:translate-y-0`}
        >
          Deal again ↻
        </button>
        <Link
          href="/last-year"
          className={`${DISPLAY} rounded-lg border-2 border-navy px-5 py-2 text-xl leading-none tracking-[0.04em] text-navy transition-[translate,background-color] hover:-translate-y-0.5 hover:bg-navy/5 active:translate-y-0`}
        >
          The 2025 recap →
        </Link>
        <Link
          href="/sessions"
          className="text-sm font-bold text-navy underline underline-offset-4 hover:text-meeple"
        >
          Every 2026 session →
        </Link>
      </div>
      <SessionDialog session={open} onClose={() => setOpen(null)} browse />
    </div>
  );
}
