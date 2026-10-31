# Implementation plan: Megagame volunteer tool

Date: 2026-10-30. Source spec: `docs/superpowers/specs/2026-10-28-megagame-volunteer-tool-design.md`.
Reader: the Claude agent implementing this. Read the spec in full before starting; this plan does not
repeat its reasoning.

Branch and worktree: `megagame-volunteer` at
`/home/jkop/Code/metagame-2026/.worktrees/megagame-volunteer`. Work only there.

## 0. Before you write anything

- `node_modules` does not exist in this worktree. Run `pnpm install` first, or every test and
  typecheck command will fail for the wrong reason.
- `CLAUDE.md` requires reading `node_modules/next/dist/docs/` before writing code, so do not defer
  it. List that directory first and read every guide that covers a file you are about to touch.
  Phase 1 adds two plain TypeScript modules under `src/lib/` and touches no route, component or
  server action, so the expected outcome is that no guide applies; confirm that from the listing
  rather than assuming it. Phase 3 adds routes, layouts and server actions, so read the routing,
  layout and server-action guides in full before writing any of it.
- Tests are vitest, and `vitest.config.ts` only collects `src/**/*.test.ts`. A test file must sit
  next to the module it covers and end in `.test.ts`. There is no jsdom environment configured, so
  phase 1 and phase 2 tests are plain unit tests.
- Where a test needs the database, mock it with `vi.mock("@/db", () => ({ getDb: () => db }))` over a
  `vi.hoisted` fake. `src/lib/rfp-intake-store.test.ts` is the pattern to copy: a chainable object
  whose `from`, `where`, `limit`, `set` and `values` return itself, with `then` resolving a queued
  result. Do not open a real connection in a test.
- Follow the repo rules in `CLAUDE.md`: comments are minimal and explain a non-obvious why, tests
  come before the code they cover, and each logical milestone is its own commit ending with
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## 1. Constraint for this cycle

The database schema is frozen. Phase 1 below is the only phase to implement now. Do not add a file
under `src/db/schema/`, do not run `pnpm db:generate`, and do not add anything to `drizzle/`.
Phases 2 to 5 are written down so the order is settled, and each one is marked blocked on the freeze
lifting.

## 2. What already exists, and the conflict it creates

`src/lib/megagame-levels.ts` is already in the repo and already holds the class list, the level
maximum and the label helpers:

- `MEGAGAME_CLASSES = ["wizard", "pirate", "alien"]`, `MegagameClass`, `isMegagameClass`
- `MAX_LEVEL = 5`, `MegagameLevels` (a `Record<MegagameClass, number>`), `NO_LEVELS`
- `CLASS_LABELS`, `FACTION_NAMES`, `activeClasses`, `classLevelLabel`, `starterLevels`

`src/lib/megagame-rules.ts` must import all of that rather than redeclare it. Note that the existing
class order is wizard, pirate, alien, while the spec's prose lists pirate, wizard, alien. The
existing order wins, because `activeClasses` and its test depend on it.

The `user` table also already carries `wizard_level`, `pirate_level` and `alien_level` (smallint,
default 0, check constraint 0 to 5), written today by the Megagame tab on `/account`. The spec
derives a player's level from `level_events` instead. Those two are not reconciled anywhere, and the
reconciliation is a decision for the user, not for the implementer. It does not block phase 1:
`deriveLevels` below takes events as an argument and returns a `MegagameLevels`, so it works whether
the caller later passes event rows or the user columns. Raise it before phase 2 starts. See section 8.

`src/lib/megagame-store.ts` also already exists. It is 36 lines and exports `loadMegagameLevels` and
`setMegagameLevels`, both reading and writing the three `user` level columns, and it has no
`server-only` import. Its callers today are `src/app/(v2)/account/actions.ts`,
`src/app/(v2)/account/page.tsx` and `src/app/(v2)/u/[id]/page.tsx`. Phase 2 adds to that file rather
than creating it, and both existing exports and all three callers keep working until the user settles
the level-source question in section 8. Phase 1 does not touch it.

## 3. Phase 1 (implement now)

Two commits, each test-first.

### 3.1 Commit one: the two permission keys

File: `src/lib/permissions.ts`. Add a new "Megagame" group with exactly two entries, inserted as a
contiguous block after `submissions.grade` (the end of the Grading group) and before `roles.manage`
(the start of the Sensitive group):

```ts
  "megagame.verify": {
    audience: "team",
    group: "Megagame",
    level: "edit",
    label: "Verify quests",
    description:
      "Record quest completions and level-ups at /backstage/megagame, and read its dashboard.",
  },
  "megagame.manage": {
    audience: "team",
    group: "Megagame",
    level: "edit",
    label: "Manage megagame",
    description:
      "Import and edit quests, change level requirements, and void anyone's records.",
    implies: ["megagame.verify"],
  },
```

Why that position and those fields satisfy `src/lib/permissions.test.ts`:

- The "catalog order" test requires each group's keys to be contiguous (it checks that group names are
  distinct across the output of `permissionGroups()`), so the two entries must be adjacent and no
  other group may be named "Megagame".
- Within a group the `level` values must be non-decreasing in the order view, edit, delete. Both keys
  are `edit`, so either order between them passes. Put `megagame.verify` first, since `megagame.manage`
  implies it.
- The "catalog" test requires every key in `implies` to exist and not be the key itself, which
  `["megagame.verify"]` satisfies.
- No existing assertion enumerates every key: the admin test uses `PERMISSION_KEYS.length` and the
  `expand` tests use schedule and promo keys only. So no existing test needs editing.
- Audience `team` is deliberate. The spec says a volunteer holding only `megagame.verify` should see
  a `/backstage` index with one tile, and `hasTeamPermission` is what opens `/backstage`.

