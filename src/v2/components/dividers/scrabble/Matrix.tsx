"use client";

import { useEffect, useRef } from "react";

// HACK: digital rain over the whole viewport for HACK_MS, in the tiles'
// charcoal on the page as it is. A beat of nothing, then it fades in, columns
// of glyphs falling at their own speeds with a dark head and a fading tail,
// the odd glyph in a tail changing as it falls, and it fades back out. Drawn
// on a canvas from a rAF loop; React only mounts and unmounts it. The fades
// are scrabble-hack in globals.css.
export const HACK_MS = 8000;

const CELL = 16;
const FONT = `300 ${CELL - 3}px ui-monospace, Menlo, monospace`;
// Half-width katakana and digits, as in the film.
const GLYPHS =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z:・=*+<>";
const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

type Column = {
  head: number; // in rows; can start above the top
  speed: number; // rows per second
  tail: number;
  chars: string[]; // one per row, the column's own text
};

export default function Matrix({
  color,
  onDone,
}: {
  color: string;
  onDone: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    el.width = W * dpr;
    el.height = H * dpr;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.font = FONT;
    ctx.textBaseline = "top";
    ctx.fillStyle = color;
    const rows = Math.ceil(H / CELL) + 1;
    const cols: Column[] = Array.from({ length: Math.ceil(W / CELL) }, () => ({
      // Already mid-fall: there's only HACK_MS to fill.
      head: Math.random() * rows * 1.3 - rows * 0.3,
      speed: 3 + Math.random() * 5,
      tail: 6 + Math.floor(Math.random() * 18),
      chars: Array.from({ length: rows }, glyph),
    }));
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      cols.forEach((c, i) => {
        c.head += c.speed * dt;
        // Off the bottom, tail and all: start over from above the top.
        if (c.head - c.tail > rows) {
          c.head = -Math.random() * rows * 0.3;
          c.speed = 3 + Math.random() * 5;
          c.tail = 6 + Math.floor(Math.random() * 18);
        }
        const x = i * CELL;
        const headRow = Math.floor(c.head);
        for (let k = 0; k < c.tail; k++) {
          const row = headRow - k;
          if (row < 0 || row >= rows) continue;
          if (Math.random() < 0.02) c.chars[row] = glyph();
          ctx.globalAlpha = k === 0 ? 0.7 : 0.4 * (1 - k / c.tail);
          ctx.fillText(c.chars[row], x, row * CELL);
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const t = setTimeout(() => done.current(), HACK_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
    // The colour is read once at mount: a rain that's already falling keeps it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      style={{ animation: `scrabble-hack ${HACK_MS}ms linear both` }}
    >
      {/* A touch of blur softens the glyphs' edges into the page. */}
      <canvas ref={canvas} className="size-full blur-[0.8px]" />
    </div>
  );
}
