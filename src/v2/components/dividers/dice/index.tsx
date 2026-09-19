"use client";

// Faceted polyhedral "weird dice" (d4/d6/d8/d20) as solid charcoal glyphs with
// transparent facet seams (cut via mask, so the page bg shows through) — the
// same solid-with-negative-space language as the weirdchess divider. Just
// dice — not a puzzle game. Click one and it spins twice and re-rolls every
// visible face.
import { useEffect, useRef, useState } from "react";
import DividerRow from "../DividerRow";
import { SHADOW } from "../sizing";
import { trackClick } from "../track";

const CHARCOAL = "#4d4d4d";
// Bigger than GLYPH so the face values read, with the excess taken back as
// negative margin: the row lays out (pitch, height) exactly like a GLYPH row.
const SIZE = "-m-[8.25px] h-[49.5px] w-[49.5px]";
const SPIN_MS = 700;

// A numbered face: where its value sits, its tilt (the value's top points out
// from the vertex the faces share), how big, and the most digits it fits.
type Face = { x: number; y: number; turn: number; size: number; digits?: 1 };
// A pipped face of the iso cube: centre, plus the two pip-grid step vectors.
type PipFace = {
  c: [number, number];
  u: [number, number];
  v: [number, number];
};

type Die = {
  id: string;
  sides: number;
  pivot: [number, number]; // visual centre, which the spin turns about
  silhouette: string;
  seams: string; // facet edges, punched out as transparent lines
  faces?: Face[];
  pipFaces?: PipFace[];
  initial: number[];
};

const DICE: Die[] = [
  // tetrahedron: three faces meeting at a low centre point. The side faces are
  // too narrow to turn a value outwards, so those lean up along the face.
  {
    id: "d4",
    sides: 4,
    pivot: [50, 58.7],
    silhouette: "M50 12 L86 82 L14 82 Z",
    seams: "M50 12 L50 58 M14 82 L50 58 M86 82 L50 58",
    faces: [
      { x: 38.5, y: 54, turn: 27, size: 19 },
      { x: 61.5, y: 54, turn: -27, size: 19 },
      { x: 50, y: 73, turn: 0, size: 17 },
    ],
    initial: [4, 2, 3],
  },
  // cube, iso view: three visible faces of pips
  {
    id: "d6",
    sides: 6,
    pivot: [50, 54],
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
    pivot: [50, 50],
    silhouette: "M50 10 L86 50 L50 90 L14 50 Z",
    seams: "M50 10 L50 90 M14 50 L86 50",
    faces: [
      { x: 38.5, y: 37.5, turn: -45, size: 22 },
      { x: 61.5, y: 37.5, turn: 45, size: 22 },
      { x: 38.5, y: 62.5, turn: -135, size: 22 },
      { x: 61.5, y: 62.5, turn: 135, size: 22 },
    ],
    initial: [8, 3, 5, 2],
  },
  // icosahedron, face-on: hexagonal silhouette fully triangulated (central
  // apex-down face ringed by triangles) — every facet a triangle, as it must be
  {
    id: "d20",
    sides: 20,
    pivot: [50, 50],
    silhouette: "M50 8 L86.4 29 L86.4 71 L50 92 L13.6 71 L13.6 29 Z",
    seams:
      "M50 69.3 L33.3 40.3 L66.7 40.3 Z M50 69.3 L50 92 M50 69.3 L86.4 71 M50 69.3 L13.6 71 M33.3 40.3 L13.6 29 M33.3 40.3 L13.6 71 M33.3 40.3 L50 8 M66.7 40.3 L86.4 29 M66.7 40.3 L50 8 M66.7 40.3 L86.4 71",
    faces: [
      { x: 50, y: 50, turn: 0, size: 13 },
      { x: 50, y: 29.5, turn: 0, size: 15 },
      { x: 32.3, y: 60.2, turn: -120, size: 13 },
      { x: 67.7, y: 60.2, turn: 120, size: 13 },
      { x: 32.3, y: 25.8, turn: -36, size: 9, digits: 1 },
      { x: 67.7, y: 25.8, turn: 36, size: 9, digits: 1 },
      { x: 20.2, y: 46.8, turn: -84, size: 10, digits: 1 },
      { x: 79.8, y: 46.8, turn: 84, size: 10, digits: 1 },
      { x: 37.9, y: 77.4, turn: -156, size: 9, digits: 1 },
      { x: 62.1, y: 77.4, turn: 156, size: 9, digits: 1 },
    ],
    initial: [20, 10, 12, 14, 2, 3, 4, 5, 6, 8],
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

// Distinct values, one per visible face. Opposite faces sum to sides + 1 and
// can never be seen together, so no two values may. Narrow faces draw from 1–9
// first, leaving the two-digit values for faces that fit them.
function roll(die: Die): number[] {
  const slots = die.faces ?? die.pipFaces ?? [];
  const pool = Array.from({ length: die.sides }, (_, i) => i + 1);
  const out: number[] = new Array(slots.length);
  // A d4 has no opposite faces: every face touches the other three.
  const opposites = die.sides > 4;
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
    out[i] = take(
      (n) =>
        (!opposites || !out.includes(die.sides + 1 - n)) &&
        (!die.faces?.[i].digits || n < 10),
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
    trackClick("dice");
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
        transformOrigin: `${die.pivot[0]}% ${die.pivot[1]}%`,
        transitionDuration: `${SPIN_MS}ms`,
      }}
      className={`${SIZE} ${SHADOW} transition-[rotate] ease-in-out`}
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
        {die.pipFaces?.map(({ c, u, v }, f) => (
          <g key={f} transform={`matrix(${[...u, ...v, ...c].join(" ")})`}>
            {PIPS[values[f]].map(([a, b], i) => (
              <circle
                key={i}
                cx={a}
                cy={b}
                r={values[f] > 3 ? 0.38 : 0.45}
                fill="#000"
              />
            ))}
          </g>
        ))}
        {die.faces?.map(({ x, y, turn, size }, f) => (
          <text
            key={f}
            x={x}
            y={y}
            fontSize={size}
            transform={`rotate(${turn} ${x} ${y})`}
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
