"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Scissors, Star } from "lucide-react";
import Mg2Die from "@/v2/components/nav/Mg2Die";
import { SESSIONS_2026, type Session2026 } from "@/v2/data/sessions-2026";
import { SPEAKERS } from "@/v2/data/speakers";
import { cn } from "@/v2/lib/utils";
import { DISPLAY } from "../styles";
import { collect } from "./collection";
import { hostLine, KINDS, STATUS } from "./kinds";
import { LEAN, lean, SHINE, unlean } from "./lean";
import SessionDialog from "./SessionDialog";

// A pack is dealt from what's on (confirmed or unconference, and named): four
// sessions at random, then one run by a featured speaker (the home page's
// players), saved for last and printed in foil.
const SPEAKER_NAMES = new Set(SPEAKERS.map((p) => p.name));
const ON = SESSIONS_2026.filter((s) => s.status !== "review" && s.title);
const byFeatured = (s: Session2026) =>
  s.hosts.some((h) => SPEAKER_NAMES.has(h));
const FEATURED = ON.filter(byFeatured);
const OTHERS = ON.filter((s) => !byFeatured(s));
const PACK = 5;

function draw<T>(xs: readonly T[], n: number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
const dealPack = () => [...draw(OTHERS, PACK - 1), ...draw(FEATURED, 1)];

// The wrapper's crimped ends, as clip paths: teeth along the top of the strip
// that tears off, and along the bottom of the pack.
const TEETH = 14;
const teeth = (peak: string, valley: string) =>
  Array.from(
    { length: TEETH * 2 + 1 },
    (_, i) =>
      `${((i / (TEETH * 2)) * 100).toFixed(2)}% ${i % 2 ? peak : valley}`,
  );
const CRIMP_TOP = `polygon(${[...teeth("0px", "6px"), "100% 100%", "0% 100%"].join(",")})`;
const CRIMP_BOTTOM = `polygon(${["0% 0%", "100% 0%", ...teeth("100%", "calc(100% - 6px)").reverse()].join(",")})`;

// How long the wrapper takes to tear before the cards come out.
const TEAR_MS = 450;

const CONTROL =
  "flex items-center gap-1.5 rounded-lg px-3 py-2 font-space-mono text-[11px] font-bold tracking-[0.1em] uppercase transition-colors";

// /sessions' booster pack: tear the wrapper and five cards come out face
// down. Turn each one over (the last is the foil one), then click a card for
// its details. Every card turned joins your collection (collection.ts).
export default function SessionPack() {
  const [pack, setPack] = useState<Session2026[] | null>(null);
  const [up, setUp] = useState<boolean[]>([]);
  const [deals, setDeals] = useState(0);
  const [tearing, setTearing] = useState(false);
  const [open, setOpen] = useState<Session2026 | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const deal = () => {
    setPack(dealPack());
    setUp(Array(PACK).fill(false));
    setDeals((d) => d + 1);
  };
  const tear = () => {
    if (tearing) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return deal();
    setTearing(true);
    timer.current = setTimeout(() => {
      setTearing(false);
      deal();
    }, TEAR_MS);
  };
  const turn = (i: number) => {
    if (!pack) return;
    if (up[i]) return setOpen(pack[i]);
    setUp((u) => u.map((v, j) => v || j === i));
    collect(pack[i].slug);
  };
  const turnAll = () => {
    if (!pack) return;
    setUp(pack.map(() => true));
    collect(...pack.map((s) => s.slug));
  };
  const anyUp = up.some(Boolean);

  return (
    <div className="text-navy">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t-2 border-navy pt-2.5">
        <p className="font-space-mono text-xs font-bold tracking-[0.14em] text-meeple uppercase">
          Booster pack
        </p>
        <p className="font-space-mono text-[11px] tracking-[0.1em] text-ink/60 uppercase">
          5 sessions · 1 in foil
        </p>
      </div>

      {pack ? (
        <>
          <ul className="mt-4 flex flex-wrap justify-center gap-3">
            {pack.map((s, i) => (
              <li
                key={`${deals}-${s.slug}`}
                className="w-[calc((100%-0.75rem)/2)] animate-in duration-500 fill-mode-backwards slide-in-from-top-10 zoom-in-90 fade-in sm:w-[calc((100%-1.5rem)/3)]"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <PackCard
                  s={s}
                  up={up[i]}
                  foil={i === PACK - 1}
                  onTurn={() => turn(i)}
                />
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <p className="text-sm text-ink/65">
              {anyUp
                ? "Click a turned card for its details."
                : "Click a card to turn it over."}
            </p>
            <div className="flex flex-wrap gap-2">
              {!up.every(Boolean) && (
                <button
                  type="button"
                  onClick={turnAll}
                  className={cn(
                    CONTROL,
                    "border-2 border-navy py-1.5 hover:bg-navy/5",
                  )}
                >
                  Turn them all
                </button>
              )}
              <button
                type="button"
                onClick={deal}
                className={cn(CONTROL, "bg-tan text-navy hover:bg-peach")}
              >
                <RotateCcw aria-hidden className="size-3.5" />
                Another pack
              </button>
            </div>
          </div>
        </>
      ) : (
        <SealedPack tearing={tearing} onTear={tear} />
      )}

      <SessionDialog session={open} onClose={() => setOpen(null)} />
    </div>
  );
}

// The unopened pack: a foil wrapper with a strip to tear off.
function SealedPack({
  tearing,
  onTear,
}: {
  tearing: boolean;
  onTear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTear}
      disabled={tearing}
      aria-label="Tear open a booster pack of five sessions"
      className="group mx-auto mt-6 block w-[min(100%,15.5rem)] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-meeple focus-visible:ring-offset-4 focus-visible:ring-offset-background"
    >
      <span className="block -rotate-2 drop-shadow-[0_10px_16px_rgb(23_48_89/0.22)] transition-[rotate,scale] duration-300 group-hover:scale-[1.03] group-hover:rotate-0">
        <span
          style={{ clipPath: CRIMP_TOP }}
          className={cn(
            "foil flex h-11 items-end justify-center border-b-2 border-dashed border-navy/50 pb-1.5 font-space-mono text-[10px] font-bold tracking-[0.16em] text-navy/80 uppercase transition-[translate,rotate,opacity] duration-500",
            tearing && "translate-x-6 -translate-y-12 rotate-[14deg] opacity-0",
          )}
        >
          <Scissors aria-hidden className="mr-1.5 size-3.5" />
          Tear here
        </span>
        <span
          style={{ clipPath: CRIMP_BOTTOM }}
          className={cn(
            "foil flex flex-col items-center gap-1.5 px-5 pt-6 pb-9 text-center text-navy transition-[translate,opacity] delay-100 duration-500",
            tearing && "translate-y-8 opacity-0",
          )}
        >
          <Mg2Die size={52} />
          <span className="mt-1 font-space-mono text-[10.5px] font-bold tracking-[0.24em] uppercase">
            Metagame 2026
          </span>
          <span
            className={`${DISPLAY} text-[46px] leading-[0.88] tracking-[0.02em]`}
          >
            Booster
            <br />
            pack
          </span>
          <span className="mt-1 font-space-mono text-[10.5px] tracking-[0.1em] uppercase">
            5 sessions inside
          </span>
          <span className="mt-3 flex items-center gap-1.5 rounded-full bg-navy px-3 py-1.5 font-space-mono text-[10.5px] font-bold tracking-[0.12em] text-cream uppercase">
            <Star aria-hidden className="size-3 fill-tan text-tan" />
            One featured speaker
          </span>
        </span>
      </span>
    </button>
  );
}

// One card from the pack: a Metagame back until it's turned, then the
// session. The foil card is a featured speaker's.
function PackCard({
  s,
  up,
  foil,
  onTurn,
}: {
  s: Session2026;
  up: boolean;
  foil: boolean;
  onTurn: () => void;
}) {
  const { Icon, label, band } = KINDS[s.kinds[0]];
  return (
    <button
      type="button"
      onClick={onTurn}
      onPointerMove={lean}
      onPointerLeave={unlean}
      aria-label={up ? `${s.title}: details` : "Turn this card over"}
      className={cn(
        "group block w-full rounded-xl text-left transition-transform duration-200 outline-none [perspective:900px] focus-visible:ring-2 focus-visible:ring-meeple focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        LEAN,
      )}
    >
      <span
        className={cn(
          "grid transition-transform duration-500 [transform-style:preserve-3d]",
          up && "[transform:rotateY(180deg)]",
        )}
      >
        <span
          aria-hidden
          className="relative flex min-h-[176px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-navy bg-navy bg-[radial-gradient(circle,rgb(255_255_255/0.12)_1.2px,transparent_1.6px)] bg-[length:11px_11px] text-tan [backface-visibility:hidden] [grid-area:1/1]"
        >
          <Mg2Die size={38} />
          <span className="font-space-mono text-[9.5px] font-bold tracking-[0.22em] text-cream/70 uppercase">
            Metagame
          </span>
          <span className={SHINE} />
        </span>
        <span className="relative flex [transform:rotateY(180deg)] flex-col overflow-hidden rounded-xl border-2 border-navy bg-white text-navy [backface-visibility:hidden] [grid-area:1/1]">
          <span
            className={cn(
              "flex items-center justify-between gap-1.5 border-b-2 border-navy px-2.5 py-1.5",
              foil ? "foil" : band,
            )}
          >
            <span className="flex min-w-0 items-center gap-1 font-space-mono text-[9.5px] font-bold tracking-[0.1em] uppercase">
              <Icon aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </span>
            {foil && (
              <Star aria-hidden className="size-3.5 shrink-0 fill-navy" />
            )}
          </span>
          <span className="flex flex-1 flex-col gap-2 p-2.5">
            <span className="text-[13.5px] leading-snug font-bold">
              {s.title}
            </span>
            <span className="mt-auto font-space-mono text-[9.5px] tracking-[0.06em] text-ink/60 uppercase">
              {hostLine(s)}
            </span>
            {s.status === "unconference" && (
              <span
                className={cn(
                  "self-start rounded px-1.5 py-0.5 font-space-mono text-[9px] font-bold tracking-[0.1em] uppercase",
                  STATUS.unconference.chip,
                )}
              >
                {STATUS.unconference.label}
              </span>
            )}
          </span>
          {foil && (
            <span
              aria-hidden
              className="foil pointer-events-none absolute inset-0 opacity-25 mix-blend-multiply"
            />
          )}
          <span className={SHINE} />
        </span>
      </span>
    </button>
  );
}
