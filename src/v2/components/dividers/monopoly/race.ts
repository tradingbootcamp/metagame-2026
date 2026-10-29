// The Monopoly race, shared between the dice row (the roller) and the
// Monopoly row (the pieces). Pick a token and it goes orange, the other three
// take a grey each; from then on a click on any die is your roll, three
// phantom copies of that die roll for the greys beneath the dice row, and all
// four pieces set off around the chapters between the two rows, one glyph
// pitch a step. Dice are on cooldown until the move lands. First piece back
// to the flag ends it: confetti if it's yours, a shake if not, then
// everything resets.
import { useSyncExternalStore } from "react";

// Greys for the three rivals, darkest first; phantom dice use the same.
export const RIVAL_SHADES = ["#1b1b1b", "#767676", "#b4b4b4"] as const;

export type Turn = {
  id: number;
  dieId: string;
  // Visible face values per racer: the player's die first, then the three
  // phantoms. A racer moves the first value's worth of steps.
  rolls: number[][];
};

export type RaceState = {
  // Index of the token picked as the player's piece; null when no race is on.
  player: number | null;
  turn: Turn | null;
  // Dice cooldown: set from the roll until the pieces have landed.
  moving: boolean;
};

const IDLE: RaceState = { player: null, turn: null, moving: false };
let state: RaceState = IDLE;
let diceEl: HTMLElement | null = null;
const listeners = new Set<() => void>();

const write = (next: RaceState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const getSnapshot = () => state;
export const getServerSnapshot = () => IDLE;
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export const useRace = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

// The dice row's icon box, so the pieces can find the top of the track and
// the phantoms know where "beneath the dice" is.
export const setDiceEl = (el: HTMLElement | null) => {
  diceEl = el;
};
export const getDiceEl = () => diceEl;

export const pick = (player: number) =>
  write({ player, turn: null, moving: false });
export const reset = () => write(IDLE);

// A die was clicked while a race is on and the dice are off cooldown.
export function startTurn(dieId: string, rolls: number[][]) {
  if (state.player === null || state.moving) return false;
  write({
    ...state,
    turn: { id: (state.turn?.id ?? 0) + 1, dieId, rolls },
    moving: true,
  });
  return true;
}

export const landed = () => write({ ...state, moving: false });

// --- Track geometry -------------------------------------------------------

export type Point = { x: number; y: number };

// A closed rectangular track as a polyline from the flag, anticlockwise on
// screen the way a Monopoly board runs: left along the bottom, up, right
// along the top, down, and back along the bottom to the flag.
export type Track = { corners: Point[]; length: number };

export function makeTrack(
  flag: Point,
  left: number,
  right: number,
  top: number,
): Track {
  const bottom = flag.y;
  const corners = [
    flag,
    { x: left, y: bottom },
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    flag,
  ];
  let length = 0;
  for (let i = 1; i < corners.length; i++) {
    length +=
      Math.abs(corners[i].x - corners[i - 1].x) +
      Math.abs(corners[i].y - corners[i - 1].y);
  }
  return { corners, length };
}

// Where a piece is after travelling `s` px from the flag.
export function along(track: Track, s: number): Point {
  let left = Math.max(0, Math.min(s, track.length));
  for (let i = 1; i < track.corners.length; i++) {
    const a = track.corners[i - 1];
    const b = track.corners[i];
    const seg = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (left <= seg) {
      const t = seg ? left / seg : 0;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    left -= seg;
  }
  return track.corners[track.corners.length - 1];
}
