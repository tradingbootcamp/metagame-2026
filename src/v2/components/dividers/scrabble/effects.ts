// Easter eggs: spell one of these on the rack and something happens. Words are
// RACK_SIZE letters by construction — if RACK_SIZE ever changes, this table is
// what goes with it.

// The persistent half of the eggs. One-way, all of it: there's no four-letter
// word for "light", and the same goes for short, straight, dull and plain. A
// reload is the only way back.
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

const set =
  (patch: Partial<Look>) =>
  (l: Look): Look => ({ ...l, ...patch });

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
  // Absolute, not cumulative: GROW then TINY lands on 50% of baseline, not 57%.
  GROW: { kind: "look", apply: set({ scale: 1.15 }) },
  TINY: { kind: "look", apply: set({ scale: 0.5 }) },
  DARK: { kind: "look", apply: set({ dark: true }) },
  TALL: { kind: "look", apply: set({ tall: true }) },
  SKEW: { kind: "look", apply: set({ skew: true }) },
  GLOW: { kind: "look", apply: set({ glow: true }) },
  BLUE: { kind: "look", apply: set({ blue: true }) },
};

export const TURN_MS = 700;
export const FALL_MS = 950;
export const RISE_MS = 1500;
export const MAGA_MS = 1300;

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
