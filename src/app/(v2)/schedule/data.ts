import { cache } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { toolAccess } from "@/lib/admin-auth";
import { publicSchedule } from "@/lib/schedule";
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

export const loadPublicSchedule = cache(async () =>
  publicSchedule(await loadRawSchedule()),
);
