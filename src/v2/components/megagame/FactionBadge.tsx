import type { ReactNode } from "react";
import { FACTION_NAMES, type MegagameClass } from "@/lib/megagame-levels";
import { CREAM, Die, FACTION_COLORS, NAVY, sparkle } from "./FactionEmblem";

// Each faction's special shape, which has to read from its shadow alone (Libi,
// Oct 29–30): a north star for the wizards (four long points, four short ones
// on the diagonals), the Jolly Roller for the pirates (the die over crossbones
// from their flag) and a landed flying saucer for the aliens (bubble dome,
// antenna, legs). Drawn in a 100-unit box with the same paths as the brand
// hub's Megagame pieces. Every subpath runs clockwise, so the overlaps fill as
// one shape.
const BONES =
  "M18.18 11.82L88.18 81.82L81.82 88.18L11.82 18.18ZM3.44 17.3A6.5 6.5 0 1 1 16.44 17.3A6.5 6.5 0 1 1 3.44 17.3ZM10.8 9.94A6.5 6.5 0 1 1 23.8 9.94A6.5 6.5 0 1 1 10.8 9.94ZM76.2 90.06A6.5 6.5 0 1 1 89.2 90.06A6.5 6.5 0 1 1 76.2 90.06ZM83.56 82.7A6.5 6.5 0 1 1 96.56 82.7A6.5 6.5 0 1 1 83.56 82.7ZM88.18 18.18L18.18 88.18L11.82 81.82L81.82 11.82ZM76.2 9.94A6.5 6.5 0 1 1 89.2 9.94A6.5 6.5 0 1 1 76.2 9.94ZM83.56 17.3A6.5 6.5 0 1 1 96.56 17.3A6.5 6.5 0 1 1 83.56 17.3ZM3.44 82.7A6.5 6.5 0 1 1 16.44 82.7A6.5 6.5 0 1 1 3.44 82.7ZM10.8 90.06A6.5 6.5 0 1 1 23.8 90.06A6.5 6.5 0 1 1 10.8 90.06Z";
// The flag's die, 60 wide in the middle of the box: its outline. DIE_FIT sets
// the emblem's die (drawn in a 200-unit box) onto it.
const DIE_AT = "M50 16.67 80 31.67V68.33L50 83.33 20 68.33V31.67Z";
const DIE_FIT = "translate(-33.33 -18.33) scale(.8333)";
// The saucer: a disk (centre 50 59, radii 48 × 11), a dome (radii 26 × 42 from
// the same centre) with an antenna ball on top, a belly, then two legs with
// feet. DOME is the glass above the disk.
const SAUCER =
  "M2 59A48 11 0 0 1 24.65 49.66A26 42 0 0 1 48.6 17.06V13.28A4.5 4.5 0 1 1 51.4 13.28V17.06A26 42 0 0 1 75.35 49.66A48 11 0 0 1 98 59A48 11 0 0 1 70 69C68 76 60 79 50 79C40 79 32 76 30 69A48 11 0 0 1 2 59Z";
const LEGS =
  "M38.78 75.46L24.78 92.46L21.22 89.54L35.22 72.54ZM64.78 72.54L78.78 89.54L75.22 92.46L61.22 75.46ZM16 89.5H28A2.5 2.5 0 0 1 28 94.5H16A2.5 2.5 0 0 1 16 89.5ZM72 89.5H84A2.5 2.5 0 0 1 84 94.5H72A2.5 2.5 0 0 1 72 89.5Z";
const DOME = "M24.65 49.66A26 42 0 0 1 75.35 49.66Z";

const SHAPES: Record<MegagameClass, string> = {
  wizard:
    "M50 2 53.44 41.69 74.04 25.96 58.32 46.56 98 50 58.32 53.44 74.04 74.04 53.44 58.32 50 98 46.56 58.32 25.96 74.04 41.69 53.44 2 50 41.69 46.56 25.96 25.96 46.56 41.69Z",
  pirate: BONES + DIE_AT,
  alien: SAUCER + LEGS,
};

const GOLD = "#E9D84A";
const PINK = "#FF5FA2";

// What's drawn over each shape: a twinkle at the star's heart; gold bones
// under the flag's die; the saucer's glass dome with its pilot peeking out,
// then the disk, its hull lights and the antenna ball.
const EMBLEMS: Record<MegagameClass, ReactNode> = {
  wizard: <path d={sparkle(50, 50, 9)} fill={CREAM} />,
  pirate: (
    <>
      <path d={BONES} fill="none" stroke={NAVY} strokeWidth="5" />
      <path d={BONES} fill={GOLD} />
      <g transform={DIE_FIT}>
        <Die />
      </g>
    </>
  ),
  alien: (
    <>
      <path d={DOME} fill="#CFF7EA" />
      <path
        d="M41 51C41 37 44.5 31 50 31S59 37 59 51Z"
        fill="#59E3B0"
        stroke={NAVY}
        strokeWidth="2"
      />
      <g fill={NAVY}>
        <ellipse
          cx="46.2"
          cy="41"
          rx="2.4"
          ry="3.6"
          transform="rotate(18 46.2 41)"
        />
        <ellipse
          cx="53.8"
          cy="41"
          rx="2.4"
          ry="3.6"
          transform="rotate(-18 53.8 41)"
        />
      </g>
      <path
        d="M33 30C36 25 40 22.5 44 21.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".8"
      />
      <ellipse
        cx="50"
        cy="59"
        rx="48"
        ry="11"
        fill={FACTION_COLORS.alien}
        stroke={NAVY}
        strokeWidth="2.5"
      />
      <g fill={PINK}>
        {[16, 33, 50, 67, 84].map((x) => (
          <circle key={x} cx={x} cy="60.5" r="3.2" />
        ))}
      </g>
      <circle
        cx="50"
        cy="9"
        r="4.5"
        fill={PINK}
        stroke={NAVY}
        strokeWidth="2"
      />
    </>
  ),
};

/**
 * A faction badge: a die-cut sticker in the faction's shape and colour with its
 * emblem on top, for a speaker card's corner. One per faction, so a card can
 * carry several side by side. Its title names the faction.
 */
export default function FactionBadge({
  faction,
  className,
}: {
  faction: MegagameClass;
  className?: string;
}) {
  const d = SHAPES[faction];
  return (
    <svg viewBox="-9 -9 118 118" role="img" className={className}>
      <title>{`Megagame: ${FACTION_NAMES[faction]}`}</title>
      <path
        d={d}
        fill={NAVY}
        stroke={NAVY}
        strokeWidth="18"
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill={CREAM}
        stroke={CREAM}
        strokeWidth="12"
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill={faction === "pirate" ? GOLD : FACTION_COLORS[faction]}
      />
      {EMBLEMS[faction]}
    </svg>
  );
}
