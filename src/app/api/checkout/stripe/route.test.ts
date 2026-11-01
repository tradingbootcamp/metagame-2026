import { beforeEach, describe, expect, it, vi } from "vitest";
const { create, list, getStripe, earlyBird } = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  getStripe: vi.fn(),
  earlyBird: vi.fn(),
}));
vi.mock("@/lib/stripe", () => ({ getStripe }));
vi.mock("@/lib/early-bird", () => ({ isEarlyBirdActive: earlyBird }));
import { GET } from "./route";

const open = (query: string) =>
  GET(new Request(`https://metagame.games/api/checkout/stripe?${query}`));
const stripeError = (type: string) => Object.assign(new Error(type), { type });

describe("stripe checkout with a linked code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStripe.mockReturnValue({
      checkout: { sessions: { create } },
      promotionCodes: { list },
    });
    list.mockImplementation(async ({ code }: { code: string }) => ({
      data: [{ id: `promo_${code}`, metadata: {} }],
    }));
    create.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/x" });
    earlyBird.mockReturnValue(false);
  });

  it("falls back to the code box when Stripe refuses the code", async () => {
    create.mockRejectedValueOnce(stripeError("StripeInvalidRequestError"));
    const response = await open("tier=standard&promo=USEDUP");
    expect(response.status).toBe(303);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].discounts).toEqual([
      { promotion_code: "promo_USEDUP" },
    ]);
    expect(create.mock.calls[1][0].discounts).toBeUndefined();
    expect(create.mock.calls[1][0].allow_promotion_codes).toBe(true);
  });

  it("keeps the early-bird discount on the fallback", async () => {
    earlyBird.mockReturnValue(true);
    create.mockRejectedValueOnce(stripeError("StripeInvalidRequestError"));
    await open("tier=standard&promo=USEDUP");
    expect(create.mock.calls[1][0].discounts).toEqual([
      { promotion_code: "promo_EARLYBIRD" },
    ]);
  });

  it("fails instead of dropping the code on a transient error", async () => {
    create.mockRejectedValueOnce(stripeError("StripeConnectionError"));
    const response = await open("tier=standard&promo=COMP");
    expect(response.status).toBe(502);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
