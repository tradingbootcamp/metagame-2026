// Go divider — four named shapes on a 4×4 corner of board: bamboo joint,
// tiger's mouth (with a stone in the mouth), atari, and ponnuki. Drawn here, nothing to credit. Not
// mounted anywhere yet.
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";

const CHARCOAL = "#4d4d4d";
const LINES = [11, 37, 63, 89]; // grid intersections
const R = 11;

type Point = [x: number, y: number]; // grid indices 0..3
type Shape = { name: string; black: Point[]; white: Point[] };

const SHAPES: Shape[] = [
  {
    name: "go-bamboo-joint",
    black: [
      [1, 0],
      [2, 0],
      [1, 2],
      [2, 2],
    ],
    white: [],
  },
  {
    name: "go-tigers-mouth",
    black: [
      [1, 1],
      [0, 2],
      [2, 2],
    ],
    white: [[1, 2]],
  },
  {
    name: "go-atari",
    black: [
      [1, 0],
      [0, 1],
      [2, 1],
    ],
    white: [[1, 1]],
  },
  {
    name: "go-ponnuki",
    black: [
      [2, 0],
      [1, 1],
      [3, 1],
      [2, 2],
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
          <circle key={i} {...at(p)} r={R - 3} fill="#000" />
        ))}
      </mask>
      <g mask={`url(#${maskId})`} fill={CHARCOAL}>
        {LINES.map((v) => (
          <g key={v}>
            <rect x={LINES[0]} y={v - 1.5} width={78} height={3} />
            <rect x={v - 1.5} y={LINES[0]} width={3} height={78} />
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
