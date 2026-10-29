import {
  buildDestinationUrl,
  isAllowedDestination,
  shortUrl,
  validateSlug,
  type TrackingLink,
} from "@/lib/tracking-links";

export const POSTER_ORIGIN = "https://metagame.games";
export const GENERIC_AREA = "generic";
export const GENERIC_PLACEMENT = "Generic poster";
// The Generic poster link's slug, for the static /poster page, which can't wait
// on the catalog. The generator still discovers it from the tracking links.
export const GENERIC_POSTER_SLUG = "poster";
export type PosterTracking = {
  qrUrl: string;
  placement: string;
  destination: string;
  redirectUrl: string;
};
export type PosterOption = {
  value: string;
  label: string;
  available: boolean;
  tracking: PosterTracking | null;
};
export type PosterChoice = PosterOption & {
  slug: string | null;
  placement: string;
};

// Personal poster links that share the poster/print tags but aren't for
// general use. Their rows stay untouched so already-printed codes keep working.
const HIDDEN_SLUGS = new Set(["carina", "spire"]);
const key = (value: string) => value.trim().toLowerCase();

/** A poster/print/metagame-2026 homepage link; `placement` also requires that area. */
export function isPosterLink(link: TrackingLink, placement?: string): boolean {
  if (
    !link.active ||
    link.template ||
    validateSlug(link.slug) ||
    link.source !== "poster" ||
    link.medium !== "print" ||
    link.campaign !== "metagame-2026" ||
    !link.placement.trim() ||
    (placement !== undefined && key(link.placement) !== key(placement)) ||
    !isAllowedDestination(link.destination, POSTER_ORIGIN)
  )
    return false;
  const destination = new URL(link.destination);
  // Poster attribution must not inherit person/venue-specific query parameters.
  return (
    destination.pathname === "/" &&
    !destination.search &&
    ["", "#tickets"].includes(destination.hash)
  );
}

/** One choice per poster-link placement, Generic first, then alphabetical. */
export function posterChoices(links: TrackingLink[]): PosterChoice[] {
  const byPlacement = new Map<string, TrackingLink[]>();
  for (const link of links.filter(
    (link) => isPosterLink(link) && !HIDDEN_SLUGS.has(key(link.slug)),
  )) {
    const group = byPlacement.get(key(link.placement)) ?? [];
    group.push(link);
    byPlacement.set(key(link.placement), group);
  }
  return [...byPlacement.values()]
    .map((group) => {
      const placement = group[0].placement.trim();
      const generic = key(placement) === key(GENERIC_PLACEMENT);
      const link = group.length === 1 ? group[0] : null;
      // Duplicate slugs make /go's first-record lookup ambiguous, even if only
      // one of those records matches this area.
      const unique =
        link &&
        links.filter((other) => key(other.slug) === key(link.slug)).length ===
          1;
      return {
        value: generic ? GENERIC_AREA : `area:${placement}`,
        label: placement,
        placement,
        available: !!unique,
        slug: unique ? link.slug : null,
        tracking: unique
          ? {
              qrUrl: shortUrl(POSTER_ORIGIN, link.slug),
              placement: link.placement,
              destination: link.destination,
              redirectUrl: buildDestinationUrl(link),
            }
          : null,
      };
    })
    .sort(
      (a, b) =>
        Number(b.value === GENERIC_AREA) - Number(a.value === GENERIC_AREA) ||
        a.label.localeCompare(b.label, "en"),
    );
}
