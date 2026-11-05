import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COMMITTEE_NAMES } from "./rfp-labels";

const secret = "private.person@example.com";

const load = async (raw: string | undefined) => {
  vi.resetModules();
  vi.doMock("@/env", () => ({
    env: { AIRTABLE_API_KEY: "test", COMMITTEE_EMAILS: raw },
  }));
  vi.doMock("@/db", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/db")>()),
    getDb: () => {
      throw new Error("should not reach the database");
    },
  }));
  return { committee: await import("./rfp-committee") };
};

// Reloading rfp-sessions' import graph is slow on a busy machine.
describe("COMMITTEE_EMAILS", { timeout: 60_000 }, () => {
  const error = vi.spyOn(console, "error");
  beforeEach(() => {
    error.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.doUnmock("@/env");
    vi.doUnmock("@/db");
  });

  it("maps emails to names, case-insensitively, when configured", async () => {
    const all = COMMITTEE_NAMES.map((name, i) => [name, `m${i}@example.com`]);
    const { committee } = await load(
      JSON.stringify({
        ...Object.fromEntries(all),
        Jisk: " Jisk@Example.COM ",
      }),
    );
    expect(committee.committeeConfigured()).toBe(true);
    expect(committee.committeeName("JISK@example.com")).toBe("Jisk");
    expect(committee.committeeName("nobody@example.com")).toBeNull();
    expect(error).not.toHaveBeenCalled();
  });

  it.each([
    ["unset", undefined],
    ["blank", "  "],
    ["empty", "{}"],
  ])("gives no committee when %s", async (_label, raw) => {
    const { committee } = await load(raw);
    const sessions = await import("./rfp-sessions");
    expect(committee.committeeConfigured()).toBe(false);
    expect(committee.committeeName("anyone@example.com")).toBeNull();
    await expect(sessions.committeeAccounts()).resolves.toEqual([]);
    await expect(sessions.committeeUserId("Jisk")).resolves.toBeNull();
  });

  it.each([
    ["broken JSON", `{"Jisk":"${secret}"`],
    ["an array", `["${secret}"]`],
    ["null", "null"],
    ["a string", `"${secret}"`],
  ])("ignores %s without logging the value", async (_label, raw) => {
    const { committee } = await load(raw);
    expect(committee.COMMITTEE_EMAILS).toEqual({});
    expect(error).toHaveBeenCalledOnce();
    expect(JSON.stringify(error.mock.calls)).not.toContain(secret);
  });

  it("keeps the good entries and names the missing ones", async () => {
    const { committee } = await load(
      JSON.stringify({ Jisk: secret, "Ben Karcher": 7, "Sparr Risher": "x" }),
    );
    expect(committee.COMMITTEE_EMAILS).toEqual({ Jisk: secret });
    expect(committee.committeeConfigured()).toBe(true);
    const logged = JSON.stringify(error.mock.calls);
    expect(logged).toContain("Ben Karcher");
    expect(logged).toContain("Sparr Risher");
    expect(logged).not.toContain(secret);
  });

  it("leaves Airtable's cells alone when unset, but can still clear them", async () => {
    await load(undefined);
    const mirror = await import("./rfp-mirror");
    const account = { email: "a@example.com", name: "Display Name" };
    expect(mirror.graderWrite(account)).toBeNull();
    expect(mirror.shepherdWrite(account)).toBeNull();
    expect(mirror.graderWrite(null)?.fields).toEqual({
      "Rubric: Grader": "Unassigned",
    });
    expect(mirror.shepherdWrite(null)?.fields).toEqual({ Shepherd: null });
  });
});
