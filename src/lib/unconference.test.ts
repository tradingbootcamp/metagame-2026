import { describe, expect, it } from "vitest";
import {
  boardEditor,
  boardLattice,
  boardNote,
  canDeleteNote,
  canEditNote,
  clampNotePosition,
  firstFreeSpot,
  isNoteColor,
  noteEditor,
  noteRateWindowExpiry,
  notesInPaintOrder,
  NOTE_BODY_MAX,
  NOTE_COLORS,
  NOTE_RATE_LIMIT,
  overNoteRateLimit,
  parseNoteBody,
  pickNoteColor,
} from "./unconference";

describe("pickNoteColor", () => {
  it("walks the palette and wraps", () => {
    expect(NOTE_COLORS.map((_, i) => pickNoteColor(i))).toEqual([
      ...NOTE_COLORS,
    ]);
    expect(pickNoteColor(NOTE_COLORS.length)).toBe(NOTE_COLORS[0]);
    expect(pickNoteColor(NOTE_COLORS.length + 2)).toBe(NOTE_COLORS[2]);
  });

  it("is deterministic, so the same seed is the same colour", () => {
    expect(pickNoteColor(7)).toBe(pickNoteColor(7));
  });

  it("survives a negative, fractional or nonsense seed", () => {
    expect(pickNoteColor(-1)).toBe(NOTE_COLORS[NOTE_COLORS.length - 1]);
    expect(pickNoteColor(-NOTE_COLORS.length)).toBe(NOTE_COLORS[0]);
    expect(pickNoteColor(2.9)).toBe(NOTE_COLORS[2]);
    expect(pickNoteColor(Number.NaN)).toBe(NOTE_COLORS[0]);
    expect(pickNoteColor(Number.POSITIVE_INFINITY)).toBe(NOTE_COLORS[0]);
  });

  it("only ever returns a colour the enum knows", () => {
    for (let i = -20; i < 20; i++)
      expect(isNoteColor(pickNoteColor(i))).toBe(true);
    expect(isNoteColor("chartreuse")).toBe(false);
    expect(isNoteColor(null)).toBe(false);
  });
});

describe("parseNoteBody", () => {
  it("trims what it keeps", () => {
    expect(parseNoteBody("  lightning chess  ")).toEqual({
      body: "lightning chess",
    });
  });

  it("refuses an empty or blank body", () => {
    expect(parseNoteBody("")).toEqual({ error: "Write something first." });
    expect(parseNoteBody("   \n ")).toEqual({
      error: "Write something first.",
    });
    expect(parseNoteBody(undefined)).toEqual({
      error: "Write something first.",
    });
    expect(parseNoteBody(42)).toEqual({ error: "Write something first." });
  });

  it("caps the length, counting after the trim", () => {
    const max = "x".repeat(NOTE_BODY_MAX);
    expect(parseNoteBody(max)).toEqual({ body: max });
    expect(parseNoteBody(`  ${max}  `)).toEqual({ body: max });
    expect(parseNoteBody(`${max}y`)).toEqual({
      error: `Keep it under ${NOTE_BODY_MAX} characters.`,
    });
  });
});

