import { beforeEach, expect, it, vi } from "vitest";
// Same fakes as links/route.test.ts: the x-api-key gate is real, the store is not.
const auth = vi.hoisted(() => ({
  headers: new Headers(),
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
    denies: [],
    roleIds: [],
  }),
}));
vi.mock("@/lib/referral-store", () => ({
  findReferrerTicket: vi.fn(),
  setReferrer: vi.fn(),
}));
import { DELETE, PUT } from "./route";
import { findReferrerTicket, setReferrer } from "@/lib/referral-store";

const KEY = "mg_tickets";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const put = (id: string, body: unknown, key: string | null = KEY) => {
  auth.headers = new Headers(key ? { "x-api-key": key } : {});
  return PUT(
    new Request(`https://metagame.games/api/admin/tickets/${id}/referral`, {
      method: "PUT",
      headers: auth.headers,
      body: JSON.stringify(body),
    }),
    ctx(id),
  );
};
const del = (id: string, key: string | null = KEY) => {
  auth.headers = new Headers(key ? { "x-api-key": key } : {});
  return DELETE(new Request("https://metagame.games"), ctx(id));
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.keys = { [KEY]: ["tickets.edit"], mg_view: ["tickets.view"] };
  vi.mocked(findReferrerTicket).mockImplementation(async (code) =>
    code === "A2C4EF"
      ? { paymentId: "pi_ref", ticketCode: "A2C4EF", tier: "standard" }
      : code === "B00TH1"
        ? { paymentId: "pi_booth", ticketCode: "B00TH1", tier: "Night Market" }
        : null,
  );
  vi.mocked(setReferrer).mockResolvedValue(true);
});

it("needs a key whose account holds tickets.edit", async () => {
  expect((await put("pi_1", { referrerCode: "A2C-4EF" }, null)).status).toBe(
    401,
  );
  const view = await put("pi_1", { referrerCode: "A2C-4EF" }, "mg_view");
  expect(view.status).toBe(403);
  expect((await view.json()).error).toContain("tickets.edit");
  expect((await del("pi_1", "mg_view")).status).toBe(403);
  expect(setReferrer).not.toHaveBeenCalled();
});

it("sets the referrer from a typed ticket code", async () => {
  const res = await put("pi_1", { referrerCode: " a2c-4ef " });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ referredBy: "A2C-4EF" });
  expect(findReferrerTicket).toHaveBeenCalledWith("A2C4EF");
  expect(setReferrer).toHaveBeenCalledWith("pi_1", "pi_ref");
});

it("rejects unknown, self and non-referring tickets", async () => {
  const unknown = await put("pi_1", { referrerCode: "ZZZZZZ" });
  expect(unknown.status).toBe(404);
  expect(await unknown.json()).toEqual({
    error: "No paid ticket has that code.",
    field: "referrerCode",
  });
  expect((await put("pi_ref", { referrerCode: "A2C4EF" })).status).toBe(400);
  expect((await put("pi_1", { referrerCode: "B00TH1" })).status).toBe(400);
  expect((await put("pi_1", { referrerCode: "" })).status).toBe(400);
  expect(setReferrer).not.toHaveBeenCalled();
});

it("404s a ticket that isn't there", async () => {
  vi.mocked(setReferrer).mockResolvedValue(false);
  expect((await put("pi_gone", { referrerCode: "A2C4EF" })).status).toBe(404);
  expect((await del("pi_gone")).status).toBe(404);
});

it("clears the referrer", async () => {
  const res = await del("pi_1");
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ referredBy: null });
  expect(setReferrer).toHaveBeenCalledWith("pi_1", null);
});
