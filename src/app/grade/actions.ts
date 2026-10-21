"use server";

import { revalidatePath } from "next/cache";
import {
  formToBody,
  GRADE_FORM_SESSION_KEYS,
  isEmptyGrade,
  normalizeText,
  parseGrade,
} from "@/lib/grade-input";
import {
  checkPassword,
  endAccess,
  gradeAccess,
  graderUserId,
  readSession,
  startSession,
} from "@/lib/grader-auth";
import { SOMEONE_ELSE } from "@/lib/grader-identity";
import {
  COMMITTEE_NAMES,
  fromLabel,
  NEXT_STEPS_PHASE,
  VERDICT_LABELS,
} from "@/lib/rfp-labels";
import {
  committeeLabel,
  PIPELINE_FIELDS,
  toRow,
  type PipelineField,
} from "@/lib/rfp-pipeline";
import { loadedKey, MARKETING_CONSENT_FIELD } from "@/lib/rfp-rubric";
import {
  clearGraders,
  committeeUserId,
  getRfpSession,
  reassignGrader,
  saveGrade,
  spaceOptionLocations,
  updateRfpSession,
  type Account,
} from "@/lib/rfp-sessions";
import { explainDbError } from "@/lib/schedule-store";

export type FormState = { error?: string };

export async function unlock(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!checkPassword(String(formData.get("password") ?? ""))) {
    return { error: "Wrong password." };
  }
  await startSession(null);
  revalidatePath("/grade");
  return {};
}

export async function identify(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await readSession())) return { error: "Your session expired." };

  const name = String(formData.get("grader") ?? "");
  if (name === SOMEONE_ELSE) {
    await startSession({ kind: "anon" });
  } else {
    // Resolve against the roster so the cookie can't carry an arbitrary identity.
    if (!COMMITTEE_NAMES.includes(name)) {
      return { error: "Pick your name from the list." };
    }
    await startSession({ kind: "grader", name });
  }
  revalidatePath("/grade");
  return {};
}

export async function switchGrader(): Promise<void> {
  if (!(await readSession())) return;
  await startSession(null);
  revalidatePath("/grade");
}

export async function signOut(): Promise<void> {
  await endAccess();
  revalidatePath("/grade");
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
  /** Why the stored value isn't the one picked. */
  note?: string;
};

const names = (accounts: Account[]) => accounts.map(committeeLabel).join(", ");

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
  if (!(await gradeAccess())?.identity)
    return { error: "Your session expired." };
  if (!PIPELINE_FIELDS.includes(field)) {
    return { error: "That field isn't editable here." };
  }
  const before = await getRfpSession(sessionId);
  if (!before) return { error: "That session no longer exists." };

  let note: string | undefined;
  try {
    switch (field) {
      case "verdict": {
        const verdict = value ? fromLabel(VERDICT_LABELS, value) : null;
        if (value && !verdict) return { error: "Unrecognised value." };
        await updateRfpSession(sessionId, { verdict });
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
      case "shepherd": {
        if (!value) {
          await updateRfpSession(sessionId, { shepherdUserId: null });
          break;
        }
        const account = await committeeAccount(value);
        if ("error" in account) return account;
        await updateRfpSession(sessionId, { shepherdUserId: account.userId });
        break;
      }
      case "grader": {
        // One select over possibly several grade rows: a pick replaces the
        // open assignments, and submitted grades are never thrown away.
        if (!value) {
          const { submitted } = await clearGraders(sessionId);
          if (submitted.length > 0) {
            note = `${names(submitted)} already graded this; only open assignments were cleared.`;
          }
          break;
        }
        const account = await committeeAccount(value);
        if ("error" in account) return account;
        const { submitted } = await reassignGrader(sessionId, account.userId);
        const others = submitted.filter((a) => a.userId !== account.userId);
        if (others.length > 0) {
          note = `${names(others)} already graded this; ${value} was added as another grader.`;
        }
        break;
      }
    }
  } catch (err) {
    console.error("[grade] inline save failed:", err);
    return explainDbError(err);
  }

  const after = await getRfpSession(sessionId);
  // Deliberately not revalidating /grade: re-sorting the list under the cursor
  // mid-edit is worse than it being one refresh stale.
  revalidatePath(`/grade/${sessionId}`);
  return { value: after ? toRow(after)[field] : null, note };
}

export type SaveState = { savedAt?: number; error?: string };

/** Saves the viewer's own grade, and the shepherd notes the form edits too. */
export async function submitGrades(
  sessionId: string,
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const access = await gradeAccess();
  if (!access?.identity) return { error: "Your session expired." };
  const userId = await graderUserId(access);
  if (!userId) {
    return {
      error:
        access.identity.kind === "grader"
          ? `${access.identity.name} has no account yet. Sign in with your account to grade.`
          : "Sign in with your account to grade; a grade has to be someone's.",
    };
  }

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

  revalidatePath("/grade");
  revalidatePath(`/grade/${sessionId}`);
  return { savedAt: Date.now() };
}
