import { beforeEach, expect, it, vi } from "vitest";
// Better Auth and the permission store are faked; the gate in access.ts and
// admin-auth.ts is real, so these run the x-api-key path end to end.
const auth = vi.hoisted(() => ({
  headers: new Headers(),
  /** key → the permissions its account holds */
  keys: {} as Record<string, string[]>,
}));
vi.mock("next/headers", () => ({ headers: async () => auth.headers }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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
const stripe = vi.hoisted(() => ({
  coupons: { list: vi.fn() },
  promotionCodes: { create: vi.fn(), list: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/stripe-promo", () => ({
  getPromoStripe: vi.fn(() => stripe),
  promoMode: () => "test",
}));
import { GET, POST } from "./route";
import { getPromoStripe } from "@/lib/stripe-promo";

const KEY = "mg_promo";
const flyer = {
  customCode: "ELYSIAN",
  name: "Elysian flyer",
  purpose: "Flyer",
  notes: "Location flyer · elysian",
  maxUses: null,
  amountOffUsd: 100,
};
const promo = (overrides = {}) => ({
  id: "promo_1",
  code: "ELYSIAN",
  max_redemptions: null,
  metadata: { name: "Elysian flyer", source: "comp-tool" },
  promotion: { type: "coupon", coupon: "flyer100" },
  times_redeemed: 0,
  active: true,
  created: 1,
  ...overrides,
});
const coupon = (overrides = {}) => ({
  id: "flyer100",
  valid: true,
  amount_off: 10000,
  currency: "usd",
  percent_off: null,
  ...overrides,
});
/** What promotionCodes.list answers: `data` when awaited, or paged. */
const codes = (...data: object[]) => ({
  data,
  autoPagingToArray: async () => data,
});
const send = (body: unknown, key: string | null = KEY) => {
  auth.headers = new Headers(key ? { "x-api-key": key } : {});
  return POST(
    new Request("https://metagame.games/api/admin/promo", {
      method: "POST",
      headers: auth.headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
};
const check = (query: string) => {
  auth.headers = new Headers({ "x-api-key": KEY });
  return GET(new Request(`https://metagame.games/api/admin/promo${query}`));
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.keys = {
    [KEY]: ["promo.manage"],
    mg_minter: ["promo.create"],
    mg_viewer: ["promo.view"],
    mg_links: ["links.manage"],
  };
  stripe.coupons.list.mockReturnValue({
    autoPagingToArray: async () => [
      coupon(),
      coupon({ id: "half", amount_off: null, percent_off: 50 }),
      coupon({ id: "old100", valid: false }),
      coupon({ id: "eur100", currency: "eur" }),
    ],
  });
  stripe.promotionCodes.list.mockResolvedValue(codes());
  stripe.promotionCodes.create.mockImplementation(async (params) =>
    promo({
      code: params.code,
      metadata: params.metadata,
      promotion: params.promotion,
      max_redemptions: params.max_redemptions ?? null,
    }),
  );
});

it("needs a key whose account holds promo.create", async () => {
  const none = await send(flyer, null);
  expect(none.status).toBe(401);
  expect(await none.json()).toEqual({ error: "Send an API key in x-api-key." });
  expect((await send(flyer, "mg_revoked")).status).toBe(401);
  const other = await send(flyer, "mg_links");
  expect(other.status).toBe(403);
  expect((await other.json()).error).toContain("promo.create");
  auth.headers = new Headers();
  expect(
    (await GET(new Request("https://metagame.games/api/admin/promo"))).status,
  ).toBe(401);
  expect(stripe.promotionCodes.create).not.toHaveBeenCalled();
});

it("lets a promo.view key read codes but not mint them", async () => {
  const minted = await send(flyer, "mg_viewer");
  expect(minted.status).toBe(403);
  expect((await minted.json()).error).toContain("promo.create");
  expect(stripe.promotionCodes.create).not.toHaveBeenCalled();
  auth.headers = new Headers({ "x-api-key": "mg_viewer" });
  const listed = await GET(
    new Request("https://metagame.games/api/admin/promo?code=elysian"),
  );
  expect(listed.status).toBe(200);
  expect(await listed.json()).toEqual({ exists: false });
});

it("lets a promo.create key mint without promo.manage", async () => {
  const minted = await send(flyer, "mg_minter");
  expect(minted.status).toBe(201);
  expect(stripe.promotionCodes.create).toHaveBeenCalledTimes(1);
});

it("mints an unlimited code on the one active $100-off coupon", async () => {
  const response = await send(flyer);
  expect(response.status).toBe(201);
  expect(await response.json()).toEqual({
    code: "ELYSIAN",
    id: "promo_1",
    active: true,
    couponId: "flyer100",
    max: null,
    test: true,
  });
  const params = stripe.promotionCodes.create.mock.calls[0][0];
  expect(params).toMatchObject({
    code: "ELYSIAN",
    promotion: { type: "coupon", coupon: "flyer100" },
    metadata: {
      name: "Elysian flyer",
      purpose: "Flyer",
      notes: "Location flyer · elysian",
      issued_by: "Libi",
    },
  });
  expect(params).not.toHaveProperty("max_redemptions");
});

it("takes a couponId instead, and leaves uses unlimited unless told otherwise", async () => {
  // undefined drops out of the JSON, as if never sent.
  await send({
    ...flyer,
    amountOffUsd: undefined,
    maxUses: undefined,
    couponId: "flyer100",
  });
  expect(stripe.coupons.list).not.toHaveBeenCalled();
  const params = stripe.promotionCodes.create.mock.calls[0][0];
  expect(params).toMatchObject({ promotion: { coupon: "flyer100" } });
  expect(params).not.toHaveProperty("max_redemptions");
  await send({ ...flyer, maxUses: 25 });
  expect(stripe.promotionCodes.create.mock.calls[1][0].max_redemptions).toBe(
    25,
  );
});

it.each([
  ["a blank name", { name: " " }],
  ["a missing purpose", { purpose: undefined }],
  ["a purpose not in the dropdown", { purpose: "Location flyer" }],
  ["a custom code with a space", { customCode: "ELYSIAN FIELDS" }],
  ["zero maxUses", { maxUses: 0 }],
  ["maxUses that aren't a number", { maxUses: "many" }],
  ["an amount as a string", { amountOffUsd: "100" }],
  ["a zero amount", { amountOffUsd: 0 }],
  ["both a coupon and an amount", { amountOffUsd: 100, couponId: "flyer100" }],
])("refuses %s before Stripe", async (_, change) => {
  const field = Object.keys(change)[0];
  const response = await send({ ...flyer, ...change });
  expect(response.status).toBe(400);
  expect((await response.json()).field).toBe(field);
  expect(stripe.promotionCodes.list).not.toHaveBeenCalled();
  expect(stripe.promotionCodes.create).not.toHaveBeenCalled();
});

it("refuses to mint without a coupon rather than defaulting to the comp one", async () => {
  // A misspelled amountOffUsd used to fall through to COMP_COUPON_ID.
  const { amountOffUsd, ...rest } = flyer;
  for (const body of [rest, { ...rest, amountOffUSD: amountOffUsd }]) {
    const response = await send(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Send couponId or amountOffUsd.",
      field: "couponId",
    });
  }
  expect(stripe.promotionCodes.create).not.toHaveBeenCalled();
});

it("refuses an amount no coupon, or more than one, takes off", async () => {
  const none = await send({ ...flyer, amountOffUsd: 75 });
  expect(none.status).toBe(400);
  expect(await none.json()).toEqual({
    error: "No active coupon takes $75 off.",
    field: "amountOffUsd",
  });
  stripe.coupons.list.mockReturnValue({
    autoPagingToArray: async () => [coupon(), coupon({ id: "flyer100b" })],
  });
  const two = await send(flyer);
  expect(two.status).toBe(400);
  expect((await two.json()).error).toContain("flyer100, flyer100b");
  expect(stripe.promotionCodes.create).not.toHaveBeenCalled();
});

it("refuses a body that isn't a JSON object", async () => {
  expect((await send("name=Elysian")).status).toBe(400);
  expect((await send([flyer])).status).toBe(400);
});

it("409s a custom code that already exists, archived or not", async () => {
  stripe.promotionCodes.list.mockResolvedValue(codes(promo()));
  const taken = await send(flyer);
  expect(taken.status).toBe(409);
  expect(await taken.json()).toEqual({
    error: "Code ELYSIAN already exists.",
    field: "customCode",
    existing: { id: "promo_1", active: true, couponId: "flyer100" },
  });
  expect(stripe.promotionCodes.list).toHaveBeenCalledWith({
    code: "ELYSIAN",
    limit: 10,
  });
  stripe.promotionCodes.list.mockResolvedValue(codes(promo({ active: false })));
  expect((await (await send(flyer)).json()).error).toContain("(archived)");
  expect(stripe.promotionCodes.create).not.toHaveBeenCalled();
});

it("409s a code someone else takes between the check and the mint", async () => {
  stripe.promotionCodes.list
    .mockResolvedValueOnce(codes())
    .mockResolvedValueOnce(
      codes(promo({ metadata: { name: "Someone Else", source: "comp-tool" } })),
    );
  stripe.promotionCodes.create.mockRejectedValue(
    Object.assign(new Error("already exists"), {
      code: "resource_already_exists",
    }),
  );
  const response = await send(flyer);
  expect(response.status).toBe(409);
  expect((await response.json()).field).toBe("customCode");
});

it("pins an unknown coupon on couponId and says when Stripe is off", async () => {
  stripe.promotionCodes.create.mockRejectedValue(
    Object.assign(new Error("No such coupon: 'nope'"), {
      type: "StripeInvalidRequestError",
      param: "promotion[coupon]",
    }),
  );
  const unknown = await send({
    ...flyer,
    amountOffUsd: undefined,
    couponId: "nope",
  });
  expect(unknown.status).toBe(400);
  expect(await unknown.json()).toEqual({
    error: "No such coupon: 'nope'",
    field: "couponId",
  });

  vi.mocked(getPromoStripe).mockReturnValueOnce(null);
  expect((await send(flyer)).status).toBe(503);
});

it("answers whether a code exists, in any case", async () => {
  expect(await (await check("?code=elysian")).json()).toEqual({
    exists: false,
  });
  expect(stripe.promotionCodes.list).toHaveBeenCalledWith({
    code: "ELYSIAN",
    limit: 10,
  });
  stripe.promotionCodes.list.mockResolvedValue(
    codes(promo({ active: false }), promo({ id: "promo_2" })),
  );
  expect(await (await check("?code=ELYSIAN")).json()).toEqual({
    exists: true,
    id: "promo_2",
    active: true,
    couponId: "flyer100",
  });
  for (const query of ["?code=ELYSIAN%20FIELDS", "?code="]) {
    const bad = await check(query);
    expect(bad.status).toBe(400);
    expect((await bad.json()).field).toBe("code");
  }
});

it("lists only the codes the promo tool minted", async () => {
  stripe.promotionCodes.list.mockReturnValue(
    codes(promo(), promo({ id: "promo_2", code: "OTHER", metadata: {} })),
  );
  const response = await check("");
  expect(response.status).toBe(200);
  const { codes: listed } = await response.json();
  expect(listed.map((c: { code: string }) => c.code)).toEqual(["ELYSIAN"]);
});
