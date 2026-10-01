import { describe, expect, it } from "vitest";
import type { PurchaseRecord } from "./airtable";
import { purchaseEvent } from "./posthog-server";

const paid: PurchaseRecord = {
  id: "pi_123",
  status: "Paid",
  test: false,
  paymentMethod: "stripe",
  customerEmail: "buyer@example.com",
  ticketType: "Standard",
  amount: 325,
  couponCode: "EARLYBIRD",
  utm: { utm_source: "podcast", posthog_id: "ph_abc" },
};

describe("purchaseEvent", () => {
  it("ties a paid purchase to the buyer's browser id and carries its UTMs", () => {
    const event = purchaseEvent(paid);
    expect(event).toMatchObject({
      event: "ticket_purchased",
      distinct_id: "ph_abc",
      properties: {
        ticket_type: "Standard",
        amount_usd: 325,
        coupon_code: "EARLYBIRD",
        utm_source: "podcast",
      },
    });
    expect(event?.properties).not.toHaveProperty("posthog_id");
    expect(JSON.stringify(event)).not.toContain("buyer@example.com");
  });
  it("skips purchases that haven't settled", () => {
    expect(purchaseEvent({ ...paid, status: "Pending" })).toBeUndefined();
    expect(purchaseEvent({ ...paid, status: "Failed" })).toBeUndefined();
  });
  it("keeps test purchases out of the real event", () => {
    expect(purchaseEvent({ ...paid, test: true })?.event).toBe(
      "ticket_purchased_test",
    );
  });
  it("falls back to the purchase id without a browser id", () => {
    expect(purchaseEvent({ ...paid, utm: {} })?.distinct_id).toBe(
      "purchase:pi_123",
    );
  });
  it("gives a redelivered purchase the same uuid", () => {
    const uuid = purchaseEvent(paid)?.uuid;
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(purchaseEvent({ ...paid })?.uuid).toBe(uuid);
    expect(purchaseEvent({ ...paid, id: "pi_456" })?.uuid).not.toBe(uuid);
  });
});
