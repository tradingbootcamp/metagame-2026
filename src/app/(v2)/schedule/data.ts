import { cache } from "react";
import { connection } from "next/server";
import { can } from "@/lib/access";
import { toolAccess } from "@/lib/admin-auth";
import { currentSession } from "@/lib/auth";
import {
  publicSchedule,
  type PublicLocation,
  type ScheduleViewer,
} from "@/lib/schedule";
import { loadSchedule } from "@/lib/schedule-store";
import { boardNote, type BoardData } from "@/lib/unconference";
import { listNotesIn } from "@/lib/unconference-store";

// Pre-launch gate: canSeeSchedule() for links, scheduleGate() for the page
// itself. Remove at launch.
export async function canSeeSchedule(): Promise<boolean> {
  return !!(await toolAccess("schedule.preview"));
}

/** Why a viewer isn't getting the schedule, so the page can say which. */
export type ScheduleGate = "ok" | "signed-out" | "closed";

/**
 * The gate as a verdict rather than a 404. "There is a schedule" is no
 * secret, so a viewer who can't see it yet is told why instead of being shown
 * a broken link.
 */
export const scheduleGate = cache(async (): Promise<ScheduleGate> => {
  await connection();
  if (await canSeeSchedule()) return "ok";
  return (await currentSession()) ? "closed" : "signed-out";
});

export const loadRawSchedule = cache(loadSchedule);

/** Which rooms this request may see; whoever edits the schedule sees them all. */
export const scheduleViewer = cache(async (): Promise<ScheduleViewer> => {
  if (await can("schedule.manage")) return "team";
  if (await can("schedule.volunteer_rooms")) return "volunteer";
  return "public";
});

export const loadPublicSchedule = cache(async () =>
  publicSchedule(await loadRawSchedule(), await scheduleViewer()),
);

/** The rooms drawn as bulletin boards, as much as this viewer may see. */
export const boardRooms = cache(async (): Promise<PublicLocation[]> => {
  const { locations } = await loadPublicSchedule();
  return locations.filter((l) => l.layout === "board");
});

/**
 * The unconference notes and what the viewer may do with them, or null when
 * no room this viewer can see is a board.
 *
 * Loaded here rather than in the board component because PublicSchedule is a
 * client component, and because this is the one place that already knows
 * which rooms survived the visibility filter — so notes pinned in a room the
 * viewer can't see are never read, let alone sent.
 */
export const loadBoard = cache(async (): Promise<BoardData | null> => {
  const rooms = await boardRooms();
  if (rooms.length === 0) return null;
  const [notes, session, post, team] = await Promise.all([
    listNotesIn(rooms.map((r) => r.id)),
    currentSession(),
    can("unconference.post"),
    can("schedule.manage"),
  ]);
  const viewerId = session?.user.id ?? null;
  return {
    // Mapped, not sent as read: the client needs the author's name and
    // whether the note is its own, never an account id.
    notes: notes.map((note) => boardNote(note, viewerId)),
    signedIn: !!session,
    canPost: !!post && !session?.user.banned,
    isTeam: !!team,
  };
});
