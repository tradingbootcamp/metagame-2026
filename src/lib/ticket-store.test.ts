import { describe, expect, it } from "vitest";
import { ticketFromPurchase } from "./ticket-store";
import { ticketCode } from "./ticket-code";

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
      purchaserEmail: "ada@example.com",
      purchaserName: "Ada Lovelace",
    });
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
