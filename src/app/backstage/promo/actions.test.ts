import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/admin-auth", () => ({
  requireAccess: vi.fn(),
  EXPIRED: "Expired",
}));
vi.mock("@/lib/promo-codes-stripe", () => ({
  mintStripeCode: vi.fn(),
  listStripeCodes: vi.fn(),
  setStripeCodeActive: vi.fn(),
}));
import { requireAccess } from "@/lib/admin-auth";
import {
  mintStripeCode,
  listStripeCodes,
  setStripeCodeActive,
} from "@/lib/promo-codes-stripe";
import { mint, listCodes, setActive } from "./actions";
beforeEach(() => vi.resetAllMocks());
it("guards every discount operation before provider access", async () => {
  vi.mocked(requireAccess).mockResolvedValue(null);
  expect(await mint({}, new FormData())).toEqual({ error: "Expired" });
  await expect(listCodes()).rejects.toThrow("Expired");
  expect(await setActive("promo", true)).toEqual({ error: "Expired" });
  expect(mintStripeCode).not.toHaveBeenCalled();
  expect(listStripeCodes).not.toHaveBeenCalled();
  expect(setStripeCodeActive).not.toHaveBeenCalled();
  expect(
    vi.mocked(requireAccess).mock.calls.every(([p]) => p === "promo.manage"),
  ).toBe(true);
});
it("rejects new codes that cannot travel through the tracking link", async () => {
  vi.mocked(requireAccess).mockResolvedValue({
    name: "Staff",
    userId: "staff",
  });
  const form = new FormData();
  form.set("name", "Group");
  form.set("purpose", "Sponsor");
  form.set("customCode", "A".repeat(101));
  expect(await mint({}, form)).toMatchObject({ field: "customCode" });
  expect(mintStripeCode).not.toHaveBeenCalled();
});
