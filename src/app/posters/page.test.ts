import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/poster-discount-access", () => ({
  posterDiscountAccess: vi.fn(),
}));
vi.mock("@/lib/stripe-poster-discounts", () => ({
  listStripePosterDiscounts: vi.fn(),
}));
vi.mock("@/lib/discount-codes", () => ({ listBtcPosterDiscounts: vi.fn() }));
vi.mock("@/lib/poster-catalog", () => ({
  loadPosterCatalog: vi.fn().mockResolvedValue([]),
}));
vi.mock("./poster-form", () => ({ default: "poster-form" }));
import Page from "./page";
import { posterDiscountAccess } from "@/lib/poster-discount-access";
import { listStripePosterDiscounts } from "@/lib/stripe-poster-discounts";
import { listBtcPosterDiscounts } from "@/lib/discount-codes";
beforeEach(() => vi.clearAllMocks());
it("does not read or serialize private code options for the public page", async () => {
  vi.mocked(posterDiscountAccess).mockResolvedValue(null);
  const page = await Page();
  expect(listStripePosterDiscounts).not.toHaveBeenCalled();
  expect(listBtcPosterDiscounts).not.toHaveBeenCalled();
  expect(
    page.props.children.props.children.find(
      (child: { type?: string }) => child?.type === "poster-form",
    ).props.discounts,
  ).toBeNull();
});
it("loads codes only for authorized staff without breaking ordinary printing on provider failure", async () => {
  vi.mocked(posterDiscountAccess).mockResolvedValue({
    via: "password",
    name: "Staff",
  });
  vi.mocked(listStripePosterDiscounts).mockRejectedValue(
    new Error("private detail"),
  );
  vi.mocked(listBtcPosterDiscounts).mockResolvedValue([
    { code: "BTC", label: "BTC" },
  ]);
  const page = await Page();
  const form = page.props.children.props.children.find(
    (child: { type?: string }) => child?.type === "poster-form",
  );
  expect(form.props.discounts).toEqual({
    stripe: [],
    btc: [{ code: "BTC", label: "BTC" }],
    unavailable: true,
  });
  expect(JSON.stringify(form.props)).not.toContain("private detail");
});
