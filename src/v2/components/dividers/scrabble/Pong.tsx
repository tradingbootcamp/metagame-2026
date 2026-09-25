"use client";

import { useEffect, useRef } from "react";

// PONG: a game of it behind the tiles, the plate as the court. Two paddles
// off the plate's ends, a ball between them, and nobody at the controls:
// each paddle chases the ball, a little too slowly to be sure of it, and the
// ball gets quicker with every return. First to PONG_POINTS, then `onDone`.
// The ball is driven straight from a rAF loop — React never sees a frame.
export const PONG_POINTS = 3;
export const PONG_OUT_MS = 900;

const PADDLE_H = 16;
const PADDLE_W = 3;
const BALL_R = 2.5;
const SERVE_SPEED = 130; // px/s
const SPEED_UP = 1.09;
const MAX_SPEED = SERVE_SPEED * 2;
// Kept tight: never flatter than MIN_ANGLE off a paddle or a serve, never
// steeper than MAX_ANGLE, in radians.
const MIN_ANGLE = 0.12;
const MAX_ANGLE = 0.5;
const PADDLE_SPEED = 95; // px/s; slower than a fast ball, so points get lost
const SERVE_WAIT = 700; // ms between a point and the next serve

export default function Pong({
  color,
  onDone,
}: {
  color: string;
  onDone: () => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const ball = useRef<SVGCircleElement>(null);
  const left = useRef<SVGRectElement>(null);
  const right = useRef<SVGRectElement>(null);
  const scoreL = useRef<SVGTextElement>(null);
  const scoreR = useRef<SVGTextElement>(null);
  const done = useRef(onDone);

  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const W = el.clientWidth;
    const H = el.clientHeight;
    // SVG attributes can't take calc(): the right-hand side is placed by hand.
    right.current?.setAttribute("x", String(W - PADDLE_W));
    scoreR.current?.setAttribute("x", String(W - 12));
    const score = [0, 0];
    const pad = [H / 2, H / 2]; // paddle centres
    // Where on its paddle each side means to take the ball: rolled afresh
    // for every approach, so returns come off at all sorts of angles.
    const aim = [0, 0];
    const reaim = (i: number) => {
      aim[i] = (Math.random() - 0.5) * PADDLE_H * 0.7;
    };
    let x = W / 2;
    let y = H / 2;
    let vx = 0;
    let vy = 0;
    let serveAt = performance.now() + SERVE_WAIT / 2;
    let toward = Math.random() < 0.5 ? -1 : 1;
    let last = performance.now();
    let raf = 0;
    let over = false;

    const serve = () => {
      x = W / 2;
      y = H * (0.3 + Math.random() * 0.4);
      const a =
        (Math.random() < 0.5 ? -1 : 1) *
        (MIN_ANGLE + Math.random() * (MAX_ANGLE - MIN_ANGLE) * 0.6);
      vx = toward * SERVE_SPEED * Math.cos(a);
      vy = SERVE_SPEED * Math.sin(a);
      reaim(toward < 0 ? 0 : 1);
    };

    const paint = () => {
      ball.current?.setAttribute("cx", x.toFixed(1));
      ball.current?.setAttribute("cy", y.toFixed(1));
      left.current?.setAttribute("y", (pad[0] - PADDLE_H / 2).toFixed(1));
      right.current?.setAttribute("y", (pad[1] - PADDLE_H / 2).toFixed(1));
      if (scoreL.current) scoreL.current.textContent = String(score[0]);
      if (scoreR.current) scoreR.current.textContent = String(score[1]);
    };

    const point = (winner: 0 | 1) => {
      score[winner]++;
      vx = vy = 0;
      x = W / 2;
      // The loser serves.
      toward = winner === 0 ? 1 : -1;
      serveAt = performance.now() + SERVE_WAIT;
      if (score[winner] >= PONG_POINTS) {
        over = true;
        setTimeout(() => done.current(), PONG_OUT_MS);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!over && vx === 0 && now >= serveAt) serve();
      // Each paddle only bothers when the ball is coming its way.
      const step = PADDLE_SPEED * dt;
      const chase = (i: number) => {
        const d = y + aim[i] - pad[i];
        pad[i] += Math.abs(d) < step ? d : Math.sign(d) * step;
        pad[i] = Math.max(PADDLE_H / 2, Math.min(H - PADDLE_H / 2, pad[i]));
      };
      if (vx < 0) chase(0);
      if (vx > 0) chase(1);
      x += vx * dt;
      y += vy * dt;
      if (y < BALL_R) {
        y = BALL_R;
        vy = Math.abs(vy);
      } else if (y > H - BALL_R) {
        y = H - BALL_R;
        vy = -Math.abs(vy);
      }
      const hit = (i: number, edge: number) => {
        // Where on the paddle it lands sets the angle: the ends send it off
        // steeply, as in the original.
        const off = (y - pad[i]) / (PADDLE_H / 2);
        const speed = Math.min(MAX_SPEED, Math.hypot(vx, vy) * SPEED_UP);
        const a =
          Math.sign(off || vy || 1) *
          Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, Math.abs(off) * MAX_ANGLE));
        vx = (i === 0 ? 1 : -1) * speed * Math.cos(a);
        vy = speed * Math.sin(a);
        x = edge;
        reaim(i === 0 ? 1 : 0);
      };
      const lEdge = PADDLE_W + BALL_R;
      const rEdge = W - PADDLE_W - BALL_R;
      if (vx < 0 && x <= lEdge) {
        if (Math.abs(y - pad[0]) <= PADDLE_H / 2 + BALL_R) hit(0, lEdge);
        else if (x < -BALL_R * 4 && !over) point(1);
      } else if (vx > 0 && x >= rEdge) {
        if (Math.abs(y - pad[1]) <= PADDLE_H / 2 + BALL_R) hit(1, rEdge);
        else if (x > W + BALL_R * 4 && !over) point(0);
      }
      paint();
      raf = requestAnimationFrame(tick);
    };
    paint();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      ref={svg}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 size-full animate-[scrabble-entry_500ms_ease-out] overflow-visible"
      fill={color}
      style={{ transition: "fill 300ms ease-out" }}
    >
      <rect ref={left} x="0" width={PADDLE_W} height={PADDLE_H} rx="1" />
      <rect ref={right} width={PADDLE_W} height={PADDLE_H} rx="1" />
      <circle ref={ball} r={BALL_R} />
      {/* The score, up in the corners where the tiles don't reach. */}
      <text
        ref={scoreL}
        x="12"
        y="9"
        fontSize="8"
        fontWeight="700"
        fontFamily="ui-monospace, monospace"
        textAnchor="middle"
        opacity="0.55"
      />
      <text
        ref={scoreR}
        y="9"
        fontSize="8"
        fontWeight="700"
        fontFamily="ui-monospace, monospace"
        textAnchor="middle"
        opacity="0.55"
      />
    </svg>
  );
}