Add to `src/lib/permissions.test.ts` one new `describe("megagame")` block, written before the catalog
edit:

1. `expect(expand(["megagame.manage"]).has("megagame.verify")).toBe(true)`, which is the style the
   rest of the file uses (`expand` returns a `Set`, so do not use `toContain`).
2. `expect(expand(["megagame.verify"]).has("megagame.manage")).toBe(false)`.
3. `hasTeamPermission(expand(["megagame.verify"]))` is `true`.
4. `permissionGroups().find((g) => g.group === "Megagame")?.keys` equals
   `["megagame.verify", "megagame.manage"]`.

Do not add a `TOOLS` entry in `src/app/backstage/(index)/page.tsx` in this phase. The spec says no
placeholder tile ships to production; the tile lands with the page in phase 3. The keys are inert
until a role grants them, which matches the "keys wait for their page" note at the top of the
catalog file.

### 3.2 Commit two: `src/lib/megagame-rules.ts`

A pure module. No `@/db` import, no `server-only` import, no `next/*` import, so client components
can use it. Write `src/lib/megagame-rules.test.ts` first, then the module.

Imports it should use:

```ts
import {
  MAX_LEVEL,
  MEGAGAME_CLASSES,
  NO_LEVELS,
  isMegagameClass,
  type MegagameClass,
  type MegagameLevels,
} from "./megagame-levels";
import { TICKET_CODE_LENGTH, normalizeTicketCode } from "./ticket-code-format";
```

#### Code normalization

```ts
/** A quest or badge code as typed, scanned, or pasted as a /q/<code> URL. */
export function normalizeMegagameCode(input: string): string;

/** Whether a normalized code is a full code, which is what a lookup needs. */
export function isCompleteMegagameCode(code: string): boolean;
```

`normalizeMegagameCode` takes the last path segment when the input contains `/` (dropping any query
string or fragment and a trailing slash first), then applies `normalizeTicketCode`. It does not
truncate. Reusing `normalizeTicketCode` is required by the spec: the Crockford folding of I and L to
1, O to 0 and U to V must be identical to the ticket path. `isCompleteMegagameCode` is
`code.length === TICKET_CODE_LENGTH`, so over-long input fails the completeness check and never
reaches a lookup. Truncating would turn a mis-scan or a bad paste such as `"A2C4EFGH"` into the
valid-looking but different code `"A2C4EF"`, and the spec does not ask for truncation. `PinInput`
already caps what a volunteer can type.

Tests:

- `"a2c-4ef"` gives `"A2C4EF"`.
- `"a2c 4ef"` and `"A2C4EF"` give the same result as the dashed form.
- Crockford folding: `"ilou12"` gives `"110V12"`.
- A pasted QR URL `"https://metagame.games/q/A2C-4EF"` gives `"A2C4EF"`, and the same with
  `"?utm_source=x"` appended, and with a trailing slash.
- A `/p/<code>` URL works the same way.
- Over-long input `"A2C4EFGH"` comes back unchanged as `"A2C4EFGH"`, and
  `isCompleteMegagameCode("A2C4EFGH")` is `false`.
- `""` gives `""`, and `isCompleteMegagameCode("")` is `false`.
- `isCompleteMegagameCode("A2C4E")` is `false`; `isCompleteMegagameCode("A2C4EF")` is `true`.

#### Answer normalization and matching

```ts
/** Case, accents, punctuation and whitespace do not matter. */
export function normalizeAnswer(input: string): string;

export type AnswerMatch = { matched: boolean; answer: string | null };

/** `answer` is the accepted answer as stored, for showing the volunteer what matched. */
export function matchAnswer(
  entered: string,
  accepted: readonly string[],
): AnswerMatch;
```

`normalizeAnswer`: lowercase, `normalize("NFD")` with combining marks removed (`/\p{M}/gu`), then
every character that is not a letter or a number removed (`.replace(/[^\p{L}\p{N}]+/gu, "")`).
Removing punctuation and whitespace rather than collapsing them to a space is what spec section 5.1
asks for, since it lists whitespace and punctuation together as things that matching ignores. The
effect is that "co-op", "co op" and "coop" all match each other, and "the red door" matches
"thereddoor". These are volunteer-facing helper comparisons on short free-text answers, so a loose
match costs less than a spacing or hyphenation difference refusing a correct answer.

`matchAnswer` returns the first accepted entry whose normalized form equals the normalized entry.
An entry that normalizes to the empty string never matches, including against an accepted answer
that is itself empty, so a volunteer tapping Confirm with an empty field does not see a match.

Tests:

- Case and surrounding whitespace: `"  The Red Door "` matches accepted `["the red door"]`.
- Accents: `"creme brulee"` matches `["crème brûlée"]`, and the reverse direction also matches.
- Punctuation: `"it's a trap!"` matches `["Its a trap"]`.
- Internal whitespace is ignored: `"red    door"` matches `["red door"]`.
- Hyphenation and spacing are interchangeable: `"co-op"` matches `["co op"]` and also matches
  `["coop"]`.
- Several accepted answers: entering the second one matches and `answer` is that stored string, not
  the normalized form.
- No match returns `{ matched: false, answer: null }`.
- Empty entry against `["", "red"]` returns no match.
- An accepted list that is empty returns no match (an `evidence` quest, where the field is unused).

#### Level derivation

```ts
export type LevelEventLike = {
  class: string;
  level: number;
  voidedAt?: Date | string | null;
};

/** Max non-voided level per class, 0 meaning not in that class. */
export function deriveLevels(events: readonly LevelEventLike[]): MegagameLevels;
```

Start from `{ ...NO_LEVELS }`. Skip an event whose `voidedAt` is anything other than null or
undefined, whose class fails `isMegagameClass`, or whose level is not an integer greater than 0.
Take the maximum per class. The input type is loose on purpose so the phase 2 store can pass rows
straight in.

