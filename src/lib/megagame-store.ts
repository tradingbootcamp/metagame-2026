import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  sql,
  type SQLWrapper,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb, schema } from "@/db";
import {
  MAX_LEVEL,
  NO_LEVELS,
  isMegagameClass,
  type MegagameClass,
  type MegagameLevels,
} from "./megagame-levels";
import {
  BUCKET_ORIGIN,
  bucketIntervalSql,
  isCompleteMegagameCode,
  normalizeMegagameCode,
} from "./megagame-rules";
import { withFreshTicketCode } from "./ticket-code";

// The driver is neon-http: one request per statement and no interactive
// transactions, so every multi-statement write here is safe to retry and
// db.batch() is used only where no read sits between the statements.

/**
 * Several accounts' levels at once, by user id (the home page's speakers).
 * Ids with no profile row are left out of the map.
 */
export async function loadMegagameLevelsFor(
  userIds: string[],
): Promise<Map<string, MegagameLevels>> {
  const out = new Map<string, MegagameLevels>();
  if (userIds.length === 0) return out;
  const { profiles } = schema;
  const rows = await getDb()
    .select({
      id: profiles.userId,
      wizard: profiles.wizardLevel,
      pirate: profiles.pirateLevel,
      alien: profiles.alienLevel,
    })
    .from(profiles)
    .where(inArray(profiles.userId, userIds));
  for (const { id, ...levels } of rows) out.set(id, levels);
  return out;
}

export async function loadMegagameLevels(
  userId: string,
): Promise<MegagameLevels> {
  const levels = await loadMegagameLevelsFor([userId]);
  return levels.get(userId) ?? NO_LEVELS;
}

/** Callers check the levels are in range; the columns' checks back that up. */
export async function setMegagameLevels(
  userId: string,
  levels: MegagameLevels,
): Promise<void> {
  const { profiles } = schema;
  const values = {
    wizardLevel: levels.wizard,
    pirateLevel: levels.pirate,
    alienLevel: levels.alien,
  };
  await getDb()
    .insert(profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });
}

const LEVEL_KEY = {
  wizard: "wizardLevel",
  pirate: "pirateLevel",
  alien: "alienLevel",
} as const satisfies Record<
  MegagameClass,
  keyof typeof schema.profiles.$inferInsert
>;

// One column only, so a concurrent change to another class is not overwritten.
// An upsert, since a player may have no profile row yet.
async function setClassLevel(
  userId: string,
  cls: MegagameClass,
  level: number | ReturnType<typeof sql>,
  onConflict: number | ReturnType<typeof sql> = level,
): Promise<number> {
  const { profiles } = schema;
  const column = profiles[LEVEL_KEY[cls]];
  const [row] = await getDb()
    .insert(profiles)
    .values({ userId, [LEVEL_KEY[cls]]: level })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { [LEVEL_KEY[cls]]: onConflict },
    })
    .returning({ level: column });
  return row?.level ?? 0;
}

// ---- Quests ----

export type Quest = typeof schema.quests.$inferSelect;

/** Takes a code as typed, scanned or pasted; null unless it is a full code. */
export async function findQuestByCode(input: string): Promise<Quest | null> {
  const code = normalizeMegagameCode(input);
  if (!isCompleteMegagameCode(code)) return null;
  const { quests } = schema;
  const [row] = await getDb()
    .select()
    .from(quests)
    .where(eq(quests.code, code))
    .limit(1);
  return row ?? null;
}

// ---- Players ----

export type PlayerSummary = {
  id: string;
  name: string;
  pronouns: string | null;
  imageUrl: string | null;
  levels: MegagameLevels;
  code: string | null;
};

const playerColumns = () => {
  const { user, profiles } = schema;
  return {
    id: user.id,
    name: user.name,
    pronouns: profiles.pronouns,
    imageUrl: profiles.imageUrl,
    wizard: profiles.wizardLevel,
    pirate: profiles.pirateLevel,
    alien: profiles.alienLevel,
    code: profiles.megagameCode,
  };
};

type PlayerRow = {
  id: string;
  name: string;
  pronouns: string | null;
  imageUrl: string | null;
  wizard: number | null;
  pirate: number | null;
  alien: number | null;
  code: string | null;
};

