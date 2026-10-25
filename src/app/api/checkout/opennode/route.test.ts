import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/discount-codes", () => ({
  lookupDiscountCode: vi.fn(),
  countCodeRedemptions: vi.fn(),
  resolveBtcPosterDiscount: vi.fn(),
}));
vi.mock("@/lib/opennode", () => ({
  createCharge: vi.fn(),
  getHostedCheckoutUrl: vi
    .fn()
    .mockReturnValue("https://checkout.opennode.com/fixture"),
}));
import {
  lookupDiscountCode,
  resolveBtcPosterDiscount,
} from "@/lib/discount-codes";
import { createCharge } from "@/lib/opennode";
import { POST } from "./route";
const request = (extras = {}) =>
  new Request("https://metagame.games/api/checkout/opennode", {
    method: "POST",
    body: JSON.stringify({
      ticketId: "standard",
      name: "Fixture",
      email: "fixture@example.com",
      discountCode: "BTC",
      posterDiscount: true,
      ...extras,
    }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createCharge).mockResolvedValue({ id: "fixture" } as Awaited<
    ReturnType<typeof createCharge>
  >);
  vi.mocked(lookupDiscountCode).mockResolvedValue({ status: "none" });
  vi.mocked(resolveBtcPosterDiscount).mockResolvedValue({
    status: "valid",
    code: "BTC",
    btcPrice: 0.005,
    maxUses: null,
  });
});
it("revalidates a BTC-only poster code and carries attribution into the mocked charge", async () => {
  expect(
    (await POST(request({ utm_source: "poster", utm_term: "pp-fixture" })))
      .status,
  ).toBe(200);
  expect(resolveBtcPosterDiscount).toHaveBeenCalledWith("BTC");
  expect(lookupDiscountCode).not.toHaveBeenCalled();
  expect(createCharge).toHaveBeenCalledWith(
    expect.objectContaining({
      amountSats: 500000,
      metadata: expect.objectContaining({
        discountCode: "BTC",
        utm_source: "poster",
        utm_term: "pp-fixture",
      }),
    }),
  );
});
it("does not create a charge after an invalid, expired or exhausted poster selection", async () => {
  vi.mocked(resolveBtcPosterDiscount).mockResolvedValue(null);
  expect((await POST(request())).status).toBe(409);
  expect(createCharge).not.toHaveBeenCalled();
});
it("fails closed when redemption verification is unavailable", async () => {
  vi.mocked(resolveBtcPosterDiscount).mockRejectedValue(
    new Error("private provider detail"),
  );
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private provider detail");
  expect(createCharge).not.toHaveBeenCalled();
});
it("allows consciously clearing a poster code and preserves ordinary checkout", async () => {
  expect(
    (await POST(request({ discountCode: "", posterDiscount: false }))).status,
  ).toBe(200);
  expect(resolveBtcPosterDiscount).not.toHaveBeenCalled();
  expect(createCharge).toHaveBeenCalledWith(
    expect.objectContaining({ amountSats: 650000 }),
  );
});
