"use server";

import { revalidatePath, updateTag } from "next/cache";
import { adminSession, signOutAccount } from "@/lib/auth";
import {
  durationMinutes,
  NEXT_STEPS_DONE,
  NEXT_STEPS_FIELD,
  NEXT_STEPS_SCHEDULE,
} from "@/lib/rfp-fields";
import { getSubmission, saveGrades, submissionTag } from "@/lib/rfp-rubric";
import {
  DEFAULT_DRAFT_MINUTES,
  END_GAP_MINUTES,
  type Ages,
  type Category,
} from "@/lib/schedule";
import {
  explainDbError,
  findAccount,
  moveSessionTo,
  placeRfpSession,
  unplaceSession,
} from "@/lib/schedule-store";

export type Result = { error?: string };

const PATH = "/speaker_committee";
const EXPIRED = "Your session expired. Reload.";

export async function signOut(): Promise<void> {
  await signOutAccount();
  revalidatePath(PATH);
}

async function setStep(recordId: string, step: string): Promise<void> {
  await saveGrades(recordId, { [NEXT_STEPS_FIELD]: step });
  updateTag(submissionTag(recordId));
}

const text = (v: unknown) => {
  const s = Array.isArray(v) ? v.join(", ") : v;
  return typeof s === "string" && s.trim() ? s.trim() : null;
};

const count = (v: unknown) => {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

// The RFP's Category and Age are the host's words; these only seed the draft,
// which /admin/schedule can correct.
function categoryOf(v: unknown): Category | null {
  const s = text(v)?.toLowerCase() ?? "";
  if (!s) return null;
  if (/workshop|class|hands.on/.test(s)) return "workshop";
  if (/talk|lecture|panel|presentation/.test(s)) return "talk";
  if (/game|play/.test(s)) return "game";
  return "other";
}

function agesOf(v: unknown): Ages | null {
  const s = text(v)?.toLowerCase() ?? "";
  if (/18|adult|mature/.test(s)) return "adults";
  if (/kid|child/.test(s)) return "kids";
  if (/all|any|family/.test(s)) return "all";
  return null;
}

/**
 * Drops a proposal on the grid: places the session made from it (making a
 * draft one the first time) and moves its Next steps to done.
 */
export async function scheduleProposal(
  recordId: string,
  startsAt: string,
  locationId: string | null,
): Promise<Result> {
  if (!(await adminSession())) return { error: EXPIRED };
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return { error: "That time is invalid." };

  const submission = await getSubmission(recordId).catch(() => null);
  if (!submission) return { error: "Couldn’t load that proposal." };
  const { fields } = submission;

  const minutes =
    durationMinutes(fields.Duration) ?? DEFAULT_DRAFT_MINUTES - END_GAP_MINUTES;
  const email = text(fields["Email (host)"]);
  const max = count(fields["Maximum size"]) || null;
  const min = count(fields["Minimum size"]);

  try {
    const host = email ? await findAccount(email) : null;
    await placeRfpSession({
      recordId,
      startsAt: start,
      endsAt: new Date(start.getTime() + minutes * 60_000),
      locationId,
      draft: {
        title: submission.title,
        description: text(fields.Description),
        category: categoryOf(fields.Category),
        ages: agesOf(fields.Age),
        maxCapacity: max,
        minCapacity: min !== null && max !== null && min > max ? null : min,
        needs: text(fields["Space needs"]),
        hostIds: host ? [host.userId] : [],
      },
    });
  } catch (err) {
    return explainDbError(err);
  }

  revalidatePath(PATH);
  try {
    await setStep(recordId, NEXT_STEPS_DONE);
  } catch (err) {
    console.error("[speaker_committee] next steps save failed:", err);
    return {
      error:
        "Placed it, but Airtable didn’t take the Next steps change. Set it on the row.",
    };
  }
  return {};
}

/** Moves a session already on the grid; its Next steps doesn't change. */
export async function moveScheduled(
  sessionId: string,
  startsAt: string,
  locationId: string | null,
): Promise<Result> {
  if (!(await adminSession())) return { error: EXPIRED };
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

/** Takes a session off the grid and its proposal back to "Add to schedule". */
export async function unschedule(sessionId: string): Promise<Result> {
  if (!(await adminSession())) return { error: EXPIRED };
  let recordId: string | null;
  try {
    recordId = await unplaceSession(sessionId);
  } catch (err) {
    return explainDbError(err);
  }

  revalidatePath(PATH);
  if (!recordId) return {};
  try {
    await setStep(recordId, NEXT_STEPS_SCHEDULE);
  } catch (err) {
    console.error("[speaker_committee] next steps save failed:", err);
    return {
      error:
        "Took it off the grid, but Airtable didn’t take the Next steps change.",
    };
  }
  return {};
}
