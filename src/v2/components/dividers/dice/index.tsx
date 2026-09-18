"use client";

// Faceted polyhedral "weird dice" (d4/d6/d8/d20) as solid charcoal glyphs with
// transparent facet seams (cut via mask, so the page bg shows through) — the
// same solid-with-negative-space language as the weirdchess divider. Just
// dice — not a puzzle game. Click one and it spins twice and re-rolls every
// visible face.
import { useEffect, useRef, useState } from "react";
import DividerRow from "../DividerRow";
import { GLYPH, SHADOW } from "../sizing";

const CHARCOAL = "#4d4d4d";
// The numbered dice need the extra size for their face values to read.
const BIG = "h-[45px] w-[45px]";
const SPIN_MS = 700;

// A numbered face: where its value sits, how big, and the most digits it fits.
type Face = { x: number; y: number; size: number; digits?: 1 };
// A pipped face of the iso cube: centre, plus the two pip-grid step vectors.
type PipFace = {
  c: [number, number];
  u: [number, number];
  v: [number, number];
};

type Die = {
  id: string;
  sides: number;
  silhouette: string;
  seams: string; // facet edges, punched out as transparent lines
  faces?: Face[];
  pipFaces?: PipFace[];
  initial: number[];
};

const DICE: Die[] = [
  // tetrahedron: three faces meeting at a low centre point
  {
    id: "d4",
    sides: 4,
    silhouette: "M50 12 L86 82 L14 82 Z",
    seams: "M50 12 L50 58 M14 82 L50 58 M86 82 L50 58",
    faces: [
      { x: 39, y: 53, size: 20 },
      { x: 61, y: 53, size: 20 },
      { x: 50, y: 73, size: 17 },
    ],
    initial: [4, 2, 3],
  },
  // cube, iso view: three visible faces of pips
  {
    id: "d6",
    sides: 6,
    silhouette: "M50 18 L82 36 L82 72 L50 90 L18 72 L18 36 Z",
    seams: "M18 36 L50 54 M82 36 L50 54 M50 54 L50 90",
    pipFaces: [
      { c: [50, 36], u: [8.5, 4.8], v: [-8.5, 4.8] },
      { c: [66, 63], u: [8, -4.5], v: [0, 9] },
      { c: [34, 63], u: [8, 4.5], v: [0, 9] },
    ],
    initial: [1, 3, 2],
  },
  // octahedron: point-up diamond quartered into its four front faces
  {
    id: "d8",
    sides: 8,
    silhouette: "M50 10 L86 50 L50 90 L14 50 Z",
    seams: "M50 10 L50 90 M14 50 L86 50",
    faces: [
      { x: 41, y: 38, size: 22 },
      { x: 59, y: 38, size: 22 },
      { x: 41, y: 62, size: 22 },
      { x: 59, y: 62, size: 22 },
    ],
    initial: [8, 3, 5, 2],
  },
  // icosahedron, face-on: hexagonal silhouette fully triangulated (central
  // apex-down face ringed by triangles) — every facet a triangle, as it must be
  {
    id: "d20",
    sides: 20,
    silhouette: "M50 8 L86.4 29 L86.4 71 L50 92 L13.6 71 L13.6 29 Z",
    seams:
      "M50 69.3 L33.3 40.3 L66.7 40.3 Z M50 69.3 L50 92 M50 69.3 L86.4 71 M50 69.3 L13.6 71 M33.3 40.3 L13.6 29 M33.3 40.3 L13.6 71 M33.3 40.3 L50 8 M66.7 40.3 L86.4 29 M66.7 40.3 L50 8 M66.7 40.3 L86.4 71",
    faces: [
      { x: 50, y: 49, size: 13 },
      { x: 50, y: 30, size: 15 },
      { x: 33, y: 60, size: 13 },
      { x: 67, y: 60, size: 13 },
      { x: 33, y: 27, size: 9, digits: 1 },
      { x: 67, y: 27, size: 9, digits: 1 },
      { x: 21, y: 48, size: 10, digits: 1 },
      { x: 79, y: 48, size: 10, digits: 1 },
      { x: 38, y: 78, size: 9, digits: 1 },
      { x: 62, y: 78, size: 9, digits: 1 },
    ],
    initial: [20, 8, 2, 14, 7, 1, 9, 5, 6, 3],
  },
];

// Pip grid positions (in u/v steps from the face centre) for 1–6.
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

// Distinct values, one per visible face. Narrow faces draw from 1–9 first so
// the two-digit values are left for faces that fit them; on the cube no two
// visible faces may be opposites (summing to 7).
function roll(die: Die): number[] {
  const slots = die.faces ?? die.pipFaces ?? [];
  const pool = Array.from({ length: die.sides }, (_, i) => i + 1);
  const out: number[] = new Array(slots.length);
  const take = (ok: (n: number) => boolean) => {
    const options = pool.filter(ok);
    const n = options[Math.floor(Math.random() * options.length)];
    pool.splice(pool.indexOf(n), 1);
    return n;
  };
  const order = slots
    .map((_, i) => i)
    .sort(
      (a, b) => (die.faces?.[b].digits ?? 0) - (die.faces?.[a].digits ?? 0),
    );
  for (const i of order) {
    out[i] = take((n) =>
      die.pipFaces ? !out.includes(7 - n) : !die.faces?.[i].digits || n < 10,
    );
  }
  return out;
}

function DiceGlyph({ die }: { die: Die }) {
  const [values, setValues] = useState(die.initial);
  const [spins, setSpins] = useState(0);
  const swap = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(swap.current), []);

  const onClick = () => {
    setSpins((n) => n + 1);
    clearTimeout(swap.current);
    swap.current = setTimeout(() => setValues(roll(die)), SPIN_MS / 2);
  };

  const maskId = `dice-seam-${die.id}`;
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      onClick={onClick}
      style={{
        rotate: `${spins * 720}deg`,
        transitionDuration: `${SPIN_MS}ms`,
      }}
      className={`${die.faces ? BIG : GLYPH} ${SHADOW} transition-[rotate] ease-in-out`}
    >
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="100"
        height="100"
      >
        <path d={die.silhouette} fill="#fff" />
        <path
          d={die.seams}
          fill="none"
          stroke="#000"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {die.pipFaces?.map(({ c, u, v }, f) =>
          PIPS[values[f]].map(([a, b], i) => (
            <circle
              key={`${f}-${i}`}
              cx={c[0] + a * u[0] + b * v[0]}
              cy={c[1] + a * u[1] + b * v[1]}
              r={values[f] > 3 ? 3.2 : 4}
              fill="#000"
            />
          )),
        )}
        {die.faces?.map(({ x, y, size }, f) => (
          <text
            key={f}
            x={x}
            y={y}
            fontSize={size}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#000"
            className="font-[family-name:var(--font-bebas)]"
          >
            {values[f]}
          </text>
        ))}
      </mask>
      <path d={die.silhouette} fill={CHARCOAL} mask={`url(#${maskId})`} />
    </svg>
  );
}

export default function DiceDivider() {
  return (
    <DividerRow>
      {DICE.map((d) => (
        <DiceGlyph key={d.id} die={d} />
      ))}
    </DividerRow>
  );
}
