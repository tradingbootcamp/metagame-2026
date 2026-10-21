import { cache } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { adminAccess } from "@/lib/admin-auth";
import { publicSchedule } from "@/lib/schedule";
import { loadSchedule } from "@/lib/schedule-store";

// Pre-launch gate: admins only, a 404 for everyone else. Remove at launch.
export async function canSeeSchedule(): Promise<boolean> {
  return !!(await adminAccess());
}

export async function prelaunchGate(): Promise<void> {
  await connection();
  if (!(await canSeeSchedule())) notFound();
}

export const loadPublicSchedule = cache(async () =>
  publicSchedule(await loadSchedule()),
);
