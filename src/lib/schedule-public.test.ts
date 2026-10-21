import { describe, expect, it } from "vitest";
import {
  buildDays,
  cellSessions,
  NO_ROOM,
  publicSchedule,
  summarizeRsvps,
  type ScheduleLocation,
  type ScheduleSession,
} from "./schedule";

const session = (over: Partial<ScheduleSession>): ScheduleSession => ({
  id: "s",
  slug: "s",
  title: "S",
  description: null,
  category: null,
  startsAt: "2026-11-07T18:00:00.000Z",
  endsAt: "2026-11-07T18:55:00.000Z",
  locationId: null,
  maxCapacity: null,
  minCapacity: null,
  ages: null,
  needs: "a projector",
  status: "published",
  airtableRfpRecordId: "rec1",
  hosts: [{ userId: "u1", name: "Ada", email: "ada@example.com" }],
  ...over,
});

const room = (over: Partial<ScheduleLocation>): ScheduleLocation => ({
  id: "r",
  name: "R",
  capacity: null,
  campusLocation: null,
  description: "internal notes",
  displayOrder: 0,
  showInSchedule: true,
  thumbnailUrl: null,
  imageUrl: null,
  ...over,
});

describe("summarizeRsvps", () => {
  const rows = [
    { status: "going" as const, name: "Ada" },
    { status: "waitlist" as const, name: "Grace" },
    { status: "going" as const, name: "Alan" },
  ];

  it("gives names, in order, when allowed", () => {
    expect(summarizeRsvps(rows, true)).toEqual({
      going: 2,
      waitlist: 1,
      names: { going: ["Ada", "Alan"], waitlist: ["Grace"] },
    });
  });

  it("gives counts and no names otherwise", () => {
    const summary = summarizeRsvps(rows, false);
    expect(summary).toEqual({ going: 2, waitlist: 1, names: null });
    expect(JSON.stringify(summary)).not.toMatch(/Ada|Alan|Grace/);
  });
});

describe("publicSchedule", () => {
  it("keeps only published, placed sessions and drops private fields", () => {
    const { sessions } = publicSchedule({
      locations: [],
      sessions: [
        session({ id: "pub" }),
        session({ id: "draft", status: "draft" }),
        session({
          id: "unplaced",
          status: "draft",
          startsAt: null,
          endsAt: null,
        }),
      ],
    });
    expect(sessions.map((s) => s.id)).toEqual(["pub"]);
    const json = JSON.stringify(sessions);
    expect(json).not.toContain("ada@example.com");
    expect(json).not.toContain("a projector");
    expect(json).not.toContain("rec1");
    expect(sessions[0].hosts).toEqual([{ name: "Ada" }]);
  });

  it("shows marked rooms plus unmarked ones a published session uses", () => {
    const { locations } = publicSchedule({
      locations: [
        room({ id: "shown" }),
        room({ id: "hidden", showInSchedule: false }),
        room({ id: "used", showInSchedule: false }),
      ],
      sessions: [
        session({ id: "a", locationId: "used" }),
        session({ id: "b", locationId: "hidden", status: "draft" }),
      ],
    });
    expect(locations.map((l) => l.id)).toEqual(["shown", "used"]);
    expect(JSON.stringify(locations)).not.toContain("internal notes");
  });
});

describe("cellSessions", () => {
  it("picks sessions by column and starting slot, roomless in NO_ROOM", () => {
    const [, saturday] = buildDays([
      session({ id: "in-r", locationId: "r" }),
      session({ id: "no-room" }),
      session({
        id: "later",
        locationId: "r",
        startsAt: "2026-11-07T19:00:00.000Z",
        endsAt: "2026-11-07T19:55:00.000Z",
      }),
    ]);
    // 18:00Z is 10:00 Pacific.
    const ids = (col: string) =>
      cellSessions(saturday.sessions, col, 600).map((s) => s.id);
    expect(ids("r")).toEqual(["in-r"]);
    expect(ids(NO_ROOM)).toEqual(["no-room"]);
  });
});
