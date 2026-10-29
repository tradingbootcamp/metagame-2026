"use client";

import { useEffect, useRef, useState } from "react";
import { CHAPTERS, NIGHT_NAME } from "@/v2/data/chapters";
import { SESSIONS_2026, type Session2026 } from "@/v2/data/sessions-2026";
import Glyph, { type GlyphName } from "./Glyph";
import { isPlayed, KINDS } from "./sessions/kinds";
import SessionDialog from "./sessions/SessionDialog";
import { DISPLAY, TOKEN } from "./styles";

const CONFIRMED = SESSIONS_2026.filter(
  (s) => s.status === "confirmed" && s.title,
);
const SEE_EXPANSIONS = `See §${CHAPTERS.expansions.num}.`;

type Component = {
  glyph: GlyphName;
  token: string;
  title: string;
  body: string;
  /** Confirmed 2026 sessions of this kind, if it has any. */
  sessions?: Session2026[];
};

const COMPONENTS: Component[] = [
  {
    glyph: "talks",
    token: "bg-sky text-navy",
    title: "Talks",
    body: "Main-room talks from game designers, puzzle makers and people who study play.",
    sessions: CONFIRMED.filter((s) => s.kinds[0] === "talk"),
  },
  {
    glyph: "workshops",
    token: "bg-peach text-navy",
    title: "Workshops",
    body: "Design a horror scenario, dream up a roleplaying theme park, train as a troll.",
    sessions: CONFIRMED.filter((s) => s.kinds.includes("workshop")),
  },
  {
    glyph: "party-games",
    token: "bg-moss text-cream",
    title: "Games",
    body: "Sessions run by attendees: tournaments, LARPs, social deduction, indie TTRPGs and more.",
    sessions: CONFIRMED.filter(
      (s) => isPlayed(s) && !s.kinds.includes("megagame"),
    ),
  },
  {
    glyph: "megagame",
    token: "bg-tan text-navy",
    title: "The Megagame",
    body: `A puzzle hunt, game gauntlet and story that runs all weekend. ${SEE_EXPANSIONS}`,
    sessions: CONFIRMED.filter((s) => s.kinds.includes("megagame")),
  },
  {
    glyph: "card-games",
    token: "bg-navy text-cream",
    title: NIGHT_NAME,
    body: `Friday night's booths: games to play, things to try, makers to meet. ${SEE_EXPANSIONS}`,
  },
  {
    glyph: "trivia",
    token: "bg-brand-blue text-navy",
    title: "Snacks & drinks",
    body: "Free for the taking, with food trucks on site for meals.",
  },
];
const LIVE = COMPONENTS.flatMap((c, i) => (c.sessions?.length ? [i] : []));

// One live component's example changes at a time, round the table.
const TURN_MS = 1700;

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// §2 of the rulebook: what's in the box, each component a token and a few
// lines under a rule. The session components count their confirmed 2026
// sessions and keep dealing real examples (click one for its details).
export default function RulebookComponents() {
  const list = useRef<HTMLUListElement>(null);
  // Each component's examples, shuffled once mounted; the server shows them in
  // order.
  const [decks, setDecks] = useState(() =>
    COMPONENTS.map((c) => c.sessions ?? []),
  );
  const [shown, setShown] = useState(() => COMPONENTS.map(() => 0));
  // The component under the pointer keeps its example.
  const hovered = useRef<number | null>(null);
  const [open, setOpen] = useState<Session2026 | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDecks((d) => d.map(shuffle)), 0);
    return () => clearTimeout(t);
  }, []);

  // Deal only while the grid is on screen, the tab is visible and motion is
  // welcome.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    if (list.current) io.observe(list.current);
    let turn = 0;
    const id = window.setInterval(() => {
      if (!visible || document.hidden) return;
      const card = LIVE[turn++ % LIVE.length];
      if (card === hovered.current) return;
      setShown((s) => s.map((n, i) => (i === card ? n + 1 : n)));
    }, TURN_MS);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, []);

  return (
    <>
      <ul
        ref={list}
        className="grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3"
      >
        {COMPONENTS.map(({ glyph, token, title, body, sessions }, i) => {
          const deck = decks[i];
          const s = deck.length ? deck[shown[i] % deck.length] : null;
          return (
            <li
              key={title}
              onMouseEnter={() => {
                hovered.current = i;
              }}
              onMouseLeave={() => {
                hovered.current = null;
              }}
              className="rulebook-rise group flex flex-col gap-2 border-t-2 border-navy pt-4"
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`${TOKEN} size-14 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-12 ${token}`}
                  // The card-games glyph's front card matches its token.
                  style={
                    { "--glyph-bg": "var(--color-navy)" } as React.CSSProperties
                  }
                >
                  <Glyph name={glyph} className="size-9" />
                </span>
                {sessions && (
                  <p className="text-right leading-none text-navy">
                    <span className={`${DISPLAY} block text-[38px]`}>
                      {sessions.length}
                    </span>
                    <span className="font-space-mono text-[10px] font-bold tracking-[0.12em] text-ink/55 uppercase">
                      confirmed
                    </span>
                  </p>
                )}
              </div>
              <h3
                className={`${DISPLAY} mt-2 text-[30px] leading-none tracking-[0.02em] text-navy`}
              >
                {title}
              </h3>
              <p className="text-[15px] leading-[1.45] text-ink/75">{body}</p>
              {s && (
                <button
                  type="button"
                  onClick={() => setOpen(s)}
                  aria-label={`${s.title}: details`}
                  className="group/eg mt-1 flex items-baseline gap-2 overflow-hidden text-left text-navy outline-none focus-visible:ring-2 focus-visible:ring-meeple"
                >
                  <span className="shrink-0 font-space-mono text-[10px] font-bold tracking-[0.12em] text-meeple uppercase">
                    e.g.
                  </span>
                  <span
                    key={s.slug}
                    className="min-w-0 flex-1 animate-in truncate text-[14.5px] font-semibold underline decoration-navy/25 underline-offset-4 duration-500 fade-in slide-in-from-bottom-3 group-hover/eg:decoration-meeple"
                  >
                    {s.title}
                  </span>
                  {title === "Games" && (
                    <span className="hidden shrink-0 font-space-mono text-[10px] tracking-[0.08em] text-ink/55 uppercase sm:inline">
                      {KINDS[s.kinds[0]].label}
                    </span>
                  )}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <SessionDialog session={open} onClose={() => setOpen(null)} browse />
    </>
  );
}
