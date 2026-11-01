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

// References to quests and confirmations are restrict, not cascade: the event
// tables are append-only history, and quests.active is how a quest is withdrawn.

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
    // 'picker' for the /account faction picker, 'volunteer' for the level-up action.
    source: text().notNull(),
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
    check("level_events_level_range", sql`${t.level} between 1 and 5`),
    check(
      "level_events_source_known",
      sql`${t.source} in ('picker', 'volunteer')`,
    ),
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
