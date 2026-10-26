import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type Stripe from "stripe";
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/early-bird", () => ({ isEarlyBirdActive: () => true }));
vi.mock("posthog-js", () => ({ default: { __loaded: false } }));
import { getStripe } from "@/lib/stripe";
import { discountTrackingUrl } from "@/lib/discount-links";
import { captureUtm, withPromo, withUtm } from "@/lib/utm";
import { GET } from "./route";

const list = vi.fn();
const create = vi.fn();
const valid = {
  id: "promo_save",
  code: "SAVE20",
  active: true,
  expires_at: null,
  max_redemptions: null,
  times_redeemed: 0,
  promotion: { coupon: { valid: true } },
  metadata: { source: "comp-tool", purpose: "Sponsor" },
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getStripe).mockReturnValue({
    promotionCodes: { list },
    checkout: { sessions: { create } },
  } as unknown as Stripe);
  list.mockResolvedValue({ data: [valid] });
  create.mockResolvedValue({
    id: "session",
    url: "https://checkout.stripe.com/test",
  });
});
afterEach(() => vi.unstubAllGlobals());
const checkout = (query: string) =>
  GET(
    new Request(
      `https://metagame.games/api/checkout/stripe?tier=standard&${query}`,
    ),
  );

it("carries a generated tracking link through browsing into a single discounted session", async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
    removeItem: (k: string) => values.delete(k),
  });
  vi.stubGlobal("window", { location: { origin: "https://metagame.games" } });
  const link = new URL(discountTrackingUrl("https://metagame.games", "SAVE20"));
  captureUtm(link.search);
  captureUtm("");
  const href = withPromo(withUtm("/api/checkout/stripe?tier=standard"));
  const response = await GET(new Request(`https://metagame.games${href}`));
  expect(response.status).toBe(303);
  expect(list.mock.calls[0][0].code).toBe("SAVE20");
  expect(create.mock.calls[0][0]).toMatchObject({
    discounts: [{ promotion_code: "promo_save" }],
    metadata: {
      utm_source: "comp-tool",
      utm_medium: "comp-link",
      utm_term: "SAVE20",
      utm_campaign: "metagame-2026",
    },
  });
  expect(create.mock.calls[0][0]).not.toHaveProperty("allow_promotion_codes");
  expect(
    new URL(
      `https://metagame.games${withPromo("/api/checkout/stripe?promo=EXPLICIT")}`,
    ).searchParams.getAll("promo"),
  ).toEqual(["EXPLICIT"]);
});
it("preserves poster placement attribution instead of replacing it with the code's purpose", async () => {
  await checkout(
    "promo=SAVE20&utm_source=poster&utm_medium=print&utm_content=berkeley&utm_term=berkeley",
  );
  expect(create.mock.calls[0][0].metadata).toMatchObject({
    utm_source: "poster",
    utm_medium: "print",
    utm_content: "berkeley",
    utm_term: "berkeley",
  });
});
it.each([
  undefined,
  { ...valid, active: false },
  { ...valid, expires_at: 1 },
  { ...valid, max_redemptions: 1, times_redeemed: 1 },
  { ...valid, promotion: { coupon: { valid: false } } },
])(
  "falls back to the existing code box for unavailable codes, without stacking early bird",
  async (promo) => {
    list.mockResolvedValue({ data: promo ? [promo] : [] });
    expect((await checkout("promo=SAVE20")).status).toBe(303);
    expect(create.mock.calls[0][0]).toMatchObject({
      allow_promotion_codes: true,
    });
    expect(create.mock.calls[0][0]).not.toHaveProperty("discounts");
    expect(list).toHaveBeenCalledTimes(1);
  },
);
