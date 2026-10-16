import { describe, expect, it } from "vitest";
import {
  allocateCents,
  attendeesFromMetadata,
  packMetadata,
  parsePackAttendees,
} from "./family-pack";

const attendees = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    name: `Guest ${i}`,
    email: `guest${i}@example.com`,
  }));

describe("family pack eligibility", () => {
  it.each([4, 5, 6])(
    "round-trips %i named admissions through Stripe metadata",
    (count) => {
      expect(
        attendeesFromMetadata(
          packMetadata(parsePackAttendees(attendees(count))),
        ),
      ).toEqual(attendees(count));
    },
  );
  it.each([0, 1, 2, 3, 7, 100])("rejects %i admissions", (count) => {
    expect(() => parsePackAttendees(attendees(count))).toThrow();
  });
  it("rejects malformed attendee data and oversized metadata", () => {
    for (const invalid of [
      null,
      {},
      { name: " ", email: "g@example.com" },
      { name: "Guest", email: "not-email" },
      { name: "x".repeat(81), email: "g@example.com" },
    ]) {
      expect(() => parsePackAttendees([invalid, ...attendees(3)])).toThrow();
    }
    expect(() => attendeesFromMetadata({ quantity: "4.5" })).toThrow();
    expect(() => attendeesFromMetadata({ quantity: "4" })).toThrow();
  });
});

describe("group accounting", () => {
  it.each([4, 5, 6])(
    "retains every cent of fees and net across %i tickets",
    (count) => {
      for (const cents of [0, 1, 17, 4381, count * 37500 - 4381]) {
        const parts = Array.from({ length: count }, (_, i) =>
          allocateCents(cents, count, i),
        );
        expect(parts.reduce((a, b) => a + b, 0)).toBe(cents);
        expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
      }
    },
  );
});
