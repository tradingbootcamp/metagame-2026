import {
  and,
  asc,
  desc,
  eq,
  exists,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { GradeInput, GradeValues, SessionText } from "./grade-input";
import {
  committeeName,
  COMMITTEE_EMAILS,
  nextStepsFor,
  SPACE_OPTION_LOCATIONS,
} from "./rfp-labels";
import {
  committeeField,
  gradeFields,
  mirror,
  nextStepsField,
  sessionFields,
  verdictField,
  type Fields,
} from "./rfp-mirror";
import { accountName } from "./schedule-store";

// The RFP pipeline in Postgres: sessions that came through the RFP or were
// given a phase, their grades, and the committee's edits. Every write is copied onto
// the Airtable RFP row afterwards (see rfp-mirror.ts).

const {
  sessions,
  sessionHosts,
  sessionGrades,
  sessionGradeSpaceOptions,
  locations,
  user,
  profiles,
} = schema;

export const PHASES = schema.sessionPhase.enumValues;
export type Phase = (typeof PHASES)[number];
export const VERDICTS = schema.sessionVerdict.enumValues;
export type Verdict = (typeof VERDICTS)[number];

export const SPEAKER_TIERS = schema.speakerTier.enumValues;
export type SpeakerTier = (typeof SPEAKER_TIERS)[number];

export const isPhase = (v: string): v is Phase =>
  (PHASES as readonly string[]).includes(v);
export const isVerdict = (v: string): v is Verdict =>
  (VERDICTS as readonly string[]).includes(v);

export type Account = {
  userId: string;
  /** Preferred name, else account name, else email. */
  name: string;
  email: string;
  /** How Airtable's Grader and Shepherd selects name them, if they're on the committee. */
  committeeName: string | null;
};

export type Grade = GradeValues & {
  grader: Account;
  /** The rooms the grader suggests. */
  spaceOptions: { locationId: string; name: string }[];
  /** Null while the grade is only an assignment. */
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HostAccount = Account & {
  discordHandle: string | null;
  website: string | null;
  imageUrl: string | null;
};

export type RfpSession = {
  sessionId: string;
  /** The Airtable RFP Submissions row, for imported sessions. */
  recordId: string | null;
  slug: string;
  title: string;
  /** Lead host first. */
  hosts: HostAccount[];
  phase: Phase | null;
  /** The Airtable "Next steps" option the phase stands for. */
  nextSteps: string | null;
  verdict: Verdict | null;
  shepherd: Account | null;
  /** Oldest first. */
  grades: Grade[];
  /** The latest-assigned grader, the one Airtable's single Grader shows. */
  grader: Account | null;
  /** The whole sessions row, for the RFP answers and committee notes. */
  row: typeof sessions.$inferSelect;
};

export type RfpSessionFilter = {
  /** Null matches sessions with no phase yet. */
  phases?: (Phase | null)[];
  /** Has a grade row (assigned or submitted) from this account. */
  graderUserId?: string;
  verdicts?: (Verdict | null)[];
  shepherdUserId?: string;
};

const accountColumns = {
  userId: user.id,
  name: accountName,
  email: user.email,
};

const withCommittee = <A extends Omit<Account, "committeeName">>(a: A) => ({
  ...a,
  committeeName: committeeName(a.email),
});

/** Sessions in the RFP pipeline: imported from an RFP, or given a phase. */
const inPipeline = or(
  isNotNull(sessions.airtableRfpRecordId),
  isNotNull(sessions.phase),
);

function filterWhere(filter: RfpSessionFilter): SQL | undefined {
  const conditions: (SQL | undefined)[] = [inPipeline];
  if (filter.phases) {
    const named = filter.phases.filter((p): p is Phase => p !== null);
    conditions.push(
      or(
        named.length > 0 ? inArray(sessions.phase, named) : sql`false`,
        filter.phases.includes(null) ? isNull(sessions.phase) : undefined,
      ),
    );
  }
  if (filter.verdicts) {
    const named = filter.verdicts.filter((v): v is Verdict => v !== null);
    conditions.push(
      or(
        named.length > 0 ? inArray(sessions.verdict, named) : sql`false`,
        filter.verdicts.includes(null) ? isNull(sessions.verdict) : undefined,
      ),
    );
  }
  if (filter.graderUserId) {
    conditions.push(
      exists(
        getDb()
          .select({ one: sql`1` })
          .from(sessionGrades)
          .where(
            and(
              eq(sessionGrades.sessionId, sessions.id),
              eq(sessionGrades.graderUserId, filter.graderUserId),
            ),
          ),
      ),
    );
  }
  if (filter.shepherdUserId) {
    conditions.push(eq(sessions.shepherdUserId, filter.shepherdUserId));
  }
  return and(...conditions);
}

async function hostsBySession(ids: string[]) {
  const out = new Map<string, HostAccount[]>();
  if (ids.length === 0) return out;
  const rows = await getDb()
    .select({
      sessionId: sessionHosts.sessionId,
      ...accountColumns,
      discordHandle: profiles.discordHandle,
      website: profiles.website,
      imageUrl: profiles.imageUrl,
    })
    .from(sessionHosts)
    .innerJoin(user, eq(user.id, sessionHosts.userId))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(inArray(sessionHosts.sessionId, ids))
    .orderBy(asc(sessionHosts.sessionId), asc(sessionHosts.position));
  for (const { sessionId, ...host } of rows) {
    out.set(sessionId, [...(out.get(sessionId) ?? []), withCommittee(host)]);
  }
  return out;
}

async function gradesBySession(ids: string[]) {
  const out = new Map<string, Grade[]>();
  if (ids.length === 0) return out;
  const db = getDb();
  const rows = await db
    .select({
      id: sessionGrades.id,
      sessionId: sessionGrades.sessionId,
      grader: accountColumns,
      operationalEase: sessionGrades.operationalEase,
      hostCompetence: sessionGrades.hostCompetence,
      hostNameRecognition: sessionGrades.hostNameRecognition,
      subjectMatter: sessionGrades.subjectMatter,
      fun: sessionGrades.fun,
      verdictRecommendation: sessionGrades.verdictRecommendation,
      qualityNotes: sessionGrades.qualityNotes,
      schedulerNotes: sessionGrades.schedulerNotes,
      shepherdMatch: sessionGrades.shepherdMatch,
      topicAreas: sessionGrades.topicAreas,
      potentialPanels: sessionGrades.potentialPanels,
      megagameIntegration: sessionGrades.megagameIntegration,
      expectedCrowdSize: sessionGrades.expectedCrowdSize,
      allowDropins: sessionGrades.allowDropins,
      submittedAt: sessionGrades.submittedAt,
      createdAt: sessionGrades.createdAt,
      updatedAt: sessionGrades.updatedAt,
    })
    .from(sessionGrades)
    .innerJoin(user, eq(user.id, sessionGrades.graderUserId))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(inArray(sessionGrades.sessionId, ids))
    .orderBy(asc(sessionGrades.createdAt), asc(sessionGrades.id));
  const spaces =
    rows.length === 0
      ? []
      : await db
          .select({
            gradeId: sessionGradeSpaceOptions.gradeId,
            locationId: locations.id,
            name: locations.name,
          })
          .from(sessionGradeSpaceOptions)
          .innerJoin(
            locations,
            eq(locations.id, sessionGradeSpaceOptions.locationId),
          )
          .where(
            inArray(
              sessionGradeSpaceOptions.gradeId,
              rows.map((r) => r.id),
            ),
          );
  for (const { id, sessionId, grader, ...grade } of rows) {
    out.set(sessionId, [
      ...(out.get(sessionId) ?? []),
      {
        ...grade,
        grader: withCommittee(grader),
        spaceOptions: spaces
          .filter((s) => s.gradeId === id)
          .map(({ locationId, name }) => ({ locationId, name })),
      },
    ]);
  }
  return out;
}

async function loadRfpSessions(where: SQL | undefined): Promise<RfpSession[]> {
  const rows = await getDb()
    .select({ session: sessions, shepherd: accountColumns })
    .from(sessions)
    .leftJoin(user, eq(user.id, sessions.shepherdUserId))
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(where)
    .orderBy(asc(sessions.title));
  const ids = rows.map((r) => r.session.id);
  const [hosts, grades] = await Promise.all([
    hostsBySession(ids),
    gradesBySession(ids),
  ]);
  return rows.map(({ session, shepherd }) => {
    const sessionGradeRows = grades.get(session.id) ?? [];
    return {
      sessionId: session.id,
      recordId: session.airtableRfpRecordId,
      slug: session.slug,
      title: session.title,
      hosts: hosts.get(session.id) ?? [],
      phase: session.phase,
      nextSteps: nextStepsFor(session.phase, {
        graded: sessionGradeRows.length > 0,
        shepherded: session.shepherdUserId !== null,
      }),
      verdict: session.verdict,
      // A left join yields an all-null object when there's no shepherd.
      shepherd: shepherd?.userId ? withCommittee(shepherd) : null,
      grades: sessionGradeRows,
      grader: sessionGradeRows.at(-1)?.grader ?? null,
      row: session,
    };
  });
}

/** Every RFP session matching the filter, by title. */
export function listRfpSessions(
  filter: RfpSessionFilter = {},
): Promise<RfpSession[]> {
  return loadRfpSessions(filterWhere(filter));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isSessionId = (id: string) => UUID.test(id);

/** One session by id, whether or not it's in the pipeline. */
export async function getRfpSession(
  sessionId: string,
): Promise<RfpSession | null> {
  if (!isSessionId(sessionId)) return null;
  const [found] = await loadRfpSessions(eq(sessions.id, sessionId));
  return found ?? null;
}

export async function getRfpSessionBySlug(
  slug: string,
): Promise<RfpSession | null> {
  const [found] = await loadRfpSessions(eq(sessions.slug, slug));
  return found ?? null;
}

/** The session imported from an Airtable RFP row. */
export async function getRfpSessionByRecordId(
  recordId: string,
): Promise<RfpSession | null> {
  const [found] = await loadRfpSessions(
    eq(sessions.airtableRfpRecordId, recordId),
  );
  return found ?? null;
}

/** Committee members (COMMITTEE_EMAILS) who have accounts, by committee name. */
export async function committeeAccounts(): Promise<
  (Account & { committeeName: string })[]
> {
  const rows = await getDb()
    .select(accountColumns)
    .from(user)
    .leftJoin(profiles, eq(profiles.userId, user.id))
    .where(inArray(sql`lower(${user.email})`, Object.values(COMMITTEE_EMAILS)));
  return rows
    .map(withCommittee)
    .filter((a): a is typeof a & { committeeName: string } =>
      Boolean(a.committeeName),
    )
    .sort((a, b) => a.committeeName.localeCompare(b.committeeName));
}

/**
 * The account behind a committee name, matched by email the way the Airtable
 * import did. For the shared-password sign-in, which identifies by name.
 */
export async function committeeUserId(name: string): Promise<string | null> {
  if (!Object.hasOwn(COMMITTEE_EMAILS, name)) return null;
  const [row] = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(eq(sql`lower(${user.email})`, COMMITTEE_EMAILS[name]))
    .limit(1);
  return row?.id ?? null;
}

/** The rooms a grader can suggest: the RFP form's space options, in its order. */
export async function spaceOptionLocations(): Promise<
  { id: string; name: string; label: string }[]
> {
  const labels = Object.entries(SPACE_OPTION_LOCATIONS);
  const names = labels.map(([, name]) => name);
  const rows = await getDb()
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(inArray(locations.name, names));
  return rows
    .map((r) => ({ ...r, label: labels.find(([, n]) => n === r.name)![0] }))
    .sort((a, b) => names.indexOf(a.name) - names.indexOf(b.name));
}

// ── Writes ───────────────────────────────────────────────────────────────────

/** What the Airtable mirror needs to know about a session after a write. */
export type MirrorState = {
  recordId: string | null;
  phase: Phase | null;
  verdict: Verdict | null;
  graded: boolean;
  shepherdEmail: string | null;
  /** The latest-assigned grader's email. */
  graderEmail: string | null;
};

async function mirrorState(sessionId: string): Promise<MirrorState | null> {
  const latestGrader = getDb()
    .select({ email: user.email })
    .from(sessionGrades)
    .innerJoin(user, eq(user.id, sessionGrades.graderUserId))
    .where(eq(sessionGrades.sessionId, sessions.id))
    .orderBy(desc(sessionGrades.createdAt), desc(sessionGrades.id))
    .limit(1);
  const [row] = await getDb()
    .select({
      recordId: sessions.airtableRfpRecordId,
      phase: sessions.phase,
      verdict: sessions.verdict,
      shepherdEmail: user.email,
      graderEmail: sql<string | null>`(${latestGrader})`,
    })
    .from(sessions)
    .leftJoin(user, eq(user.id, sessions.shepherdUserId))
    .where(eq(sessions.id, sessionId));
  return row ? { ...row, graded: row.graderEmail !== null } : null;
}

/** Copy a write onto the RFP row. Never throws: the database write stands. */
async function mirrorSession(
  sessionId: string,
  groups: (state: MirrorState) => (Fields | null)[],
): Promise<void> {
  try {
    const state = await mirrorState(sessionId);
    if (state?.recordId) mirror(state.recordId, ...groups(state));
  } catch (err) {
    console.error(`[rfp-mirror] couldn't read session ${sessionId}:`, err);
  }
}

export type RfpSessionUpdate = {
  phase?: Phase | null;
  verdict?: Verdict | null;
  shepherdUserId?: string | null;
  speakerTier?: SpeakerTier | null;
  text?: SessionText;
};

/** Change the pipeline columns given; anything left out is kept. */
export async function updateRfpSession(
  sessionId: string,
  update: RfpSessionUpdate,
): Promise<void> {
  const { text = {}, ...pipeline } = update;
  const set = { ...pipeline, ...text };
  if (Object.keys(set).length === 0) return;
  const [row] = await getDb()
    .update(sessions)
    .set(set)
    .where(eq(sessions.id, sessionId))
    .returning({ id: sessions.id });
  if (!row) throw new Error("That session no longer exists.");

  await mirrorSession(sessionId, (s) => [
    {
      // "Next steps" follows the shepherd too: shepherding reads 4 or 5 by
      // whether there is one.
      ...("phase" in update || "shepherdUserId" in update
        ? nextStepsField(s)
        : {}),
      ...("verdict" in update ? verdictField(s) : {}),
      ...sessionFields(text, update.speakerTier),
    },
    "shepherdUserId" in update
      ? committeeField("Shepherd", s.shepherdEmail)
      : null,
  ]);
}

export const setPhase = (sessionId: string, phase: Phase | null) =>
  updateRfpSession(sessionId, { phase });

export const setVerdict = (sessionId: string, verdict: Verdict | null) =>
  updateRfpSession(sessionId, { verdict });

export const setShepherd = (sessionId: string, userId: string | null) =>
  updateRfpSession(sessionId, { shepherdUserId: userId });

/** Assign a grader: an unsubmitted grade row. A no-op if they have one. */
export async function assignGrader(
  sessionId: string,
  userId: string,
): Promise<void> {
  await getDb()
    .insert(sessionGrades)
    .values({ sessionId, graderUserId: userId })
    .onConflictDoNothing();
  await mirrorSession(sessionId, (s) => [
    committeeField("Rubric: Grader", s.graderEmail),
    nextStepsField(s),
  ]);
}

/**
 * Take back an assignment. Only an unsubmitted one: a submitted grade is never
 * thrown away from here. Returns whether a row was removed.
 */
export async function unassignGrader(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const removed = await getDb()
    .delete(sessionGrades)
    .where(
      and(
        eq(sessionGrades.sessionId, sessionId),
        eq(sessionGrades.graderUserId, userId),
        isNull(sessionGrades.submittedAt),
      ),
    )
    .returning({ id: sessionGrades.id });
  if (removed.length === 0) return false;
  await mirrorSession(sessionId, (s) => [
    committeeField("Rubric: Grader", s.graderEmail),
    nextStepsField(s),
  ]);
  return true;
}

/**
 * Save the grader's own grade, replacing every field of their row (inserting
 * it if they had none, which also counts as submitting it), its space options,
 * and the session notes the grading form also edits. One transaction.
 */
export async function saveGrade(
  sessionId: string,
  graderUserId: string,
  input: GradeInput,
): Promise<void> {
  const db = getDb();
  const mine = and(
    eq(sessionGrades.sessionId, sessionId),
    eq(sessionGrades.graderUserId, graderUserId),
  );
  const myGradeId = db
    .select({ id: sessionGrades.id })
    .from(sessionGrades)
    .where(mine);
  const [found] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  if (!found) throw new Error("That session no longer exists.");

  await db.batch([
    db
      .insert(sessionGrades)
      .values({
        sessionId,
        graderUserId,
        ...input.grade,
        submittedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [sessionGrades.sessionId, sessionGrades.graderUserId],
        set: {
          ...input.grade,
          submittedAt: sql`coalesce(${sessionGrades.submittedAt}, now())`,
          updatedAt: new Date(),
        },
      }),
    db
      .delete(sessionGradeSpaceOptions)
      .where(inArray(sessionGradeSpaceOptions.gradeId, myGradeId)),
    ...(input.spaceLocationIds.length > 0
      ? [
          db
            .insert(sessionGradeSpaceOptions)
            .select(
              db
                .select({ gradeId: sessionGrades.id, locationId: locations.id })
                .from(sessionGrades)
                .innerJoin(
                  locations,
                  inArray(locations.id, input.spaceLocationIds),
                )
                .where(mine),
            ),
        ]
      : []),
    ...(Object.keys(input.session).length > 0
      ? [
          db
            .update(sessions)
            .set(input.session)
            .where(eq(sessions.id, sessionId)),
        ]
      : []),
    // Only out of grading: a later phase never walks back to the committee.
    ...(input.advance
      ? [
          db
            .update(sessions)
            .set({ phase: "deciding" })
            .where(
              and(
                eq(sessions.id, sessionId),
                or(isNull(sessions.phase), eq(sessions.phase, "grading")),
              ),
            ),
        ]
      : []),
  ]);

  const [graderEmail, spaces] = await Promise.all([
    db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, graderUserId))
      .then((rows) => rows[0]?.email ?? null),
    spaceOptionLocations(),
  ]);
  const spaceNames = spaces
    .filter((l) => input.spaceLocationIds.includes(l.id))
    .map((l) => l.name);
  // Airtable holds one grade per row, so the latest save wins there.
  await mirrorSession(sessionId, (s) => [
    {
      ...gradeFields(input.grade, spaceNames),
      ...sessionFields(input.session),
      ...nextStepsField(s),
    },
    committeeField("Rubric: Grader", graderEmail),
  ]);
}
