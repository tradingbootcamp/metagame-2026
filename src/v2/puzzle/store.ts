// The hero puzzle. One of seven games is "current"; its version of the library
// photo is the hero backdrop. Clicking that game's section divider earns it a
// star and picks a new current game. Holding any star puts you "in game":
// from then on every divider click is a guess, and a wrong one shakes the row
// and wipes the stars. With no stars, only the current game's row reacts to
// the puzzle — every other divider just does its own thing (Tetris spins,
// etc.), so a fresh visitor can play with the rows without tripping it.
// A star for all seven games swaps the backdrop for the win image.
//
// Nothing is persisted: a reload starts over with a fresh random pick (which
// doubles as a hint). The pick happens *before first paint* in the inline
// boot script (boot.ts), which stamps it on <html>; this store reads that
// stamp for React. The backdrop image itself is a CSS variable on <html>
// (see applyGame) rather than React state, so the server-rendered hero needs
// no client knowledge of the pick.

export const GAMES = [
  "chess",
  "cards",
  "set",
  "dnd",
  "botct",
  "catan",
  "monopoly",
] as const;
export type Game = (typeof GAMES)[number];
export type Current = Game | "win";
export type PuzzleState = { stars: Record<Game, boolean>; current: Current };

// Parked while the puzzle is untangled from the dividers' own interactions:
// off, every load gets FALLBACK_GAME's image and no divider click is a guess.
export const PUZZLE_ENABLED = false;

// Boot script failed / JS off: the boot script and the store agree on this.
export const FALLBACK_GAME: Game = "catan";

export const IMAGE_PREFIX = "/images/puzzle/library_";
export const IMAGE_EXT = ".webp";
export const imageFor = (g: Current) => `${IMAGE_PREFIX}${g}${IMAGE_EXT}`;

const noStars = (): Record<Game, boolean> =>
  Object.fromEntries(GAMES.map((g) => [g, false])) as Record<Game, boolean>;

const DEFAULT: PuzzleState = { stars: noStars(), current: FALLBACK_GAME };

// "In game": at least one star held, so wrong clicks now count.
export const inGame = (s: PuzzleState) => GAMES.some((g) => s.stars[g]);

// --- useSyncExternalStore plumbing ---------------------------------------
let state: PuzzleState | null = null;

declare global {
  interface Window {
    __puzzleGame?: string;
  }
}

export function getSnapshot(): PuzzleState {
  if (!state) {
    // First read on the client: adopt the boot script's pick (the global
    // survives React re-rendering <html>; the dataset stamp may not).
    const stamped =
      window.__puzzleGame ?? document.documentElement.dataset.game;
    const current =
      stamped === "win" || GAMES.includes(stamped as Game)
        ? (stamped as Current)
        : FALLBACK_GAME;
    state = { stars: noStars(), current };
    applyGame(current);
  }
  return state;
}

export const getServerSnapshot = (): PuzzleState => DEFAULT;

const listeners = new Set<() => void>();
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// Point the hero backdrop at a game's image (HeroBackdrop reads the var).
// Idempotent: BootSync calls it again after any client render of <html>.
export function applyGame(g: Current) {
  window.__puzzleGame = g;
  const el = document.documentElement;
  el.dataset.game = g;
  el.style.setProperty("--puzzle-image", `url(${imageFor(g)})`);
}

function write(next: PuzzleState) {
  state = next;
  applyGame(next.current);
  listeners.forEach((l) => l());
}

// A random game still without a star, or "win" once every game has one.
function pickNext(stars: Record<Game, boolean>): Current {
  const open = GAMES.filter((g) => !stars[g]);
  if (open.length === 0) return "win";
  return open[Math.floor(Math.random() * open.length)];
}

// "pass": the puzzle doesn't care about this click — the divider handles it.
export type Guess = "right" | "wrong" | "pass";

// A click on a divider; `game` is undefined for rows that aren't any game.
export function guess(game?: Game): Guess {
  const s = getSnapshot();
  if (s.current === "win") return "pass";
  if (game === s.current) {
    const stars = { ...s.stars, [game]: true };
    write({ stars, current: pickNext(stars) });
    return "right";
  }
  if (!inGame(s)) return "pass";
  write({ stars: noStars(), current: s.current });
  return "wrong";
}
