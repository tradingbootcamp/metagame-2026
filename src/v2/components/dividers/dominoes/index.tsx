// Dominoes divider — four tiles lying end to end, pips and the centre bar
// punched out of the charcoal. Drawn here, nothing to credit. Not mounted
// anywhere yet.
import DividerRow from "../DividerRow";
import { SHADOW } from "../sizing";

const CHARCOAL = "#4d4d4d";
const TILES: [number, number][] = [
  [6, 3],
  [2, 5],
  [4, 1],
  [0, 6],
];

// Pip layout for 0–6 as offsets (in units of 13) from a half's centre.
const PIPS: [number, number][][] = [
  [],
  [[0, 0]],
  [
    [-1, -1],
    [1, 1],
  ],
  [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
];

function Domino({ tile: [a, b] }: { tile: [number, number] }) {
  const maskId = `domino-${a}-${b}`;
  return (
    <svg
      viewBox="0 0 100 50"
      aria-hidden
      className={`h-[28.5px] w-[57px] ${SHADOW}`}
    >
      <mask id={maskId} maskUnits="userSpaceOnUse">
        <rect width="100" height="50" rx="6" fill="#fff" />
        <rect x="49" y="6" width="2" height="38" fill="#000" />
        {[a, b].map((n, half) =>
          PIPS[n].map(([dx, dy], i) => (
            <circle
              key={`${half}-${i}`}
              cx={25 + half * 50 + dx * 13}
              cy={25 + dy * 13}
              r="4.5"
              fill="#000"
            />
          )),
        )}
      </mask>
      <rect
        width="100"
        height="50"
        rx="6"
        fill={CHARCOAL}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

export default function DominoesDivider() {
  return (
    <DividerRow>
      {TILES.map((t) => (
        <Domino key={t.join("-")} tile={t} />
      ))}
    </DividerRow>
  );
}
