import { describe, expect, it } from "vitest";
import {
  peopleMatch,
  personLabel,
  ticketBadge,
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
