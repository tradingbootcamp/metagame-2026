import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  sql,
} from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  MAX_LEVEL,
  NO_LEVELS,
  isMegagameClass,
  type MegagameClass,
  type MegagameLevels,
} from "./megagame-levels";
import {
  deriveLevels,
  isCompleteMegagameCode,
  normalizeMegagameCode,
} from "./megagame-rules";
import { withFreshTicketCode } from "./ticket-code";

// The driver is neon-http: one request per statement and no interactive
// transactions, so every multi-statement write here is safe to retry and
// db.batch() is used only where no read sits between the statements.

export async function loadMegagameLevels(
  userId: string,
): Promise<MegagameLevels> {
  const { user } = schema;
  const [row] = await getDb()
    .select({
      wizard: user.wizardLevel,
      pirate: user.pirateLevel,
      alien: user.alienLevel,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? NO_LEVELS;
}

/** Callers check the levels are in range; the columns' checks back that up. */
export async function setMegagameLevels(
  userId: string,
  levels: MegagameLevels,
): Promise<void> {
  const { user } = schema;
  await getDb()
    .update(user)
    .set({
      wizardLevel: levels.wizard,
      pirateLevel: levels.pirate,
      alienLevel: levels.alien,
    })
    .where(eq(user.id, userId));
}

const LEVEL_KEY = {
  wizard: "wizardLevel",
  pirate: "pirateLevel",
  alien: "alienLevel",
} as const satisfies Record<
  MegagameClass,
  keyof typeof schema.user.$inferInsert
>;

// One column only, so a concurrent change to another class is not overwritten.
async function setClassLevel(
  userId: string,
  cls: MegagameClass,
  level: number | ReturnType<typeof sql>,
): Promise<void> {
  const { user } = schema;
  await getDb()
    .update(user)
    .set({ [LEVEL_KEY[cls]]: level })
    .where(eq(user.id, userId));
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
  const { user, profiles, playerCodes } = schema;
  return {
    id: user.id,
    name: user.name,
    pronouns: profiles.pronouns,
    imageUrl: profiles.imageUrl,
    wizard: user.wizardLevel,
    pirate: user.pirateLevel,
    alien: user.alienLevel,
    code: playerCodes.code,
  };
};

type PlayerRow = {
  id: string;
  name: string;
  pronouns: string | null;
  imageUrl: string | null;
  wizard: number;
  pirate: number;
  alien: number;
  code: string | null;
};

const toPlayer = ({ wizard, pirate, alien, ...rest }: PlayerRow) => ({
  ...rest,
  levels: { wizard, pirate, alien },
});

export async function findPlayerByCode(
  input: string,
): Promise<PlayerSummary | null> {
  const code = normalizeMegagameCode(input);
  if (!isCompleteMegagameCode(code)) return null;
  const { user, profiles, playerCodes } = schema;
  const [row] = await getDb()
    .select(playerColumns())
    .from(playerCodes)
    .innerJoin(user, eq(user.id, playerCodes.userId))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(eq(playerCodes.code, code))
    .limit(1);
  return row ? toPlayer(row) : null;
}

/** Name search for the volunteer tool. Never creates accounts. */
export async function searchPlayers(
  query: string,
  limit = 10,
): Promise<PlayerSummary[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const q = `%${trimmed.replace(/[\\%_]/g, "\\$&")}%`;
  const { user, profiles, playerCodes } = schema;
  const rows = await getDb()
    .select(playerColumns())
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .leftJoin(playerCodes, eq(playerCodes.userId, user.id))
    .where(ilike(user.name, q))
    .orderBy(asc(user.name))
    .limit(limit);
  return rows.map(toPlayer);
}

/** The player's badge code, made now if they have none. */
export async function ensurePlayerCode(userId: string): Promise<string> {
  const { playerCodes } = schema;
  const db = getDb();
  const read = async () => {
    const [row] = await db
      .select({ code: playerCodes.code })
      .from(playerCodes)
      .where(eq(playerCodes.userId, userId))
      .limit(1);
    return row?.code ?? null;
  };
  const existing = await read();
  if (existing) return existing;
  // A taken code is a unique violation, which withFreshTicketCode retries; a
  // concurrent request for the same player is the do-nothing case.
  const [created] = await withFreshTicketCode((code) =>
    db
      .insert(playerCodes)
      .values({ userId, code })
      .onConflictDoNothing({ target: playerCodes.userId })
      .returning({ code: playerCodes.code }),
  );
  if (created) return created.code;
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
      /** Requested players with a live completion from another confirmation. */
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

const sameIds = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().every((id, i) => id === b[i]);

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
      requestedUserIds: requested,
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
  if (!sameIds(row.requestedUserIds, requested)) {
    return { status: "players-mismatch" };
  }

  // One statement that reads the stored confirmation, so an undo landing
  // between the read above and this insert leaves nothing live behind it.
  // Quest and players come from the stored row, and the join on "user" skips
  // accounts deleted since the form was filled in.
  await db.execute(sql`
    insert into quest_completions (confirmation_id, quest_id, user_id)
    select c.id, c.quest_id, u.id
    from confirmations c
    cross join lateral unnest(c.requested_user_ids) as r(id)
    join "user" u on u.id = r.id
    where c.id = ${row.id} and c.voided_at is null
    on conflict (quest_id, user_id) where voided_at is null and user_id is not null do nothing
  `);

  return outcomeFor(row);
}

async function outcomeFor(
  row: Confirmation,
): Promise<Extract<ConfirmationOutcome, { status: "ok" }>> {
  const { questCompletions } = schema;
  const db = getDb();
  const mine = await db
    .select({ userId: questCompletions.userId })
    .from(questCompletions)
    .where(
      and(
        eq(questCompletions.confirmationId, row.id),
        isNull(questCompletions.voidedAt),
      ),
    );
  const recorded = new Set(
    mine.map((r) => r.userId).filter((id) => id !== null),
  );
  const rest = row.requestedUserIds.filter((id) => !recorded.has(id));
  const elsewhere = new Set<string>();
  if (rest.length > 0) {
    const others = await db
      .select({ userId: questCompletions.userId })
      .from(questCompletions)
      .where(
        and(
          eq(questCompletions.questId, row.questId),
          inArray(questCompletions.userId, rest),
          isNull(questCompletions.voidedAt),
        ),
      );
    for (const r of others) if (r.userId) elsewhere.add(r.userId);
  }
  return {
    status: "ok",
    confirmation: row,
    recorded: row.requestedUserIds.filter((id) => recorded.has(id)),
    alreadyCompleted: rest.filter((id) => elsewhere.has(id)),
    notRecorded: rest.filter((id) => !elsewhere.has(id)),
  };
}

/** What a confirmation recorded, for the result page on reload. */
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
  return outcomeFor(row);
}

export type VoidInput = { id: string; voidedBy: string; reason: string | null };

/** Undo a whole confirmation. False when it was already voided. */
export async function voidConfirmation({
  id,
  voidedBy,
  reason,
}: VoidInput): Promise<boolean> {
  const { confirmations, questCompletions } = schema;
  const db = getDb();
  const voided = { voidedAt: new Date(), voidedBy, voidReason: reason };
  const [rows] = await db.batch([
    db
      .update(confirmations)
      .set(voided)
      .where(and(eq(confirmations.id, id), isNull(confirmations.voidedAt)))
      .returning({ id: confirmations.id }),
    db
      .update(questCompletions)
      .set(voided)
      .where(
        and(
          eq(questCompletions.confirmationId, id),
          isNull(questCompletions.voidedAt),
        ),
      ),
  ]);
  return rows.length > 0;
}

/** Void one player's completion out of a group. False when already voided. */
export async function voidCompletion({
  id,
  voidedBy,
  reason,
}: VoidInput): Promise<boolean> {
  const { questCompletions } = schema;
  const rows = await getDb()
    .update(questCompletions)
    .set({ voidedAt: new Date(), voidedBy, voidReason: reason })
    .where(and(eq(questCompletions.id, id), isNull(questCompletions.voidedAt)))
    .returning({ id: questCompletions.id });
  return rows.length > 0;
}

export type LiveCompletion = {
  id: string;
  userId: string;
  confirmationId: string;
  confirmedAt: Date;
  confirmedByName: string | null;
};

/** Live completions of a quest among these players: the "already completed" status. */
export async function liveCompletions(
  questId: string,
  userIds: readonly string[],
): Promise<LiveCompletion[]> {
  if (userIds.length === 0) return [];
  const { questCompletions, confirmations, user } = schema;
  const rows = await getDb()
    .select({
      id: questCompletions.id,
      userId: questCompletions.userId,
      confirmationId: questCompletions.confirmationId,
      confirmedAt: questCompletions.confirmedAt,
      confirmedByName: user.name,
    })
    .from(questCompletions)
    .innerJoin(
      confirmations,
      eq(confirmations.id, questCompletions.confirmationId),
    )
    .leftJoin(user, eq(user.id, confirmations.confirmedBy))
    .where(
      and(
        eq(questCompletions.questId, questId),
        inArray(questCompletions.userId, [...userIds]),
        isNull(questCompletions.voidedAt),
      ),
    );
  return rows.filter((r): r is LiveCompletion => r.userId !== null);
}

/** Live completions of quests in this class, for the level-up soft checks. */
export async function completionsInClass(
  userId: string,
  cls: MegagameClass,
): Promise<number> {
  const { questCompletions, quests } = schema;
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(questCompletions)
    .innerJoin(quests, eq(quests.id, questCompletions.questId))
    .where(
      and(
        eq(questCompletions.userId, userId),
        eq(quests.class, cls),
        isNull(questCompletions.voidedAt),
      ),
    );
  return row?.n ?? 0;
}

export type RecentConfirmation = {
  id: string;
  questId: string;
  questTitle: string;
  questCode: string;
  players: number;
  createdAt: Date;
  voidedAt: Date | null;
};

/** A volunteer's latest confirmations, for the Undo list on the tool's home page. */
export async function recentConfirmations(
  confirmedBy: string,
  limit = 10,
): Promise<RecentConfirmation[]> {
  const { confirmations, quests } = schema;
  return getDb()
    .select({
      id: confirmations.id,
      questId: confirmations.questId,
      questTitle: quests.title,
      questCode: quests.code,
      players: sql<number>`cardinality(${confirmations.requestedUserIds})`,
      createdAt: confirmations.createdAt,
      voidedAt: confirmations.voidedAt,
    })
    .from(confirmations)
    .innerJoin(quests, eq(quests.id, confirmations.questId))
    .where(eq(confirmations.confirmedBy, confirmedBy))
    .orderBy(desc(confirmations.createdAt))
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
  const { levelEvents, user } = schema;
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
      sql`greatest(${user[LEVEL_KEY[cls]]}, ${level})`,
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
  const remaining = await db
    .select({ class: levelEvents.class, level: levelEvents.level })
    .from(levelEvents)
    .where(
      and(
        eq(levelEvents.userId, target.userId),
        eq(levelEvents.class, cls),
        isNull(levelEvents.voidedAt),
      ),
    );
  const level = deriveLevels(remaining)[cls];
  await setClassLevel(target.userId, cls, level);
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

/** A player's level events, newest first, voided ones included. */
export async function levelEventsFor(userId: string): Promise<LevelEvent[]> {
  const { levelEvents } = schema;
  return getDb()
    .select()
    .from(levelEvents)
    .where(eq(levelEvents.userId, userId))
    .orderBy(desc(levelEvents.awardedAt));
}
