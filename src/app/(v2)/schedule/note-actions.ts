"use server";

import { can } from "@/lib/access";
import { currentSession } from "@/lib/auth";
import {
  noticeHeadline,
  parseNoticeDoc,
  type NoticeDoc,
} from "@/lib/notice-doc";
import { boardOnDay, pacificDayKey } from "@/lib/schedule";
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
  parseEmoji,
  pickNoteColor,
  REACTIONS_PER_NOTE_MAX,
  type BoardNote,
  type Reaction,
} from "@/lib/unconference";
import {
  createNote,
  createSessionPoster,
  deleteNote,
  distinctEmojiCount,
  moveNote,
  noteAccess,
  noteById,
  reactorsOf,
  recentNoteCount,
  recordNotePost,
  toggleReaction,
  updateSessionPoster,
  updateNote,
} from "@/lib/unconference-store";
import { boardRooms, loadRawSchedule } from "./data";

// No revalidatePath: /schedule reloads the whole schedule, which is far too
// much work behind a drag. The board updates in place from these results.
export type NoteState = {
  error?: string;
  savedAt?: number;
  /** The note as stored, for the board to adopt. */
  note?: BoardNote;
  /** Where the note actually landed, after clamping. */
  position?: { x: number; y: number };
  /** The note that is no longer on the board. */
  removedId?: string;
  /** The note's reaction chips after a toggle. */
  reactions?: Reaction[];
};

const SIGN_IN = "Sign in first.";
const NEEDS_TICKET = "Claim your ticket first, then the board is yours.";
const NOT_YOURS = "That note isn't yours.";
const GONE = "That note is no longer on the board.";
const FAILED = "That didn't save. Try again.";
const BLANK = "Write or draw something first.";

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
 * The account that may rewrite or move an existing note it has standing on:
 * a ticket holder (the author), or the schedule team without one.
 */
async function editor(): Promise<string | NoteState> {
  const session = await currentSession();
  if (!session) return { error: SIGN_IN };
  if (!(await can("unconference.post")) && !(await can("schedule.manage"))) {
    return { error: NEEDS_TICKET };
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
async function target(noteId: string, viewerId: string | null = null) {
  if (!UUID.test(noteId)) return { editor: null, note: null };
  const [editor, note] = await Promise.all([
    noteAccess(noteId),
    noteById(noteId, viewerId),
  ]);
  return { editor, note };
}

type Faces = { sticky: NoticeDoc; poster: NoticeDoc; title: string | null };

/** Both faces checked, and the title worked out from them. */
function parseFaces(sticky: unknown, poster: unknown): Faces | NoteState {
  const s = parseNoticeDoc(sticky, "sticky");
  if ("error" in s) return { error: `Sticky note: ${s.error}` };
  const p = parseNoticeDoc(poster, "poster");
  if ("error" in p) return { error: `Poster: ${p.error}` };
  if (s.doc.items.length === 0 && p.doc.items.length === 0) {
    return { error: BLANK };
  }
  return {
    sticky: s.doc,
    poster: p.doc,
    title: noticeHeadline(s.doc, p.doc),
  };
}

const isFaces = (v: Faces | NoteState): v is Faces => "sticky" in v;

/**
 * Pin a new notice up on one day's board, at a spot the board measured as
 * fractions of itself.
 */
export async function pinNote(
  locationId: string,
  day: string,
  input: {
    sticky: unknown;
    poster: unknown;
    x: number;
    y: number;
    color?: unknown;
  },
): Promise<NoteState> {
  const who = await poster();
  if (typeof who !== "string") return who;

  // The room has to be a board this viewer can see, or the schedule's room
  // visibility would be a suggestion.
  const rooms = await boardRooms();
  const room = rooms.find((r) => r.id === locationId);
  if (!room) return { error: "That board isn't on the schedule." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !boardOnDay(room, day)) {
    return { error: "The board isn't up that day." };
  }
  const faces = parseFaces(input.sticky, input.poster);
  if (!isFaces(faces)) return faces;

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
      day,
      authorUserId: who,
      ...faces,
      color: isNoteColor(input.color)
        ? input.color
        : pickNoteColor(Math.floor(Math.random() * NOTE_COLORS.length)),
      x: input.x,
      y: input.y,
    });
    return { note: boardNote(note, who), savedAt: Date.now() };
  });
}

/**
 * Pin a session poster up: the full-width notice at the session's own time
 * on that day's board, opening the session. The schedule team's alone, and
 * only for a published, placed session on a day the board is up.
 */
export async function pinSessionPoster(
  locationId: string,
  sessionId: string,
): Promise<NoteState> {
  const session = await can("schedule.manage");
  if (!session) {
    return { error: "Only the schedule team can pin a session poster up." };
  }
  if (!UUID.test(sessionId)) return { error: "That session doesn't exist." };

  return act(async () => {
    const linked = await posterSession(locationId, sessionId);
    if (!("day" in linked)) return linked;
    const note = await createSessionPoster({
      locationId,
      sessionId,
      day: linked.day,
      authorUserId: session.user.id,
      title: linked.title,
    });
    return { note: boardNote(note, session.user.id), savedAt: Date.now() };
  });
}