Tests:

- No events gives `NO_LEVELS` (all three classes at 0).
- Out-of-order events give the maximum, not the last one.
- A voided event is ignored, including when it is the only event for that class, which drops the
  class back to 0.
- `voidedAt` as an ISO string counts as voided, same as a `Date`.
- An unknown class name is ignored and does not throw.
- Level 0 or a negative level is ignored.
- Events in two classes fill both and leave the third at 0.

#### Requirements table and level-up checks

```ts
export type LevelRequirement = {
  class: MegagameClass;
  level: number;
  /** Non-voided completions of quests in that class. */
  minCompletions: number;
};

/** Tunable soft checks. Empty ships the tool with checks off, which is allowed. */
export const LEVEL_REQUIREMENTS: readonly LevelRequirement[] = [];

export function requirementFor(
  cls: MegagameClass,
  level: number,
  table?: readonly LevelRequirement[],
): LevelRequirement | null;

export type LevelUpInput = {
  class: MegagameClass;
  /** The level being awarded. */
  level: number;
  /** The player's current levels, from `deriveLevels`. */
  levels: MegagameLevels;
  /** Non-voided completions this player has in that class. */
  completionsInClass: number;
};

export type LevelUpCheck = {
  /** False means refuse: these are not overridable. */
  ok: boolean;
  errors: string[];
  /** Overridable with "Yes, I'm sure" plus an optional reason. */
  warnings: string[];
};

export function checkLevelUp(
  input: LevelUpInput,
  table?: readonly LevelRequirement[],
): LevelUpCheck;
```

`table` defaults to `LEVEL_REQUIREMENTS` in both functions, and every test passes its own table, so
the tests keep passing when staff tune the constant.

`checkLevelUp` errors, in this order:

1. `level` is not an integer or is below 1: `"A level must be a whole number of 1 or more."`
2. `level` is not strictly greater than `input.levels[input.class]`: for a current level of 3 and a
   requested 3, `"Already a level 3 wizard; a new level must be higher."` and for a requested 2,
   `"Already a level 3 wizard; a new level must be higher."` as well. The spec makes strictly greater
   a hard rule, with corrections handled by voiding.

`MAX_LEVEL` is not an error. Spec section 4 says the maximum is "used only for the picker and the
dashboard grid", so refusing a level above it would remove the ability to record a level 6 without a
code change, and a database check constraint on the range would need a migration. It is a warning
instead, and no message hard-codes the number.

Warnings, in this order:

1. Above the chart, when `level > MAX_LEVEL`: `` `Level ${level} is above the ${MAX_LEVEL}-level
chart.` `` so the string cannot drift from the constant.
2. Skipped levels, when `level > current + 1`: `"Skips level 2."` for one, and
   `"Skips levels 2 and 3."` for several, listing `current + 1` through `level - 1` and joining with
   commas and a final "and".
3. A requirement shortfall, when a matching row exists and `completionsInClass < minCompletions`:
   `"Has 1 wizard quest; level 2 asks for 3."` Use the singular "quest" at exactly 1 and "quests"
   otherwise, and the lowercase class name from the class key.

`ok` is `errors.length === 0`. A caller with `ok === true` and a non-empty `warnings` shows the
"Record anyway" button and the confirmation checkbox. There is no setting that makes warnings hard,
and there is no setting that makes errors soft.

Tests (each passing its own table):

- Current level 0, requested 1, empty table: ok, no errors, no warnings.
- Requested 0 and requested 1.5: each is an error and `ok` is false.
- Current 5, requested 6: `ok` is true with the above-the-chart warning, and the warning string is
  built from `MAX_LEVEL` rather than hard-coded, so assert it contains `String(MAX_LEVEL)`.
- Current 3, requested 3 and requested 2: both error, and the message names the current level.
- Current 1, requested 3: ok with one warning naming level 2.
- Current 0, requested 4: ok with one warning whose string is `"Skips levels 1, 2 and 3."`, since the
  range is `current + 1` through `level - 1`.
- Table with `{ class: "wizard", level: 2, minCompletions: 3 }`: `completionsInClass: 1` warns with
  the exact sentence above and still returns ok; `completionsInClass: 3` does not warn.
- A requirement for another class does not apply.
- Both a skip and a shortfall produce two warnings, skip first.
- A request above `MAX_LEVEL` that also skips a level produces the above-the-chart warning first.
- `requirementFor` returns null for a level with no row, and the row for one with it.
- `LEVEL_REQUIREMENTS` is empty as shipped (one assertion, so a later edit to the constant is a
  deliberate test change).

#### The lock window

Spec section 5.1 step 3 gives each player in the list a status, one of which is "outside the lock
window (warning)", and spec section 8 says a classless quest cannot carry a window. Both are pure
functions of the quest's class and level window and the player's derived levels, so they belong here
beside `checkLevelUp` rather than in the store. The other two statuses, "already completed" and "no
claimed ticket", need rows and stay in phase 2.

```ts
export type QuestWindow = {
  /** Null means any class. */
  class: string | null;
  minLevel?: number | null;
  maxLevel?: number | null;
};

export type QuestWindowCheck = {
  /** False means show the warning; nothing here blocks a confirmation. */
  ok: boolean;
  warnings: string[];
};

export function checkQuestWindow(
  quest: QuestWindow,
  levels: MegagameLevels,
): QuestWindowCheck;

/** A level window needs a class. The phase 3 CSV importer calls this per row. */
export function questWindowIsValid(quest: QuestWindow): boolean;
```

`checkQuestWindow` returns no warnings when `quest.class` is null, whatever the levels, since a
classless quest is open to everyone. Otherwise, with `cls` the quest's class:

