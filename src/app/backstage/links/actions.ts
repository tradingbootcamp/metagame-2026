"use server";

import { revalidatePath } from "next/cache";
import { EXPIRED, requireAccess } from "@/lib/admin-auth";
import { siteOriginFromHeaders } from "@/lib/site-origin";
import {
  createTrackingLink,
  findTrackingLink,
  loadLinkOptions,
  parseLinkFields,
  shortUrl,
  type TrackingLink,
} from "@/lib/tracking-links";

const PATH = "/backstage/links";

export type CreateState = {
  error?: string;
  /** Field the error belongs to, when it's one field's fault. */
  field?: string;
  created?: { link: TrackingLink; shortUrl: string };
};

export async function createLink(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const admin = await requireAccess("links.manage");
  if (!admin) return { error: EXPIRED };

  const origin = await siteOriginFromHeaders();
  const options = await loadLinkOptions();
  const parsed = parseLinkFields(Object.fromEntries(formData), options, origin);
  if (!parsed.ok) return { field: parsed.field, error: parsed.error };
  const { fields } = parsed;
  if (await findTrackingLink(fields.slug)) {
    return { field: "slug", error: "That short name is already taken." };
  }

  const link = await createTrackingLink({ ...fields, createdBy: admin.name });
  revalidatePath(PATH);
  return { created: { link, shortUrl: shortUrl(origin, link.slug) } };
}
