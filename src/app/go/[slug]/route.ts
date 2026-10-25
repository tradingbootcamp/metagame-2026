import { NextResponse } from "next/server";
import {
  buildDestinationUrl,
  isAllowedDestination,
  PROMO_PARAM,
  promoCode,
  resolveTrackingLink,
} from "@/lib/tracking-links";
import { siteOrigin } from "@/lib/site-origin";

export const runtime = "nodejs";

const redirect = (to: string) =>
  NextResponse.redirect(to, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const origin = siteOrigin(request);
  const slug = (await params).slug.toLowerCase();
  const promo = promoCode(new URL(request.url).searchParams.get(PROMO_PARAM));

  let target = origin + "/";
  try {
    const link = await resolveTrackingLink(slug);
    if (link && isAllowedDestination(link.destination, origin)) {
      target = link.active ? buildDestinationUrl(link) : link.destination;
    }
  } catch (err) {
    console.error(`[go] lookup failed for ${slug}:`, err);
  }
  if (promo) {
    const url = new URL(target);
    url.searchParams.set(PROMO_PARAM, promo);
    target = url.toString();
  }
  return redirect(target);
}
