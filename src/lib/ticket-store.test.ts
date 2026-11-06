import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";
import { ticketCode } from "./ticket-code";

const client = new PGlite();
const db = drizzle({ client, schema, casing: "snake_case" });
vi.mock("@/db", () => ({ getDb: () => db, schema }));
vi.mock("@/lib/airtable", () => ({
  updatePurchaseTicketCode: vi.fn(async () => {}),
}));
vi.mock("@/lib/email", () => ({ sendAdminErrorEmail: vi.fn(async () => {}) }));

const {
  assignBadgeCode,
  checkInTicket,
  claimOwnTicket,
  claimTicket,
  claimTicketFor,
  normalizeTicketCode,
  ticketFromPurchase,
  unclaimTicket,
  undoCheckIn,
} = await import("./ticket-store");

const stripe = {
  id: "pi_123",
  status: "Paid" as const,
  test: false,
  paymentMethod: "stripe" as const,
  customerName: "Ada Lovelace",
  customerEmail: " Ada@Example.com ",
  amount: 325,
  ticketType: "Standard",
  ticketCode: ticketCode("pi_123"),
};

describe("ticketFromPurchase", () => {
  it("maps a Stripe purchase", () => {
    expect(ticketFromPurchase(stripe)).toEqual({
      paymentId: "pi_123",
      ticketCode: ticketCode("pi_123"),
      source: "stripe",
      status: "paid",
      test: false,
      tier: "Standard",
      amountCents: 32500,
      couponCode: null,
      purchaserEmail: "ada@example.com",
      purchaserName: "Ada Lovelace",
      purchaserDiscord: null,
    });
    expect(
      ticketFromPurchase({ ...stripe, discordHandle: " @ada_l" })
        .purchaserDiscord,
    ).toBe("ada_l");
    expect(
      ticketFromPurchase({ ...stripe, couponCode: " earlyBird " }).couponCode,
    ).toBe("EARLYBIRD");
  });

  it("prefers the preferred name and derives a missing code", () => {
    const row = ticketFromPurchase({
      ...stripe,
      ticketCode: undefined,
      preferredName: "Ada",
    });
    expect(row.purchaserName).toBe("Ada");
    expect(row.ticketCode).toBe(ticketCode("pi_123"));
  });

  it("maps a BTC charge with no email to opennode and null", () => {
    const row = ticketFromPurchase({
      id: "abc-def",
      status: "Pending",
      test: true,
      paymentMethod: "btc",
      amount: 0.5,
    });
    expect(row).toMatchObject({
      source: "opennode",
      status: "pending",
      test: true,
      tier: null,
      amountCents: 50,
      purchaserEmail: null,
      purchaserName: null,
    });
  });
});

describe("normalizeTicketCode", () => {
  it("accepts the display form and common misreads", () => {
    expect(normalizeTicketCode(" a2c-4ef ")).toBe("A2C4EF");
    expect(normalizeTicketCode("i1l-o0u")).toBe("11100V");
  });
});

beforeAll(async () => {
  await client.exec(`
    create table "user" (id text primary key);
    create type ticket_source as enum ('stripe', 'opennode', 'admin');
    create type ticket_status as enum ('pending', 'paid', 'failed', 'underpaid');
    create table tickets (
      payment_id text primary key,
      ticket_code text not null unique,
      source ticket_source not null,
      status ticket_status not null,
      test boolean not null default false,
      tier text,
      amount_cents integer,
      coupon_code text,
      purchaser_email text,
      purchaser_name text,
      purchaser_discord text,
      owner_user_id text references "user"(id) on delete set null,
      claimed_at timestamptz,
      holder_user_id text references "user"(id) on delete set null,
      referral_code text unique,
      referred_by_payment_id text,
      badge_code integer unique,
      checked_in_at timestamptz,
      checked_in_by text references "user"(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint tickets_badge_code_range check (badge_code between 0 and 9999)
    );
    create table verification (
      id text primary key,
      identifier text not null,
      value text not null,
      expires_at timestamptz not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    insert into "user" (id) values ('ada'), ('bob'), ('desk')`);
});

beforeEach(async () => {
  await client.exec("delete from tickets; delete from verification");
});

/** A paid ticket, unclaimed unless `owner` is given. */
async function seed(
  paymentId: string,
  {
    owner = null,
    status = "paid",
  }: { owner?: string | null; status?: "paid" | "pending" } = {},
) {
  await client.query(
    `insert into tickets (payment_id, ticket_code, source, status, owner_user_id, claimed_at)
     values ($1, $2, 'stripe', $3, $4::text, case when $4::text is null then null else now() end)`,
    [paymentId, ticketCode(paymentId), status, owner],
  );
}

const fetchRow = async (paymentId: string) => {
  const { rows } = await client.query<{
    owner_user_id: string | null;
    checked_in_at: Date | null;
    checked_in_by: string | null;
    badge_code: number | null;
    ticket_code: string;
  }>("select * from tickets where payment_id = $1", [paymentId]);
  return rows[0];
};

