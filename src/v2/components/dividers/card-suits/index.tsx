import DividerRow from "../DividerRow";
import { CARD_SUITS as CARD_SIZE, SHADOW } from "../sizing";
import { SUITS, type Suit } from "./suits";

// Playing-card suits in the SET-card language: a charcoal card with the suit
// symbol cut out large and centred (cream shows through). Suit pips are lifted
// from game-icons.net aussiesim/card-2-<suit> — see suits.ts for attribution.
const CHARCOAL = "#4d4d4d";

// Card + suit both live in the icons' native 512 space. Card is a portrait
// rounded rect centred on (256, 256); the suit is scaled to a target box inside.
const CARD =
  "M166 86 L346 86 A30 30 0 0 1 376 116 L376 396 A30 30 0 0 1 346 426 L166 426 A30 30 0 0 1 136 396 L136 116 A30 30 0 0 1 166 86 Z";
const CENTER = 256;
const TARGET_W = 150;
const TARGET_H = 210;

export function SuitCard({ name, d, cx, cy, w, h }: Suit) {
  const maskId = `suit-${name}`;
  const scale = Math.min(TARGET_W / w, TARGET_H / h);
  const transform = `translate(${CENTER} ${CENTER}) scale(${scale}) translate(${-cx} ${-cy})`;
  return (
    <svg
      viewBox="126 76 260 360"
      aria-hidden
      className={`${CARD_SIZE} ${SHADOW}`}
    >
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="512"
        height="512"
      >
        <path d={CARD} fill="#fff" />
        <path d={d} transform={transform} fill="#000" />
      </mask>
      <path d={CARD} fill={CHARCOAL} mask={`url(#${maskId})`} />
    </svg>
  );
}

export default function CardSuitsDivider() {
  return (
    <DividerRow game="cards">
      {SUITS.map((s) => (
        <SuitCard key={s.name} {...s} />
      ))}
    </DividerRow>
  );
}