describe("clampNotePosition", () => {
  it("leaves a position already on the board alone", () => {
    expect(clampNotePosition(0.25, 0.75)).toEqual({ x: 0.25, y: 0.75 });
  });

  it("pins a position outside the board to its edge", () => {
    expect(clampNotePosition(-0.4, 2)).toEqual({ x: 0, y: 1 });
  });

  it("keeps the whole tile on the board, not just its corner", () => {
    const tile = { width: 0.3, height: 0.2 };
    expect(clampNotePosition(1, 1, tile)).toEqual({ x: 0.7, y: 0.8 });
    expect(clampNotePosition(0.5, 0.5, tile)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("flushes a tile bigger than the board against the top left", () => {
    expect(clampNotePosition(0.5, 0.5, { width: 1.4, height: 2 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("treats a missing or unmeasurable coordinate as the origin", () => {
    expect(clampNotePosition(Number.NaN, Number.NaN)).toEqual({ x: 0, y: 0 });
    expect(
      clampNotePosition(0.5, 0.5, { width: Number.NaN, height: Number.NaN }),
    ).toEqual({ x: 0.5, y: 0.5 });
  });
});

describe("notesInPaintOrder", () => {
  const note = (id: string, createdAt: string) => ({ id, createdAt });
  const old = note("old", "2026-06-01T10:00:00.000Z");
  const mid = note("mid", "2026-06-01T11:00:00.000Z");
  const recent = note("new", "2026-06-01T12:00:00.000Z");

  // DELIBERATE INVERSION, not a bug: the board stacks the OLDEST note on top.
  // The list is back to front, so the oldest must come LAST. If you are here
  // because this test failed after you "fixed" the comparator, put it back.
  it("puts the oldest note last, so it paints on top", () => {
    expect(notesInPaintOrder([old, recent, mid]).map((n) => n.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
    expect(notesInPaintOrder([mid, old, recent]).at(-1)).toBe(old);
  });

  it("does not put the newest note on top", () => {
    expect(notesInPaintOrder([old, mid, recent]).at(-1)).not.toBe(recent);
    expect(notesInPaintOrder([old, mid, recent])[0]).toBe(recent);
  });

  it("reads Date and ISO string timestamps the same way", () => {
    const dates = [
      { id: "old", createdAt: new Date(old.createdAt) },
      { id: "new", createdAt: new Date(recent.createdAt) },
    ];
    expect(notesInPaintOrder(dates).map((n) => n.id)).toEqual(["new", "old"]);
  });

  it("breaks a tie on id, so the stack never shuffles", () => {
    const a = note("a", "2026-06-01T10:00:00.000Z");
    const b = note("b", "2026-06-01T10:00:00.000Z");
    expect(notesInPaintOrder([a, b]).map((n) => n.id)).toEqual(["b", "a"]);
    expect(notesInPaintOrder([b, a]).map((n) => n.id)).toEqual(["b", "a"]);
  });

  it("copies rather than sorting the caller's array", () => {
    const input = [old, recent];
    expect(notesInPaintOrder(input)).not.toBe(input);
    expect(input.map((n) => n.id)).toEqual(["old", "new"]);
    expect(notesInPaintOrder([])).toEqual([]);
  });
});

describe("noteEditor", () => {
  it("calls the author the author", () => {
    expect(noteEditor("ana", "ana", false)).toEqual({ via: "author" });
  });

  it("calls someone else's note team-only", () => {
    expect(noteEditor("bo", "ana", true)).toEqual({ via: "team" });
    expect(noteEditor("bo", "ana", false)).toBeNull();
  });

  it("calls an author who is also team 'author', unlike sessionEditor", () => {
    expect(noteEditor("ana", "ana", true)).toEqual({ via: "author" });
  });

  it("refuses the signed out", () => {
    expect(noteEditor(null, "ana", false)).toBeNull();
    expect(noteEditor(null, "ana", true)).toBeNull();
  });

  it("lets the author edit and the team only delete", () => {
    const author = noteEditor("ana", "ana", false);
    const team = noteEditor("bo", "ana", true);
    const stranger = noteEditor("cy", "ana", false);
    expect([canEditNote(author), canDeleteNote(author)]).toEqual([true, true]);
    expect([canEditNote(team), canDeleteNote(team)]).toEqual([false, true]);
    expect([canEditNote(stranger), canDeleteNote(stranger)]).toEqual([
      false,
      false,
    ]);
  });
});

describe("boardNote", () => {
  const stored = {
    id: "n1",
    locationId: "room",
    body: "lightning chess",
    color: "sky" as const,
    x: 0,
    y: 0,
    author: { userId: "ana", name: "Ana" },
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
  };

  // The client is sent names, never account ids: PublicSession ships hosts
  // the same way. If this fails because `author.userId` came back, the board
  // payload has started handing out a name-to-id map for every author.
  it("keeps the author's name and drops their account id", () => {
    const sent = boardNote(stored, "ana");
    expect(sent.author).toEqual({ name: "Ana" });
    expect("userId" in sent.author).toBe(false);
    expect(JSON.stringify(sent)).not.toContain("ana");
  });

  it("says whose note it is instead", () => {
    expect(boardNote(stored, "ana").mine).toBe(true);
    expect(boardNote(stored, "bo").mine).toBe(false);
    expect(boardNote(stored, null).mine).toBe(false);
  });
});

describe("boardEditor", () => {
  const mine = { mine: true };
  const theirs = { mine: false };

  it("reads the same standings as noteEditor, without an id", () => {
    expect(boardEditor(mine, { signedIn: true, isTeam: false })).toEqual({
      via: "author",
    });
    expect(boardEditor(theirs, { signedIn: true, isTeam: true })).toEqual({
      via: "team",
    });
    expect(boardEditor(theirs, { signedIn: true, isTeam: false })).toBeNull();
  });

  it("refuses the signed out, whatever the note says", () => {
    expect(boardEditor(mine, { signedIn: false, isTeam: false })).toBeNull();
    expect(boardEditor(mine, { signedIn: false, isTeam: true })).toBeNull();
  });
});

describe("the posting rate limit", () => {
  it("bites at the limit, not after it", () => {
    expect(overNoteRateLimit(NOTE_RATE_LIMIT - 1)).toBe(false);
    expect(overNoteRateLimit(NOTE_RATE_LIMIT)).toBe(true);
    expect(overNoteRateLimit(0)).toBe(false);
  });

  it("expires a post a window after it was made", () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    expect(noteRateWindowExpiry(now).toISOString()).toBe(
      "2026-06-01T12:10:00.000Z",
    );
  });
});

describe("boardLattice", () => {
  it("counts whole tiles, and never fewer than one", () => {
    expect(boardLattice(300, 1680, 92)).toEqual({ columns: 3, rows: 18 });
    expect(boardLattice(60, 60, 92)).toEqual({ columns: 1, rows: 1 });
    expect(boardLattice(NaN, 0, 92)).toEqual({ columns: 1, rows: 1 });
    expect(boardLattice(300, 300, 0)).toEqual({ columns: 1, rows: 1 });
  });
});

describe("firstFreeSpot", () => {
  // 3 columns x 2 rows of 92px tiles, so the lattice is x 0/0.5/1, y 0/1.
  const board = { width: 300, height: 200, tile: 92 };
  const full = [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 0.5, y: 1 },
    { x: 1, y: 1 },
  ];

  it("fills the first spot of an empty board", () => {
    expect(firstFreeSpot([], board)).toEqual({ x: 0, y: 0 });
  });

  it("reads left to right, then down", () => {
    expect(firstFreeSpot([{ x: 0, y: 0 }], board)).toEqual({ x: 0.5, y: 0 });
    expect(firstFreeSpot(full.slice(0, 3), board)).toEqual({ x: 0, y: 1 });
  });

  it("counts a spot taken when a note's tile would overlap it", () => {
    expect(firstFreeSpot([{ x: 0.04, y: 0.1 }], board)).toEqual({
      x: 0.5,
      y: 0,
    });
  });

  // A note dragged between two spots overlaps both. Rounding it to the
  // nearest one left the other "free" and put the new tile 40px under it.
  it("counts a note between two spots as taking both", () => {
    expect(firstFreeSpot([{ x: 0.25, y: 0 }], board)).toEqual({ x: 1, y: 0 });
  });

  it("fans the overflow into the gaps, never onto an occupied spot", () => {
    const spot = firstFreeSpot(full, board);
    expect(full).not.toContainEqual(spot);
    expect(spot.x).toBeGreaterThan(0);
    expect(spot.x).toBeLessThan(0.5);
  });

  // The oldest note paints on top, so a fanned note placed exactly on an
  // older one is hidden behind it — and on touch there is no drag to free it.
  it("never returns a spot a note already holds, however full the board", () => {
    const taken: { x: number; y: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const spot = firstFreeSpot(taken, board);
      expect(taken).not.toContainEqual(spot);
      taken.push(spot);
    }
  });

  it("nudges the overflow off a board with only one spot", () => {
    const tiny = { width: 60, height: 60, tile: 92 };
    expect(firstFreeSpot([], tiny)).toEqual({ x: 0, y: 0 });
    expect(firstFreeSpot([{ x: 0, y: 0 }], tiny)).not.toEqual({ x: 0, y: 0 });
  });

  it("holds a phone-width board to the two tiles it fits", () => {
    // --board-w is 232px: a third column would overlap the second by 22px.
    const phone = { width: 232, height: 12 * 92, tile: 92 };
    expect(boardLattice(phone.width, phone.height, phone.tile).columns).toBe(2);
    const second = firstFreeSpot([{ x: 0, y: 0 }], phone);
    expect(second).toEqual({ x: 1, y: 0 });
    const third = firstFreeSpot([{ x: 0, y: 0 }, second], phone);
    expect(third.y).toBeGreaterThan(0);
  });
});
