"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  formToBody,
  GRADE_FORM_SESSION_KEYS,
  isEmptyGrade,
  normalizeText,
  parseGrade,
} from "@/lib/grade-input";
import { can } from "@/lib/access";
import { signOutAccount } from "@/lib/auth";
import { pickerAccounts, pickGrader } from "@/lib/grader-pick";
import {
  fromLabel,
  MEGAGAME_INTEGRATION_LABELS,
  NEXT_STEPS_PHASE,
  SPEAKER_TIER_LABELS,
  VERDICT_LABELS,
} from "@/lib/rfp-labels";
import { PIPELINE_FIELDS, toRow, type PipelineField } from "@/lib/rfp-pipeline";
import { loadedKey, MARKETING_CONSENT_FIELD } from "@/lib/rfp-rubric";
import {
  committeeUserId,
  getRfpSession,
  saveGrade,
  spaceOptionLocations,
  updateRfpSession,
  type Account,
  type RfpSession,
} from "@/lib/rfp-sessions";
import { explainDbError } from "@/lib/schedule-store";

const COMMITTEE_PATH = "/backstage/speaker-committee";

// Redirect rather than re-render: this request still carries the session
// cookie, so a re-render would still read as signed in.
export async function signOut(): Promise<void> {
  await signOutAccount();
  redirect("/grade");
}

/** The account behind a committee name, or the error to show. */
async function committeeAccount(
  name: string,
): Promise<{ userId: string } | { error: string }> {
  const userId = await committeeUserId(name);
  return userId
    ? { userId }
    : { error: `${name} has no account yet, so they can't be assigned.` };
}

export type PipelineResult = {
  error?: string;
  /** The column's label as now stored, which may differ from what was picked. */
  value?: string | null;
  /** The account behind `value`, for the pickers; null when nobody's. */
  valueId?: string | null;
  /** Why the stored value isn't the one picked. */
  note?: string;
};

/**
 * One-column save from the overview's row dropdowns. The value is the option
 * label as the column shows it; blank clears. Returns the label as stored,
 * since a pick can resolve to a different step or grader.
 */
export async function setPipelineField(
  sessionId: string,
  field: PipelineField,
  value: string,
): Promise<PipelineResult> {
  if (!(await can("submissions.grade")))
    return { error: "Your session expired." };
  if (!PIPELINE_FIELDS.includes(field)) {
    return { error: "That field isn't editable here." };
  }
  const before = await getRfpSession(sessionId);
  if (!before) return { error: "That session no longer exists." };

  let note: string | undefined;
  let after: RfpSession | null | undefined;
  try {
    switch (field) {
      case "verdict": {
        const verdict = value ? fromLabel(VERDICT_LABELS, value) : null;
        if (value && !verdict) return { error: "Unrecognised value." };
        await updateRfpSession(sessionId, { verdict });
        break;
      }
      case "speakerTier": {
        const speakerTier = value
          ? fromLabel(SPEAKER_TIER_LABELS, value)
          : null;
        if (value && !speakerTier) return { error: "Unrecognised value." };
        await updateRfpSession(sessionId, { speakerTier });
        break;
      }
      case "megagameIntegration": {
        const level = value
          ? fromLabel(MEGAGAME_INTEGRATION_LABELS, value)
          : null;
        if (value && !level) return { error: "Unrecognised value." };
        await updateRfpSession(sessionId, { megagameIntegrationLevel: level });
        break;
      }
      case "nextSteps": {
        if (value && !Object.hasOwn(NEXT_STEPS_PHASE, value)) {
          return { error: "Unrecognised value." };
        }
        let phase = value ? NEXT_STEPS_PHASE[value] : null;
        // Only imported proposals survive without a phase; anything else
        // would drop out of the pipeline pages.
        if (phase === null && before.recordId === null) {
          return { error: "This session has no RFP row; pick a step." };
        }
        if (phase === "ready" && before.row.startsAt === null) {
          phase = "scheduling";
          note =
            "Not on the schedule yet, so it waits at “6. Add to schedule”.";
        }
        await updateRfpSession(sessionId, { phase });
        break;
      }
      case "shepherd":
        // Any account can shepherd, so the column has its own picker.
        return { error: "Set the shepherd from its picker." };
      case "grader": {
        // One select over possibly several grade rows: a pick replaces the
        // open assignments, and submitted grades are never thrown away.
        let userId: string | null = null;
        if (value) {
          const account = await committeeAccount(value);
          if ("error" in account) return account;
          userId = account.userId;
        }
        ({ after, note } = await pickGrader(sessionId, userId));
        break;
      }
    }
  } catch (err) {
    console.error("[grade] inline save failed:", err);
    return explainDbError(err);
  }

  after ??= await getRfpSession(sessionId);
  // Deliberately not revalidating the committee board: re-sorting the list
  // under the cursor mid-edit is worse than it being one refresh stale.
  revalidatePath(`/grade/${sessionId}`);
  return { value: after ? toRow(after)[field] : null, note };
}

