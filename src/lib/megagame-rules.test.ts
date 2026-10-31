import { describe, expect, it } from "vitest";
import { MAX_LEVEL, NO_LEVELS } from "./megagame-levels";
import {
  BUCKET_MINUTES,
  BUCKET_ORIGIN,
  BUCKET_SIZES,
  bucketIntervalSql,
  bucketSeries,
  bucketStart,
  checkLevelUp,
  checkQuestWindow,
  questWindowIsValid,
  deriveLevels,
  LEVEL_REQUIREMENTS,
  requirementFor,
  type LevelRequirement,
  isCompleteMegagameCode,
  matchAnswer,
  normalizeAnswer,
  isBucketSize,
  normalizeMegagameCode,
  type BucketSize,
} from "./megagame-rules";

describe("normalizeMegagameCode", () => {
  it("drops separators and uppercases", () => {
    expect(normalizeMegagameCode("a2c-4ef")).toBe("A2C4EF");
    expect(normalizeMegagameCode("a2c 4ef")).toBe("A2C4EF");
    expect(normalizeMegagameCode("A2C4EF")).toBe("A2C4EF");
  });

  it("folds the Crockford lookalikes the same way ticket codes do", () => {
    expect(normalizeMegagameCode("ilou12")).toBe("110V12");
  });

  it("takes the code out of a pasted QR URL", () => {
    expect(normalizeMegagameCode("https://metagame.games/q/A2C-4EF")).toBe(
      "A2C4EF",
    );
    expect(
      normalizeMegagameCode("https://metagame.games/q/A2C-4EF?utm_source=x"),
    ).toBe("A2C4EF");
    expect(normalizeMegagameCode("https://metagame.games/q/A2C-4EF/")).toBe(
      "A2C4EF",
    );
    expect(normalizeMegagameCode("https://metagame.games/q/A2C-4EF#top")).toBe(
      "A2C4EF",
    );
  });

  it("works the same for a player badge URL", () => {
    expect(normalizeMegagameCode("https://metagame.games/p/A2C-4EF")).toBe(
      "A2C4EF",
    );
  });

  it("does not truncate over-long input", () => {
    expect(normalizeMegagameCode("A2C4EFGH")).toBe("A2C4EFGH");
    expect(isCompleteMegagameCode("A2C4EFGH")).toBe(false);
  });

  it("handles empty input", () => {
    expect(normalizeMegagameCode("")).toBe("");
    expect(isCompleteMegagameCode("")).toBe(false);
  });
});

describe("isCompleteMegagameCode", () => {
  it("wants the full length", () => {
    expect(isCompleteMegagameCode("A2C4E")).toBe(false);
    expect(isCompleteMegagameCode("A2C4EF")).toBe(true);
  });
});

describe("normalizeAnswer", () => {
  it("keeps only letters and numbers, lowercased and unaccented", () => {
    expect(normalizeAnswer("  The Red Door ")).toBe("thereddoor");
    expect(normalizeAnswer("crème brûlée")).toBe("cremebrulee");
    expect(normalizeAnswer("it's a trap!")).toBe("itsatrap");
    expect(normalizeAnswer("")).toBe("");
  });
});

describe("matchAnswer", () => {
  it("ignores case and surrounding whitespace", () => {
    expect(matchAnswer("  The Red Door ", ["the red door"])).toEqual({
      matched: true,
      answer: "the red door",
    });
  });

  it("ignores accents in either direction", () => {
    expect(matchAnswer("creme brulee", ["crème brûlée"]).matched).toBe(true);
    expect(matchAnswer("crème brûlée", ["creme brulee"]).matched).toBe(true);
  });

  it("ignores punctuation", () => {
    expect(matchAnswer("it's a trap!", ["Its a trap"]).matched).toBe(true);
  });

  it("ignores internal whitespace", () => {
    expect(matchAnswer("red    door", ["red door"]).matched).toBe(true);
  });

  it("treats hyphenation and spacing as interchangeable", () => {
    expect(matchAnswer("co-op", ["co op"]).matched).toBe(true);
    expect(matchAnswer("co-op", ["coop"]).matched).toBe(true);
  });

  it("returns the accepted answer as stored", () => {
    expect(matchAnswer("second One", ["First", "Second one"])).toEqual({
      matched: true,
      answer: "Second one",
    });
  });

  it("reports no match", () => {
    expect(matchAnswer("blue door", ["the red door"])).toEqual({
      matched: false,
      answer: null,
    });
  });

  it("never matches an empty entry", () => {
    expect(matchAnswer("", ["", "red"])).toEqual({
      matched: false,
      answer: null,
    });
    expect(matchAnswer("!!!", ["", "red"]).matched).toBe(false);
  });

  it("never matches against an empty accepted list", () => {
    expect(matchAnswer("anything", [])).toEqual({
      matched: false,
      answer: null,
    });
  });
});

