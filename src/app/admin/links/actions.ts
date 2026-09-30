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
  DEFAULT_CAMPAIGN,
  findTrackingLink,
  generateSlug,
  isAllowedDestination,
  MEDIUMS,
  normalizeSlug,
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

  const utm: Record<"source" | "medium" | "campaign" | "placement", string> = {
    source: normalizeUtmValue(str(formData, "source")),
    medium: normalizeUtmValue(str(formData, "medium")),
    campaign: normalizeUtmValue(str(formData, "campaign")) || DEFAULT_CAMPAIGN,
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
  if (!(MEDIUMS as readonly string[]).includes(utm.medium)) {
    return { field: "medium", error: "Pick a medium from the list." };
  }

  let slug = normalizeSlug(str(formData, "slug"));
  if (slug) {
    const problem = validateSlug(slug);
    if (problem) return { field: "slug", error: problem };
    if (await findTrackingLink(slug)) {
      return { field: "slug", error: "That short name is already taken." };
    }
  } else {
    // Generated slugs carry a random suffix, so one retry is plenty.
    for (let attempt = 0; attempt < 3; attempt++) {
      slug = generateSlug(utm.placement || utm.source);
      if (!(await findTrackingLink(slug))) break;
      if (attempt === 2)
        return { error: "Couldn't find a free short name. Try again." };
    }
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
