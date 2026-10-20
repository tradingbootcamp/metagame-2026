"use server";

import { revalidatePath } from "next/cache";
import { EXPIRED, requireAdmin } from "@/lib/admin-auth";
import {
  AGES,
  CATEGORIES,
  STATUSES,
  fromPacificWall,
  slugify,
  type Ages,
  type Category,
  type ScheduleAccount,
  type Status,
} from "@/lib/schedule";
import {
  cancelRsvp,
  ensureAccount,
  explainDbError,
  insertSample,
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

function oneOf<T extends string>(
  value: string,
  choices: readonly T[],
): T | null {
  return (choices as readonly string[]).includes(value) ? (value as T) : null;
}

/** A whole number from a text field, null when blank, NaN when not a number. */
function int(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (!raw) return null;
  return /^-?\d+$/.test(raw) ? Number(raw) : Number.NaN;
}

export async function saveSession(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await requireAdmin())) return { error: EXPIRED };

  const title = str(formData, "title");
  if (!title) return { field: "title", error: "Required." };
  const slug = slugify(str(formData, "slug") || title);
  if (!slug) return { field: "slug", error: "Needs a letter or digit." };

  const startRaw = str(formData, "startsAt");
  const endRaw = str(formData, "endsAt");
  const startsAt = startRaw ? fromPacificWall(startRaw) : null;
  const endsAt = endRaw ? fromPacificWall(endRaw) : null;
  if (startRaw && !startsAt) return { field: "startsAt", error: "Not a time." };
  if (endRaw && !endsAt) return { field: "endsAt", error: "Not a time." };
  if (Boolean(startsAt) !== Boolean(endsAt)) {
    return {
      field: startsAt ? "endsAt" : "startsAt",
      error: "Set both times, or neither for an unplaced draft.",
    };
  }
  if (startsAt && endsAt && endsAt <= startsAt) {
    return { field: "endsAt", error: "End must be after start." };
  }

  const maxCapacity = int(formData, "maxCapacity");
  const minCapacity = int(formData, "minCapacity");
  if (Number.isNaN(maxCapacity))
    return { field: "maxCapacity", error: "Whole number." };
  if (Number.isNaN(minCapacity))
    return { field: "minCapacity", error: "Whole number." };

  const status: Status = oneOf(str(formData, "status"), STATUSES) ?? "draft";
  if (status === "published" && !startsAt) {
    return {
      field: "status",
      error: "A published session needs a start and end time.",
    };
  }

  const hostIds = [
    ...new Set(formData.getAll("hostId").map(String).filter(Boolean)),
  ];

  try {
    await upsertSession({
      id: str(formData, "id") || undefined,
      slug,
      title,
      description: optional(formData, "description"),
      category: oneOf<Category>(str(formData, "category"), CATEGORIES),
      startsAt,
      endsAt,
      locationId: optional(formData, "locationId"),
      maxCapacity,
      minCapacity,
      ages: oneOf<Ages>(str(formData, "ages"), AGES),
      needs: optional(formData, "needs"),
      status,
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

  const name = str(formData, "name");
  if (!name) return { field: "name", error: "Required." };
  const capacity = int(formData, "capacity");
  if (Number.isNaN(capacity))
    return { field: "capacity", error: "Whole number." };
  const displayOrder = int(formData, "displayOrder") ?? 100;
  if (Number.isNaN(displayOrder))
    return { field: "displayOrder", error: "Whole number." };

  const thumbnail = optional(formData, "thumbnail");
  if (thumbnail && !thumbnail.startsWith("data:image/"))
    return { field: "thumbnail", error: "Not an image." };

  try {
    await upsertLocation({
      id: str(formData, "id") || undefined,
      name,
      capacity,
      campusLocation: optional(formData, "campusLocation"),
      displayOrder,
      showInSchedule: formData.get("showInSchedule") === "on",
      thumbnail,
    });
  } catch (err) {
    return explainDbError(err);
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteLocation(id: string): Promise<FormState> {
  if (!(await requireAdmin())) return { error: EXPIRED };
  try {
    await removeLocation(id);
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