/** Accounts for the shepherd picker: the committee until two characters are typed. */
export async function findShepherds(query: string): Promise<Account[]> {
  if (!(await can("submissions.grade"))) return [];
  return pickerAccounts(query);
}

/** Sets or clears a session's shepherd; any account will do. */
export async function setShepherd(
  sessionId: string,
  userId: string | null,
): Promise<PipelineResult> {
  if (!(await can("submissions.grade")))
    return { error: "Your session expired." };
  if (!(await getRfpSession(sessionId)))
    return { error: "That session no longer exists." };
  try {
    await updateRfpSession(sessionId, { shepherdUserId: userId });
  } catch (err) {
    console.error("[grade] shepherd save failed:", err);
    return explainDbError(err);
  }
  const after = await getRfpSession(sessionId);
  revalidatePath(`/grade/${sessionId}`);
  const row = after ? toRow(after) : null;
  return { value: row?.shepherd ?? null, valueId: row?.shepherdId ?? null };
}

export type SaveState = { savedAt?: number; error?: string };

/** Saves the viewer's own grade, and the shepherd notes the form edits too. */
export async function submitGrades(
  sessionId: string,
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const session = await can("submissions.grade");
  if (!session) return { error: "Your session expired." };
  const userId = session.user.id;

  const body = formToBody(formData);
  // A session column, not part of the grade. The box posts "true" alongside a
  // hidden "false", so ticked means any "true"; it's only written when it
  // differs from what the page loaded.
  const consent = formData.has(MARKETING_CONSENT_FIELD)
    ? formData.getAll(MARKETING_CONSENT_FIELD).includes("true")
    : undefined;
  const loadedConsent = body[loadedKey(MARKETING_CONSENT_FIELD)] === "true";
  delete body[MARKETING_CONSENT_FIELD];
  delete body[loadedKey(MARKETING_CONSENT_FIELD)];
  // The notes are shared by everyone grading the session, so only the ones
  // this form changed are sent; a stale form must not overwrite newer notes.
  for (const key of GRADE_FORM_SESSION_KEYS) {
    const loaded = body[loadedKey(key)];
    delete body[loadedKey(key)];
    if (
      key in body &&
      normalizeText(String(body[key] ?? "")) ===
        normalizeText(String(loaded ?? ""))
    ) {
      delete body[key];
    }
  }
  const spaces = await spaceOptionLocations();
  const grade = parseGrade(
    body,
    spaces.map((s) => s.id),
  );
  if (!grade.ok) return { error: grade.error };

  try {
    const rfpSession = await getRfpSession(sessionId);
    if (!rfpSession) return { error: "That session no longer exists." };
    const submitted = rfpSession.grades.some(
      (g) => g.grader.userId === userId && g.submittedAt !== null,
    );
    if (submitted || !isEmptyGrade(grade.value)) {
      await saveGrade(sessionId, userId, grade.value);
    } else if (Object.keys(grade.value.session).length > 0) {
      // Notes alone, from someone without a submitted grade: no empty grade is
      // submitted, even over an open assignment.
      await updateRfpSession(sessionId, { text: grade.value.session });
    }
    if (consent !== undefined && consent !== loadedConsent) {
      await updateRfpSession(sessionId, { marketingConsent: consent });
    }
  } catch (err) {
    console.error("[grade] failed to save:", err);
    return { error: explainDbError(err).error };
  }

  revalidatePath(COMMITTEE_PATH);
  revalidatePath(`/grade/${sessionId}`);
  return { savedAt: Date.now() };
}
