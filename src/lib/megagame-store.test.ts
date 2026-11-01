import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Chain = Record<string, ReturnType<typeof vi.fn>> & {
  calls: unknown[][];
};

const { db } = vi.hoisted(() => {
  const queue: unknown[] = [];
  const chain = () => {
    const c: Record<string, unknown> = { calls: [] };
    for (const m of [
      "from",
      "where",
      "limit",
      "set",
      "values",
      "innerJoin",
      "leftJoin",
      "orderBy",
      "groupBy",
      "onConflictDoNothing",
      "returning",
    ])
      c[m] = vi.fn((...args: unknown[]) => {
        (c.calls as unknown[][]).push([m, ...args]);
        return c;
      });
    c.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) =>
      Promise.resolve(queue.length ? queue.shift() : []).then(ok, bad);
    return c;
  };
  const db = {
    queue,
    select: vi.fn(() => chain()),
    insert: vi.fn(() => chain()),
    update: vi.fn(() => chain()),
    execute: vi.fn(async () => ({ rows: (queue.shift() as unknown[]) ?? [] })),
    batch: vi.fn(async (qs: unknown[]) => qs.map(() => queue.shift() ?? [])),
  };
  return { db };
});
vi.mock("@/db", async () => {
  const schema = await import("@/db/schema");
  return { getDb: () => db, schema };
});

import { schema } from "@/db";
import {
  completionsInClass,
  confirmQuest,
  confirmationOutcome,
  ensurePlayerCode,
  findPlayerByCode,
  findQuestByCode,
  hasVolunteerLevelEvent,
  liveCompletions,
  recentConfirmations,
  recordLevelUp,
  recordPickerJoin,
  searchPlayers,
  voidCompletion,
  voidConfirmation,
  voidLevelEvent,
} from "./megagame-store";

const dialect = new PgDialect({ casing: "snake_case" });
const render = (q: unknown) => dialect.sqlToQuery(q as SQL).sql;

const chainOf = (mock: ReturnType<typeof vi.fn>, i: number) =>
  mock.mock.results[i].value as Chain;
const arg = (c: Chain, method: string, n = 0) =>
  c.calls.filter((call) => call[0] === method)[n]?.[1];

const queue = (...results: unknown[]) => db.queue.push(...results);

beforeEach(() => {
  vi.clearAllMocks();
  db.queue.length = 0;
});

describe("findQuestByCode", () => {
  it("does not query for an incomplete code", async () => {
    expect(await findQuestByCode("A2C")).toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });

  it("normalizes a typed or pasted code before the lookup", async () => {
    const quest = { id: "q1", code: "A2C4EF" };
    queue([quest]);
    expect(await findQuestByCode("https://x.test/q/a2c-4ef")).toEqual(quest);
    const where = arg(chainOf(db.select, 0), "where");
    expect(dialect.sqlToQuery(where as SQL).params).toEqual(["A2C4EF"]);
  });
});

