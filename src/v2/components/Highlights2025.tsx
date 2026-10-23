"use client";

import { useState } from "react";
import Link from "next/link";
import { HIGHLIGHTS_2025 } from "@/v2/data/highlights-2025";
import Glyph, { type GlyphName } from "./Glyph";
import RulebookFigure from "./RulebookFigure";
import { DISPLAY } from "./styles";

// How each 2025 group reads as a card: its chip, colours and glyph.
const KINDS: Record<string, { chip: string; tile: string; glyph: GlyphName }> =
  {
    Talks: { chip: "Talk", tile: "bg-sky text-navy", glyph: "talks" },
    Workshops: {
      chip: "Workshop",
      tile: "bg-peach text-navy",
      glyph: "workshops",
    },
    "Games & More": {
      chip: "Game",
      tile: "bg-moss text-cream",
      glyph: "party-games",
    },
  };

// Dealt cards sit a little askew, like a hand on the table.
const TILT = ["-rotate-2", "rotate-1", "rotate-2"];

// The photo that hides a Hat Trick faction hat stays on the page as Fig. 2.
const FIGURE =
  HIGHLIGHTS_2025.find((g) => g.hats?.length) ?? HIGHLIGHTS_2025[0];

// Last year as the rulebook's "examples of play": a hand of three session
// cards, one talk, one workshop and one game from 2025, and a button to deal
// a new hand. The first hand is fixed so the server and client agree.
export default function Highlights2025() {
  const [hand, setHand] = useState(() => HIGHLIGHTS_2025.map(() => 0));
  const [deals, setDeals] = useState(0);

  const deal = () => {
    setHand((h) =>
      HIGHLIGHTS_2025.map((g, k) => {
        if (g.sessions.length < 2) return 0;
        let n = h[k];
        while (n === h[k]) n = Math.floor(Math.random() * g.sessions.length);
        return n;
      }),
    );
    setDeals((d) => d + 1);
  };

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
      <RulebookFigure
        fig="2"
        caption={`${FIGURE.label} at Metagame 2025.`}
        src={FIGURE.photo}
        alt={FIGURE.alt}
        hats={FIGURE.hats}
      />
      <div>
        <ul className="grid gap-4 sm:grid-cols-3 sm:gap-3">
          {HIGHLIGHTS_2025.map((g, k) => {
            const kind = KINDS[g.label] ?? KINDS.Talks;
            const s = g.sessions[hand[k]];
            return (
              <li
                key={`${deals}-${g.label}`}
                className="animate-in duration-500 fill-mode-backwards fade-in slide-in-from-bottom-8"
                style={{ animationDelay: `${k * 110}ms` }}
              >
                <article
                  className={`flex h-full min-h-[140px] flex-col rounded-xl border-2 border-navy bg-white p-4 shadow-[4px_4px_0_0_var(--color-navy)] transition-transform duration-300 hover:-translate-y-1 hover:rotate-0 sm:min-h-[220px] ${TILT[k % TILT.length]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-md px-2 py-1 font-space-mono text-[10.5px] font-bold tracking-[0.12em] uppercase ${kind.tile}`}
                    >
                      {kind.chip}
                    </span>
                    <Glyph name={kind.glyph} className="size-7 text-navy/70" />
                  </div>
                  <h4 className="mt-4 text-[17px] leading-snug font-bold text-navy">
                    {s.title}
                  </h4>
                  {s.hosts && (
                    <p className="mt-auto pt-4 font-space-mono text-[11px] tracking-[0.06em] text-ink/60 uppercase">
                      {s.hosts}
                    </p>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            type="button"
            onClick={deal}
            className={`${DISPLAY} rounded-lg bg-navy px-5 py-2.5 text-xl leading-none tracking-[0.04em] text-cream transition-transform hover:-translate-y-0.5 active:translate-y-0`}
          >
            Deal again ↻
          </button>
          <Link
            href="/last-year"
            className="text-sm font-bold text-navy underline underline-offset-4 hover:text-meeple"
          >
            See all of 2025&apos;s sessions →
          </Link>
        </div>
      </div>
    </div>
  );
}
