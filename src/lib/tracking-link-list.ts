import type { TrackingLink } from "./tracking-links";

export type TrackingLinkView = "all" | "posters";

export function initialLinkCreator(
  links: TrackingLink[],
  me: string,
  view: TrackingLinkView,
): string {
  return view === "all" && links.some((link) => link.createdBy === me)
    ? me
    : "";
}

export function filterTrackingLinks(
  links: TrackingLink[],
  {
    view,
    creator,
    query,
  }: { view: TrackingLinkView; creator: string; query: string },
): TrackingLink[] {
  const needle = query.trim().toLowerCase();
  return links.filter(
    (link) =>
      (view !== "posters" ||
        (link.source === "poster" &&
          link.medium === "print" &&
          link.campaign === "metagame-2026")) &&
      (!creator || link.createdBy === creator) &&
      (!needle ||
        [
          link.internalName,
          link.slug,
          link.destination,
          link.campaign,
          link.source,
          link.placement,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle)),
  );
}