describe("deriveLevels", () => {
  it("starts everyone at zero in every class", () => {
    expect(deriveLevels([])).toEqual(NO_LEVELS);
  });

  it("takes the maximum, not the last event", () => {
    expect(
      deriveLevels([
        { class: "wizard", level: 3 },
        { class: "wizard", level: 1 },
      ]),
    ).toEqual({ ...NO_LEVELS, wizard: 3 });
  });

  it("ignores a voided event, dropping the class back to zero", () => {
    expect(
      deriveLevels([{ class: "wizard", level: 2, voidedAt: new Date() }]),
    ).toEqual(NO_LEVELS);
    expect(
      deriveLevels([
        { class: "wizard", level: 1 },
        { class: "wizard", level: 2, voidedAt: new Date() },
      ]),
    ).toEqual({ ...NO_LEVELS, wizard: 1 });
  });

  it("treats a voidedAt string the same as a Date", () => {
    expect(
      deriveLevels([
        { class: "wizard", level: 2, voidedAt: "2026-11-07T10:00:00.000Z" },
      ]),
    ).toEqual(NO_LEVELS);
  });

  it("ignores an unknown class without throwing", () => {
    expect(deriveLevels([{ class: "sorcerer", level: 4 }])).toEqual(NO_LEVELS);
  });

  it("ignores a level that is not a positive integer", () => {
    expect(
      deriveLevels([
        { class: "wizard", level: 0 },
        { class: "wizard", level: -2 },
        { class: "wizard", level: 1.5 },
      ]),
    ).toEqual(NO_LEVELS);
  });

  it("fills two classes and leaves the third at zero", () => {
    expect(
      deriveLevels([
        { class: "wizard", level: 2 },
        { class: "pirate", level: 4 },
      ]),
    ).toEqual({ wizard: 2, pirate: 4, alien: 0 });
  });
});

