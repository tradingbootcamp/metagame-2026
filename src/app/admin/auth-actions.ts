"use server";

import { revalidatePath } from "next/cache";
import {
  checkPassword,
  endSession,
  readSession,
  startSession,
} from "@/lib/admin-auth";
import { listTrackingLinks } from "@/lib/tracking-links";

// One session covers every tool under /admin, so sign-in revalidates the
// whole subtree rather than one tool's path.
const refresh = () => revalidatePath("/admin", "layout");

export type FormState = { error?: string };

export async function unlock(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!checkPassword(String(formData.get("password") ?? ""))) {
    return { error: "Wrong password." };
  }
  await startSession(null);
  refresh();
  return {};
}

export async function identify(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await readSession())) return { error: "Your session expired." };
  const typed = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
  if (!typed) return { error: "Enter your name." };
  // "brian" and "Brian" are one person: reuse the spelling already on their links.
  const existing = (await listTrackingLinks()).find(
    (l) => l.createdBy.toLowerCase() === typed.toLowerCase(),
  );
  await startSession({ name: existing?.createdBy ?? typed });
  refresh();
  return {};
}

export async function signOut(): Promise<void> {
  await endSession();
  refresh();
}
