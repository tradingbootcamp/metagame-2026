"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";
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
// `armed` dims the tile while it waits for a typed letter. Not mounted
// anywhere yet; available for a future section.
const CHARCOAL = "#4d4d4d";
const FONT = "var(--font-space-grotesk), system-ui, sans-serif";

export function ScrabbleTile({
  letter,
  scored = true,
  flash = false,
  armed = false,
  onClick,
}: {
  letter: string;
  scored?: boolean;
  flash?: boolean;
  armed?: boolean;
  onClick?: () => void;
}) {
  const maskId = useId();
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className={`${GLYPH} ${SHADOW}`}
      onClick={onClick}
    >
      <mask id={maskId} maskUnits="userSpaceOnUse">
        <rect x="4" y="4" width="92" height="92" rx="12" fill="#fff" />
        {letter && (
          <>
            <text
              x="46"
              y="54"
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
        x="4"
        y="4"
        width="92"
        height="92"
        rx="12"
        fill={flash ? "var(--color-meeple)" : CHARCOAL}
        className={`transition-[fill,opacity] duration-300 ${armed ? "opacity-60" : ""}`}
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
// Spelling a blacklisted word flashes the tiles orange and re-rolls.
export default function ScrabbleDivider() {
  const tiles = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [flash, setFlash] = useState(false);
  const [armed, setArmed] = useState<number | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  const play = (next: Tile[]) => {
    if (isBlocked(next)) {
      setFlash(true);
      setRack(randomRack());
    } else {
      setRack(next);
    }
  };

  const advance = (i: number) => {
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

  return (
    <DividerRow>
      {tiles.map((t, i) => (
        <ScrabbleTile
          key={i}
          letter={t.letter}
          scored={!t.blank}
          flash={flash}
          armed={armed === i}
          onClick={() => advance(i)}
        />
      ))}
    </DividerRow>
  );
}