1. `isMegagameClass(quest.class)` fails: `"Quest class \"sorcerer\" is not a known class."`
2. `levels[cls]` is 0: `"Not a wizard yet."`
3. `minLevel` is set and `levels[cls] < minLevel`: `"Level 1 wizard; this quest asks for level 2 or
higher."`
4. `maxLevel` is set and `levels[cls] > maxLevel`: `"Level 4 wizard; this quest is for level 3 and
below."`

`ok` is `warnings.length === 0`. Nothing here refuses a confirmation: spec section 10 records that
lock windows warn rather than block, and the only hard block in the confirm flow is the duplicate
completion, which the partial unique index enforces in phase 2.

`questWindowIsValid` is `quest.class !== null || (quest.minLevel == null && quest.maxLevel == null)`,
the same condition as the `quests_level_window_needs_class` check constraint in phase 2. Having it
here lets the importer reject a bad CSV row with a sentence instead of surfacing a constraint error.

Tests:

- A classless quest with no window, and a classless quest with levels set (which
  `questWindowIsValid` rejects), both give no warnings from `checkQuestWindow`.
- In-window: a level 2 wizard against a wizard quest with `minLevel: 1, maxLevel: 3` is ok.
- Below `minLevel`, above `maxLevel`, and level 0 in the quest's class each give one warning, with
  the sentences above.
- A wizard quest with no window and a level 2 wizard is ok; the same quest and a level 0 wizard gives
  the "Not a wizard yet." warning.
- A player who is a level 3 pirate but a level 0 wizard warns on a wizard quest.
- An unknown class string gives the unknown-class warning and does not throw.
- `questWindowIsValid`: true for a classless quest with both levels null, false for a classless quest
  with either level set, true for a classed quest with either level set.

#### Time buckets

```ts
export const BUCKET_SIZES = [
  "5m",
  "15m",
  "30m",
  "1h",
  "3h",
  "6h",
  "1d",
] as const;
export type BucketSize = (typeof BUCKET_SIZES)[number];

export const isBucketSize = (value: unknown): value is BucketSize => ...;

/** Minutes per bucket, used for the JavaScript side of the math. */
export const BUCKET_MINUTES: Record<BucketSize, number>;

/**
 * The only place a Postgres interval literal for `date_bin` comes from: a
 * fixed map, never a caller's string.
 */
const BUCKET_INTERVALS: Record<BucketSize, string>;

/** Throws on anything not in BUCKET_SIZES, so no input reaches SQL unchecked. */
export function bucketIntervalSql(size: string): string;

/**
 * Shared origin for `date_bin`, so the JavaScript buckets and the SQL buckets
 * line up. See the open question about day boundaries.
 */
export const BUCKET_ORIGIN: Date;

export function bucketStart(at: Date, size: BucketSize): Date;

/** Every bucket start from `from`'s bucket to `to`'s bucket, inclusive. */
export function bucketSeries(
  from: Date,
  to: Date,
  size: BucketSize,
): Date[];
```

`BUCKET_MINUTES` is `{ "5m": 5, "15m": 15, "30m": 30, "1h": 60, "3h": 180, "6h": 360, "1d": 1440 }`
and `BUCKET_INTERVALS` is `{ "5m": "5 minutes", ..., "1d": "1 day" }`. `BUCKET_ORIGIN` is
`new Date(Date.UTC(2026, 0, 1))`, a UTC midnight. Every bucket size divides a day evenly, so any UTC
midnight gives the same boundaries and the choice of date does not affect any expectation.

`bucketStart` is `floor((at - origin) / ms) * ms + origin` in milliseconds, which is what
`date_bin(interval, ts, origin)` computes, and is well defined for negative differences too because
`Math.floor` rounds down. `bucketSeries` includes the bucket containing `from` and the bucket
containing `to`, so a range whose endpoints do not sit on a boundary produces one more entry than the
range length divided by the bucket size. It returns an empty array when `to` is before `from`.

There is no automatic bucket chooser. Spec section 6.3 gives the dashboard a bucket-size picker and
range presets, so the size always arrives from the user. Range presets (last 2h, today, whole con)
are a pair of dates each and land with the dashboard in phase 4; they need no phase-1 helper, since
the only shared math a preset needs is `bucketStart` and `bucketSeries`.

