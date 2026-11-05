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
import {
  STRIPE_REFUND,
  unvoidTicket,
  voidRefundedCharge,
  voidTicket,
} from "./ticket-void";

const { tickets, ticketRefunds, user } = schema;

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

const fullRefund = (payment_intent: string | null) => ({
  id: "ch_1",
  refunded: true,
  payment_intent,
});

const partialRefund = (payment_intent: string) => ({
  ...fullRefund(payment_intent),
  refunded: false,
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
  await db.delete(ticketRefunds);
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
    expect(await unclaimTicket("ada", "pi_1")).toBeNull();
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

describe("refunds", () => {
  it("a full refund voids the ticket, attributed to Stripe", async () => {
    await ticket("pi_1", "AAAAAA");
    expect(await voidRefundedCharge(fullRefund("pi_1"), "evt_1")).toBe(1);
    expect(await row("pi_1")).toMatchObject({
      voided: true,
      voidedBy: STRIPE_REFUND,
      refundEventId: "evt_1",
      status: "paid",
    });
    expect((await row("pi_1")).voidedAt).toBeInstanceOf(Date);
  });

  it("a full refund voids a whole pack and nothing else", async () => {
    for (const n of [1, 2, 3]) await ticket(`pi_1:ticket:${n}`, `AAAAA${n}`);
    await ticket("pi_12", "BBBBBB");
    await ticket("pi_12:ticket:1", "CCCCCC");
    // `_` would match this in a LIKE.
    await ticket("piX1:ticket:1", "DDDDDD");

    expect(await voidRefundedCharge(fullRefund("pi_1"), "evt_1")).toBe(3);
    for (const n of [1, 2, 3])
      expect((await row(`pi_1:ticket:${n}`)).voided).toBe(true);
    for (const id of ["pi_12", "pi_12:ticket:1", "piX1:ticket:1"])
      expect((await row(id)).voided).toBe(false);
  });

  it("a partial refund voids nothing, then or later", async () => {
    await ticket("pi_1", "AAAAAA");
    await voidRefundedCharge(partialRefund("pi_1"), "evt_1");
    expect((await row("pi_1")).voided).toBe(false);

    await voidRefundedCharge(partialRefund("pi_2"), "evt_2");
    await recordTicket({ ...purchase, id: "pi_2" });
    expect((await row("pi_2")).voided).toBe(false);
  });

  it("partial refunds that add up to the whole charge void it", async () => {
    await ticket("pi_1", "AAAAAA");
    await voidRefundedCharge(partialRefund("pi_1"), "evt_1");
    await voidRefundedCharge(fullRefund("pi_1"), "evt_2");
    expect((await row("pi_1")).voided).toBe(true);
  });

  it("a redelivery changes nothing", async () => {
    await ticket("pi_1", "AAAAAA");
    await voidRefundedCharge(fullRefund("pi_1"), "evt_1");
    const first = await row("pi_1");
    expect(await voidRefundedCharge(fullRefund("pi_1"), "evt_1")).toBe(0);
    expect((await row("pi_1")).voidedAt).toEqual(first.voidedAt);
  });

  it("keeps a staff void's who and when", async () => {
    await ticket("pi_1", "AAAAAA");
    await voidTicket("pi_1", "Libi");
    const voided = await row("pi_1");
    await voidRefundedCharge(fullRefund("pi_1"), "evt_1");
    expect(await row("pi_1")).toMatchObject({
      voidedBy: "Libi",
      voidedAt: voided.voidedAt,
    });
  });

  it("a redelivery can't overrule staff undoing the void", async () => {
    await ticket("pi_1", "AAAAAA");
    await voidRefundedCharge(fullRefund("pi_1"), "evt_1");
    await unvoidTicket("pi_1", "Libi");
    expect(await voidRefundedCharge(fullRefund("pi_1"), "evt_1")).toBe(0);
    expect((await row("pi_1")).voided).toBe(false);
  });

  it("nor can a redelivery overrule undoing a staff void it found", async () => {
    await ticket("pi_1", "AAAAAA");
    await voidTicket("pi_1", "Libi");
    await voidRefundedCharge(fullRefund("pi_1"), "evt_1");
    await unvoidTicket("pi_1", "Libi");
    await voidRefundedCharge(fullRefund("pi_1"), "evt_1");
    expect((await row("pi_1")).voided).toBe(false);
  });

  it("a refund right after a mistaken void was undone still voids", async () => {
    await ticket("pi_1", "AAAAAA");
    await voidTicket("pi_1", "Libi");
    // Later than the event's whole-second timestamp could say.
    await unvoidTicket("pi_1", "Libi");
    expect(await voidRefundedCharge(fullRefund("pi_1"), "evt_1")).toBe(1);
    expect((await row("pi_1")).voided).toBe(true);
  });

  it("a new refund voids what staff restored after an earlier one", async () => {
    await ticket("pi_1", "AAAAAA");
    await voidRefundedCharge(fullRefund("pi_1"), "evt_1");
    await unvoidTicket("pi_1", "Libi");
    expect(await voidRefundedCharge(fullRefund("pi_1"), "evt_2")).toBe(1);
    expect((await row("pi_1")).refundEventId).toBe("evt_2");

    await unvoidTicket("pi_1", "Libi");
    expect(await voidRefundedCharge(fullRefund("pi_1"), "evt_1")).toBe(0);
    expect((await row("pi_1")).voided).toBe(false);
  });

  it("a retry finishes a delivery that failed before applying", async () => {
    await ticket("pi_1", "AAAAAA");
    await db
      .insert(ticketRefunds)
      .values({ stripeEventId: "evt_1", paymentId: "pi_1" });
    expect(await voidRefundedCharge(fullRefund("pi_1"), "evt_1")).toBe(1);
    expect((await row("pi_1")).voided).toBe(true);
  });

  it("a retry after a partial failure leaves an undone ticket alone", async () => {
    await ticket("pi_1", "AAAAAA", { refundEventId: "evt_1" });
    await db
      .insert(ticketRefunds)
      .values({ stripeEventId: "evt_1", paymentId: "pi_1" });
    expect(await voidRefundedCharge(fullRefund("pi_1"), "evt_1")).toBe(0);
    expect((await row("pi_1")).voided).toBe(false);
  });

  it("ignores charges with no payment, and stores nothing for them", async () => {
    await ticket("pi_1", "AAAAAA");
    expect(await voidRefundedCharge(fullRefund(null), "evt_1")).toBe(0);
    expect((await row("pi_1")).voided).toBe(false);
    expect(await db.select().from(ticketRefunds)).toEqual([]);
  });
});

describe("a refund that arrives before its ticket", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("voids the ticket when it's stored, and it can't be claimed", async () => {
    expect(await voidRefundedCharge(fullRefund("pi_1"), "evt_1")).toBe(0);
    await recordTicket(purchase);
    const stored = await row("pi_1");
    expect(stored).toMatchObject({
      voided: true,
      voidedBy: STRIPE_REFUND,
      refundEventId: "evt_1",
    });
    expect(await claimTicket("ada", stored.ticketCode)).toEqual({
      ok: false,
      reason: "voided",
    });
  });

  it("voids pack admissions stored after it, as well as before", async () => {
    const admission = (n: number) => ({ ...purchase, id: `pi_1:ticket:${n}` });
    await recordTicket(admission(1));
    await voidRefundedCharge(fullRefund("pi_1"), "evt_1");
    await recordTicket(admission(2));
    await recordTicket(admission(3));
    for (const n of [1, 2, 3])
      expect((await row(`pi_1:ticket:${n}`)).voided).toBe(true);
  });

  it("doesn't touch another payment's ticket", async () => {
    await voidRefundedCharge(fullRefund("pi_1"), "evt_1");
    await recordTicket({ ...purchase, id: "pi_12" });
    await recordTicket({ ...purchase, id: "pi_12:ticket:1" });
    expect((await row("pi_12")).voided).toBe(false);
    expect((await row("pi_12:ticket:1")).voided).toBe(false);
  });

  it("a fulfillment retry can't overrule staff undoing the void", async () => {
    await voidRefundedCharge(fullRefund("pi_1"), "evt_1");
    await recordTicket(purchase);
    await unvoidTicket("pi_1", "Libi");
    await recordTicket(purchase);
    expect((await row("pi_1")).voided).toBe(false);

    await ticket("pi_2", "BBBBBB");
    await voidRefundedCharge(fullRefund("pi_2"), "evt_2");
    await unvoidTicket("pi_2", "Libi");
    await recordTicket({ ...purchase, id: "pi_2" });
    expect((await row("pi_2")).voided).toBe(false);
  });
});
