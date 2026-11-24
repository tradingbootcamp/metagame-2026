"use server";

import { revalidatePath } from "next/cache";
import { parseHostSessionFields } from "@/lib/schedule-input";
import {
  CapacityBelowGoingError,
  explainDbError,
  findAccount,
  sessionHostIds,
  setSessionHosts,
  updateSessionAsHost,
} from "@/lib/schedule-store";
import { editSessionAccess } from "@/lib/session-ownership";

export type SaveState = {
  savedAt?: number;
  error?: string;
  field?: string;
  /** What a refused save submitted, since React resets the form regardless. */
  values?: Record<string, string>;
};

const DENIED = "You can't edit this session.";

const HOST_FIELDS = [
  "title",
  "description",
  "category",
  "ages",
  "needs",
  "maxCapacity",
  "minCapacity",
  "rsvpIsCommitment",
];

function revalidate(sessionId: string) {
  revalidatePath(`/account/sessions/${sessionId}`);
  revalidatePath("/account");
  revalidatePath("/schedule");
}

function submittedValues(raw: Record<string, FormDataEntryValue>) {
  return Object.fromEntries(
    HOST_FIELDS.flatMap((name) => {
      const value = raw[name];
      return typeof value === "string" ? [[name, value]] : [];
    }),
  );
}

/** Saves the descriptive fields; placement and status aren't reachable here. */
export async function saveHostSession(
  sessionId: string,
  _prev: SaveState,
  data: FormData,
): Promise<SaveState> {
  const editor = await editSessionAccess(sessionId);
  if (!editor) return { error: DENIED };
  const raw = Object.fromEntries(data.entries());
  const values = submittedValues(raw);
  const fields = parseHostSessionFields(raw);
  if (!fields.ok) return { error: fields.error, field: fields.field, values };
  try {
    await updateSessionAsHost(sessionId, fields.value, {
      allowBelowGoing: editor.via === "team",
    });
  } catch (err) {
    if (err instanceof CapacityBelowGoingError) {
      return { error: err.message, field: "maxCapacity", values };
    }
    console.error("[host-edit] save failed:", err);
    return { ...explainDbError(err), values };
  }
  revalidate(sessionId);
  return { savedAt: Date.now() };
}

/**
 * Adds a co-host by exact email. Deliberately not a search: the account
 * directory isn't a host's to browse, so this confirms one address at a time
 * and never lists anyone.
 */
export async function addCohost(
  sessionId: string,
  _prev: SaveState,
  data: FormData,
): Promise<SaveState> {
  if (!(await editSessionAccess(sessionId))) return { error: DENIED };
  const email = String(data.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) return { error: "An email address.", field: "email" };

  const account = await findAccount(email);
  if (!account) {
    return {
      error: "No account with that email. They need to sign in once first.",
      field: "email",
    };
  }
  const hostIds = await sessionHostIds(sessionId);
  if (hostIds.includes(account.userId)) {
    return { error: "Already a host.", field: "email" };
  }
  try {
    await setSessionHosts(sessionId, [...hostIds, account.userId]);
  } catch (err) {
    console.error("[host-edit] add co-host failed:", err);
    return explainDbError(err);
  }
  revalidate(sessionId);
  return { savedAt: Date.now() };
}

/** Removes a co-host. The last one stays, or nobody could edit the session. */
export async function removeCohost(
  sessionId: string,
  userId: string,
): Promise<SaveState> {
  if (!(await editSessionAccess(sessionId))) return { error: DENIED };
  const hostIds = await sessionHostIds(sessionId);
  if (!hostIds.includes(userId)) return { savedAt: Date.now() };
  if (hostIds.length === 1) {
    return { error: "A session needs at least one host." };
  }
  try {
    await setSessionHosts(
      sessionId,
      hostIds.filter((id) => id !== userId),
    );
  } catch (err) {
    console.error("[host-edit] remove co-host failed:", err);
    return explainDbError(err);
  }
  revalidate(sessionId);
  return { savedAt: Date.now() };
}