/** The session a poster on `locationId`'s board may stand for, or why not. */
async function posterSession(
  locationId: string,
  sessionId: string,
): Promise<{ day: string; title: string } | NoteState> {
  const [rooms, raw] = await Promise.all([boardRooms(), loadRawSchedule()]);
  const room = rooms.find((r) => r.id === locationId);
  if (!room) return { error: "That board isn't on the schedule." };
  const target = raw.sessions.find((s) => s.id === sessionId);
  if (!target || target.status !== "published") {
    return { error: "Only a published session can have a poster." };
  }
  if (!target.startsAt || !target.endsAt) {
    return { error: "Give the session a time first." };
  }
  const day = pacificDayKey(target.startsAt);
  if (!boardOnDay(room, day)) {
    return { error: "The board isn't up the day that session is on." };
  }
  return { day, title: target.title };
}

/**
 * Redesign a session poster, or point it at another session. The schedule
 * team's, whoever pinned it up. An empty design goes back to the one drawn
 * from the session's own details.
 */
export async function saveSessionPoster(
  noteId: string,
  input: { poster: unknown; sessionId: string },
): Promise<NoteState> {
  const session = await can("schedule.manage");
  if (!session) {
    return { error: "Only the schedule team can change a session poster." };
  }
  if (!UUID.test(noteId) || !UUID.test(input.sessionId)) {
    return { error: GONE };
  }
  const design = parseNoticeDoc(input.poster, "banner");
  if ("error" in design) return { error: `Poster: ${design.error}` };

  return act(async () => {
    const note = await noteById(noteId, session.user.id);
    if (!note) return { error: GONE };
    if (!note.session) return { error: "That isn't a session poster." };
    const linked = await posterSession(note.locationId, input.sessionId);
    if (!("day" in linked)) return linked;
    await updateSessionPoster(noteId, {
      poster: design.doc,
      sessionId: input.sessionId,
      day: linked.day,
      title: linked.title,
    });
    const saved = await noteById(noteId, session.user.id);
    return {
      note: boardNote(saved ?? note, session.user.id),
      savedAt: Date.now(),
    };
  });
}

/** Rewrite a notice's sticky note, poster and paper. The author or the team. */
export async function saveNote(
  noteId: string,
  input: { sticky: unknown; poster: unknown; color?: unknown },
): Promise<NoteState> {
  const who = await editor();
  if (typeof who !== "string") return who;
  const faces = parseFaces(input.sticky, input.poster);
  if (!isFaces(faces)) return faces;

  return act(async () => {
    const { editor, note } = await target(noteId, who);
    if (!note) return { error: GONE };
    if (!canEditNote(editor)) return { error: NOT_YOURS };
    const color = isNoteColor(input.color) ? input.color : note.color;
    await updateNote(noteId, { ...faces, color });
    return {
      note: boardNote((await noteById(noteId, who)) ?? note, who),
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
  const who = await editor();
  if (typeof who !== "string") return who;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { error: "That spot is off the board." };
  }

  return act(async () => {
    const { editor, note } = await target(noteId);
    if (!note) return { error: GONE };
    if (!canMoveNote(editor)) return { error: NOT_YOURS };
    return { position: await moveNote(noteId, { x, y }), savedAt: Date.now() };
  });
}

/** Add or take back one emoji on a notice. Anyone who may post may react. */
export async function reactToNote(
  noteId: string,
  emoji: unknown,
): Promise<NoteState> {
  const who = await poster();
  if (typeof who !== "string") return who;
  const parsed = parseEmoji(emoji);
  if (!parsed) return { error: "That isn't an emoji." };
  if (!UUID.test(noteId)) return { error: GONE };

  return act(async () => {
    const [note, rooms] = await Promise.all([
      noteById(noteId, who),
      boardRooms(),
    ]);
    // A note on a board this viewer can't see is as good as gone.
    if (!note || !rooms.some((r) => r.id === note.locationId)) {
      return { error: GONE };
    }
    const known = note.reactions.some((r) => r.emoji === parsed);
    if (
      !known &&
      (await distinctEmojiCount(noteId)) >= REACTIONS_PER_NOTE_MAX
    ) {
      return { error: "That notice has all the emoji it can hold." };
    }
    const { reactions } = await toggleReaction(noteId, who, parsed);
    return { reactions, savedAt: Date.now() };
  });
}

/**
 * A notice with its poster, for the dialog opening it: the board's listing
 * leaves posters out. Readable by anyone who can see the notice's board.
 */
export async function openNote(noteId: string): Promise<NoteState> {
  if (!UUID.test(noteId)) return { error: GONE };
  const [session, rooms] = await Promise.all([currentSession(), boardRooms()]);
  const who = session?.user.id ?? null;
  const note = await noteById(noteId, who);
  if (!note || !rooms.some((r) => r.id === note.locationId)) {
    return { error: GONE };
  }
  return { note: boardNote(note, who) };
}

/**
 * Who reacted with what, for the poster's "View reactions". Readable by
 * anyone who can see the board the notice is on, as the names already are
 * on the chips' tooltips.
 */
export async function noteReactors(
  noteId: string,
): Promise<{ emoji: string; names: string[] }[]> {
  if (!UUID.test(noteId)) return [];
  const [note, rooms] = await Promise.all([noteById(noteId), boardRooms()]);
  if (!note || !rooms.some((r) => r.id === note.locationId)) return [];
  return reactorsOf(noteId);
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
    // The team takes anything down, ticket or not, including a session
    // poster one of them pinned up (which makes them its author, not
    // "team", in noteEditor's eyes). Everyone else needs the attendee key.
    if (!(await can("schedule.manage")) && !(await can("unconference.post"))) {
      return { error: NEEDS_TICKET };
    }
    await deleteNote(noteId);
    return { removedId: noteId, savedAt: Date.now() };
  });
}