describe("checkLevelUp transitions", () => {
  const at = (wizard: number) => ({ ...NO_LEVELS, wizard });

  it("accepts the next level with nothing to say", () => {
    expect(
      checkLevelUp(
        { class: "wizard", level: 1, levels: at(0), completionsInClass: 0 },
        [],
      ),
    ).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it("refuses a level that is not a whole number of 1 or more", () => {
    for (const level of [0, 1.5, -1]) {
      const got = checkLevelUp(
        { class: "wizard", level, levels: at(0), completionsInClass: 0 },
        [],
      );
      expect(got.ok).toBe(false);
      expect(got.errors).toContain(
        "A level must be a whole number of 1 or more.",
      );
    }
  });

  it("refuses a level that is not above the current one", () => {
    for (const level of [3, 2]) {
      const got = checkLevelUp(
        { class: "wizard", level, levels: at(3), completionsInClass: 9 },
        [],
      );
      expect(got.ok).toBe(false);
      expect(got.errors).toEqual([
        "Already a level 3 wizard; a new level must be higher.",
      ]);
    }
  });

  it("warns rather than refuses above the chart", () => {
    const got = checkLevelUp(
      {
        class: "wizard",
        level: MAX_LEVEL + 1,
        levels: at(MAX_LEVEL),
        completionsInClass: 0,
      },
      [],
    );
    expect(got.ok).toBe(true);
    expect(got.warnings).toHaveLength(1);
    expect(got.warnings[0]).toContain(String(MAX_LEVEL));
  });

  it("warns about one skipped level", () => {
    const got = checkLevelUp(
      { class: "wizard", level: 3, levels: at(1), completionsInClass: 0 },
      [],
    );
    expect(got.ok).toBe(true);
    expect(got.warnings).toEqual(["Skips level 2."]);
  });

  it("warns about several skipped levels", () => {
    const got = checkLevelUp(
      { class: "wizard", level: 4, levels: at(0), completionsInClass: 0 },
      [],
    );
    expect(got.warnings).toEqual(["Skips levels 1, 2 and 3."]);
  });

  it("puts the above-the-chart warning before the skip warning", () => {
    const got = checkLevelUp(
      {
        class: "wizard",
        level: MAX_LEVEL + 2,
        levels: at(MAX_LEVEL),
        completionsInClass: 0,
      },
      [],
    );
    expect(got.warnings).toHaveLength(2);
    expect(got.warnings[0]).toContain(String(MAX_LEVEL));
    expect(got.warnings[1]).toBe(`Skips level ${MAX_LEVEL + 1}.`);
  });
});

describe("requirementFor", () => {
  const table: LevelRequirement[] = [
    { class: "wizard", level: 2, minCompletions: 3 },
  ];

  it("finds the row for a class and level", () => {
    expect(requirementFor("wizard", 2, table)).toEqual(table[0]);
  });

  it("returns null when no row matches", () => {
    expect(requirementFor("wizard", 3, table)).toBeNull();
    expect(requirementFor("pirate", 2, table)).toBeNull();
  });

  it("ships empty, so the checks are off until staff fill it in", () => {
    expect(LEVEL_REQUIREMENTS).toEqual([]);
  });
});

describe("checkLevelUp requirements", () => {
  const table: LevelRequirement[] = [
    { class: "wizard", level: 2, minCompletions: 3 },
  ];
  const at = (wizard: number, pirate = 0) => ({
    ...NO_LEVELS,
    wizard,
    pirate,
  });

  it("warns about a shortfall and still allows the record", () => {
    const got = checkLevelUp(
      { class: "wizard", level: 2, levels: at(1), completionsInClass: 1 },
      table,
    );
    expect(got.ok).toBe(true);
    expect(got.warnings).toEqual(["Has 1 wizard quest; level 2 asks for 3."]);
  });

  it("pluralises the count it has", () => {
    const got = checkLevelUp(
      { class: "wizard", level: 2, levels: at(1), completionsInClass: 0 },
      table,
    );
    expect(got.warnings).toEqual(["Has 0 wizard quests; level 2 asks for 3."]);
    const two = checkLevelUp(
      { class: "wizard", level: 2, levels: at(1), completionsInClass: 2 },
      table,
    );
    expect(two.warnings).toEqual(["Has 2 wizard quests; level 2 asks for 3."]);
  });

  it("does not warn once the requirement is met", () => {
    const got = checkLevelUp(
      { class: "wizard", level: 2, levels: at(1), completionsInClass: 3 },
      table,
    );
    expect(got.warnings).toEqual([]);
  });

  it("does not apply another class's requirement", () => {
    const got = checkLevelUp(
      { class: "pirate", level: 2, levels: at(0, 1), completionsInClass: 0 },
      table,
    );
    expect(got.warnings).toEqual([]);
  });

  it("lists a skip before a shortfall", () => {
    const got = checkLevelUp(
      { class: "wizard", level: 2, levels: at(0), completionsInClass: 1 },
      table,
    );
    expect(got.warnings).toEqual([
      "Skips level 1.",
      "Has 1 wizard quest; level 2 asks for 3.",
    ]);
  });

  it("says nothing about requirements when the level itself is refused", () => {
    const got = checkLevelUp(
      { class: "wizard", level: 2, levels: at(2), completionsInClass: 0 },
      table,
    );
    expect(got.ok).toBe(false);
    expect(got.warnings).toEqual([]);
  });
});

describe("checkQuestWindow", () => {
  const levels = (wizard: number, pirate = 0) => ({
    ...NO_LEVELS,
    wizard,
    pirate,
  });

  it("says nothing about a classless quest", () => {
    expect(checkQuestWindow({ class: null }, levels(0))).toEqual({
      ok: true,
      warnings: [],
    });
    expect(
      checkQuestWindow({ class: null, minLevel: 2, maxLevel: 3 }, levels(0)),
    ).toEqual({ ok: true, warnings: [] });
  });

  it("accepts a player inside the window", () => {
    expect(
      checkQuestWindow(
        { class: "wizard", minLevel: 1, maxLevel: 3 },
        levels(2),
      ),
    ).toEqual({ ok: true, warnings: [] });
  });

  it("warns below the minimum level", () => {
    expect(
      checkQuestWindow({ class: "wizard", minLevel: 2 }, levels(1)),
    ).toEqual({
      ok: false,
      warnings: ["Level 1 wizard; this quest asks for level 2 or higher."],
    });
  });

  it("warns above the maximum level", () => {
    expect(
      checkQuestWindow({ class: "wizard", maxLevel: 3 }, levels(4)),
    ).toEqual({
      ok: false,
      warnings: ["Level 4 wizard; this quest is for level 3 and below."],
    });
  });

  it("warns when the player is not in the quest's class", () => {
    expect(checkQuestWindow({ class: "wizard" }, levels(0))).toEqual({
      ok: false,
      warnings: ["Not a wizard yet."],
    });
    expect(
      checkQuestWindow({ class: "wizard", minLevel: 2 }, levels(0)).warnings,
    ).toEqual(["Not a wizard yet."]);
  });

  it("accepts a classed quest with no window", () => {
    expect(checkQuestWindow({ class: "wizard" }, levels(2))).toEqual({
      ok: true,
      warnings: [],
    });
  });

  it("looks only at the quest's own class", () => {
    expect(
      checkQuestWindow({ class: "wizard" }, levels(0, 3)).warnings,
    ).toEqual(["Not a wizard yet."]);
  });

  it("warns about an unknown class without throwing", () => {
    expect(checkQuestWindow({ class: "sorcerer" }, levels(2))).toEqual({
      ok: false,
      warnings: ['Quest class "sorcerer" is not a known class.'],
    });
  });
});

describe("questWindowIsValid", () => {
  it("lets a classless quest through only without a window", () => {
    expect(questWindowIsValid({ class: null })).toBe(true);
    expect(
      questWindowIsValid({ class: null, minLevel: null, maxLevel: null }),
    ).toBe(true);
    expect(questWindowIsValid({ class: null, minLevel: 2 })).toBe(false);
    expect(questWindowIsValid({ class: null, maxLevel: 2 })).toBe(false);
  });

  it("lets a classed quest carry either bound", () => {
    expect(questWindowIsValid({ class: "wizard", minLevel: 2 })).toBe(true);
    expect(questWindowIsValid({ class: "wizard", maxLevel: 2 })).toBe(true);
    expect(questWindowIsValid({ class: "wizard" })).toBe(true);
  });
});

describe("bucket sizes", () => {
  it("whitelists the interval literals and throws on anything else", () => {
    expect(bucketIntervalSql("5m")).toBe("5 minutes");
    expect(bucketIntervalSql("1h")).toBe("1 hour");
    expect(bucketIntervalSql("1d")).toBe("1 day");
    expect(() => bucketIntervalSql("2h")).toThrow();
    expect(() => bucketIntervalSql("1h; drop table quests")).toThrow();
    expect(() => bucketIntervalSql("")).toThrow();
  });

  it("recognises only its own sizes", () => {
    for (const size of BUCKET_SIZES) expect(isBucketSize(size)).toBe(true);
    expect(isBucketSize("2h")).toBe(false);
    expect(isBucketSize("")).toBe(false);
    expect(isBucketSize(null)).toBe(false);
  });

  it("gives minutes for every size", () => {
    expect(BUCKET_MINUTES).toEqual({
      "5m": 5,
      "15m": 15,
      "30m": 30,
      "1h": 60,
      "3h": 180,
      "6h": 360,
      "1d": 1440,
    });
  });
});

describe("bucketStart", () => {
  const iso = (at: Date) => at.toISOString();

  it("floors to the quarter hour", () => {
    expect(iso(bucketStart(new Date("2026-11-07T10:07:00.000Z"), "15m"))).toBe(
      "2026-11-07T10:00:00.000Z",
    );
    expect(iso(bucketStart(new Date("2026-11-07T10:15:00.000Z"), "15m"))).toBe(
      "2026-11-07T10:15:00.000Z",
    );
    expect(iso(bucketStart(new Date("2026-11-07T10:14:59.999Z"), "15m"))).toBe(
      "2026-11-07T10:00:00.000Z",
    );
  });

  it("floors at every size", () => {
    const at = new Date("2026-11-07T10:07:00.000Z");
    const expected: Record<string, string> = {
      "5m": "2026-11-07T10:05:00.000Z",
      "30m": "2026-11-07T10:00:00.000Z",
      "3h": "2026-11-07T09:00:00.000Z",
      "6h": "2026-11-07T06:00:00.000Z",
      "1d": "2026-11-07T00:00:00.000Z",
    };
    for (const [size, want] of Object.entries(expected)) {
      expect(iso(bucketStart(at, size as BucketSize)), size).toBe(want);
    }
  });

  it("is idempotent", () => {
    const at = new Date("2026-11-07T10:07:33.123Z");
    for (const size of BUCKET_SIZES) {
      expect(iso(bucketStart(bucketStart(at, size), size))).toBe(
        iso(bucketStart(at, size)),
      );
    }
  });

  it("floors downwards before the origin too", () => {
    expect(BUCKET_ORIGIN.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(iso(bucketStart(new Date("2025-12-31T23:58:00.000Z"), "15m"))).toBe(
      "2025-12-31T23:45:00.000Z",
    );
  });
});

describe("bucketSeries", () => {
  const isos = (at: Date[]) => at.map((d) => d.toISOString());

  it("includes the buckets holding both endpoints", () => {
    expect(
      isos(
        bucketSeries(
          new Date("2026-11-07T10:07:00.000Z"),
          new Date("2026-11-07T12:07:00.000Z"),
          "30m",
        ),
      ),
    ).toEqual([
      "2026-11-07T10:00:00.000Z",
      "2026-11-07T10:30:00.000Z",
      "2026-11-07T11:00:00.000Z",
      "2026-11-07T11:30:00.000Z",
      "2026-11-07T12:00:00.000Z",
    ]);
    expect(
      isos(
        bucketSeries(
          new Date("2026-11-07T10:07:00.000Z"),
          new Date("2026-11-07T12:07:00.000Z"),
          "1h",
        ),
      ),
    ).toEqual([
      "2026-11-07T10:00:00.000Z",
      "2026-11-07T11:00:00.000Z",
      "2026-11-07T12:00:00.000Z",
    ]);
  });

  it("handles endpoints already on a boundary", () => {
    expect(
      isos(
        bucketSeries(
          new Date("2026-11-07T10:00:00.000Z"),
          new Date("2026-11-07T11:00:00.000Z"),
          "30m",
        ),
      ),
    ).toEqual([
      "2026-11-07T10:00:00.000Z",
      "2026-11-07T10:30:00.000Z",
      "2026-11-07T11:00:00.000Z",
    ]);
  });

  it("gives one entry for an instant and none for a reversed range", () => {
    const at = new Date("2026-11-07T10:07:00.000Z");
    expect(isos(bucketSeries(at, at, "5m"))).toEqual([
      "2026-11-07T10:05:00.000Z",
    ]);
    expect(
      bucketSeries(at, new Date("2026-11-07T09:00:00.000Z"), "5m"),
    ).toEqual([]);
  });
});
