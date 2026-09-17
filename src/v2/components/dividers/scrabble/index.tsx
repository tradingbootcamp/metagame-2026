"use client";

import { useEffect, useId, useState } from "react";
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";
import {
  CYCLE,
  RACK_SIZE,
  SCRABBLE_SCORES,
  isBlocked,
  randomRack,
} from "./tiles";

// Scrabble tiles in the piece-set language: a solid charcoal tile with the
// letter and its score punched out so the cream shows through. Drawn here, no
// attribution needed. `letter` is A–Z or "" for the blank; the score comes
// from tiles.ts. Not mounted anywhere yet; available for a future section.
const CHARCOAL = "#4d4d4d";
const FONT = "var(--font-space-grotesk), system-ui, sans-serif";

export function ScrabbleTile({
  letter,
  flash = false,
  onClick,
}: {
  letter: string;
  flash?: boolean;
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
        className="transition-colors duration-300"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

const FLASH_MS = 350;

// A rack of RACK_SIZE tiles. Each click advances that tile one step through
// CYCLE. The rack starts blank on the server and rolls a random word on mount
// (so there's no hydration mismatch); spelling a blacklisted word flashes the
// tiles orange and re-rolls.
export default function ScrabbleDivider() {
  const [rack, setRack] = useState<string[]>(() =>
    Array.from({ length: RACK_SIZE }, () => ""),
  );
  const [flash, setFlash] = useState(false);

  useEffect(() => setRack(randomRack()), []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  const advance = (i: number) => {
    const next = [...rack];
    next[i] = CYCLE[(CYCLE.indexOf(rack[i]) + 1) % CYCLE.length];
    if (isBlocked(next)) {
      setFlash(true);
      setRack(randomRack());
    } else {
      setRack(next);
    }
  };

  return (
    <DividerRow>
      {rack.map((l, i) => (
        <ScrabbleTile
          key={i}
          letter={l}
          flash={flash}
          onClick={() => advance(i)}
        />
      ))}
    </DividerRow>
  );
}
