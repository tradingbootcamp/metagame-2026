// Go divider — four shapes on a 3×3 corner of board: a black stone, a white
// stone, a tiger's mouth, and a ponnuki. Drawn here, nothing to credit. Not
// mounted anywhere yet.
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";

const CHARCOAL = "#4d4d4d";
const LINES = [15, 50, 85]; // grid intersections
const R = 14;

type Point = [x: number, y: number]; // grid indices 0..2
type Shape = { name: string; black: Point[]; white: Point[] };

const SHAPES: Shape[] = [
  { name: "go-black", black: [[1, 1]], white: [] },
  { name: "go-white", black: [], white: [[1, 1]] },
  {
    name: "go-tigers-mouth",
    black: [
      [1, 0],
      [0, 1],
      [2, 1],
    ],
    white: [],
  },
  {
    name: "go-ponnuki",
    black: [
      [1, 0],
      [0, 1],
      [2, 1],
      [1, 2],
    ],
    white: [],
  },
];

const at = ([x, y]: Point) => ({ cx: LINES[x], cy: LINES[y] });

function GoShape({ name, black, white }: Shape) {
  const maskId = `go-${name}`;
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`${GLYPH} ${SHADOW}`}>
      {/* White stones punch the board out; the ring left behind is the stone. */}
      <mask id={maskId} maskUnits="userSpaceOnUse">
        <rect width="100" height="100" fill="#fff" />
        {white.map((p, i) => (
          <circle key={i} {...at(p)} r={R - 4} fill="#000" />
        ))}
      </mask>
      <g mask={`url(#${maskId})`} fill={CHARCOAL}>
        {LINES.map((v) => (
          <g key={v}>
            <rect x={LINES[0]} y={v - 1.5} width={70} height={3} />
            <rect x={v - 1.5} y={LINES[0]} width={3} height={70} />
          </g>
        ))}
        {[...black, ...white].map((p, i) => (
          <circle key={i} {...at(p)} r={R} />
        ))}
      </g>
    </svg>
  );
}

export default function GoDivider() {
  return (
    <DividerRow>
      {SHAPES.map((s) => (
        <GoShape key={s.name} {...s} />
      ))}
    </DividerRow>
  );
}
