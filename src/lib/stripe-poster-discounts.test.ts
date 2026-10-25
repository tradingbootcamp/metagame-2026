import { beforeEach, expect, it, vi } from "vitest";
import type Stripe from "stripe";
vi.mock("./stripe", () => ({ getStripe: vi.fn() }));
vi.mock("./tickets", async (original) => ({
  ...(await original<typeof import("./tickets")>()),
  stripeMode: "live",
}));
import { getStripe } from "./stripe";
import {
  listStripePosterDiscounts,
  posterPromotionEligible,
  resolveStripePosterDiscount,
} from "./stripe-poster-discounts";

const coupon = {
  valid: true,
  livemode: true,
  percent_off: 10,
  redeem_by: null,
  max_redemptions: null,
} as Stripe.Coupon;
const promo = {
  object: "promotion_code",
  created: 0,
  id: "promo_fixture",
  code: "CARD",
  active: true,
  livemode: true,
  customer: null,
  customer_account: null,
  expires_at: null,
  max_redemptions: null,
  times_redeemed: 0,
  promotion: { type: "coupon", coupon },
  restrictions: {
    first_time_transaction: false,
    minimum_amount: null,
    minimum_amount_currency: null,
  },
  metadata: { email: "private@example.com" },
} as Stripe.PromotionCode;
const price = {
  product: "product_standard",
  currency: "usd",
  unit_amount: 42500,
  livemode: true,
  active: true,
} as Stripe.Price;
const list = vi.fn();
beforeEach(() => {
  list.mockReset().mockImplementation(() =>
    Object.assign(Promise.resolve({ data: [promo] }), {
      autoPagingToArray: async () => [promo],
    }),
  );
  vi.mocked(getStripe).mockReturnValue({
    promotionCodes: { list },
    prices: { retrieve: vi.fn().mockResolvedValue(price) },
  } as unknown as Stripe);
});

it("offers and resolves an existing code without exposing recipient metadata", async () => {
  expect(await listStripePosterDiscounts()).toEqual([
    { code: "CARD", label: "CARD — 10% off" },
  ]);
  expect(await resolveStripePosterDiscount("card")).toEqual(promo);
});
it.each([
  { active: false },
  { livemode: false },
  { expires_at: 1 },
  { customer: "customer" },
  { customer_account: "account" },
  { max_redemptions: 1, times_redeemed: 1 },
  { restrictions: { ...promo.restrictions, first_time_transaction: true } },
  {
    restrictions: {
      ...promo.restrictions,
      minimum_amount: 50000,
      minimum_amount_currency: "usd",
    },
  },
  {
    restrictions: {
      ...promo.restrictions,
      minimum_amount: 1,
      minimum_amount_currency: "eur",
    },
  },
])("rejects unavailable or restricted codes: %o", (patch) => {
  expect(posterPromotionEligible({ ...promo, ...patch }, price)).toBe(false);
});
it.each([
  { valid: false },
  { livemode: false },
  { redeem_by: 1 },
  { max_redemptions: 1, times_redeemed: 1 },
  { applies_to: { products: ["different_product"] } },
  { percent_off: 0 },
  { percent_off: null, currency: "eur", amount_off: 100 },
])("rejects unavailable or inapplicable coupons: %o", (patch) => {
  expect(
    posterPromotionEligible(
      {
        ...promo,
        promotion: { type: "coupon", coupon: { ...coupon, ...patch } },
      },
      price,
    ),
  ).toBe(false);
});
it("allows Standard-product coupons and existing USD or percentage amounts", () => {
  expect(
    posterPromotionEligible(
      {
        ...promo,
        promotion: {
          type: "coupon",
          coupon: { ...coupon, applies_to: { products: ["product_standard"] } },
        },
      },
      price,
    ),
  ).toBe(true);
  expect(
    posterPromotionEligible(
      {
        ...promo,
        promotion: {
          type: "coupon",
          coupon: {
            ...coupon,
            percent_off: null,
            amount_off: 1000,
            currency: "usd",
          },
        },
      },
      price,
    ),
  ).toBe(true);
});
it("fails closed for duplicates, missing codes, and invalid input", async () => {
  list.mockResolvedValue({ data: [promo, { ...promo, id: "duplicate" }] });
  expect(await resolveStripePosterDiscount("CARD")).toBeNull();
  list.mockResolvedValue({ data: [] });
  expect(await resolveStripePosterDiscount("CARD")).toBeNull();
  list.mockClear();
  expect(await resolveStripePosterDiscount("bad/code")).toBeNull();
  expect(list).not.toHaveBeenCalled();
});
