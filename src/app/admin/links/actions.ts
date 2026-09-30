"use server";

import { revalidatePath } from "next/cache";
import {
  checkPassword,
  endSession,
  readSession,
  startSession,
} from "@/lib/admin-auth";
import { siteOriginFromHeaders } from "@/lib/site-origin";
import {
  createTrackingLink,
  findTrackingLink,
  isAllowedDestination,
  listTrackingLinks,
  loadLinkOptions,
  normalizeSlug,
  OPEN_SELECTS,
  snapToOption,
  UTM_SELECT_FIELDS,
  UTM_VALUE_MAX,
  shortUrl,
  validateSlug,
  type TrackingLink,
  type UtmSelectField,
} from "@/lib/tracking-links";

const PATH = "/admin/links";

export type FormState = { error?: string };

export async function unlock(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!checkPassword(String(formData.get("password") ?? ""))) {
    return { error: "Wrong password." };
  }
  await startSession(null);
  revalidatePath(PATH);
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
  revalidatePath(PATH);
  return {};
}

export async function signOut(): Promise<void> {
  await endSession();
  revalidatePath(PATH);
}

export type CreateState = {
  error?: string;
  /** Field the error belongs to, when it's one field's fault. */
  field?: string;
  created?: { link: TrackingLink; shortUrl: string };
};

const str = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

export async function createLink(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const session = await readSession();
  if (!session?.identity) return { error: "Your session expired. Reload." };

  const origin = await siteOriginFromHeaders();

  const destination = str(formData, "destination");
  if (!isAllowedDestination(destination, origin)) {
    return {
      field: "destination",
      error: `Destination must be an https link on ${new URL(origin).host}.`,
    };
  }

  const options = await loadLinkOptions();
  const utm = {} as Record<UtmSelectField, string>;
  for (const field of UTM_SELECT_FIELDS) {
    const value = snapToOption(str(formData, field), options[field]);
    if (!value) return { field, error: "Required." };
    if (value.length > UTM_VALUE_MAX)
      return { field, error: `At most ${UTM_VALUE_MAX} characters.` };
    if (!OPEN_SELECTS.has(field) && !options[field].includes(value)) {
      return { field, error: `Pick a ${field} from the list.` };
    }
    utm[field] = value;
  }

  const slug = normalizeSlug(str(formData, "slug"));
  if (!slug) return { field: "slug", error: "Required." };
  const slugProblem = validateSlug(slug);
  if (slugProblem) return { field: "slug", error: slugProblem };
  if (await findTrackingLink(slug)) {
    return { field: "slug", error: "That short name is already taken." };
  }

  const link = await createTrackingLink({
    slug,
    destination,
    ...utm,
    internalName: str(formData, "internalName").slice(0, 120),
    createdBy: session.identity.name,
  });
  revalidatePath(PATH);
  return { created: { link, shortUrl: shortUrl(origin, link.slug) } };
}
