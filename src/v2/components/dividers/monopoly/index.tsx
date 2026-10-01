"use client";

import { useEffect, useRef, useState } from "react";
import { useHatTrick } from "@/v2/hat-trick/store";
import DividerRow from "../DividerRow";
import { confetti } from "../confetti";
import { IconGlyph } from "../IconDivider";
import { GLYPH, GLYPH_PX, ICON_GAP, ICON_GAP_PX, LAYER } from "../sizing";
import { trackClick, trackEgg } from "../track";
import { ICONS } from "./icons";
import {
  along,
  getDiceEl,
  landed,
  makeTrack,
  pick,
  reset,
  RIVAL_SHADES,
  useRace,
  type Point,
  type Track,
} from "./race";

const CHARCOAL = "#4d4d4d";
const PLAYER = "var(--color-meeple)";
// One step: a glyph and the gap after it, the row's own pitch.
const STEP = GLYPH_PX + ICON_GAP_PX;
// One step: a quick lurch, then a hold, like an arcade horse race.
const STEP_MS = 420;
const LURCH = 0.45; // of the step spent moving
// The dice spin this long before the pieces set off (dice/index.tsx SPIN_MS).
const SPIN_MS = 700;
// Track edges sit this far inside the row, and the top runs this far above
// the dice; the whole thing is no wider than this. On a screen narrower than
// that the pieces walk the screen edge instead, a piece's half-width in.
const INSET = 24;
const EDGE = GLYPH_PX / 2 + 4;
const ABOVE_DICE = 34;
const MAX_WIDTH = 960;
const RESET_MS = 900;