Tests (every timestamp written as an explicit UTC ISO string, so no expectation depends on the
machine's time zone):

- `bucketIntervalSql("1h")` is `"1 hour"`; `bucketIntervalSql("2h")` and `bucketIntervalSql("1h; drop table")`
  both throw. This is the whitelist test the spec asks for, so make it explicit.
- `isBucketSize` accepts each member of `BUCKET_SIZES` and rejects `"2h"`, `""` and `null`.
- `bucketStart` with `"15m"`: `"2026-11-07T10:07:00.000Z"` gives `"2026-11-07T10:00:00.000Z"`,
  `"2026-11-07T10:15:00.000Z"` gives itself, and `"2026-11-07T10:14:59.999Z"` gives
  `"2026-11-07T10:00:00.000Z"`.
- `bucketStart` with `"5m"`, `"30m"`, `"3h"`, `"6h"` and `"1d"`: one case each, from
  `"2026-11-07T10:07:00.000Z"`, expecting `10:05`, `10:00`, `09:00`, `06:00` and `00:00` on the same
  UTC day.
- `bucketStart` is idempotent: `bucketStart(bucketStart(t, s), s)` equals `bucketStart(t, s)` for
  every size.
- A time before `BUCKET_ORIGIN` still floors downwards rather than towards the origin:
  `"2025-12-31T23:58:00.000Z"` at `"15m"` gives `"2025-12-31T23:45:00.000Z"`.
- `bucketSeries` from `"2026-11-07T10:07:00.000Z"` to `"2026-11-07T12:07:00.000Z"` at `"30m"` gives
  five starts, `10:00`, `10:30`, `11:00`, `11:30` and `12:00`, because both endpoint buckets are
  included.
- `bucketSeries` over the same range at `"1h"` gives three starts, `10:00`, `11:00` and `12:00`.
- `bucketSeries` from `"2026-11-07T10:00:00.000Z"` to `"2026-11-07T11:00:00.000Z"` at `"30m"` gives
  three starts, which is the aligned-endpoint case.
- `bucketSeries` with `to` equal to `from` gives one entry, and with `to` before `from` gives none.

#### Phase 1 acceptance

`pnpm test` passes, and `pnpm check` (typecheck, lint, format check, test) passes. No file under
`src/db/`, `drizzle/` or `src/app/` is modified.

## 4. Phase 2: schema and store (blocked on the schema freeze lifting)

Do not start until the user lifts the freeze. Ask about section 8's first open question before
writing the schema.

### 4.1 `src/db/schema/megagame.ts`

Add `export * from "./megagame";` to `src/db/schema/index.ts`. The partial unique indexes are the
reason this uses `uniqueIndex(...).where(...)`, which drizzle 0.45 supports; there is no other
partial index in the repo yet, so check the generated SQL by hand after `pnpm db:generate`.

```ts
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps, user } from "./auth";

export const playerCodes = pgTable("player_codes", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  code: text().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const quests = pgTable(
  "quests",
  {
    id: uuid().primaryKey().defaultRandom(),
    code: text().notNull().unique(),
    title: text().notNull(),
    // Null means any class. Text, not an enum, so renaming a class needs no migration.
    class: text(),
    kind: text().notNull(),
    answers: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    evidence: text(),
    hint: text(),
    minLevel: integer(),
    maxLevel: integer(),
    active: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    check("quests_kind_known", sql`${t.kind} in ('answer', 'evidence')`),
    check(
      "quests_level_window_needs_class",
      sql`${t.class} is not null or (${t.minLevel} is null and ${t.maxLevel} is null)`,
    ),
  ],
);

export const confirmations = pgTable(
  "confirmations",
  {
    // Client-generated so a retry is idempotent.
    id: uuid().primaryKey(),
    questId: uuid()
      .notNull()
      .references(() => quests.id, { onDelete: "restrict" }),
    requestedUserIds: text()
      .array()
      .notNull()
      .default(sql`'{}'`),
    confirmedBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    voidedAt: timestamp({ withTimezone: true }),
    voidedBy: text().references(() => user.id, { onDelete: "set null" }),
    voidReason: text(),
  },
  (t) => [
    index("confirmations_quest_id_idx").on(t.questId),
    index("confirmations_confirmed_by_idx").on(t.confirmedBy),
  ],
);

export const questCompletions = pgTable(
  "quest_completions",
  {
    id: uuid().primaryKey().defaultRandom(),
    confirmationId: uuid()
      .notNull()
      .references(() => confirmations.id, { onDelete: "restrict" }),
    // Copied from the confirmation by the store: the partial index needs it here.
    questId: uuid()
      .notNull()
      .references(() => quests.id, { onDelete: "restrict" }),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    confirmedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    voidedAt: timestamp({ withTimezone: true }),
    voidedBy: text().references(() => user.id, { onDelete: "set null" }),
    voidReason: text(),
  },
  (t) => [
    uniqueIndex("quest_completions_live_unique")
      .on(t.questId, t.userId)
      .where(sql`${t.voidedAt} is null and ${t.userId} is not null`),
    index("quest_completions_confirmation_id_idx").on(t.confirmationId),
    index("quest_completions_user_id_idx").on(t.userId),
  ],
);

export const levelEvents = pgTable(
  "level_events",
  {
    // Client-generated, the idempotency key for the level-up action.
    id: uuid().primaryKey(),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    class: text().notNull(),
    level: integer().notNull(),
    awardedBy: text().references(() => user.id, { onDelete: "set null" }),
    awardedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    checksPassed: boolean().notNull(),
    overrideReason: text(),
    cardPhotoUrl: text(),
    note: text(),
    voidedAt: timestamp({ withTimezone: true }),
    voidedBy: text().references(() => user.id, { onDelete: "set null" }),
    voidReason: text(),
  },
  (t) => [
    uniqueIndex("level_events_live_unique")
      .on(t.userId, t.class, t.level)
      .where(sql`${t.voidedAt} is null and ${t.userId} is not null`),
    index("level_events_user_id_idx").on(t.userId),
    check("level_events_level_positive", sql`${t.level} >= 1`),
    check(
      "level_events_card_photo_https",
      sql`${t.cardPhotoUrl} is null or ${t.cardPhotoUrl} like 'https://%'`,
    ),
  ],
);

export const questAttempts = pgTable(
  "quest_attempts",
  {
    id: uuid().primaryKey().defaultRandom(),
    questId: uuid()
      .notNull()
      .references(() => quests.id, { onDelete: "restrict" }),
    enteredBy: text().references(() => user.id, { onDelete: "set null" }),
    enteredAnswer: text().notNull(),
    correct: boolean().notNull(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quest_attempts_quest_id_idx").on(t.questId)],
);
```

Two things in that file are deliberate departures from an earlier draft:

- Every reference to `quests` and to `confirmations` is `onDelete: "restrict"`, not `"cascade"`.
  Spec section 4 makes the event tables append-only and spec section 8 says counts and time series
  must not change after a deletion, but a cascade from `quests` would erase a quest's whole
  completion history along with the quest row. `quests.active` is how a quest is withdrawn, so no
  flow needs the delete. References to `user` stay `set null`, which is what the retention policy
  asks for.
- The level check is `level >= 1`, not `level between 1 and 5`. Spec section 4 puts the maximum in
  the rules module and uses it only for the picker and the dashboard grid, so a database range check
  would make recording a level 6 need a migration. The existing `user_wizard_level_range` check is
  precedent for the stricter form, but it is attached to the `/account` columns, which are a
  different question (section 8, question 1).

### 4.2 The no-transaction insert pattern

The driver is `drizzle-orm/neon-http`: one HTTP request per statement, no interactive transaction.
`db.batch()` exists for grouping statements that need no intermediate read. The confirm action is
therefore two statements, both idempotent, and the second one re-checks the confirmation state in
SQL rather than relying on the read between them:

```ts
// 1. Claim the confirmation id. Nothing happens on a retry.
await db
  .insert(confirmations)
  .values({ id, questId, requestedUserIds, confirmedBy })
  .onConflictDoNothing({ target: confirmations.id });

const [row] = await db
  .select()
  .from(confirmations)
  .where(eq(confirmations.id, id))
  .limit(1);
if (!row) throw new Error("confirmation vanished");
if (row.voidedAt) return { status: "voided" as const };
// A retry whose payload disagrees with the stored row is a bug or a stale form,
// not an idempotent retry. Refuse it rather than mixing the two.
if (row.questId !== questId) return { status: "quest-mismatch" as const };
if (!sameIds(row.requestedUserIds, requestedUserIds)) {
  return { status: "players-mismatch" as const };
}
if (row.requestedUserIds.length === 0) return { status: "no-players" as const };

// 2. One statement for every requested player. The insert reads from
// `confirmations` so a concurrent undo between the two statements cannot leave
// live completions under a voided confirmation. `row.questId` is the quest, not
// the caller's argument. A row comes back only when this call inserted it; an
// absent player was already completed elsewhere.
const inserted = await db
  .insert(questCompletions)
  .select(
    db
      .select({
        confirmationId: confirmations.id,
        questId: confirmations.questId,
        userId: sql`u.id`.as("user_id"),
      })
      .from(confirmations)
      .innerJoin(
        sql`unnest(${confirmations.requestedUserIds}) as u(id)`,
        sql`true`,
      )
      .where(and(eq(confirmations.id, id), isNull(confirmations.voidedAt))),
  )
  .onConflictDoNothing({
    target: [questCompletions.questId, questCompletions.userId],
    where: sql`${questCompletions.voidedAt} is null and ${questCompletions.userId} is not null`,
  })
  .returning();
```

Four things that statement is doing, each from a review finding:

- The quest id comes from the stored confirmation row, never from the caller. Reusing an id with a
  different quest, through a stale form or a manipulated request, would otherwise create a completion
  whose `confirmationId` points at one quest and whose `questId` points at another, and the partial
  index is keyed on `questId`.
- The player list comes from the stored row too, and a retry whose quest or player set differs from
  the stored one is refused rather than partly applied.
- An empty player list is refused before the insert. `requested_user_ids` defaults to `'{}'` and a
  volunteer can submit with nobody in the list, and drizzle rejects `.values([])`.
- The insert selects from `confirmations` with `voided_at is null` in its own `where`, so the
  not-voided condition and the insert are one statement. The earlier shape read the row, then
  inserted, which allowed this sequence: confirm reads a live row, undo voids the confirmation and
  its completions, confirm inserts fresh non-voided completions. That leaves live completions under a
  voided confirmation and blocks later legitimate completions through the partial index.

Check the generated SQL for that insert by hand before relying on it. If drizzle's `insert().select()`
with an `unnest` join turns out not to compose, write the statement with `db.execute(sql`...`)`
instead; the requirement is one statement whose `where` carries the not-voided condition, not a
particular drizzle call. The `unnest` form also needs the requested ids to exist in `user`, so filter
the select against `user` or accept a foreign-key error on a deleted account.

The result the UI shows is built by reading the completion rows that carry this confirmation id, not
from `inserted` alone, so a reload or a crash between the two statements still renders the same
answer.

The level-up action uses an untargeted `on conflict do nothing ... returning`. A targeted
`ON CONFLICT` arbiter handles only the constraint it names: targeting the primary key does not absorb
a conflict on the partial `(user_id, class, level)` index, and targeting that index does not cover an
id collision. Untargeted absorbs either, and the outcome is then read back:

- A row returned: the level was awarded by this call.
- No row, and an event with this id exists with the same user, class and level: an idempotent retry,
  report success.
- No row, and an event with this id exists with different values: refuse, this is a reused id.
- No row, and no event with this id: a live event for that user, class and level already exists, so
  report that the level was already awarded.

Undo is `db.batch()` over two updates keyed by confirmation id, setting `voidedAt`, `voidedBy` and
`voidReason` on the confirmation and on its completions, which is what clears the partial index. Both
updates carry `where voided_at is null` so a second undo is a no-op rather than a reason overwrite.

Phase 2's tests use the mocked database from section 0, which cannot see any of these races. Add one
integration test against a scratch database, or a Neon branch, covering the confirm-then-undo
interleaving and a retry with an altered payload. If no scratch database is available, say so in the
phase 2 report and leave the test written but skipped rather than claiming the race is covered.

### 4.3 `src/db/describe.ts` and its test

- `TABLE_GROUPS`: add a `Megagame` entry after `Budget` listing, in display order, `player_codes`,
  `quests`, `confirmations`, `quest_completions`, `level_events`, `quest_attempts`.
- `TABLE_NOTES`: one line per new table. A missing note fails the "has a note and a group for every
  table" test, and a missing group puts the table in "Other", which that same test rejects.
- `src/db/describe.test.ts`: add the six names to the sorted list in "lists every table once"; add
  `"Megagame"` to the group-name list and the six tables to the flattened order list in "groups
  tables in display order without losing any"; add the new `user` referrers to the sorted
  `referencedBy` list in the foreign-key test, remembering that a table referencing `user` more than
  once appears once per reference.
- The spec's side finding that the budget tables are missing from `describe.ts` is wrong. They are
  present in both `TABLE_GROUPS` and the test's lists. Do not "fix" that.

### 4.4 `src/lib/megagame-store.ts`

This file already exists (section 2). Add to it; do not replace it. `loadMegagameLevels` and
`setMegagameLevels` and their three callers, `src/app/(v2)/account/actions.ts`,
`src/app/(v2)/account/page.tsx` and `src/app/(v2)/u/[id]/page.tsx`, keep working unchanged until the
user settles section 8's first question. Once that is settled, list the caller changes it implies and
cover `/account` and `/u/[id]` with tests before changing either.

New exports: quest lookup by code, player lookup by code, player search by name, and the confirm,
level-up and void actions above, plus the reads `deriveLevels` and the dashboard need. Add
`import "server-only"` at the top (the file does not have it today) and route every query through
`getDb()`. `src/lib/name-match.ts` is not a person search; it exports only
`matchLabel(name, labels)`, which picks a spelling out of a label list. Name search needs its own
query, an `ilike` over the `user` name column with a row limit, returning name, pronouns and photo
thumbnail only, as spec section 3.1 says.

`src/lib/megagame-store.test.ts` covers it with the mocked database described in section 0.

Acceptance: `pnpm db:generate` produces one migration that is committed unedited, `pnpm check`
passes, and the generated SQL contains both partial unique indexes with their `where` clauses.

## 5. Phase 3: the tool (blocked on phase 2)

Files: `src/app/backstage/megagame/{layout,page,actions}.tsx`, `src/app/backstage/megagame/q/[code]/page.tsx`,
`src/app/backstage/megagame/quests/page.tsx`, `src/app/(v2)/q/[code]/page.tsx`,
`src/app/(v2)/p/[code]/page.tsx`, plus the `TOOLS` entry in `src/app/backstage/(index)/page.tsx`.
Authorization is per route, not one rule for all of them. `requireAccess(permission)` in
`src/lib/admin-auth.ts` returns `Access | null` and does nothing else: it neither throws nor
redirects, so every caller has to branch on `null` itself. The proxy only redirects, so no page may
rely on it.

- Everything under `/backstage/megagame`, every page and every server action: call
  `requireAccess("megagame.verify")`, or `requireAccess("megagame.manage")` for quest import,
  editing, requirement changes and voiding someone else's record, and return or redirect on `null`.
  An action that ignores a null result would run for anyone.
- `/q/<code>`: holders of `megagame.verify` redirect to `/backstage/megagame/q/<code>`; a signed-out
  viewer goes to `/login?next=/q/<code>` through `safeNextPath`; a signed-in viewer without the
  permission redirects to `/account` and is shown nothing about the quest.
- `/p/<code>`: holders of `megagame.verify` redirect to `/backstage/megagame?player=<code>`; everyone
  else, signed in or not, gets the limited public page with display name and class levels only.
  This route must stay reachable without the permission, so do not gate it.

Write a test per branch on each public route: three on `/q/<code>` (volunteer, signed-out,
signed-in without the permission) and two on `/p/<code>` (volunteer, everyone else).

Reuse `PinInput`, `QrDownload`, `uploadImage` and `downscaleImage`. Keep the in-progress player list
in the URL query string. Read the Next.js guides in `node_modules/next/dist/docs/` before writing any
of this.

Acceptance: the flows in spec section 5 work on the Vercel preview, and
`node scripts/preview-shot.mjs <preview-url> /backstage/megagame …` screenshots look right on phone
and desktop widths, per `CLAUDE.md`. Delete the screenshots afterwards.

## 6. Phase 4: dashboard and export (blocked on phase 2)

`src/app/backstage/megagame/dashboard/page.tsx`, gated on `megagame.verify`. Tables first, inline SVG
bars, no charting dependency. The bucket helpers from phase 1 supply both the `date_bin` interval
(only through `bucketIntervalSql`) and the JavaScript side that fills empty buckets. The bucket size
comes from the picker and the range from the presets in spec section 6.3, last 2h, today and whole
con; each preset is a pair of dates computed here, and `bucketStart` and `bucketSeries` are the only
math it needs. CSV export of the three event tables. Refresh every 60 seconds.

## 7. Phase 5: scanner and attempt logging (blocked on phase 3)

Move `jsqr` from devDependencies to dependencies, dynamic-import it in a client component at a few
frames per second, and write `quest_attempts` rows from the answer field. `BarcodeDetector` is not an
option, because it does not work in any iOS browser.

## 8. Open questions for the user

1. The `user.wizard_level`, `user.pirate_level` and `user.alien_level` columns already hold levels and
   are written from `/account` through `loadMegagameLevels` and `setMegagameLevels` in
   `src/lib/megagame-store.ts`, while the spec derives levels from `level_events`. Phase 2 needs a
   decision: derive and mirror into the user columns on each level event, treat the columns as a
   cache rebuilt from events, or drop one of the two. The file to reconcile is
   `src/lib/megagame-store.ts`, and its callers are `src/app/(v2)/account/actions.ts`,
   `src/app/(v2)/account/page.tsx` and `src/app/(v2)/u/[id]/page.tsx`. Do not start phase 2 without
   this.
2. `BUCKET_ORIGIN` sets where `date_bin` day boundaries fall. A UTC midnight origin means the `"1d"`
   bucket does not line up with a con day in local time. Ask which the dashboard should use.
3. A level above `MAX_LEVEL` is now a warning rather than a refusal, and `level_events` carries no
   upper range check, so a level 6 can be recorded without a code change. Say if it should be a hard
   refusal instead; that is a one-line change in `checkLevelUp` plus a check constraint.

## 9. Review decisions

Three reviews ran against the first draft of this plan: an assumption review, a technical review of
the repo, and an adversarial review from GPT through the codex plugin. Everything below is what
changed and why. Where a review disagreed with the spec, the spec won. Where two reviews disagreed,
the choice taken is named here.

Phase 1, the only phase being implemented now:

1. `MAX_LEVEL` is a warning, not a refusal. Spec section 4 says the maximum is used only for the
   picker and the dashboard grid, so the draft's hard error contradicted it. The phase 2 check
   constraint dropped from `between 1 and 5` to `>= 1` for the same reason, and no message
   hard-codes the number. Carried to open question 3, since it is a behavior change the user may not
   want.
2. `normalizeAnswer` removes punctuation and whitespace instead of collapsing them to a space. Spec
   section 5.1 lists both as things matching ignores, and the draft's choice meant "co-op" did not
   match "coop". This closes the draft's third open question, so that slot now holds the `MAX_LEVEL`
   question instead.
3. `normalizeMegagameCode` no longer truncates to six characters. Both the assumption review and the
   technical review raised it, the spec does not ask for truncation, and truncating turned
   `"A2C4EFGH"` into the valid-looking different code `"A2C4EF"`. Over-long input now fails
   `isCompleteMegagameCode` instead.
4. `chooseBucket` is gone. Both reviews called it invented: spec section 6.3 gives the dashboard a
   bucket picker and range presets, so the size always comes from the user, and the draft's own test
   for it restated its implementation. Range presets are noted as phase 4 work needing no phase-1
   helper, which answers the assumption review's point that nothing covered them.
5. `bucketSeries` keeps both endpoint buckets, and its tests now carry explicit UTC timestamps. The
   codex review was right that the draft's contract and its test disagreed: 10:07 through 12:07 at
   `"30m"` is five starts, not four. `BUCKET_ORIGIN` now has a stated value, a UTC midnight, and
   every size divides a day evenly so the date chosen does not affect any expectation. This also
   fixes the assumption review's point that the bucket tests were written in local time.
6. Added `checkQuestWindow` and `questWindowIsValid` to phase 1, with tests. The technical review
   found that spec section 5.1 step 3 requires an "outside the lock window" status and spec section 8
   requires that a classless quest carry no window, and the draft had neither function. Both are pure
   and need no schema, so they fit this phase. The two statuses that need rows, "already completed"
   and "no claimed ticket", stay in phase 2.
7. Permission tests use `expect(expand([...]).has("..."))`, matching the existing file, rather than
   `toContain` on a `Set`.
8. The `node_modules/next/dist/docs/` reading is no longer deferred to phase 3. `CLAUDE.md` says to
   read before writing code, so phase 1 lists the directory and confirms nothing applies.

Kept as drafted, with the reason:

9. Class order stays wizard, pirate, alien, the existing order in `src/lib/megagame-levels.ts`, which
   `src/lib/megagame-levels.test.ts` asserts. The spec's prose lists pirate, wizard, alien, but it is
   prose about the class list rather than a statement about order.
10. The level maximum and the class list stay in `megagame-levels.ts` and are imported, rather than
    moving to or being re-exported from `megagame-rules.ts`. The spec puts them in the rules module,
    but moving them would touch the existing module and its callers for no behavior change. Callers
    importing from two modules is the cost.
11. Errors in `checkLevelUp` stay non-overridable and warnings stay overridable. Spec section 5.2's
    "no setting makes checks hard" is about the requirement table, which is entirely warnings here,
    and spec section 4 makes strictly-greater a rule checked in the action.
12. `LEVEL_REQUIREMENTS` ships empty with an assertion to that effect, and `requirementFor`,
    `matchAnswer`'s `{matched, answer}` shape, the injectable `table` parameter,
    `isCompleteMegagameCode`, `bucketIntervalSql` throwing, and the warning and error wording are all
    plan-chosen rather than specified. They are flagged here rather than changed; the spec is silent
    and tests need concrete strings.
13. The spec's side finding that the budget tables are missing from `src/db/describe.ts` is wrong.
    Two reviews confirmed they are present in both the source and the test. Nothing to fix.

Later phases, recorded so the order is settled:

14. Confirm is now one statement whose `where` carries the not-voided condition, instead of a read
    followed by an insert. The codex review found that an undo between the two left live completions
    under a voided confirmation and blocked later legitimate ones.
15. Completions take their quest id from the stored confirmation row, and a retry whose quest or
    player set differs from the stored row is refused. Both the technical and the codex review raised
    this independently.
16. An empty player list is refused before the insert, since drizzle rejects `.values([])` and the
    column defaults to `'{}'`.
17. Level-up uses an untargeted `on conflict do nothing ... returning` with a defined read-back,
    because a targeted arbiter covers only the constraint it names. The spec's "on the event id and
    on the partial unique index" is not expressible as one targeted clause.
18. References to `quests` and `confirmations` are `restrict`, not `cascade`. Spec sections 4 and 8
    make the event tables append-only and say counts must not change after a deletion, and
    `quests.active` already covers withdrawing a quest.
19. `src/lib/megagame-store.ts` already exists and is added to, not created. Both the technical and
    the codex review found the draft treated it as new; its two exports and three callers must keep
    working until open question 1 is settled.
20. Phase 3 authorization is per route, with the three branches on `/q/<code>` and `/p/<code>`
    spelled out and tested. The codex review found that the draft's single rule would have gated the
    public badge page, and that `requireAccess()` returns `Access | null` without enforcing anything.
21. Phase 2 gets one integration test against a scratch database for the confirm-and-undo
    interleaving, because the mocked database in section 0 cannot see it.
