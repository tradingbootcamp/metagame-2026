import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as schema from "@/db/schema";
import type { PurchaseRecord } from "./airtable";

// Migrating PGlite takes seconds on a busy machine.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 60_000 });

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db", async () => ({
  getDb: () => holder.db,
  schema: await vi.importActual("@/db/schema"),
}));
vi.mock("@/env", () => ({ env: { DATABASE_URL: "pglite" } }));
vi.mock("./airtable", () => ({
  updatePurchaseTicketCode: vi.fn().mockResolvedValue(true),
}));
vi.mock("./email", () => ({ sendAdminErrorEmail: vi.fn() }));

import { lookupReferrer, referralCounts } from "./referral-store";
import {
  claimOwnTicket,
  claimTicket,
  hasClaimedTicket,
  recordTicket,
  unclaimTicket,
} from "./ticket-store";
import { unvoidTicket, voidTicket } from "./ticket-void";

const { tickets, user } = schema;

let client: PGlite;
let db: PgliteDatabase<typeof schema>;

const row = async (id: string) =>
  (await db.select().from(tickets).where(eq(tickets.paymentId, id)))[0];

const ticket = (paymentId: string, ticketCode: string, over = {}) =>
  db.insert(tickets).values({
    paymentId,
    ticketCode,
    source: "stripe",
    status: "paid",
    purchaserEmail: "buyer@example.com",
    ...over,
  });

const purchase: PurchaseRecord = {
  id: "pi_1",
  status: "Paid",
  test: false,
  paymentMethod: "stripe",
  customerEmail: "buyer@example.com",
};

beforeAll(async () => {
  client = new PGlite();
  db = drizzle({ client, schema, casing: "snake_case" });
  holder.db = db;
  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, "../../drizzle"),
  });
  for (const id of ["ada", "bob"])
    await db.insert(user).values({
      id,
      name: id,
      email: `${id}@example.com`,
      emailVerified: true,
    });
});

afterAll(() => client.close());

beforeEach(async () => {
  await db.delete(tickets);
  await db.delete(schema.verification);
});

describe("void and undo", () => {
  it("records who and when, and undo keeps the record", async () => {
    await ticket("pi_1", "AAAAAA");
    expect(await voidTicket("pi_1", "Libi")).toBe(true);
    const voided = await row("pi_1");
    expect(voided).toMatchObject({
      voided: true,
      voidedBy: "Libi",
      status: "paid",
    });
    expect(voided.voidedAt).toBeInstanceOf(Date);

    expect(await unvoidTicket("pi_1", "Yoav")).toBe(true);
    const undone = await row("pi_1");
    expect(undone).toMatchObject({
      voided: false,
      voidedBy: "Libi",
      unvoidedBy: "Yoav",
    });
    expect(undone.voidedAt).toEqual(voided.voidedAt);
    expect(undone.unvoidedAt).toBeInstanceOf(Date);
  });

  it("repeating either is a no-op, and a missing ticket is false", async () => {
    await ticket("pi_1", "AAAAAA");
    await voidTicket("pi_1", "Libi");
    expect(await voidTicket("pi_1", "Someone else")).toBe(false);
    expect((await row("pi_1")).voidedBy).toBe("Libi");
    await unvoidTicket("pi_1", "Yoav");
    expect(await unvoidTicket("pi_1", "Someone else")).toBe(false);
    expect((await row("pi_1")).unvoidedBy).toBe("Yoav");
    expect(await voidTicket("pi_gone", "Libi")).toBe(false);
  });

  it("a webhook retry can't revive a voided ticket", async () => {
    await recordTicket(purchase);
    await voidTicket("pi_1", "Libi");
    await recordTicket(purchase);
    expect(await row("pi_1")).toMatchObject({ voided: true, status: "paid" });
  });

  it("columns default for writers that don't know about them", async () => {
    await client.query(
      `insert into tickets (payment_id, ticket_code, source, status)
       values ('pi_old', 'OOOOOO', 'stripe', 'paid')`,
    );
    expect((await row("pi_old")).voided).toBe(false);
  });
});

describe("a voided ticket", () => {
  it("can't be claimed, by code or by its holder", async () => {
    await ticket("pi_1", "AAAAAA", { voided: true });
    expect(await claimTicket("ada", "AAAAAA")).toEqual({
      ok: false,
      reason: "voided",
    });
    expect(await claimOwnTicket("ada", "buyer@example.com", "pi_1")).toEqual({
      ok: false,
      reason: "voided",
    });
    expect((await row("pi_1")).ownerUserId).toBeNull();
  });

  it("stops holding its owner's admission, and undo restores it", async () => {
    await ticket("pi_1", "AAAAAA", { ownerUserId: "ada" });
    await ticket("pi_2", "BBBBBB");
    expect(await hasClaimedTicket("ada")).toBe(true);

    await voidTicket("pi_1", "Libi");
    expect(await hasClaimedTicket("ada")).toBe(false);
    expect(await claimTicket("ada", "AAAAAA")).toEqual({
      ok: false,
      reason: "voided",
    });

    await unvoidTicket("pi_1", "Libi");
    expect(await hasClaimedTicket("ada")).toBe(true);
    expect((await row("pi_1")).ownerUserId).toBe("ada");
  });

  it("frees its owner to claim a different ticket", async () => {
    await ticket("pi_1", "AAAAAA", { ownerUserId: "ada", voided: true });
    await ticket("pi_2", "BBBBBB");
    const result = await claimTicket("ada", "BBBBBB");
    expect(result.ok).toBe(true);
  });

  it("can't be unclaimed for a fresh code", async () => {
    await ticket("pi_1", "AAAAAA", { ownerUserId: "ada", voided: true });
    expect(await unclaimTicket("ada", "pi_1")).toEqual({
      ok: false,
      reason: "notYours",
    });
    expect((await row("pi_1")).ticketCode).toBe("AAAAAA");
  });

  it("stops its referral code working and counting", async () => {
    await ticket("pi_1", "AAAAAA", { referralCode: "REFERRAL" });
    await ticket("pi_2", "BBBBBB", { referredByPaymentId: "pi_1" });
    expect(await lookupReferrer("REFERRAL")).toBe("pi_1");
    expect((await referralCounts(["pi_1"])).get("pi_1")).toBe(1);

    await voidTicket("pi_1", "Libi");
    await voidTicket("pi_2", "Libi");
    expect(await lookupReferrer("REFERRAL")).toBeNull();
    expect((await referralCounts(["pi_1"])).get("pi_1")).toBeUndefined();
  });
});
