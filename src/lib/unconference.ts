// The unconference bulletin board's plain data and rules. No database and no
// React imports, so the board component, the server actions and the store all
// read the same constants. Positions are fractions of the board, never pixels:
// the column is 1fr-fluid and its height changes with the day.

/** Mirrors the unconference_note_color pgEnum. */
export const NOTE_COLORS = [
  "butter",
  "rose",
  "sky",
  "mint",
  "tangerine",
  "lilac",
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export const isNoteColor = (value: unknown): value is NoteColor =>
  typeof value === "string" &&
  (NOTE_COLORS as readonly string[]).includes(value);

/** Mirrors the unconference_notes_body_length check constraint. */
export const NOTE_BODY_MAX = 1000;

/** What the board shows on a tile before the overlay gives the whole thing. */
export const NOTE_PREVIEW_MAX = 140;

export type UnconferenceNote = {
  id: string;
  locationId: string;
  body: string;
  color: NoteColor;
  /** Fractions of the board, 0..1, measured from its top left. */
  x: number;
  y: number;
  author: { userId: string; name: string };
  /** ISO strings. */
  createdAt: string;
  updatedAt: string;
};

/**
 * A note as the board's client is sent it: the author's name for the tile,
 * and whether it is the viewer's own, decided on the server. No account id,
 * the way PublicSession ships its hosts without one.
 */
export type BoardNote = Omit<UnconferenceNote, "author"> & {
  author: { name: string };
  mine: boolean;
};

export const boardNote = (
  note: UnconferenceNote,
  viewerId: string | null,
): BoardNote => ({
  ...note,
  author: { name: note.author.name },
  mine: !!viewerId && note.author.userId === viewerId,
});

/**
 * The columns a note's author may change. Separate from the row so no write
 * built from this can move a note between rooms or change its author.
 */
export type NoteFields = { body: string; color: NoteColor };

/**
 * Everything the board's client needs that it can't work out for itself: the
 * notes for every board room on the page, and what this viewer may do. The
 * permissions are recomputed inside every server action; these only decide
 * which affordances are drawn.
 */
export type BoardData = {
  notes: BoardNote[];
  /** Whether there is an account at all, so the board says which key is missing. */
  signedIn: boolean;
  /** Holds unconference.post. */
  canPost: boolean;
  /** Holds schedule.manage, so may take anyone's note down. */
  isTeam: boolean;
};

/**
 * A colour for a new note. Deterministic on purpose: a module every test
 * imports must not reach for Math.random, so the caller supplies the seed
 * (a count of existing notes, a random integer, whatever it has).
 */
export function pickNoteColor(index: number): NoteColor {
  if (!Number.isFinite(index)) return NOTE_COLORS[0];
  const i = Math.trunc(index) % NOTE_COLORS.length;
  return NOTE_COLORS[i < 0 ? i + NOTE_COLORS.length : i];
}

/** The body as it may be stored, or why it can't be. */
export function parseNoteBody(
  value: unknown,
): { body: string } | { error: string } {
  if (typeof value !== "string") return { error: "Write something first." };
  const body = value.trim();
  if (body.length === 0) return { error: "Write something first." };
  if (body.length > NOTE_BODY_MAX) {
    return { error: `Keep it under ${NOTE_BODY_MAX} characters.` };
  }
  return { body };
}

/** The tile's own size, as fractions of the board. */
export type TileSize = { width: number; height: number };

const NO_TILE: TileSize = { width: 0, height: 0 };

const clampFraction = (value: number, size: number): number => {
  if (!Number.isFinite(value)) return 0;
  // A tile wider than the board can only sit flush against the left edge.
  const max = Number.isFinite(size) ? Math.max(0, 1 - Math.max(0, size)) : 1;
  return Math.min(Math.max(value, 0), max);
};

/**
 * x and y pinned inside the board. The tile's size counts: a note is drawn
 * from its top left, so without it a note at x = 1 would hang off the edge.
 */
export function clampNotePosition(
  x: number,
  y: number,
  tile: TileSize = NO_TILE,
): { x: number; y: number } {
  return {
    x: clampFraction(x, tile.width),
    y: clampFraction(y, tile.height),
  };
}

type Pinned = { id: string; createdAt: string | Date };

const at = (value: string | Date): number =>
  (value instanceof Date ? value : new Date(value)).getTime();

/**
 * Notes back to front: the LAST one paints on top. The order is deliberately
 * inverted from the usual convention — the OLDEST note sits on top, so a
 * proposal that has been up all weekend is never buried by a newer one.
 * Do not "fix" this to newest-on-top; unconference.test.ts pins it.
 */
export function notesInPaintOrder<T extends Pinned>(notes: readonly T[]): T[] {
  return [...notes].sort((a, b) => {
    const diff = at(b.createdAt) - at(a.createdAt);
    // Same instant: fall back to the id so the stack never shuffles.
    return diff !== 0 ? diff : a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/**
 * Carries no account id, unlike SessionEditor: the board's client payload has
 * none to carry, and nothing reads an id back off a standing.
 */
export type NoteEditor = { via: "author" | "team" };

/**
 * Who this viewer is to the note, pure so it can be tested without a
 * database. Author wins over team: an author who is also on the team still
 * gets to edit their own note, which `via: "team"` would refuse.
 */
export function noteEditor(
  viewerId: string | null,
  authorId: string,
  isTeam: boolean,
): NoteEditor | null {
  if (!viewerId) return null;
  if (viewerId === authorId) return { via: "author" };
  return isTeam ? { via: "team" } : null;
}

/** The same rule on the client, where a note carries `mine` and no ids. */
export function boardEditor(
  note: { mine: boolean },
  viewer: { signedIn: boolean; isTeam: boolean },
): NoteEditor | null {
  if (!viewer.signedIn) return null;
  if (note.mine) return { via: "author" };
  return viewer.isTeam ? { via: "team" } : null;
}

/** Only the author rewrites or recolours a note. */
export const canEditNote = (editor: NoteEditor | null): boolean =>
  editor?.via === "author";

/** The author or the team takes one down. */
export const canDeleteNote = (editor: NoteEditor | null): boolean =>
  editor !== null;

/** Only the author moves their own note around the board. */
export const canMoveNote = canEditNote;

// Posting is open to every ticket holder, so one account can't paper the
// board faster than this. Enforced in the server action, not the database.
export const NOTE_RATE_LIMIT = 10;
export const NOTE_RATE_WINDOW_MS = 10 * 60 * 1000;

/** Whether `recent` notes in the window is already too many. */
export const overNoteRateLimit = (recent: number): boolean =>
  recent >= NOTE_RATE_LIMIT;

/** When a note pinned up at `now` stops counting towards the limit. */
export const noteRateWindowExpiry = (now: Date): Date =>
  new Date(now.getTime() + NOTE_RATE_WINDOW_MS);

/** How many tile-sized spots across and down a board of this size holds. */
export function boardLattice(
  width: number,
  height: number,
  tile: number,
): { columns: number; rows: number } {
  const across = (span: number) =>
    Number.isFinite(span) && tile > 0
      ? Math.max(1, Math.floor(span / tile))
      : 1;
  return { columns: across(width), rows: across(height) };
}

/** The board as the browser measured it, in pixels. */
export type BoardSize = { width: number; height: number; tile: number };

const EPSILON = 1e-9;

/**
 * Where a note goes when nobody dragged it anywhere: the first spot on a
 * tile-sized lattice whose tile would not overlap a note already up, read
 * left to right then top to bottom. Touch can't drag, so this is the only
 * placement a phone has — a spot that overlapped an older note would be
 * painted over by it and the new note left unreachable.
 */
export function firstFreeSpot(
  taken: readonly { x: number; y: number }[],
  board: BoardSize,
): { x: number; y: number } {
  const { columns, rows } = boardLattice(board.width, board.height, board.tile);
  const tile = Number.isFinite(board.tile) ? Math.max(0, board.tile) : 0;
  // A fraction spans the board minus one tile, so this is how far apart in
  // fractions two tiles have to be to miss each other.
  const clearance = (length: number) => {
    const span = Number.isFinite(length) ? Math.max(0, length - tile) : 0;
    return span > 0 ? Math.min(1, tile / span) : 1;
  };
  const clearX = clearance(board.width);
  const clearY = clearance(board.height);
  const fraction = (i: number, n: number) => (n > 1 ? i / (n - 1) : 0);
  // Tiles only overlap when they overlap on both axes.
  const free = (x: number, y: number) =>
    taken.every(
      (p) =>
        Math.abs(p.x - x) >= clearX - EPSILON ||
        Math.abs(p.y - y) >= clearY - EPSILON,
    );
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = fraction(column, columns);
      const y = fraction(row, rows);
      if (free(x, y)) return { x, y };
    }
  }
  // Nowhere free: fan the overflow into the gaps between the spots rather
  // than onto them, a smaller part of a step in on each wrap. A note placed
  // exactly on an older one is painted over by it — the oldest sits on top —
  // and on touch there is no drag to pull it back out.
  const gapsX = Math.max(1, columns - 1);
  const gapsY = Math.max(1, rows - 1);
  const step = (count: number) => (count > 1 ? 1 / (count - 1) : 1);
  const fanned = (i: number) => {
    const inset = 1 / (Math.floor(i / (gapsX * gapsY)) + 2);
    return {
      x: fraction(i % gapsX, columns) + step(columns) * inset,
      y: fraction(Math.floor(i / gapsX) % gapsY, rows) + step(rows) * inset,
    };
  };
  // Every i fans to a different point, so one of these lands on nothing.
  const n = Math.max(0, taken.length);
  for (let i = n; i <= n + taken.length; i++) {
    const spot = fanned(i);
    if (!taken.some((p) => p.x === spot.x && p.y === spot.y)) return spot;
  }
  return fanned(n);
}
