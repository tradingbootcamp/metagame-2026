import { describe, expect, it } from "vitest";
import {
  firstSigninHidden,
  firstSigninNeeded,
  prefillName,
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
  createdAt: new Date("2026-10-03T17:00:00.000Z"),
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
        { id: "a", tier: "Standard", purchasedAt: "2026-10-03T17:00:00.000Z" },
        { id: "d", tier: "Day pass", purchasedAt: "2026-10-03T17:00:00.000Z" },
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

describe("prefillName", () => {
  const t = (
    purchaserEmail: string,
    purchaserName: string | null,
    at: string,
  ) => ({
    purchaserEmail,
    purchaserName,
    createdAt: new Date(at),
  });
  it("prefers the profile, then the account name", () => {
    expect(prefillName("Bri", "Brian S", [], "b@x.com")).toBe("Bri");
    expect(prefillName(null, "Brian S", [], "b@x.com")).toBe("Brian S");
  });
  it("falls back to the newest ticket bought under this email", () => {
    const rows = [
      t("b@x.com", "Old Name", "2026-09-01T00:00:00Z"),
      t("b@x.com", "New Name", "2026-10-01T00:00:00Z"),
      t("other@x.com", "Someone", "2026-10-05T00:00:00Z"),
    ];
    expect(prefillName("", " ", rows, "b@x.com")).toBe("New Name");
  });
  it("is blank when nothing has a name", () => {
    expect(
      prefillName(
        null,
        "",
        [t("b@x.com", null, "2026-10-01T00:00:00Z")],
        "b@x.com",
      ),
    ).toBe("");
  });
});