const toPlayer = ({ wizard, pirate, alien, ...rest }: PlayerRow) => ({
  ...rest,
  levels: { wizard: wizard ?? 0, pirate: pirate ?? 0, alien: alien ?? 0 },
});

export async function findPlayerByCode(
  input: string,
): Promise<PlayerSummary | null> {
  const code = normalizeMegagameCode(input);
  if (!isCompleteMegagameCode(code)) return null;
  const { user, profiles } = schema;
  const [row] = await getDb()
    .select(playerColumns())
    .from(profiles)
    .innerJoin(user, eq(user.id, profiles.userId))
    .where(eq(profiles.megagameCode, code))
    .limit(1);
  return row ? toPlayer(row) : null;
}

/** The players behind a list of user ids, in that order; unknown ids drop out. */
export async function playersByIds(
  ids: readonly string[],
): Promise<PlayerSummary[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];
  const { user, profiles } = schema;
  const rows = await getDb()
    .select(playerColumns())
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(inArray(user.id, unique));
  const byId = new Map(rows.map((r) => [r.id, toPlayer(r)]));
  return unique.flatMap((id) => byId.get(id) ?? []);
}

/** Name search for the volunteer tool. Never creates accounts. */
export async function searchPlayers(
  query: string,
  limit = 10,
): Promise<PlayerSummary[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const q = `%${trimmed.replace(/[\\%_]/g, "\\$&")}%`;
  const { user, profiles } = schema;
  const rows = await getDb()
    .select(playerColumns())
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(ilike(user.name, q))
    .orderBy(asc(user.name))
    .limit(limit);
  return rows.map(toPlayer);
}

/** The player's badge code, made now if they have none. */
export async function ensurePlayerCode(userId: string): Promise<string> {
  const { profiles } = schema;
  const db = getDb();
  const read = async () => {
    const [row] = await db
      .select({ code: profiles.megagameCode })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    return row?.code ?? null;
  };
  const existing = await read();
  if (existing) return existing;
  // A taken code is a unique violation, which withFreshTicketCode retries; a
  // concurrent request for the same player wins the setWhere and we read back.
  const [written] = await withFreshTicketCode((code) =>
    db
      .insert(profiles)
      .values({ userId, megagameCode: code })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { megagameCode: code },
        setWhere: isNull(profiles.megagameCode),
      })
      .returning({ code: profiles.megagameCode }),
  );
  if (written?.code) return written.code;
  const raced = await read();
  if (!raced) throw new Error(`No player code for ${userId}`);
  return raced;
}

// ---- Confirmations ----

export type Confirmation = typeof schema.confirmations.$inferSelect;

export type ConfirmationOutcome =
  | { status: "voided"; confirmation: Confirmation }
  | {
      status: "ok";
      confirmation: Confirmation;
      /** Completions this confirmation recorded. */
      recorded: string[];
      /** Requested players already completed under another confirmation. */
      alreadyCompleted: string[];
      /** Requested players with neither, such as a deleted account. */
      notRecorded: string[];
    };

export type ConfirmResult =
  | { status: "voided" }
  | { status: "quest-mismatch" }
  | { status: "players-mismatch" }
  | { status: "no-players" }
  | Extract<ConfirmationOutcome, { status: "ok" }>;

export type ConfirmInput = {
  /** Generated by the volunteer's form; reusing it makes a retry a no-op. */
  id: string;
  questId: string;
  requestedUserIds: readonly string[];
  confirmedBy: string;
};

/** Players whose completion this confirmation holds. */
async function completedUnder(confirmationId: string): Promise<string[]> {
  const { questProgress } = schema;
  const rows = await getDb()
    .select({ userId: questProgress.userId })
    .from(questProgress)
    .where(
      and(
        eq(questProgress.confirmationId, confirmationId),
        eq(questProgress.status, "completed"),
      ),
    );
  return rows.map((r) => r.userId);
}

