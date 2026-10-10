"use server";

import { revalidatePath } from "next/cache";
import { EXPIRED, requireAdmin } from "@/lib/admin-auth";
import { siteOriginFromHeaders } from "@/lib/site-origin";
import {
  createTrackingLink,
  findTrackingLink,
  isAllowedDestination,
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
  const admin = await requireAdmin();
  if (!admin) return { error: EXPIRED };

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
    createdBy: admin.name,
  });
  revalidatePath(PATH);
  return { created: { link, shortUrl: shortUrl(origin, link.slug) } };
}
