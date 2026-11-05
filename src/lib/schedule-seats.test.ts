import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HostSessionFields } from "./schedule-input";
import { fakeNeon, type Statement } from "@/test/fake-neon";

const h = vi.hoisted(() => ({
  db: null as unknown,
  afters: [] as (() => Promise<void>)[],
  outsideRequest: false,
  send: vi.fn(),
  report: vi.fn(),
}));
vi.mock("@/db", async () => ({
  getDb: () => h.db,
  schema: await vi.importActual("@/db/schema"),
}));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (f: unknown) => f,
}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => {
    if (h.outsideRequest) throw new Error("`after` outside a request scope");
    h.afters.push(task);
  },
}));
vi.mock("./access", () => ({ can: vi.fn() }));
vi.mock("./auth", () => ({ currentSession: vi.fn(), getAuth: vi.fn() }));
vi.mock("./email", () => ({ sendWaitlistPromotionEmails: h.send }));
vi.mock("./error-report", () => ({ reportError: h.report }));

import {
  cancelRsvp,
  CapacityBelowGoingError,
  releaseUpcomingSeats,
  updateSessionAsHost,
} from "./schedule-store";

type Row = { sessionId: string; userId: string; status: "going" | "waitlist" };

const SESSION = "11111111-1111-4111-8111-111111111111";
const START = new Date("2099-11-07T22:00:00.000Z");
const END = new Date("2099-11-07T23:00:00.000Z");

/** Just enough of the rsvps table and its capacity trigger to run the store. */
function world({
  capacity = 1,
  seated = [] as Row[],
  session = {
    status: "published",
    startsAt: START.toISOString(),
    endsAt: END.toISOString(),
  },
} = {}) {
  const rows = [...seated];
  const answer = (s: Statement): unknown[][] | void => {
    if (s.sql.startsWith('delete from "rsvps"')) {
      const at = rows.findIndex(
        (r) => r.sessionId === s.params[0] && r.userId === s.params[1],
      );
      if (at >= 0) rows.splice(at, 1);
      return;
    }
    if (s.sql.startsWith('update "rsvps"')) {
      const [, sessionId, userId] = s.params;
      const row = rows.find(
        (r) =>
          r.sessionId === sessionId &&
          r.userId === userId &&
          r.status === "waitlist",
      );
      if (!row) return [];
      const going = rows.filter((r) => r.status === "going").length;
      if (going >= capacity) {
        throw Object.assign(new Error("full"), {
          constraint: "rsvps_capacity",
        });
      }
      row.status = "going";
      return [[userId]];
    }
    if (s.sql.startsWith('select "user_id" from "rsvps"')) {
      return rows.filter((r) => r.status === "waitlist").map((r) => [r.userId]);
    }
    if (s.sql.includes('"slug"') && s.sql.includes('from "sessions"')) {
      return [
        [
          "the-talk",
          "The Talk",
          session.status,
          session.startsAt,
          session.endsAt,
        ],
      ];
    }
    if (s.sql.includes('from "user"')) {
      return (s.params as string[]).map((id) => [id, `${id}@example.com`]);
    }
  };
  const neon = fakeNeon(answer);
  h.db = neon.db;
  return { rows, ...neon };
}

const going = (userId: string): Row => ({
  sessionId: SESSION,
  userId,
  status: "going",
});
const waiting = (userId: string): Row => ({
  sessionId: SESSION,
  userId,
  status: "waitlist",
});
const statusOf = (rows: Row[]) =>
  Object.fromEntries(rows.map((r) => [r.userId, r.status]));
const afterResponse = async () => {
  for (const task of h.afters.splice(0)) await task();
};