export async function confirmQuest(
  input: ConfirmInput,
): Promise<ConfirmResult> {
  const requested = [...new Set(input.requestedUserIds)].sort();
  if (requested.length === 0) return { status: "no-players" };
  const { confirmations } = schema;
  const db = getDb();

  await db
    .insert(confirmations)
    .values({
      id: input.id,
      questId: input.questId,
      confirmedBy: input.confirmedBy,
    })
    .onConflictDoNothing({ target: confirmations.id });

  const [row] = await db
    .select()
    .from(confirmations)
    .where(eq(confirmations.id, input.id))
    .limit(1);
  if (!row) throw new Error(`Confirmation ${input.id} vanished`);
  if (row.voidedAt) return { status: "voided" };
  if (row.questId !== input.questId) return { status: "quest-mismatch" };
  // The id was reused for a different group: the stored rows hold players
  // this request does not name.
  const mine = await completedUnder(row.id);
  if (mine.some((id) => !requested.includes(id))) {
    return { status: "players-mismatch" };
  }

  // One statement that reads and share-locks the stored confirmation, so a
  // concurrent undo either waits for this upsert and rolls its rows back, or
  // commits first and this upsert finds it voided. The join on "user" skips
  // accounts deleted since the form was filled in, and the conflict update
  // leaves a player already completed elsewhere alone.
  await db.execute(sql`
    insert into quest_progress (user_id, quest_id, status, completed_at, confirmation_id, updated_at)
    select u.id, c.quest_id, 'completed', now(), c.id, now()
    from confirmations c
    cross join unnest(${requested}::text[]) as r(id)
    join "user" u on u.id = r.id
    where c.id = ${row.id} and c.voided_at is null
    for share of c
    on conflict (user_id, quest_id) do update
      set status = 'completed', completed_at = now(), confirmation_id = excluded.confirmation_id, updated_at = now()
      where quest_progress.status <> 'completed'
  `);

  return outcomeFor(row, requested);
}

async function outcomeFor(
  row: Confirmation,
  requested: readonly string[],
): Promise<Extract<ConfirmationOutcome, { status: "ok" }>> {
  const { questProgress } = schema;
  const recorded = new Set(await completedUnder(row.id));
  const rest = requested.filter((id) => !recorded.has(id));
  const elsewhere = new Set<string>();
  if (rest.length > 0) {
    const others = await getDb()
      .select({ userId: questProgress.userId })
      .from(questProgress)
      .where(
        and(
          eq(questProgress.questId, row.questId),
          inArray(questProgress.userId, rest),
          eq(questProgress.status, "completed"),
        ),
      );
    for (const r of others) elsewhere.add(r.userId);
  }
  return {
    status: "ok",
    confirmation: row,
    recorded: [...recorded].sort(),
    alreadyCompleted: rest.filter((id) => elsewhere.has(id)),
    notRecorded: rest.filter((id) => !elsewhere.has(id)),
  };
}

/**
 * What a confirmation recorded, for the result page on reload. Who was asked
 * for is not stored, so only the recorded players come back.
 */
export async function confirmationOutcome(
  id: string,
): Promise<ConfirmationOutcome | null> {
  const { confirmations } = schema;
  const [row] = await getDb()
    .select()
    .from(confirmations)
    .where(eq(confirmations.id, id))
    .limit(1);
  if (!row) return null;
  if (row.voidedAt) return { status: "voided", confirmation: row };
  return outcomeFor(row, []);
}

export type VoidInput = { id: string; voidedBy: string; reason: string | null };

/** Undo a whole confirmation. False when it was already voided. */
export async function voidConfirmation({
  id,
  voidedBy,
  reason,
}: VoidInput): Promise<boolean> {
  const { confirmations, questProgress } = schema;
  const db = getDb();
  const [rows] = await db.batch([
    db
      .update(confirmations)
      .set({ voidedAt: new Date(), voidedBy, voidReason: reason })
      .where(and(eq(confirmations.id, id), isNull(confirmations.voidedAt)))
      .returning({ id: confirmations.id }),
    db
      .update(questProgress)
      .set({
        status: "attempted",
        completedAt: null,
        confirmationId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(questProgress.confirmationId, id),
          eq(questProgress.status, "completed"),
        ),
      ),
  ]);
  return rows.length > 0;
}

export type LiveCompletion = {
  id: string;
  userId: string;
  confirmationId: string;
  confirmedAt: Date;
  confirmedByName: string | null;
};

