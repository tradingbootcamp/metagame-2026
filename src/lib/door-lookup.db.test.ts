import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as schema from "@/db/schema";

// Migrating PGlite takes seconds on a busy machine.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 60_000 });

const holder = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db", async () => ({
  getDb: () => holder.db,
  schema: await vi.importActual("@/db/schema"),
}));
vi.mock("@/env", () => ({ env: { DATABASE_URL: "pglite" } }));
vi.mock("./airtable", () => ({ updatePurchaseTicketCode: vi.fn() }));
vi.mock("./email", () => ({ sendAdminErrorEmail: vi.fn() }));

import {
  admissionFor,
  DOOR_RESULT_CAP,
  doorLookup,
  type DoorResult,
} from "./door-lookup";
import { dayPasses } from "./tickets";
import { FAMILY_PACK } from "./family-pack";

const { tickets, user } = schema;

let client: PGlite;
let db: PgliteDatabase<typeof schema>;

const ticket = (paymentId: string, ticketCode: string, over = {}) =>
  db.insert(tickets).values({
    paymentId,
    ticketCode,
    source: "stripe",
    status: "paid",
    tier: "Standard",
    purchaserEmail: "buyer@example.com",
    purchaserName: "Bea Buyer",
    amountCents: 42500,
    couponCode: "SECRETCOUPON",
    purchaserDiscord: "bea#1",
    ...over,
  });

const found = (result: DoorResult) => {
  if ("error" in result) throw new Error(result.error);
  return result.tickets;
};

beforeAll(async () => {
  client = new PGlite();
  db = drizzle({ client, schema, casing: "snake_case" });
  holder.db = db;
  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, "../../drizzle"),
  });
  await db.insert(user).values([
    {
      id: "owen",
      name: "Owen Owner",
      email: "owen@example.com",
      emailVerified: true,
    },
    {
      id: "hal",
      name: "Hal Holder",
      email: "hal@example.com",
      emailVerified: true,
    },
    {
      id: "blank",
      name: "  ",
      email: "blank@example.com",
      emailVerified: true,
    },
  ]);
});

afterAll(() => client.close());

beforeEach(async () => {
  await db.delete(tickets);
});

describe("searching", () => {
  it.each(["", "  ", "a", "ab", " a "])(
    "refuses %j without querying",
    async (q) => {
      await ticket("pi_1", "A2C4EF");
      expect(await doorLookup(q)).toEqual({
        error: "Enter a full ticket code, email or name.",
      });
    },
  );

  it("refuses an absurdly long search", async () => {
    expect("error" in (await doorLookup("x".repeat(201)))).toBe(true);
  });

  it.each(["A2C4EF", "a2c-4ef", " A2C 4EF ", "a2c4ef"])(
    "finds a ticket by code typed as %j",
    async (q) => {
      await ticket("pi_1", "A2C4EF");
      expect(found(await doorLookup(q))).toHaveLength(1);
    },
  );

  it.each([
    "buyer@example.com",
    "BUYER@Example.com",
    " Bea Buyer ",
    "bea  buyer",
  ])("finds an unclaimed ticket by its buyer as %j", async (q) => {
    await ticket("pi_1", "A2C4EF");
    expect(found(await doorLookup(q))).toHaveLength(1);
  });

  it.each([
    "A2C",
    "A2C4E",
    "Bea",
    "Buyer",
    "buyer@",
    "example.com",
    "%%%",
    "___",
    "b%r@example.com",
    "Bea%",
    "' or 1=1 --",
  ])("finds nothing for the inexact %j", async (q) => {
    await ticket("pi_1", "A2C4EF");
    expect(found(await doorLookup(q))).toEqual([]);
  });

  it("a claimed ticket is found by its owner, not its buyer", async () => {
    await ticket("pi_1", "A2C4EF", { ownerUserId: "owen" });
    for (const q of ["buyer@example.com", "Bea Buyer"])
      expect(found(await doorLookup(q))).toEqual([]);
    for (const q of ["owen@example.com", "owen owner", "A2C4EF"])
      expect(found(await doorLookup(q))[0].holder).toBe("Owen Owner");
  });

  it("a passed-on ticket is found by its holder, not its buyer", async () => {
    await ticket("pi_1", "A2C4EF", { holderUserId: "hal" });
    expect(found(await doorLookup("buyer@example.com"))).toEqual([]);
    const [t] = found(await doorLookup("hal@example.com"));
    expect(t).toMatchObject({ holder: "Hal Holder", claimed: false });
  });

  it("caps results and says there are more", async () => {
    for (let i = 0; i <= DOOR_RESULT_CAP; i++)
      await ticket(`pi_${i}`, `AAAAA${i}`);
    const result = await doorLookup("Bea Buyer");
    expect(found(result)).toHaveLength(DOOR_RESULT_CAP);
    expect(result).toMatchObject({ more: true });
  });

  it("the cap fits a whole family pack", async () => {
    expect(DOOR_RESULT_CAP).toBeGreaterThanOrEqual(FAMILY_PACK.max);
    for (let i = 0; i < FAMILY_PACK.max; i++)
      await ticket(`pi_1:ticket:${i}`, `AAAAA${i}`);
    const result = await doorLookup("Bea Buyer");
    expect(found(result)).toHaveLength(FAMILY_PACK.max);
    expect(result).toMatchObject({ more: false });
  });

  it("lists valid tickets first, so a capped list keeps them", async () => {
    for (let i = 0; i < DOOR_RESULT_CAP; i++)
      await ticket(`pi_v${i}`, `VVVVV${i}`, { voided: true });
    await ticket("pi_ok", "OKOKOK", {
      createdAt: new Date("2020-01-01T00:00:00Z"),
    });
    expect(found(await doorLookup("Bea Buyer"))[0].valid).toBe(true);
  });
});

