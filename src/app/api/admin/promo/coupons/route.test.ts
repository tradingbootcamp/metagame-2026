import { beforeEach, expect, it, vi } from "vitest";
// Same fakes as ../route.test.ts: Better Auth and the permission store are
// faked, the gate is real.
const auth = vi.hoisted(() => ({
  headers: new Headers(),
  keys: {} as Record<string, string[]>,
}));
vi.mock("next/headers", () => ({ headers: async () => auth.headers }));
vi.mock("@/lib/auth", () => ({
  API_KEY_HEADER: "x-api-key",
  accountsConfigured: () => true,
  accountLabel: (user: { name: string }) => user.name,
  getAuth: () => ({
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const key = headers.get("x-api-key") ?? "";
        return key in auth.keys
          ? { user: { id: key, name: "Libi", role: "user" } }
          : null;
      },
      verifyApiKey: async ({ body }: { body: { key: string } }) => ({
        valid: body.key in auth.keys,
      }),
    },
  }),
}));
vi.mock("@/lib/permission-store", () => ({
  userAccess: async (userId: string) => ({
    admin: false,
    roles: [],
    grants: auth.keys[userId],
    roleIds: [],
  }),
}));
const stripe = vi.hoisted(() => ({ coupons: { list: vi.fn() } }));
vi.mock("@/lib/stripe-promo", () => ({
  getPromoStripe: vi.fn(() => stripe),
  promoMode: () => "test",
}));
vi.mock("@/env", () => ({ env: { COMP_COUPON_ID: "free" } }));

import { GET } from "./route";

const KEY = "mg_promo";
const coupon = (overrides = {}) => ({
  id: "flyer80",
  name: "$80 Off",
  valid: true,
  amount_off: 8000,
  currency: "usd",
  percent_off: null,
  ...overrides,
});
const get = (key: string | null = KEY) => {
  auth.headers = new Headers(key ? { "x-api-key": key } : {});
  return GET();
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.keys = { [KEY]: ["promo.manage"], mg_links: ["links.manage"] };
  stripe.coupons.list.mockReturnValue({
    autoPagingToArray: async () => [
      coupon(),
      coupon({
        id: "free",
        name: "Free Ticket",
        amount_off: null,
        percent_off: 100,
      }),
      coupon({ id: "old80", valid: false }),
      coupon({ id: "flyer50", name: "$50 Off", amount_off: 5000 }),
    ],
  });
});

it("needs a key whose account holds promo.view", async () => {
  expect((await get(null)).status).toBe(401);
  expect((await get("mg_revoked")).status).toBe(401);
  const other = await get("mg_links");
  expect(other.status).toBe(403);
  expect((await other.json()).error).toContain("promo.view");
  expect(stripe.coupons.list).not.toHaveBeenCalled();
});

it("lists the valid coupons with their amounts, cheapest first", async () => {
  const response = await get();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    coupons: [
      {
        id: "flyer50",
        label: "$50 Off — $50.00 off",
        kind: "amount",
        amountOff: 50,
        currency: "usd",
        isDefault: false,
      },
      {
        id: "flyer80",
        label: "$80 Off — $80.00 off",
        kind: "amount",
        amountOff: 80,
        currency: "usd",
        isDefault: false,
      },
      {
        id: "free",
        label: "Free Ticket — 100% off",
        kind: "percent",
        percentOff: 100,
        isDefault: true,
      },
    ],
  });
});

it("answers 502 when Stripe fails", async () => {
  stripe.coupons.list.mockReturnValue({
    autoPagingToArray: async () => {
      throw new Error("Stripe is down");
    },
  });
  const response = await get();
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: "Stripe is down" });
});
