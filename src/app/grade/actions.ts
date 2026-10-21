"use server";

import { revalidatePath } from "next/cache";
import {
  formToBody,
  GRADE_FORM_SESSION_KEYS,
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
import { fromLabel, NEXT_STEPS_PHASE, VERDICT_LABELS } from "@/lib/rfp-labels";
import {
  COMMITTEE_NAMES,
  PIPELINE_FIELDS,
  type PipelineField,
} from "@/lib/rfp-pipeline";
import { loadedKey, MARKETING_CONSENT_FIELD } from "@/lib/rfp-rubric";
import {
  assignGrader,
  committeeUserId,
  getRfpSession,
  saveGrade,
  spaceOptionLocations,
  unassignGrader,
  updateRfpSession,
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

/**
 * One-column save from the overview's row dropdowns. The value is the option
 * label as the column shows it; blank clears.
 */
export async function setPipelineField(
  sessionId: string,
  field: PipelineField,
  value: string,
): Promise<{ error?: string }> {
  if (!(await gradeAccess())?.identity)
    return { error: "Your session expired." };
  if (!PIPELINE_FIELDS.includes(field)) {
    return { error: "That field isn't editable here." };
  }

  try {
    switch (field) {
      case "verdict": {
        const verdict = value ? fromLabel(VERDICT_LABELS, value) : null;
        if (value && !verdict) return { error: "Unrecognised value." };
        await updateRfpSession(sessionId, { verdict });
        break;
      }
      case "nextSteps": {
        const phase = value ? NEXT_STEPS_PHASE[value] : null;
        if (value && !phase) return { error: "Unrecognised value." };
        await updateRfpSession(sessionId, { phase: phase ?? null });
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
        // The column shows the attributed grader; changing it reassigns,
        // except a submitted grade is never thrown away.
        const current = (await getRfpSession(sessionId))?.grader ?? null;
        if (!value) {
          if (!current) break;
          if (
            (await unassignGrader(sessionId, current.userId)) === "submitted"
          ) {
            return { error: `${current.name} has already graded this.` };
          }
          break;
        }
        const account = await committeeAccount(value);
        if ("error" in account) return account;
        await assignGrader(sessionId, account.userId);
        if (current && current.userId !== account.userId) {
          await unassignGrader(sessionId, current.userId);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[grade] inline save failed:", err);
    return explainDbError(err);
  }

  // Deliberately not revalidating /grade: re-sorting the list under the cursor
  // mid-edit is worse than it being one refresh stale.
  revalidatePath(`/grade/${sessionId}`);
  return {};
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
  // hidden "false", so ticked means any "true".
  const consent = formData.has(MARKETING_CONSENT_FIELD)
    ? formData.getAll(MARKETING_CONSENT_FIELD).includes("true")
    : undefined;
  delete body[MARKETING_CONSENT_FIELD];
  // The notes are shared by everyone grading the session, so only the ones
  // this form changed are sent; a stale form must not overwrite newer notes.
  for (const key of GRADE_FORM_SESSION_KEYS) {
    const loaded = body[loadedKey(key)];
    delete body[loadedKey(key)];
    if (key in body && String(body[key] ?? "").trim() === String(loaded ?? ""))
      delete body[key];
  }
  const spaces = await spaceOptionLocations();
  const grade = parseGrade(
    body,
    spaces.map((s) => s.id),
  );
  if (!grade.ok) return { error: grade.error };

  try {
    await saveGrade(sessionId, userId, grade.value);
    if (consent !== undefined) {
      await updateRfpSession(sessionId, {
        marketingConsent: consent,
      });
    }
  } catch (err) {
    console.error("[grade] failed to save:", err);
    return { error: explainDbError(err).error };
  }

  revalidatePath("/grade");
  revalidatePath(`/grade/${sessionId}`);
  return { savedAt: Date.now() };
}
