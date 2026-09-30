import { describe, expect, it } from "vitest";
import {
  buildDestinationUrl,
  defaultCampaign,
  isAllowedDestination,
  matchSitePage,
  normalizeSlug,
  slugify,
  snapToOption,
  suggestSlug,
  validateSlug,
  type LinkOptions,
} from "./tracking-links";

const opts = (campaign: string[] = []): LinkOptions => ({
  source: [],
  medium: [],
  campaign,
  placement: [],
});

describe("normalizeSlug", () => {
  it("lowercases and hyphenates whitespace", () => {
    expect(normalizeSlug("  Puzzle   Night ")).toBe("puzzle-night");
  });
  it("collapses repeated hyphens", () => {
    expect(normalizeSlug("a--b---c")).toBe("a-b-c");
  });
  it("keeps unsupported characters for validation to reject", () => {
    expect(normalizeSlug("hey!")).toBe("hey!");
    expect(validateSlug("hey!")).toMatch(/lowercase letters/);
  });
});

describe("validateSlug", () => {
  it("accepts 3–48 chars with inner hyphens", () => {
    expect(validateSlug("abc")).toBeNull();
    expect(validateSlug("puzzle-night-2026")).toBeNull();
    expect(validateSlug("a".repeat(48))).toBeNull();
  });
  it("rejects too short, too long, and edge hyphens", () => {
    expect(validateSlug("ab")).not.toBeNull();
    expect(validateSlug("a".repeat(49))).not.toBeNull();
    expect(validateSlug("-abc")).not.toBeNull();
    expect(validateSlug("abc-")).not.toBeNull();
  });
});

describe("isAllowedDestination", () => {
  const site = "https://metagame.games";
  it("allows https on the site's host", () => {
    expect(isAllowedDestination("https://metagame.games/tickets", site)).toBe(
      true,
    );
  });
  it("rejects other hosts, http, credentials, and /go/", () => {
    expect(isAllowedDestination("https://evil.example/", site)).toBe(false);
    expect(isAllowedDestination("http://metagame.games/", site)).toBe(false);
    expect(isAllowedDestination("https://u:p@metagame.games/", site)).toBe(
      false,
    );
    expect(isAllowedDestination("https://metagame.games/go/x", site)).toBe(
      false,
    );
    expect(isAllowedDestination("https://metagame.games/go", site)).toBe(false);
    expect(isAllowedDestination("not a url", site)).toBe(false);
  });
  it("allows http only for localhost dev", () => {
    expect(
      isAllowedDestination("http://localhost:3000/", "http://localhost:3000"),
    ).toBe(true);
    expect(
      isAllowedDestination("http://localhost:3001/", "http://localhost:3000"),
    ).toBe(false);
  });
});

describe("buildDestinationUrl", () => {
  const link = {
    destination:
      "https://metagame.games/tickets?type=weekend&utm_source=old#pricing",
    slug: "puzzle-night",
    source: "discord",
    medium: "community",
    campaign: "metagame-2026",
    placement: "puzzle-world-announcement",
  };
  it("sets the five UTMs, replaces stale ones, keeps other params and the fragment", () => {
    const url = new URL(buildDestinationUrl(link));
    expect(url.hash).toBe("#pricing");
    expect(url.searchParams.get("type")).toBe("weekend");
    expect(url.searchParams.get("utm_source")).toBe("discord");
    expect(url.searchParams.get("utm_medium")).toBe("community");
    expect(url.searchParams.get("utm_campaign")).toBe("metagame-2026");
    expect(url.searchParams.get("utm_content")).toBe(
      "puzzle-world-announcement",
    );
    expect(url.searchParams.get("utm_term")).toBe("puzzle-night");
    expect(url.searchParams.getAll("utm_source")).toHaveLength(1);
  });
  it("omits utm_content without a placement", () => {
    const url = new URL(buildDestinationUrl({ ...link, placement: "" }));
    expect(url.searchParams.has("utm_content")).toBe(false);
  });
});

describe("defaultCampaign", () => {
  it("prefers metagame-2026 when Airtable lists it", () => {
    expect(defaultCampaign(opts(["other", "metagame-2026"]))).toBe(
      "metagame-2026",
    );
  });
  it("falls back to the first listed choice, or empty", () => {
    expect(defaultCampaign(opts(["x", "y"]))).toBe("x");
    expect(defaultCampaign(opts())).toBe("");
  });
});

describe("matchSitePage", () => {
  const origin = "https://metagame.games";
  it("finds the listed page for a saved destination", () => {
    expect(matchSitePage("https://metagame.games/#tickets", origin)).toBe(
      "/#tickets",
    );
    expect(matchSitePage("https://metagame.games/", origin)).toBe("/");
  });
  it("returns null for anything else", () => {
    expect(matchSitePage("https://metagame.games/tickets?x=1", origin)).toBe(
      null,
    );
  });
});

describe("slugify", () => {
  it("lowercases, hyphenates, strips punctuation, keeps underscores", () => {
    expect(slugify("Puzzle World")).toBe("puzzle-world");
    expect(slugify("Metagame 2026 (Nov 6–8)")).toBe("metagame-2026-nov-68");
    expect(slugify("  a_b -- c ")).toBe("a_b-c");
    expect(slugify("!!!")).toBe("");
  });
});

describe("suggestSlug", () => {
  it("uses the placement, stepping past taken names", () => {
    expect(suggestSlug("Puzzle World", new Set())).toBe("puzzle-world");
    expect(suggestSlug("Puzzle World", new Set(["puzzle-world"]))).toBe(
      "puzzle-world-2",
    );
    expect(
      suggestSlug("Puzzle World", new Set(["puzzle-world", "puzzle-world-2"])),
    ).toBe("puzzle-world-3");
    expect(suggestSlug("", new Set())).toBe("");
  });
  it("always yields a valid slug", () => {
    const slug = suggestSlug("x".repeat(60), new Set(["x".repeat(48)]));
    expect(validateSlug(slug)).toBeNull();
  });
});

describe("snapToOption", () => {
  it("adopts the option's spelling on a case-insensitive match", () => {
    expect(snapToOption(" puzzle world ", ["Puzzle World"])).toBe(
      "Puzzle World",
    );
  });
  it("keeps a new value as typed", () => {
    expect(snapToOption("Board Game Arena ", ["Puzzle World"])).toBe(
      "Board Game Arena",
    );
  });
});
