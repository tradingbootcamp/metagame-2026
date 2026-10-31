import { and, asc, count, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { can } from "./access";
import { currentSession } from "./auth";
import {
  clampNotePosition,
  noteEditor,
  noteRateWindowExpiry,
  type NoteColor,
  type NoteEditor,
  type NoteFields,
  type UnconferenceNote,
} from "./unconference";

const { unconferenceNotes, user, verification } = schema;

// Notes are read by anyone who can see the schedule, so the author's email is
// never part of the name; a code sign-in can leave the account name blank.
const authorName = sql<string>`coalesce(nullif(trim(${user.name}), ''), 'Someone')`;

const noteColumns = {
  id: unconferenceNotes.id,
  locationId: unconferenceNotes.locationId,
  body: unconferenceNotes.body,
  color: unconferenceNotes.color,
  x: unconferenceNotes.x,
  y: unconferenceNotes.y,
  authorUserId: unconferenceNotes.authorUserId,
  authorName,
  createdAt: unconferenceNotes.createdAt,
  updatedAt: unconferenceNotes.updatedAt,
};

type NoteRow = {
  id: string;
  locationId: string;
  body: string;
  color: NoteColor;
  x: number;
  y: number;
  authorUserId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
};

const toNote = (row: NoteRow): UnconferenceNote => ({
  id: row.id,
  locationId: row.locationId,
  body: row.body,
  color: row.color,
  x: row.x,
  y: row.y,
  author: { userId: row.authorUserId, name: row.authorName },
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** Every note in these rooms, oldest first. The board restacks for painting. */
export async function listNotesIn(
  locationIds: readonly string[],
): Promise<UnconferenceNote[]> {
  if (locationIds.length === 0) return [];
  const rows = await getDb()
    .select(noteColumns)
    .from(unconferenceNotes)
    .innerJoin(user, eq(user.id, unconferenceNotes.authorUserId))
    .where(inArray(unconferenceNotes.locationId, [...locationIds]))
    .orderBy(asc(unconferenceNotes.createdAt), asc(unconferenceNotes.id));
  return rows.map(toNote);
}

export const listNotes = (locationId: string): Promise<UnconferenceNote[]> =>
  listNotesIn([locationId]);

/**
 * One note as it stands. A partial edit (just the body, just the colour)
 * reads this rather than trusting the client for the other half.
 */
export async function noteById(
  noteId: string,
): Promise<UnconferenceNote | null> {
  const [row] = await getDb()
    .select(noteColumns)
    .from(unconferenceNotes)
    .innerJoin(user, eq(user.id, unconferenceNotes.authorUserId))
    .where(eq(unconferenceNotes.id, noteId))
    .limit(1);
  return row ? toNote(row) : null;
}

export type NewNote = NoteFields & {
  locationId: string;
  authorUserId: string;
  x: number;
  y: number;
};

export async function createNote(note: NewNote): Promise<UnconferenceNote> {
  const db = getDb();
  const { x, y } = clampNotePosition(note.x, note.y);
  const [[row], [who]] = await Promise.all([
    db
      .insert(unconferenceNotes)
      .values({
        locationId: note.locationId,
        authorUserId: note.authorUserId,
        body: note.body,
        color: note.color,
        x,
        y,
      })
      .returning(),
    db
      .select({ authorName })
      .from(user)
      .where(eq(user.id, note.authorUserId))
      .limit(1),
  ]);
  if (!row) throw new Error("That note could not be pinned up.");
  return toNote({ ...row, authorName: who?.authorName ?? "Someone" });
}

/**
 * What the author may rewrite. Names body and colour only, so nothing built
 * from a form can move a note to another room or hand it to someone else.
 */
export async function updateNote(
  noteId: string,
  fields: NoteFields,
): Promise<void> {
  const [updated] = await getDb()
    .update(unconferenceNotes)
    .set({ body: fields.body, color: fields.color })
    .where(eq(unconferenceNotes.id, noteId))
    .returning({ id: unconferenceNotes.id });
  if (!updated) throw new Error("That note is no longer on the board.");
}

/** Position only, clamped: the board's check constraints refuse the rest. */
export async function moveNote(
  noteId: string,
  position: { x: number; y: number },
): Promise<{ x: number; y: number }> {
  const { x, y } = clampNotePosition(position.x, position.y);
  const [updated] = await getDb()
    .update(unconferenceNotes)
    .set({ x, y })
    .where(eq(unconferenceNotes.id, noteId))
    .returning({ id: unconferenceNotes.id });
  if (!updated) throw new Error("That note is no longer on the board.");
  return { x, y };
}

/** True when a note was there to take down. */
export async function deleteNote(noteId: string): Promise<boolean> {
  const [gone] = await getDb()
    .delete(unconferenceNotes)
    .where(eq(unconferenceNotes.id, noteId))
    .returning({ id: unconferenceNotes.id });
  return gone !== undefined;
}

export async function noteAuthorId(noteId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ authorUserId: unconferenceNotes.authorUserId })
    .from(unconferenceNotes)
    .where(eq(unconferenceNotes.id, noteId))
    .limit(1);
  return row?.authorUserId ?? null;
}

/** How this request may change `noteId`, or null. See noteEditor(). */
export async function noteAccess(noteId: string): Promise<NoteEditor | null> {
  const [session, team, authorId] = await Promise.all([
    currentSession(),
    can("schedule.manage"),
    noteAuthorId(noteId),
  ]);
  if (!authorId) return null;
  return noteEditor(session?.user.id ?? null, authorId, !!team);
}

// The posting budget is spent on pinning a note up, not on leaving it up:
// counting live rows would hand it back for every note the author deleted.
// Kept in Better Auth's verification table, like claimTicket's failure cap.
const postLog = (authorUserId: string) => `note-pinned:${authorUserId}`;

/** How many notes this account has pinned up inside the rate-limit window. */
export async function recentNoteCount(
  authorUserId: string,
  now = new Date(),
): Promise<number> {
  const db = getDb();
  const identifier = postLog(authorUserId);
  await db
    .delete(verification)
    .where(
      and(
        eq(verification.identifier, identifier),
        lte(verification.expiresAt, now),
      ),
    );
  const [row] = await db
    .select({ n: count() })
    .from(verification)
    .where(eq(verification.identifier, identifier));
  return row?.n ?? 0;
}

/** Spends one of this account's posts, whatever becomes of the note. */
export async function recordNotePost(
  authorUserId: string,
  now = new Date(),
): Promise<void> {
  await getDb()
    .insert(verification)
    .values({
      id: crypto.randomUUID(),
      identifier: postLog(authorUserId),
      value: "pinned",
      expiresAt: noteRateWindowExpiry(now),
    });
}
