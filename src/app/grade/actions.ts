"use server";

import { revalidatePath } from "next/cache";
import {
  checkPassword,
  endSession,
  readSession,
  startSession,
} from "@/lib/grader-auth";
import {
  gradersFrom,
  listSubmissions,
  sanitizeGrades,
  saveGrades,
} from "@/lib/rfp-rubric";

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

  const email = String(formData.get("grader") ?? "");
  // Resolve against the roster so the cookie can't carry an arbitrary identity.
  const grader = gradersFrom(await listSubmissions()).find(
    (g) => g.email === email,
  );
  if (!grader) return { error: "Pick your name from the list." };

  await startSession(grader);
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
