import { beforeEach, expect, it, vi } from "vitest";
import type Stripe from "stripe";
vi.mock("./stripe-promo", () => ({
  getPromoStripe: vi.fn(),
  promoMode: () => "test",
}));
import { getPromoStripe } from "./stripe-promo";
import { mintStripeCode } from "./promo-codes-stripe";
import { discountTrackingUrl } from "./discount-links";
const saved = new Map<string, unknown>();
const create = vi.fn(async (input) => {
  if (saved.has(input.code)) throw { code: "resource_already_exists" };
  const promo = {
    ...input,
    id: "promo_1",
    active: true,
    created: 1,
    times_redeemed: 0,
  };
  saved.set(input.code, promo);
  return promo;
});
beforeEach(() => {
  saved.clear();
  vi.clearAllMocks();
  vi.mocked(getPromoStripe).mockReturnValue({
    promotionCodes: {
      create,
      list: async ({ code }: { code: string }) => ({ data: [saved.get(code)] }),
    },
  } as unknown as Stripe);
});
const input = {
  name: "Group",
  email: "group@example.com",
  maxUses: null,
  purpose: "Sponsor",
  couponId: "coupon",
  issuedBy: "Staff",
};
it("reuses the existing code and exact tracking link after a duplicate creation retry", async () => {
  const first = await mintStripeCode(input);
  const second = await mintStripeCode(input);
  expect(first.reused).toBe(false);
  expect(second.reused).toBe(true);
  expect(saved.size).toBe(1);
  expect(discountTrackingUrl("https://metagame.games", first.code)).toBe(
    discountTrackingUrl("https://metagame.games", second.code),
  );
});
it("does not claim a custom code owned by someone else", async () => {
  await mintStripeCode({ ...input, customCode: "SAVE20" });
  await expect(
    mintStripeCode({
      ...input,
      email: "other@example.com",
      customCode: "SAVE20",
    }),
  ).rejects.toMatchObject({ code: "collision" });
  expect(saved.size).toBe(1);
});
it("keeps legacy direct checkout links encoded when old codes exceed landing limits", () => {
  const code = "OLD /?&";
  const url = new URL(discountTrackingUrl("https://metagame.games/", code));
  expect(url.pathname).toBe(`/buy/${encodeURIComponent(code)}`);
  expect(url.searchParams.get("utm_term")).toBe(code);
  expect(url.searchParams.has("promo")).toBe(false);
});
