import { describe, expect, it } from "vitest";
import { capacityRefusal, dayPassOf, dayPassRefusal } from "./seat-rules";

const ME = "user_me";
const EMAIL = "me@example.com";
const FRIDAY_NOON = "2026-11-06T20:00:00.000Z";
const SATURDAY_NOON = "2026-11-07T20:00:00.000Z";

const ticket = (
  over: Partial<Parameters<typeof dayPassRefusal>[0][number]>,
) => ({
  status: "paid",
  tier: "Friday Day Pass",
  ownerUserId: ME,
  holderUserId: null,
  purchaserEmail: EMAIL,
  ...over,
});

describe("dayPassOf", () => {
  it.each([
    ["friday", "friday"],
    ["Friday Day Pass", "friday"],
    ["  saturday day pass ", "saturday"],
    ["Metagame 2026 Day Pass - Sunday", "sunday"],
  ])("reads %s", (tier, id) => {
    expect(dayPassOf(tier)?.id).toBe(id);
  });

  it.each(["Standard", "Supporter", "Day Pass", "Friday Night Pass", "", null])(
    "%s is not a day pass",
    (tier) => {
      expect(dayPassOf(tier)).toBeUndefined();
    },
  );
});

describe("dayPassRefusal", () => {
  const refuse = (tickets: ReturnType<typeof ticket>[], at = SATURDAY_NOON) =>
    dayPassRefusal(tickets, ME, EMAIL, at);

  it("lets a day pass RSVP on its own day", () => {
    expect(refuse([ticket({})], FRIDAY_NOON)).toBeNull();
  });

  it("refuses another day and says which days are which", () => {
    const message = refuse([ticket({})]);
    expect(message).toContain("Friday, November 6, 2026");
    expect(message).toContain("Sat, Nov 7");
  });

  it("goes by the Pacific day, not UTC", () => {
    expect(refuse([ticket({})], "2026-11-07T07:30:00.000Z")).toBeNull();
    expect(refuse([ticket({})], "2026-11-06T07:30:00.000Z")).toContain(
      "Thu, Nov 5",
    );
  });

  it("never refuses a weekend or unrecognized ticket", () => {
    expect(refuse([ticket({ tier: "Standard" })])).toBeNull();
    expect(refuse([ticket({ tier: "Mystery comp" })])).toBeNull();
    expect(refuse([ticket({ tier: null })])).toBeNull();
    expect(refuse([ticket({}), ticket({ tier: "Standard" })])).toBeNull();
  });

  it("counts a second pass the viewer holds but can't also claim", () => {
    const second = ticket({ tier: "Saturday Day Pass", ownerUserId: null });
    expect(refuse([ticket({}), second])).toBeNull();
    expect(
      refuse([
        ticket({}),
        { ...second, holderUserId: ME, purchaserEmail: null },
      ]),
    ).toBeNull();
  });

  it("lets an unclaimed non-day-pass ticket the viewer holds admit every day", () => {
    const full = ticket({ tier: "Standard", ownerUserId: null });
    expect(refuse([ticket({}), full])).toBeNull();
  });

  it("doesn't count a pass someone else now has", () => {
    const saturday = { tier: "Saturday Day Pass", purchaserEmail: EMAIL };
    for (const other of [
      ticket({ ...saturday, ownerUserId: "user_friend" }),
      ticket({ ...saturday, ownerUserId: null, holderUserId: "user_friend" }),
      ticket({ ...saturday, status: "failed" }),
    ]) {
      expect(refuse([ticket({}), other])).toContain("Friday");
    }
  });

  it("has nothing to say without a usable ticket", () => {
    expect(refuse([])).toBeNull();
    expect(refuse([ticket({ status: "pending" })])).toBeNull();
  });
});

describe("capacityRefusal", () => {
  it("refuses a cut below who's going and says how many", () => {
    expect(capacityRefusal(4, 10, 6)).toBe(
      "6 people are already going, so capacity can't go below 6.",
    );
    expect(capacityRefusal(1, null, 3)).toContain("3 people");
  });

  it("reads right for one person", () => {
    expect(capacityRefusal(0, 5, 1)).toContain("1 person is already going");
  });

  it("allows exactly who's going, more, or no limit", () => {
    expect(capacityRefusal(6, 10, 6)).toBeNull();
    expect(capacityRefusal(20, 10, 6)).toBeNull();
    expect(capacityRefusal(null, 10, 6)).toBeNull();
  });

  it("doesn't block saving a session staff already took below its count", () => {
    expect(capacityRefusal(10, 10, 12)).toBeNull();
    expect(capacityRefusal(11, 10, 12)).toBeNull();
    expect(capacityRefusal(9, 10, 12)).toContain("12 people");
  });
});
