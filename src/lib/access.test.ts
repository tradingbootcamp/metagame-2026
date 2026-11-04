import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("./auth", () => ({
  accountsConfigured: () => true,
  getAuth: () => ({ api: { getSession } }),
}));
vi.mock("./permission-store", () => ({ userAccess: vi.fn() }));

import { liveSession } from "./access";

beforeEach(() => getSession.mockReset());

describe("liveSession", () => {
  it("reads past the cookie cache", async () => {
    const session = { user: { id: "u", banned: false } };
    getSession.mockResolvedValue(session);
    await expect(liveSession()).resolves.toBe(session);
    expect(getSession.mock.calls[0][0].query).toEqual({
      disableCookieCache: true,
    });
  });

  it("is null for a revoked session", async () => {
    getSession.mockResolvedValue(null);
    await expect(liveSession()).resolves.toBeNull();
  });

  it("is null for a banned account", async () => {
    getSession.mockResolvedValue({ user: { id: "u", banned: true } });
    await expect(liveSession()).resolves.toBeNull();
  });
});
