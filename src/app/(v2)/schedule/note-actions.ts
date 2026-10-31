"use server";

import { can } from "@/lib/access";
import { currentSession } from "@/lib/auth";
import { constraintMessage } from "@/lib/schedule-store";
import {
  boardNote,
  canDeleteNote,
  canEditNote,
  canMoveNote,
  isNoteColor,
  NOTE_COLORS,
  NOTE_RATE_LIMIT,
  overNoteRateLimit,
  parseNoteBody,
  pickNoteColor,
  type BoardNote,
} from "@/lib/unconference";
import {
  createNote,
  deleteNote,
  moveNote,
  noteAccess,
  noteById,
  recentNoteCount,
  recordNotePost,
  updateNote,
} from "@/lib/unconference-store";
import { boardRooms } from "./data";

// No revalidatePath: /schedule reloads the whole schedule, which is far too
// much work behind a drag. The board updates in place from these results.
export type NoteState = {
  error?: string;
  /** Which input the error belongs to, when it belongs to one. */
  field?: string;
  savedAt?: number;
  /** The note as stored, for the board to adopt. */
  note?: BoardNote;
  /** Where the note actually landed, after clamping. */
  position?: { x: number; y: number };
  /** The note that is no longer on the board. */
  removedId?: string;
};

const SIGN_IN = "Sign in first.";
const NEEDS_TICKET = "Claim your ticket first, then the board is yours.";
const NOT_YOURS = "That note isn't yours.";
const GONE = "That note is no longer on the board.";
const FAILED = "That didn't save. Try again.";

// Note ids come from the client, so a malformed one is answered here rather
// than let into a uuid comparison the driver would refuse.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The account that may pin notes up, or why it can't. Re-read inside every
 * write: the UI's own gate is never trusted, and a revoked permission or a
 * ban applies from the next action onwards.
 */
async function poster(): Promise<string | NoteState> {
  const session = await can("unconference.post");
  if (!session) {
    return { error: (await currentSession()) ? NEEDS_TICKET : SIGN_IN };
  }
  return session.user.id;
}

/**
 * Anyone with a ticket writes here, so a driver message is logged and never
 * relayed: only the constraint messages, which are written for people, go
 * back to the client.
 */
async function act(run: () => Promise<NoteState>): Promise<NoteState> {
  try {
    return await run();
  } catch (err) {
    console.error("[unconference] note write failed:", err);
    return constraintMessage(err) ?? { error: FAILED };
  }
}

/** The note and this request's standing to change it, read together. */
async function target(noteId: string) {
  if (!UUID.test(noteId)) return { editor: null, note: null };
  const [editor, note] = await Promise.all([
    noteAccess(noteId),
    noteById(noteId),
  ]);
  return { editor, note };
}

/** Pin a new note up, at a spot the board measured as fractions of itself. */
export async function pinNote(
  locationId: string,
  input: { body: unknown; x: number; y: number },
): Promise<NoteState> {
  const who = await poster();
  if (typeof who !== "string") return who;

  // The room has to be a board this viewer can see, or the schedule's room
  // visibility would be a suggestion.
  const rooms = await boardRooms();
  if (!rooms.some((r) => r.id === locationId)) {
    return { error: "That board isn't on the schedule." };
  }
  const parsed = parseNoteBody(input.body);
  if ("error" in parsed) return { field: "body", error: parsed.error };

  return act(async () => {
    // Counted and then inserted, which is not atomic, so two posts at the
    // ceiling can both get through. Same accepted race as claimTicket's.
    if (overNoteRateLimit(await recentNoteCount(who))) {
      return {
        error: `That's ${NOTE_RATE_LIMIT} notes in a few minutes. Give the board a moment.`,
      };
    }
    // Spent on the posting, not on the note: taking the note down again must
    // not hand the budget back, so this is counted before the insert.
    await recordNotePost(who);
    const note = await createNote({
      locationId,
      authorUserId: who,
      body: parsed.body,
      color: pickNoteColor(Math.floor(Math.random() * NOTE_COLORS.length)),
      x: input.x,
      y: input.y,
    });
    return { note: boardNote(note, who), savedAt: Date.now() };
  });
}

/** Rewrite a note's text. The author only. */
export async function rewriteNote(
  noteId: string,
  body: unknown,
): Promise<NoteState> {
  const who = await poster();
  if (typeof who !== "string") return who;
  const parsed = parseNoteBody(body);
  if ("error" in parsed) return { field: "body", error: parsed.error };

  return act(async () => {
    const { editor, note } = await target(noteId);
    if (!note) return { error: GONE };
    if (!canEditNote(editor)) return { error: NOT_YOURS };
    // The colour comes from the stored row, so an edit can't recolour a note
    // by what the client happened to send.
    await updateNote(noteId, { body: parsed.body, color: note.color });
    return {
      note: boardNote((await noteById(noteId)) ?? note, who),
      savedAt: Date.now(),
    };
  });
}

/** Repaint a note from the palette. The author only. */
export async function recolourNote(
  noteId: string,
  color: unknown,
): Promise<NoteState> {
  const who = await poster();
  if (typeof who !== "string") return who;
  if (!isNoteColor(color)) {
    return { field: "color", error: "Pick a colour from the pad." };
  }

  return act(async () => {
    const { editor, note } = await target(noteId);
    if (!note) return { error: GONE };
    if (!canEditNote(editor)) return { error: NOT_YOURS };
    await updateNote(noteId, { body: note.body, color });
    return {
      note: boardNote((await noteById(noteId)) ?? { ...note, color }, who),
      savedAt: Date.now(),
    };
  });
}

/** Move a note. `x`/`y` are fractions of the board; the answer is clamped. */
export async function repinNote(
  noteId: string,
  x: number,
  y: number,
): Promise<NoteState> {
  const who = await poster();
  if (typeof who !== "string") return who;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { field: "position", error: "That spot is off the board." };
  }

  return act(async () => {
    const { editor, note } = await target(noteId);
    if (!note) return { error: GONE };
    if (!canMoveNote(editor)) return { error: NOT_YOURS };
    return { position: await moveNote(noteId, { x, y }), savedAt: Date.now() };
  });
}

/** Take a note down. The author, or the team clearing the board. */
export async function unpinNote(noteId: string): Promise<NoteState> {
  // Standing is settled before anything reaches the database, the way
  // editSessionAccess() is: an unauthenticated caller must not be able to
  // spend queries here, nor to read an answer about a note it names.
  if (!(await currentSession())) return { error: SIGN_IN };
  if (!UUID.test(noteId)) return { error: GONE };

  return act(async () => {
    const { editor, note } = await target(noteId);
    if (!note) return { error: GONE };
    if (!editor || !canDeleteNote(editor)) return { error: NOT_YOURS };
    // A team member clearing the board may hold no ticket, so the attendee
    // permission can't be the only key to it.
    if (editor.via !== "team" && !(await can("unconference.post"))) {
      return { error: NEEDS_TICKET };
    }
    await deleteNote(noteId);
    return { removedId: noteId, savedAt: Date.now() };
  });
}
