"use server";

import { revalidatePath } from "next/cache";
import {
  checkPassword,
  endSession,
  readSession,
  startSession,
} from "@/lib/grader-auth";
import {
  listSubmissions,
  NEXT_STEPS_FIELD,
  resolveGraderNames,
  sanitizeGrades,
  saveGrades,
  SHEPHERD_FIELD,
  VERDICT_FIELD,
} from "@/lib/rfp-rubric";

export type FormState = { error?: string };

/** The only columns the overview's row dropdowns may write. */
const INLINE_FIELDS: string[] = [
  VERDICT_FIELD,
  NEXT_STEPS_FIELD,
  SHEPHERD_FIELD,
];

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
  // Resolve against the roster so the cookie can't carry an arbitrary identity.
  const roster = await resolveGraderNames(await listSubmissions());
  if (!roster.includes(name)) return { error: "Pick your name from the list." };

  await startSession({ name });
  revalidatePath("/grade");
  return {};
}

export async function switchGrader(): Promise<void> {
  if (!(await readSession())) return;
  await startSession(null);
  revalidatePath("/grade");
}

export async function signOut(): Promise<void> {
  await endSession();
  revalidatePath("/grade");
}

/**
 * One-field save from the overview. Allow-listed to the pipeline columns, so
 * this can't be used to write anything else from a list row.
 */
export async function setOverviewField(
  recordId: string,
  field: string,
  value: string,
): Promise<{ error?: string }> {
  if (!(await readSession())?.grader) return { error: "Your session expired." };
  if (!INLINE_FIELDS.includes(field)) {
    return { error: "That field isn't editable here." };
  }

  const fields = await sanitizeGrades({ [field]: value });
  if (!(field in fields)) return { error: "Unrecognised value." };

  try {
    await saveGrades(recordId, fields);
  } catch (err) {
    console.error("[grade] inline save failed:", err);
    return { error: "Airtable rejected the change." };
  }

  // Deliberately not revalidating /grade: re-sorting the list under the cursor
  // mid-edit is worse than it being one refresh stale.
  revalidatePath(`/grade/${recordId}`);
  return {};
}

export type SaveState = { savedAt?: number; error?: string };

export async function submitGrades(
  recordId: string,
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!(await readSession())?.grader) return { error: "Your session expired." };

  // Multi-selects arrive as repeated entries (with a leading empty one, so an
  // all-unchecked group still clears the cell); everything else is single.
  const raw: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key).map(String);
    if (key.endsWith("[]")) raw[key.slice(0, -2)] = values.filter(Boolean);
    else raw[key] = values[0] ?? null;
  }

  try {
    await saveGrades(recordId, await sanitizeGrades(raw));
  } catch (err) {
    console.error("[grade] failed to save:", err);
    return { error: "Airtable rejected the save. Try again." };
  }

  revalidatePath("/grade");
  revalidatePath(`/grade/${recordId}`);
  return { savedAt: Date.now() };
}
