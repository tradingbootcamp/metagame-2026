import { describe, expect, it } from "vitest";
import { findClash, movedTimes, type ScheduleSession } from "./schedule";

const session = (over: Partial<ScheduleSession>): ScheduleSession => ({
  id: "s",
  slug: "s",
  title: "S",
  description: null,
  category: null,
  startsAt: null,
  endsAt: null,
  locationId: null,
  maxCapacity: null,
  minCapacity: null,
  ages: null,
  needs: null,
  status: "draft",
  airtableRfpRecordId: null,
  hosts: [],
  ...over,
});

const at = (iso: string) => new Date(iso);

describe("movedTimes", () => {
  it("keeps a placed session's length", () => {
    const moved = movedTimes(
      session({
        startsAt: "2026-11-07T17:00:00.000Z",
        endsAt: "2026-11-07T18:25:00.000Z",
      }),
      at("2026-11-08T20:30:00.000Z"),
    );
    expect(moved.startsAt.toISOString()).toBe("2026-11-08T20:30:00.000Z");
    expect(moved.endsAt.toISOString()).toBe("2026-11-08T21:55:00.000Z");
  });

  it("gives an unplaced draft an hour, ending on the passing period", () => {
    const moved = movedTimes(session({}), at("2026-11-07T17:00:00.000Z"));
    expect(moved.endsAt.toISOString()).toBe("2026-11-07T17:55:00.000Z");
  });
});

describe("findClash", () => {
  const existing = session({
    id: "a",
    title: "Chess",
    locationId: "room1",
    startsAt: "2026-11-07T17:00:00.000Z",
    endsAt: "2026-11-07T17:55:00.000Z",
  });
  const move = (startsAt: string, endsAt: string, over = {}) => ({
    id: "b",
    locationId: "room1",
    startsAt: at(startsAt),
    endsAt: at(endsAt),
    ...over,
  });

  it("finds an overlap in the same room", () => {
    expect(
      findClash(
        [existing],
        move("2026-11-07T17:30:00.000Z", "2026-11-07T18:25:00.000Z"),
      ),
    ).toBe(existing);
  });

  it("allows back-to-back sessions", () => {
    expect(
      findClash(
        [existing],
        move("2026-11-07T17:55:00.000Z", "2026-11-07T18:25:00.000Z"),
      ),
    ).toBeNull();
  });

  it("ignores other rooms, the session itself and unplaced drafts", () => {
    const times = [
      "2026-11-07T17:00:00.000Z",
      "2026-11-07T17:55:00.000Z",
    ] as const;
    expect(
      findClash([existing], move(...times, { locationId: "room2" })),
    ).toBeNull();
    expect(findClash([existing], move(...times, { id: "a" }))).toBeNull();
    expect(
      findClash([session({ id: "c", locationId: "room1" })], move(...times)),
    ).toBeNull();
  });

  it("never clashes in No room", () => {
    const loose = { ...existing, locationId: null };
    expect(
      findClash(
        [loose],
        move("2026-11-07T17:00:00.000Z", "2026-11-07T17:55:00.000Z", {
          locationId: null,
        }),
      ),
    ).toBeNull();
  });
});
