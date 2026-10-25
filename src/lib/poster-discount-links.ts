import "server-only";
import { createHash } from "node:crypto";
import { isPosterLink } from "./poster-options";
import {
  withPosterDiscountParams,
  type PosterDiscounts,
} from "./poster-discount-params";
import {
  findUniqueTrackingLink,
  upsertPosterTrackingLink,
  type NewTrackingLink,
  type TrackingLink,
} from "./tracking-links";

export function posterVariant(
  base: TrackingLink,
  discounts: PosterDiscounts,
  createdBy: string,
): NewTrackingLink {
  if (!isPosterLink(base) || (!discounts.stripe && !discounts.btc))
    throw new Error("Invalid poster variant");
  const destination = withPosterDiscountParams(base.destination, discounts);
  const identity = JSON.stringify([
    base.id,
    base.slug,
    destination,
    base.source,
    base.medium,
    base.campaign,
    base.placement,
  ]);
  const slug = `pp-${createHash("sha256").update(identity).digest("hex").slice(0, 40)}`;
  return {
    slug,
    destination,
    source: base.source,
    medium: base.medium,
    campaign: base.campaign,
    placement: base.placement,
    internalName: `${base.placement} poster discount`.slice(0, 120),
    createdBy,
  };
}

function sameVariant(saved: TrackingLink, wanted: NewTrackingLink): boolean {
  return (
    saved.active &&
    !saved.template &&
    ["slug", "destination", "source", "medium", "campaign", "placement"].every(
      (key) =>
        saved[key as keyof TrackingLink] ===
        wanted[key as keyof NewTrackingLink],
    )
  );
}

export async function ensurePosterDiscountLink(
  base: TrackingLink,
  discounts: PosterDiscounts,
  createdBy: string,
): Promise<TrackingLink> {
  const wanted = posterVariant(base, discounts, createdBy);
  const existing = await findUniqueTrackingLink(wanted.slug);
  if (existing) {
    if (!sameVariant(existing, wanted))
      throw new Error("Poster variant is unavailable");
    return existing;
  }
  await upsertPosterTrackingLink(wanted);
  const saved = await findUniqueTrackingLink(wanted.slug);
  if (!saved || !sameVariant(saved, wanted))
    throw new Error("Poster variant is unavailable");
  return saved;
}
