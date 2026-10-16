import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
const { recordPurchase, capturePurchase, sendTicketConfirmationEmail } =
  vi.hoisted(() => ({
    recordPurchase: vi.fn(),
    capturePurchase: vi.fn(),
    sendTicketConfirmationEmail: vi.fn(),
  }));
vi.mock("@/lib/airtable", () => ({ recordPurchase }));
vi.mock("@/lib/posthog-server", () => ({ capturePurchase }));
vi.mock("@/lib/email", () => ({ sendTicketConfirmationEmail }));
import { recordFamilyPack } from "./family-pack-purchase";
import { packMetadata } from "./family-pack";

function session(count = 4) {
  return {
    id: "cs_pack",
    currency: "usd",
    amount_total: count * 37500,
    livemode: false,
    total_details: { amount_discount: 0 },
    customer_details: { name: "Buyer", email: "buyer@example.com" },
    metadata: packMetadata(
      Array.from({ length: count }, (_, i) => ({
        name: `Guest ${i}`,
        email: `guest${i}@example.com`,
      })),
    ),
    payment_intent: {
      id: "pi_pack",
      latest_charge: {
        receipt_url: "https://receipt.example",
        balance_transaction: { fee: 4381, net: count * 37500 - 4381 },
      },
    },
  } as unknown as Stripe.Checkout.Session;
}

describe("family pack fulfillment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordPurchase.mockResolvedValue({ stored: true });
    sendTicketConfirmationEmail.mockResolvedValue({ sent: true });
  });
  it.each([4, 5, 6])(
    "creates %i admissions with reconciled accounting and separate codes",
    async (count) => {
      await recordFamilyPack(session(count), "Paid");
      const rows = recordPurchase.mock.calls.map(([row]) => row);
      expect(rows).toHaveLength(count);
      expect(new Set(rows.map((r) => r.ticketCode)).size).toBe(count);
      expect(rows.reduce((sum, r) => sum + Math.round(r.amount * 100), 0)).toBe(
        count * 37500,
      );
      expect(rows.reduce((sum, r) => sum + Math.round(r.fee * 100), 0)).toBe(
        4381,
      );
      expect(rows.reduce((sum, r) => sum + Math.round(r.net * 100), 0)).toBe(
        count * 37500 - 4381,
      );
      expect(sendTicketConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "buyer@example.com",
          groupTickets: expect.any(Array),
          idempotencyKey: "family-pack/pi_pack",
        }),
      );
    },
  );
  it("retains admission identities through pending, paid and replay events", async () => {
    await recordFamilyPack(session(), "Pending");
    const before = recordPurchase.mock.calls.map(([r]) => [r.id, r.ticketCode]);
    expect(sendTicketConfirmationEmail).not.toHaveBeenCalled();
    recordPurchase.mockClear();
    await recordFamilyPack(session(), "Paid");
    expect(
      recordPurchase.mock.calls.map(([r]) => [r.id, r.ticketCode]),
    ).toEqual(before);
    recordPurchase.mockClear();
    await recordFamilyPack(session(), "Paid");
    expect(
      recordPurchase.mock.calls.map(([r]) => [r.id, r.ticketCode]),
    ).toEqual(before);
  });
  it("does not fulfill an undercharged or additionally discounted order", async () => {
    await expect(
      recordFamilyPack({ ...session(), amount_total: 1 }, "Paid"),
    ).rejects.toThrow();
    await expect(
      recordFamilyPack(
        {
          ...session(),
          total_details: { amount_discount: 50 },
        } as Stripe.Checkout.Session,
        "Paid",
      ),
    ).rejects.toThrow();
    expect(recordPurchase).not.toHaveBeenCalled();
  });
  it("propagates recording/email failures so Stripe retries can recover", async () => {
    recordPurchase.mockResolvedValue({ stored: false });
    await expect(recordFamilyPack(session(), "Paid")).rejects.toThrow();
    expect(sendTicketConfirmationEmail).not.toHaveBeenCalled();
    recordPurchase.mockResolvedValue({ stored: true });
    sendTicketConfirmationEmail.mockRejectedValue(new Error("mail down"));
    await expect(recordFamilyPack(session(), "Paid")).rejects.toThrow(
      "mail down",
    );
  });
});
