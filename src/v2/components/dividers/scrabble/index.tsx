import { useId } from "react";
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";
import { RACK, SCRABBLE_SCORES } from "./tiles";

// Scrabble tiles in the piece-set language: a solid charcoal tile with the
// letter and its score punched out so the cream shows through. Drawn here, no
// attribution needed. Not mounted anywhere yet; available for a future section. `letter` is any A–Z; the score comes from tiles.ts.
const CHARCOAL = "#4d4d4d";
const FONT = "var(--font-space-grotesk), system-ui, sans-serif";

export function ScrabbleTile({ letter }: { letter: string }) {
  const maskId = useId();
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`${GLYPH} ${SHADOW}`}>
      <mask id={maskId} maskUnits="userSpaceOnUse">
        <rect x="4" y="4" width="92" height="92" rx="12" fill="#fff" />
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
      </mask>
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="12"
        fill={CHARCOAL}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

export default function ScrabbleDivider() {
  return (
    <DividerRow>
      {RACK.map((l, i) => (
        <ScrabbleTile key={i} letter={l} />
      ))}
    </DividerRow>
  );
}
