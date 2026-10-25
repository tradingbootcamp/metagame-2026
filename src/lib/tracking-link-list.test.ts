import { describe, expect, it } from "vitest";
import { filterTrackingLinks, initialLinkCreator } from "./tracking-link-list";
import type { TrackingLink } from "./tracking-links";

const poster: TrackingLink = {
  id: "poster-row",
  slug: "berkeley",
  destination: "https://metagame.games/",
  source: "poster",
  medium: "print",
  campaign: "metagame-2026",
  placement: "Berkeley",
  internalName: "Berkeley poster",
  createdBy: "Other staff",
  createdAt: "2026-10-20T00:00:00Z",
  active: true,
  template: false,
};
const mine = {
  ...poster,
  id: "my-row",
  slug: "my-link",
  source: "discord",
  createdBy: "Me",
};
const filters = { view: "posters" as const, creator: "", query: "" };

describe("tracking link views", () => {
  it("shows shared poster records without changing the normal creator default", () => {
    const links = [mine, poster];
    expect(initialLinkCreator(links, "Me", "all")).toBe("Me");
    expect(initialLinkCreator(links, "Me", "posters")).toBe("");
    expect(initialLinkCreator(links, "New staff", "all")).toBe("");
    expect(filterTrackingLinks(links, filters)).toEqual([poster]);
  });

  it("honors explicit creator and search filters in the poster view", () => {
    const myPoster = {
      ...poster,
      id: "my-poster",
      createdBy: "Me",
      placement: "Oakland",
      slug: "oakland",
      internalName: "Oakland poster",
    };
    const links = [poster, myPoster];
    expect(filterTrackingLinks(links, { ...filters, creator: "Me" })).toEqual([
      myPoster,
    ]);
    expect(
      filterTrackingLinks(links, {
        ...filters,
        creator: "Me",
        query: "berkeley",
      }),
    ).toEqual([]);
    expect(
      filterTrackingLinks(links, { ...filters, query: " BERKELEY " }),
    ).toEqual([poster]);
  });

  it("includes saved discount destinations and inactive rows for staff inspection", () => {
    const discountPoster = {
      ...poster,
      id: "discount-row",
      slug: "berkeley-discount",
      destination: "https://metagame.games/?promo=EXAMPLE#tickets",
    };
    const inactive = {
      ...poster,
      id: "inactive-row",
      slug: "old-poster",
      active: false,
    };
    expect(filterTrackingLinks([discountPoster, inactive], filters)).toEqual([
      discountPoster,
      inactive,
    ]);
  });

  it.each([
    { source: "discord" },
    { medium: "qr" },
    { campaign: "metagame-2025" },
  ])("excludes unrelated tags from the poster view: %o", (tags) => {
    const other = { ...poster, ...tags };
    expect(filterTrackingLinks([other], filters)).toEqual([]);
    expect(filterTrackingLinks([other], { ...filters, view: "all" })).toEqual([
      other,
    ]);
  });

  it("uses refreshed rows and retains the selected filters", () => {
    const selected = { ...filters, creator: "Other staff", query: "berkeley" };
    expect(filterTrackingLinks([poster], selected)).toEqual([poster]);
    const edited = { ...poster, active: false };
    const added = { ...poster, id: "new-row", slug: "berkeley-new" };
    expect(filterTrackingLinks([added, edited, mine], selected)).toEqual([
      added,
      edited,
    ]);
    expect(filterTrackingLinks([mine], selected)).toEqual([]);
    expect(selected).toEqual({
      view: "posters",
      creator: "Other staff",
      query: "berkeley",
    });
  });

  it("does not hide distinct registry rows that collide on a printed slug", () => {
    const duplicate = { ...poster, id: "duplicate-row" };
    expect(filterTrackingLinks([poster, duplicate], filters)).toEqual([
      poster,
      duplicate,
    ]);
  });
});