describe("claimTicketFor", () => {
  it("claims a specific ticket for the attendee", async () => {
    await seed("pi_1");
    const result = await claimTicketFor("pi_1", "ada");
    expect(result.ok).toBe(true);
    expect((await fetchRow("pi_1")).owner_user_id).toBe("ada");
  });

  it("keeps the claim invariants", async () => {
    await seed("pi_1", { owner: "bob" });
    await seed("pi_2");
    await seed("pi_3", { status: "pending" });
    expect(await claimTicketFor("pi_1", "ada")).toEqual({
      ok: false,
      reason: "taken",
    });
    expect(await claimTicketFor("pi_1", "bob")).toEqual({
      ok: false,
      reason: "yours",
    });
    expect(await claimTicketFor("pi_2", "bob")).toEqual({
      ok: false,
      reason: "already",
    });
    expect(await claimTicketFor("pi_3", "ada")).toEqual({
      ok: false,
      reason: "unpaid",
    });
    expect(await claimTicketFor("pi_nope", "ada")).toEqual({
      ok: false,
      reason: "unknown",
    });
  });

  it("ignores the per-account failure throttle", async () => {
    await client.exec(`
      insert into verification (id, identifier, value, expires_at)
      select 'f' || n, 'claim-failed:ada', 'x', now() + interval '1 hour'
      from generate_series(1, 25) n`);
    await seed("pi_1");
    expect(await claimTicket("ada", ticketCode("pi_1"))).toEqual({
      ok: false,
      reason: "limited",
    });
    expect((await claimTicketFor("pi_1", "ada")).ok).toBe(true);
  });
});

describe("claimTicket and claimOwnTicket", () => {
  it("still claim by code and by holding", async () => {
    await seed("pi_1");
    await seed("pi_2");
    await client.query(
      "update tickets set purchaser_email = 'bob@example.com' where payment_id = 'pi_2'",
    );
    expect((await claimTicket("ada", ticketCode("pi_1"))).ok).toBe(true);
    expect((await claimOwnTicket("bob", "bob@example.com", "pi_2")).ok).toBe(
      true,
    );
    expect(await claimOwnTicket("ada", "ada@example.com", "pi_2")).toEqual({
      ok: false,
      reason: "unknown",
    });
  });
});

describe("checkInTicket", () => {
  it("records who checked a claimed ticket in, once", async () => {
    await seed("pi_1", { owner: "ada" });
    const first = await checkInTicket("pi_1", "desk");
    expect(first.ok).toBe(true);
    const row = await fetchRow("pi_1");
    expect(row.checked_in_by).toBe("desk");
    expect(row.checked_in_at).toBeInstanceOf(Date);

    const again = await checkInTicket("pi_1", "bob");
    expect(again).toMatchObject({ ok: false, reason: "already" });
    if (again.ok || again.reason !== "already") throw new Error("unreachable");
    expect(again.ticket.checkedInBy).toBe("desk");
    expect((await fetchRow("pi_1")).checked_in_by).toBe("desk");
  });

  it("refuses unclaimed, unpaid and unknown tickets", async () => {
    await seed("pi_1");
    await seed("pi_2", { owner: "ada", status: "pending" });
    expect(await checkInTicket("pi_1", "desk")).toEqual({
      ok: false,
      reason: "unclaimed",
    });
    expect(await checkInTicket("pi_2", "desk")).toEqual({
      ok: false,
      reason: "unpaid",
    });
    expect(await checkInTicket("pi_nope", "desk")).toEqual({
      ok: false,
      reason: "unknown",
    });
  });
});

describe("undoCheckIn", () => {
  it("clears both fields and reports a ticket that wasn't checked in", async () => {
    await seed("pi_1", { owner: "ada" });
    expect(await undoCheckIn("pi_1")).toBeNull();
    await checkInTicket("pi_1", "desk");
    const undone = await undoCheckIn("pi_1");
    expect(undone?.checkedInAt).toBeNull();
    expect(undone?.checkedInBy).toBeNull();
    expect((await fetchRow("pi_1")).checked_in_at).toBeNull();
  });
});

describe("unclaimTicket", () => {
  it("is refused once the ticket is checked in", async () => {
    await seed("pi_1", { owner: "ada" });
    await checkInTicket("pi_1", "desk");
    expect(await unclaimTicket("ada", "pi_1")).toBeNull();
    expect((await fetchRow("pi_1")).owner_user_id).toBe("ada");

    await undoCheckIn("pi_1");
    const released = await unclaimTicket("ada", "pi_1");
    expect(released?.ownerUserId).toBeNull();
    expect(released?.holderUserId).toBe("ada");
    expect(released?.ticketCode).not.toBe(ticketCode("pi_1"));
  });
});

describe("assignBadgeCode", () => {
  it("sets, replaces and clears a code, checked in or not", async () => {
    await seed("pi_1", { owner: "ada" });
    expect((await assignBadgeCode("pi_1", 42)).ok).toBe(true);
    expect((await fetchRow("pi_1")).badge_code).toBe(42);
    await checkInTicket("pi_1", "desk");
    expect((await assignBadgeCode("pi_1", 7)).ok).toBe(true);
    expect((await fetchRow("pi_1")).badge_code).toBe(7);
    expect((await assignBadgeCode("pi_1", null)).ok).toBe(true);
    expect((await fetchRow("pi_1")).badge_code).toBeNull();
  });

  it("rejects out-of-range codes before the database sees them", async () => {
    await seed("pi_1");
    for (const code of [-1, 10000, 1.5, NaN]) {
      expect(await assignBadgeCode("pi_1", code)).toEqual({
        ok: false,
        reason: "invalid",
      });
    }
    expect(await assignBadgeCode("pi_1", 0)).toMatchObject({ ok: true });
    expect(await assignBadgeCode("pi_1", 9999)).toMatchObject({ ok: true });
  });

  it("names the ticket already wearing a taken code", async () => {
    await seed("pi_1");
    await seed("pi_2");
    await assignBadgeCode("pi_1", 42);
    expect(await assignBadgeCode("pi_2", 42)).toEqual({
      ok: false,
      reason: "taken",
      heldBy: "pi_1",
    });
    expect((await fetchRow("pi_2")).badge_code).toBeNull();
    expect(await assignBadgeCode("pi_nope", 1)).toEqual({
      ok: false,
      reason: "unknown",
    });
  });
});
