import { describe, expect, it } from "vitest";
import {
  buildDays,
  findClash,
  fromPacificWall,
  movedTimes,
  outsideHours,
  type ScheduleSession,
} from "./schedule";

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

describe("outsideHours", () => {
  const pt = (wall: string) => fromPacificWall(wall)!;
  it("allows a session inside the day's hours", () => {
    expect(
      outsideHours(pt("2026-11-07T10:00"), pt("2026-11-07T10:55")),
    ).toBeNull();
    expect(
      outsideHours(pt("2026-11-07T23:00"), pt("2026-11-08T00:00")),
    ).toBeNull();
  });
  it("refuses starting before opening, which is later on Friday", () => {
    expect(
      outsideHours(pt("2026-11-07T09:30"), pt("2026-11-07T10:25"))?.field,
    ).toBe("startsAt");
    expect(
      outsideHours(pt("2026-11-06T13:30"), pt("2026-11-06T14:25"))?.field,
    ).toBe("startsAt");
    expect(
      outsideHours(pt("2026-11-06T14:00"), pt("2026-11-06T14:55")),
    ).toBeNull();
  });
  it("refuses running past midnight", () => {
    expect(
      outsideHours(pt("2026-11-07T23:30"), pt("2026-11-08T00:25"))?.field,
    ).toBe("endsAt");
  });
});

describe("buildDays", () => {
  it("runs each day from opening to midnight", () => {
    const [fri, sat] = buildDays([]);
    expect(fri.slots[0]).toBe(14 * 60);
    expect(sat.slots[0]).toBe(10 * 60);
    expect(sat.slots.at(-1)).toBe(23 * 60 + 30);
  });
  it("reaches earlier to show a session saved before opening", () => {
    const early = session({
      id: "e",
      startsAt: fromPacificWall("2026-11-07T08:00")!.toISOString(),
      endsAt: fromPacificWall("2026-11-07T08:55")!.toISOString(),
    });
    const sat = buildDays([early]).find((d) => d.key === "2026-11-07")!;
    expect(sat.slots[0]).toBe(8 * 60);
  });
});
