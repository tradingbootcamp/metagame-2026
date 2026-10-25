import { afterEach, describe, expect, it, vi } from "vitest";

const { create, list } = vi.hoisted(() => ({ create: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create } },
    promotionCodes: { list },
  }),
}));
import { GET } from "./route";
import { getTicket, stripeMode } from "@/lib/tickets";

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("ticket checkout around the former sales cutoff", () => {
  it.each([
    "2026-10-29T06:59:59Z",
    "2026-10-30T07:00:00Z",
    "2026-11-06T20:00:00Z",
  ])("offers full-price checkout and a promo box at %s", async (now) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));
    create.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/test" });
    const response = await GET(
      new Request("https://metagame.games/api/checkout/stripe?tier=standard"),
    );
    expect(response.status).toBe(303);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          { price: getTicket("standard")!.priceIds[stripeMode], quantity: 1 },
        ],
        allow_promotion_codes: true,
      }),
    );
    expect(create.mock.calls[0][0].discounts).toBeUndefined();
    expect(list).not.toHaveBeenCalled();
  });
});
