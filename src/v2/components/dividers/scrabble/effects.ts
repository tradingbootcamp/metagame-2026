// Easter eggs: spell one of these on the rack and something happens. Words are
// RACK_SIZE letters by construction — if RACK_SIZE ever changes, this table is
// what goes with it.

import { RACK_SIZE } from "./tiles";

// The persistent half of the eggs. One-way, all of it: there's no four-letter
// word for "light", and the same goes for short, straight, dull and plain. A
// reload is the only way back.
export type Look = {
  scale: number; // 1 = baseline; GROW and TINY set it absolutely
  tall: boolean;
  skew: boolean;
  glow: boolean;
  tint: string | null; // a colour word's fill; the latest one wins
  ball: boolean;
  oval: boolean;
  dead: boolean;
  fuzz: boolean;
  fire: boolean;
  bold: boolean;
  flat: boolean;
  part: boolean;
  bull: boolean;
  evil: boolean;
  good: boolean;
  fish: boolean;
  tilt: number; // TILT: degrees, the same for every tile
  bites: number[]; // the tile each BITE landed on, in order
  dark: boolean;
};

export const BASE_LOOK: Look = {
  scale: 1,
  tall: false,
  skew: false,
  glow: false,
  tint: null,
  ball: false,
  oval: false,
  dead: false,
  fuzz: false,
  fire: false,
  bold: false,
  flat: false,
  part: false,
  bull: false,
  evil: false,
  good: false,
  fish: false,
  tilt: 0,
  bites: [],
  dark: false,
};

const set =
  (patch: Partial<Look>) =>
  (l: Look): Look => ({ ...l, ...patch });

// A keyframe animation from globals.css (scrabble-<name>), run `count` times
// per tile.
export type Hop = {
  name: "jump" | "flip" | "wave" | "buzz";
  ms: number;
  count: number;
  stagger: number;
};

export type Weather = "snow" | "rain" | "dust";

export type Glyph = "star" | "moon" | "time";

export type Exit =
  | "down"
  | "up"
  | "right"
  | "roll"
  | "fade"
  | "bomb"
  | "void"
  | "wind"
  | "dice"
  | "crab";

// A shade up from the tiles' #4d4d4d charcoal.
const GRAY = "#767676";

export const BITES_TO_FINISH = 6;

export type Spell =
  | {
      kind: "bell";
      which: "bing" | "bong" | "bell" | "ding" | "dong" | "ting" | "ring";
    }
  | { kind: "maga" }
  | { kind: "mark"; side: Side }
  | { kind: "turn"; turns: number }
  | { kind: "hop"; hop: Hop }
  | { kind: "love" }
  | { kind: "coin" }
  | { kind: "weather"; weather: Weather }
  | { kind: "glyph"; shape: Glyph }
  | { kind: "type" }
  | { kind: "rand" }
  | { kind: "undo" }
  | { kind: "sudo" }
  | { kind: "acid" }
  | { kind: "warp" }
  | { kind: "tone" }
  | { kind: "stop" }
  | { kind: "exit"; to: Exit }
  | { kind: "look"; apply: (l: Look) => Look };

