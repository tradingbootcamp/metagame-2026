import { FACTION_NAMES, type MegagameClass } from "@/lib/megagame-levels";
import {
  CREAM,
  EmblemContent,
  FACTION_COLORS,
  FACTION_ON,
  NAVY,
} from "./FactionEmblem";

/**
 * A faction's iron-on patch: the emblem in a cream disc ringed in the faction's
 * colour, over a ribbon with the faction's name. Decorative (aria-hidden); the
 * button or label around it says what it is.
 */
export default function FactionPatch({
  faction,
  className,
}: {
  faction: MegagameClass;
  className?: string;
}) {
  const color = FACTION_COLORS[faction];
  return (
    <svg
      viewBox="0 0 500 540"
      aria-hidden
      className={`block overflow-visible ${className ?? ""}`}
    >
      <circle cx="250" cy="248" r="248" fill={color} />
      <circle cx="250" cy="248" r="230" fill={CREAM} />
      <circle
        cx="250"
        cy="248"
        r="228"
        fill="none"
        stroke={NAVY}
        strokeWidth="4"
      />
      <svg x="80" y="66" width="340" height="340" viewBox="0 0 200 200">
        <EmblemContent faction={faction} />
      </svg>
      <path d="M0 400H500L460 460 500 520H0L40 460Z" fill={color} />
      <path d="M0 402H500M0 518H500" stroke={NAVY} strokeWidth="4" />
      <text
        x="250"
        y="482"
        textAnchor="middle"
        fontSize="60"
        letterSpacing="2"
        fill={FACTION_ON[faction]}
        style={{ fontFamily: "var(--font-bebas), sans-serif" }}
      >
        {FACTION_NAMES[faction].toUpperCase()}
      </text>
    </svg>
  );
}

/** The patch's disc alone, without the ribbon: the medal on a level badge. */
export function FactionMedal({
  faction,
  className,
}: {
  faction: MegagameClass;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden
      className={`block shrink-0 ${className ?? ""}`}
    >
      <circle cx="100" cy="100" r="99" fill={FACTION_COLORS[faction]} />
      <circle cx="100" cy="100" r="86" fill={CREAM} />
      <svg x="26" y="26" width="148" height="148" viewBox="0 0 200 200">
        <EmblemContent faction={faction} />
      </svg>
    </svg>
  );
}
