"use client";

import { useEffect, useRef } from "react";
import { GLYPH, SHADOW } from "../sizing";

const CHARCOAL = "#4d4d4d";

// The glyph is one fused path, string included. To move the string, the two
// drawn string bands are masked out (generously, to clear their antialiased
// fringe; the stock ends lie exactly on the stock's edges) and a live string is drawn from limb tip to limb tip via the
// nock, which slides up the stock from drawn to at-rest.
const STRING_BANDS =
  "M60 25 L89.7 381 L139.5 325.5 L98.2 45.2 Z M487 452 L131 422.3 L186.5 372.5 L466.8 413.8 Z";
const TIPS = [
  [90, 30],
  [482, 424],
];
const NOCK_DRAWN = [120, 392];
const NOCK_LOOSE = [286, 227];

const points = (t: number) => {
  const nock = NOCK_DRAWN.map((v, i) => v + (NOCK_LOOSE[i] - v) * t);
  return [TIPS[0], nock, TIPS[1]].map((p) => p.join(",")).join(" ");
};

// Overshoots a touch, so the loosed string twangs past straight and back.
const easeOutBack = (p: number) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2;
const smooth = (p: number) => p * p * (3 - 2 * p);

export default function Crossbow({ d, fired }: { d: string; fired: boolean }) {
  const string = useRef<SVGPolylineElement>(null);
  const t = useRef(0);

  useEffect(() => {
    const from = t.current;
    const to = fired ? 1 : 0;
    if (from === to) return;
    const duration = fired ? 140 : 300;
    const start = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const p = Math.min(1, (now - start) / duration);
      t.current = from + (to - from) * (fired ? easeOutBack(p) : smooth(p));
      string.current?.setAttribute("points", points(t.current));
      if (p < 1) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [fired]);

  return (
    <svg viewBox="0 0 512 512" aria-hidden className={`${GLYPH} ${SHADOW}`}>
      <mask id="crossbow-string" maskUnits="userSpaceOnUse">
        <rect width="512" height="512" fill="#fff" />
        <path d={STRING_BANDS} fill="#000" />
      </mask>
      <path d={d} fill={CHARCOAL} mask="url(#crossbow-string)" />
      <polyline
        ref={string}
        points={points(0)}
        fill="none"
        stroke={CHARCOAL}
        strokeWidth={19}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
