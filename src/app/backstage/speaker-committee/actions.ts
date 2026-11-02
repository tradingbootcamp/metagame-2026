"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { PipelineResult } from "@/app/grade/actions";
import { can } from "@/lib/access";
import { pickerAccounts, pickGrader } from "@/lib/grader-pick";
import { durationMinutes } from "@/lib/rfp-fields";
import { toRow } from "@/lib/rfp-pipeline";
import {
  getRfpSession,
  placeRfpSession,
  unplaceRfpSession,
  type Account,
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

/** Drops a proposal on the grid for the length the host asked for; the step is untouched. */
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

/** Takes a session off the grid; the step is untouched. */
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

/** Accounts for the grader picker: the committee until two characters are typed. */
export async function findGradeAccounts(query: string): Promise<Account[]> {
  if (!(await can("submissions.grade"))) return [];
  return pickerAccounts(query);
}

/**
 * Sets or clears a session's grader; any account will do. One pick over
 * possibly several grade rows: it replaces the open assignments, and
 * submitted grades are never thrown away.
 */
export async function setGrader(
  sessionId: string,
  userId: string | null,
): Promise<PipelineResult> {
  if (!(await can("submissions.grade"))) return { error: EXPIRED };

  let picked: Awaited<ReturnType<typeof pickGrader>>;
  try {
    picked = await pickGrader(sessionId, userId);
  } catch (err) {
    console.error("[speaker-committee] grader save failed:", err);
    return explainDbError(err);
  }
  if (!picked.after) return { error: "That session no longer exists." };

  // Deliberately not revalidating the board: re-sorting the list under the
  // cursor mid-edit is worse than it being one refresh stale.
  revalidatePath(`/grade/${sessionId}`);
  const row = toRow(picked.after);
  return { value: row.grader, valueId: row.graderId, note: picked.note };
}
