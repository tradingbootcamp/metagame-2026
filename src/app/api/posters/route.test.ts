import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/poster-catalog", () => ({ loadPosterCatalog: vi.fn() }));
vi.mock("@/lib/tracking-links", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tracking-links")>()),
  findTrackingLink: vi.fn(),
  findUniqueTrackingLink: vi.fn(),
}));
vi.mock("@/lib/poster-pdf", () => ({
  createPosterPdf: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
}));
vi.mock("@/lib/poster-discount-access", () => ({
  posterDiscountAccess: vi.fn(),
}));
vi.mock("@/lib/stripe-poster-discounts", () => ({
  resolveStripePosterDiscount: vi.fn(),
}));
vi.mock("@/lib/discount-codes", () => ({ resolveBtcPosterDiscount: vi.fn() }));
vi.mock("@/lib/poster-discount-links", () => ({
  ensurePosterDiscountLink: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { GET, POST } from "./route";
import { posterDiscountAccess } from "@/lib/poster-discount-access";
import { resolveStripePosterDiscount } from "@/lib/stripe-poster-discounts";
import { resolveBtcPosterDiscount } from "@/lib/discount-codes";
import { ensurePosterDiscountLink } from "@/lib/poster-discount-links";
import { revalidatePath } from "next/cache";
import { loadPosterCatalog } from "@/lib/poster-catalog";
import {
  findTrackingLink,
  findUniqueTrackingLink,
  type TrackingLink,
} from "@/lib/tracking-links";
import type Stripe from "stripe";
import { createPosterPdf } from "@/lib/poster-pdf";
const link = {
  slug: "berkeley",
  destination: "https://metagame.games/",
  source: "poster",
  medium: "print",
  campaign: "metagame-2026",
  placement: "Berkeley",
  active: true,
  template: false,
} as TrackingLink;
const request = (query = "area=area:Berkeley&design=d20&size=letter") =>
  new Request(`http://localhost/api/posters?${query}`);
it("uses the existing admin workflow's Generic poster placement", async () => {
  vi.mocked(loadPosterCatalog).mockResolvedValue([
    {
      value: "generic",
      label: "Generic poster",
      placement: "Generic poster",
      available: true,
      slug: "poster",
      tracking: null,
    },
  ]);
  vi.mocked(findTrackingLink).mockResolvedValue({
    ...link,
    slug: "poster",
    placement: "Generic poster",
  });
  expect(
    (await GET(request("area=generic&design=chess&size=letter"))).status,
  ).toBe(200);
  expect(createPosterPdf).toHaveBeenCalledWith("chess", "letter", "poster");
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadPosterCatalog).mockResolvedValue([
    {
      value: "area:Berkeley",
      label: "Berkeley",
      placement: "Berkeley",
      available: true,
      slug: "berkeley",
      tracking: null,
    },
  ]);
  vi.mocked(findTrackingLink).mockResolvedValue(link);
  vi.mocked(findUniqueTrackingLink).mockResolvedValue(link);
  vi.mocked(posterDiscountAccess).mockResolvedValue({
    via: "password",
    name: "Staff",
  });
  vi.mocked(resolveStripePosterDiscount).mockResolvedValue({
    code: "CARD",
    id: "promo_fixture",
  } as Stripe.PromotionCode);
  vi.mocked(resolveBtcPosterDiscount).mockResolvedValue({
    status: "valid",
    code: "BTC",
    btcPrice: 0.005,
    maxUses: null,
  });
  vi.mocked(ensurePosterDiscountLink).mockResolvedValue({
    ...link,
    slug: `pp-${"a".repeat(40)}`,
  });
});

const discountedRequest = (extra = {}, origin = "http://localhost") =>
  new Request("http://localhost/api/posters", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      area: "area:Berkeley",
      design: "d20",
      size: "letter",
      stripe: "CARD",
      btc: "BTC",
      ...extra,
    }),
  });

it("keeps public no-discount generation read-only", async () => {
  expect((await GET(request())).status).toBe(200);
  expect(posterDiscountAccess).not.toHaveBeenCalled();
  expect(ensurePosterDiscountLink).not.toHaveBeenCalled();
  expect(
    (await GET(request("area=generic&design=d20&size=letter&stripe=CARD")))
      .status,
  ).toBe(400);
});

