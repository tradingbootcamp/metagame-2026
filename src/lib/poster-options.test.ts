import { describe, expect, it } from "vitest";
import { isPosterLink, posterChoices } from "./poster-options";
import type { TrackingLink } from "./tracking-links";

const berkeley: TrackingLink = {
  id: "recW2dLVFSsIrLxaN",
  slug: "berkeley",
  destination: "https://metagame.games/",
  source: "poster",
  medium: "print",
  campaign: "metagame-2026",
  placement: "Berkeley",
  internalName: "",
  createdBy: "",
  createdAt: "",
  active: true,
  template: false,
};
const generic = { ...berkeley, slug: "poster", placement: "Generic poster" };
const oakland = { ...berkeley, slug: "oakland", placement: " Oakland " };

describe("public poster options", () => {
  it("lists one choice per poster-link placement, Generic first", () => {
    const choices = posterChoices([
      oakland,
      berkeley,
      generic,
      { ...berkeley, slug: "mox-post", placement: "Mox", medium: "qr" },
    ]);
    expect(choices.map((choice) => choice.value)).toEqual([
      "generic",
      "area:Berkeley",
      "area:Oakland",
    ]);
    expect(choices[1]).toEqual({
      value: "area:Berkeley",
      label: "Berkeley",
      placement: "Berkeley",
      available: true,
      slug: "berkeley",
      tracking: {
        qrUrl: "https://metagame.games/go/berkeley",
        placement: "Berkeley",
        destination: "https://metagame.games/",
        redirectUrl:
          "https://metagame.games/?utm_source=poster&utm_medium=print&utm_campaign=metagame-2026&utm_content=berkeley&utm_term=berkeley",
        promo: "",
      },
    });
    expect(choices[2].label).toBe("Oakland");
  });
  it("hides personal poster links", () => {
    expect(
      posterChoices([
        berkeley,
        { ...berkeley, slug: "carina", placement: "carina" },
        { ...berkeley, slug: "spire", placement: "spire" },
      ]).map((choice) => choice.label),
    ).toEqual(["Berkeley"]);
  });
  it("omits Generic when no generic link exists", () => {
    expect(posterChoices([berkeley]).map((choice) => choice.value)).toEqual([
      "area:Berkeley",
    ]);
  });
  it("keeps but disables placements with duplicate links or duplicate slugs", () => {
    for (const duplicate of [
      { ...berkeley, slug: "berkeley-2" },
      { ...berkeley, slug: "BERKELEY", source: "discord" },
    ]) {
      const [choice] = posterChoices([berkeley, duplicate]);
      expect(choice.label).toBe("Berkeley");
      expect(choice.available).toBe(false);
      expect(choice.slug).toBeNull();
      expect(choice.tracking).toBeNull();
    }
  });
  it.each([
    { active: false },
    { template: true },
    { source: "discord" },
    { medium: "qr" },
    { campaign: "other" },
    { placement: "" },
    { slug: "bad/slug" },
    { destination: "https://evil.example/" },
    { destination: "https://metagame.games/go/mox-post" },
    { destination: "https://metagame.games/?person=someone" },
    { destination: "https://metagame.games/buy/bad%20code" },
    { destination: "https://metagame.games/buy/A/B" },
    { destination: "https://metagame.games/buy/%E0%A4" },
    { destination: "https://metagame.games/sessions" },
  ])("rejects unsafe/incomplete link %j", (change) => {
    expect(isPosterLink({ ...berkeley, ...change })).toBe(false);
  });
  it("accepts a /buy/<code> link and exposes its code", () => {
    const elysian = {
      ...berkeley,
      destination: "https://metagame.games/buy/ELYSIAN",
    };
    expect(isPosterLink(elysian)).toBe(true);
    expect(posterChoices([elysian])[0].tracking?.promo).toBe("ELYSIAN");
    expect(posterChoices([berkeley])[0].tracking?.promo).toBe("");
  });
  it("checks the placement only when one is given", () => {
    expect(isPosterLink(berkeley)).toBe(true);
    expect(isPosterLink(berkeley, " berkeley ")).toBe(true);
    expect(isPosterLink(berkeley, "Mox")).toBe(false);
  });
});
