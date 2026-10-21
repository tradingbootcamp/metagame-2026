import { describe, expect, it } from "vitest";
import {
  pageOf,
  peopleMatch,
  personLabel,
  sortTicketRows,
  ticketBadge,
  ticketMatch,
  ticketPeople,
  ticketRoles,
  type AdminAccount,
} from "./admin-tickets";

const ada: AdminAccount = { id: "u1", name: "Ada", email: "ada@example.com" };
const bob: AdminAccount = { id: "u2", name: "Bob", email: "bob@example.com" };
const accounts = new Map([ada, bob].map((a) => [a.id, a]));
const byEmail = new Map([ada, bob].map((a) => [a.email, a]));

const base = {
  purchaserEmail: "ada@example.com",
  purchaserName: "Ada L.",
  holderUserId: null,
  ownerUserId: null,
};

describe("ticketPeople", () => {
  it("links the buyer to their account and makes them the holder", () => {
    const p = ticketPeople(base, accounts, byEmail);
    expect(p.buyer).toEqual({
      userId: "u1",
      name: "Ada L.",
      email: "ada@example.com",
    });
    expect(p.holderIsBuyer).toBe(true);
    expect(p.holder).toBe(p.buyer);
    expect(p.claimer).toBeNull();
  });

  it("keeps a buyer without an account as just the purchase details", () => {
    const p = ticketPeople(
      { ...base, purchaserEmail: "cy@example.com", purchaserName: null },
      accounts,
      byEmail,
    );
    expect(p.buyer).toEqual({
      userId: null,
      name: null,
      email: "cy@example.com",
    });
  });

  it("names a separate holder and claimer", () => {
    const p = ticketPeople(
      { ...base, holderUserId: "u2", ownerUserId: "u2" },
      accounts,
      byEmail,
    );
    expect(p.holderIsBuyer).toBe(false);
    expect(p.holder?.name).toBe("Bob");
    expect(p.claimer?.userId).toBe("u2");
  });

  it("keeps an id it can't resolve", () => {
    const p = ticketPeople({ ...base, ownerUserId: "gone" }, accounts, byEmail);
    expect(p.claimer).toEqual({ userId: "gone", name: null, email: null });
    expect(personLabel(p.claimer!)).toBe("gone");
  });

  it("has no buyer for a ticket with no purchaser", () => {
    const p = ticketPeople(
      { ...base, purchaserEmail: null, purchaserName: null },
      accounts,
      byEmail,
    );
    expect(p.buyer).toBeNull();
    expect(p.holder).toBeNull();
  });
});

describe("peopleMatch", () => {
  const p = ticketPeople({ ...base, ownerUserId: "u2" }, accounts, byEmail);
  it("matches any name or email, ignoring case", () => {
    expect(peopleMatch(p, "BOB@")).toBe(true);
    expect(peopleMatch(p, "ada l")).toBe(true);
    expect(peopleMatch(p, "carol")).toBe(false);
    expect(peopleMatch(p, "  ")).toBe(true);
  });
});

describe("ticketMatch", () => {
  const people = ticketPeople(base, accounts, byEmail);
  it("also matches the coupon code", () => {
    const r = { t: { couponCode: "EARLYBIRD" }, people };
    expect(ticketMatch(r, " early")).toBe(true);
    expect(ticketMatch(r, "ada")).toBe(true);
    expect(ticketMatch(r, "comp")).toBe(false);
    expect(ticketMatch({ t: { couponCode: null }, people }, "early")).toBe(
      false,
    );
  });
});

describe("ticketRoles", () => {
  it("is everything for a buyer who claimed their own ticket", () => {
    expect(
      ticketRoles({ ...base, ownerUserId: "u1" }, "u1", "Ada@Example.com"),
    ).toEqual(["bought", "holds", "claimed"]);
  });

  it("splits buying from holding once passed on", () => {
    const t = { ...base, holderUserId: "u2" };
    expect(ticketRoles(t, "u1", "ada@example.com")).toEqual(["bought"]);
    expect(ticketRoles(t, "u2", "bob@example.com")).toEqual(["holds"]);
  });
});

describe("ticketBadge", () => {
  it("is gray with none, plain with one, ×n with more", () => {
    expect(ticketBadge(0)).toEqual({ has: false, label: null });
    expect(ticketBadge(1)).toEqual({ has: true, label: null });
    expect(ticketBadge(3)).toEqual({ has: true, label: "×3" });
  });
});

describe("sortTicketRows / pageOf", () => {
  const person = (name: string) => ({ userId: null, name, email: null });
  const row = (
    id: string,
    at: string,
    buyer: string | null,
    claimer: string | null,
  ) => ({
    id,
    t: { createdAt: new Date(at) },
    people: {
      buyer: buyer ? person(buyer) : null,
      holder: null,
      holderIsBuyer: true,
      claimer: claimer ? person(claimer) : null,
    },
  });
  const rows = [
    row("a", "2026-07-01", "Zed", null),
    row("b", "2026-09-01", "amy", "Bo"),
    row("c", "2026-08-01", null, "al"),
  ];
  const ids = (r: { id: string }[]) => r.map((x) => x.id).join("");
  it("sorts by purchase date", () => {
    expect(ids(sortTicketRows(rows, "purchased", "desc"))).toBe("bca");
    expect(ids(sortTicketRows(rows, "purchased", "asc"))).toBe("acb");
  });
  it("sorts people case-insensitively with blanks last", () => {
    expect(ids(sortTicketRows(rows, "buyer", "asc"))).toBe("bac");
    expect(ids(sortTicketRows(rows, "buyer", "desc"))).toBe("abc");
    expect(ids(sortTicketRows(rows, "claimer", "asc"))).toBe("cba");
  });
  it("pages and clamps", () => {
    const many = Array.from({ length: 120 }, (_, i) => i);
    expect(pageOf(many, 2, 50)).toMatchObject({ page: 2, pages: 3 });
    expect(pageOf(many, 2, 50).rows[0]).toBe(50);
    expect(pageOf(many, 99, 50).page).toBe(3);
    expect(pageOf([], 1)).toMatchObject({ page: 1, pages: 1, rows: [] });
  });
});

describe("sortTicketRows by pay", () => {
  const row = (id: string, cents: number | null) => ({
    id,
    t: { createdAt: new Date("2026-10-01"), amountCents: cents },
    people: { buyer: null, holder: null, holderIsBuyer: true, claimer: null },
  });
  const ids = (r: { id: string }[]) => r.map((x) => x.id).join("");
  it("orders by price with unknown prices last", () => {
    const rows = [
      row("a", 50000),
      row("b", null),
      row("c", 0),
      row("d", 65000),
    ];
    expect(ids(sortTicketRows(rows, "pay", "desc"))).toBe("dacb");
    expect(ids(sortTicketRows(rows, "pay", "asc"))).toBe("cadb");
  });
});
