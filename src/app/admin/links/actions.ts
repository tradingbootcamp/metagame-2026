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
  loadLinkOptions,
  normalizeSlug,
  OPEN_SELECTS,
  UTM_SELECT_FIELDS,
  normalizeUtmValue,
  shortUrl,
  validateSlug,
  validateUtmValue,
  type TrackingLink,
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
  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, 60);
  if (!name) return { error: "Enter your name." };
  await startSession({ name });
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

  const utm = {
    source: normalizeUtmValue(str(formData, "source")),
    medium: normalizeUtmValue(str(formData, "medium")),
    campaign: normalizeUtmValue(str(formData, "campaign")),
    placement: normalizeUtmValue(str(formData, "placement")),
  };
  for (const [field, value] of Object.entries(utm)) {
    if (!value) {
      if (field === "placement") continue;
      return { field, error: "Required." };
    }
    const problem = validateUtmValue(value);
    if (problem) return { field, error: problem };
  }
  const options = await loadLinkOptions();
  for (const field of UTM_SELECT_FIELDS) {
    if (OPEN_SELECTS.has(field)) continue;
    if (!options[field].includes(utm[field])) {
      return { field, error: `Pick a ${field} from the list.` };
    }
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