/** Completions of a quest among these players: the "already completed" status. */
export async function liveCompletions(
  questId: string,
  userIds: readonly string[],
): Promise<LiveCompletion[]> {
  if (userIds.length === 0) return [];
  const { questProgress, confirmations, user } = schema;
  const rows = await getDb()
    .select({
      id: questProgress.id,
      userId: questProgress.userId,
      confirmationId: questProgress.confirmationId,
      confirmedAt: questProgress.completedAt,
      confirmedByName: user.name,
    })
    .from(questProgress)
    .innerJoin(
      confirmations,
      eq(confirmations.id, questProgress.confirmationId),
    )
    .leftJoin(user, eq(user.id, confirmations.confirmedBy))
    .where(
      and(
        eq(questProgress.questId, questId),
        inArray(questProgress.userId, [...userIds]),
        eq(questProgress.status, "completed"),
      ),
    );
  return rows.filter(
    (r): r is LiveCompletion =>
      r.confirmationId !== null && r.confirmedAt !== null,
  );
}

/** Completed quests in this class, for the level-up soft checks. */
export async function completionsInClass(
  userId: string,
  cls: MegagameClass,
): Promise<number> {
  const { questProgress, quests } = schema;
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(questProgress)
    .innerJoin(quests, eq(quests.id, questProgress.questId))
    .where(
      and(
        eq(questProgress.userId, userId),
        eq(quests.class, cls),
        eq(questProgress.status, "completed"),
      ),
    );
  return row?.n ?? 0;
}

export type QuestAttemptInput = {
  questId: string;
  /** The players on the board when the answer was checked. */
  userIds: readonly string[];
  correct: boolean;
  enteredBy: string;
};

/**
 * Counts an answer-checker attempt on each player's progress row. A player
 * who already completed the quest keeps that status.
 */
