"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { can } from "@/lib/access";
import { durationMinutes } from "@/lib/rfp-fields";
import {
  getRfpSession,
  placeRfpSession,
  unplaceRfpSession,
} from "@/lib/rfp-sessions";
import { DEFAULT_DRAFT_MINUTES, END_GAP_MINUTES } from "@/lib/schedule";
import { explainDbError, moveSessionTo } from "@/lib/schedule-store";
import { PANE_COOKIE } from "./pane";

export type Result = { error?: string };

const PATH = "/backstage/speaker-committee";
const EXPIRED = "Your session expired. Reload.";

export async function setSchedulePane(on: boolean): Promise<void> {
  const store = await cookies();
  if (on) {
    store.set(PANE_COOKIE, "1", {
      path: PATH,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  } else {
    store.delete({ name: PANE_COOKIE, path: PATH });
  }
  revalidatePath(PATH, "layout");
}

/**
 * Drops a proposal on the grid: places its session for the length the host
 * asked for and moves it to ready.
 */
export async function scheduleProposal(
  sessionId: string,
  startsAt: string,
  locationId: string | null,
): Promise<Result> {
  if (!(await can("schedule.manage"))) return { error: EXPIRED };
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return { error: "That time is invalid." };

  const rfpSession = await getRfpSession(sessionId);
  if (!rfpSession) return { error: "Couldn’t load that proposal." };
  const minutes =
    durationMinutes(rfpSession.row.requestedDuration) ??
    DEFAULT_DRAFT_MINUTES - END_GAP_MINUTES;

  try {
    await placeRfpSession(
      sessionId,
      start,
      new Date(start.getTime() + minutes * 60_000),
      locationId,
    );
  } catch (err) {
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return {};
}

/** Moves a session already on the grid; its phase doesn't change. */
export async function moveScheduled(
  sessionId: string,
  startsAt: string,
  locationId: string | null,
): Promise<Result> {
  if (!(await can("schedule.manage"))) return { error: EXPIRED };
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return { error: "That time is invalid." };
  try {
    await moveSessionTo(sessionId, start, locationId);
  } catch (err) {
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return {};
}

/** Takes a session off the grid; a ready proposal goes back to "Add to schedule". */
export async function unschedule(sessionId: string): Promise<Result> {
  if (!(await can("schedule.manage"))) return { error: EXPIRED };
  try {
    await unplaceRfpSession(sessionId);
  } catch (err) {
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return {};
}
