import { beforeEach, expect, it, vi } from "vitest";
import type Stripe from "stripe";
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn() }));
vi.mock("@/lib/stripe-poster-discounts", () => ({
  resolveStripePosterDiscount: vi.fn(),
}));
vi.mock("@/lib/early-bird", () => ({ isEarlyBirdActive: () => false }));
import { getStripe } from "@/lib/stripe";
import { resolveStripePosterDiscount } from "@/lib/stripe-poster-discounts";
import { GET } from "./route";
const create = vi.fn();
const list = vi.fn();
const request = (query: string) =>
  new Request(`https://metagame.games/api/checkout/stripe?${query}`);
beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({
    url: "https://checkout.stripe.com/c/pay/fixture",
  });
  list.mockResolvedValue({ data: [] });
  vi.mocked(getStripe).mockReturnValue({
    checkout: { sessions: { create } },
    promotionCodes: { list },
  } as unknown as Stripe);
  vi.mocked(resolveStripePosterDiscount).mockResolvedValue({
    object: "promotion_code",
    created: 0,
    active: true,
    livemode: true,
    customer: null,
    customer_account: null,
    expires_at: null,
    max_redemptions: null,
    times_redeemed: 0,
    promotion: { type: "coupon", coupon: null },
    restrictions: {
      first_time_transaction: false,
      minimum_amount: null,
      minimum_amount_currency: null,
    },
    id: "promo_fixture",
    code: "CARD",
    metadata: { source: "comp-tool", purpose: "Staff" },
  } as Stripe.PromotionCode);
});
it("revalidates and applies the poster code while preserving poster attribution", async () => {
  const response = await GET(
    request(
      "tier=standard&code=own&promo=CARD&poster_offer=1&utm_source=poster&utm_medium=print&utm_content=berkeley&utm_term=pp-fixture",
    ),
  );
  expect(response.status).toBe(303);
  expect(resolveStripePosterDiscount).toHaveBeenCalledWith("CARD");
  const session = create.mock.calls[0][0];
  expect(session.discounts).toEqual([{ promotion_code: "promo_fixture" }]);
  expect(session.allow_promotion_codes).toBeUndefined();
  expect(session.metadata).toMatchObject({
    utm_source: "poster",
    utm_medium: "print",
    utm_content: "berkeley",
    utm_term: "pp-fixture",
  });
});
it("stops an expired or exhausted poster offer before session creation", async () => {
  vi.mocked(resolveStripePosterDiscount).mockResolvedValue(null);
  expect(
    (await GET(request("tier=standard&promo=EXPIRED&poster_offer=1"))).status,
  ).toBe(409);
  expect(create).not.toHaveBeenCalled();
});
it("preserves ordinary no-discount and legacy invalid-code behavior", async () => {
  expect((await GET(request("tier=standard&code=own"))).status).toBe(303);
  expect(create.mock.calls[0][0].allow_promotion_codes).toBe(true);
  expect(resolveStripePosterDiscount).not.toHaveBeenCalled();
});
it("never applies poster discounts to day passes", async () => {
  expect(
    (await GET(request("tier=day-pass&day=friday&promo=CARD&poster_offer=1")))
      .status,
  ).toBe(303);
  expect(resolveStripePosterDiscount).not.toHaveBeenCalled();
  expect(create.mock.calls[0][0].discounts).toBeUndefined();
});
