import { cache } from "react";
import { connection } from "next/server";
import { can } from "@/lib/access";
import { toolAccess } from "@/lib/admin-auth";
import { currentSession } from "@/lib/auth";
import { publicSchedule, type ScheduleViewer } from "@/lib/schedule";
import { loadSchedule } from "@/lib/schedule-store";

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