export const SPELLS: Record<string, Spell> = {
  BING: { kind: "bell", which: "bing" },
  BONG: { kind: "bell", which: "bong" },
  BELL: { kind: "bell", which: "bell" },
  DING: { kind: "bell", which: "ding" },
  DONG: { kind: "bell", which: "dong" },
  TING: { kind: "bell", which: "ting" },
  RING: { kind: "bell", which: "ring" },
  // A dial tone, for five minutes. STOP is the only way to end it early.
  TONE: { kind: "tone" },
  MAGA: { kind: "maga" },
  // The only two eggs that leave a mark on the row rather than the rack.
  META: { kind: "mark", side: "meta" },
  GAME: { kind: "mark", side: "game" },
  SPIN: { kind: "turn", turns: 2 },
  JUMP: { kind: "hop", hop: { name: "jump", ms: 750, count: 1, stagger: 0 } },
  // A jump with one full somersault in the air.
  FLIP: { kind: "hop", hop: { name: "flip", ms: 850, count: 1, stagger: 0 } },
  // Stadium-style: each tile stands as the one before it sits.
  WAVE: { kind: "hop", hop: { name: "wave", ms: 620, count: 1, stagger: 140 } },
  // A phone on a table. The stagger keeps the tiles out of phase.
  BUZZ: { kind: "hop", hop: { name: "buzz", ms: 85, count: 12, stagger: 23 } },
  LOVE: { kind: "love" },
  COIN: { kind: "coin" },
  // Over the whole screen, for a few seconds.
  SNOW: { kind: "weather", weather: "snow" },
  RAIN: { kind: "weather", weather: "rain" },
  DUST: { kind: "weather", weather: "dust" },
  ACID: { kind: "acid" },
  // The rack itself melts and twists for a moment, then is fine.
  WARP: { kind: "warp" },
  // The letters turn into these for a moment, in a wave down the rack.
  STAR: { kind: "glyph", shape: "star" },
  MOON: { kind: "glyph", shape: "moon" },
  // The rack reads the time for a few seconds: HH, a colon, MM.
  TIME: { kind: "glyph", shape: "time" },
  // Clicking through the alphabet is the point — this is the way out of it.
  TYPE: { kind: "type" },
  SUDO: { kind: "sudo" },
  // Takes back the last letter: the one clicked, or the one typed over.
  UNDO: { kind: "undo" },
  // Re-rolls the rack, flickering through a few others on the way.
  RAND: { kind: "rand" },
  // Does what it says: the rack never responds to anything again.
  STOP: { kind: "stop" },
  FALL: { kind: "exit", to: "down" },
  RISE: { kind: "exit", to: "up" },
  ZOOM: { kind: "exit", to: "right" },
  ROLL: { kind: "exit", to: "roll" },
  BOMB: { kind: "exit", to: "bomb" },
  // Not the noun. The tiles are chopped into little cubes, which collapse
  // into a heap and stay there.
  DICE: { kind: "exit", to: "dice" },
  WIND: { kind: "exit", to: "wind" },
  // The rack grows legs, claws and eyes, and scuttles off sideways.
  CRAB: { kind: "exit", to: "crab" },
  FADE: { kind: "exit", to: "fade" },
  VOID: { kind: "exit", to: "void" },
  // Absolute, not cumulative: GROW then TINY lands on 50% of baseline, not 57%.
  GROW: { kind: "look", apply: set({ scale: 1.15 }) },
  TINY: { kind: "look", apply: set({ scale: 0.5 }) },
  DARK: { kind: "look", apply: set({ dark: true }) },
  TALL: { kind: "look", apply: set({ tall: true }) },
  SKEW: { kind: "look", apply: set({ skew: true }) },
  GLOW: { kind: "look", apply: set({ glow: true }) },
  BLUE: { kind: "look", apply: set({ tint: "var(--color-brand-blue)" }) },
  JADE: { kind: "look", apply: set({ tint: "#2f9e7a" }) },
  TEAL: { kind: "look", apply: set({ tint: "#1f8a8c" }) },
  PINK: { kind: "look", apply: set({ tint: "#e8709f" }) },
  GOLD: { kind: "look", apply: set({ tint: "#c9a02c" }) },
  BALL: { kind: "look", apply: set({ ball: true }) },
  OVAL: { kind: "look", apply: set({ oval: true }) },
  DEAD: { kind: "look", apply: set({ dead: true }) },
  // Leans the whole rack one way: a single angle of 10–25°, either direction.
  // Recasting rolls again.
  TILT: {
    kind: "look",
    apply: (l) => ({
      ...l,
      tilt: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 15),
    }),
  },
  // Each cast takes a bite out of a random tile that still has something left
  // on it. BITES_TO_FINISH of them and a tile is eaten entirely.
  BITE: {
    kind: "look",
    apply: (l) => {
      const left = Array.from({ length: RACK_SIZE }, (_, i) => i).filter(
        (i) => l.bites.filter((t) => t === i).length < BITES_TO_FINISH,
      );
      return left.length
        ? {
            ...l,
            bites: [...l.bites, left[Math.floor(Math.random() * left.length)]],
          }
        : l;
    },
  },
  // The last tile puts a line out and waits.
  FISH: { kind: "look", apply: set({ fish: true }) },
  // A halo over the first tile — EVIL's opposite number, and they stack.
  GOOD: { kind: "look", apply: set({ good: true }) },
  HOLY: { kind: "look", apply: set({ good: true }) },
  HALO: { kind: "look", apply: set({ good: true }) },
  // Devil horns and a tail, on the first tile only.
  EVIL: { kind: "look", apply: set({ evil: true }) },
  // Cow horns, on the last tile only.
  BULL: { kind: "look", apply: set({ bull: true }) },
  MOOO: { kind: "look", apply: set({ bull: true }) },
  OXEN: { kind: "look", apply: set({ bull: true }) },
  // The rack splits down the middle, a little.
  PART: { kind: "look", apply: set({ part: true }) },
  FLAT: { kind: "look", apply: set({ flat: true }) },
  BOLD: { kind: "look", apply: set({ bold: true }) },
  FUZZ: { kind: "look", apply: set({ fuzz: true }) },
  // Burns for as long as the page is open; the tile is never consumed.
  FIRE: { kind: "look", apply: set({ fire: true }) },
  PYRO: { kind: "look", apply: set({ fire: true }) },
  BURN: { kind: "look", apply: set({ fire: true }) },
  // Barely a change, which is the joke. Either spelling.
  GRAY: { kind: "look", apply: set({ tint: GRAY }) },
  GREY: { kind: "look", apply: set({ tint: GRAY }) },
};