// iron · hat · car · shoe — classic Monopoly tokens (Noun Project, Anna
// Lupean, CC BY 3.0). Baked-in attribution stripped; credit lives on
// /credits. Click a token and it's your piece in a race around the key dates
// (race.ts): a click on any die above rolls for everyone.
export default function MonopolyDivider() {
  const race = useRace();
  const { collect } = useHatTrick();
  const boxRef = useRef<HTMLSpanElement>(null);
  const pieceRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const flagRef = useRef<HTMLSpanElement>(null);
  // How far along the track each piece is, from the flag, and the track,
  // both kept out of React: positions are written straight to the transforms.
  // Null until the first roll measures where the pieces stand.
  const progress = useRef<number[] | null>(null);
  const track = useRef<Track | null>(null);
  const rest = useRef<Point[]>([]);
  const raf = useRef<number>(undefined);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [shaking, setShaking] = useState(false);
  // Where the flag goes once measured: a pitch past the shoe, or the track's
  // right corner when the screen is too narrow for that.
  const [flagLeft, setFlagLeft] = useState<number | null>(null);
  const racing = race.player !== null;

  const place = (i: number, p: Point) => {
    const el = pieceRefs.current[i];
    const r = rest.current[i];
    if (el && r)
      el.style.transform = `translate(${p.x - r.x}px, ${p.y - r.y}px)`;
  };

  // The track, measured fresh each turn so a resize mid-race just bends it.
  const measure = () => {
    const box = boxRef.current;
    const dice = getDiceEl();
    const row = box?.parentElement?.parentElement;
    if (!box || !dice || !row) return null;
    const b = box.getBoundingClientRect();
    const cy = b.height / 2;
    // Layout offsets, not rects: mid-race the pieces are already translated.
    rest.current = pieceRefs.current.map((el) => ({
      x: el!.offsetLeft + el!.offsetWidth / 2,
      y: cy,
    }));
    const last = rest.current[rest.current.length - 1];
    // The box is centred in the row, so the track is centred on the box,
    // then held inside the screen.
    const mid = b.width / 2;
    const half = Math.min(
      (row.getBoundingClientRect().width - 2 * INSET) / 2,
      MAX_WIDTH / 2,
    );
    const left = Math.max(mid - half, EDGE - b.left);
    const right = Math.min(
      mid + half,
      document.documentElement.clientWidth - b.left - EDGE,
    );
    const flag = { x: Math.min(last.x + STEP, right), y: cy };
    setFlagLeft(flag.x - GLYPH_PX / 2);
    // The pieces start where they sit, each a pitch further round than the
    // one before it — the front piece has that much less to run.
    progress.current ??= rest.current.map((r) => flag.x - r.x);
    const top = dice.getBoundingClientRect().top - b.top - ABOVE_DICE;
    return makeTrack(flag, left, right, top);
  };

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Back to the start line: the pieces slide home on their transition.
  const clear = () => {
    stop();
    progress.current = null;
    pieceRefs.current.forEach((el) => el && (el.style.transform = ""));
    reset();
  };

  const finish = (won: boolean) => {
    if (won) {
      trackEgg({ egg: "monopoly", event: "win" });
      if (boxRef.current && track.current) {
        // Up from the start line, to just above the dice.
        const b = boxRef.current.getBoundingClientRect();
        const [flag, , topLeft, topRight] = track.current.corners;
        confetti(
          b.left + topLeft.x,
          b.top + flag.y,
          topRight.x - topLeft.x,
          flag.y - topLeft.y + ABOVE_DICE - 8,
        );
      }
    } else setShaking(true);
    timers.current.push(setTimeout(clear, RESET_MS));
  };

  // A new turn: wait out the dice spin, then run every piece its roll.
  const turnId = race.turn?.id;
  useEffect(() => {
    const turn = race.turn;
    if (!turn) return;
    const t = measure();
    if (!t) {
      landed();
      return;
    }
    track.current = t;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = [...progress.current!];
    const steps = turn.rolls.map((r) => r[0]);
    const to = from.map((s, i) => s + steps[i] * STEP);
    const durations = steps.map((n) => (still ? 0 : n * STEP_MS));
    const total = Math.max(...durations);
    // Who crosses the flag first this turn, by the moment they'd cross it.
    let winner = -1;
    let soonest = Infinity;
    to.forEach((s, i) => {
      if (s < t.length) return;
      // The step that crosses, at the end of its lurch.
      const at = (Math.ceil((t.length - from[i]) / STEP) - 1 + LURCH) * STEP_MS;
      if (at < soonest) [soonest, winner] = [at, i];
    });

    const run = (t0: number) => {
      const frame = (now: number) => {
        const dt = now - t0;
        from.forEach((s, i) => {
          progress.current![i] =
            s + (durations[i] ? lurched(dt, steps[i]) : steps[i]) * STEP;
          place(i, along(t, progress.current![i]));
        });
        if (dt < total) raf.current = requestAnimationFrame(frame);
        // A win keeps the dice on cooldown until the reset clears everything.
        else if (winner >= 0) finish(winner === race.player);
        else landed();
      };
      raf.current = requestAnimationFrame(frame);
    };
    timers.current.push(setTimeout(() => run(performance.now()), SPIN_MS));
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnId]);

  useEffect(() => stop, []);

  // Place the flag as soon as a token is picked.
  useEffect(() => {
    if (racing) measure();
  }, [racing]);

  const onToken = (i: number) => {
    // Hat Trick: the top hat token counts as a hat, but stays in the race.
    if (ICONS[i].name === "monopoly-hat") collect("topHat");
    if (race.moving) return;
    if (racing) {
      // Any token between rolls calls the race off.
      clear();
      return;
    }
    trackClick("monopoly");
    pick(i);
  };

  // Rivals take the greys in row order, skipping the player.
  const fill = (i: number) => {
    if (!racing) return CHARCOAL;
    if (i === race.player) return PLAYER;
    return RIVAL_SHADES[i - (i > race.player! ? 1 : 0)];
  };

  return (
    <DividerRow game="monopoly">
      <span
        ref={boxRef}
        onAnimationEnd={() => setShaking(false)}
        className={`relative flex items-center ${ICON_GAP} ${
          shaking ? "animate-[shake_400ms_ease-in-out]" : ""
        }`}
      >
        {ICONS.map((ic, i) => (
          <span
            key={ic.name}
            ref={(el) => {
              pieceRefs.current[i] = el;
            }}
            onClick={() => onToken(i)}
            className={`relative z-20 flex ${LAYER} ${
              race.moving ? "" : "transition-transform duration-500 ease-out"
            }`}
          >
            <IconGlyph icon={ic} fill={fill(i)} />
          </span>
        ))}
        {/* The start/finish line, one step past the last token. */}
        <span
          ref={flagRef}
          aria-hidden
          className={`absolute top-1/2 -translate-y-1/2 transition-opacity duration-500 ${
            racing ? "opacity-100" : "opacity-0"
          }`}
          style={{ left: flagLeft ?? `calc(100% + ${ICON_GAP_PX}px)` }}
        >
          <CheckeredFlag />
        </span>
      </span>
    </DividerRow>
  );
}

// Steps run so far at `dt` ms in, counting a step in progress by how far
// its lurch has got (eased out), and holding still for the rest of it.
function lurched(dt: number, steps: number) {
  const done = Math.floor(dt / STEP_MS);
  if (done >= steps) return steps;
  const f = Math.min(1, (dt - done * STEP_MS) / (STEP_MS * LURCH));
  return done + 1 - (1 - f) * (1 - f);
}

function CheckeredFlag() {
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 5; c++)
      if ((r + c) % 2 === 0)
        cells.push(
          <rect
            key={`${r}${c}`}
            x={22 + c * 14}
            y={8 + r * 11}
            width={14}
            height={11}
          />,
        );
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={GLYPH} fill={CHARCOAL}>
      <rect x="12" y="4" width="7" height="92" rx="3" />
      {/* Flag outline, with the light squares left open. */}
      <path
        d="M19 8 H92 V52 H19 Z"
        fill="none"
        stroke={CHARCOAL}
        strokeWidth="5"
      />
      {cells}
    </svg>
  );
}
