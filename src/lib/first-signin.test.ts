import { describe, expect, it } from "vitest";
import {
  discordPrefill,
  firstSigninHidden,
  firstSigninNeeded,
  ticketStep,
} from "./first-signin";

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

describe("firstSigninNeeded", () => {
  it("is needed until both required answers are stored", () => {
    expect(firstSigninNeeded(undefined)).toBe(true);
    expect(firstSigninNeeded({ isAdult: null, bringingChildren: null })).toBe(
      true,
    );
    expect(firstSigninNeeded({ isAdult: true, bringingChildren: null })).toBe(
      true,
    );
    expect(firstSigninNeeded({ isAdult: null, bringingChildren: false })).toBe(
      true,
    );
    expect(firstSigninNeeded({ isAdult: false, bringingChildren: false })).toBe(
      false,
    );
  });
});

describe("discordPrefill", () => {
  const email = "ada@example.com";
  it("keeps the profile's handle", () => {
    expect(
      discordPrefill(
        "ada_p",
        [{ purchaserEmail: email, purchaserDiscord: "ada_t" }],
        email,
      ),
    ).toBe("ada_p");
  });

  it("falls back to the first handle from a ticket they bought", () => {
    expect(
      discordPrefill(
        " ",
        [
          { purchaserEmail: "bob@example.com", purchaserDiscord: "bob" },
          { purchaserEmail: email, purchaserDiscord: null },
          { purchaserEmail: email, purchaserDiscord: "ada_new" },
          { purchaserEmail: email, purchaserDiscord: "ada_old" },
        ],
        email,
      ),
    ).toBe("ada_new");
  });

  it("is empty with nothing to go on", () => {
    expect(discordPrefill(null, [], email)).toBe("");
    expect(
      discordPrefill(
        null,
        [{ purchaserEmail: "bob@example.com", purchaserDiscord: "bob" }],
        email,
      ),
    ).toBe("");
  });
});
