"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Glyph, { GLYPH_LABELS, type GlyphName } from "./Glyph";

// Token colours from the brand guide, with the glyph colour for each.
const KINDS: { name: GlyphName; bg: string; fg: string }[] = [
  { name: "puzzles", bg: "bg-navy", fg: "text-cream" },
  { name: "video-games", bg: "bg-brand-blue", fg: "text-navy" },
  { name: "larps", bg: "bg-meeple", fg: "text-cream" },
  { name: "dance", bg: "bg-sky", fg: "text-navy" },
  { name: "megagame", bg: "bg-tan", fg: "text-navy" },
  { name: "party-games", bg: "bg-moss", fg: "text-cream" },
  { name: "card-games", bg: "bg-peach", fg: "text-navy" },
  { name: "crosswords", bg: "bg-sky", fg: "text-navy" },
  { name: "workshops", bg: "bg-tan", fg: "text-navy" },
  { name: "escape-rooms", bg: "bg-background", fg: "text-navy" },
  { name: "trivia", bg: "bg-brand-blue", fg: "text-navy" },
  { name: "board-games", bg: "bg-background", fg: "text-navy" },
];

// The web is an icosahedron: twelve corners, one kind of play on each, and
// its thirty edges between them. Drag to spin it; left alone it turns
// slowly. Corners further away draw smaller and their edges fainter.
const PHI = (1 + Math.sqrt(5)) / 2;
const CORNERS = [-1, 1].flatMap((a) =>
  [-1, 1].flatMap((b) => [
    [0, a, b * PHI],
    [a, b * PHI, 0],
    [a * PHI, 0, b],
  ]),
);
const RADIUS = Math.hypot(1, PHI);
// An edge joins corners two units apart.
const EDGES = CORNERS.flatMap((a, i) =>
  CORNERS.flatMap((b, j) =>
    j > i && Math.abs(Math.hypot(...a.map((v, k) => v - b[k])) - 2) < 1e-6
      ? [[i, j] as const]
      : [],
  ),
);

// 3×3 rotation matrices, row-major, mapping the model into screen space
// (x right, y down, z towards the viewer).
type Mat = number[];
const rotX = (t: number): Mat => {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
const rotY = (t: number): Mat => {
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};
const mul = (a: Mat, b: Mat): Mat =>
  Array.from({ length: 9 }, (_, i) => {
    const r = Math.floor(i / 3);
    const c = i % 3;
    return a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  });
const apply = (m: Mat, [x, y, z]: number[]) => [
  m[0] * x + m[1] * y + m[2] * z,
  m[3] * x + m[4] * y + m[5] * z,
  m[6] * x + m[7] * y + m[8] * z,
];

// The opening pose, turned so no two corners land near each other.
const START = mul(rotY(1.955), rotX(2.897));

// The box, in CSS pixels at the design width; everything is laid out as a
// percentage of it so it scales with the column.
const W = 432;
const H = 400;
const HEX = 50;
const SCALE = (Math.min(W, H) / 2 - HEX * 0.7) / RADIUS;
// Camera distance, in model units: how much nearer corners grow.
const CAMERA = 9;
const HEX_CLIP = "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)";

const DRAG = 0.008;
const IDLE_SPIN = 0.000875;
const IDLE_AFTER_MS = 2500;

export default function PlayWeb() {
  const [pose, setPose] = useState<Mat>(START);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const velocity = useRef({ x: 0, y: 0 });
  const lastTouch = useRef(0);

  // Inertia after a drag, and the slow idle turn, unless motion is unwanted.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (drag.current || document.hidden) return;
      const v = velocity.current;
      if (Math.abs(v.x) + Math.abs(v.y) > 0.0004) {
        setPose((p) => mul(mul(rotY(v.x), rotX(v.y)), p));
        v.x *= 0.94;
        v.y *= 0.94;
      } else if (Date.now() - lastTouch.current > IDLE_AFTER_MS) {
        setPose((p) => mul(rotY(IDLE_SPIN), p));
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    velocity.current = { x: 0, y: 0 };
    lastTouch.current = Date.now();
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = (e.clientX - d.x) * DRAG;
    const dy = -(e.clientY - d.y) * DRAG;
    d.x = e.clientX;
    d.y = e.clientY;
    velocity.current = { x: dx, y: dy };
    setPose((p) => mul(mul(rotY(dx), rotX(dy)), p));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    lastTouch.current = Date.now();
  };

  // Rounded, so the server's and the browser's floating point agree and the
  // first paint hydrates cleanly.
  const r = (n: number) => Math.round(n * 100) / 100;
  const nodes = CORNERS.map((c) => {
    const [x, y, z] = apply(pose, c);
    const k = CAMERA / (CAMERA - z);
    const depth = r((z + RADIUS) / (2 * RADIUS));
    return {
      x: r(W / 2 + x * SCALE * k),
      y: r(H / 2 + y * SCALE * k),
      k: r(k),
      depth,
      // Stacking order: nearer corners over further ones, with room between
      // them for the edges.
      z: 1 + Math.round(depth * 1000),
    };
  });

  return (
    <div
      className="relative w-full cursor-grab touch-none select-none active:cursor-grabbing"
      style={{ aspectRatio: `${W} / ${H}` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {/* Each edge on its own layer, just under the further of its two
          corners, so a corner at the back sits behind the edges in front of
          it and no edge crosses the face of a corner it joins. */}
      {EDGES.map(([i, j]) => (
        <svg
          key={`${i}-${j}`}
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden
          className="pointer-events-none absolute inset-0 size-full"
          style={{ zIndex: Math.min(nodes[i].z, nodes[j].z) - 1 }}
        >
          <line
            x1={nodes[i].x}
            y1={nodes[i].y}
            x2={nodes[j].x}
            y2={nodes[j].y}
            className="stroke-navy"
            strokeWidth={1.5}
            strokeOpacity={r(
              0.1 + 0.35 * ((nodes[i].depth + nodes[j].depth) / 2),
            )}
          />
        </svg>
      ))}
      <ul>
        {KINDS.map(({ name, bg, fg }, i) => {
          const { x, y, k, z } = nodes[i];
          return (
            <li
              key={name}
              // The hovered one rises above the rest, so its label is never
              // under a nearer edge.
              className="group absolute z-(--z) -translate-x-1/2 -translate-y-1/2 hover:z-[2000]"
              style={
                {
                  left: `${r((x / W) * 100)}%`,
                  top: `${r((y / H) * 100)}%`,
                  width: `${r(((HEX * k) / W) * 100)}%`,
                  "--z": z,
                } as React.CSSProperties
              }
            >
              {/* A navy hex with the coloured one inset, for an outline the
                  clip can't cut. */}
              <span
                className="grid aspect-[1/0.87] w-full place-items-center bg-navy"
                style={{ clipPath: HEX_CLIP }}
              >
                <span
                  className={`grid size-[calc(100%-5px)] place-items-center ${bg} ${fg}`}
                  style={
                    {
                      clipPath: HEX_CLIP,
                      "--glyph-bg": "var(--color-peach)",
                    } as React.CSSProperties
                  }
                >
                  <Glyph
                    name={name}
                    label={GLYPH_LABELS[name]}
                    className="size-[58%]"
                  />
                </span>
              </span>
              <span
                aria-hidden
                className="pointer-events-none absolute -top-7 left-1/2 z-20 -translate-x-1/2 rounded bg-navy px-2 py-1 font-space-mono text-[10px] font-bold tracking-[0.1em] whitespace-nowrap text-cream uppercase opacity-0 transition-opacity group-hover:opacity-100"
              >
                {GLYPH_LABELS[name]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