// The one egg with something to win, so unlike the rest it outlives its cast:
// META and GAME each leave a tile on a hairline, and both earned reveal the
// code. A reload still clears it.
export type Side = "meta" | "game";
export const MARK_LETTER: Record<Side, string> = { meta: "M", game: "G" };
export const MARK_COLOR: Record<Side, string> = {
  meta: "var(--color-brand-blue)",
  game: "var(--color-meeple)",
};
// Needs a Stripe promotion code and an active, non-Stripe row in Airtable's
// Discount Codes table (src/lib/discount-codes.ts) to be worth anything.
export const CODE = "MGTILES";
export const CODE_NOTE = "for $25 off";
// Which rack tile the mark leaves from: META's M, GAME's G.
export const MARK_FROM: Record<Side, number> = { meta: 0, game: 1 };
// The mark's trip out of the rack to its hairline, on the cast.
export const MARK_CAST_MS = 1100;
export const MARK_FLY_MS = 1300;
// Sat beside the G, before the pair drops: the whole point is seeing them meet.
export const MARK_HOLD_MS = 700;
export const MARK_JOIN_MS = 900;
export const CODE_STAGGER = 140;
export const CODE_ENTRY_MS = 500;

export const TURN_MS = 1500;
// A beat between the word landing and FALL/RISE letting go.
export const HOLD_MS = 250;
export const FALL_MS = 2100;
export const RISE_MS = 6000;
export const ZOOM_MS = 1100;
export const ROLL_MS = 2600;
export const FADE_MS = 2200;
export const BOMB_MS = 1500;
export const WIND_MS = 2600;
export const WARP_MS = 2800;
export const CRAB_MS = 8400;
// The share of that spent sitting there first. Matches the hold at the start
// of the scrabble-scuttle keyframes.
export const CRAB_WAIT = 0.26;
// Four cuts, then the pieces drop.
export const DICE_CHOP_MS = 950;
export const DICE_FALL_MS = 520;
export const VOID_MS = 17200;
export const EXIT_MS = {
  down: FALL_MS,
  up: RISE_MS,
  right: ZOOM_MS,
  roll: ROLL_MS,
  fade: FADE_MS,
  bomb: BOMB_MS,
  void: VOID_MS,
  wind: WIND_MS,
  dice: DICE_CHOP_MS + DICE_FALL_MS,
  crab: CRAB_MS,
};
// The moon lingers, so the phases can be read.
export const GLYPH_TIMING: Record<Glyph, { ms: number; stagger: number }> = {
  star: { ms: 1300, stagger: 150 },
  moon: { ms: 3200, stagger: 260 },
  time: { ms: 4500, stagger: 0 },
};
export const COIN_MS = 650;
export const RAND_TICKS = 12;
export const RAND_TICK_MS = 65;
export const LOVE_MS = 1900;
export const LOVE_STAGGER = 170;
export const MAGA_MS = 1300;

// How far up TALL stretches the tile borders, in the 0–100 tile viewBox.
export const STRETCH = 15;
// And how much taller a DEAD tile's headstone stands.
export const HEADSTONE = 10;

export const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Per-tile randomness for the exits, rolled once when the word is spelled so
// the tiles don't all leave in lockstep. RISE wanders on two sways of unrelated
// period (globals.css adds them together), so no tile's path repeats.
export type Seed = {
  delay: number;
  spin: number;
  drift: number;
  sway: [number, number];
  period: [number, number];
  tilt: number;
};

const either = () => (Math.random() < 0.5 ? -1 : 1);

export const seedExit = (n: number, to: Exit): Seed[] => {
  const up = to === "up";
  return Array.from({ length: n }, (_, i) => ({
    // ZOOM leaves as one, like a car; ROLL sets off front tile first so
    // nothing rolls through its neighbour.
    delay:
      to === "right" ||
      to === "bomb" ||
      to === "void" ||
      to === "dice" ||
      to === "crab"
        ? 0
        : to === "roll"
          ? (n - 1 - i) * 160
          : to === "wind"
            ? // Downwind tiles tend to go first.
              (n - 1 - i) * 120 + Math.random() * 350
            : to === "fade"
              ? Math.random() * 500
              : HOLD_MS + Math.random() * (up ? 900 : 220),
    spin: up ? (Math.random() - 0.5) * 24 : (Math.random() - 0.5) * 220,
    drift: (Math.random() - 0.5) * (up ? 120 : 30),
    sway: [
      either() * (9 + Math.random() * 12),
      either() * (3 + Math.random() * 5),
    ],
    period: [2200 + Math.random() * 1400, 900 + Math.random() * 700],
    tilt: 3 + Math.random() * 4,
  }));
};
