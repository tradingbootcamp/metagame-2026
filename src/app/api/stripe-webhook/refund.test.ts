import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEventAsync: vi.fn(),
  retrieve: vi.fn(),
  voidRefundedCharge: vi.fn(),
  reportError: vi.fn(),
  recordPurchase: vi.fn(),
}));

vi.mock("@/env", () => ({ env: { STRIPE_WEBHOOK_SECRET: "whsec_test" } }));
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: { constructEventAsync: mocks.constructEventAsync },
    checkout: { sessions: { retrieve: mocks.retrieve } },
  }),
}));
vi.mock("@/lib/airtable", () => ({ recordPurchase: mocks.recordPurchase }));
vi.mock("@/lib/ticket-store", () => ({}));
vi.mock("@/lib/posthog-server", () => ({}));
vi.mock("@/lib/email", () => ({}));
vi.mock("@/lib/ticket-followup", () => ({}));
vi.mock("@/lib/family-pack-purchase", () => ({}));
vi.mock("@/lib/error-report", () => ({ reportError: mocks.reportError }));
vi.mock("@/lib/ticket-void", () => ({
  voidRefundedCharge: mocks.voidRefundedCharge,
}));

import { POST } from "./route";

const charge = { id: "ch_1", refunded: true, payment_intent: "pi_1" };

const deliver = () =>
  POST(
    new Request("https://metagame.games/api/stripe-webhook", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "{}",
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.constructEventAsync.mockResolvedValue({
    id: "evt_1",
    type: "charge.refunded",
    data: { object: charge },
  });
});

it("hands the charge and event id over, and touches no purchase", async () => {
  const res = await deliver();
  expect(res.status).toBe(200);
  expect(mocks.voidRefundedCharge).toHaveBeenCalledWith(charge, "evt_1");
  expect(mocks.retrieve).not.toHaveBeenCalled();
  expect(mocks.recordPurchase).not.toHaveBeenCalled();
});

it("asks Stripe to retry and alerts when the void fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.voidRefundedCharge.mockRejectedValue(new Error("db down"));
  const res = await deliver();
  expect(res.status).toBe(500);
  expect(mocks.reportError).toHaveBeenCalledOnce();
});

it("leaves other events to the existing handling", async () => {
  mocks.constructEventAsync.mockResolvedValue({
    id: "evt_2",
    type: "charge.succeeded",
    data: { object: { id: "ch_1" } },
  });
  expect((await deliver()).status).toBe(200);
  expect(mocks.voidRefundedCharge).not.toHaveBeenCalled();
});
