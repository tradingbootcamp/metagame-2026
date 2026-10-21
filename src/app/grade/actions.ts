"use server";

import { revalidatePath, updateTag } from "next/cache";
import {
  checkPassword,
  endAccess,
  gradeAccess,
  readSession,
  startSession,
} from "@/lib/grader-auth";
import { SOMEONE_ELSE } from "@/lib/grader-identity";
import {
  assignNewShepherd,
  DECISION_FIELDS,
  GRADER_FIELD,
  listSubmissions,
  NEXT_STEPS_FIELD,
  resolveEditableFields,
  resolveGraderNames,
  sanitizeGrades,
  saveGrades,
  SCHEMA_TAG,
  submissionTag,
  SHEPHERD_FIELD,
  VERDICT_FIELD,
} from "@/lib/rfp-rubric";

export type FormState = { error?: string };

/** The only columns the overview's row dropdowns may write. */
const INLINE_FIELDS: string[] = [
  GRADER_FIELD,
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
  if (name === SOMEONE_ELSE) {
    await startSession({ kind: "anon" });
  } else {
    // Resolve against the roster so the cookie can't carry an arbitrary identity.
    const roster = await resolveGraderNames(await listSubmissions());
    if (!roster.includes(name)) {
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

/**
 * One-field save from the overview. Allow-listed to the pipeline columns, so
 * this can't be used to write anything else from a list row.
 */
export async function setOverviewField(
  recordId: string,
  field: string,
  value: string,
): Promise<{ error?: string }> {
  if (!(await gradeAccess())?.identity)
    return { error: "Your session expired." };
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

  updateTag(submissionTag(recordId));
  // Deliberately not revalidating /grade: re-sorting the list under the cursor
  // mid-edit is worse than it being one refresh stale.
  revalidatePath(`/grade/${recordId}`);
  return {};
}

/**
 * Assign a shepherd by name from the overview, adding them to the Shepherd
 * options if they aren't there yet. Returns the name as Airtable now spells it.
 */
export async function addShepherd(
  recordId: string,
  rawName: string,
): Promise<{ name?: string; error?: string }> {
  if (!(await gradeAccess())?.identity)
    return { error: "Your session expired." };

  const name = rawName.replace(/\s+/g, " ").trim();
  if (!name || name.length > 60) return { error: "Enter a name." };

  const [shepherd] = await resolveEditableFields(
    DECISION_FIELDS.filter((f) => f.field === SHEPHERD_FIELD),
  );
  // Reuse an existing option rather than minting a near-duplicate.
  const existing = shepherd?.options.find(
    (o) => o.toLowerCase() === name.toLowerCase(),
  );

  try {
    if (existing) await saveGrades(recordId, { [SHEPHERD_FIELD]: existing });
    else await assignNewShepherd(recordId, name);
  } catch (err) {
    console.error("[grade] adding shepherd failed:", err);
    return { error: "Airtable rejected the new shepherd." };
  }

  updateTag(SCHEMA_TAG);
  updateTag(submissionTag(recordId));
  revalidatePath(`/grade/${recordId}`);
  return { name: existing ?? name };
}

export type SaveState = { savedAt?: number; error?: string };

export async function submitGrades(
  recordId: string,
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!(await gradeAccess())?.identity)
    return { error: "Your session expired." };

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

  updateTag(submissionTag(recordId));
  revalidatePath("/grade");
  revalidatePath(`/grade/${recordId}`);
  return { savedAt: Date.now() };
}
