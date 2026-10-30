import { describe, expect, it } from "vitest";
import {
  buildDays,
  clashDescription,
  defaultEnd,
  endMinutes,
  movedEnd,
  wallAt,
  EDITOR_DAYS,
  findClash,
  fromPacificWall,
  movedTimes,
  openingDayKey,
  selectedDay,
  outsideHours,
  overlapLanes,
  overlapWarning,
  type LocationVisibility,
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
  shepherd: null,
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

const rooms = (visibility: LocationVisibility = "public") => [
  { id: "room1", name: "Eigen Hall", visibility },
  { id: "room2", name: "Annex", visibility: "public" as const },
];

describe("findClash", () => {
  const existing = session({
    id: "a",
    title: "Chess",
    locationId: "room1",
    startsAt: "2026-11-07T17:00:00.000Z",
    endsAt: "2026-11-07T17:55:00.000Z",
  });
  const chess = {
    title: "Chess",
    room: "Eigen Hall",
    startsAt: "2026-11-07T17:00:00.000Z",
    endsAt: "2026-11-07T17:55:00.000Z",
  };
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
        rooms(),
      ),
    ).toEqual(chess);
  });

  it("allows back-to-back sessions", () => {
    expect(
      findClash(
        [existing],
        move("2026-11-07T17:55:00.000Z", "2026-11-07T18:25:00.000Z"),
        rooms(),
      ),
    ).toBeNull();
  });

  it("ignores other rooms, the session itself and unplaced drafts", () => {
    const times = [
      "2026-11-07T17:00:00.000Z",
      "2026-11-07T17:55:00.000Z",
    ] as const;
    expect(
      findClash([existing], move(...times, { locationId: "room2" }), rooms()),
    ).toBeNull();
    expect(
      findClash([existing], move(...times, { id: "a" }), rooms()),
    ).toBeNull();
    expect(
      findClash(
        [session({ id: "c", locationId: "room1" })],
        move(...times),
        rooms(),
      ),
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
        rooms(),
      ),
    ).toBeNull();
  });

  it("lets volunteer shifts overlap but not hidden-room sessions", () => {
    const overlap = move(
      "2026-11-07T17:30:00.000Z",
      "2026-11-07T18:25:00.000Z",
    );
    expect(findClash([existing], overlap, rooms("volunteer"))).toBeNull();
    expect(findClash([existing], overlap, rooms("hidden"))).toEqual(chess);
  });
});

describe("form end times", () => {
  const h = (hours: number, minutes = 0) => hours * 60 + minutes;
  it("reads an end at the next midnight as 24:00", () => {
    const start = fromPacificWall("2026-11-07T23:00")!.toISOString();
    const end = fromPacificWall("2026-11-08T00:00")!.toISOString();
    expect(endMinutes(start, end)).toBe(h(24));
    expect(
      endMinutes(start, fromPacificWall("2026-11-07T23:55")!.toISOString()),
    ).toBe(h(23, 55));
  });
  it("writes 24:00 as the next day's 00:00", () => {
    expect(wallAt("2026-11-07", h(14, 30))).toBe("2026-11-07T14:30");
    expect(wallAt("2026-11-07", h(24))).toBe("2026-11-08T00:00");
    expect(wallAt("2026-11-30", h(24))).toBe("2026-12-01T00:00");
  });
  it("gives any start before midnight a later default end", () => {
    expect(defaultEnd(h(10))).toBe(h(10, 25));
    expect(defaultEnd(h(23, 59))).toBe(h(24));
    for (let start = 0; start < h(24); start += 7)
      expect(defaultEnd(start)).toBeGreaterThan(start);
  });
  it("keeps the length when the start moves, up to ending at midnight", () => {
    expect(movedEnd(h(10), h(11), h(23))).toBe(h(24));
    expect(movedEnd(h(10), h(11), h(23, 30))).toBe(h(23, 55));
    expect(movedEnd(null, null, h(12))).toBe(h(12, 25));
  });
});