it("requires staff access and same-origin requests before discount reads or writes", async () => {
  expect(
    (await POST(discountedRequest({}, "https://other.example"))).status,
  ).toBe(403);
  expect(posterDiscountAccess).not.toHaveBeenCalled();
  vi.mocked(posterDiscountAccess).mockResolvedValue(null);
  expect((await POST(discountedRequest())).status).toBe(403);
  expect(resolveStripePosterDiscount).not.toHaveBeenCalled();
  expect(resolveBtcPosterDiscount).not.toHaveBeenCalled();
  expect(ensurePosterDiscountLink).not.toHaveBeenCalled();
});

it("prepares the persisted variant and refreshes the staff list", async () => {
  const response = await POST(discountedRequest());
  expect(response.status).toBe(200);
  expect(ensurePosterDiscountLink).toHaveBeenCalledWith(
    link,
    { stripe: "CARD", btc: "BTC" },
    "Staff",
  );
  expect(createPosterPdf).toHaveBeenCalledWith(
    "d20",
    "letter",
    `pp-${"a".repeat(40)}`,
  );
  expect(response.headers.get("X-Poster-Slug")).toBe(`pp-${"a".repeat(40)}`);
  expect(revalidatePath).toHaveBeenCalledWith("/backstage/links");
});

it.each(["stripe", "btc"])(
  "rejects an invalid or expired %s selection without writing",
  async (rail) => {
    if (rail === "stripe")
      vi.mocked(resolveStripePosterDiscount).mockResolvedValue(null);
    else vi.mocked(resolveBtcPosterDiscount).mockResolvedValue(null);
    expect((await POST(discountedRequest())).status).toBe(409);
    expect(ensurePosterDiscountLink).not.toHaveBeenCalled();
    expect(createPosterPdf).not.toHaveBeenCalled();
  },
);

it("allows a single payment-specific discount and rejects malformed selections", async () => {
  expect((await POST(discountedRequest({ btc: "" }))).status).toBe(200);
  expect(resolveBtcPosterDiscount).not.toHaveBeenCalled();
  expect(ensurePosterDiscountLink).toHaveBeenCalledWith(
    link,
    { stripe: "CARD", btc: "" },
    "Staff",
  );
  for (const body of [
    { stripe: {}, btc: "" },
    { stripe: "", btc: "" },
    { stripe: "A".repeat(101) },
  ]) {
    expect((await POST(discountedRequest(body))).status).toBe(400);
  }
});

it("does not issue a PDF when persistence or verification fails", async () => {
  vi.mocked(ensurePosterDiscountLink).mockRejectedValue(
    new Error("private provider detail"),
  );
  const response = await POST(discountedRequest());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private provider");
  expect(createPosterPdf).not.toHaveBeenCalled();
});
it("downloads without login and never accepts an arbitrary URL or slug", async () => {
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/pdf");
  expect(response.headers.get("content-disposition")).toMatch(/^attachment;/);
  expect(createPosterPdf).toHaveBeenCalledWith("d20", "letter", "berkeley");
  const preview = await GET(
    request("area=area:Berkeley&design=d20&size=letter&preview=1"),
  );
  expect(preview.headers.get("content-disposition")).toMatch(/^inline;/);
  expect(
    (
      await GET(
        request(
          "area=mox-post&design=d20&size=letter&url=https://evil.example",
        ),
      )
    ).status,
  ).toBe(409);
});
it("rejects missing, inactive, or changed mappings before PDF generation", async () => {
  for (const result of [
    null,
    { ...link, active: false },
    { ...link, placement: "Mox" },
  ]) {
    vi.mocked(findTrackingLink).mockResolvedValue(result);
    expect((await GET(request())).status).toBe(409);
  }
  expect(createPosterPdf).not.toHaveBeenCalled();
});
it("rejects invalid designs and hides provider errors", async () => {
  expect(
    (await GET(request("area=generic&design=../../secret&size=letter"))).status,
  ).toBe(400);
  vi.mocked(loadPosterCatalog).mockRejectedValue(
    new Error("private provider detail"),
  );
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("private");
});
it.each([
  ["d20", "letter"],
  ["d20", "13x19"],
  ["chess", "letter"],
  ["chess", "13x19"],
])("allows %s %s", async (design, size) => {
  expect(
    (await GET(request(`area=area:Berkeley&design=${design}&size=${size}`)))
      .status,
  ).toBe(200);
  expect(createPosterPdf).toHaveBeenCalledWith(design, size, "berkeley");
});
