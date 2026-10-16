import { beforeEach, describe, expect, it, vi } from "vitest";
const { create, getStripe } = vi.hoisted(() => ({
  create: vi.fn(),
  getStripe: vi.fn(),
}));
vi.mock("@/lib/stripe", () => ({ getStripe }));
import { POST } from "./route";

const request = (count: number, extras = {}) =>
  new Request("https://metagame.games/api/checkout/family-pack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      attendees: Array.from({ length: count }, (_, i) => ({
        name: `Guest ${i}`,
        email: `g${i}@example.com`,
      })),
      ...extras,
    }),
  });

describe("family pack checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStripe.mockReturnValue({ checkout: { sessions: { create } } });
    create.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/test" });
  });
  it.each([4, 5, 6])(
    "charges %i tickets at the server price and rejects discount stacking",
    async (count) => {
      const response = await POST(
        request(count, {
          unit_amount: 1,
          quantity: 1,
          promo: "FREE",
          utm_content: "poster-v2",
        }),
      );
      expect(response.status).toBe(200);
      const session = create.mock.calls[0][0];
      expect(session.line_items[0].quantity).toBe(count);
      expect(session.line_items[0].price_data.unit_amount).toBe(37500);
      expect(session.allow_promotion_codes).toBe(false);
      expect(session.discounts).toBeUndefined();
      expect(session.metadata.utm_content).toBe("poster-v2");
      expect(session.metadata.quantity).toBe(String(count));
    },
  );
  it.each([3, 7])(
    "does not create checkout for %i attendees",
    async (count) => {
      expect((await POST(request(count))).status).toBe(400);
      expect(create).not.toHaveBeenCalled();
    },
  );
  it("returns an unavailable error if Stripe is unconfigured", async () => {
    getStripe.mockReturnValue(null);
    expect((await POST(request(4))).status).toBe(503);
  });
});
