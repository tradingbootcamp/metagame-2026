import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/env", () => ({ env: { AIRTABLE_API_KEY: "fixture-only" } }));
import {
  ensurePosterDiscountLink,
  posterVariant,
} from "./poster-discount-links";
import type { TrackingLink } from "./tracking-links";
import { posterChoices } from "./poster-options";

const base: TrackingLink = {
  id: "base-row",
  slug: "berkeley",
  destination: "https://metagame.games/",
  source: "poster",
  medium: "print",
  campaign: "metagame-2026",
  placement: "Berkeley",
  internalName: "Berkeley",
  createdBy: "Original",
  createdAt: "2026-01-01",
  active: true,
  template: false,
};
const discounts = { stripe: "CARD", btc: "BTC" };
type Row = { id: string; createdTime: string; fields: Record<string, unknown> };
let rows: Row[];
let loseResponse: boolean;
const fetchMock = vi.fn();
beforeEach(() => {
  rows = [];
  loseResponse = false;
  fetchMock
    .mockReset()
    .mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        expect(body.performUpsert).toEqual({
          fieldsToMergeOn: ["Slug", "Destination"],
        });
        const fields = body.records[0].fields;
        let row = rows.find(
          (r) =>
            r.fields.Slug === fields.Slug &&
            r.fields.Destination === fields.Destination,
        );
        if (!row) {
          row = { id: `row-${rows.length}`, createdTime: "2026-01-01", fields };
          rows.push(row);
        }
        if (loseResponse) {
          loseResponse = false;
          throw new Error("connection lost after write");
        }
        return Response.json({ records: [row] });
      }
      return Response.json({ records: rows });
    });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it("reuses one persisted QR across concurrent preparations, retries, and staff", async () => {
  const result = await Promise.all([
    ensurePosterDiscountLink(base, discounts, "One"),
    ensurePosterDiscountLink(base, discounts, "Two"),
  ]);
  expect(rows).toHaveLength(1);
  expect(result[0].slug).toBe(result[1].slug);
  expect(result[0].slug).toMatch(/^pp-[a-f0-9]{40}$/);
  const writes = fetchMock.mock.calls.filter(
    ([, init]) => init?.method === "PATCH",
  ).length;
  expect((await ensurePosterDiscountLink(base, discounts, "Three")).id).toBe(
    result[0].id,
  );
  expect(
    fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
  ).toHaveLength(writes);
  expect(base.slug).toBe("berkeley");
});

it("recovers an uncertain write by finding the saved row on retry", async () => {
  loseResponse = true;
  await expect(
    ensurePosterDiscountLink(base, discounts, "One"),
  ).rejects.toThrow();
  expect(rows).toHaveLength(1);
  await expect(
    ensurePosterDiscountLink(base, discounts, "One"),
  ).resolves.toMatchObject({ id: "row-0" });
  expect(
    fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH"),
  ).toHaveLength(1);
});

it("rejects conflicting, inactive, and duplicate saved slugs without rewriting them", async () => {
  await ensurePosterDiscountLink(base, discounts, "One");
  const original = structuredClone(rows[0]);
  for (const changed of [
    { Destination: "https://metagame.games/other" },
    { Active: false },
    { Template: true },
  ]) {
    rows = [{ ...original, fields: { ...original.fields, ...changed } }];
    fetchMock.mockClear();
    await expect(
      ensurePosterDiscountLink(base, discounts, "Two"),
    ).rejects.toThrow();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH"),
    ).toBe(false);
  }
  rows = [original, { ...original, id: "duplicate" }];
  await expect(
    ensurePosterDiscountLink(base, discounts, "One"),
  ).rejects.toThrow("Ambiguous");
});

it("keeps legacy public choices unambiguous and separates discount combinations", async () => {
  const variant = await ensurePosterDiscountLink(base, discounts, "One");
  expect(posterChoices([base, variant])).toHaveLength(1);
  expect(posterChoices([base, variant])[0].slug).toBe("berkeley");
  expect(
    posterVariant(base, { stripe: "OTHER", btc: "BTC" }, "One").slug,
  ).not.toBe(variant.slug);
  expect(posterVariant(base, { stripe: "CARD", btc: "" }, "One").slug).not.toBe(
    variant.slug,
  );
  expect(() => posterVariant(base, { stripe: "", btc: "" }, "One")).toThrow();
});