beforeEach(() => {
  h.afters.length = 0;
  h.outsideRequest = false;
  h.send.mockReset();
  h.send.mockResolvedValue(undefined);
  h.report.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("waitlist promotion notices", () => {
  it("tells the promoted person the session and time", async () => {
    const { rows } = world({
      seated: [going("a"), waiting("b"), waiting("c")],
    });
    await cancelRsvp(SESSION, "a");
    await afterResponse();
    expect(statusOf(rows)).toEqual({ b: "going", c: "waitlist" });
    expect(h.send).toHaveBeenCalledExactlyOnceWith([
      {
        to: "b@example.com",
        name: "b",
        title: "The Talk",
        slug: "the-talk",
        when: "Sat, Nov 7, 2:00 PM – 3:00 PM Pacific",
      },
    ]);
  });

  it("sends nothing until the response is on its way", async () => {
    world({ seated: [going("a"), waiting("b")] });
    await cancelRsvp(SESSION, "a");
    expect(h.send).not.toHaveBeenCalled();
    expect(h.afters).toHaveLength(1);
  });

  it("a failed email costs only the notice, and the team hears", async () => {
    h.send.mockRejectedValue(new Error("Resend is down"));
    const { rows } = world({ seated: [going("a"), waiting("b")] });
    await expect(cancelRsvp(SESSION, "a")).resolves.toBeUndefined();
    await expect(afterResponse()).resolves.toBeUndefined();
    expect(statusOf(rows)).toEqual({ b: "going" });
    expect(h.report).toHaveBeenCalledOnce();
    expect(h.report.mock.calls[0][0].details.users).toBe("b");
  });

  it("a failed look-up of who to tell doesn't reach the caller either", async () => {
    const { rows } = world({ seated: [going("a"), waiting("b")] });
    await cancelRsvp(SESSION, "a");
    h.db = null;
    await expect(afterResponse()).resolves.toBeUndefined();
    expect(statusOf(rows)).toEqual({ b: "going" });
    expect(h.report).toHaveBeenCalledOnce();
  });

  it("still sends, and still cancels, outside a request", async () => {
    h.outsideRequest = true;
    const { rows } = world({ seated: [going("a"), waiting("b")] });
    await expect(cancelRsvp(SESSION, "a")).resolves.toBeUndefined();
    expect(statusOf(rows)).toEqual({ b: "going" });
    await vi.waitFor(() => expect(h.send).toHaveBeenCalledOnce());
  });

  it("tells everyone a freed block of seats moved up, and no one else", async () => {
    world({
      capacity: 2,
      seated: [going("a"), waiting("b"), waiting("c"), waiting("d")],
    });
    await cancelRsvp(SESSION, "a");
    await afterResponse();
    expect(h.send.mock.calls[0][0].map((p: { to: string }) => p.to)).toEqual([
      "b@example.com",
      "c@example.com",
    ]);
  });

  it("stays quiet when nobody moved", async () => {
    world({ seated: [going("a"), going("b"), waiting("c")], capacity: 1 });
    await cancelRsvp(SESSION, "a");
    expect(h.afters).toHaveLength(0);
  });

  it("only the update that moved someone tells them", async () => {
    // A second cancellation seated them between the read and this update.
    h.db = fakeNeon((s) =>
      s.sql.startsWith('select "user_id"') ? [["b"]] : [],
    ).db;
    await cancelRsvp(SESSION, "a");
    expect(h.afters).toHaveLength(0);
  });

  it("only moves people still on the waitlist", async () => {
    const { statements } = world({ seated: [going("a"), waiting("b")] });
    await cancelRsvp(SESSION, "a");
    const update = statements.find((s) => s.sql.startsWith('update "rsvps"'));
    expect(update?.params).toEqual(["going", SESSION, "b", "waitlist"]);
  });

  it.each([
    ["a draft", { status: "draft" }],
    ["a finished session", { endsAt: "2020-01-01T00:00:00.000Z" }],
    ["an unplaced session", { startsAt: null, endsAt: null }],
  ])("doesn't announce a seat at %s", async (_name, over) => {
    const session = {
      status: "published",
      startsAt: START.toISOString(),
      endsAt: END.toISOString(),
      ...over,
    } as never;
    const { rows } = world({ seated: [going("a"), waiting("b")], session });
    await cancelRsvp(SESSION, "a");
    await afterResponse();
    expect(statusOf(rows)).toEqual({ b: "going" });
    expect(h.send).not.toHaveBeenCalled();
    expect(h.report).not.toHaveBeenCalled();
  });
});

describe("releaseUpcomingSeats", () => {
  function seats(held: [string, string[] | null][]) {
    const answer = (s: Statement) =>
      s.sql.includes('"invite_emails"') ? held : undefined;
    const neon = fakeNeon(answer);
    h.db = neon.db;
    return neon;
  }
  const dropped = (statements: Statement[]) =>
    statements
      .filter((s) => s.sql.startsWith('delete from "rsvps"'))
      .map((s) => s.params);

  it("only looks at this account's sessions yet to start", async () => {
    const { statements } = seats([]);
    await releaseUpcomingSeats("me", "me@example.com");
    const [read] = statements;
    expect(read.sql).toContain('"rsvps"."user_id" = $1');
    expect(read.sql).toContain('"sessions"."starts_at" is null');
    expect(read.sql).toContain('"sessions"."starts_at" > $2');
    expect(read.params[0]).toBe("me");
  });

  it("cancels each like a normal cancellation, which moves its waitlist", async () => {
    const { statements } = seats([
      ["s1", null],
      ["s2", ["someone@example.com"]],
    ]);
    await releaseUpcomingSeats("me", "me@example.com");
    expect(dropped(statements)).toEqual([
      ["s1", "me"],
      ["s2", "me"],
    ]);
    expect(
      statements.filter((s) => s.sql.startsWith('select "user_id"')),
    ).toHaveLength(2);
  });

  it("keeps a seat the guest list gave them", async () => {
    const { statements } = seats([["s1", ["me@example.com"]]]);
    await releaseUpcomingSeats("me", "ME@example.com");
    expect(dropped(statements)).toEqual([]);
  });
});

describe("updateSessionAsHost", () => {
  const fields = (maxCapacity: number | null) =>
    ({
      title: "The Talk",
      maxCapacity,
      minCapacity: null,
    }) as HostSessionFields;

  /** Answers the guard as the database would, from the capacity it's given. */
  function hosted(stored: number | null, count: number) {
    const answer = (s: Statement) => {
      if (s.sql.includes('select "max_capacity"')) return [[stored]];
      if (s.sql.includes('select count(*) from "rsvps"') && !isSave(s)) {
        return [[count]];
      }
      if (isSave(s)) {
        const next = s.sql.includes(">=") ? (s.params.at(-1) as number) : null;
        const allowed =
          next === null || next >= count || (stored !== null && next >= stored);
        return allowed ? [[SESSION]] : [];
      }
    };
    const neon = fakeNeon(answer);
    h.db = neon.db;
    return neon;
  }
  const isSave = (s: Statement) => s.sql.startsWith('update "sessions"');

  it("refuses a cut below who's going, saying how many", async () => {
    hosted(10, 6);
    const attempt = updateSessionAsHost(SESSION, fields(4));
    await expect(attempt).rejects.toBeInstanceOf(CapacityBelowGoingError);
    await expect(attempt).rejects.toThrow("6 people are already going");
  });

  it("counts and saves behind the session lock, in one transaction", async () => {
    const { batches } = hosted(10, 6);
    await updateSessionAsHost(SESSION, fields(6));
    expect(batches).toHaveLength(1);
    const [lock, tally, save] = batches[0];
    expect(lock.sql).toMatch(/^select "max_capacity".* for no key update$/);
    expect(tally.sql).toMatch(/^select count\(\*\) from "rsvps"/);
    expect(isSave(save)).toBe(true);
    expect(save.sql.replace(/\$\d+/g, "?")).toContain(
      '(? >= (select count(*) from "rsvps" where ("rsvps"."session_id" = ? and "rsvps"."status" = ?)) or ? >= "sessions"."max_capacity")',
    );
  });

  it("says the session is gone rather than blaming the capacity", async () => {
    h.db = fakeNeon((s) =>
      s.sql.includes("count(") && !isSave(s) ? [[0]] : [],
    ).db;
    const attempt = updateSessionAsHost(SESSION, fields(4));
    await expect(attempt).rejects.toThrow("no longer exists");
    await expect(attempt).rejects.not.toBeInstanceOf(CapacityBelowGoingError);
  });

  it("lets a host cut down to exactly who's going", async () => {
    hosted(10, 6);
    await expect(
      updateSessionAsHost(SESSION, fields(6)),
    ).resolves.toBeUndefined();
  });

  it("lets a host edit a session staff already took below its count", async () => {
    hosted(4, 6);
    await expect(
      updateSessionAsHost(SESSION, fields(4)),
    ).resolves.toBeUndefined();
  });

  it("takes no lock when the host sets no limit", async () => {
    const { statements, batches } = hosted(4, 6);
    await updateSessionAsHost(SESSION, fields(null));
    expect(batches).toHaveLength(0);
    expect(statements.filter(isSave)).toHaveLength(1);
  });

  it("leaves the team free to do it from the same form, with no guard", async () => {
    const { statements, batches } = hosted(10, 6);
    await updateSessionAsHost(SESSION, fields(4), { allowBelowGoing: true });
    expect(batches).toHaveLength(0);
    const [save] = statements.filter(isSave);
    expect(save.sql).not.toContain("count(");
  });
});