export async function recordQuestAttempt(
  input: QuestAttemptInput,
): Promise<void> {
  const userIds = [...new Set(input.userIds)];
  if (userIds.length === 0) return;
  const { questProgress } = schema;
  const now = new Date();
  await getDb()
    .insert(questProgress)
    .values(
      userIds.map((userId) => ({
        userId,
        questId: input.questId,
        status: "attempted",
        attemptCount: 1,
        firstAttemptAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: [questProgress.userId, questProgress.questId],
      set: {
        attemptCount: sql`${questProgress.attemptCount} + 1`,
        firstAttemptAt: sql`coalesce(${questProgress.firstAttemptAt}, now())`,
        updatedAt: now,
      },
    });
}

export type RecentConfirmation = {
  id: string;
  questId: string;
  questTitle: string;
  questCode: string;
  players: number;
  confirmedBy: string | null;
  confirmedByName: string | null;
  createdAt: Date;
  voidedAt: Date | null;
};

/** The latest confirmations, by one volunteer or, with null, by everyone. */
export async function recentConfirmations(
  confirmedBy: string | null,
  limit = 10,
): Promise<RecentConfirmation[]> {
  const { confirmations, quests } = schema;
  const by = alias(schema.user, "confirmer");
  return getDb()
    .select({
      id: confirmations.id,
      questId: confirmations.questId,
      questTitle: quests.title,
      questCode: quests.code,
      // What it holds now; an undo hands its rows back, so a voided row shows 0.
      players: sql<number>`(select count(*)::int from quest_progress q where q.confirmation_id = ${confirmations.id})`,
      confirmedBy: confirmations.confirmedBy,
      confirmedByName: by.name,
      createdAt: confirmations.createdAt,
      voidedAt: confirmations.voidedAt,
    })
    .from(confirmations)
    .innerJoin(quests, eq(quests.id, confirmations.questId))
    .leftJoin(by, eq(by.id, confirmations.confirmedBy))
    .where(
      confirmedBy === null
        ? undefined
        : eq(confirmations.confirmedBy, confirmedBy),
    )
    .orderBy(desc(confirmations.createdAt))
    .limit(limit);
}

export type RecentLevelUp = {
  id: string;
  playerName: string | null;
  class: string;
  level: number;
  awardedBy: string | null;
  awardedByName: string | null;
  awardedAt: Date;
  checksPassed: boolean;
  overrideReason: string | null;
  cardPhotoUrl: string | null;
  note: string | null;
  voidedAt: Date | null;
};

/** Volunteer level-ups by everyone, live and voided, newest first. */
export async function recentLevelUps(limit = 30): Promise<RecentLevelUp[]> {
  const { levelEvents } = schema;
  const player = alias(schema.user, "player");
  const awarder = alias(schema.user, "awarder");
  return getDb()
    .select({
      id: levelEvents.id,
      playerName: player.name,
      class: levelEvents.class,
      level: levelEvents.level,
      awardedBy: levelEvents.awardedBy,
      awardedByName: awarder.name,
      awardedAt: levelEvents.awardedAt,
      checksPassed: levelEvents.checksPassed,
      overrideReason: levelEvents.overrideReason,
      cardPhotoUrl: levelEvents.cardPhotoUrl,
      note: levelEvents.note,
      voidedAt: levelEvents.voidedAt,
    })
    .from(levelEvents)
    .leftJoin(player, eq(player.id, levelEvents.userId))
    .leftJoin(awarder, eq(awarder.id, levelEvents.awardedBy))
    .where(eq(levelEvents.source, "volunteer"))
    .orderBy(desc(levelEvents.awardedAt))
    .limit(limit);
}

// ---- Level events ----

export type LevelEvent = typeof schema.levelEvents.$inferSelect;

export type RecordLevelUpInput = {
  /** Generated by the volunteer's form; reusing it makes a retry a no-op. */
  id: string;
  userId: string;
  class: MegagameClass;
  level: number;
  awardedBy: string;
  checksPassed: boolean;
  overrideReason?: string | null;
  cardPhotoUrl?: string | null;
  note?: string | null;
};

export type LevelUpResult = {
  status:
    | "awarded"
    | "retry"
    | "id-reused"
    | "already-awarded"
    | "voided"
    | "invalid";
};

/**
 * Writes the audit row, then raises the class column. The caller runs
 * checkLevelUp first; that read is not atomic with this write, which is
 * acceptable for soft checks.
 */
export async function recordLevelUp(
  input: RecordLevelUpInput,
): Promise<LevelUpResult> {
  const { id, userId, level } = input;
  const cls = input.class;
  if (
    !isMegagameClass(cls) ||
    !Number.isInteger(level) ||
    level < 1 ||
    level > MAX_LEVEL
  ) {
    return { status: "invalid" };
  }
  const { levelEvents, profiles } = schema;
  const db = getDb();
  // Untargeted, so both an id collision and a live (user, class, level)
  // duplicate are absorbed; the read-back below tells them apart.
  const inserted = await db
    .insert(levelEvents)
    .values({
      id,
      userId,
      class: cls,
      level,
      source: "volunteer",
      awardedBy: input.awardedBy,
      checksPassed: input.checksPassed,
      overrideReason: input.overrideReason ?? null,
      cardPhotoUrl: input.cardPhotoUrl ?? null,
      note: input.note ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: levelEvents.id });

  const raise = () =>
    setClassLevel(
      userId,
      cls,
      level,
      sql`greatest(${profiles[LEVEL_KEY[cls]]}, ${level})`,
    );

  if (inserted.length > 0) {
    await raise();
    return { status: "awarded" };
  }
  const [existing] = await db
    .select({
      id: levelEvents.id,
      userId: levelEvents.userId,
      class: levelEvents.class,
      level: levelEvents.level,
      voidedAt: levelEvents.voidedAt,
    })
    .from(levelEvents)
    .where(eq(levelEvents.id, id))
    .limit(1);
  if (!existing) return { status: "already-awarded" };
  if (
    existing.userId !== userId ||
    existing.class !== cls ||
    existing.level !== level
  ) {
    return { status: "id-reused" };
  }
  if (existing.voidedAt) return { status: "voided" };
  // Repeats the column write, which repairs a crash between the two writes.
  await raise();
  return { status: "retry" };
}

export type VoidLevelEventResult =
  | { status: "voided" | "already-voided"; level: number }
  | { status: "not-found" | "not-volunteer" };

/**
 * Undo a volunteer level-up, then recompute that class's column from the
 * player's remaining live events. A picker join counts as a level 1 event;
 * joins from before level_events existed get their rows from
 * scripts/backfill-megagame-picker-joins.mjs.
 */
export async function voidLevelEvent({
  id,
  voidedBy,
  reason,
}: VoidInput): Promise<VoidLevelEventResult> {
  const { levelEvents } = schema;
  const db = getDb();
  const [voided] = await db
    .update(levelEvents)
    .set({ voidedAt: new Date(), voidedBy, voidReason: reason })
    .where(
      and(
        eq(levelEvents.id, id),
        isNull(levelEvents.voidedAt),
        eq(levelEvents.source, "volunteer"),
      ),
    )
    .returning({ userId: levelEvents.userId, class: levelEvents.class });

  let target = voided;
  let status: "voided" | "already-voided" = "voided";
  if (!target) {
    const [row] = await db
      .select({
        userId: levelEvents.userId,
        class: levelEvents.class,
        source: levelEvents.source,
        voidedAt: levelEvents.voidedAt,
      })
      .from(levelEvents)
      .where(eq(levelEvents.id, id))
      .limit(1);
    if (!row) return { status: "not-found" };
    if (row.source !== "volunteer") return { status: "not-volunteer" };
    target = row;
    status = "already-voided";
  }

  const cls = target.class;
  if (!target.userId || !isMegagameClass(cls)) return { status, level: 0 };
  const { profiles } = schema;
  const column = profiles[LEVEL_KEY[cls]];
  const liveMax = sql`coalesce((select max(${levelEvents.level}) from ${levelEvents} where ${levelEvents.userId} = ${target.userId} and ${levelEvents.class} = ${cls} and ${levelEvents.voidedAt} is null), 0)`;
  // The recompute can lower the column. If an award commits while it runs, its
  // stale subquery may overwrite the award's raise, so a second statement with
  // a fresh snapshot raises the column back to the live maximum.
  await setClassLevel(target.userId, cls, liveMax);
  const level = await setClassLevel(
    target.userId,
    cls,
    liveMax,
    sql`greatest(${column}, ${liveMax})`,
  );
  return { status, level };
}

/**
 * The /account picker's audit row: level 1 in the chosen class. Earlier picker
 * joins in other classes are voided in the same batch, since the picker resets
 * those columns to 0 and a later undo must not bring them back.
 */
export async function recordPickerJoin(
  userId: string,
  cls: MegagameClass,
): Promise<void> {
  const { levelEvents } = schema;
  const db = getDb();
  await db.batch([
    db
      .update(levelEvents)
      .set({
        voidedAt: new Date(),
        voidedBy: userId,
        voidReason: "Switched class on /account",
      })
      .where(
        and(
          eq(levelEvents.userId, userId),
          eq(levelEvents.source, "picker"),
          ne(levelEvents.class, cls),
          isNull(levelEvents.voidedAt),
        ),
      ),
    db
      .insert(levelEvents)
      .values({
        id: crypto.randomUUID(),
        userId,
        class: cls,
        level: 1,
        source: "picker",
        awardedBy: userId,
        checksPassed: true,
      })
      .onConflictDoNothing(),
  ]);
}

/** Whether a volunteer has recorded a live level-up for this player. */
export async function hasVolunteerLevelEvent(userId: string): Promise<boolean> {
  const { levelEvents } = schema;
  const [row] = await getDb()
    .select({ id: levelEvents.id })
    .from(levelEvents)
    .where(
      and(
        eq(levelEvents.userId, userId),
        eq(levelEvents.source, "volunteer"),
        isNull(levelEvents.voidedAt),
      ),
    )
    .limit(1);
  return row !== undefined;
}

export async function findLevelEvent(id: string): Promise<LevelEvent | null> {
  const { levelEvents } = schema;
  const [row] = await getDb()
    .select()
    .from(levelEvents)
    .where(eq(levelEvents.id, id))
    .limit(1);
  return row ?? null;
}

// ---- Over time ----

// The interval comes only from bucketIntervalSql's whitelist, and goes in as a
// bound parameter rather than SQL text.
const dateBin = (size: string, column: SQLWrapper) =>
  sql`date_bin(${bucketIntervalSql(size)}::interval, ${column}, ${BUCKET_ORIGIN.toISOString()}::timestamptz)`;

export type CompletionBucket = {
  bucket: Date;
  class: string | null;
  n: number;
};

/** Completions per bucket and quest class, for [from, to). */
export async function completionSeries(
  size: string,
  from: Date,
  to: Date,
): Promise<CompletionBucket[]> {
  const { questProgress, quests } = schema;
  const bucket = dateBin(size, questProgress.completedAt);
  const rows = await getDb()
    .select({
      bucket: bucket.mapWith(String),
      class: quests.class,
      n: sql<number>`count(*)::int`,
    })
    .from(questProgress)
    .innerJoin(quests, eq(quests.id, questProgress.questId))
    .where(
      and(
        eq(questProgress.status, "completed"),
        gte(questProgress.completedAt, from),
        lt(questProgress.completedAt, to),
      ),
    )
    .groupBy(sql`1`, sql`2`)
    .orderBy(sql`1`);
  return rows.map((r) => ({ ...r, bucket: new Date(r.bucket) }));
}

export type LevelEventBucket = {
  bucket: Date;
  class: string;
  source: string;
  n: number;
};

/** Live level events per bucket, class and source, for [from, to). */
export async function levelEventSeries(
  size: string,
  from: Date,
  to: Date,
): Promise<LevelEventBucket[]> {
  const { levelEvents } = schema;
  const bucket = dateBin(size, levelEvents.awardedAt);
  const rows = await getDb()
    .select({
      bucket: bucket.mapWith(String),
      class: levelEvents.class,
      source: levelEvents.source,
      n: sql<number>`count(*)::int`,
    })
    .from(levelEvents)
    .where(
      and(
        isNull(levelEvents.voidedAt),
        gte(levelEvents.awardedAt, from),
        lt(levelEvents.awardedAt, to),
      ),
    )
    .groupBy(sql`1`, sql`2`, sql`3`)
    .orderBy(sql`1`);
  return rows.map((r) => ({ ...r, bucket: new Date(r.bucket) }));
}

export type VoidRow = {
  kind: "confirmation" | "level";
  id: string;
  voidedAt: Date;
  voidedByName: string | null;
  reason: string | null;
  questTitle: string | null;
  playerName: string | null;
  class: string | null;
  level: number | null;
};

/**
 * Confirmations undone and volunteer level-ups undone, newest first. Picker
 * rows voided by a class switch are left out.
 */
export async function recentVoids(limit = 20): Promise<VoidRow[]> {
  const { confirmations, quests, levelEvents } = schema;
  const db = getDb();
  const voider = alias(schema.user, "voider");
  const player = alias(schema.user, "player");
  const [whole, levels] = await Promise.all([
    db
      .select({
        id: confirmations.id,
        voidedAt: confirmations.voidedAt,
        voidedByName: voider.name,
        reason: confirmations.voidReason,
        questTitle: quests.title,
      })
      .from(confirmations)
      .innerJoin(quests, eq(quests.id, confirmations.questId))
      .leftJoin(voider, eq(voider.id, confirmations.voidedBy))
      .where(isNotNull(confirmations.voidedAt))
      .orderBy(desc(confirmations.voidedAt))
      .limit(limit),
    db
      .select({
        id: levelEvents.id,
        voidedAt: levelEvents.voidedAt,
        voidedByName: voider.name,
        reason: levelEvents.voidReason,
        playerName: player.name,
        class: levelEvents.class,
        level: levelEvents.level,
      })
      .from(levelEvents)
      .leftJoin(voider, eq(voider.id, levelEvents.voidedBy))
      .leftJoin(player, eq(player.id, levelEvents.userId))
      .where(
        and(
          isNotNull(levelEvents.voidedAt),
          eq(levelEvents.source, "volunteer"),
        ),
      )
      .orderBy(desc(levelEvents.voidedAt))
      .limit(limit),
  ]);
  const blank = {
    questTitle: null,
    playerName: null,
    class: null,
    level: null,
  };
  const rows: VoidRow[] = [
    ...whole.map((r) => ({ ...blank, ...r, kind: "confirmation" as const })),
    ...levels.map((r) => ({ ...blank, ...r, kind: "level" as const })),
  ].flatMap(({ voidedAt, ...r }) => (voidedAt ? [{ ...r, voidedAt }] : []));
  return rows
    .sort((a, b) => b.voidedAt.getTime() - a.voidedAt.getTime())
    .slice(0, limit);
}
