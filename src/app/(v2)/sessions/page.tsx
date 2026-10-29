import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { PAGE } from "@/v2/components/ChapterHeading";
import SessionDeck from "@/v2/components/sessions/SessionDeck";
import SessionPack from "@/v2/components/sessions/SessionPack";
import { DISPLAY, SECTION_ANCHOR } from "@/v2/components/styles";
import { Button } from "@/v2/components/ui/button";
import { SESSIONS_2026, type SessionStatus } from "@/v2/data/sessions-2026";

export const metadata: Metadata = {
  title: "Sessions — Metagame 2026",
  description:
    "Every session submitted for Metagame 2026 so far, marked confirmed, in review or unconference. Open a booster pack for five at random.",
};

const count = (status: SessionStatus) =>
  SESSIONS_2026.filter((s) => s.status === status).length;

// The cover's numbers, counted from the session list.
const STATS = [
  { label: "Confirmed", value: count("confirmed") },
  { label: "In review", value: count("review") },
  { label: "Unconference", value: count("unconference") },
];

// /sessions: every 2026 session so far, as a deck to play with. A cover with
// the counts and a booster pack to open (SessionPack), the whole deck sorted
// by where each session stands (SessionDeck), and a back cover to tickets.
export default function SessionsPage() {
  return (
    <>
      <section id="top" className={SECTION_ANCHOR}>
        <div
          className={`${PAGE} grid items-center gap-10 pt-10 pb-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12 lg:pt-14`}
        >
          <div>
            <p className="font-space-mono text-xs font-bold tracking-[0.14em] text-meeple uppercase">
              The rulebook · 2026 edition
            </p>
            <h1
              className={`${DISPLAY} mt-3.5 text-[clamp(64px,9vw,128px)] leading-[0.86] text-navy`}
            >
              Sessions
              <br />
              so far<span className="text-meeple">.</span>
            </h1>
            <p className="mt-5 font-space-mono text-sm font-bold tracking-[0.12em] text-navy uppercase">
              Nov 6–8, 2026 · Lighthaven, Berkeley
            </p>
            <p className="mt-3 max-w-[30em] text-lg leading-relaxed text-ink/80 sm:text-xl">
              Every session submitted for Metagame 2026. Tear open a pack for
              five at random, or browse the whole deck. Times and rooms
              aren&apos;t set yet.
            </p>
            <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-3">
              {STATS.map(({ label, value }, i) => (
                <div key={label} className="flex items-baseline gap-2">
                  <dt className="order-last font-space-mono text-[11px] font-bold tracking-[0.12em] text-ink/60 uppercase">
                    {label}
                  </dt>
                  <dd
                    className={`${DISPLAY} text-[44px] leading-none tracking-[0.02em] text-navy`}
                  >
                    <span className="sr-only">{value}</span>
                    <span
                      aria-hidden
                      className="count-up"
                      style={
                        {
                          "--to": value,
                          animationDelay: `${150 + i * 90}ms`,
                        } as CSSProperties
                      }
                    />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <a href="#deck">Browse the deck ↓</a>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="border-2 border-navy text-navy hover:border-navy hover:bg-navy/5"
              >
                <Link href="/#tickets">Get tickets</Link>
              </Button>
            </div>
          </div>

          <SessionPack />
        </div>
      </section>

      <SessionDeck />

      {/* The back cover. */}
      <section aria-labelledby="see-you" className={SECTION_ANCHOR}>
        <div className={`${PAGE} pb-20`}>
          <div className="grid gap-8 border-t-2 border-navy pt-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
            <div>
              <p className="font-space-mono text-xs font-bold tracking-[0.14em] text-meeple uppercase">
                Your move
              </p>
              <h2
                id="see-you"
                className={`${DISPLAY} mt-2 text-[clamp(44px,6vw,72px)] leading-[0.9] tracking-[0.01em] text-navy`}
              >
                Play them in person
              </h2>
              <p className="mt-3 font-space-mono text-sm font-bold tracking-[0.12em] text-navy uppercase">
                Nov 6–8, 2026 · Lighthaven, Berkeley
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/#tickets">Get tickets</Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="border-2 border-navy text-navy hover:border-navy hover:bg-navy/5"
              >
                <Link href="/last-year">What happened last year?</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
