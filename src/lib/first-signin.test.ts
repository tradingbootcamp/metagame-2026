import { describe, expect, it } from "vitest";
import { firstSigninHidden, ticketStep } from "./first-signin";

const row = (
  over: Partial<Parameters<typeof ticketStep>[0][number]>,
): Parameters<typeof ticketStep>[0][number] => ({
  paymentId: "pi_1",
  tier: "Standard",
  status: "paid",
  ownerUserId: null,
  purchaserEmail: "ada@example.com",
  ...over,
});

describe("ticketStep", () => {
  it("offers the code entry when there are no tickets", () => {
    expect(ticketStep([], "u1", "ada@example.com")).toEqual({ kind: "code" });
  });

  it("offers paid, unclaimed tickets the user bought", () => {
    expect(
      ticketStep(
        [
          row({ paymentId: "a" }),
          row({ paymentId: "b", status: "pending" }),
          row({ paymentId: "c", ownerUserId: "u2" }),
          row({ paymentId: "d", tier: "Day pass" }),
        ],
        "u1",
        "ada@example.com",
      ),
    ).toEqual({
      kind: "claimable",
      tickets: [
        { id: "a", tier: "Standard" },
        { id: "d", tier: "Day pass" },
      ],
    });
  });

  it("doesn't offer tickets bought under another email", () => {
    expect(
      ticketStep(
        [row({ purchaserEmail: "bob@example.com" })],
        "u1",
        "ada@example.com",
      ),
    ).toEqual({ kind: "code" });
  });

  it("skips ahead once the user holds a ticket", () => {
    expect(
      ticketStep(
        [row({ paymentId: "a" }), row({ paymentId: "b", ownerUserId: "u1" })],
        "u1",
        "ada@example.com",
      ),
    ).toEqual({ kind: "held" });
  });
});

describe("firstSigninHidden", () => {
  it("hides on sign-in and the team tools", () => {
    for (const p of [
      "/login",
      "/admin",
      "/admin/users",
      "/grade",
      "/grade/rec1",
    ])
      expect(firstSigninHidden(p)).toBe(true);
  });

  it("shows everywhere else", () => {
    for (const p of ["/", "/account", "/schedule", "/administer", "/logins"])
      expect(firstSigninHidden(p)).toBe(false);
  });
});
