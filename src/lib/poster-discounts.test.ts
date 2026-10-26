import { beforeEach, expect, it, vi } from "vitest";
vi.mock("./admin-auth", () => ({ toolAccess: vi.fn() }));
vi.mock("./promo-codes-stripe", () => ({ listStripeCodes: vi.fn() }));
vi.mock("./stripe-promo", () => ({ promoMode: vi.fn(() => "test") }));
vi.mock("./tickets", () => ({ stripeMode: "test" }));
import { toolAccess } from "./admin-auth";
import { listStripeCodes, type StripeCode } from "./promo-codes-stripe";
import { promoMode } from "./stripe-promo";
import { posterDiscounts } from "./poster-discounts";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(promoMode).mockReturnValue("test");
});
it("never loads the private list without the existing permission", async () => {
  vi.mocked(toolAccess).mockResolvedValue(null);
  expect(await posterDiscounts()).toBeNull();
  expect(toolAccess).toHaveBeenCalledWith("promo.manage");
  expect(listStripeCodes).not.toHaveBeenCalled();
});
it("returns only usable choices, without guest identity or notes", async () => {
  vi.mocked(toolAccess).mockResolvedValue({ name: "Staff", userId: "staff" });
  vi.mocked(listStripeCodes).mockResolvedValue([
    {
      code: "SAVE20",
      coupon: "20% off",
      redeemable: true,
      email: "private@example.com",
      notes: "private",
    },
    { code: "EXPIRED", coupon: "20% off", redeemable: false },
  ] as StripeCode[]);
  expect(await posterDiscounts()).toEqual([
    { code: "SAVE20", label: "20% off" },
  ]);
});
it("does not offer test codes for a different checkout mode", async () => {
  vi.mocked(toolAccess).mockResolvedValue({ name: "Staff", userId: "staff" });
  vi.mocked(promoMode).mockReturnValue("live");
  expect(await posterDiscounts()).toEqual([]);
  expect(listStripeCodes).not.toHaveBeenCalled();
});
