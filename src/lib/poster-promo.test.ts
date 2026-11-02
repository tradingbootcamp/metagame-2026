import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/promo-codes-stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/promo-codes-stripe")>()),
  standardProduct: async () => "prod_standard",
  redeemableCode: vi.fn(),
}));
import { checkPosterPromo, posterAccepts } from "./poster-promo";
import { redeemableCode } from "@/lib/promo-codes-stripe";

const open = { products: null, restricted: false };

describe("poster promo policy", () => {
  it.each([
    [{ ...open, amountOff: 100 }, true],
    [{ ...open, percentOff: 50, products: ["prod_standard"] }, true],
    [{ ...open, amountOff: 100.01 }, false],
    [{ ...open, percentOff: 51 }, false],
    [{ ...open, percentOff: 100, products: ["prod_standard"] }, false],
    [{ ...open, amountOff: 20, products: ["prod_booth"] }, false],
    [{ ...open, amountOff: 20, restricted: true }, false],
  ])("%j → %s", (discount, accepted) => {
    expect(posterAccepts(discount, "prod_standard")).toBe(accepted);
  });
  it("prints Stripe's spelling and rejects every bad code alike", async () => {
    vi.mocked(redeemableCode).mockResolvedValue({
      code: "FRIENDS",
      discount: { ...open, amountOff: 12.5 },
    });
    expect(await checkPosterPromo("friends")).toEqual({
      ok: true,
      code: "FRIENDS",
      discount: "$12.50",
    });
    vi.mocked(redeemableCode).mockResolvedValue({
      code: "STAFF",
      discount: { ...open, percentOff: 100 },
    });
    expect(await checkPosterPromo("staff")).toEqual({ ok: false });
    vi.mocked(redeemableCode).mockResolvedValue(null);
    expect(await checkPosterPromo("gone")).toEqual({ ok: false });
  });
});
