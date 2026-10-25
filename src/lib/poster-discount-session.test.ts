import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("./tracking-links", async (original) => ({
  ...(await original<typeof import("./tracking-links")>()),
  resolveTrackingLink: vi.fn(),
}));
import { GET } from "@/app/go/[slug]/route";
import { resolveTrackingLink, type TrackingLink } from "./tracking-links";
import {
  withPosterDiscountParams,
  posterStripeHref,
} from "./poster-discount-params";
import {
  capturePosterDiscounts,
  clearPosterDiscounts,
  readPosterDiscounts,
} from "./poster-discount-session";

let location: URL;
let stored: Map<string, string>;
beforeEach(() => {
  location = new URL("https://metagame.games/");
  stored = new Map();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => stored.set(k, v),
    removeItem: (k: string) => stored.delete(k),
  });
  vi.stubGlobal("window", {
    get location() {
      return location;
    },
    dispatchEvent: vi.fn(),
    history: {
      state: null,
      replaceState: (_state: unknown, _title: string, url: URL) => {
        location = new URL(url);
      },
    },
  });
  capturePosterDiscounts("?utm_source=reset");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("carries both rails through the real redirect into the matching checkout controls", async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://metagame.games");
  const destination = withPosterDiscountParams("https://metagame.games/", {
    stripe: "CARD",
    btc: "BITCOIN",
  });
  vi.mocked(resolveTrackingLink).mockResolvedValue({
    slug: "pp-fixture",
    destination,
    source: "poster",
    medium: "print",
    campaign: "metagame-2026",
    placement: "Berkeley",
    active: true,
  } as TrackingLink);
  const response = await GET(
    new Request("https://metagame.games/go/pp-fixture"),
    { params: Promise.resolve({ slug: "pp-fixture" }) },
  );
  location = new URL(response.headers.get("location")!);
  expect(location.hash).toBe("#tickets");
  expect(location.searchParams.get("utm_term")).toBe("pp-fixture");
  expect(location.searchParams.get("utm_content")).toBe("berkeley");
  expect(readPosterDiscounts()).toEqual({ stripe: "CARD", btc: "BITCOIN" });
  capturePosterDiscounts(location.search);
  location = new URL("https://metagame.games/#tickets");
  const selection = readPosterDiscounts();
  const checkout = new URL(
    posterStripeHref(
      "/api/checkout/stripe?tier=standard&code=own&utm_term=pp-fixture",
      selection,
    ),
    location,
  );
  expect(checkout.searchParams.get("promo")).toBe("CARD");
  expect(checkout.searchParams.get("poster_offer")).toBe("1");
  expect(checkout.searchParams.get("utm_term")).toBe("pp-fixture");
  expect(checkout.searchParams.has("poster_btc")).toBe(false);
  expect(selection.btc).toBe("BITCOIN");
});

it("does not infer a matching code for the other payment method", () => {
  capturePosterDiscounts("?poster_offer=1&poster_btc=BITCOIN");
  expect(readPosterDiscounts()).toEqual({ stripe: "", btc: "BITCOIN" });
  expect(
    posterStripeHref(
      "/api/checkout/stripe?tier=standard",
      readPosterDiscounts(),
    ),
  ).toBe("/api/checkout/stripe?tier=standard");
  capturePosterDiscounts("?poster_offer=1&poster_promo=CARD");
  expect(readPosterDiscounts()).toEqual({ stripe: "CARD", btc: "" });
});

it("does not carry poster discounts into day-pass or family checkout", () => {
  const selection = { stripe: "CARD", btc: "BITCOIN" };
  for (const href of [
    "/api/checkout/stripe?tier=day-pass&day=friday",
    "/api/checkout/family-pack",
  ]) {
    expect(posterStripeHref(href, selection)).toBe(href);
  }
});

it("clears an earlier discount when a no-discount poster or another tracking link is scanned", () => {
  capturePosterDiscounts(
    "?poster_offer=1&poster_promo=CARD&poster_btc=BITCOIN",
  );
  capturePosterDiscounts("");
  expect(readPosterDiscounts().stripe).toBe("CARD");
  capturePosterDiscounts("?utm_source=poster&utm_term=berkeley");
  expect(readPosterDiscounts()).toEqual({ stripe: "", btc: "" });
});

it("still clears stale discounts if browser storage rejects writes", () => {
  capturePosterDiscounts("?poster_offer=1&poster_promo=CARD");
  vi.stubGlobal("sessionStorage", {
    setItem: () => {
      throw new Error("storage blocked");
    },
    getItem: () => JSON.stringify({ stripe: "STALE", btc: "" }),
  });
  capturePosterDiscounts("?utm_source=poster");
  expect(readPosterDiscounts()).toEqual({ stripe: "", btc: "" });
});

it("lets the buyer clear the offer without losing tracking or the tickets fragment", () => {
  location = new URL(
    "https://metagame.games/?poster_offer=1&poster_promo=CARD&utm_source=poster#tickets",
  );
  capturePosterDiscounts(location.search);
  clearPosterDiscounts();
  expect(location.searchParams.has("poster_promo")).toBe(false);
  expect(location.searchParams.get("utm_source")).toBe("poster");
  expect(location.hash).toBe("#tickets");
  expect(readPosterDiscounts()).toEqual({ stripe: "", btc: "" });
});
