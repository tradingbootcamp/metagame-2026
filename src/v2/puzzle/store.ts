// The hero puzzle. One of seven games is "current"; its version of the library
// photo is the hero backdrop. Clicking that game's section divider earns it a
// star (hollow, then filled on a second correct pick) and picks a new current
// game; a wrong divider wipes every star but leaves the current game alone.
// Seven filled stars swap the backdrop for the win image.
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
export type Stars = 0 | 1 | 2;
export type Current = Game | "win";
export type PuzzleState = { stars: Record<Game, Stars>; current: Current };

// Boot script failed / JS off: the boot script and the store agree on this.
export const FALLBACK_GAME: Game = "catan";

export const IMAGE_PREFIX = "/images/puzzle/library_";
export const IMAGE_EXT = ".webp";
export const imageFor = (g: Current) => `${IMAGE_PREFIX}${g}${IMAGE_EXT}`;

const zeroStars = (): Record<Game, Stars> =>
  Object.fromEntries(GAMES.map((g) => [g, 0])) as Record<Game, Stars>;

const DEFAULT: PuzzleState = { stars: zeroStars(), current: FALLBACK_GAME };

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
    state = { stars: zeroStars(), current };
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

// A random game still short of two stars — not the one just solved, when
// there's a choice, so the backdrop visibly changes.
function pickNext(stars: Record<Game, Stars>, exclude: Game): Current {
  const open = GAMES.filter((g) => stars[g] < 2);
  if (open.length === 0) return "win";
  const pool = open.filter((g) => g !== exclude);
  const from = pool.length ? pool : open;
  return from[Math.floor(Math.random() * from.length)];
}

export type Guess = "right" | "wrong" | "done";

// A click on a divider that isn't any game (a decoy row): always wrong.
export function miss(): Guess {
  const s = getSnapshot();
  if (s.current === "win") return "done";
  write({ stars: zeroStars(), current: s.current });
  return "wrong";
}

// A click on `game`'s divider.
export function guess(game: Game): Guess {
  const s = getSnapshot();
  if (s.current === "win") return "done";
  if (s.current !== game) return miss();
  const stars = { ...s.stars, [game]: Math.min(2, s.stars[game] + 1) as Stars };
  write({ stars, current: pickNext(stars, game) });
  return "right";
}
