import { describe, expect, it } from "vitest";
import { holdsTicket } from "./ticket-holder";

describe("holdsTicket", () => {
  const bought = { holderUserId: null, purchaserEmail: "ada@example.com" };

  it("is the buyer while no holder is set", () => {
    expect(holdsTicket(bought, "u1", " Ada@Example.com ")).toBe(true);
    expect(holdsTicket(bought, "u1", "bob@example.com")).toBe(false);
  });

  it("is the holder once set, not the buyer", () => {
    const held = { ...bought, holderUserId: "u2" };
    expect(holdsTicket(held, "u2", "bob@example.com")).toBe(true);
    expect(holdsTicket(held, "u1", "ada@example.com")).toBe(false);
  });

  it("is nobody for a buyerless ticket with no holder", () => {
    expect(
      holdsTicket({ holderUserId: null, purchaserEmail: null }, "u1", ""),
    ).toBe(false);
  });
});
