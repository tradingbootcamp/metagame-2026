import { getTableColumns } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tickets } from "@/db/schema";
import { fakeNeon, type Statement } from "@/test/fake-neon";

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db", async () => ({
  getDb: () => holder.db,
  schema: await vi.importActual("@/db/schema"),
}));
vi.mock("./airtable", () => ({ updatePurchaseTicketCode: vi.fn() }));
vi.mock("./email", () => ({ sendAdminErrorEmail: vi.fn() }));

import { claimTicket } from "./ticket-store";

const ticketRow = (over: Record<string, unknown>) =>
  Object.keys(getTableColumns(tickets)).map((column) => over[column] ?? null);

function database(answer: (s: Statement) => unknown[][] | void = () => {}) {
  const neon = fakeNeon((s) => (/count\(/.test(s.sql) ? [[0]] : answer(s)));
  holder.db = neon.db;
  return neon;
}

beforeEach(() => vi.clearAllMocks());

describe("claiming a ticket", () => {
  it("takes the account's lock in one transaction, before the check", async () => {
    const { batches } = database();
    await claimTicket("user_1", "AAAAAA");
    expect(batches).toHaveLength(1);
    const [lock, claim] = batches[0];
    expect(lock.sql).toContain("pg_advisory_xact_lock");
    expect(lock.params).toEqual(["ticket-claim:user_1"]);
    expect(claim.sql).toMatch(/^update "tickets"/);
    expect(claim.sql).toContain("not exists");
    expect(claim.params).toContain("user_1");
  });

  it("locks per account, so strangers don't wait on each other", async () => {
    const { batches } = database();
    await claimTicket("user_1", "AAAAAA");
    await claimTicket("user_2", "BBBBBB");
    expect(batches[0][0].params).not.toEqual(batches[1][0].params);
  });

  it("returns the ticket the update claimed", async () => {
    database((s) =>
      s.sql.startsWith("update")
        ? [ticketRow({ paymentId: "pi_1", ownerUserId: "user_1" })]
        : undefined,
    );
    await expect(claimTicket("user_1", "AAAAAA")).resolves.toMatchObject({
      ok: true,
      ticket: { paymentId: "pi_1", ownerUserId: "user_1" },
    });
  });

  it("tells the second of two claims they already have one", async () => {
    database((s) => {
      if (s.sql.startsWith("update")) return [];
      if (s.params.includes("BBBBBB")) {
        return [ticketRow({ paymentId: "pi_2", status: "paid" })];
      }
      if (s.params.includes("user_1")) return [["pi_1"]];
    });
    await expect(claimTicket("user_1", "BBBBBB")).resolves.toEqual({
      ok: false,
      reason: "already",
    });
  });
});
