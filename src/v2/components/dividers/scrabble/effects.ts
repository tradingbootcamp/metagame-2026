// Easter eggs: spell one of these on the rack and something happens. Words are
// RACK_SIZE letters by construction — if RACK_SIZE ever changes, this table is
// what goes with it.

// The persistent half of the eggs. Everything here is a toggle: spell the word
// again (after breaking it) to put it back.
export type Look = {
  scale: number; // 1 = baseline; GROW and TINY set it absolutely
  tall: boolean;
  skew: boolean;
  glow: boolean;
  blue: boolean;
  dark: boolean;
};

export const BASE_LOOK: Look = {
  scale: 1,
  tall: false,
  skew: false,
  glow: false,
  blue: false,
  dark: false,
};

const toggle = (key: "tall" | "skew" | "glow" | "blue" | "dark") => (l: Look) =>
  ({ ...l, [key]: !l[key] }) as Look;

const sizeTo = (scale: number) => (l: Look) => ({
  ...l,
  scale: l.scale === scale ? 1 : scale,
});

export type Spell =
  | { kind: "bell"; which: "bell" | "ding" | "ring" }
  | { kind: "maga" }
  | { kind: "turn"; stagger: number; turns: number }
  | { kind: "exit"; up: boolean }
  | { kind: "look"; apply: (l: Look) => Look };

export const SPELLS: Record<string, Spell> = {
  BELL: { kind: "bell", which: "bell" },
  DING: { kind: "bell", which: "ding" },
  RING: { kind: "bell", which: "ring" },
  MAGA: { kind: "maga" },
  // ROLL travels down the rack, SPIN goes all at once and twice around.
  ROLL: { kind: "turn", stagger: 110, turns: 1 },
  SPIN: { kind: "turn", stagger: 0, turns: 2 },
  FALL: { kind: "exit", up: false },
  RISE: { kind: "exit", up: true },
  GROW: { kind: "look", apply: sizeTo(1.15) },
  TINY: { kind: "look", apply: sizeTo(0.5) },
  DARK: { kind: "look", apply: toggle("dark") },
  TALL: { kind: "look", apply: toggle("tall") },
  SKEW: { kind: "look", apply: toggle("skew") },
  GLOW: { kind: "look", apply: toggle("glow") },
  BLUE: { kind: "look", apply: toggle("blue") },
};

export const TURN_MS = 700;
export const FALL_MS = 950;
export const RISE_MS = 1500;
export const MAGA_MS = 1300;
// Beat between the last tile leaving and a fresh rack being drawn.
export const RESTOCK_MS = 600;

// How far up TALL stretches the tile borders, in the 0–100 tile viewBox.
export const STRETCH = 15;

export const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Per-tile randomness for FALL/RISE, rolled once when the word is spelled so
// the tiles don't all leave in lockstep.
export type Seed = { delay: number; spin: number; drift: number };

export const seedExit = (n: number, up: boolean): Seed[] =>
  Array.from({ length: n }, () => ({
    delay: Math.random() * (up ? 300 : 220),
    spin: up ? (Math.random() - 0.5) * 40 : (Math.random() - 0.5) * 220,
    drift: (Math.random() - 0.5) * (up ? 60 : 30),
  }));
