// Jigsaw divider — four pieces with different tab/socket edges, built from one
// edge curve walked around a square. Drawn here, nothing to credit. Not
// mounted anywhere yet.
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";

const CHARCOAL = "#4d4d4d";

type Edge = "tab" | "socket" | "flat";
// top, right, bottom, left
type Piece = { name: string; edges: [Edge, Edge, Edge, Edge] };

const PIECES: Piece[] = [
  { name: "jigsaw-corner", edges: ["flat", "tab", "tab", "flat"] },
  { name: "jigsaw-middle", edges: ["socket", "tab", "socket", "tab"] },
  { name: "jigsaw-edge", edges: ["tab", "socket", "flat", "socket"] },
  { name: "jigsaw-middle-2", edges: ["socket", "socket", "tab", "tab"] },
];

const A = 24; // square from A to B in a 100 box; tabs reach ~10 beyond
const B = 76;
const L = B - A;

// One edge in a local frame: s along the edge (0–1), o outward. A tab is a
// knob with an undercut; a socket is the same knob pushed inward.
const KNOB: [number, number][][] = [
  [
    [0.47, 0],
    [0.28, 0.25],
    [0.5, 0.25],
  ],
  [
    [0.72, 0.25],
    [0.53, 0],
    [0.65, 0],
  ],
];

function edgePath(
  start: [number, number],
  along: [number, number],
  out: [number, number],
  edge: Edge,
): string {
  const p = (s: number, o: number) =>
    `${(start[0] + along[0] * s * L + out[0] * o * L).toFixed(1)} ${(start[1] + along[1] * s * L + out[1] * o * L).toFixed(1)}`;
  const end = `L${p(1, 0)}`;
  if (edge === "flat") return end;
  const sign = edge === "tab" ? 1 : -1;
  return (
    `L${p(0.35, 0)} ` +
    KNOB.map((seg) => `C${seg.map(([s, o]) => p(s, o * sign)).join(" ")}`).join(
      " ",
    ) +
    ` ${end}`
  );
}

function piecePath([top, right, bottom, left]: Piece["edges"]): string {
  return (
    `M${A} ${A} ` +
    edgePath([A, A], [1, 0], [0, -1], top) +
    " " +
    edgePath([B, A], [0, 1], [1, 0], right) +
    " " +
    edgePath([B, B], [-1, 0], [0, 1], bottom) +
    " " +
    edgePath([A, B], [0, -1], [-1, 0], left) +
    " Z"
  );
}

export default function JigsawDivider() {
  return (
    <DividerRow>
      {PIECES.map((p) => (
        <svg
          key={p.name}
          viewBox="0 0 100 100"
          aria-hidden
          className={`${GLYPH} ${SHADOW}`}
        >
          <path d={piecePath(p.edges)} fill={CHARCOAL} />
        </svg>
      ))}
    </DividerRow>
  );
}
