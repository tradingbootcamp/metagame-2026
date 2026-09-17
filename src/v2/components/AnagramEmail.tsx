"use client";

import { useEffect, useRef } from "react";
import { TEAM_EMAIL } from "@/v2/lib/links";
import { cn } from "@/v2/lib/utils";
import { useContact } from "./contact/ContactProvider";

// team@metagame.games, where "team" and "meta" are anagrams. While the cursor
// is over the address it repels nearby letters of the two words, so they
// dance away from it until it leaves and they settle. Entering team@meta
// also sends each letter arcing across the @ to the slot of the same letter
// in the other word, spinning once on the way. The swapped result reads
// identically, so once everything is at rest the transforms are dropped and
// the next hover starts fresh.
const A = "team";
const B = "meta";
const REST = "game.games";
const FLIGHT_MS = 3000;
// Repulsion: full push at the cursor, fading to nothing at RADIUS px.
const RADIUS = 56;
const PUSH = 16;
// How quickly a letter closes on its target each frame (0–1).
const FOLLOW = 0.16;

// For each letter of one word, the index of the same letter in the other.
// Letters repeat nowhere in team/meta, so the mapping is one-to-one.
const toB = [...A].map((ch) => B.indexOf(ch));
const toA = [...B].map((ch) => A.indexOf(ch));

const ease = (p: number) =>
  p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

type Letter = {
  el: HTMLElement;
  // Where the letter is (translate + rotate), chasing its target each frame.
  x: number;
  y: number;
  r: number;
  // Flight to the partner slot; zero until a swap starts.
  dx: number;
  arc: number;
  spin: number;
};

export default function AnagramEmail({ className }: { className?: string }) {
  const openContact = useContact();
  const aRef = useRef<HTMLSpanElement>(null);
  const bRef = useRef<HTMLSpanElement>(null);
  // Empty while at rest with transforms clear.
  const letters = useRef<Letter[]>([]);
  const cursor = useRef<{ x: number; y: number } | null>(null);
  // The current swap's start time, or null when none has been triggered
  // since the letters last settled.
  const flightStart = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  function tick(now: number) {
    frame.current = null;
    if (letters.current.length === 0) return;
    const start = flightStart.current;
    const p = start === null ? 1 : Math.min(1, (now - start) / FLIGHT_MS);
    const e = ease(p);
    const c = cursor.current;
    let settled = p >= 1 && !c;

    for (const l of letters.current) {
      let tx = l.dx * e;
      let ty = l.arc * Math.sin(Math.PI * e);
      let tr = l.spin * e;
      if (c) {
        const box = l.el.getBoundingClientRect();
        const cx = box.left + box.width / 2 - c.x;
        const cy = box.top + box.height / 2 - c.y;
        const dist = Math.hypot(cx, cy) || 1;
        if (dist < RADIUS) {
          const push = (PUSH * (RADIUS - dist)) / RADIUS;
          tx += (cx / dist) * push;
          ty += (cy / dist) * push;
          tr += (cx / dist) * push * 1.5;
        }
      }
      l.x += (tx - l.x) * FOLLOW;
      l.y += (ty - l.y) * FOLLOW;
      l.r += (tr - l.r) * FOLLOW;
      if (Math.abs(tx - l.x) > 0.1 || Math.abs(ty - l.y) > 0.1) settled = false;
      l.el.style.transform = `translate(${l.x}px, ${l.y}px) rotate(${l.r}deg)`;
    }

    if (settled) {
      // Every letter sits where the same glyph started (and a full turn is
      // upright), so clearing the transforms changes nothing visible.
      for (const l of letters.current) {
        l.el.style.transform = "";
        l.el.style.willChange = "";
      }
      letters.current = [];
      flightStart.current = null;
      return;
    }
    frame.current = requestAnimationFrame(tick);
  }

  function ensureLoop() {
    if (frame.current === null && letters.current.length > 0)
      frame.current = requestAnimationFrame(tick);
  }

  // Wake the letters (no flight yet) so the cursor can push them around.
  function wake() {
    if (letters.current.length > 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const a = aRef.current?.querySelectorAll<HTMLElement>("[data-letter]");
    const b = bRef.current?.querySelectorAll<HTMLElement>("[data-letter]");
    if (!a || !b || a.length !== 4 || b.length !== 4) return;
    letters.current = [...a, ...b].map((el) => {
      el.style.willChange = "transform";
      return { el, x: 0, y: 0, r: 0, dx: 0, arc: 0, spin: 0 };
    });
    ensureLoop();
  }

  function swap() {
    wake();
    if (flightStart.current !== null || letters.current.length === 0) return;
    const ls = letters.current;
    // Resting slot of a letter: where it is now, minus its current push.
    const rest = (l: Letter) => l.el.getBoundingClientRect().left - l.x;
    ls.forEach((l, i) => {
      const to = i < 4 ? ls[4 + toB[i]] : ls[toA[i - 4]];
      l.dx = rest(to) - rest(l);
      // Alternate arc side and spin direction so crossing letters miss.
      const odd = (i < 4 ? i : i + 1) % 2;
      l.arc = odd ? -16 : 12;
      l.spin = odd ? -360 : 360;
    });
    flightStart.current = performance.now();
    ensureLoop();
  }

  const word = (text: string, ref: React.RefObject<HTMLSpanElement | null>) => (
    <span ref={ref}>
      {[...text].map((ch, i) => (
        // inline-block so transforms apply.
        <span key={i} data-letter className="inline-block">
          {ch}
        </span>
      ))}
    </span>
  );

  return (
    // The underline is a static rule under the whole address (text-decoration
    // wouldn't reach the inline-block letters, and would fly with them).
    <button
      type="button"
      onClick={() => openContact()}
      aria-label={`Contact ${TEAM_EMAIL}`}
      onMouseEnter={wake}
      onMouseMove={(e) => {
        cursor.current = { x: e.clientX, y: e.clientY };
        ensureLoop();
      }}
      onMouseLeave={() => {
        cursor.current = null;
        ensureLoop();
      }}
      className={cn(
        className,
        "relative inline-block cursor-pointer whitespace-nowrap no-underline after:absolute after:inset-x-0 after:bottom-[3px] after:h-px after:bg-current",
      )}
    >
      <span onMouseEnter={swap}>
        {word(A, aRef)}@{word(B, bRef)}
      </span>
      {REST}
    </button>
  );
}
