"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";
import { ringBell } from "./bells";
import {
  BASE_LOOK,
  FALL_MS,
  MAGA_MS,
  RISE_MS,
  SPELLS,
  STRETCH,
  TURN_MS,
  reducedMotion,
  seedExit,
  type Look,
  type Seed,
  type Spell,
} from "./effects";
import {
  CYCLE,
  RACK_SIZE,
  SCRABBLE_SCORES,
  isBlocked,
  randomRack,
  type Tile,
} from "./tiles";

// Scrabble tiles in the piece-set language: a solid charcoal tile with the
// letter and its score punched out so the cream shows through. Drawn here, no
// attribution needed. `letter` is A–Z or "" for the blank; the score comes
// from tiles.ts and is left off when `scored` is false (a played blank).
// `armed` dims the tile while it waits for a typed letter. `look` and
// `motion` carry the easter eggs (effects.ts). Not mounted anywhere yet;
// available for a future section.
const CHARCOAL = "#4d4d4d";
const FONT = "var(--font-space-grotesk), system-ui, sans-serif";

// The dark-mode plate the punched-out letters show through.
const PLATE = "#161616";

type Motion = { transform?: string; transition?: string; opacity?: number };

export function ScrabbleTile({
  letter,
  scored = true,
  flash = false,
  armed = false,
  look = BASE_LOOK,
  motion,
  onClick,
}: {
  letter: string;
  scored?: boolean;
  flash?: boolean;
  armed?: boolean;
  look?: Look;
  motion?: Motion;
  onClick?: () => void;
}) {
  const maskId = useId();
  // TALL grows the tile borders upward only; the text keeps its size and just
  // re-centres, so the letter never deforms. The extra height spills outside
  // the viewBox, hence overflow-visible.
  const up = look.tall ? STRETCH : 0;
  const box = { x: 4, y: 4 - up, width: 92, height: 92 + up, rx: 12 };
  const grow = "y 300ms ease-out, height 300ms ease-out";
  const fill = flash
    ? "var(--color-meeple)"
    : look.blue
      ? "var(--color-brand-blue)"
      : look.dark
        ? "var(--color-cream)"
        : CHARCOAL;
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={`${GLYPH} shrink-0 ${look.glow ? "drop-shadow-[0_0_5px_rgba(216,80,43,0.85)]" : SHADOW} ${look.tall ? "overflow-visible" : ""}`}
      style={{
        transform: `${motion?.transform ?? ""} skewX(${look.skew ? -14 : 0}deg) scale(${look.scale})`,
        opacity: motion?.opacity,
        transition:
          motion?.transition ??
          "transform 300ms ease-out, opacity 300ms ease-out, filter 300ms ease-out",
      }}
      onClick={onClick}
    >
      <mask id={maskId} maskUnits="userSpaceOnUse">
        <rect {...box} fill="#fff" style={{ transition: grow }} />
        {letter && (
          <>
            <text
              x="46"
              y={54 - up / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily={FONT}
              fontWeight="700"
              fontSize="58"
              fill="#000"
            >
              {letter}
            </text>
            {scored && (
              <text
                x="86"
                y="86"
                textAnchor="end"
                fontFamily={FONT}
                fontWeight="700"
                fontSize="24"
                fill="#000"
              >
                {SCRABBLE_SCORES[letter]}
              </text>
            )}
          </>
        )}
      </mask>
      <rect
        {...box}
        fill={fill}
        opacity={armed ? 0.6 : 1}
        style={{ transition: `${grow}, fill 300ms ease-out, opacity 300ms` }}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

const FLASH_MS = 350;

// The rack lives outside React so the first client read can roll a random
// word while the server renders blanks — no hydration mismatch, no setState
// in an effect. Shared across every mounted rack, which is fine: there's one.
const BLANK: Tile[] = Array.from({ length: RACK_SIZE }, () => ({
  letter: "",
}));
let rack: Tile[] | null = null;
const listeners = new Set<() => void>();
const getSnapshot = () => (rack ??= randomRack());
const getServerSnapshot = () => BLANK;
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const setRack = (next: Tile[]) => {
  rack = next;
  listeners.forEach((l) => l());
};

// A rack of RACK_SIZE tiles. Each click advances that tile one step through
// CYCLE. A click that lands on the blank arms it: the next letter typed is
// played on it (unscored, as in the game); Escape or another click disarms.
// Spelling a blacklisted word flashes the tiles orange and re-rolls; spelling
// one of the easter-egg words in effects.ts casts it. Nothing an egg does is
// undone short of a reload — FALL and RISE end the rack for good.
export default function ScrabbleDivider() {
  const tiles = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [flash, setFlash] = useState(false);
  const [armed, setArmed] = useState<number | null>(null);
  const [look, setLook] = useState<Look>(BASE_LOOK);
  // Cumulative, so consecutive spins keep turning the same way.
  const [turn, setTurn] = useState(0);
  const [turning, setTurning] = useState<{ stagger: number } | null>(null);
  const [exit, setExit] = useState<{ up: boolean; seeds: Seed[] } | null>(null);
  // Set once the last tile is clear of the page: the rack is unmounted and the
  // divider is just a rule from then on.
  const [gone, setGone] = useState(false);
  const [maga, setMaga] = useState(0);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  const cast = (spell: Spell) => {
    switch (spell.kind) {
      case "bell":
        ringBell(spell.which);
        break;
      case "maga":
        setMaga((n) => n + 1);
        break;
      case "turn":
        if (reducedMotion()) break;
        setTurning({ stagger: spell.stagger });
        setTurn((d) => d + 360 * spell.turns);
        break;
      case "exit":
        setArmed(null);
        setExit({ up: spell.up, seeds: seedExit(RACK_SIZE, spell.up) });
        break;
      case "look":
        setLook(spell.apply);
        break;
    }
  };

  // Let the stagger finish before handing the tiles back to the resting
  // transition, or a later style change would inherit the spin's easing.
  useEffect(() => {
    if (!turning) return;
    const t = setTimeout(
      () => setTurning(null),
      TURN_MS + turning.stagger * RACK_SIZE,
    );
    return () => clearTimeout(t);
  }, [turning]);

  // Gone is gone. Once the slowest tile has left, drop the rack entirely.
  useEffect(() => {
    if (!exit) return;
    const longest = Math.max(...exit.seeds.map((s) => s.delay));
    const t = setTimeout(
      () => setGone(true),
      (exit.up ? RISE_MS : FALL_MS) + longest,
    );
    return () => clearTimeout(t);
  }, [exit]);

  const play = (next: Tile[]) => {
    if (isBlocked(next)) {
      setFlash(true);
      setRack(randomRack());
      return;
    }
    setRack(next);
    const spell = SPELLS[next.map((t) => t.letter).join("")];
    if (spell) cast(spell);
  };

  const advance = (i: number) => {
    if (exit) return;
    const next = [...tiles];
    // A played blank is still a blank: clicking it steps on to A like one.
    const from = tiles[i].blank ? "" : tiles[i].letter;
    const letter = CYCLE[(CYCLE.indexOf(from) + 1) % CYCLE.length];
    next[i] = { letter };
    setArmed(letter === "" ? i : null);
    play(next);
  };

  useEffect(() => {
    if (armed === null) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "Escape") return setArmed(null);
      if (e.metaKey || e.ctrlKey || e.altKey || !/^[a-z]$/i.test(e.key)) return;
      const next = [...tiles];
      next[armed] = { letter: e.key.toUpperCase(), blank: true };
      setArmed(null);
      play(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [armed, tiles]);

  const motionFor = (i: number): Motion | undefined => {
    if (exit) {
      if (reducedMotion()) return { opacity: 0, transition: "opacity 400ms" };
      const s = exit.seeds[i];
      const ms = exit.up ? RISE_MS : FALL_MS;
      // Falling accelerates; rising coasts to a stop as it fades.
      const ease = exit.up
        ? "cubic-bezier(.2,.6,.4,1)"
        : "cubic-bezier(.5,0,1,.6)";
      return {
        transform: `translate(${s.drift}px, ${exit.up ? -70 : 120}vh) rotate(${s.spin}deg)`,
        transition: `transform ${ms}ms ${ease} ${s.delay}ms, opacity ${ms}ms ease-in ${s.delay}ms`,
        opacity: exit.up ? 0 : 1,
      };
    }
    if (turning)
      return {
        transform: `rotate(${turn}deg)`,
        transition: `transform ${TURN_MS}ms cubic-bezier(.34,1.1,.64,1) ${i * turning.stagger}ms`,
      };
    return turn ? { transform: `rotate(${turn}deg)` } : undefined;
  };

  return (
    <>
      <DividerRow>
        {/* The dark-mode plate: the letters are punched out of the tiles, so
            in dark mode this is what shows through them. Negative margins keep
            the padding from shifting the hairlines. */}
        <div
          className="-mx-4 -my-2.5 flex items-center gap-[22px] rounded-2xl px-4 py-2.5 transition-colors duration-500"
          style={{ background: look.dark ? PLATE : "transparent" }}
        >
          {!gone &&
            tiles.map((t, i) => (
              <ScrabbleTile
                key={i}
                letter={t.letter}
                scored={!t.blank}
                flash={flash}
                armed={armed === i}
                look={look}
                motion={motionFor(i)}
                onClick={() => advance(i)}
              />
            ))}
        </div>
      </DividerRow>
      {maga > 0 && (
        <div
          key={maga}
          aria-hidden
          onAnimationEnd={() => setMaga(0)}
          className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1.5 bg-[#c8102e]"
          style={{ animation: `scrabble-maga ${MAGA_MS}ms ease-out forwards` }}
        />
      )}
    </>
  );
}
