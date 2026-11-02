import { revalidatePath } from "next/cache";
import { authorize, error, json, message, readBody } from "@/lib/admin-api";
import { siteOrigin } from "@/lib/site-origin";
import {
  createTrackingLink,
  findTrackingLink,
  listTrackingLinks,
  loadLinkOptions,
  parseLinkFields,
  shortUrl,
} from "@/lib/tracking-links";

export const dynamic = "force-dynamic";

/** Every short link, newest first, with its /go/ URL. */
export async function GET(request: Request) {
  const access = await authorize("links.manage");
  if (access instanceof Response) return access;
  const origin = siteOrigin(request);
  try {
    const links = await listTrackingLinks();
    return json({
      links: links.map((link) => ({
        ...link,
        shortUrl: shortUrl(origin, link.slug),
      })),
    });
  } catch (err) {
    return airtableFailed(err);
  }
}

/**
 * Creates one link, checked as the /backstage/links form checks it:
 * `{destination, slug, source, medium, placement, campaign?, internalName?}`.
 * UTM values snap to Airtable's spelling; campaign must already be a choice
 * and defaults to the form's. A taken slug's 409 carries the `existing` link.
 */
export async function POST(request: Request) {
  const access = await authorize("links.manage");
  if (access instanceof Response) return access;
  const body = await readBody(request);
  if (body instanceof Response) return body;

  const origin = siteOrigin(request);
  try {
    const options = await loadLinkOptions();
    const parsed = parseLinkFields(body, options, origin);
    if (!parsed.ok) return error(parsed.error, 400, parsed.field);
    const { fields } = parsed;
    const existing = await findTrackingLink(fields.slug);
    if (existing) {
      return json(
        {
          error: "That short name is already taken.",
          field: "slug",
          existing: {
            destination: existing.destination,
            shortUrl: shortUrl(origin, existing.slug),
          },
        },
        409,
      );
    }

    const link = await createTrackingLink({
      ...fields,
      createdBy: access.name,
    });
    revalidatePath("/backstage/links");
    return json(
      {
        slug: link.slug,
        shortUrl: shortUrl(origin, link.slug),
        destination: link.destination,
      },
      201,
    );
  } catch (err) {
    return airtableFailed(err);
  }
}

function airtableFailed(err: unknown): Response {
  console.error("[links api] Airtable call failed:", err);
  return error(message(err), 502);
}
