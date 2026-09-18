// Faceted polyhedral "weird dice" (d4/d6/d8/d20) as solid charcoal glyphs with
// transparent facet seams (cut via mask, so the page bg shows through) — the
// same solid-with-negative-space language as the weirdchess divider. Just
// dice — not a puzzle game.
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";

const CHARCOAL = "#4d4d4d";

type Die = {
  id: string;
  silhouette: string;
  seams: string; // facet edges, punched out as transparent lines
  pips?: [number, number][];
  // a value punched out of each face: [text, x, y, fontSize]
  numbers?: [string, number, number, number][];
};

const DICE: Die[] = [
  // tetrahedron: three faces meeting at a low centre point
  {
    id: "d4",
    silhouette: "M50 12 L86 82 L14 82 Z",
    seams: "M50 12 L50 58 M14 82 L50 58 M86 82 L50 58",
    numbers: [
      ["4", 39, 53, 20],
      ["2", 61, 53, 20],
      ["3", 50, 73, 17],
    ],
  },
  // cube, iso view: three visible faces + a scatter of pips
  {
    id: "d6",
    silhouette: "M50 18 L82 36 L82 72 L50 90 L18 72 L18 36 Z",
    seams: "M18 36 L50 54 M82 36 L50 54 M50 54 L50 90",
    pips: [
      [50, 36],
      [74, 50],
      [66, 63],
      [58, 76],
      [28, 53],
      [40, 73],
    ],
  },
  // octahedron: point-up diamond quartered into its four front faces
  {
    id: "d8",
    silhouette: "M50 10 L86 50 L50 90 L14 50 Z",
    seams: "M50 10 L50 90 M14 50 L86 50",
    numbers: [
      ["8", 41, 38, 22],
      ["3", 59, 38, 22],
      ["5", 41, 62, 22],
      ["2", 59, 62, 22],
    ],
  },
  // icosahedron, face-on: hexagonal silhouette fully triangulated (central
  // apex-down face ringed by triangles) — every facet a triangle, as it must be
  {
    id: "d20",
    silhouette: "M50 8 L86.4 29 L86.4 71 L50 92 L13.6 71 L13.6 29 Z",
    seams:
      "M50 69.3 L33.3 40.3 L66.7 40.3 Z M50 69.3 L50 92 M50 69.3 L86.4 71 M50 69.3 L13.6 71 M33.3 40.3 L13.6 29 M33.3 40.3 L13.6 71 M33.3 40.3 L50 8 M66.7 40.3 L86.4 29 M66.7 40.3 L50 8 M66.7 40.3 L86.4 71",
    numbers: [
      ["20", 50, 49, 13],
      ["8", 50, 30, 15],
      ["2", 33, 60, 13],
      ["14", 67, 60, 13],
      ["7", 33, 27, 9],
      ["1", 67, 27, 9],
      ["9", 21, 48, 10],
      ["5", 79, 48, 10],
      ["6", 38, 78, 9],
      ["3", 62, 78, 9],
    ],
  },
];

function DiceGlyph({ id, silhouette, seams, pips, numbers }: Die) {
  const maskId = `dice-seam-${id}`;
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={`${GLYPH} ${SHADOW}`}>
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="100"
        height="100"
      >
        <path d={silhouette} fill="#fff" />
        <path
          d={seams}
          fill="none"
          stroke="#000"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pips?.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={4} fill="#000" />
        ))}
        {numbers?.map(([n, x, y, size]) => (
          <text
            key={`${x}-${y}`}
            x={x}
            y={y}
            fontSize={size}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#000"
            className="font-[family-name:var(--font-bebas)]"
          >
            {n}
          </text>
        ))}
      </mask>
      <path d={silhouette} fill={CHARCOAL} mask={`url(#${maskId})`} />
    </svg>
  );
}

export default function DiceDivider() {
  return (
    <DividerRow>
      {DICE.map((d) => (
        <DiceGlyph key={d.id} {...d} />
      ))}
    </DividerRow>
  );
}