describe("player lookup", () => {
  it("finds a player by badge code with levels and profile fields", async () => {
    queue([
      {
        id: "u1",
        name: "Ada",
        pronouns: "she/her",
        imageUrl: null,
        wizard: 2,
        pirate: 0,
        alien: 0,
        code: "B3D5F7",
      },
    ]);
    expect(await findPlayerByCode("b3d 5f7")).toEqual({
      id: "u1",
      name: "Ada",
      pronouns: "she/her",
      imageUrl: null,
      levels: { wizard: 2, pirate: 0, alien: 0 },
      code: "B3D5F7",
    });
  });

  it("returns null for an unknown code", async () => {
    queue([]);
    expect(await findPlayerByCode("B3D5F7")).toBeNull();
  });

  it("searches names with LIKE wildcards escaped and a row limit", async () => {
    queue([]);
    await searchPlayers("  50%_a ");
    const c = chainOf(db.select, 0);
    expect(dialect.sqlToQuery(arg(c, "where") as SQL).params).toEqual([
      "%50\\%\\_a%",
    ]);
    expect(arg(c, "limit")).toBe(10);
  });

  it("does not search on fewer than two characters", async () => {
    expect(await searchPlayers(" a ")).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("ensurePlayerCode", () => {
  it("returns an existing code without writing", async () => {
    queue([{ code: "B3D5F7" }]);
    expect(await ensurePlayerCode("u1")).toBe("B3D5F7");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("creates a code when there is none", async () => {
    queue([], [{ code: "NEWCOD" }]);
    expect(await ensurePlayerCode("u1")).toBe("NEWCOD");
    expect(db.insert).toHaveBeenCalledWith(schema.playerCodes);
    const values = arg(chainOf(db.insert, 0), "values") as {
      userId: string;
      code: string;
    };
    expect(values.userId).toBe("u1");
    expect(values.code).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/);
  });

  it("reads back the code a concurrent request wrote", async () => {
    queue([], [], [{ code: "OTHER1" }]);
    expect(await ensurePlayerCode("u1")).toBe("OTHER1");
  });
});

describe("confirmQuest", () => {
  const input = {
    id: "c1",
    questId: "q1",
    requestedUserIds: ["u2", "u1", "u1"],
    confirmedBy: "v1",
  };
  const row = {
    id: "c1",
    questId: "q1",
    requestedUserIds: ["u1", "u2"],
    confirmedBy: "v1",
    voidedAt: null,
  };

  it("refuses an empty player list without writing", async () => {
    expect(await confirmQuest({ ...input, requestedUserIds: [] })).toEqual({
      status: "no-players",
    });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("claims the id, inserts completions in one guarded statement, and reports each player", async () => {
    queue(
      [],
      [row],
      [{ user_id: "u1" }],
      [{ userId: "u1" }],
      [{ userId: "u2" }],
    );
    const result = await confirmQuest(input);
    expect(result).toEqual({
      status: "ok",
      confirmation: row,
      recorded: ["u1"],
      alreadyCompleted: ["u2"],
      notRecorded: [],
    });

    expect(db.insert).toHaveBeenCalledWith(schema.confirmations);
    const claim = chainOf(db.insert, 0);
    expect(arg(claim, "values")).toEqual({
      id: "c1",
      questId: "q1",
      requestedUserIds: ["u1", "u2"],
      confirmedBy: "v1",
    });
    expect(arg(claim, "onConflictDoNothing")).toEqual({
      target: schema.confirmations.id,
    });

    expect(db.execute).toHaveBeenCalledTimes(1);
    const sqlText = render(
      (db.execute.mock.calls[0] as unknown as [SQL])[0],
    ).replace(/\s+/g, " ");
    expect(sqlText).toContain("insert into quest_completions");
    expect(sqlText).toContain("unnest(c.requested_user_ids)");
    expect(sqlText).toContain('join "user" u on u.id = r.id');
    expect(sqlText).toContain("c.voided_at is null");
    // Locks the confirmation so a concurrent undo either waits for this insert
    // or is seen by it.
    expect(sqlText).toContain("for share of c");
    // A player voided out of this confirmation stays voided on a retry.
    expect(sqlText).toContain(
      "not exists (select 1 from quest_completions q where q.confirmation_id = c.id and q.user_id = u.id)",
    );
    expect(sqlText).toContain(
      "on conflict (quest_id, user_id) where voided_at is null and user_id is not null do nothing",
    );
  });

  it("is idempotent on a retry: the stored row drives the insert", async () => {
    queue([], [row], [], [{ userId: "u1" }, { userId: "u2" }]);
    const result = await confirmQuest(input);
    expect(result).toMatchObject({
      status: "ok",
      recorded: ["u1", "u2"],
      alreadyCompleted: [],
    });
  });

  it("reports players whose account is gone as not recorded", async () => {
    queue([], [row], [], [{ userId: "u1" }], []);
    expect(await confirmQuest(input)).toMatchObject({
      recorded: ["u1"],
      alreadyCompleted: [],
      notRecorded: ["u2"],
    });
  });

  it("returns voided and inserts nothing when the confirmation was undone", async () => {
    queue([], [{ ...row, voidedAt: new Date() }]);
    expect(await confirmQuest(input)).toEqual({ status: "voided" });
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("refuses a reused id whose quest differs", async () => {
    queue([], [{ ...row, questId: "q9" }]);
    expect(await confirmQuest(input)).toEqual({ status: "quest-mismatch" });
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("refuses a reused id whose players differ", async () => {
    queue([], [{ ...row, requestedUserIds: ["u1"] }]);
    expect(await confirmQuest(input)).toEqual({ status: "players-mismatch" });
    expect(db.execute).not.toHaveBeenCalled();
  });
});

describe("confirmationOutcome", () => {
  it("returns null for an unknown id", async () => {
    queue([]);
    expect(await confirmationOutcome("nope")).toBeNull();
  });

  it("reports a voided confirmation as voided", async () => {
    const row = {
      id: "c1",
      questId: "q1",
      requestedUserIds: ["u1"],
      voidedAt: new Date(),
    };
    queue([row]);
    expect(await confirmationOutcome("c1")).toEqual({
      status: "voided",
      confirmation: row,
    });
  });
});

describe("voidConfirmation", () => {
  it("voids the confirmation and its completions in one batch, live rows only", async () => {
    queue([{ id: "c1" }], []);
    expect(
      await voidConfirmation({ id: "c1", voidedBy: "v1", reason: "wrong" }),
    ).toBe(true);
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenNthCalledWith(1, schema.confirmations);
    expect(db.update).toHaveBeenNthCalledWith(2, schema.questCompletions);
    for (const i of [0, 1]) {
      const c = chainOf(db.update, i);
      expect(arg(c, "set")).toMatchObject({
        voidedBy: "v1",
        voidReason: "wrong",
      });
      expect(render(arg(c, "where"))).toContain('"voided_at" is null');
    }
  });

  it("reports false when it was already voided", async () => {
    queue([], []);
    expect(
      await voidConfirmation({ id: "c1", voidedBy: "v1", reason: null }),
    ).toBe(false);
  });
});

describe("recordLevelUp", () => {
  const input = {
    id: "e1",
    userId: "u1",
    class: "wizard" as const,
    level: 2,
    awardedBy: "v1",
    checksPassed: false,
    overrideReason: "Card game won",
  };

  it("writes a volunteer event with an untargeted on-conflict, then raises the column", async () => {
    queue([{ id: "e1" }], []);
    expect(await recordLevelUp(input)).toEqual({ status: "awarded" });
    expect(db.insert).toHaveBeenCalledWith(schema.levelEvents);
    const insert = chainOf(db.insert, 0);
    expect(arg(insert, "values")).toMatchObject({
      id: "e1",
      userId: "u1",
      class: "wizard",
      level: 2,
      source: "volunteer",
      awardedBy: "v1",
      checksPassed: false,
      overrideReason: "Card game won",
    });
    expect(arg(insert, "onConflictDoNothing")).toBeUndefined();
    expect(db.update).toHaveBeenCalledWith(schema.user);
    const set = arg(chainOf(db.update, 0), "set") as Record<string, unknown>;
    expect(Object.keys(set)).toEqual(["wizardLevel"]);
    expect(render(set.wizardLevel)).toBe('greatest("user"."wizard_level", $1)');
  });

  it("treats a retry of the same event as success and repairs the column", async () => {
    queue(
      [],
      [{ id: "e1", userId: "u1", class: "wizard", level: 2, voidedAt: null }],
      [],
    );
    expect(await recordLevelUp(input)).toEqual({ status: "retry" });
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("refuses a reused id with different values", async () => {
    queue(
      [],
      [{ id: "e1", userId: "u1", class: "pirate", level: 2, voidedAt: null }],
    );
    expect(await recordLevelUp(input)).toEqual({ status: "id-reused" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("reports a retry of an undone event as voided without touching the column", async () => {
    queue(
      [],
      [
        {
          id: "e1",
          userId: "u1",
          class: "wizard",
          level: 2,
          voidedAt: new Date(),
        },
      ],
    );
    expect(await recordLevelUp(input)).toEqual({ status: "voided" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("reports a level that another event already awarded", async () => {
    queue([], []);
    expect(await recordLevelUp(input)).toEqual({ status: "already-awarded" });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("refuses a level outside 1 to the maximum without writing", async () => {
    expect(await recordLevelUp({ ...input, level: 6 })).toEqual({
      status: "invalid",
    });
    expect(await recordLevelUp({ ...input, level: 0 })).toEqual({
      status: "invalid",
    });
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("voidLevelEvent", () => {
  it("voids a volunteer event and recomputes that class in SQL, then repairs upward", async () => {
    queue([{ userId: "u1", class: "wizard" }], [], [{ level: 2 }]);
    expect(
      await voidLevelEvent({ id: "e3", voidedBy: "v1", reason: "typo" }),
    ).toEqual({ status: "voided", level: 2 });
    const where = render(arg(chainOf(db.update, 0), "where"));
    expect(where).toContain('"level_events"."voided_at" is null');
    expect(where).toContain('"level_events"."source" = $');

    expect(db.update).toHaveBeenCalledTimes(3);
    const recompute = arg(chainOf(db.update, 1), "set") as Record<string, SQL>;
    expect(Object.keys(recompute)).toEqual(["wizardLevel"]);
    const recomputeSql = render(recompute.wizardLevel);
    expect(recomputeSql).toContain('max("level_events"."level")');
    expect(recomputeSql).toContain('"level_events"."voided_at" is null');
    expect(recomputeSql).not.toContain("greatest");

    // A second statement with a fresh snapshot can only raise the column, so
    // an award that committed while the recompute ran is not lost.
    const repair = arg(chainOf(db.update, 2), "set") as Record<string, SQL>;
    expect(Object.keys(repair)).toEqual(["wizardLevel"]);
    const repairSql = render(repair.wizardLevel);
    expect(repairSql).toContain('greatest("user"."wizard_level"');
    expect(repairSql).toContain('max("level_events"."level")');
  });

  it("reports 0 when no live event remains", async () => {
    queue([{ userId: "u1", class: "alien" }], [], [{ level: 0 }]);
    expect(
      await voidLevelEvent({ id: "e3", voidedBy: "v1", reason: null }),
    ).toEqual({ status: "voided", level: 0 });
    expect(Object.keys(arg(chainOf(db.update, 1), "set") as object)).toEqual([
      "alienLevel",
    ]);
  });

  it("recomputes again on a repeated undo, which repairs a crash between the two writes", async () => {
    queue(
      [],
      [
        {
          userId: "u1",
          class: "wizard",
          source: "volunteer",
          voidedAt: new Date(),
        },
      ],
      [],
      [{ level: 1 }],
    );
    expect(
      await voidLevelEvent({ id: "e3", voidedBy: "v1", reason: null }),
    ).toEqual({ status: "already-voided", level: 1 });
    expect(db.update).toHaveBeenCalledTimes(3);
  });

  it("refuses to void a picker event", async () => {
    queue(
      [],
      [{ userId: "u1", class: "wizard", source: "picker", voidedAt: null }],
    );
    expect(
      await voidLevelEvent({ id: "e3", voidedBy: "v1", reason: null }),
    ).toEqual({ status: "not-volunteer" });
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("reports an unknown event", async () => {
    queue([], []);
    expect(
      await voidLevelEvent({ id: "e3", voidedBy: "v1", reason: null }),
    ).toEqual({ status: "not-found" });
  });
});

describe("recordPickerJoin", () => {
  it("voids earlier picker joins in other classes and writes the new join in one batch", async () => {
    queue([], []);
    await recordPickerJoin("u1", "pirate");
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledWith(schema.levelEvents);
    const update = chainOf(db.update, 0);
    expect(arg(update, "set")).toMatchObject({
      voidedBy: "u1",
      voidReason: "Switched class on /account",
    });
    const where = dialect.sqlToQuery(arg(update, "where") as SQL);
    expect(where.sql).toContain('"level_events"."source" = $');
    expect(where.sql).toContain('"level_events"."class" <> $');
    expect(where.sql).toContain('"level_events"."voided_at" is null');
    expect(where.params).toEqual(["u1", "picker", "pirate"]);

    const insert = chainOf(db.insert, 0);
    expect(arg(insert, "values")).toMatchObject({
      userId: "u1",
      class: "pirate",
      level: 1,
      source: "picker",
      awardedBy: "u1",
      checksPassed: true,
    });
    expect((arg(insert, "values") as { id: string }).id.length).toBeGreaterThan(
      0,
    );
    expect(insert.calls.map((c) => c[0])).toContain("onConflictDoNothing");
  });
});

describe("hasVolunteerLevelEvent", () => {
  it("looks only at live volunteer events", async () => {
    queue([{ id: "e1" }]);
    expect(await hasVolunteerLevelEvent("u1")).toBe(true);
    const where = dialect.sqlToQuery(
      arg(chainOf(db.select, 0), "where") as SQL,
    );
    expect(where.sql).toContain('"level_events"."voided_at" is null');
    expect(where.params).toEqual(["u1", "volunteer"]);
  });

  it("is false with none", async () => {
    queue([]);
    expect(await hasVolunteerLevelEvent("u1")).toBe(false);
  });
});

describe("completion reads", () => {
  it("voids one completion only while it is live", async () => {
    queue([{ id: "k1" }]);
    expect(
      await voidCompletion({ id: "k1", voidedBy: "m1", reason: "dup" }),
    ).toBe(true);
    expect(db.update).toHaveBeenCalledWith(schema.questCompletions);
    expect(render(arg(chainOf(db.update, 0), "where"))).toContain(
      '"quest_completions"."voided_at" is null',
    );
  });

  it("skips the query for an empty player list", async () => {
    expect(await liveCompletions("q1", [])).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns live completions for the listed players", async () => {
    const at = new Date();
    queue([
      {
        id: "k1",
        userId: "u1",
        confirmationId: "c1",
        confirmedAt: at,
        confirmedByName: "Vol",
      },
    ]);
    expect(await liveCompletions("q1", ["u1", "u2"])).toHaveLength(1);
    const where = dialect.sqlToQuery(
      arg(chainOf(db.select, 0), "where") as SQL,
    );
    expect(where.params).toEqual(["q1", "u1", "u2"]);
    expect(where.sql).toContain('"quest_completions"."voided_at" is null');
  });

  it("counts live completions of quests in one class", async () => {
    queue([{ n: 3 }]);
    expect(await completionsInClass("u1", "wizard")).toBe(3);
    const where = dialect.sqlToQuery(
      arg(chainOf(db.select, 0), "where") as SQL,
    );
    expect(where.params).toEqual(["u1", "wizard"]);
  });
});

describe("recentConfirmations", () => {
  it("counts the completions a confirmation recorded, not the players requested", async () => {
    queue([]);
    await recentConfirmations("v1");
    const fields = (
      db.select.mock.calls[0] as unknown as [{ players: SQL }]
    )[0];
    const players = render(fields.players);
    expect(players).not.toContain("cardinality");
    expect(players).toContain("from quest_completions q");
    expect(players).toContain('q.confirmation_id = "confirmations"."id"');
  });
});
