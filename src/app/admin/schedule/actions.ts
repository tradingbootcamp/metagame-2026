"use server";

import { revalidatePath } from "next/cache";
import { EXPIRED, requireAdmin } from "@/lib/admin-auth";
import { deleteImage, uploadImage } from "@/lib/blob";
import { type ScheduleAccount } from "@/lib/schedule";
import {
  parseLocationFields,
  parseSessionFields,
  type Raw,
} from "@/lib/schedule-input";
import {
  cancelRsvp,
  ensureAccount,
  explainDbError,
  insertSample,
  locationThumbnail,
  removeLocation,
  removeSample,
  removeSession,
  rsvp,
  searchAccounts,
  upsertLocation,
  upsertSession,
} from "@/lib/schedule-store";

export type FormState = {
  ok?: boolean;
  error?: string;
  /** Field the error belongs to, when it's one field's fault. */
  field?: string;
};

const PATH = "/admin/schedule";

const str = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

const optional = (formData: FormData, key: string) =>
  str(formData, key) || null;

/** The form's text fields; repeated names (hostId) collapse to one, so read those separately. */
const fields = (formData: FormData): Raw => Object.fromEntries(formData);

export async function saveSession(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await requireAdmin())) return { error: EXPIRED };

  const parsed = parseSessionFields(fields(formData));
  if (!parsed.ok) return { field: parsed.field, error: parsed.error };

  const hostIds = [
    ...new Set(formData.getAll("hostId").map(String).filter(Boolean)),
  ];

  try {
    await upsertSession({
      id: str(formData, "id") || undefined,
      ...parsed.value,
      hostIds,
    });
  } catch (err) {
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function findAccounts(query: string): Promise<ScheduleAccount[]> {
  if (!(await requireAdmin())) return [];
  const q = query.trim();
  return q.length < 2 ? [] : searchAccounts(q);
}

export type NewAccountResult =
  | { account: ScheduleAccount; error?: never }
  | { account?: never; error: string };

/** Links the account with this email, making one if there is none. */
export async function addAccount(
  name: string,
  email: string,
): Promise<NewAccountResult> {
  if (!(await requireAdmin())) return { error: EXPIRED };
  name = name.trim();
  email = email.trim().toLowerCase();
  if (!name) return { error: "Name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "That email doesn't look right." };
  try {
    return { account: await ensureAccount(name, email) };
  } catch (err) {
    return { error: explainDbError(err).error };
  }
}

/** RSVPs someone else, e.g. a walk-up; waitlists them when full. */
export async function addRsvpFor(
  sessionId: string,
  userId: string,
): Promise<FormState> {
  if (!(await requireAdmin())) return { error: EXPIRED };
  try {
    await rsvp(sessionId, userId);
  } catch (err) {
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function removeRsvpFor(
  sessionId: string,
  userId: string,
): Promise<FormState> {
  if (!(await requireAdmin())) return { error: EXPIRED };
  try {
    await cancelRsvp(sessionId, userId);
  } catch (err) {
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteSession(id: string): Promise<FormState> {
  if (!(await requireAdmin())) return { error: EXPIRED };
  try {
    await removeSession(id);
  } catch (err) {
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function saveLocation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await requireAdmin())) return { error: EXPIRED };

  const parsed = parseLocationFields(fields(formData));
  if (!parsed.ok) return { field: parsed.field, error: parsed.error };

  const id = str(formData, "id") || undefined;
  const previous = id ? await locationThumbnail(id) : null;
  // The form can only keep the current image or send a new file.
  let thumbnailUrl =
    optional(formData, "thumbnailUrl") === previous ? previous : null;
  let uploaded: string | null = null;
  const file = formData.get("thumbnailFile");
  if (file instanceof File && file.size > 0) {
    try {
      uploaded = thumbnailUrl = await uploadImage("rooms", file);
    } catch (err) {
      return {
        field: "thumbnail",
        error: err instanceof Error ? err.message : "Upload failed.",
      };
    }
  }

  try {
    await upsertLocation({ id, ...parsed.value, thumbnailUrl });
  } catch (err) {
    await deleteImage(uploaded);
    return explainDbError(err);
  }
  if (previous !== thumbnailUrl) await deleteImage(previous);
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteLocation(id: string): Promise<FormState> {
  if (!(await requireAdmin())) return { error: EXPIRED };
  try {
    await deleteImage(await removeLocation(id));
  } catch (err) {
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return { ok: true };
}

// Sample data only from `next dev`, never a deployed site.
const sampleAllowed = process.env.NODE_ENV === "development";

export async function addSample(): Promise<FormState> {
  if (!(await requireAdmin())) return { error: EXPIRED };
  if (!sampleAllowed) return { error: "Sample data is dev-only." };
  try {
    await insertSample();
  } catch (err) {
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function clearSample(): Promise<FormState> {
  if (!(await requireAdmin())) return { error: EXPIRED };
  if (!sampleAllowed) return { error: "Sample data is dev-only." };
  try {
    await removeSample();
  } catch (err) {
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return { ok: true };
}
