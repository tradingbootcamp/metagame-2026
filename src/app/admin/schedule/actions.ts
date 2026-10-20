"use server";

import { revalidatePath } from "next/cache";
import { EXPIRED, requireAdmin } from "@/lib/admin-auth";
import { deleteImage } from "@/lib/blob";
import { ImageUploadError, replaceRoomImages } from "@/lib/room-images";
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
  locationImages,
  removeLocation,
  removeSample,
  removeSession,
  rsvp,
  searchAccounts,
  upsertLocation,
  type RoomImages,
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
  const previous: RoomImages = (id && (await locationImages(id))) || {
    thumbnailUrl: null,
    imageUrl: null,
  };
  // A picked image arrives as both sizes; Remove clears the hidden URL.
  const file = (key: string) => {
    const f = formData.get(key);
    return f instanceof File && f.size > 0 ? f : undefined;
  };
  const thumbnail = file("thumbnailFile");
  const removed =
    !thumbnail &&
    previous.thumbnailUrl !== null &&
    optional(formData, "thumbnailUrl") !== previous.thumbnailUrl;
  const change = thumbnail
    ? { thumbnail, image: file("imageFile") ?? null }
    : removed
      ? { thumbnail: null, image: null }
      : { thumbnail: undefined, image: undefined };

  try {
    await replaceRoomImages(previous, change, async (images) => {
      await upsertLocation({ id, ...parsed.value, ...images });
    });
  } catch (err) {
    if (err instanceof ImageUploadError)
      return { field: "thumbnail", error: err.message };
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteLocation(id: string): Promise<FormState> {
  if (!(await requireAdmin())) return { error: EXPIRED };
  try {
    const images = await removeLocation(id);
    await deleteImage(images?.thumbnailUrl ?? null);
    await deleteImage(images?.imageUrl ?? null);
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
