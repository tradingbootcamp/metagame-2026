import { cache } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { can } from "@/lib/access";
import { toolAccess } from "@/lib/admin-auth";
import { publicSchedule, type ScheduleViewer } from "@/lib/schedule";
import { loadSchedule } from "@/lib/schedule-store";

// Pre-launch gate: the team only. canSeeSchedule() for links, prelaunchGate() 404s. Remove at launch.
export async function canSeeSchedule(): Promise<boolean> {
  return !!(await toolAccess("schedule.preview"));
}

export async function prelaunchGate(): Promise<void> {
  await connection();
  if (!(await canSeeSchedule())) notFound();
}

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
