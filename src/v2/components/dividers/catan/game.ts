// The Catan row's game, shared with the dice row (the roller). A tap on the
// row starts it: the tiles take a number each, and you place two settlements,
// each with a road, as in the real setup (the second pays out a card per tile
// it touches). From then on every die thrown on the dice row is a roll: its
// top face pays each settlement a card from every tile showing that number.
// Cards buy roads and settlements under the usual rules. There's no ore, so
// no cities: a settlement is a point, a road of five or more earns the
// longest road's two, and ten points wins. Nothing is persisted.
import { useSyncExternalStore } from "react";

// Tile order, the same as the row's icons.
export const RESOURCES = ["brick", "wood", "wheat", "wool"] as const;
export type Resource = (typeof RESOURCES)[number];
export type Hand = Record<Resource, number>;

// Four pointy-top hexes in a row. Their corners form two zigzag chains of
// nine, top (0–8) and bottom (9–17), joined by a rung at each even position:
// hex h has corners 2h…2h+2 in each chain.
export const CHAIN = 9;
export const VERTICES = CHAIN * 2;
export const EDGES: [number, number][] = [
  ...Array.from({ length: CHAIN - 1 }, (_, k): [number, number] => [k, k + 1]),
  ...Array.from({ length: CHAIN - 1 }, (_, k): [number, number] => [
    CHAIN + k,
    CHAIN + k + 1,
  ]),
  ...Array.from({ length: 5 }, (_, j): [number, number] => [
    2 * j,
    CHAIN + 2 * j,
  ]),
];

export const hexesAt = (v: number) =>
  [0, 1, 2, 3].filter((h) => 2 * h <= v % CHAIN && v % CHAIN <= 2 * h + 2);
const edgesAt = (v: number) =>
  EDGES.flatMap(([a, b], e) => (a === v || b === v ? [e] : []));
const neighbours = (v: number) =>
  EDGES.flatMap(([a, b]) => (a === v ? [b] : b === v ? [a] : []));

const ROAD: Partial<Hand> = { brick: 1, wood: 1 };
const SETTLEMENT: Partial<Hand> = { brick: 1, wood: 1, wheat: 1, wool: 1 };
const LONGEST_MIN = 5;
const LONGEST_VP = 2;
export const WIN_VP = 10;

export type Phase = "rest" | "setup" | "play" | "won";
export type CatanState = {
  phase: Phase;
  // Setup: the next placement, settlement then road, twice (0–3).
  step: number;
  numbers: number[]; // per tile
  settlements: number[];
  roads: number[];
  hand: Hand;
  // The longest road's corners in order, once it has earned the bonus.
  longest: number[] | null;
  // The last roll that paid out, so the tiles it hit can flash.
  payout: { id: number; tiles: number[] } | null;
};

const EMPTY_HAND: Hand = { brick: 0, wood: 0, wheat: 0, wool: 0 };
const REST: CatanState = {
  phase: "rest",
  step: 0,
  numbers: [],
  settlements: [],
  roads: [],
  hand: EMPTY_HAND,
  longest: null,
  payout: null,
};

let state = REST;
const listeners = new Set<() => void>();
const write = (next: CatanState) => {
  state = next;
  listeners.forEach((l) => l());
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const useCatan = () =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => REST,
  );

export const points = (s: CatanState) =>
  s.settlements.length + (s.longest ? LONGEST_VP : 0);

const affords = (hand: Hand, cost: Partial<Hand>) =>
  RESOURCES.every((r) => hand[r] >= (cost[r] ?? 0));
const pay = (hand: Hand, cost: Partial<Hand>): Hand =>
  Object.fromEntries(
    RESOURCES.map((r) => [r, hand[r] - (cost[r] ?? 0)]),
  ) as Hand;

// Nothing on the corner or next to it (the distance rule); in play it also
// has to be on one of your roads.
export function canSettle(s: CatanState, v: number) {
  const taken = new Set(s.settlements);
  if (taken.has(v) || neighbours(v).some((n) => taken.has(n))) return false;
  if (s.phase === "setup") return s.step % 2 === 0;
  if (s.phase !== "play" || !affords(s.hand, SETTLEMENT)) return false;
  return edgesAt(v).some((e) => s.roads.includes(e));
}

// Setup roads leave the settlement just placed; later ones join anything of
// yours.
export function canRoad(s: CatanState, e: number) {
  if (s.roads.includes(e)) return false;
  const ends = EDGES[e];
  if (s.phase === "setup")
    return s.step % 2 === 1 && ends.includes(s.settlements.at(-1)!);
  if (s.phase !== "play" || !affords(s.hand, ROAD)) return false;
  return ends.some(
    (v) =>
      s.settlements.includes(v) || edgesAt(v).some((f) => s.roads.includes(f)),
  );
}

// The longest trail through the roads (no road used twice), as corners.
function longestRoad(roads: number[]): number[] {
  let best: number[] = [];
  const walk = (v: number, used: Set<number>, path: number[]) => {
    if (path.length > best.length) best = [...path];
    for (const e of edgesAt(v)) {
      if (!roads.includes(e) || used.has(e)) continue;
      const [a, b] = EDGES[e];
      const next = a === v ? b : a;
      used.add(e);
      path.push(next);
      walk(next, used, path);
      path.pop();
      used.delete(e);
    }
  };
  for (let v = 0; v < VERTICES; v++) walk(v, new Set(), [v]);
  return best;
}

const settle = (s: CatanState): CatanState =>
  points(s) >= WIN_VP ? { ...s, phase: "won" } : s;

export function start() {
  if (state.phase !== "rest") return;
  const numbers: number[] = [];
  while (numbers.length < 4) {
    const n = 2 + Math.floor(Math.random() * 11);
    if (!numbers.includes(n)) numbers.push(n);
  }
  write({ ...REST, phase: "setup", numbers });
}

export function buildSettlement(v: number) {
  const s = state;
  if (!canSettle(s, v)) return;
  const settlements = [...s.settlements, v];
  if (s.phase === "setup") {
    const hand = { ...s.hand };
    if (s.step === 2) for (const h of hexesAt(v)) hand[RESOURCES[h]]++;
    write({ ...s, settlements, hand, step: s.step + 1 });
    return;
  }
  write(settle({ ...s, settlements, hand: pay(s.hand, SETTLEMENT) }));
}

export function buildRoad(e: number) {
  const s = state;
  if (!canRoad(s, e)) return;
  const roads = [...s.roads, e];
  if (s.phase === "setup") {
    write({
      ...s,
      roads,
      step: s.step + 1,
      phase: s.step === 3 ? "play" : s.phase,
    });
    return;
  }
  let longest = s.longest;
  if (!longest) {
    const trail = longestRoad(roads);
    if (trail.length - 1 >= LONGEST_MIN) longest = trail;
  }
  write(settle({ ...s, roads, longest, hand: pay(s.hand, ROAD) }));
}

// A die thrown on the dice row: its top face is the roll.
export function rolled(n: number) {
  const s = state;
  if (s.phase !== "play") return;
  const hand = { ...s.hand };
  const tiles = new Set<number>();
  s.numbers.forEach((m, h) => {
    if (m !== n) return;
    for (const v of s.settlements)
      if (hexesAt(v).includes(h)) {
        hand[RESOURCES[h]]++;
        tiles.add(h);
      }
  });
  if (!tiles.size) return;
  write({
    ...s,
    hand,
    payout: { id: (s.payout?.id ?? 0) + 1, tiles: [...tiles] },
  });
}