describe("what it shows", () => {
  it("is only what admitting someone needs", async () => {
    await ticket("pi_secret", "A2C4EF", { referralCode: "REFERRAL" });
    const result = await doorLookup("buyer@example.com");
    expect(found(result)).toEqual([
      {
        state: "paid",
        valid: true,
        admits: { kind: "full", label: "Full weekend pass" },
        holder: "Bea Buyer",
        claimed: false,
      },
    ]);
    const body = JSON.stringify(result);
    for (const secret of [
      "pi_secret",
      "A2C4EF",
      "A2C-4EF",
      "buyer@example.com",
      "SECRETCOUPON",
      "REFERRAL",
      "bea#1",
      "42500",
    ])
      expect(body).not.toContain(secret);
  });

  it("never falls back to an account's email for its name", async () => {
    await ticket("pi_1", "A2C4EF", { ownerUserId: "blank" });
    const result = await doorLookup("A2C4EF");
    expect(found(result)[0].holder).toBeNull();
    expect(JSON.stringify(result)).not.toContain("blank@example.com");
  });

  it("doesn't pass off the buyer as a nameless owner", async () => {
    await ticket("pi_1", "A2C4EF", { ownerUserId: "blank" });
    expect(found(await doorLookup("A2C4EF"))[0].holder).not.toBe("Bea Buyer");
  });

  it.each([
    ["voided", { voided: true }],
    ["pending", { status: "pending" }],
    ["failed", { status: "failed" }],
    ["underpaid", { status: "underpaid" }],
  ])("%s is not valid", async (state, over) => {
    await ticket("pi_1", "A2C4EF", over);
    expect(found(await doorLookup("A2C4EF"))[0]).toMatchObject({
      state,
      valid: false,
    });
  });
});

describe("production", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("hides test purchases", async () => {
    await ticket("pi_1", "A2C4EF", { test: true });
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.resetModules();
    const { doorLookup: lookup } = await import("./door-lookup");
    expect(found(await lookup("A2C4EF"))).toEqual([]);
  });
});

describe("admissionFor", () => {
  it.each([
    "Standard",
    "standard",
    "Supporter",
    "supporter",
    "Guest of Honor",
    "Metagame 2026",
    "metagame 2026 -- supporter",
    "Metagame 2026 - Guest of Honor",
    "Family & Friends Pack — Standard",
  ])("%s is a full pass", (tier) => {
    expect(admissionFor(tier).kind).toBe("full");
  });

  it.each([
    ["Friday Day Pass", "Friday, Nov 6 only"],
    ["saturday", "Saturday, Nov 7 only"],
    ["Metagame 2026 Day Pass - Sunday", "Sunday, Nov 8 only"],
  ])("%s admits one day", (tier, label) => {
    expect(admissionFor(tier)).toEqual({ kind: "day", label });
  });

  it("names each day pass's actual date", () => {
    for (const pass of dayPasses) {
      const { label } = admissionFor(pass.label);
      const [, month, day] = /^\w+, (\w{3})\w* (\d+)/.exec(pass.date.long)!;
      expect(label).toContain(`${month} ${day}`);
      expect(
        label.startsWith(pass.id[0].toUpperCase() + pass.id.slice(1)),
      ).toBe(true);
    }
  });

  it("a Night Market booth is not a conference pass", () => {
    expect(admissionFor("Metagame 2026 Night Market Booth").kind).toBe("booth");
    expect(admissionFor("Night Market").kind).toBe("booth");
  });

  it.each([null, "", "Mystery Product", "Day Pass", "Standardish"])(
    "%j asks for a lead rather than guessing",
    (tier) => {
      expect(admissionFor(tier).kind).toBe("unknown");
    },
  );
});
