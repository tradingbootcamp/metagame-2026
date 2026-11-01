import { cache } from "react";
import { connection } from "next/server";
import { can, teamAccess } from "@/lib/access";
import { toolAccess } from "@/lib/admin-auth";
import { currentSession } from "@/lib/auth";
import { ticketStep } from "@/lib/first-signin";
import {
  publicSchedule,
  viewerSessionIds,
  type PublicLocation,
  type RsvpTicket,
  type ScheduleViewer,
} from "@/lib/schedule";
import { loadSchedule, loadViewerPlans } from "@/lib/schedule-store";
import { emailKey } from "@/lib/ticket-holder";
import {
  hasClaimedTicket,
  ticketLabel,
  ticketsForUser,
} from "@/lib/ticket-store";
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

/** The public sessions the signed-in viewer is in; null when signed out. */
export const loadMySessionIds = cache(async (): Promise<string[] | null> => {
  const account = await currentSession();
  if (!account) return null;
  const [raw, { sessions }, plans] = await Promise.all([
    loadRawSchedule(),
    loadPublicSchedule(),
    loadViewerPlans(account.user.id),
  ]);
  const shown = new Set(sessions.map((s) => s.id));
  return viewerSessionIds(
    account.user.id,
    raw.sessions.filter((s) => shown.has(s.id)),
    plans,
  );
});

/**
 * Whether the signed-in viewer may RSVP, and any ticket bought under their
 * email they could activate first; undefined when signed out. RSVPs need a
 * claimed ticket, but admins can try sessions out without one.
 */
export async function rsvpTicket(): Promise<RsvpTicket | undefined> {
  const account = await currentSession();
  if (!account) return undefined;
  const { id, email: raw } = account.user;
  if ((await hasClaimedTicket(id)) || (await teamAccess())?.admin) {
    return { has: true, claimable: [] };
  }
  const email = emailKey(raw);
  const rows = await ticketsForUser(id, email);
  const step = ticketStep(
    rows.map((t) => ({ ...t, tier: ticketLabel(t.tier) })),
    id,
    email,
  );
  return {
    has: false,
    claimable:
      step.kind === "claimable"
        ? step.tickets.map(({ id, tier }) => ({ id, tier }))
        : [],
  };
}