describe("outsideHours", () => {
  const pt = (wall: string) => fromPacificWall(wall)!;
  it("allows any start and end within the day", () => {
    expect(
      outsideHours(pt("2026-11-07T10:00"), pt("2026-11-07T10:55")),
    ).toBeNull();
    expect(
      outsideHours(pt("2026-11-07T23:00"), pt("2026-11-08T00:00")),
    ).toBeNull();
    expect(
      outsideHours(pt("2026-11-07T09:00"), pt("2026-11-07T13:15")),
    ).toBeNull();
    expect(
      outsideHours(pt("2026-11-06T07:10"), pt("2026-11-06T08:20")),
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
  it("puts an extra day in date order", () => {
    const thu = session({
      id: "t",
      startsAt: fromPacificWall("2026-11-05T09:00")!.toISOString(),
      endsAt: fromPacificWall("2026-11-05T13:00")!.toISOString(),
    });
    expect(buildDays([thu]).map((d) => d.key)).toEqual([
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
    expect(buildDays([]).map((d) => d.key)).toHaveLength(3);
  });
  it("gives the editor Thursday through Monday", () => {
    expect(buildDays([], EDITOR_DAYS).map((d) => d.name)).toEqual([
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
      "Monday",
    ]);
  });
  it("opens on Friday even with an earlier day shown", () => {
    expect(openingDayKey(buildDays([], EDITOR_DAYS))).toBe("2026-11-06");
    expect(openingDayKey(buildDays([]))).toBe("2026-11-06");
  });
  it("keeps the selected tab when a session lands on an earlier day", () => {
    const before = buildDays([], EDITOR_DAYS);
    expect(selectedDay(before, "2026-11-07").name).toBe("Saturday");
    const early = session({
      id: "early",
      startsAt: fromPacificWall("2026-11-03T10:00")!.toISOString(),
      endsAt: fromPacificWall("2026-11-03T11:00")!.toISOString(),
    });
    const after = buildDays([early], EDITOR_DAYS);
    expect(after[0].key).toBe("2026-11-03");
    expect(selectedDay(after, "2026-11-07").name).toBe("Saturday");
  });
  it("falls back to the opening day when the selected day is gone", () => {
    expect(selectedDay(buildDays([], EDITOR_DAYS), "2026-11-03").key).toBe(
      "2026-11-06",
    );
  });
});

describe("overlapLanes", () => {
  const shift = (id: string, from: string, to: string, locationId = "r") => ({
    id,
    locationId,
    startsAt: fromPacificWall(`2026-11-07T${from}`)!.toISOString(),
    endsAt: fromPacificWall(`2026-11-07T${to}`)!.toISOString(),
  });
  it("splits overlapping sessions in a column and leaves the rest whole", () => {
    const lanes = overlapLanes([
      shift("a", "09:00", "13:15"),
      shift("b", "13:00", "17:00"),
      shift("c", "17:00", "18:00"),
      shift("d", "09:00", "10:00", "other"),
    ]);
    expect(lanes.get("a")).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get("b")).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get("c")).toEqual({ lane: 0, lanes: 1 });
    expect(lanes.get("d")).toEqual({ lane: 0, lanes: 1 });
  });
  it("reuses a lane once it frees up", () => {
    const lanes = overlapLanes([
      shift("a", "09:00", "12:00"),
      shift("b", "10:00", "11:00"),
      shift("c", "11:00", "13:00"),
    ]);
    expect(lanes.get("c")).toEqual({ lane: 1, lanes: 2 });
  });
});

describe("clashDescription", () => {
  const clash = {
    title: "Chess",
    room: "Eigen Hall",
    startsAt: fromPacificWall("2026-11-07T10:00")!.toISOString(),
    endsAt: fromPacificWall("2026-11-07T10:55")!.toISOString(),
  };
  it("names the session, room and its times", () => {
    expect(clashDescription(clash)).toBe(
      '"Chess" in Eigen Hall (10:00 AM–10:55 AM)',
    );
    expect(overlapWarning(clash)).toBe(
      'Saved, but this overlaps "Chess" in Eigen Hall (10:00 AM–10:55 AM).',
    );
  });
});
