import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/env", () => ({ env: { AIRTABLE_API_KEY: "fixture-only" } }));
import {
  discountFromFields,
  listBtcPosterDiscounts,
  resolveBtcPosterDiscount,
} from "./discount-codes";
import { airtableConfig } from "./airtable-config";
const fields = { Code: "BTC", Active: true, Method: "BTC", "BTC Off": 0.0015 };
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv("OPENNODE_ENV", "live");
  fetchMock
    .mockReset()
    .mockImplementation(async () => Response.json({ records: [{ fields }] }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("uses existing BTC definitions and canonical codes", async () => {
  expect(await listBtcPosterDiscounts()).toEqual([
    { code: "BTC", label: "BTC — BTC 0.005" },
  ]);
  expect(await resolveBtcPosterDiscount("btc")).toMatchObject({
    status: "valid",
    code: "BTC",
    btcPrice: 0.005,
  });
});
it.each([
  { Expires: "2000-01-01" },
  { Expires: "invalid" },
  { Test: true },
  { "BTC Off": -1 },
  { "BTC Off": 1 },
])("rejects expired, test or invalid definitions: %o", async (patch) => {
  expect(
    discountFromFields({ ...fields, ...patch }, "BTC", { allowTest: false })
      .status,
  ).not.toBe("valid");
  fetchMock.mockResolvedValue(
    Response.json({ records: [{ fields: { ...fields, ...patch } }] }),
  );
  expect(await resolveBtcPosterDiscount("BTC")).toBeNull();
});
it("rejects test codes for printed posters even in sandbox", () => {
  vi.stubEnv("OPENNODE_ENV", "dev");
  expect(
    discountFromFields({ ...fields, Test: true }, "BTC", { allowTest: false })
      .status,
  ).toBe("test");
});
it("fails closed for duplicate codes", async () => {
  fetchMock.mockImplementation(async () =>
    Response.json({ records: [{ fields }, { fields }] }),
  );
  expect(await listBtcPosterDiscounts()).toEqual([]);
  expect(await resolveBtcPosterDiscount("BTC")).toBeNull();
});
it("checks redemption caps and refuses an unverifiable count", async () => {
  const capped = { ...fields, "Max Uses": 1 };
  fetchMock.mockImplementation(async (url: string) =>
    Response.json({
      records: url.includes(airtableConfig.discountCodesTableId)
        ? [{ fields: capped }]
        : [{}],
    }),
  );
  expect(await resolveBtcPosterDiscount("BTC")).toBeNull();
  expect(await listBtcPosterDiscounts()).toEqual([]);
  fetchMock.mockImplementation(async (url: string) =>
    url.includes(airtableConfig.discountCodesTableId)
      ? Response.json({ records: [{ fields: capped }] })
      : new Response("unavailable", { status: 503 }),
  );
  await expect(resolveBtcPosterDiscount("BTC")).rejects.toThrow(
    "verification unavailable",
  );
});
it("paginates the list and does not issue writes", async () => {
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    expect(init.method).toBeUndefined();
    expect(init.cache).toBe("no-store");
    return Response.json(
      url.includes("offset=next")
        ? { records: [{ fields: { ...fields, Code: "SECOND" } }] }
        : { records: [{ fields }], offset: "next" },
    );
  });
  expect((await listBtcPosterDiscounts()).map((o) => o.code)).toEqual([
    "BTC",
    "SECOND",
  ]);
});
